"""
URL configuration for pairdraft project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import routers

from . import views
from agent import views as agent_views
from properties import views as properties_views
from users import views as users_views
from payments import views as payments_views
from terms import views as terms_views
from tasks import views as tasks_views
from documents import views as documents_views
from inbox import views as inbox_views
from waitlist import views as waitlist_views

router = routers.DefaultRouter()
router.register(r'documents', documents_views.DocumentViewSet)
router.register(r'threads', documents_views.ThreadViewSet)
router.register(r'comments', documents_views.CommentViewSet)
router.register(r'agent_messages', agent_views.AgentMessageViewSet)
router.register(r'properties', properties_views.PropertyViewSet)
router.register(r'user_profiles', users_views.UserProfileViewSet, basename='user_profiles')
router.register(r'preferences', users_views.PreferencesViewSet, basename='preferences')
router.register(r'agreements', terms_views.AgreementViewSet)
router.register(r'terms', terms_views.TermsViewSet)
router.register(r'tasks', tasks_views.TaskViewSet)
router.register(r'inbox', inbox_views.MessageViewSet)
router.register(r'waitlist', waitlist_views.WaitlistSignupViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path("logout/", views.logout_view, name="logout"),
    path("users/", include("users.urls")),
    path("payments/", include("payments.urls")),
    path("billing/", include("billing.urls")),
    path("tokens/", include("tokens.urls")),
    path("auth/", include("tokens.urls")),  # New extensible authentication namespace
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls'))
]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
