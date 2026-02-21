import logging
logger = logging.getLogger('django')

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from pairdraft.aws_manager import aws_manager, BUCKETS
from pairdraft import views_util
from properties.permissions import IsAuthorized
from properties.tasks import get_property_data
from properties.api import bridge as bridge_api
from properties.serializers import PropertySerializer
from properties.models import Property


class PropertyViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows properties to be viewed or edited.
    """
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    permission_classes = [IsAuthorized]
    filterset_fields = ['slug', 'public_listing']
    
    def create(self, request, *args, **kwargs):
        """Creates a property or returns an existing one."""
        zpid = request.data.get('zpid')
        if zpid:
            existing_property = Property.objects.filter(zpid=zpid).first()
            if existing_property:
                logger.info(f"Property with zpid {zpid} already exists.")
                serializer = PropertySerializer(existing_property, context={'request': request})
                return Response(serializer.data, status=status.HTTP_200_OK)
            
        slug = Property.get_slug(
            address=request.data.get('address'),
            city=request.data.get('city'),
            state=request.data.get('state'),
            zip_code=request.data.get('zip_code')
        )
        if slug:
            existing_property = Property.objects.filter(slug=slug).first()
            if existing_property:
                logger.info(f"Property with slug {slug} already exists.")
                serializer = PropertySerializer(existing_property, context={'request': request})
                return Response(serializer.data, status=status.HTTP_200_OK)
    
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            property = serializer.save()
            logger.info(f"Property {property.id} created by {request.user}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    def perform_update(self, serializer):
        property = self.get_object()
        
        photo_urls = serializer.validated_data.get('photo_urls')
        if photo_urls:
            old_photo_urls = property.photo_urls
            deleted_photos = list(set(old_photo_urls) - set(photo_urls))
            
            # delete photos from s3
            for photo_url in deleted_photos:
                aws_manager.delete_object(bucket=BUCKETS.KOYA_PROPERTY_IMAGES.value, key=photo_url.split('.com/')[-1])
                print("Deleted photo from s3: ", photo_url)
        
        instance = serializer.save()
        
        # if address changed, get property data from bridge api
        address = serializer.validated_data.get('address')
        if address:
            logger.info(f"[EDIT PROPERTY] Address added or changed for property {instance}. Fetching property data...")
            get_property_data(instance.id)

        # TODO: add this to logger and/or trigger email
        print(f"[EDIT PROPERTY] Updated the following fields for property {instance}: {serializer.validated_data.keys()}")
        # TODO: if slug is updated, might need to update elsewhere like the filepath in s3
    
    # @action(detail=True, methods=['get'])
    # def comps(self, request, pk=None):
    #     comps = util.get_comps(property=self.get_object())
    #     return Response(comps)
    
    @action(detail=True)
    def editable_fields(self, request, pk=None):
        """Returns a list of editable fields to be used for editing a property on the frontend."""        
        property = self.get_object()
        editable_fields = views_util.get_editable_fields(property)
        return Response(editable_fields, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def parcel_from_zpid(self, request, *args, **kwargs):
        """
        Custom action to return the parcel from a zpid (Zillow ID).
        """
        zpid = request.data.get('zpid', None)
        parcel = bridge_api.get_parcel_from_zpid(zpid)
        
        if not parcel:
            return Response({"error": "Parcel not found."}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(parcel, status=status.HTTP_200_OK)
