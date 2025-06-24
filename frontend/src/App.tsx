import React, { useState, useEffect } from 'react';
import './App.css';
import { Layout } from './components/Layout/Layout';
import { Editor } from './components/Editor/Editor';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ApiService } from './services/api';
import { WebSocketService } from './services/websocket';
import { Note, Block } from './types';

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // For development - auto login with test credentials
      const existingToken = localStorage.getItem('authToken');
      if (!existingToken) {
        await ApiService.login('testuser', 'testpass123');
      }
      loadNotes();
    } catch (error) {
      console.error('Authentication failed:', error);
      setError('Authentication failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const fetchedNotes = await ApiService.getNotes();
      setNotes(fetchedNotes);
      
      if (fetchedNotes.length > 0) {
        setCurrentNote(fetchedNotes[0]);
        loadBlocks(fetchedNotes[0].id);
      }
    } catch (err) {
      setError('Failed to load notes');
      console.error('Error loading notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBlocks = async (noteId: string) => {
    try {
      const fetchedBlocks = await ApiService.getBlocks(noteId);
      setBlocks(fetchedBlocks);
    } catch (err) {
      setError('Failed to load blocks');
      console.error('Error loading blocks:', err);
    }
  };

  const handleNoteSelect = (note: Note) => {
    setCurrentNote(note);
    loadBlocks(note.id);
  };

  const handleCreateNote = async (title: string) => {
    try {
      const newNote = await ApiService.createNote({ title });
      setNotes(prev => [newNote, ...prev]);
      setCurrentNote(newNote);
      setBlocks([]);
    } catch (err) {
      setError('Failed to create note');
      console.error('Error creating note:', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await ApiService.deleteNote(noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));
      
      if (currentNote?.id === noteId) {
        const remainingNotes = notes.filter(note => note.id !== noteId);
        if (remainingNotes.length > 0) {
          setCurrentNote(remainingNotes[0]);
          loadBlocks(remainingNotes[0].id);
        } else {
          setCurrentNote(null);
          setBlocks([]);
        }
      }
    } catch (err) {
      setError('Failed to delete note');
      console.error('Error deleting note:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <Layout
        sidebar={
          <Sidebar
            notes={notes}
            currentNote={currentNote}
            onNoteSelect={handleNoteSelect}
            onCreateNote={handleCreateNote}
            onDeleteNote={handleDeleteNote}
          />
        }
        main={
          currentNote ? (
            <Editor
              note={currentNote}
              blocks={blocks}
              onBlocksChange={setBlocks}
            />
          ) : (
            <div className="no-note-selected">
              <h2>Welcome to Note Taking App</h2>
              <p>Select a note from the sidebar or create a new one to get started.</p>
            </div>
          )
        }
      />
      
      {error && (
        <div className="error-toast">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
    </div>
  );
}

export default App;
