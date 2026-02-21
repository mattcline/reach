from typing import Any, List, Dict, Optional
from django.contrib.auth.models import User
from pairdraft.aws_manager import aws_manager, BUCKETS
from rest_framework.response import Response
from rest_framework import status
  

def is_superuser(user: Any):
    """Returns True if the user is a Django superuser."""
    if isinstance(user, User): # necessary for type hint
        default_django_user: User = user
        return default_django_user.is_superuser
    return False


def get_editable_fields(object: Any, type: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns editable fields for a user to edit a model object on the frontend."""
    
    def get_field_data(field):
        """
        Deconstructs a field and returns data for that field, 
        including metadata and the field's value in the db.
        """
        deconstructed_field = field.deconstruct()
        field_type = field.get_internal_type()
        field_data = {
            "name": deconstructed_field[0],
            "title": deconstructed_field[0].replace("_", " ").capitalize(),
            "description": field.help_text,
            "type": field_type,
            "value": field.value_from_object(object),
            **deconstructed_field[3]
        }
        if field_type == "CharField" or field_type == "TextField":
            field_data['max_length'] = field.max_length
        return field_data
        
    editable_fields = []
    fields = object.get_form_fields(type) # note: model must have a get_form_fields method if it implements ModelWithFormFields interface      
    for field in fields:
        field_type = field.get_internal_type()
        
        if field_type not in ["CharField", "IntegerField", "TextField", "ArrayField", "BooleanField"]:
            # Note: we exclude fields like ManyToOneRel, django.db.models.fields.BigAutoField
            continue
        
        field_data = get_field_data(field)
        
        if field_type == "ArrayField":
            field_data['choices'] = field_data.get('base_field').choices if field_data.get('base_field') else None
            # remove non-seriazable fields
            field_data.pop('default', None)
            field_data.pop('base_field', None)
            
        editable_fields.append(field_data)
    
    return editable_fields
