
import os
import json
import dataclasses
from typing import Dict, Any, Tuple, Literal
from rest_framework.utils.serializer_helpers import ReturnDict, ReturnList
from properties.models import Property
from properties.api import bridge as bridge_api
from properties.serializers import PropertySerializer
from pairdraft.redis_manager import redis_manager
    

def get_parcel(property: Property, sync: bool = False) -> Dict[str, Any]:
    parcel = redis_manager.r.get(f'parcel_property_id_{property.id}')
    if parcel:
        parcel = json.loads(parcel)
    else:
        parcel = bridge_api.get_parcel_by_address(property.full_address)
        redis_manager.r.set(f'parcel_property_id_{property.id}', json.dumps(parcel), ex=3600)
        
    if not parcel: return {}
    
    if sync:
        # sync data from Bridge API to Property object
        property.land_use_description = parcel.get('landUseDescription')
        property.apn = parcel.get('apn')
        
        county = parcel.get('county')
        if county:
            property.county = county.replace(' County', '')
            
        property.save()
    
    return parcel
    
def get_zestimate(property: Property) -> Dict[str, Any]:
    """Returns zestimate for a property."""
    zestimate = redis_manager.r.get(f'zestimate_property_id_{property.id}')
    zestimate = json.loads(zestimate) if zestimate else None
    if not zestimate:
        parcel = get_parcel(property)
        zestimate_data = bridge_api.get_zestimate(zpid=parcel.get('zpid'))
        zestimate = {
            "zestimate": zestimate_data.get('zestimate'),
            "zillow_url": zestimate_data.get('zillowUrl')
        }
        redis_manager.r.set(f'zestimate_property_id_{property.id}', json.dumps(zestimate), ex=3600)
    return {
        "zestimate": f"${zestimate.get('zestimate')}",
        "listing_url": zestimate.get('zillow_url')
    }

def get_comps(property: Property) -> Dict[str, Any]:
    """Returns comps for a property."""    
    comps = redis_manager.r.get(f'comps_property_id_{property.id}')
    if comps:
        comps = json.loads(comps)
    else:
        parcel = get_parcel(property)
        # get comps for property
        parcel_comps = [dataclasses.asdict(comp) for comp in bridge_api.get_comps(property=property, base_parcel=parcel)]  # convert Comp dataclass to dict

        comps = {
            "parcel": parcel, 
            "comps": parcel_comps
        }
        
        # add to redis
        # set ttl to 1 hr
        redis_manager.r.set(f'comps_property_id_{property.id}', json.dumps(comps), ex=3600)

    # TODO: could move this into a formatting function for websocket-specific response
    return comps

def build_pricing_recommendation(zestimate, comps):
    # use price / sqft ratio from comps to get price recommendation
    pass

def update_listing_price():
    # set price on Listing table in db
    pass

def get_listing_url_data(property: Property):
    listing_url = f"{os.environ.get('FRONTEND_URL')}/properties/{property.slug}"
    return {
        "href": listing_url,
        "text": listing_url
    }
    
def set_property_type(type: str, property: Property):
    property.home_type = type
    property.save()
    
def get_property_requires_hoa(property: Property) -> bool:
    return property.requires_hoa
