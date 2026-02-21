import os

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.core.management.color import no_style
from django.db import connection

from users.models import UserProfile
from users import util as users_util
from properties.models import Property
# from properties.tasks import get_property_data
from terms.models import Terms, Agreement
from documents import seed as documents_seed
from documents.models import Document, Action
from tasks.models import Task
from tokens.models import Token
from pairdraft.redis_manager import redis_manager
from pairdraft.aws_manager import aws_manager, BUCKETS
from inbox.models import Message


class Command(BaseCommand):
    help = "Seeds the database with test data"
        
    def clear_database(self):
        # TODO: instead of deleting each model one by one, import models at the file/app level and delete all models.  When adding a new model, it's hard to remember to add the model name here
        User.objects.filter(is_superuser=False).delete()  # don't delete your local admin user!!
        UserProfile.objects.filter(user__is_superuser=False).delete()
        Property.objects.all().delete()
        Document.objects.all().delete()
        Terms.objects.all().delete()
        Agreement.objects.all().delete()
        Token.objects.all().delete()
        Message.objects.all().delete()
        Action.objects.all().delete()
        Task.objects.all().delete()
        
        redis_manager.r.flushdb()   # clear redis cache
        
        # reset the ids after deleting all of the data
        sequence_sql = connection.ops.sequence_reset_sql(no_style(), [User, UserProfile, Property, Document])
        with connection.cursor() as cursor:
            for sql in sequence_sql:
                cursor.execute(sql)

    def handle(self, *args, **options):
        # first, clear database
        self.clear_database()
        
        # create property
        photo_ids = ['1704598755343', '1704474825376', '1704474825699', '1704474825863']
        property, _ = Property.objects.update_or_create(
            address='20542 Seaboard Rd',
            city='Malibu',
            state='CA', 
            zip_code='90265',
            list_price=7890000,
            description="Located on a coveted bluff in the Big Rock niche of Malibu, this amazing opportunity offers breathtaking, head-on ocean views, complete privacy, and a recently remodeled beach house with all the modern amenities. The home exudes a hip, beach chic vibe with an open floor plan, featuring a fabulous kitchen, living room, dining room, and a den (or family room). EVERY room on the main floor offers panoramic views of the Pacific Ocean, including a full-length deck where you can relax on comfortable couches while enjoying sunrises, sunsets, dolphins playing, and views of Dume, Catalina, the South Bay, and the beautiful Queen's Necklace stretching to Palos Verdes. The lower level features the Primary suite, 3 additional bedrooms and an office. The primary suite feels like a spa with a cozy fireplace, two walk-in closets, and a luxurious bath with dual vanities. A special glass steam-shower with ocean views opens privately to the impressive patio area with an 8-foot cedar tub and custom fire pit overlooking the Pacific. Steps leading down to a romantic patio with a coral tree providing a perfect canopy for outdoor dining and entertaining. There is a gigantic, grassy lawn for sports or just relaxing. Also includes ample parking for multiple cars - unique for Malibu! Not only does this property offer a tranquil escape, but it also provides the advantage of being close to Pacific Palisades, Santa Monica, and other Westside areas, while still being just minutes away from central Malibu. What sets this property apart is the absence of any neighboring homes in sight. As an added bonus, this property comes with current plans for expanding the size and style if desired.",
            beds=4,
            baths=4,
            sqft=3499,
            lot_size=3499,
            year_built=1966,
            photo_urls=[f"{os.environ.get('AWS_PROPERTY_PHOTOS_URL')}/20542-Seaboard-Rd_Malibu_CA_90265/{photo_id}" for photo_id in photo_ids]
        )
        property.save()
        
        # get property data from bridge api
        # get_property_data.apply_async(args=[property.id])
        
        _, buyer = users_util.create_user('buyer@pairdraft.com', first_name='Buyer', last_name='Bob')
        _, seller = users_util.create_user('seller@pairdraft.com', first_name='Seller', last_name='Sally')
        document = documents_seed.mock_document(from_user=buyer, to_user=seller, property=property)

        # create reviewer
        _, reviewer = users_util.create_user('reviewer@pairdraft.com', first_name="Reviewer", last_name="Randy")
        reviewer.is_attorney = True
        reviewer.save()
        
        # request review
        action = Action.objects.create(
            type=Action.REQUEST_REVIEW,
            from_user=buyer,
            to_user=reviewer,
            document=document
        )
        action.save()

        # create review document
        review_document = document.create_copy(content_type=Document.JSON)
        action = Action.objects.create(
            type=Action.REVIEW, 
            from_user=reviewer,
            document=review_document
        )
        action.save()
        
        message = Message.objects.create(
            sender=buyer,
            recipient=reviewer,
            content="Hello, I'm requesting your review."
        )
        message.save()
        
        message = Message.objects.create(
            sender=reviewer,
            recipient=buyer,
            content="I'm happy to.  What I'll need from you is the following: lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum."
        )
        message.save()
        
        seller = UserProfile.objects.filter(email='seller@pairdraft.com').first()
        message = Message.objects.create(
            sender=reviewer,
            recipient=seller,
            content="I'm happy to.  What I'll need from you is the following: lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum lorem ipsum."
        )
        message.save()
        
        message = Message.objects.create(
            sender=seller,
            recipient=reviewer,
            content="Awesome!"
        )
        message.save()
        
        # create terms of service
        Terms.objects.create(
            name="terms_of_service",
            title="Terms of Service",
            text=f"""
            <div>
                PairDraft provides general real estate tools and cannot be held liable for specific advice pertaining to a transaction because it does not offer specialized advice.
            </div>
            <br>
            <div>
                PairDraft does not act as a real estate agent, nor does it offer any real estate advice.  The purpose of the app is to help people buy and sell homes by themselves.
            </div>
            <br>
            <div>
                Your transaction may have specific needs and it is your duty as the buyer or seller to understand those needs and address them.
            </div>
            <br>
            <div>
                PairDraft cannot offer legal advice. If the user needs such advice, they should seek the services of a skilled professional.
            </div>
            <br>
            <div>
                PairDraft uses artificial intelligence (AI) technology provided by OpenAI that can make mistakes. While efforts have been made to ensure the accuracy and reliability of the generated content, it may not always be error-free or completely accurate. The views and opinions expressed in the content are sometimes solely that of the AI model and do not necessarily reflect the views of the app owner. Users are advised to verify the information obtained through this app if necessary.
            </div>
            <br>
            """
        )
        
        # Inspiration: https://freeforms.com/terms-of-use/
        # create terms of offer
        Terms.objects.create(
            name="offer_initiation",
            title="Terms of Offer Initiation",
            text=f"""
            <div>
                This is just a template that was reviewed by a real estate attorney and meant to only be a starting place.  You should do your own research as to what to include in a purchase agreement you will sign.
            </div>
            <br>
            <div>
                We are not authorized to give real estate advice.
            </div>
            <br>
            <div>
                The contract’s completeness and soundness is your responsibility.  There may be items that are missing from this document template.
            </div>
            <br>
            <div>
                Reach uses artificial intelligence (AI) technology provided by OpenAI that can make mistakes. While efforts have been made to ensure the accuracy and reliability of the generated content, it may not always be error-free or completely accurate. The views and opinions expressed in the content are solely that of the AI model and do not necessarily reflect the views of PairDraft. Users are advised to verify the information obtained through this app if necessary.  Any assistance provided by AI is not a substitute for professional legal advice.
            </div>
            <br>
            <div>
                I will not redistribute this form in any way.  That would be unauthorized reproduction of copyrighted material.
            </div>
            <br>
            <div>
                This form is for personal or internal use only and not for redistribution or commercial purposes.
            </div>
            <br>
            <div>
                There’s a section in the document that identifies disclosures the seller must provide the buyer.  This is by no means an exhaustive list and the seller must due their due diligence and research all required disclosures they need to provide.
            </div>
            <br>
            <div>
                If you receive a counteroffer, it is your responsibility to diligently scan the document for any changes.
            </div>
            <br>
            <div>
                Disclaimer: After accepting an offer but before signing the agreement, we <b>highly</b> encourage you to get any agreement reviewed by a real estate attorney on your behalf.
            </div>
            """
        )
        
        # create terms of offer completion
        Terms.objects.create(
            name="offer_completion",
            title="Terms of Offer Completion",
            text=f"""
            <div>
                Disclaimer: After accepting an offer but before signing the agreement, we <b>highly</b> encourage you to get any agreement reviewed by a real estate attorney on your behalf.
            </div>
            <br>
            <div>
                The generated content from this app is offered for free and as such we do not guarantee its accuracy.  You are advised to verify the information obtained through this app with a real estate attorney.
            </div>
            <br>
            """
        )

        self.stdout.write(
            self.style.SUCCESS('Successfully seeded db.')
        )
