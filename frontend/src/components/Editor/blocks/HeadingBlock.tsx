import React, { useState, useRef, useEffect } from 'react';
import { Block, HeadingBlockContent } from '../../../types';
import './HeadingBlock.css';

interface HeadingBlockProps {
  block: Block;
  isSelected: boolean;
  onUpdate: (content: HeadingBlockContent) => void;
  onEditingChange: (isEditing: boolean) => void;
}

export const HeadingBlock: React.FC<HeadingBlockProps> = ({
  block,
  isSelected,
  onUpdate,
  onEditingChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(block.content?.text || '');
  const [level, setLevel] = useState(block.content?.level || 1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(block.content?.text || '');
    setLevel(block.content?.level || 1);
  }, [block.content?.text, block.content?.level]);

  useEffect(() => {
    onEditingChange(isEditing);
  }, [isEditing, onEditingChange]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(text.length, text.length);
    }
  }, [isEditing]);

  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== block.content?.text || level !== block.content?.level) {
      onUpdate({ text, level });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setText(block.content?.text || '');
      setLevel(block.content?.level || 1);
      setIsEditing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleLevelChange = (newLevel: 1 | 2 | 3 | 4 | 5 | 6) => {
    setLevel(newLevel);
    onUpdate({ text: block.content?.text, level: newLevel });
  };

  const getHeadingTag = () => {
    switch (level) {
      case 1: return 'h1';
      case 2: return 'h2';
      case 3: return 'h3';
      case 4: return 'h4';
      case 5: return 'h5';
      case 6: return 'h6';
      default: return 'h1';
    }
  };

  const getHeadingClass = () => {
    return `heading-display heading-${level}`;
  };

  const renderHeading = () => {
    const props = {
      className: getHeadingClass(),
      onClick: handleClick,
      children: text || (
        <span className="heading-placeholder">
          Heading {level} - Click to edit
        </span>
      ),
    };

    switch (level) {
      case 1: return <h1 {...props} />;
      case 2: return <h2 {...props} />;
      case 3: return <h3 {...props} />;
      case 4: return <h4 {...props} />;
      case 5: return <h5 {...props} />;
      case 6: return <h6 {...props} />;
      default: return <h1 {...props} />;
    }
  };

  return (
    <div className="heading-block">
      {isSelected && (
        <div className="heading-level-toolbar">
          {[1, 2, 3, 4, 5, 6].map((levelOption) => (
            <button
              key={levelOption}
              className={`level-btn ${level === levelOption ? 'active' : ''}`}
              onClick={() => handleLevelChange(levelOption as 1 | 2 | 3 | 4 | 5 | 6)}
              title={`Heading ${levelOption}`}
            >
              H{levelOption}
            </button>
          ))}
        </div>
      )}

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`heading-input heading-input-${level}`}
          placeholder={`Heading ${level}...`}
        />
      ) : (
        renderHeading()
      )}
    </div>
  );
};