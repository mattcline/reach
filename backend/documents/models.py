import os
import uuid
import logging
logger = logging.getLogger('django')
from typing import List

from django.db import models
from django.db.models import Q

from pairdraft.settings import IS_PRODUCTION
from pairdraft.aws_manager import aws_manager, BUCKETS
from pairdraft.email_service import gmail_send_message
from inbox.models import Message
from users.models import Preferences, UserProfile


class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    root = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    property = models.ForeignKey('properties.Property', on_delete=models.SET_NULL, null=True, blank=True)
    
    JSON = 'application/json'
    HTML = 'text/html'
    PDF = 'application/pdf'
    
    actions: models.Manager['Action']

    def save(self, *args, **kwargs):
        if not self.root:
            self.root = self
        super().save(*args, **kwargs)

    def create_copy(self, content_type: str):
        document = Document.objects.create(
            title=self.title,
            root=self.root if self.root else self,
            property=self.property
        )
        
        try:
            aws_manager.copy_object(
                source_bucket=BUCKETS.PAIRDRAFT_DOCUMENTS.value,
                source_file_path=self.get_file_path(content_type=content_type),
                destination_bucket=BUCKETS.PAIRDRAFT_DOCUMENTS.value,
                destination_file_path=document.get_file_path(content_type=content_type)
            )
        except Exception as e:
            logger.error(f"Failed to copy document {self.id} in S3: {e}")

        return document

    def get_file_path(self, content_type):
        """
        Returns the file path for the document.

        If content_type is provided, the file path is created with that content type.
        Otherwise, the file path is created with the content type of the document.
        """
        type_to_suffix = {
            Document.JSON: 'json',
            Document.HTML: 'html',
            Document.PDF: 'pdf'
        }
        return f"{self.id}/{self.title.lower().replace(' ', '_')}.{type_to_suffix.get(content_type, 'json')}"
    
    def get_available_actions(self, user_profile: UserProfile) -> List[str]:
        """
        Returns a list of action types (Action.TYPE_CHOICES)
        the user is authorized to perform.
        """
        available_actions = []
        
        latest_action = self.actions.first() # Action table is ordered by timestamp

        if not latest_action:
            return []

        if latest_action.from_user == user_profile:
            if latest_action.type == Action.CREATE:
                # available_actions.append(Action.SUBMIT)
                # available_actions.append(Action.REQUEST_REVIEW)
                available_actions.append(Action.DELETE)
            elif latest_action.type == Action.COUNTER:
                available_actions.append(Action.SUBMIT)
            elif latest_action.type == Action.REVIEW and user_profile.is_attorney:
                available_actions.append(Action.SUBMIT)

        elif latest_action.to_user == user_profile:
            if latest_action.type == Action.SUBMIT:
                available_actions.append(Action.ACCEPT)
                available_actions.append(Action.DECLINE)
                available_actions.append(Action.COUNTER)
                available_actions.append(Action.REQUEST_REVIEW)
                
                if latest_action.from_user.is_attorney:
                    available_actions.append(Action.CREATE)

            elif latest_action.type == Action.REQUEST_REVIEW and user_profile.is_attorney:
                available_actions.append(Action.REVIEW)

            elif latest_action.type == Action.ACCEPT:
                available_actions.append(Action.REQUEST_REVIEW)
                available_actions.append(Action.SIGN)
            
            elif latest_action.type == Action.SIGN:
                available_actions.append(Action.SIGN)
            
        return available_actions
    
    def get_to_user(self, from_user: UserProfile, is_attorney: bool = False) -> UserProfile | None:
        """
        Returns the to_user for a from_user in a document history,
        If is_attorney is True, then return the to_user that is an attorney.
        
        Assumption: each document history will only have one to_user and
        (optionally) another to_user that is an attorney.
        """
        queryset = Action.objects.filter(document__root=self.root)

        to_users = UserProfile.objects.filter(
            Q(is_attorney=is_attorney) &
            (Q(id__in=queryset.values_list('from_user', flat=True)) |
            Q(id__in=queryset.values_list('to_user', flat=True)))
        ) \
        .exclude(id=from_user.id) \
        .distinct()
            
        return to_users.first()

    @staticmethod
    def get_history(root_id: str, queryset, user_profile: UserProfile) -> dict:
        """Returns the document history for a document root id."""
        # get all documents belonging to the same history
        documents = queryset.filter(root_id=root_id)
        if not documents:
            return {}

        to_user = documents[0].get_to_user(from_user=user_profile, is_attorney=False)
        recipient_name = to_user.full_name if to_user else None

        return {
            'documents': documents,
            'available_actions': documents[0].get_available_actions(user_profile),
            'recipient_name': recipient_name
        }


class Action(models.Model):
    """
    Sequential, blocking actions (i.e. linear) 
    that can be performed on a document.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='actions')
    from_user = models.ForeignKey('users.UserProfile', on_delete=models.CASCADE, related_name='actions_from_user')
    to_user = models.ForeignKey('users.UserProfile', on_delete=models.SET_NULL, null=True, blank=True, related_name='actions_to_user') # optional

    # types that only contain from_user
    CREATE = 'create'
    COUNTER = 'counter'
    REVIEW = 'review'
    DELETE = 'delete' # only used in get_available_actions(), not in the database

    # types that contain both from_user AND to_user
    SUBMIT = 'submit'
    REQUEST_REVIEW = 'request_review'
    ACCEPT = 'accept'
    DECLINE = 'decline'
    SIGN = 'sign'
    SHARE = 'share'

    TYPE_CHOICES = (
        (CREATE, 'Create'),
        (COUNTER, 'Counter'),
        (REVIEW, 'Review'),
        (DELETE, 'Delete'),
        (SUBMIT, 'Submit'),
        (REQUEST_REVIEW, 'Request Review'),
        (ACCEPT, 'Accept'),
        (DECLINE, 'Decline'),
        (SIGN, 'Sign'),
        (SHARE, 'Share')
    )
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, default=CREATE)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        
    def save(self, *args, **kwargs):
        if not self.to_user:
            return super().save(*args, **kwargs)
        
        # log a message  
        message = Message.objects.create(
            sender=self.from_user,
            recipient=self.to_user,
            content=f"{self.from_user.full_name} {self.type} the document." # TODO: fix
        )
        message.save()
        
        # send an email to the other party
        url = os.environ.get('FRONTEND_URL', 'http://localhost:3000') if IS_PRODUCTION else 'http://localhost:3000'
        link = f"{url}/login?next=/documents/{self.document.id}/"
        
        # check email preferences to see if user has opted into receiving emails
        preferences = Preferences.objects.filter(user_profile=self.to_user).first()
        if not preferences:
            logger.info(f"User {self.to_user.email} does not have a preferences object.")
            return
        
        # if IS_PRODUCTION:
            # TODO: add different wording for different types of actions
            # gmail_send_message(self.to_user.email, f"Offer {type}", f"<div>Hello {self.to_user.first_name},\n\n{self.from_user.full_name} {type} your offer.  Click here to view: {link}\n\nBest,\nPairDraft Team</div>")
    
        super().save(*args, **kwargs)


# TODO: deprecate
class Text(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE)


class Thread(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resolved = models.BooleanField(default=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE)


class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content = models.TextField()
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='comments')
    timestamp = models.DateTimeField(auto_now_add=True)
    author = models.ForeignKey('users.UserProfile', on_delete=models.CASCADE)
