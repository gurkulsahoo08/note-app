from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db import transaction, models
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import uuid
import os
from .models import Block, BlockVersion
from apps.notes.models import Note
from .serializers import (
    BlockSerializer, 
    BlockListSerializer, 
    BlockReorderSerializer,
    BlockVersionSerializer
)


class BlockViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'reorder':
            return BlockReorderSerializer
        return BlockSerializer
    
    def get_queryset(self):
        user = self.request.user
        note_id = self.request.query_params.get('note_id')
        
        if note_id:
            # For list operations with note_id parameter
            try:
                note = Note.objects.get(id=note_id)
                if note.owner == user or note.collaborators.filter(id=user.id).exists():
                    return Block.objects.filter(
                        note_id=note_id
                    ).order_by('order', 'created_at')
            except Note.DoesNotExist:
                pass
            return Block.objects.none()
        
        # For individual block operations (retrieve, update, delete)
        # Return all blocks that the user has permission to access
        user_notes = Note.objects.filter(
            Q(owner=user) | Q(collaborators=user)
        ).values_list('id', flat=True)
        
        return Block.objects.filter(
            note_id__in=user_notes
        )
    
    def perform_destroy(self, instance):
        # Hard delete
        instance.delete()
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        note_id = request.data.get('note_id')
        if not note_id:
            return Response(
                {'error': 'note_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = BlockReorderSerializer(
            data=request.data,
            context={'request': request, 'note_id': note_id}
        )
        
        if serializer.is_valid():
            block_ids = serializer.validated_data['block_ids']
            
            with transaction.atomic():
                # Update the order of each block
                for index, block_id in enumerate(block_ids):
                    Block.objects.filter(id=block_id).update(order=index)
            
            return Response({'success': True}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        block = self.get_object()
        versions = BlockVersion.objects.filter(block=block).order_by('-created_at')
        serializer = BlockVersionSerializer(versions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def restore_version(self, request, pk=None):
        block = self.get_object()
        version_id = request.data.get('version_id')
        
        if not version_id:
            return Response(
                {'error': 'version_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            version = BlockVersion.objects.get(id=version_id, block=block)
            
            # Update block content to the version content
            block.content = version.content
            block.save()
            
            # Create a new version entry for this restoration
            latest_version = BlockVersion.objects.filter(block=block).order_by('-version_number').first()
            next_version = (latest_version.version_number + 1) if latest_version else 1
            
            BlockVersion.objects.create(
                block=block,
                content=block.content,
                created_by=request.user,
                version_number=next_version
            )
            
            serializer = BlockSerializer(block, context={'request': request})
            return Response(serializer.data)
            
        except BlockVersion.DoesNotExist:
            return Response(
                {'error': 'Version not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        original_block = self.get_object()
        
        # Create a copy of the block
        new_block = Block.objects.create(
            note=original_block.note,
            block_type=original_block.block_type,
            content=original_block.content.copy(),
            order=original_block.order + 1
        )
        
        # Update orders of subsequent blocks
        Block.objects.filter(
            note=original_block.note,
            order__gt=original_block.order
        ).exclude(id=new_block.id).update(order=models.F('order') + 1)
        
        # Create initial version for the new block
        BlockVersion.objects.create(
            block=new_block,
            content=new_block.content,
            created_by=request.user,
            version_number=1
        )
        
        serializer = BlockSerializer(new_block, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def upload_image(request):
    """Upload an image file and return the URL"""
    if 'image' not in request.FILES:
        return Response(
            {'error': 'No image file provided'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    image_file = request.FILES['image']
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if image_file.content_type not in allowed_types:
        return Response(
            {'error': 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate file size (max 10MB)
    if image_file.size > 10 * 1024 * 1024:
        return Response(
            {'error': 'File too large. Maximum size is 10MB.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Generate unique filename
        file_extension = os.path.splitext(image_file.name)[1]
        unique_filename = f"images/{uuid.uuid4()}{file_extension}"
        
        # Save file
        file_path = default_storage.save(unique_filename, ContentFile(image_file.read()))
        
        # Generate full URL
        file_url = request.build_absolute_uri(default_storage.url(file_path))
        
        return Response({'url': file_url}, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to upload image: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
