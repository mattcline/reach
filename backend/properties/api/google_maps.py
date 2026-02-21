import os
import requests

GOOGLE_MAPS_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json'


def make_request(params):
    response = requests.get(
        GOOGLE_MAPS_API_URL, 
        params=params
    )
    return response.json()

def get_coordinates_from_address(address: str):
    response = make_request({
        'address': address,
        'key': os.environ.get('GOOGLE_MAPS_API_KEY')
    })
    return response['results'][0]['geometry']['location']
