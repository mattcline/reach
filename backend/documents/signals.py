import logging
logger = logging.getLogger('django')

from django.dispatch import receiver
from django.db.models.signals import post_delete
from django.db import connection

from pairdraft.aws_manager import aws_manager, BUCKETS
from documents.models import Document


@receiver(post_delete, sender=Document)
def document_post_delete(sender, instance, **kwargs):
    # Perform actions after Document object is deleted
    logger.info(f"Deleting document {instance.id} in S3...")

    for content_type in [Document.JSON, Document.HTML, Document.PDF]:
        aws_manager.delete_object(
            bucket=BUCKETS.PAIRDRAFT_DOCUMENTS.value,
            key=instance.get_file_path(content_type=content_type)
        )
    logger.info(f"Deleted document {instance.id} in S3.")

    with connection.cursor() as cursor:
        cursor.execute(
            "DELETE FROM \"yjs-writings\" WHERE docname = %s",
            [str(instance.id)]
        )
        logger.info(f"Deleted {cursor.rowcount} rows in yjs-writings table.")
