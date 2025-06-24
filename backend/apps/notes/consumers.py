import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Note
from apps.blocks.models import Block, BlockVersion


class NoteConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.note_id = self.scope['url_route']['kwargs']['note_id']
        self.note_group_name = f'note_{self.note_id}'
        self.user = self.scope["user"]
        
        # Check if user has permission to access this note
        if not await self.has_note_permission():
            await self.close()
            return
        
        # Join note group
        await self.channel_layer.group_add(
            self.note_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'note_id': self.note_id,
            'user_id': str(self.user.id),
            'username': self.user.username
        }))
        
        # Notify other users that this user joined
        await self.channel_layer.group_send(
            self.note_group_name,
            {
                'type': 'user_joined',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'sender_channel': self.channel_name
            }
        )
    
    async def disconnect(self, close_code):
        # Notify other users that this user left
        await self.channel_layer.group_send(
            self.note_group_name,
            {
                'type': 'user_left',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'sender_channel': self.channel_name
            }
        )
        
        # Leave note group
        await self.channel_layer.group_discard(
            self.note_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'block_update':
            await self.handle_block_update(data)
        elif message_type == 'block_create':
            await self.handle_block_create(data)
        elif message_type == 'block_delete':
            await self.handle_block_delete(data)
        elif message_type == 'block_reorder':
            await self.handle_block_reorder(data)
        elif message_type == 'cursor_position':
            await self.handle_cursor_position(data)
        elif message_type == 'user_selection':
            await self.handle_user_selection(data)
    
    async def handle_block_update(self, data):
        block_id = data.get('block_id')
        content = data.get('content')
        
        if not block_id or content is None:
            return
        
        # Update block in database
        success = await self.update_block_content(block_id, content)
        
        if success:
            # Broadcast update to all connected users
            await self.channel_layer.group_send(
                self.note_group_name,
                {
                    'type': 'block_updated',
                    'block_id': block_id,
                    'content': content,
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                    'sender_channel': self.channel_name
                }
            )
    
    async def handle_block_create(self, data):
        block_type = data.get('block_type', 'text')
        content = data.get('content', {})
        order = data.get('order', 0)
        
        # Create block in database
        block_data = await self.create_block(block_type, content, order)
        
        if block_data:
            # Broadcast creation to all connected users
            await self.channel_layer.group_send(
                self.note_group_name,
                {
                    'type': 'block_created',
                    'block': block_data,
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                    'sender_channel': self.channel_name
                }
            )
    
    async def handle_block_delete(self, data):
        block_id = data.get('block_id')
        
        if not block_id:
            return
        
        # Delete block in database
        success = await self.delete_block(block_id)
        
        if success:
            # Broadcast deletion to all connected users
            await self.channel_layer.group_send(
                self.note_group_name,
                {
                    'type': 'block_deleted',
                    'block_id': block_id,
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                    'sender_channel': self.channel_name
                }
            )
    
    async def handle_block_reorder(self, data):
        block_ids = data.get('block_ids', [])
        
        if not block_ids:
            return
        
        # Reorder blocks in database
        success = await self.reorder_blocks(block_ids)
        
        if success:
            # Broadcast reorder to all connected users
            await self.channel_layer.group_send(
                self.note_group_name,
                {
                    'type': 'blocks_reordered',
                    'block_ids': block_ids,
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                    'sender_channel': self.channel_name
                }
            )
    
    async def handle_cursor_position(self, data):
        block_id = data.get('block_id')
        position = data.get('position', 0)
        
        # Broadcast cursor position to other users
        await self.channel_layer.group_send(
            self.note_group_name,
            {
                'type': 'cursor_moved',
                'block_id': block_id,
                'position': position,
                'user_id': str(self.user.id),
                'username': self.user.username,
                'sender_channel': self.channel_name
            }
        )
    
    async def handle_user_selection(self, data):
        block_id = data.get('block_id')
        selection_start = data.get('selection_start', 0)
        selection_end = data.get('selection_end', 0)
        
        # Broadcast user selection to other users
        await self.channel_layer.group_send(
            self.note_group_name,
            {
                'type': 'user_selection_changed',
                'block_id': block_id,
                'selection_start': selection_start,
                'selection_end': selection_end,
                'user_id': str(self.user.id),
                'username': self.user.username,
                'sender_channel': self.channel_name
            }
        )
    
    # Event handlers for group messages
    async def user_joined(self, event):
        if event['sender_channel'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'user_id': event['user_id'],
                'username': event['username']
            }))
    
    async def user_left(self, event):
        if event['sender_channel'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'user_left',
                'user_id': event['user_id'],
                'username': event['username']
            }))
    
    async def block_updated(self, event):
        if event['sender_channel'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'block_updated',
                'block_id': event['block_id'],
                'content': event['content'],
                'user_id': event['user_id'],
                'username': event['username']
            }))
    
    async def block_created(self, event):
        if event['sender_channel'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'block_created',
                'block': event['block'],
                'user_id': event['user_id'],
                'username': event['username']
            }))
    
    async def block_deleted(self, event):
        if event['sender_channel'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'block_deleted',
                'block_id': event['block_id'],
                'user_id': event['user_id'],
                'username': event['username']
            }))
    
    async def blocks_reordered(self, event):
        if event['sender_channel'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'blocks_reordered',
                'block_ids': event['block_ids'],
                'user_id': event['user_id'],
                'username': event['username']
            }))
    
    async def cursor_moved(self, event):
        if event['sender_channel'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'cursor_moved',
                'block_id': event['block_id'],
                'position': event['position'],
                'user_id': event['user_id'],
                'username': event['username']
            }))
    
    async def user_selection_changed(self, event):
        if event['sender_channel'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'user_selection_changed',
                'block_id': event['block_id'],
                'selection_start': event['selection_start'],
                'selection_end': event['selection_end'],
                'user_id': event['user_id'],
                'username': event['username']
            }))
    
    # Database operations
    @database_sync_to_async
    def has_note_permission(self):
        try:
            note = Note.objects.get(id=self.note_id)
            return (note.owner == self.user or 
                   note.collaborators.filter(id=self.user.id).exists())
        except Note.DoesNotExist:
            return False
    
    @database_sync_to_async
    def update_block_content(self, block_id, content):
        try:
            block = Block.objects.get(id=block_id, note_id=self.note_id)
            
            # Store old content for version history
            old_content = block.content
            
            # Update block
            block.content = content
            block.save()
            
            # Create version if content changed significantly
            if old_content != content:
                latest_version = BlockVersion.objects.filter(block=block).order_by('-version_number').first()
                next_version = (latest_version.version_number + 1) if latest_version else 1
                
                BlockVersion.objects.create(
                    block=block,
                    content=content,
                    created_by=self.user,
                    version_number=next_version
                )
            
            return True
        except Block.DoesNotExist:
            return False
    
    @database_sync_to_async
    def create_block(self, block_type, content, order):
        try:
            note = Note.objects.get(id=self.note_id)
            
            # Create block
            block = Block.objects.create(
                note=note,
                block_type=block_type,
                content=content,
                order=order
            )
            
            # Create initial version
            BlockVersion.objects.create(
                block=block,
                content=content,
                created_by=self.user,
                version_number=1
            )
            
            return {
                'id': str(block.id),
                'block_type': block.block_type,
                'content': block.content,
                'order': block.order,
                'created_at': block.created_at.isoformat(),
                'updated_at': block.updated_at.isoformat()
            }
        except Note.DoesNotExist:
            return None
    
    @database_sync_to_async
    def delete_block(self, block_id):
        try:
            block = Block.objects.get(id=block_id, note_id=self.note_id)
            block.is_deleted = True
            block.save()
            return True
        except Block.DoesNotExist:
            return False
    
    @database_sync_to_async
    def reorder_blocks(self, block_ids):
        try:
            for index, block_id in enumerate(block_ids):
                Block.objects.filter(
                    id=block_id, 
                    note_id=self.note_id
                ).update(order=index)
            return True
        except Exception:
            return False