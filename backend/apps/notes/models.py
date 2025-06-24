import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Note(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, default="Untitled Note")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_notes')
    collaborators = models.ManyToManyField(User, blank=True, related_name='shared_notes')
    
    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['owner', '-updated_at']),
        ]
    
    def __str__(self):
        return f"{self.title} by {self.owner.username}"
    
    def get_collaborators_count(self):
        return self.collaborators.count()
    
    def get_blocks_count(self):
        return self.blocks.count()
