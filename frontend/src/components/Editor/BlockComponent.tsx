import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Block, BlockType } from '../../types';
import { TextBlock } from './blocks/TextBlock';
import { HeadingBlock } from './blocks/HeadingBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { LatexBlock } from './blocks/LatexBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { TableBlock } from './blocks/TableBlock';
import { ListBlock } from './blocks/ListBlock';
import './BlockComponent.css';

interface BlockComponentProps {
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (content: any) => void;
  onDelete: () => void;
  onCreateBlock: (type: BlockType) => void;
}

export const BlockComponent: React.FC<BlockComponentProps> = ({
  block,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onCreateBlock,
}) => {
  const [showToolbar, setShowToolbar] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isSelected && blockRef.current) {
      blockRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isSelected]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isEditing) {
      e.preventDefault();
      onCreateBlock('text');
    } else if (e.key === 'Backspace' && !isEditing) {
      const content = getTextContent(block);
      if (!content || content.trim() === '') {
        e.preventDefault();
        onDelete();
      }
    } else if (e.key === '/' && !isEditing) {
      e.preventDefault();
      setShowToolbar(true);
    }
  };

  const getTextContent = (block: Block): string => {
    switch (block.block_type) {
      case 'text':
        return block.content.text || '';
      case 'heading':
        return block.content.text || '';
      case 'code':
        return block.content.code || '';
      case 'latex':
        return block.content.formula || '';
      default:
        return '';
    }
  };

  const renderBlockContent = () => {
    const commonProps = {
      block,
      isSelected,
      onUpdate,
      onEditingChange: setIsEditing,
    };

    switch (block.block_type) {
      case 'text':
        return <TextBlock {...commonProps} />;
      case 'heading':
        return <HeadingBlock {...commonProps} />;
      case 'code':
        return <CodeBlock {...commonProps} />;
      case 'latex':
        return <LatexBlock {...commonProps} />;
      case 'image':
        return <ImageBlock {...commonProps} />;
      case 'table':
        return <TableBlock {...commonProps} />;
      case 'list':
        return <ListBlock {...commonProps} />;
      default:
        return <div>Unsupported block type: {block.block_type}</div>;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`block-component ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div ref={blockRef} className="block-content-wrapper">
        {/* Drag handle */}
        <div
          className="block-drag-handle"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </div>

        {/* Block toolbar */}
        {isSelected && (
          <div className="block-toolbar-inline">
            <button
              className="block-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowToolbar(!showToolbar);
              }}
              title="Change block type"
            >
              {getBlockIcon(block.block_type)}
            </button>
            <button
              className="block-action-btn delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete block"
            >
              🗑️
            </button>
          </div>
        )}

        {/* Block content */}
        <div className="block-content">
          {renderBlockContent()}
        </div>

        {/* Type selector toolbar */}
        {showToolbar && (
          <div className="block-type-selector">
            {getBlockTypes().map((type) => (
              <button
                key={type.value}
                className={`type-btn ${block.block_type === type.value ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (block.block_type !== type.value) {
                    onUpdate(getDefaultContentForType(type.value));
                  }
                  setShowToolbar(false);
                }}
                title={type.label}
              >
                {type.icon}
              </button>
            ))}
            <button
              className="type-btn cancel-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowToolbar(false);
              }}
              title="Cancel"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const getBlockIcon = (type: BlockType): string => {
  const icons: Record<BlockType, string> = {
    text: '📝',
    heading: '📖',
    code: '💻',
    latex: '∑',
    image: '🖼️',
    table: '📊',
    list: '📋',
  };
  return icons[type] || '📝';
};

const getBlockTypes = () => [
  { value: 'text' as BlockType, label: 'Text', icon: '📝' },
  { value: 'heading' as BlockType, label: 'Heading', icon: '📖' },
  { value: 'code' as BlockType, label: 'Code', icon: '💻' },
  { value: 'latex' as BlockType, label: 'Math', icon: '∑' },
  { value: 'image' as BlockType, label: 'Image', icon: '🖼️' },
  { value: 'table' as BlockType, label: 'Table', icon: '📊' },
  { value: 'list' as BlockType, label: 'List', icon: '📋' },
];

const getDefaultContentForType = (type: BlockType): any => {
  switch (type) {
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