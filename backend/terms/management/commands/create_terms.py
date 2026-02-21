from terms.models import Terms
from django.core.management.base import BaseCommand


# Existing Terms:
# name="terms_of_service", title="Terms of Service"
# name="offer_initiation", title="Terms of Offer Initiation"  # inspiration: https://freeforms.com/terms-of-use/
# name="offer_completion", title="Terms of Offer Completion"

# Example usage: ./manage.py create_terms --name "terms_of_service" --title "Terms of Service" --file_path "terms/terms/terms_of_service/may_15_2024.html"

class Command(BaseCommand):
    help = 'Creates Terms object given a name, title, and file_path containing the terms HTML.'

    def add_arguments(self, parser):
        parser.add_argument('--name', type=str, help='Specify a name')
        parser.add_argument('--title', type=str, help='Specify a title')
        parser.add_argument('--file_path', type=str, help='Specify a file path for the terms HTML')

    def handle(self, *args, **options):
        name = options['name']
        title = options['title']
        file_path = options['file_path']
        
        if not name:
            print("Please provide a name.")
            return
        if not title:
            print("Please provide a title.")
            return
        if not file_path:
            print("Please provide a file path for the terms HTML.")
            return

        with open(file_path, "r") as file:
            text = file.read()
            
        if not text:
            print("Could not read terms HTML from file path provided.")
            return
        
        Terms.objects.create(name=name, title=title, text=text)
        print("Created new Terms object!")
