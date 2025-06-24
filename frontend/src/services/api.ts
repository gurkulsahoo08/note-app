import axios, { AxiosResponse } from 'axios';
import {
  Note,
  Block,
  User,
  ApiResponse,
  CreateNoteRequest,
  UpdateNoteRequest,
  CreateBlockRequest,
  UpdateBlockRequest,
  ReorderBlocksRequest,
  SearchRequest,
  AddCollaboratorRequest,
  RemoveCollaboratorRequest,
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class ApiServiceClass {
  private api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Add token to requests if available
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
      return config;
    });

    // Handle response errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const response = await this.api.post('/api/auth/token/', { username, password });
    const token = response.data.token;
    localStorage.setItem('authToken', token);
    return response.data;
  }

  logout(): void {
    localStorage.removeItem('authToken');
  }

  // Notes API
  async getNotes(): Promise<Note[]> {
    const response: AxiosResponse<ApiResponse<Note>> = await this.api.get('/api/notes/');
    return response.data.results || [];
  }

  async getNote(id: string): Promise<Note> {
    const response: AxiosResponse<Note> = await this.api.get(`/api/notes/${id}/`);
    return response.data;
  }

  async createNote(data: CreateNoteRequest): Promise<Note> {
    const response: AxiosResponse<Note> = await this.api.post('/api/notes/', data);
    return response.data;
  }

  async updateNote(id: string, data: UpdateNoteRequest): Promise<Note> {
    const response: AxiosResponse<Note> = await this.api.patch(`/api/notes/${id}/`, data);
    return response.data;
  }

  async deleteNote(id: string): Promise<void> {
    await this.api.delete(`/api/notes/${id}/`);
  }

  async duplicateNote(id: string): Promise<Note> {
    const response: AxiosResponse<Note> = await this.api.post(`/api/notes/${id}/duplicate/`);
    return response.data;
  }

  async searchNotes(query: string): Promise<Note[]> {
    const response: AxiosResponse<ApiResponse<Note>> = await this.api.get('/api/notes/search/', {
      params: { q: query },
    });
    return response.data.results || [];
  }

  async getRecentNotes(): Promise<Note[]> {
    const response: AxiosResponse<ApiResponse<Note>> = await this.api.get('/api/notes/recent/');
    return response.data.results || [];
  }

  // Collaborators API
  async getCollaborators(noteId: string): Promise<User[]> {
    const response: AxiosResponse<User[]> = await this.api.get(`/api/notes/${noteId}/collaborators/`);
    return response.data;
  }

  async addCollaborator(noteId: string, data: AddCollaboratorRequest): Promise<User> {
    const response: AxiosResponse<User> = await this.api.post(`/api/notes/${noteId}/add_collaborator/`, data);
    return response.data;
  }

  async removeCollaborator(noteId: string, data: RemoveCollaboratorRequest): Promise<void> {
    await this.api.delete(`/api/notes/${noteId}/remove_collaborator/`, { data });
  }

  // Blocks API
  async getBlocks(noteId: string): Promise<Block[]> {
    const response: AxiosResponse<ApiResponse<Block>> = await this.api.get('/api/blocks/', {
      params: { note_id: noteId },
    });
    return response.data.results || [];
  }

  async getBlock(id: string): Promise<Block> {
    const response: AxiosResponse<Block> = await this.api.get(`/api/blocks/${id}/`);
    return response.data;
  }

  async createBlock(data: CreateBlockRequest): Promise<Block> {
    const response: AxiosResponse<Block> = await this.api.post('/api/blocks/', data);
    return response.data;
  }

  async updateBlock(id: string, data: UpdateBlockRequest): Promise<Block> {
    const response: AxiosResponse<Block> = await this.api.patch(`/api/blocks/${id}/`, data);
    return response.data;
  }

  async deleteBlock(id: string): Promise<void> {
    await this.api.delete(`/api/blocks/${id}/`);
  }

  async reorderBlocks(data: ReorderBlocksRequest): Promise<void> {
    await this.api.post('/api/blocks/reorder/', data);
  }

  async duplicateBlock(id: string): Promise<Block> {
    const response: AxiosResponse<Block> = await this.api.post(`/api/blocks/${id}/duplicate/`);
    return response.data;
  }

  async getBlockVersions(blockId: string): Promise<any[]> {
    const response: AxiosResponse<any[]> = await this.api.get(`/api/blocks/${blockId}/versions/`);
    return response.data;
  }

  async restoreBlockVersion(blockId: string, versionId: string): Promise<Block> {
    const response: AxiosResponse<Block> = await this.api.post(`/api/blocks/${blockId}/restore_version/`, {
      version_id: versionId,
    });
    return response.data;
  }

  // File upload
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const response: AxiosResponse<{ url: string }> = await this.api.post('/api/upload/image/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }
}

export const ApiService = new ApiServiceClass();