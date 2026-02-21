from django.urls import path

from billing import views

urlpatterns = [
    path("subscription/", views.subscription_status, name="subscription"),
    path("create-portal-session/", views.create_portal_session, name="create-portal-session"),
    path("usage/", views.check_user_usage, name="usage"),
]