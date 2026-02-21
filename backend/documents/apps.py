from django.apps import AppConfig


class DocumentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'documents'
    
    # register signals
    def ready(self):
        import documents.signals  # noqa
