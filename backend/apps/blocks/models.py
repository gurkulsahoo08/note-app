import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from apps.notes.models import Note


class Block(models.Model):
    BLOCK_TYPES = [
        ('text', 'Text'),
        ('heading', 'Heading'),
        ('code', 'Code'),
        ('latex', 'LaTeX'),
        ('image', 'Image'),
        ('table', 'Table'),
        ('list', 'List'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='blocks')
    block_type = models.CharField(max_length=20, choices=BLOCK_TYPES, default='text')
    content = models.JSONField(default=dict)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['note', 'order']),
            models.Index(fields=['block_type']),
        ]
        unique_together = ['note', 'order']
    
    def __str__(self):
        return f"{self.block_type.title()} Block in {self.note.title}"
    
    def get_content_preview(self, max_length=50):
        if self.block_type == 'text' and 'text' in self.content:
            text = self.content['text']
            return text[:max_length] + '...' if len(text) > max_length else text
        elif self.block_type == 'heading' and 'text' in self.content:
            return f"H{self.content.get('level', 1)}: {self.content['text'][:max_length]}"
        elif self.block_type == 'code' and 'code' in self.content:
            return f"Code ({self.content.get('language', 'plain')})"
        elif self.block_type == 'latex' and 'formula' in self.content:
            return f"LaTeX: {self.content['formula'][:max_length]}"
        elif self.block_type == 'image' and 'url' in self.content:
            return f"Image: {self.content.get('alt', 'Untitled')}"
        return f"{self.block_type.title()} Block"


class BlockVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    block = models.ForeignKey(Block, on_delete=models.CASCADE, related_name='versions')
    content = models.JSONField()
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='block_versions')
    version_number = models.PositiveIntegerField(default=1)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['block', '-created_at']),
            models.Index(fields=['created_by']),
        ]
        unique_together = ['block', 'version_number']
    
    def __str__(self):
        return f"Version {self.version_number} of {self.block}"
