import React, { useState } from 'react';
import { Note } from '../../types';
import './Sidebar.css';

interface SidebarProps {
  notes: Note[];
  currentNote: Note | null;
  onNoteSelect: (note: Note) => void;
  onCreateNote: (title: string) => void;
  onDeleteNote: (noteId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  currentNote,
  onNoteSelect,
  onCreateNote,
  onDeleteNote,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateNote = () => {
    if (newNoteTitle.trim()) {
      onCreateNote(newNoteTitle.trim());
      setNewNoteTitle('');
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateNote();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewNoteTitle('');
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">Notes</h1>
        <button
          className="create-note-btn"
          onClick={() => setIsCreating(true)}
          title="Create new note"
        >
          +
        </button>
      </div>

      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {isCreating && (
        <div className="new-note-form">
          <input
            type="text"
            placeholder="Note title..."
            value={newNoteTitle}
            onChange={(e) => setNewNoteTitle(e.target.value)}
            onKeyDown={handleKeyPress}
            className="new-note-input"
            autoFocus
          />
          <div className="new-note-actions">
            <button
              onClick={handleCreateNote}
              className="create-btn"
              disabled={!newNoteTitle.trim()}
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewNoteTitle('');
              }}
              className="cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="notes-list">
        {filteredNotes.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? 'No notes found' : 'No notes yet. Create your first note!'}
          </div>
        ) : (
          filteredNotes.map((note) => (
            <div
              key={note.id}
              className={`note-item ${currentNote?.id === note.id ? 'active' : ''}`}
              onClick={() => onNoteSelect(note)}
            >
              <div className="note-header">
                <h3 className="note-title">{note.title}</h3>
                <button
                  className="delete-note-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this note?')) {
                      onDeleteNote(note.id);
                    }
                  }}
                  title="Delete note"
                >
                  ×
                </button>
              </div>
              <div className="note-meta">
                <span className="note-date">{formatDate(note.updated_at)}</span>
                <span className="note-blocks">
                  {note.blocks_count} block{note.blocks_count !== 1 ? 's' : ''}
                </span>
              </div>
              {note.collaborators_count > 0 && (
                <div className="note-collaborators">
                  {note.collaborators_count} collaborator{note.collaborators_count !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};