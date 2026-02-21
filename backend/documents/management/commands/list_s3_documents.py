from django.core.management.base import BaseCommand
from pairdraft.aws_manager import aws_manager, BUCKETS


class Command(BaseCommand):
    help = 'List all objects in the documents S3 bucket'

    def add_arguments(self, parser):
        parser.add_argument(
            '--prefix',
            type=str,
            help='Filter by prefix',
        )

    def handle(self, *args, **options):
        prefix = options.get('prefix', '')
        
        try:
            # List objects in the bucket
            paginator = aws_manager.s3_client.get_paginator('list_objects_v2')
            page_iterator = paginator.paginate(
                Bucket=BUCKETS.PAIRDRAFT_DOCUMENTS.value,
                Prefix=prefix
            )
            
            total_count = 0
            html_count = 0
            json_count = 0
            pdf_count = 0
            
            self.stdout.write(f'Listing objects in bucket: {BUCKETS.PAIRDRAFT_DOCUMENTS.value}')
            if prefix:
                self.stdout.write(f'With prefix: {prefix}')
            self.stdout.write('')
            
            for page in page_iterator:
                if 'Contents' not in page:
                    continue
                    
                for obj in page['Contents']:
                    key = obj['Key']
                    size = obj['Size']
                    last_modified = obj['LastModified']
                    
                    # Count by type
                    if key.endswith('.html'):
                        html_count += 1
                    elif key.endswith('.json'):
                        json_count += 1
                    elif key.endswith('.pdf'):
                        pdf_count += 1
                    
                    total_count += 1
                    
                    # Display the object
                    self.stdout.write(f'{key} ({size} bytes) - Modified: {last_modified}')
            
            # Summary
            self.stdout.write('')
            self.stdout.write(self.style.SUCCESS(f'Total objects: {total_count}'))
            self.stdout.write(f'  HTML files: {html_count}')
            self.stdout.write(f'  JSON files: {json_count}')
            self.stdout.write(f'  PDF files: {pdf_count}')
            self.stdout.write(f'  Other files: {total_count - html_count - json_count - pdf_count}')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error listing objects: {str(e)}'))