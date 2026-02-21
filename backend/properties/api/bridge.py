# Bridge website: https://bridgedataoutput.com/login
# Bridge documentation: https://bridgedataoutput.com/docs/platform/

import os
import re
import pprint
import requests
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from . import google_maps as google_maps_api
from bs4 import BeautifulSoup
from properties.models import Property

ZILLOW_PREFIX = "https://www.zillow.com/homedetails/"
GOOGLE_SEARCH_PREFIX = "https://www.google.com/search?q="
BRIDGE_API_URL = 'https://api.bridgedataoutput.com/api/v2/'


class ResourceType(str, Enum):
    PARCELS = 'pub/parcels'
    ASSESSMENTS = 'pub/assessments'
    TRANSACTIONS = 'pub/transactions'
    ZESTIMATES = 'zestimates_v2/zestimates'

    
@dataclass
class Comp:
    parcel: Dict
    points: int
    listing_url: str
    sales_price: int
    sales_date: str
    num_beds: int
    num_baths: int


def make_request(url: str, params: Dict[str, Any] = {}):
    response = requests.get(
        url, 
        params=params, 
        headers={
            "Authorization": f"Bearer {os.environ.get('BRIDGE_API_KEY')}"
        }
    )
    return response.json()

def get_date_from_str(date_str: str):
    return datetime.strptime(date_str.split('T')[0], '%Y-%m-%d')

def get_parcel_by_id(id: int):
    if id is None:
        return {}
    
    url = f'{BRIDGE_API_URL}{ResourceType.PARCELS.value}/{id}'
    response = make_request(url)
    return response['bundle']

def get_parcel_by_address(address: str) -> Dict[str, Any]:
    if not address:
        return {}
    
    params = {
        'address': address,
        'limit': 1
    }
    url = f'{BRIDGE_API_URL}{ResourceType.PARCELS.value}'
    response = make_request(url, params=params)
    return response['bundle'][0] if len(response['bundle']) > 0 else {}

def format_parcel(parcel: Dict) -> Dict:
    """Format parcel data."""
    address = parcel.get('address', {})
    zillow_url = f"{ZILLOW_PREFIX}{get_zillow_search_details(parcel.get('address'), parcel.get('zpid'))}"
    return {
        "house": address.get('house'),
        "street": address.get('street'),
        "streetSuffix": address.get('streetSuffix'),
        "unit": address.get('unit'),
        "unitType": address.get('unitType'),
        "city": address.get('city'),
        "state": address.get('state'),
        "zip": address.get('zip'),
        "address": parcel.get('address', {}).get('full'),
        "zillow_url": zillow_url,
        "zpid": parcel.get('zpid')
    }

def get_parcels_from_address(address: str, limit: int = 3) -> List[Dict[str, Any]]:
    if not address:
        return []
    
    params = {
        'address.full.in': address,
        'limit': limit
    }
    url = f'{BRIDGE_API_URL}{ResourceType.PARCELS.value}'
    response = make_request(url, params=params)
    
    formatted_parcels = [format_parcel(parcel) for parcel in response['bundle']]
    return [parcel for parcel in formatted_parcels if parcel.get('state') == 'CA']  # only return CA parcels for now

def get_parcel_from_zpid(zpid: str) -> Dict[str, Any]:
    if zpid is None:
        return {}
    
    url = f'{BRIDGE_API_URL}{ResourceType.PARCELS.value}'
    params = {
        'zpid': zpid,
        'limit': 1
    }
    response = make_request(url, params=params)
    parcel = response['bundle'][0] if len(response['bundle']) > 0 else {}
    return format_parcel(parcel) if parcel else {}

