import json

from pairdraft.aws_manager import aws_manager, BUCKETS
from documents.models import Document, Action


def mock_document(from_user: 'users.UserProfile', to_user: 'users.UserProfile', property: 'properties.Property'):
    document = Document.objects.create(
        title='Purchase Agreement',
        property=property
    )
    
    # Read and load the JSON data from the file
    with open('documents/purchase_agreement.json', 'r') as file:
        data = json.load(file)

        aws_manager.upload_object(
            bucket=BUCKETS.PAIRDRAFT_DOCUMENTS.value,
            file_path=document.get_file_path(content_type=Document.JSON),
            body=json.dumps(data),
            content_type=Document.JSON
        )

    Action.objects.create(
        type=Action.CREATE,
        from_user=from_user,
        document=document
    )
    
    Action.objects.create(
        type=Action.SUBMIT,
        from_user=from_user,
        to_user=to_user,
        document=document
    )
  
    return document
