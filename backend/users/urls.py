from django.urls import path

from . import views

urlpatterns = [
    path('delete/', views.delete, name='delete'),
    path("", views.index, name="index"),
]