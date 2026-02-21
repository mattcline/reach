import json
from django.core.management.base import BaseCommand
from django.db.models import Q
from documents.models import Document, Action
from pairdraft.aws_manager import aws_manager, BUCKETS
from users.models import UserProfile


class Command(BaseCommand):
    help = 'List all HTML documents that need migration to Lexical JSON format'

    def add_arguments(self, parser):
        parser.add_argument(
            '--check-s3',
            action='store_true',
            help='Check S3 for actual file existence',
        )
        parser.add_argument(
            '--user-email',
            type=str,
            help='Filter documents by user email',
        )

    def handle(self, *args, **options):
        check_s3 = options.get('check_s3', False)
        user_email = options.get('user_email')
        
        # Build query
        query = Q()
        if user_email:
            user_profile = UserProfile.objects.filter(user__email=user_email).first()
            if not user_profile:
                self.stdout.write(self.style.ERROR(f'User with email {user_email} not found'))
                return
            
            # Get documents where user is involved in actions
            user_actions = Action.objects.filter(
                Q(from_user=user_profile) | Q(to_user=user_profile)
            )
            query &= Q(actions__in=user_actions)
        
        # Get all documents
        documents = Document.objects.filter(query).distinct()
        
        html_documents = []
        json_documents = []
        needs_migration = []
        
        for doc in documents:
            html_path = doc.get_file_path(Document.HTML)
            json_path = doc.get_file_path(Document.JSON)
            
            if check_s3:
                html_exists = aws_manager.object_exists(
                    bucket=BUCKETS.PAIRDRAFT_DOCUMENTS.value,
                    file_path=html_path
                )
                json_exists = aws_manager.object_exists(
                    bucket=BUCKETS.PAIRDRAFT_DOCUMENTS.value,
                    file_path=json_path
                )
                
                if html_exists and not json_exists:
                    needs_migration.append({
                        'id': str(doc.id),
                        'title': doc.title,
                        'html_path': html_path,
                        'json_path': json_path
                    })
                elif html_exists:
                    html_documents.append({
                        'id': str(doc.id),
                        'title': doc.title,
                        'html_path': html_path,
                        'has_json': json_exists
                    })
                elif json_exists:
                    json_documents.append({
                        'id': str(doc.id),
                        'title': doc.title,
                        'json_path': json_path
                    })
            else:
                # Just list all documents
                html_documents.append({
                    'id': str(doc.id),
                    'title': doc.title,
                    'html_path': html_path,
                    'json_path': json_path
                })
        
        # Output results
        self.stdout.write(self.style.SUCCESS(f'Total documents found: {documents.count()}'))
        
        if check_s3:
            self.stdout.write(self.style.WARNING(f'\nDocuments needing migration (HTML exists, JSON does not): {len(needs_migration)}'))
            for doc in needs_migration:
                self.stdout.write(f"  - {doc['title']} (ID: {doc['id']})")
            
            self.stdout.write(self.style.SUCCESS(f'\nHTML documents with JSON: {len(html_documents)}'))
            for doc in html_documents:
                if doc.get('has_json'):
                    self.stdout.write(f"  - {doc['title']} (ID: {doc['id']})")
            
            self.stdout.write(self.style.SUCCESS(f'\nJSON-only documents: {len(json_documents)}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'\nAll documents:'))
            for doc in html_documents:
                self.stdout.write(f"  - {doc['title']} (ID: {doc['id']})")
        
        # Output document IDs for easy copying
        if needs_migration:
            self.stdout.write(self.style.WARNING('\nDocument IDs needing migration (for easy copying):'))
            for doc in needs_migration:
                self.stdout.write(doc['id'])