import React, { useState, useRef } from 'react';
import { Block, ImageBlockContent } from '../../../types';
import { ApiService } from '../../../services/api';
import './ImageBlock.css';

interface ImageBlockProps {
  block: Block;
  isSelected: boolean;
  onUpdate: (content: ImageBlockContent) => void;
  onEditingChange: (isEditing: boolean) => void;
}

export const ImageBlock: React.FC<ImageBlockProps> = ({
  block,
  isSelected,
  onUpdate,
  onEditingChange,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  console.log('🖼️ ImageBlock render - block.content:', block.content);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    console.log('🖼️ Starting image upload for file:', file.name);

    try {
      const result = await ApiService.uploadImage(file);
      console.log('🖼️ Upload successful, result:', result);
      
      const newContent = {
        url: result.url,
        alt: file.name,
        width: block.content?.width,
        height: block.content?.height,
        caption: block.content?.caption,
      };
      
      console.log('🖼️ Calling onUpdate with content:', newContent);
      onUpdate(newContent);
    } catch (error) {
      setUploadError('Failed to upload image');
      console.error('🖼️ Upload error:', error);
    } finally {
      setIsUploading(false);
      console.log('🖼️ Upload process finished');
    }
  };

  const handleUrlSubmit = (url: string) => {
    onUpdate({
      url,
      alt: block.content?.alt || 'Image',
      width: block.content?.width,
      height: block.content?.height,
      caption: block.content?.caption,
    });
  };

  const handleCaptionChange = (caption: string) => {
    onUpdate({
      url: block.content?.url,
      alt: block.content?.alt,
      width: block.content?.width,
      height: block.content?.height,
      caption,
    });
  };

  if (!block.content?.url) {
    return (
      <div className="image-block-empty">
        <div className="image-upload-area">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <div className="upload-options">
            <button
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? '📤 Uploading...' : '📁 Upload Image'}
            </button>
            
            <div className="url-input-section">
              <input
                type="url"
                placeholder="Or paste image URL..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUrlSubmit(e.currentTarget.value);
                  }
                }}
                className="url-input"
              />
            </div>
          </div>
          
          {uploadError && (
            <div className="upload-error">
              {uploadError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="image-block">
      <div className="image-container">
        <img
          src={block.content?.url}
          alt={block.content?.alt}
          className="block-image"
          style={{
            width: block.content?.width ? `${block.content?.width}px` : 'auto',
            height: block.content?.height ? `${block.content?.height}px` : 'auto',
            maxWidth: '100%',
          }}
        />
        
        {isSelected && (
          <div className="image-toolbar">
            <button
              className="change-image-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Change image"
            >
              🔄
            </button>
          </div>
        )}
      </div>
      
      {isSelected && (
        <input
          type="text"
          value={block.content?.caption || ''}
          onChange={(e) => handleCaptionChange(e.target.value)}
          placeholder="Add a caption..."
          className="caption-input"
        />
      )}
      
      {block.content?.caption && !isSelected && (
        <div className="image-caption">
          {block.content?.caption}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
};