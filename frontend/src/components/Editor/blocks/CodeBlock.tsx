import React, { useState, useRef, useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';
import { Block, CodeBlockContent } from '../../../types';
import './CodeBlock.css';

interface CodeBlockProps {
  block: Block;
  isSelected: boolean;
  onUpdate: (content: CodeBlockContent) => void;
  onEditingChange: (isEditing: boolean) => void;
}

const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'css', label: 'CSS' },
  { value: 'markup', label: 'HTML' },
  { value: 'json', label: 'JSON' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'text', label: 'Plain Text' },
];

export const CodeBlock: React.FC<CodeBlockProps> = ({
  block,
  isSelected,
  onUpdate,
  onEditingChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [code, setCode] = useState(block.content?.code || '');
  const [language, setLanguage] = useState(block.content?.language || 'javascript');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setCode(block.content?.code || '');
    setLanguage(block.content?.language || 'javascript');
  }, [block.content?.code, block.content?.language]);

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
    if (!isEditing && preRef.current && code) {
      Prism.highlightElement(preRef.current);
    }
  }, [isEditing, code, language]);

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
    if (code !== block.content?.code || language !== block.content?.language) {
      onUpdate({ code, language });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newValue);
      
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    } else if (e.key === 'Escape') {
      setCode(block.content?.code || '');
      setLanguage(block.content?.language || 'javascript');
      setIsEditing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
    adjustTextareaHeight();
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    onUpdate({ code: block.content?.code || '', language: newLanguage });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const getLanguageLabel = () => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.value === language);
    return lang ? lang.label : language;
  };

  return (
    <div className="code-block">
      {isSelected && (
        <div className="code-toolbar">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="language-selector"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          
          <button
            className="copy-btn"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            📋
          </button>
        </div>
      )}

      <div className="code-container">
        <div className="code-header">
          <span className="language-badge">{getLanguageLabel()}</span>
          {!isSelected && (
            <button
              className="copy-btn-inline"
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              📋
            </button>
          )}
        </div>

        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={code}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="code-textarea"
            placeholder="Enter your code here..."
            spellCheck={false}
          />
        ) : (
          <pre
            ref={preRef}
            className={`code-display language-${language}`}
            onClick={handleClick}
          >
            <code className={`language-${language}`}>
              {code || (
                <span className="code-placeholder">
                  Click to add code...
                </span>
              )}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
};