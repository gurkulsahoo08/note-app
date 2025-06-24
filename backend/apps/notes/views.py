from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db.models import Q
from django.shortcuts import get_object_or_404
from .models import Note
from .serializers import (
    NoteSerializer, 
    NoteListSerializer, 
    CollaboratorSerializer, 
    UserSerializer
)


class NoteViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return NoteListSerializer
        return NoteSerializer
    
    def get_queryset(self):
        user = self.request.user
        return Note.objects.filter(
            Q(owner=user) | Q(collaborators=user)
        ).distinct().prefetch_related('collaborators', 'blocks')
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    def perform_destroy(self, instance):
        # Hard delete
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def add_collaborator(self, request, pk=None):
        note = self.get_object()
        
        if note.owner != request.user:
            return Response(
                {'error': 'Only the owner can add collaborators'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CollaboratorSerializer(
            data=request.data, 
            context={'request': request, 'note_id': pk}
        )
        if serializer.is_valid():
            try:
                user = User.objects.get(email=serializer.validated_data['email'])
                if user == note.owner:
                    return Response(
                        {'error': 'Owner is automatically a collaborator'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                if note.collaborators.filter(id=user.id).exists():
                    return Response(
                        {'error': 'User is already a collaborator'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                note.collaborators.add(user)
                return Response(
                    UserSerializer(user).data, 
                    status=status.HTTP_201_CREATED
                )
                
            except User.DoesNotExist:
                return Response(
                    {'error': 'User with this email does not exist'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['delete'])
    def remove_collaborator(self, request, pk=None):
        note = self.get_object()
        
        if note.owner != request.user:
            return Response(
                {'error': 'Only the owner can remove collaborators'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id)
            if note.collaborators.filter(id=user.id).exists():
                note.collaborators.remove(user)
                return Response(status=status.HTTP_204_NO_CONTENT)
            else:
                return Response(
                    {'error': 'User is not a collaborator'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def collaborators(self, request, pk=None):
        note = self.get_object()
        collaborators = note.collaborators.all()
        serializer = UserSerializer(collaborators, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        original_note = self.get_object()
        
        # Create a copy of the note
        new_note = Note.objects.create(
            title=f"{original_note.title} (Copy)",
            owner=request.user
        )
        
        # Copy all blocks
        for block in original_note.blocks.all():
            new_block = block
            new_block.pk = None
            new_block.note = new_note
            new_block.save()
        
        serializer = NoteSerializer(new_note, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response({'error': 'Query parameter q is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        notes = Note.objects.filter(
            Q(owner=user) | Q(collaborators=user),
            Q(title__icontains=query) | Q(blocks__content__icontains=query)
        ).distinct()
        
        serializer = NoteListSerializer(notes, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        user = request.user
        recent_notes = Note.objects.filter(
            Q(owner=user) | Q(collaborators=user)
        ).distinct().order_by('-updated_at')[:10]
        
        serializer = NoteListSerializer(recent_notes, many=True, context={'request': request})
        return Response(serializer.data)
