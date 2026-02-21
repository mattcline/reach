import re
from typing import Dict, Any
from datetime import datetime

def replace_var(text, fields: Dict[str, Any]) -> str:
    """
    Replaces a variable with a value.
    
    text: text to replace variables in
    fields: Dict of variable names and values (either an object or a string)
    """

    def _replace_var(match):
        variable = match.group(1)
        
        # if variable includes a '.' then it's nested
        if variable.find(".") != -1:
            # get the text before the first '.' to get the object name
            obj_name, obj_attrs = variable.split(".", 1)
            
            obj = fields.get(obj_name)
            if obj is None:
                return "______"
            
            return str(get_nested_attr(obj, obj_attrs))
        
        if match.group(0).startswith("{{"):
            return str(fields.get(variable, f"<span id='{datetime.now().isoformat()}' class='text-red-500'>______</span>"))  # cast to str because sometimes it's a number
        
        return str(fields.get(variable, match.group(0)))

    pattern = r'\{{1,2}([^}]+)\}{1,2}' # grabs anything between { and } or {{ and }}
    return re.sub(pattern, _replace_var, text)


def get_nested_attr(obj, attr_string):
    attributes = attr_string.split(".")
    for attr in attributes:
        obj = getattr(obj, attr)
    return obj


def set_nested_attr(obj, attr_string, value):
    attributes = attr_string.split(".")
    for attr in attributes[:-1]:
        obj = getattr(obj, attr)
    setattr(obj, attributes[-1], value)
    obj.save()
    return obj
