import { io, Socket } from 'socket.io-client';
import { WebSocketMessage, Block, CursorPosition, UserSelection } from '../types';

type WebSocketEventHandler = (data: any) => void;

class WebSocketServiceClass {
  private socket: Socket | null = null;
  private noteId: string | null = null;
  private isConnected: boolean = false;
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map();

  connect(noteId: string): void {
    if (this.socket && this.noteId === noteId) {
      return; // Already connected to this note
    }

    this.disconnect();
    this.noteId = noteId;

    const token = localStorage.getItem('authToken');
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

    this.socket = io(`${wsUrl}/ws/notes/${noteId}/`, {
      transports: ['websocket'],
      auth: {
        token,
      },
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log(`Connected to note ${noteId}`);
      this.emit('connection_established');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log(`Disconnected from note ${noteId}`);
      this.emit('disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });

    // Real-time event handlers
    this.socket.on('user_joined', (data) => {
      this.emit('user_joined', data);
    });

    this.socket.on('user_left', (data) => {
      this.emit('user_left', data);
    });

    this.socket.on('block_updated', (data) => {
      this.emit('block_updated', data);
    });

    this.socket.on('block_created', (data) => {
      this.emit('block_created', data);
    });

    this.socket.on('block_deleted', (data) => {
      this.emit('block_deleted', data);
    });

    this.socket.on('blocks_reordered', (data) => {
      this.emit('blocks_reordered', data);
    });

    this.socket.on('cursor_moved', (data) => {
      this.emit('cursor_moved', data);
    });

    this.socket.on('user_selection_changed', (data) => {
      this.emit('user_selection_changed', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.noteId = null;
  }

  // Event handling
  on(event: string, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler?: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      return;
    }

    if (handler) {
      const handlers = this.eventHandlers.get(event)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.eventHandlers.delete(event);
    }
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Send messages to server
  sendBlockUpdate(blockId: string, content: any): void {
    if (!this.isConnected || !this.socket) {
      return;
    }

    this.socket.emit('message', {
      type: 'block_update',
      block_id: blockId,
      content,
    });
  }

  sendBlockCreate(blockType: string, content: any, order: number): void {
    if (!this.isConnected || !this.socket) {
      return;
    }

    this.socket.emit('message', {
      type: 'block_create',
      block_type: blockType,
      content,
      order,
    });
  }

  sendBlockDelete(blockId: string): void {
    if (!this.isConnected || !this.socket) {
      return;
    }

    this.socket.emit('message', {
      type: 'block_delete',
      block_id: blockId,
    });
  }

  sendBlockReorder(blockIds: string[]): void {
    if (!this.isConnected || !this.socket) {
      return;
    }

    this.socket.emit('message', {
      type: 'block_reorder',
      block_ids: blockIds,
    });
  }

  sendCursorPosition(blockId: string, position: number): void {
    if (!this.isConnected || !this.socket) {
      return;
    }

    this.socket.emit('message', {
      type: 'cursor_position',
      block_id: blockId,
      position,
    });
  }

  sendUserSelection(blockId: string, selectionStart: number, selectionEnd: number): void {
    if (!this.isConnected || !this.socket) {
      return;
    }

    this.socket.emit('message', {
      type: 'user_selection',
      block_id: blockId,
      selection_start: selectionStart,
      selection_end: selectionEnd,
    });
  }

  // Getters
  get connected(): boolean {
    return this.isConnected;
  }

  get currentNoteId(): string | null {
    return this.noteId;
  }
}

export const WebSocketService = new WebSocketServiceClass();