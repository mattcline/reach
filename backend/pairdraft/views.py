from django.contrib.auth import logout
from rest_framework import status
from django.http import JsonResponse


def logout_view(request):
    logout(request)
    return JsonResponse({}, status=status.HTTP_200_OK)
