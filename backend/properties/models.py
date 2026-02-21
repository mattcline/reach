import uuid
from typing import Optional
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.utils import timezone
from pairdraft.interfaces import ModelWithFormFields


class Property(models.Model, ModelWithFormFields):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=200, null=True, blank=True, unique=True)
    address = models.CharField(max_length=200)
    city = models.CharField(max_length=200)
    county = models.CharField(max_length=200, null=True, blank=True) # do not require county in form
    state = models.CharField(max_length=2)
    zip_code = models.CharField(max_length=200)
    
    list_price = models.IntegerField(null=True)
    
    home_owners_association = models.IntegerField(null=True, blank=True) # Homeowners Association fee
    MONTHLY = 'monthly'
    ANNUALLY = 'annually'
    HOA_FREQUENCY_CHOICES = (
        (MONTHLY, 'Monthly'),
        (ANNUALLY, 'Annually')
    )
    hoa_frequency = models.CharField(max_length=100, choices=(HOA_FREQUENCY_CHOICES), default=MONTHLY)
    
    description = models.TextField(null=True)
    beds = models.IntegerField(null=True)
    baths = models.IntegerField(null=True)
    sqft = models.IntegerField(null=True) # finished sqft
    year_built = models.IntegerField(null=True)
    lot_size = models.IntegerField(null=True) # in sqft
    
    # Bridge API data
    # land_use_description = models.CharField(max_length=200, null=True)  # e.g. 'Single Family Residential'  # TODO: enumerate choices
    apn = models.CharField(max_length=200, null=True, blank=True)  # Assessor Parcel Number
    
    # Home type
    # These are taken from Zillow's home types
    SINGLE_FAMILY = 'single_family'
    CONDO = 'condo'
    TOWNHOUSE = 'townhouse'
    MULTI_FAMILY = 'multi_family'
    APARTMENT = 'apartment'
    MOBILE_MANUFACTURED = 'mobile_manufactured'
    COOP_UNIT = 'coop_unit'
    VACANT_LAND = 'vacant_land'
    OTHER = 'other'
    HOME_TYPE_CHOICES = (
        (SINGLE_FAMILY, 'Single Family'),
        (CONDO, 'Condo'),
        (TOWNHOUSE, 'Townhouse'),
        (MULTI_FAMILY, 'Multi Family'),
        (APARTMENT, 'Apartment'),
        (MOBILE_MANUFACTURED, 'Mobile / Manufactured'),
        (COOP_UNIT, 'Co-op Unit'),
        (VACANT_LAND, 'Vacant Land'),
        (OTHER, 'Other')
    )
    home_type = models.CharField(max_length=100, choices=(HOME_TYPE_CHOICES), default=SINGLE_FAMILY)
    
    # Appliances
    DISHWASHER = 'dishwasher'
    DRYER = 'dryer'
    FREEZER = 'freezer'
    GARBAGE_DISPOSAL = 'garbage_disposal'
    MICROWAVE = 'microwave'
    RANGE_OR_OVEN = 'range_or_oven'
    REFRIGERATOR = 'refrigerator'
    TRASH_COMPACTOR = 'trash_compactor'
    WASHER = 'washer'
    APPLIANCE_CHOICES = (
        (DISHWASHER, 'Dishwasher'),
        (DRYER, 'Dryer'),
        (FREEZER, 'Freezer'),
        (GARBAGE_DISPOSAL, 'Garbage Disposal'),
        (MICROWAVE, 'Microwave'),
        (RANGE_OR_OVEN, 'Range / Oven'),
        (REFRIGERATOR, 'Refrigerator'),
        (TRASH_COMPACTOR, 'Trash Compactor'),
        (WASHER, 'Washer')
    )
    
    appliances = ArrayField(
        models.CharField(name="appliance", max_length=100, choices=(APPLIANCE_CHOICES)),
        default=list,
        blank=True
    )
    
    public_listing = models.BooleanField(default=True, blank=True, help_text="Whether the property is searchable in Koya")
    
    photo_urls = ArrayField(models.CharField(max_length=200), default=list, blank=True) # blank=True means that the field is not required in the form
    
    # TODO: instead of keeping a list here, look into using 'editable=False' for each field
    excluded_form_fields = ['photo_urls'] # fields which should not be editable in the Edit Property form on the frontend
    
    zpid = models.CharField(max_length=200, unique=True, null=True, blank=True)  # Zillow ID
    zillow_url = models.CharField(max_length=1000, null=True, blank=True)  # Zillow listing URL

    @property
    def full_address(self):
        return f"{self.address}, {self.city}, {self.state} {self.zip_code}"
    
    @property
    def requires_hoa(self):
        return self.home_type == self.CONDO or self.home_type == self.TOWNHOUSE or self.home_type == self.COOP_UNIT
    
    def save(self, *args, **kwargs):
        # Make sure when saving fields in production to save in Django admin, not Postico
        self.slug = self.get_slug(
            address=self.address,
            city=self.city,
            state=self.state,
            zip_code=self.zip_code
        )
        super().save(*args, **kwargs)
    
    @staticmethod
    def get_slug(address: str, city: str, state: str, zip_code: str) -> Optional[str]:
        s = f"{address.replace(' ', '-')}"
        for field in [city, state, zip_code]:
            s += '_' + field.replace(' ', '-')
        return s
