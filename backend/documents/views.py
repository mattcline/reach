import os
import time
import logging
import jwt
from datetime import datetime, timedelta
logger = logging.getLogger('django')

from django.conf import settings
from django.db.models import Q, Prefetch, Max
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action

from documents.api import adobe as adobe_api
from pairdraft import views_util
from pairdraft.settings import IS_PRODUCTION
from pairdraft.email_service import gmail_send_message
from pairdraft.aws_manager import aws_manager, BUCKETS
from users.models import UserProfile
from tokens.models import DocumentToken
from documents.serializers import DocumentSerializer, CommentSerializer, ThreadSerializer
from documents.models import Document, Action, Thread, Comment
from documents.permissions import IsAuthorizedDocument


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthorizedDocument]
    
    def get_queryset(self):
        """Filters documents to those the user has access to."""
        if views_util.is_superuser(self.request.user):
            return Document.objects.prefetch_related('actions').all()

        # filter actions to only those involving the user
        user_actions = Action.objects.filter(Q(from_user__user=self.request.user) | Q(to_user__user=self.request.user))

        # filter to documents with those actions
        return Document.objects \
            .annotate(latest_action_timestamp=Max('actions__timestamp')) \
            .prefetch_related(Prefetch('actions', queryset=user_actions)) \
            .filter(actions__in=user_actions) \
            .distinct() \
            .order_by('-latest_action_timestamp')
            
    def get_history(self, request, queryset, root_id: str):
        """Returns the history of a document."""
        history = Document.get_history(
            root_id=root_id,
            queryset=queryset,
            user_profile=request.user.user_profile
        )
        serialized_documents = DocumentSerializer(history['documents'], context={'request': request}, many=True).data
        return {
            'document': serialized_documents[0],
            'history': serialized_documents,
            'available_actions': history['available_actions'],
            'recipient_name': history['recipient_name']
        }
        
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        history = self.get_history(
            request=request,
            queryset=self.get_queryset(),
            root_id=self.get_object().root
        )
        return Response(history, status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        """
        Returns documents organized by history.

        A history is a group of documents which all
        share the same root document.
    
        Returns:
            {
                document: Document,     # latest document in the history
                available_actions: [],      # actions available on the latest document for this user
                history: []     # all documents in the history back to the root document
            }
        """
        # TODO: make a Chain model so querying will be easier?
        #   can pass info through nested serializers instead of having a 'root'
        queryset = self.get_queryset() # TODO: might need to change to this: queryset = self.filter_queryset(self.get_queryset())
        
        histories = []
        
        # get the root document ids to group the documents together
        root_ids = list(queryset.values_list('root', flat=True))
        seen = set()
        for root_id in root_ids:
            if root_id in seen:
                continue

            history = self.get_history(
                request=request,
                queryset=queryset,
                root_id=root_id
            )
            histories.append(history)

            seen.add(root_id)
            
        # sort by the most recent action
        histories.sort(key=lambda x: x['document']['actions'][0]['timestamp'], reverse=True)

        return Response(histories, status=status.HTTP_200_OK)
    
    @staticmethod
    def _get_presigned_url(document: Document, content_type, client_method_name='get_object') -> str | None:
        method_parameters = {
            'Bucket': BUCKETS.PAIRDRAFT_DOCUMENTS.value,
            'Key': document.get_file_path(content_type)
        }

        if client_method_name == 'put_object':
            method_parameters['ContentType'] = content_type
        elif client_method_name == 'get_object':
            method_parameters['ResponseContentType'] = content_type

            # ensure pdf files are downloaded as attachments
            if content_type == Document.PDF:
                method_parameters['ResponseContentDisposition'] = f'attachment; filename="{document.title}.pdf"'

        return aws_manager.generate_presigned_url(client_method_name=client_method_name, method_parameters=method_parameters)

    @staticmethod
    def format_document(request, document: Document, client_method_name='get_object'):
        """
        Serializes the document, 
        generates a presigned url according to the client method,
        and appends the available actions for the user.
        """
        serializer = DocumentSerializer(document, context={'request': request})
        data = dict(serializer.data)
        
        # Check if JSON exists, if not provide HTML URL
        json_path = document.get_file_path(Document.JSON)
        json_exists = aws_manager.object_exists(
            bucket=BUCKETS.PAIRDRAFT_DOCUMENTS.value,
            file_path=json_path
        )
        
        if json_exists:
            data['presigned_url'] = DocumentViewSet._get_presigned_url(
                document=document,
                content_type=Document.JSON,
                client_method_name=client_method_name
            )
            data['content_type'] = Document.JSON
        else:
            # Check if HTML exists
            html_path = document.get_file_path(Document.HTML)
            html_exists = aws_manager.object_exists(
                bucket=BUCKETS.PAIRDRAFT_DOCUMENTS.value,
                file_path=html_path
            )
            
            if html_exists:
                data['presigned_url'] = DocumentViewSet._get_presigned_url(
                    document=document,
                    content_type=Document.HTML,
                    client_method_name=client_method_name
                )
                data['content_type'] = Document.HTML
                data['needs_migration'] = True
            else:
                data['presigned_url'] = None
                data['content_type'] = None
        
        data['available_actions'] = document.get_available_actions(request.user.user_profile)

        editable = False
        latest_action = document.actions.first()
        if latest_action \
            and latest_action.from_user == request.user.user_profile \
            and latest_action.type in set([Action.CREATE, Action.COUNTER, Action.REVIEW]):
            editable = True
        data['editable'] = editable

        # TODO: really only need to store the ids
        # TODO: filter documents to those the user has access to
        documents = Document.objects.filter(root_id=str(document.root.id)).all() # TODO: not guaranteed to be in the correct order
        serialized_documents = DocumentSerializer(documents, context={'request': request}, many=True).data
        data['documents'] = serialized_documents

        return data

    def create(self, request, *args, **kwargs):
        """Creates a new HTML document."""
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        document = serializer.save()

        Action.objects.create(
            document=document, 
            from_user=request.user.user_profile, 
            type=Action.CREATE
        )

        logger.info(f"Document {document.id} created by {request.user}")

        return Response(DocumentViewSet.format_document(request=request, document=document, client_method_name='get_object'), status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, *args, **kwargs):
        """Returns the document object fields with an AWS presigned url to access the document content."""
        instance = self.get_object()
        return Response(DocumentViewSet.format_document(request=request, document=instance, client_method_name='get_object'), status=status.HTTP_200_OK)
    
    # def update(self, request, *args, **kwargs):
    #     """Returns an AWS presigned url to update the document."""
    #     # TODO: pass back status from AWS call
    #     content_type = request.data.get('content_type')
    #     return Response(
    #         DocumentViewSet._get_presigned_url(
    #             document=self.get_object(),
    #             content_type=content_type,
    #             client_method_name='put_object'
    #         ), 
    #         status=status.HTTP_200_OK
    #     )

    @action(detail=True, methods=['get'], url_path='ws-token')
    def ws_token(self, request, pk=None):
        document = self.get_object()
        
        token = jwt.encode({
            'user_id': request.user.id,
            'document_id': str(document.id),
            'exp': datetime.utcnow() + timedelta(hours=1)
        }, settings.SECRET_KEY, algorithm='HS256')
        
        return Response({'token': token}, status=status.HTTP_200_OK)

    # DOWNLOADS ==================================================================
    @action(detail=True, methods=['get'])
    def download_url(self, request, pk=None):
        """Returns a presigned url to download the document."""
        document = self.get_object()

        get_html_doc_presigned_url = DocumentViewSet._get_presigned_url(document=document, content_type=Document.HTML, client_method_name='get_object')
        put_pdf_doc_presigned_url = DocumentViewSet._get_presigned_url(document=document, content_type=Document.PDF, client_method_name='put_object')
        get_pdf_doc_presigned_url = DocumentViewSet._get_presigned_url(document=document, content_type=Document.PDF, client_method_name='get_object')
        
        if not get_html_doc_presigned_url or not put_pdf_doc_presigned_url:
            return Response("Presigned urls not generated.", status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        job_id = adobe_api.html_to_pdf(get_html_doc_presigned_url, put_pdf_doc_presigned_url)
        if not job_id:
            return Response("Job not created.", status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # poll for the job status
        attempts = 0
        job_status = None
        while job_status != 'done' and attempts < 10:
            attempts += 1
            job_status = adobe_api.get_job_status(job_id)
            time.sleep(1)

        return Response({'url': get_pdf_doc_presigned_url}, status=status.HTTP_200_OK)


    # COMMENTS ===================================================================
    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """Returns the comments for a document."""
        document = self.get_object()
        comments = Comment.objects.filter(text__document=document)
        
        # filter to text id if provided
        text_id = request.query_params.get('text_id')
        if text_id:
            comments = comments.filter(text_id=text_id)

        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """Adds a comment to a document."""
        document = self.get_object()
        content = request.data.get('content')
        
        text_id = request.data.get('text_id')
        if not text_id:
            # create a new text object if one is not provided
            text = Text.objects.create(document=document)
        else:
            text = document.text_set.get(id=text_id)

        comment = Comment(text=text, content=content, author=request.user.user_profile)
        comment.save()

        serializer = CommentSerializer(comment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['delete'])
    def delete_comment(self, request, pk=None):
        """Deletes a comment from a document."""
        document = self.get_object()
        id = request.query_params.get('id')
        
        if not id:
            return Response("Comment id required.", status=status.HTTP_400_BAD_REQUEST)
        
        queryset = Comment.objects.filter(id=id)
        if not queryset.exists():
            return Response("Comment not found.", status=status.HTTP_404_NOT_FOUND)
        
        comment = queryset.filter(text__document=document).first()
        if not comment:
            return Response("Comment does not belong to the provided document from document id.", 
                            status=status.HTTP_403_FORBIDDEN)
        
        comment.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


    # OFFERS ====================================================================
    @action(detail=True, methods=['get'])
    def to_user(self, request, pk=None):
        """Gets the 'to_user'."""
        document = self.get_object()
        to_user = document.get_to_user(from_user=request.user.user_profile, is_attorney=False)
        return Response({'id': to_user.id if to_user else None}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submits an offer."""        
        document = self.get_object()

        available_actions = document.get_available_actions(user_profile=request.user.user_profile)
        if Action.SUBMIT not in available_actions:
            return Response(f'You cannot {Action.SUBMIT} the offer.', status=status.HTTP_401_UNAUTHORIZED)
        
        base_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000') if IS_PRODUCTION else 'http://localhost:3000'
        link = f"{base_url}/login?next=/documents/{document.id}"

        email = request.data.get('email')
        if email: # user specified a recipient
            to_user = UserProfile.objects.filter(email=email).first()
            if not to_user: # new user
                first_name = request.data.get('first_name')
                last_name = request.data.get('last_name')

                # generate token for the offeree to use to access the document
                token = DocumentToken.objects.create(document=document)
                link += f'/link-offeree?token={token.token}'

                logger.info(f'Offer {document.id} submitted by {request.user} to new user {email}')
        else:
            to_user = document.get_to_user(from_user=request.user.user_profile, is_attorney=False)
            if not to_user:
                logger.error(f'Offer {document.id} has no recipient')
                return Response('No recipient specified.', status=status.HTTP_400_BAD_REQUEST)
        
        if to_user:
            Action.objects.create(
                type=Action.SUBMIT,
                from_user=request.user.user_profile,
                to_user=to_user,
                document=document
            )
            email = to_user.email
            first_name = to_user.first_name
            last_name = to_user.last_name
            
        gmail_send_message(
            email,
            'You have a new offer!',
            f'<div>Hello {first_name} {last_name},\n\nYou have a new offer from ' +
            f'{request.user.user_profile.full_name}! ' +
            f'Click the link below to view the document:\n\n{link}\n\nBest,\nPairDraft Team</div>'
        )

        return Response(status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        """Shares a document."""        
        document = self.get_object()

        if IS_PRODUCTION:
            link = f"docs.reachagreements.com/{document.id}"
        else:
            link = f"http://localhost:3000/docs/{document.id}"

        email = request.data.get('email')
        if email:
            to_user = UserProfile.objects.filter(email=email).first()
            if not to_user: # new user
                # generate token for the offeree to use to access the document
                token = DocumentToken.objects.create(document=document)
                link += f'/invite/{token.token}'

                logger.info(f'Document {document.id} shared by {request.user} with new user {email}')
        else:
            logger.error(f'Document {document.id} has no recipient')
            return Response('No recipient specified.', status=status.HTTP_400_BAD_REQUEST)

        Action.objects.create(
            type=Action.SHARE,
            from_user=request.user.user_profile,
            to_user=to_user,
            document=document
        )

        gmail_send_message(
            email,
            f'{request.user.user_profile.email} has shared a document with you',
            f'<div>Hello,\n\n{request.user.user_profile.email} has shared a document with you.  ' +
            f'Click this link to view the document:\n\n{link}\n\nBest,\nMatt Cline</div>'
        )

        return Response(status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='accept-invite')
    def accept_invitation(self, request, pk=None):
        """Accepts an invite to share document with user."""
        # we don't do self.get_object() here because we need to bypass get_queryset() filters
        document = Document.objects.filter(id=pk).first()
        if not document:
            return Response("Invalid document id.", status=status.HTTP_400_BAD_REQUEST)

        latest_action = Action.objects.filter(document=document).order_by('-timestamp').first()
        if not latest_action:
            return Response("The document has not been acted on.", status=status.HTTP_400_BAD_REQUEST)
        if latest_action.type != Action.SHARE:
            return Response("The document has not been shared.", status=status.HTTP_400_BAD_REQUEST)
        if latest_action.to_user and latest_action.to_user != request.user.user_profile:
            return Response("This document has not been shared with you.", status=status.HTTP_400_BAD_REQUEST)

        # TODO: mark token as redeemed
        # authenticate offeree with token
        document_token = DocumentToken.objects.filter(
            document=document,
            token=request.data.get('token'),
            date_expires__gt=timezone.now()
        ).first()
        if not document_token:
            return Response("Invalid document token.", status=status.HTTP_400_BAD_REQUEST)
        
        # link offeree to offer
        latest_action.to_user = request.user.user_profile
        latest_action.save()

        return Response(status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accepts an offer."""
        document = self.get_object()

        available_actions = document.get_available_actions(user_profile=request.user.user_profile)
        if Action.ACCEPT not in available_actions:
            return Response("You cannot accept the offer.", status=status.HTTP_400_BAD_REQUEST)

        # TODO: fill out
        # kick off async task to generate actions from the accepted offer
        # tasks_util.generate_tasks.apply_async(args=[offer.id])
        
        Action.objects.create(
            type=Action.ACCEPT, 
            from_user=request.user.user_profile, 
            document=document
        )

        logger.info(f"Offer {document.id} {Action.ACCEPT} by {request.user}")
        
        return Response(status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """Declines an offer."""
        document = self.get_object()

        available_actions = document.get_available_actions(user_profile=request.user.user_profile)
        if Action.DECLINE not in available_actions:
            return Response("You cannot decline the offer.", status=status.HTTP_400_BAD_REQUEST)
        
        Action.objects.create(
            type=Action.DECLINE, 
            from_user=request.user.user_profile, 
            document=document
        )

        logger.info(f"Offer {document.id} {Action.DECLINE} by {request.user}")

        return Response(status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def counter(self, request, pk=None):
        """Counters an offer."""    
        document = self.get_object()

        available_actions = document.get_available_actions(user_profile=request.user.user_profile)
        if Action.COUNTER not in available_actions:
            return Response("You cannot counter the offer.", status=status.HTTP_400_BAD_REQUEST)

        counter_document = document.create_copy()
        
        Action.objects.create(
            type=Action.COUNTER, 
            from_user=request.user.user_profile, 
            document=counter_document
        )
        
        logger.info(f"Counter for document {document.id} created by {request.user}")
        return Response({'id': counter_document.id}, status=status.HTTP_200_OK)


    # REVIEWS ===================================================================
    @action(detail=True, methods=['post'])
    def request_review(self, request, pk=None):
        """Requests a review."""
        document = self.get_object()
        
        available_actions = document.get_available_actions(user_profile=request.user.user_profile)
        if Action.REQUEST_REVIEW not in available_actions:
            return Response("You cannot request a review.", status=status.HTTP_400_BAD_REQUEST)

        reviewer = UserProfile.objects.filter(is_attorney=True).first()
        if not reviewer:
            return Response("No attorneys available.", status=status.HTTP_404_NOT_FOUND)

        Action.objects.create(
            type=Action.REQUEST_REVIEW, 
            from_user=request.user.user_profile, 
            to_user=reviewer,
            document=document
        )

        logger.info(f"Review for document {document.id} requested by {request.user} and assigned to {reviewer.user}")
        
        return Response(status=status.HTTP_200_OK) 

    @action(detail=True, methods=['post'])
    def create_review(self, request, pk=None):
        """Creates a review."""
        document = self.get_object()
        
        available_actions = document.get_available_actions(user_profile=request.user.user_profile)
        if Action.REVIEW not in available_actions:
            return Response("You cannot create a review.", status=status.HTTP_400_BAD_REQUEST)
        
        review_document = document.create_copy()
 
        Action.objects.create(
            type=Action.REVIEW, 
            from_user=request.user.user_profile,
            document=review_document
        )

        logger.info(f"Review for document {document.id} created by {request.user}")
        return Response(status=status.HTTP_200_OK)


class ThreadViewSet(viewsets.ModelViewSet):
    queryset = Thread.objects.all() # TODO: add permissions
    serializer_class = ThreadSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['document']
    

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all() # TODO: add permissions
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['document']
