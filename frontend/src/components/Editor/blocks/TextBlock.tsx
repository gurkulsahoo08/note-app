import React, { useState, useRef, useEffect } from 'react';
import { Block, TextBlockContent } from '../../../types';
import './TextBlock.css';

interface TextBlockProps {
  block: Block;
  isSelected: boolean;
  onUpdate: (content: TextBlockContent) => void;
  onEditingChange: (isEditing: boolean) => void;
}

export const TextBlock: React.FC<TextBlockProps> = ({
  block,
  isSelected,
  onUpdate,
  onEditingChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(block.content?.text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(block.content?.text || '');
  }, [block.content?.text]);

  useEffect(() => {
    onEditingChange(isEditing);
  }, [isEditing, onEditingChange]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(text.length, text.length);
      adjustTextareaHeight();
    }
  }, [isEditing]);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== block.content?.text) {
      onUpdate({ text, formatting: block.content?.formatting });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setText(block.content?.text || '');
      setIsEditing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    adjustTextareaHeight();
  };

  const handleFormatting = (formatType: keyof NonNullable<TextBlockContent['formatting']>) => {
    const currentFormatting = block.content?.formatting || {};
    const newFormatting = {
      ...currentFormatting,
      [formatType]: !currentFormatting[formatType],
    };
    onUpdate({ text: block.content?.text, formatting: newFormatting });
  };

  const getFormattingClasses = () => {
    const formatting = block.content?.formatting || {};
    const classes = ['text-block-content'];
    
    if (formatting.bold) classes.push('bold');
    if (formatting.italic) classes.push('italic');
    if (formatting.underline) classes.push('underline');
    if (formatting.strikethrough) classes.push('strikethrough');
    
    return classes.join(' ');
  };

  return (
    <div className="text-block">
      {isSelected && !isEditing && (
        <div className="text-formatting-toolbar">
          <button
            className={`format-btn ${block.content?.formatting?.bold ? 'active' : ''}`}
            onClick={() => handleFormatting('bold')}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            className={`format-btn ${block.content?.formatting?.italic ? 'active' : ''}`}
            onClick={() => handleFormatting('italic')}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            className={`format-btn ${block.content?.formatting?.underline ? 'active' : ''}`}
            onClick={() => handleFormatting('underline')}
            title="Underline"
          >
            <u>U</u>
          </button>
          <button
            className={`format-btn ${block.content?.formatting?.strikethrough ? 'active' : ''}`}
            onClick={() => handleFormatting('strikethrough')}
            title="Strikethrough"
          >
            <s>S</s>
          </button>
        </div>
      )}

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="text-block-textarea"
          placeholder="Type something..."
          rows={1}
        />
      ) : (
        <div
          ref={displayRef}
          className={getFormattingClasses()}
          onClick={handleClick}
        >
          {text || (
            <span className="text-block-placeholder">
              Click to edit or type '/' for commands
            </span>
          )}
        </div>
      )}
    </div>
  );
};