def get_transactions(address: Optional[str] = None,
                     near: Optional[str] = None,
                     radius: str = '5km',
                     sort_by: str = 'documentDate',
                     fields: List[str] = ['salesPrice', 'documentDate', 'parcels'],
                     limit: int = 200,
                     offset: int = 0,
                     days_back: int = 240):
    """
    Returns transactions near a property.
    
    Args:
        address: address of property
    """
    if address is None and near is None:
        return []
    
    params = {}
    
    # populate 'near' with lat, lng coordinates
    if near is not None:
        params['near'] = near
    elif address is not None:
        coordinates = google_maps_api.get_coordinates_from_address(address)
        params['near'] = f"{coordinates['lng']},{coordinates['lat']}"
        
    if radius is not None:
        params['radius'] = radius
    if sort_by is not None:
        params['sortBy'] = sort_by
    if fields is not None:
        params['fields'] = ','.join(fields)
    if limit is not None:
        params['limit'] = limit
    if offset is not None:
        params['offset'] = offset
    
    url = f'{BRIDGE_API_URL}{ResourceType.TRANSACTIONS.value}'
    response = make_request(url, params=params)
    txs = response['bundle']
    
    oldest_tx_date = get_date_from_str(date_str=txs[-1]['documentDate'])
    oldest_search_date = datetime.now() - timedelta(days=days_back)
    
    # we've reached the oldest search date
    if oldest_tx_date < oldest_search_date:
        # filter out transactions older than days_back
        return [tx for tx in txs if get_date_from_str(date_str=tx['documentDate']) >= oldest_search_date]
    else:
        return txs + get_transactions(address=address, near=near, 
                                      radius=radius, sort_by=sort_by, 
                                      fields=fields, limit=limit, 
                                      offset=offset+len(txs), days_back=days_back)

def get_comps(property: Property, base_parcel: Dict[str, Any]) -> List[Comp]:
    """
    Get comps for the subject base_parcel.
    https://www.zillow.com/sellers-guide/real-estate-comps/
    """
    comps = []
    
    address = property.address
    base_parcel_num_beds, base_parcel_num_baths = property.beds, property.baths
    if not base_parcel_num_beds or not base_parcel_num_baths:
        base_parcel_num_beds, base_parcel_num_baths = get_beds_and_baths(base_parcel['address'], base_parcel['zpid'])
    
    # TODO: make sure address of returned base_parcel matches the actual address of the property
    
    transactions = get_transactions(address=address)
    
    for transaction in transactions:
        if transaction['salesPrice'] is None:
            continue
        
        # TODO: potentially filter on parcels.unitType
        
        parcels = transaction['parcels']
        # for now, only handle the case when we have one parcel
        if len(parcels) != 1:
            continue
            
        # get parcel details
        parcel = parcels[0]
        
        # saves on the number of API calls we need to make to the bridge API
        # TODO: grab number of sq ft from the google search
        # skip parcel if it doesn't have the same number of beds and baths as the property
        parcel_num_beds, parcel_num_baths = get_beds_and_baths(parcel)
        
        # skip parcel if we don't have number of beds and baths
        if not base_parcel_num_beds or not base_parcel_num_baths or not parcel_num_beds or not parcel_num_baths:
            continue
        
        # make sure parcel has a similar number of beds and baths as the property
        if parcel_num_beds not in range(base_parcel_num_beds - 1, base_parcel_num_beds + 2) \
            or parcel_num_baths not in range(base_parcel_num_baths - 1, base_parcel_num_baths + 2):
            continue
        
        parcel = get_parcel_by_id(id=parcel['parcelID'])
           
        # calculate points for parcel
        parcel_points = get_points_for_parcel(base_parcel, parcel, base_parcel_num_beds, base_parcel_num_baths)
        
        zillow_url = f"{ZILLOW_PREFIX}{get_zillow_search_details(parcel['address'], parcel['zpid'])}"
        
        if len(comps) < 3:
            comps.append(Comp(parcel=parcel, 
                              points=parcel_points, 
                              listing_url=zillow_url, 
                              sales_price=transaction['salesPrice'], 
                              sales_date=transaction['documentDate'],
                              num_beds=parcel_num_beds,
                              num_baths=parcel_num_baths))
        elif comps[-1].points < parcel_points:
            removed_comp = comps.pop()
            comps.append(Comp(parcel=parcel,
                              points=parcel_points, 
                              listing_url=zillow_url, 
                              sales_price=transaction['salesPrice'], 
                              sales_date=transaction['documentDate'],
                              num_beds=parcel_num_beds,
                              num_baths=parcel_num_baths))
            comps = sorted(comps, key=lambda x: x.points, reverse=True) # re-sort after insertion

            print(f'Replaced \n')
            pprint.pprint(removed_comp.parcel)
            print(f'\n Points: {removed_comp.points} \n')
            print(f'\n with \n')
            pprint.pprint(parcel)
            print(f'\n Points: {parcel_points} \n')
            print('\n\n')
        
    return comps

def get_size(parcel):
    areas = parcel['areas']
    for area in areas:
        if area['type'] == 'Zillow Calculated Finished Area':
            return area['areaSquareFeet']
    return 0

def get_year_built(parcel):
    building = parcel['building']
    if len(building) == 1:
        building = building[0]
        return building['yearBuilt']
    return 0

