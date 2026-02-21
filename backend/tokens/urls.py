from django.urls import path

from . import views

urlpatterns = [
    path("socket-token/", views.create_socket_token, name="socket-token"),
    path("magic-code/request/", views.magic_code_request, name="magic-code-request"),
    path("magic-code/verify/", views.magic_code_verify, name="magic-code-verify"),
]