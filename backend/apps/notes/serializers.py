from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Note
from apps.blocks.models import Block


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'display_name', 'initials']
        read_only_fields = ['id']
    
    def get_display_name(self, obj):
        return obj.get_full_name() or obj.username
    
    def get_initials(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.get_initials()
        return obj.username[0].upper() if obj.username else 'U'


class BlockPreviewSerializer(serializers.ModelSerializer):
    content_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = Block
        fields = ['id', 'block_type', 'content_preview', 'order', 'updated_at']
    
    def get_content_preview(self, obj):
        return obj.get_content_preview()


class NoteSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    collaborators = UserSerializer(many=True, read_only=True)
    collaborators_count = serializers.SerializerMethodField()
    blocks_count = serializers.SerializerMethodField()
    blocks = BlockPreviewSerializer(many=True, read_only=True)
    
    class Meta:
        model = Note
        fields = [
            'id', 'title', 'created_at', 'updated_at', 'owner', 
            'collaborators', 'collaborators_count', 'blocks_count', 
            'blocks'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']
    
    def get_collaborators_count(self, obj):
        return obj.get_collaborators_count()
    
    def get_blocks_count(self, obj):
        return obj.get_blocks_count()
    
    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class NoteListSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    collaborators_count = serializers.SerializerMethodField()
    blocks_count = serializers.SerializerMethodField()
    last_modified = serializers.DateTimeField(source='updated_at', read_only=True)
    
    class Meta:
        model = Note
        fields = [
            'id', 'title', 'created_at', 'last_modified', 'owner',
            'collaborators_count', 'blocks_count'
        ]
    
    def get_collaborators_count(self, obj):
        return obj.get_collaborators_count()
    
    def get_blocks_count(self, obj):
        return obj.get_blocks_count()


class CollaboratorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']
    
    def validate(self, attrs):
        request = self.context.get('request')
        note_id = self.context.get('note_id')
        
        if not request or not note_id:
            raise serializers.ValidationError("Invalid context")
        
        try:
            note = Note.objects.get(id=note_id)
            if request.user != note.owner:
                raise serializers.ValidationError("Only the owner can add collaborators")
        except Note.DoesNotExist:
            raise serializers.ValidationError("Note not found")
        
        return attrs