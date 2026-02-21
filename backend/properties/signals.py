from django.db.models.signals import post_delete
from django.dispatch import receiver
from properties.models import Property
from pairdraft.aws_manager import aws_manager, BUCKETS
from pairdraft.redis_manager import redis_manager
import logging
logger = logging.getLogger('django')


@receiver(post_delete, sender=Property)
def property_post_delete(sender, instance, **kwargs):
    # Perform actions after Property object is deleted
    logger.info(f"Deleting property {instance.id} images in S3...")
    for photo_url in instance.photo_urls:
        aws_manager.delete_object(bucket=BUCKETS.KOYA_PROPERTY_IMAGES.value, key=photo_url.split('.com/')[-1])
        logger.info(f"Deleted photo from s3: {photo_url}")
    logger.info(f"Deleted property {instance.id} images in S3.")
    
    # delete info in redis
    redis_manager.r.delete(f"parcel_property_id_{instance.id}")
    redis_manager.r.delete(f"zestimate_property_id_{instance.id}")
    redis_manager.r.delete(f"comps_property_id_{instance.id}")
