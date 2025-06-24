from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Block, BlockVersion
from apps.notes.models import Note


class BlockVersionSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = BlockVersion
        fields = ['id', 'content', 'created_at', 'created_by', 'version_number']
        read_only_fields = ['id', 'created_at', 'created_by', 'version_number']


class BlockSerializer(serializers.ModelSerializer):
    versions = BlockVersionSerializer(many=True, read_only=True)
    content_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = Block
        fields = [
            'id', 'note', 'block_type', 'content', 'order', 
            'created_at', 'updated_at', 'content_preview', 'versions'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_content_preview(self, obj):
        return obj.get_content_preview()
    
    def validate_note(self, value):
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError("Request context is required")
        
        user = request.user
        if value.owner != user and not value.collaborators.filter(id=user.id).exists():
            raise serializers.ValidationError("You don't have permission to modify this note")
        
        return value
    
    def validate_content(self, value):
        # For updates, get block_type from the instance, for creates get from initial_data
        if self.instance:
            block_type = self.instance.block_type
        else:
            block_type = self.initial_data.get('block_type', 'text')
        
        if block_type == 'text':
            if not isinstance(value, dict) or 'text' not in value:
                raise serializers.ValidationError("Text blocks must have 'text' field in content")
        
        elif block_type == 'heading':
            if not isinstance(value, dict) or 'text' not in value:
                raise serializers.ValidationError("Heading blocks must have 'text' field in content")
            level = value.get('level', 1)
            if not isinstance(level, int) or level < 1 or level > 6:
                raise serializers.ValidationError("Heading level must be between 1 and 6")
        
        elif block_type == 'code':
            if not isinstance(value, dict) or 'code' not in value:
                raise serializers.ValidationError("Code blocks must have 'code' field in content")
        
        elif block_type == 'latex':
            if not isinstance(value, dict) or 'formula' not in value:
                raise serializers.ValidationError("LaTeX blocks must have 'formula' field in content")
        
        elif block_type == 'image':
            if not isinstance(value, dict) or 'url' not in value:
                raise serializers.ValidationError("Image blocks must have 'url' field in content")
        
        elif block_type == 'table':
            if not isinstance(value, dict) or 'rows' not in value:
                raise serializers.ValidationError("Table blocks must have 'rows' field in content")
        
        elif block_type == 'list':
            if not isinstance(value, dict) or 'items' not in value:
                raise serializers.ValidationError("List blocks must have 'items' field in content")
        
        return value
    
    def create(self, validated_data):
        block = super().create(validated_data)
        
        # Create initial version
        BlockVersion.objects.create(
            block=block,
            content=block.content,
            created_by=self.context['request'].user,
            version_number=1
        )
        
        return block
    
    def update(self, instance, validated_data):
        # Store old content for version history
        old_content = instance.content
        
        # Update the block
        block = super().update(instance, validated_data)
        
        # Create new version if content changed
        if old_content != block.content:
            latest_version = BlockVersion.objects.filter(block=block).order_by('-version_number').first()
            next_version = (latest_version.version_number + 1) if latest_version else 1
            
            BlockVersion.objects.create(
                block=block,
                content=block.content,
                created_by=self.context['request'].user,
                version_number=next_version
            )
        
        return block


class BlockListSerializer(serializers.ModelSerializer):
    content_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = Block
        fields = ['id', 'block_type', 'content_preview', 'order', 'updated_at']
    
    def get_content_preview(self, obj):
        return obj.get_content_preview()


class BlockReorderSerializer(serializers.Serializer):
    block_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1
    )
    
    def validate_block_ids(self, value):
        request = self.context.get('request')
        note_id = self.context.get('note_id')
        
        if not request or not note_id:
            raise serializers.ValidationError("Invalid context")
        
        try:
            note = Note.objects.get(id=note_id)
            if note.owner != request.user and not note.collaborators.filter(id=request.user.id).exists():
                raise serializers.ValidationError("You don't have permission to reorder blocks in this note")
        except Note.DoesNotExist:
            raise serializers.ValidationError("Note not found")
        
        # Validate that all blocks exist and belong to the note
        existing_blocks = Block.objects.filter(
            id__in=value, 
            note_id=note_id
        ).values_list('id', flat=True)
        
        if len(existing_blocks) != len(value):
            raise serializers.ValidationError("Some blocks don't exist or don't belong to this note")
        
        return value