import React, { useState, useEffect, useRef } from 'react';
import { Block, ListBlockContent } from '../../../types';
import './ListBlock.css';

interface ListBlockProps {
  block: Block;
  isSelected: boolean;
  onUpdate: (content: ListBlockContent) => void;
  onEditingChange: (isEditing: boolean) => void;
}

export const ListBlock: React.FC<ListBlockProps> = ({
  block,
  isSelected,
  onUpdate,
  onEditingChange,
}) => {
  const [items, setItems] = useState(block.content?.items || ['']);
  const [ordered, setOrdered] = useState(block.content?.ordered || false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setItems(block.content?.items || ['']);
    setOrdered(block.content?.ordered || false);
  }, [block.content?.items, block.content?.ordered]);

  useEffect(() => {
    onEditingChange(editingIndex !== null);
  }, [editingIndex, onEditingChange]);

  const updateList = (newItems: string[], newOrdered: boolean) => {
    setItems(newItems);
    setOrdered(newOrdered);
    onUpdate({ items: newItems, ordered: newOrdered });
  };

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const handleItemBlur = (index: number) => {
    setEditingIndex(null);
    updateList(items, ordered);
  };

  const handleItemKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Add new item after current one
      const newItems = [...items];
      newItems.splice(index + 1, 0, '');
      updateList(newItems, ordered);
      
      // Focus the new item
      setTimeout(() => {
        setEditingIndex(index + 1);
        inputRefs.current[index + 1]?.focus();
      }, 0);
      
    } else if (e.key === 'Backspace' && items[index] === '' && items.length > 1) {
      e.preventDefault();
      
      // Remove empty item and focus previous
      const newItems = items.filter((_: string, i: number) => i !== index);
      updateList(newItems, ordered);
      
      if (index > 0) {
        setTimeout(() => {
          setEditingIndex(index - 1);
          inputRefs.current[index - 1]?.focus();
        }, 0);
      }
      
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      setEditingIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
      
    } else if (e.key === 'ArrowDown' && index < items.length - 1) {
      e.preventDefault();
      setEditingIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
      
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
    }
  };

  const handleItemClick = (index: number) => {
    setEditingIndex(index);
    setTimeout(() => {
      inputRefs.current[index]?.focus();
    }, 0);
  };

  const addItem = () => {
    const newItems = [...items, ''];
    updateList(newItems, ordered);
    setEditingIndex(newItems.length - 1);
    setTimeout(() => {
      inputRefs.current[newItems.length - 1]?.focus();
    }, 0);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_: string, i: number) => i !== index);
      updateList(newItems, ordered);
      setEditingIndex(null);
    }
  };

  const toggleListType = () => {
    updateList(items, !ordered);
  };

  const moveItemUp = (index: number) => {
    if (index > 0) {
      const newItems = [...items];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      updateList(newItems, ordered);
    }
  };

  const moveItemDown = (index: number) => {
    if (index < items.length - 1) {
      const newItems = [...items];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      updateList(newItems, ordered);
    }
  };

  return (
    <div className="list-block">
      {isSelected && (
        <div className="list-toolbar">
          <button
            onClick={toggleListType}
            className={`list-type-btn ${ordered ? 'ordered' : 'unordered'}`}
            title={ordered ? 'Switch to bulleted list' : 'Switch to numbered list'}
          >
            {ordered ? '🔢' : '•'}
          </button>
          
          <button
            onClick={addItem}
            className="add-item-btn"
            title="Add item"
          >
            ➕
          </button>
        </div>
      )}

      <div className={`list-container ${ordered ? 'ordered' : 'unordered'}`}>
        {ordered ? (
          <ol className="block-list ordered-list">
            {items.map((item: string, index: number) => (
              <li key={index} className="list-item">
                <div className="item-content">
                  {editingIndex === index ? (
                    <input
                      ref={(el: HTMLInputElement | null) => { inputRefs.current[index] = el; }}
                      type="text"
                      value={item}
                      onChange={(e) => handleItemChange(index, e.target.value)}
                      onBlur={() => handleItemBlur(index)}
                      onKeyDown={(e) => handleItemKeyDown(e, index)}
                      className="item-input"
                      placeholder="List item..."
                    />
                  ) : (
                    <div
                      className="item-text"
                      onClick={() => handleItemClick(index)}
                    >
                      {item || (
                        <span className="item-placeholder">
                          Click to edit
                        </span>
                      )}
                    </div>
                  )}
                  
                  {isSelected && (
                    <div className="item-actions">
                      {index > 0 && (
                        <button
                          onClick={() => moveItemUp(index)}
                          className="move-btn"
                          title="Move up"
                        >
                          ↑
                        </button>
                      )}
                      
                      {index < items.length - 1 && (
                        <button
                          onClick={() => moveItemDown(index)}
                          className="move-btn"
                          title="Move down"
                        >
                          ↓
                        </button>
                      )}
                      
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(index)}
                          className="remove-item-btn"
                          title="Remove item"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <ul className="block-list unordered-list">
            {items.map((item: string, index: number) => (
              <li key={index} className="list-item">
                <div className="item-content">
                  {editingIndex === index ? (
                    <input
                      ref={(el: HTMLInputElement | null) => { inputRefs.current[index] = el; }}
                      type="text"
                      value={item}
                      onChange={(e) => handleItemChange(index, e.target.value)}
                      onBlur={() => handleItemBlur(index)}
                      onKeyDown={(e) => handleItemKeyDown(e, index)}
                      className="item-input"
                      placeholder="List item..."
                    />
                  ) : (
                    <div
                      className="item-text"
                      onClick={() => handleItemClick(index)}
                    >
                      {item || (
                        <span className="item-placeholder">
                          Click to edit
                        </span>
                      )}
                    </div>
                  )}
                  
                  {isSelected && (
                    <div className="item-actions">
                      {index > 0 && (
                        <button
                          onClick={() => moveItemUp(index)}
                          className="move-btn"
                          title="Move up"
                        >
                          ↑
                        </button>
                      )}
                      
                      {index < items.length - 1 && (
                        <button
                          onClick={() => moveItemDown(index)}
                          className="move-btn"
                          title="Move down"
                        >
                          ↓
                        </button>
                      )}
                      
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(index)}
                          className="remove-item-btn"
                          title="Remove item"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};