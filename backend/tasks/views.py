from rest_framework import viewsets, status, permissions
from tasks.models import Task
from tasks.serializers import TaskSerializer
from pairdraft import views_util


class TaskViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows actions to be viewed or edited.
    """
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if views_util.is_superuser(self.request.user):
            return Task.objects.all()
        return Task.objects.filter(user_profile__user=self.request.user).order_by('due_date')
