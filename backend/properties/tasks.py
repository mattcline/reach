from properties.models import Property
from properties import util as properties_util
import logging
logger = logging.getLogger('django')

  
def get_property_data(property_id: int) -> None:
    """Fetches property data from Bridge API and stores it in Redis temporarily."""
    logger.info("Fetching property data...")
    property = Property.objects.get(id=property_id)
    properties_util.get_parcel(property, sync=True) # stores the parcel in redis, particularly the zpid required for get_zestimate
    properties_util.get_zestimate(property)
    properties_util.get_comps(property)