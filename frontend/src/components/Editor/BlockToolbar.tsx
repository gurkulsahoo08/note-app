import React from 'react';
import { BlockType } from '../../types';
import './BlockToolbar.css';

interface BlockToolbarProps {
  onSelectType: (type: BlockType) => void;
  onCancel: () => void;
}

export const BlockToolbar: React.FC<BlockToolbarProps> = ({ onSelectType, onCancel }) => {
  const blockTypes = [
    { type: 'text' as BlockType, icon: '📝', label: 'Text', description: 'Plain text paragraph' },
    { type: 'heading' as BlockType, icon: '📖', label: 'Heading', description: 'Section heading' },
    { type: 'code' as BlockType, icon: '💻', label: 'Code', description: 'Code snippet with syntax highlighting' },
    { type: 'latex' as BlockType, icon: '∑', label: 'Math', description: 'Mathematical formula' },
    { type: 'image' as BlockType, icon: '🖼️', label: 'Image', description: 'Upload or embed an image' },
    { type: 'table' as BlockType, icon: '📊', label: 'Table', description: 'Structured data table' },
    { type: 'list' as BlockType, icon: '📝', label: 'List', description: 'Bulleted or numbered list' },
  ];

  return (
    <div className="block-toolbar">
      <div className="block-toolbar-header">
        <h3>Choose block type</h3>
        <button className="cancel-btn" onClick={onCancel}>
          ×
        </button>
      </div>
      
      <div className="block-types-grid">
        {blockTypes.map((blockType) => (
          <button
            key={blockType.type}
            className="block-type-btn"
            onClick={() => onSelectType(blockType.type)}
          >
            <div className="block-type-icon">{blockType.icon}</div>
            <div className="block-type-content">
              <div className="block-type-label">{blockType.label}</div>
              <div className="block-type-description">{blockType.description}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="block-toolbar-footer">
        <span className="block-toolbar-hint">
          Tip: Type "/" at the beginning of any line to quickly access this menu
        </span>
      </div>
    </div>
  );
};