# Generated manually for fixing AgentMessage timestamps

from django.db import migrations
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


def fix_agent_message_timestamps(apps, schema_editor):
    AgentMessage = apps.get_model('agent', 'AgentMessage')
    Action = apps.get_model('documents', 'Action')
    
    # First, delete messages containing 'continue'
    continue_messages = AgentMessage.objects.filter(content__icontains='continue')
    continue_count = continue_messages.count()
    
    if continue_count > 0:
        logger.info(f'Found {continue_count} messages containing "continue"')
        
        # Log a few examples before deletion
        for msg in continue_messages[:3]:
            logger.info(f'  - Deleting {msg.role} message: "{msg.content[:50]}..."')
        
        continue_messages.delete()
        logger.info(f'Deleted {continue_count} messages containing "continue"')
    else:
        logger.info('No messages containing "continue" found')
    
    # Now fix timestamps based on document creation
    documents_with_messages = AgentMessage.objects.values_list('document_id', flat=True).distinct()
    
    updated_count = 0
    missing_creation_count = 0
    
    for doc_id in documents_with_messages:
        # Find the 'create' action for this document
        create_action = Action.objects.filter(
            document_id=doc_id,
            type='create'  # Using string directly since Action.CREATE constant isn't available in migration
        ).first()
        
        if not create_action:
            missing_creation_count += 1
            logger.warning(f'No create action found for document {doc_id}')
            continue
        
        # Get all messages for this document ordered by their current timestamp
        messages = AgentMessage.objects.filter(document_id=doc_id).order_by('timestamp')
        
        if not messages.exists():
            continue
        
        base_timestamp = create_action.timestamp
        
        # Update each message with incremental timestamps
        for index, message in enumerate(messages):
            # Add 30 seconds for each message to preserve order
            new_timestamp = base_timestamp + timedelta(seconds=30 * index)
            
            message.timestamp = new_timestamp
            message.save(update_fields=['timestamp'])
            
            updated_count += 1
        
        logger.info(
            f'Document {doc_id}: Updated {messages.count()} messages '
            f'starting from {base_timestamp}'
        )
    
    # Summary
    logger.info('='*50)
    logger.info('MIGRATION SUMMARY:')
    logger.info(f'Messages deleted (containing "continue"): {continue_count}')
    logger.info(f'Messages updated with new timestamps: {updated_count}')
    logger.info(f'Documents missing create action: {missing_creation_count}')


def reverse_fix_timestamps(apps, schema_editor):
    # This migration is not easily reversible since we deleted messages
    # and changed timestamps. Log a warning if someone tries to reverse it.
    logger.warning(
        'Reversing timestamp fix migration. Note: Deleted messages cannot be restored '
        'and original timestamps are lost.'
    )


class Migration(migrations.Migration):

    dependencies = [
        ('agent', '0006_migrate_userstep_messages'),
        ('documents', '0001_initial'),  # Ensure Action model exists
    ]

    operations = [
        migrations.RunPython(fix_agent_message_timestamps, reverse_fix_timestamps),
    ]