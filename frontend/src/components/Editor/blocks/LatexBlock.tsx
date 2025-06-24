import React, { useState, useRef, useEffect } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Block, LatexBlockContent } from '../../../types';
import './LatexBlock.css';

interface LatexBlockProps {
  block: Block;
  isSelected: boolean;
  onUpdate: (content: LatexBlockContent) => void;
  onEditingChange: (isEditing: boolean) => void;
}

export const LatexBlock: React.FC<LatexBlockProps> = ({
  block,
  isSelected,
  onUpdate,
  onEditingChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formula, setFormula] = useState(block.content?.formula || '');
  const [display, setDisplay] = useState(block.content?.display !== false); // default to true
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const renderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFormula(block.content?.formula || '');
    setDisplay(block.content?.display !== false);
  }, [block.content?.formula, block.content?.display]);

  useEffect(() => {
    onEditingChange(isEditing);
  }, [isEditing, onEditingChange]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      adjustTextareaHeight();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing && formula && renderRef.current) {
      renderLatex();
    }
  }, [isEditing, formula, display]);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const renderLatex = () => {
    if (!renderRef.current || !formula) return;

    try {
      katex.render(formula, renderRef.current, {
        displayMode: display,
        throwOnError: true,
        trust: true,
        strict: false,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid LaTeX formula');
      renderRef.current.innerHTML = `<span class="latex-error">Error: ${error}</span>`;
    }
  };

  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (formula !== block.content?.formula || display !== block.content?.display) {
      onUpdate({ formula, display });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setFormula(block.content?.formula || '');
      setDisplay(block.content?.display !== false);
      setIsEditing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormula(e.target.value);
    adjustTextareaHeight();
  };

  const handleDisplayToggle = () => {
    const newDisplay = !display;
    setDisplay(newDisplay);
    onUpdate({ formula: block.content?.formula, display: newDisplay });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formula);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy formula:', err);
    }
  };

  const getCommonFormulas = () => [
    { label: 'Quadratic Formula', formula: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
    { label: 'Pythagorean Theorem', formula: 'a^2 + b^2 = c^2' },
    { label: 'Euler\'s Identity', formula: 'e^{i\\pi} + 1 = 0' },
    { label: 'Integral', formula: '\\int_{a}^{b} f(x) dx' },
    { label: 'Summation', formula: '\\sum_{i=1}^{n} x_i' },
    { label: 'Matrix', formula: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
    { label: 'Fraction', formula: '\\frac{numerator}{denominator}' },
    { label: 'Square Root', formula: '\\sqrt{x}' },
  ];

  return (
    <div className="latex-block">
      {isSelected && (
        <div className="latex-toolbar">
          <button
            className={`display-btn ${display ? 'active' : ''}`}
            onClick={handleDisplayToggle}
            title={display ? 'Switch to inline' : 'Switch to display'}
          >
            {display ? '📐' : '📏'}
          </button>
          
          <button
            className="copy-btn"
            onClick={handleCopy}
            title="Copy formula"
          >
            📋
          </button>

          <div className="formula-templates">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  setFormula(e.target.value);
                  onUpdate({ formula: e.target.value, display });
                }
                e.target.value = '';
              }}
              className="template-selector"
            >
              <option value="">Insert template...</option>
              {getCommonFormulas().map((template, index) => (
                <option key={index} value={template.formula}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className={`latex-container ${display ? 'display-mode' : 'inline-mode'}`}>
        {isEditing ? (
          <div className="latex-editor">
            <textarea
              ref={textareaRef}
              value={formula}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="latex-textarea"
              placeholder="Enter LaTeX formula... (Ctrl+Enter to render)"
              spellCheck={false}
            />
            
            <div className="latex-help">
              <p>LaTeX Tips:</p>
              <ul>
                <li>Fractions: <code>\\frac{'{a}{b}'}</code></li>
                <li>Superscript: <code>x^2</code></li>
                <li>Subscript: <code>x_1</code></li>
                <li>Square root: <code>\\sqrt{'{x}'}</code></li>
                <li>Greek letters: <code>\\alpha, \\beta, \\gamma</code></li>
              </ul>
            </div>
          </div>
        ) : (
          <div
            className="latex-display"
            onClick={handleClick}
          >
            {formula ? (
              <div
                ref={renderRef}
                className={`latex-rendered ${error ? 'has-error' : ''}`}
              />
            ) : (
              <div className="latex-placeholder">
                Click to add mathematical formula...
              </div>
            )}
          </div>
        )}
      </div>

      {error && !isEditing && (
        <div className="latex-error-msg">
          <span>⚠️ LaTeX Error: {error}</span>
        </div>
      )}
    </div>
  );
};