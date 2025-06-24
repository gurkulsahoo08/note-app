import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Note, Block, BlockType } from '../../types';
import { ApiService } from '../../services/api';
import { WebSocketService } from '../../services/websocket';
import { BlockComponent } from './BlockComponent';
import { BlockToolbar } from './BlockToolbar';
import './Editor.css';

interface EditorProps {
  note: Note;
  blocks: Block[];
  onBlocksChange: (blocks: Block[]) => void;
}

export const Editor: React.FC<EditorProps> = ({ note, blocks, onBlocksChange }) => {
  const [localBlocks, setLocalBlocks] = useState<Block[]>(blocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [collaborativeUsers, setCollaborativeUsers] = useState<any[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    setLocalBlocks(blocks);
  }, [blocks]);

  useEffect(() => {
    // Connect to WebSocket for real-time collaboration
    WebSocketService.connect(note.id);

    // Set up WebSocket event handlers
    WebSocketService.on('block_updated', handleRemoteBlockUpdate);
    WebSocketService.on('block_created', handleRemoteBlockCreate);
    WebSocketService.on('block_deleted', handleRemoteBlockDelete);
    WebSocketService.on('blocks_reordered', handleRemoteBlockReorder);
    WebSocketService.on('user_joined', handleUserJoined);
    WebSocketService.on('user_left', handleUserLeft);

    return () => {
      WebSocketService.off('block_updated');
      WebSocketService.off('block_created');
      WebSocketService.off('block_deleted');
      WebSocketService.off('blocks_reordered');
      WebSocketService.off('user_joined');
      WebSocketService.off('user_left');
      WebSocketService.disconnect();
    };
  }, [note.id]);

  const handleRemoteBlockUpdate = useCallback((data: any) => {
    setLocalBlocks(prev => 
      prev.map(block => 
        block.id === data.block_id 
          ? { ...block, content: data.content }
          : block
      )
    );
  }, []);

  const handleRemoteBlockCreate = useCallback((data: any) => {
    const newBlock = data.block;
    setLocalBlocks(prev => {
      const updated = [...prev, newBlock].sort((a, b) => a.order - b.order);
      onBlocksChange(updated);
      return updated;
    });
  }, [onBlocksChange]);

  const handleRemoteBlockDelete = useCallback((data: any) => {
    setLocalBlocks(prev => {
      const updated = prev.filter(block => block.id !== data.block_id);
      onBlocksChange(updated);
      return updated;
    });
  }, [onBlocksChange]);

  const handleRemoteBlockReorder = useCallback((data: any) => {
    const orderedIds = data.block_ids;
    setLocalBlocks(prev => {
      const updated = [...prev].sort((a, b) => {
        return orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id);
      });
      onBlocksChange(updated);
      return updated;
    });
  }, [onBlocksChange]);

  const handleUserJoined = useCallback((data: any) => {
    setCollaborativeUsers(prev => [...prev, data]);
  }, []);

  const handleUserLeft = useCallback((data: any) => {
    setCollaborativeUsers(prev => prev.filter(user => user.user_id !== data.user_id));
  }, []);

  const handleBlockUpdate = async (blockId: string, content: any) => {
    try {
      // Update locally first for immediate feedback
      setLocalBlocks(prev =>
        prev.map(block =>
          block.id === blockId ? { ...block, content } : block
        )
      );

      // Send to server
      await ApiService.updateBlock(blockId, { content });
      
      // Send real-time update
      WebSocketService.sendBlockUpdate(blockId, content);
    } catch (error) {
      console.error('Error updating block:', error);
      // Revert local change on error - but only revert the specific block
      setLocalBlocks(prev =>
        prev.map(block =>
          block.id === blockId ? blocks.find(b => b.id === blockId) || block : block
        )
      );
    }
  };

  const handleCreateBlock = async (blockType: BlockType, insertAfter?: string) => {
    try {
      const order = insertAfter 
        ? (localBlocks.find(b => b.id === insertAfter)?.order ?? -1) + 1 || localBlocks.length
        : localBlocks.length;

      const defaultContent = getDefaultContent(blockType);
      
      const newBlock = await ApiService.createBlock({
        note: note.id,
        block_type: blockType,
        content: defaultContent,
        order,
      });

      // Update local state
      const updatedBlocks = [...localBlocks, newBlock].sort((a, b) => a.order - b.order);
      setLocalBlocks(updatedBlocks);
      onBlocksChange(updatedBlocks);

      // Send real-time update (commented out for debugging)
      // WebSocketService.sendBlockCreate(blockType, defaultContent, order);

      // Focus the new block
      setSelectedBlockId(newBlock.id);
      setIsAddingBlock(false);
    } catch (error) {
      console.error('Error creating block:', error);
      alert('Failed to create block: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      // Update locally first
      const updatedBlocks = localBlocks.filter(block => block.id !== blockId);
      setLocalBlocks(updatedBlocks);
      onBlocksChange(updatedBlocks);

      // Send to server
      await ApiService.deleteBlock(blockId);
      
      // Send real-time update
      WebSocketService.sendBlockDelete(blockId);

      // Clear selection if deleted block was selected
      if (selectedBlockId === blockId) {
        setSelectedBlockId(null);
      }
    } catch (error) {
      console.error('Error deleting block:', error);
      // Revert local change on error
      setLocalBlocks(blocks);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = localBlocks.findIndex(block => block.id === active.id);
      const newIndex = localBlocks.findIndex(block => block.id === over.id);

      const reorderedBlocks = arrayMove(localBlocks, oldIndex, newIndex);
      
      // Update orders
      const updatedBlocks = reorderedBlocks.map((block, index) => ({
        ...block,
        order: index,
      }));

      setLocalBlocks(updatedBlocks);
      onBlocksChange(updatedBlocks);

      try {
        // Send to server
        const blockIds = updatedBlocks.map(block => block.id);
        await ApiService.reorderBlocks({
          note_id: note.id,
          block_ids: blockIds,
        });

        // Send real-time update
        WebSocketService.sendBlockReorder(blockIds);
      } catch (error) {
        console.error('Error reordering blocks:', error);
        // Revert on error
        setLocalBlocks(blocks);
        onBlocksChange(blocks);
      }
    }
  };

  const getDefaultContent = (blockType: BlockType): any => {
    switch (blockType) {
      case 'text':
        return { text: '' };
      case 'heading':
        return { text: '', level: 1 };
      case 'code':
        return { code: '', language: 'javascript' };
      case 'latex':
        return { formula: '' };
      case 'image':
        return { url: '', alt: '' };
      case 'table':
        return { rows: [['', '']], headers: ['Column 1', 'Column 2'] };
      case 'list':
        return { items: [''], ordered: false };
      default:
        return {};
    }
  };

  return (
    <div className="editor">
      <div className="editor-header">
        <h1 className="note-title" contentEditable suppressContentEditableWarning>
          {note.title}
        </h1>
        <div className="collaborative-users">
          {collaborativeUsers.map(user => (
            <div key={user.user_id} className="user-avatar" title={user.username}>
              {user.username.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      <div className="editor-content">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext items={localBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            {localBlocks.map((block, index) => (
              <BlockComponent
                key={block.id}
                block={block}
                isSelected={selectedBlockId === block.id}
                onSelect={() => setSelectedBlockId(block.id)}
                onUpdate={(content) => handleBlockUpdate(block.id, content)}
                onDelete={() => handleDeleteBlock(block.id)}
                onCreateBlock={(type) => handleCreateBlock(type, block.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {localBlocks.length === 0 && (
          <div className="empty-editor">
            <p>Start writing by adding your first block</p>
            <button 
              className="add-first-block-btn"
              onClick={() => handleCreateBlock('text')}
            >
              Add Text Block
            </button>
          </div>
        )}

        <div className="add-block-section">
          {isAddingBlock ? (
            <BlockToolbar
              onSelectType={handleCreateBlock}
              onCancel={() => setIsAddingBlock(false)}
            />
          ) : (
            <button
              className="add-block-btn"
              onClick={() => setIsAddingBlock(true)}
            >
              + Add Block
            </button>
          )}
        </div>
      </div>
    </div>
  );
};