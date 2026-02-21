import json
from django.core.management.base import BaseCommand
from documents.models import Document
from pairdraft.aws_manager import aws_manager, BUCKETS


class Command(BaseCommand):
    help = 'Check what formats exist for each document in S3'

    def add_arguments(self, parser):
        parser.add_argument(
            '--doc-id',
            type=str,
            help='Check a specific document by ID',
        )

    def handle(self, *args, **options):
        doc_id = options.get('doc_id')
        
        if doc_id:
            documents = Document.objects.filter(id=doc_id)
        else:
            documents = Document.objects.all()
        
        self.stdout.write(f'Checking {documents.count()} documents...\n')
        
        for doc in documents:
            self.stdout.write(self.style.SUCCESS(f'\nDocument: {doc.title} (ID: {doc.id})'))
            
            # Check each format
            formats = {
                'HTML': Document.HTML,
                'JSON': Document.JSON,
                'PDF': Document.PDF
            }
            
            for format_name, content_type in formats.items():
                file_path = doc.get_file_path(content_type)
                exists = aws_manager.object_exists(
                    bucket=BUCKETS.PAIRDRAFT_DOCUMENTS.value,
                    file_path=file_path
                )
                
                if exists:
                    # Get file size
                    try:
                        response = aws_manager.s3_client.head_object(
                            Bucket=BUCKETS.PAIRDRAFT_DOCUMENTS.value,
                            Key=file_path
                        )
                        size = response['ContentLength']
                        self.stdout.write(f'  ✓ {format_name}: {file_path} ({size} bytes)')
                    except:
                        self.stdout.write(f'  ✓ {format_name}: {file_path}')
                else:
                    self.stdout.write(self.style.WARNING(f'  ✗ {format_name}: {file_path} (not found)'))