def get_points_for_parcel(property, parcel, property_num_beds, property_num_baths) -> int:
    points = 0
    
    # if different type of property, return 0 points
    # if property['landUseDescription'] != parcel['landUseDescription']:
    #     return 0
    
    # calculate points for size
    parcel_size = get_size(parcel)
    property_size = get_size(property)
    if not parcel_size or not property_size:
        return 0 # return early if we don't have size info
    diff_in_size = abs(parcel_size - property_size)
    if diff_in_size > 1000:
        # size difference is too large
        return 0
    if diff_in_size < 100:
        points += 5
    elif diff_in_size < 200:
        points += 3
    elif diff_in_size < 300:
        points += 1
    else:
        points += .5
                
    # calculate points for year built
    parcel_year_built = get_year_built(parcel)
    property_year_built = get_year_built(property)
    if parcel_year_built and property_year_built:
        diff_in_year_built = abs(parcel_year_built - property_year_built)
        if diff_in_year_built < 5:
            points += 5
        elif diff_in_year_built < 10:
            points += 3
        elif diff_in_year_built < 20:
            points += 1

    return points

def get_beds_and_baths(address, zpid: Optional[str] = None) -> Tuple[Optional[int], Optional[int]]:
    # get beds and baths from a google search since it is not included in 
    # the 'building' level data for apartments and condos
    search_details = get_zillow_search_details(address, zpid)
    
    # perform a google search for the zillow listing
    response = requests.get(f"{GOOGLE_SEARCH_PREFIX}{search_details}")
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # find the zillow listing in the search results
    zillow_anchor_tag = soup.find_all(href=re.compile(re.escape(f"{ZILLOW_PREFIX}{search_details}")))
    if not zillow_anchor_tag:
        print("no zillow_anchor_tag found")
        print(re.escape(f"{ZILLOW_PREFIX}{search_details}"))
        return None, None
    zillow_anchor_tag = zillow_anchor_tag[0]
    zillow_el = zillow_anchor_tag.parent.parent
    
    # find the element with the description including the number of beds and baths
    parcel_description = zillow_el.find(text=re.compile('bed'))
    
    if not parcel_description:
        print("could not find parcel description")
        return None, None
    
    # extract number of beds and baths from the description
    result = re.search('.* (.*) bed[s]?, (.*) bath', parcel_description)
    if not result:
        print("could not find number of beds and baths")
        print(parcel_description)
        return None, None
    
    num_beds = result.group(1)
    num_baths = result.group(2)
    
    try:
        num_beds = int(num_beds)
        num_baths = int(num_baths)
    except ValueError as err:
        return None, None

    return num_beds, num_baths

def get_zillow_search_details(address, zpid: Optional[str] = None):
    """
    Example: 133-W-14th-St-APT-4-New-York-NY-10011/80003074_zpid/
    """
    search_details = f"{address['house']}"
    
    for key in ['streetPre', 'street', 'streetSuffix']:
        if address[key]:
            search_details += f"-{address[key].replace(' ', '-')}"
            
    if address['unitType'] and address['unitType'] not in ['#']: # for some reason, if unitType is '#', it is not included in the zillow search details
        search_details += f"-{address['unitType'].upper()}"
    
    # TODO: could potentially combine with above case
    if address['unit']:
        search_details += f"-{address['unit']}"
        
    if address['city']:
        search_details += f"-{address['city'].replace(' ', '-')}"
        
    for key in ['state', 'zip']:
        if address[key]:
            search_details += f"-{address[key]}"
    
    if zpid is not None:
        search_details += f"/{zpid}_zpid/"
        
    return search_details

    # return (
    #     f"{address['house']}-{address['streetPre']}-{address['street']}-"
    #     f"{address['streetSuffix']}-{address['unitType'].upper() if address['unitType'] else ''}-{address['unit']}-"
    #     f"{address['city'].replace(' ', '-')}-{address['state']}-{address['zip']}/{zpid}_zpid/"
    # )

def get_zestimate(zpid: str):
    url = f'{BRIDGE_API_URL}{ResourceType.ZESTIMATES.value}'
    params: Dict[str, Any] = {
        'limit': 1,
        'zpid': zpid
    } 
    response = make_request(url, params=params)
    return response['bundle'][0] if len(response['bundle']) > 0 else {}

# def get_assessments_from_address(address: str):
#     response = make_request(ResourceType.ASSESSMENTS, {
#         'address': address,
#         'limit': 1
#     })
#     return response['bundle'][0]
