export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  initials: string;
}

export interface Note {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_modified?: string;
  owner: User;
  collaborators: User[];
  collaborators_count: number;
  blocks_count: number;
  blocks?: Block[];
}

export interface Block {
  id: string;
  note: string;
  block_type: BlockType;
  content: BlockContent;
  order: number;
  created_at: string;
  updated_at: string;
  content_preview?: string;
}

export type BlockType = 'text' | 'heading' | 'code' | 'latex' | 'image' | 'table' | 'list';

export interface BlockContent {
  [key: string]: any;
}

export interface TextBlockContent extends BlockContent {
  text: string;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
  };
}

export interface HeadingBlockContent extends BlockContent {
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface CodeBlockContent extends BlockContent {
  code: string;
  language: string;
}

export interface LatexBlockContent extends BlockContent {
  formula: string;
  display?: boolean; // true for block display, false for inline
}

export interface ImageBlockContent extends BlockContent {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  caption?: string;
}

export interface TableBlockContent extends BlockContent {
  rows: string[][];
  headers?: string[];
}

export interface ListBlockContent extends BlockContent {
  items: string[];
  ordered: boolean;
}

export interface BlockVersion {
  id: string;
  content: BlockContent;
  created_at: string;
  created_by: string;
  version_number: number;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface CursorPosition {
  blockId: string;
  position: number;
  userId: string;
  username: string;
}

export interface UserSelection {
  blockId: string;
  selectionStart: number;
  selectionEnd: number;
  userId: string;
  username: string;
}

export interface CollaborativeUser {
  id: string;
  username: string;
  cursor?: CursorPosition;
  selection?: UserSelection;
  isOnline: boolean;
}

export interface ApiResponse<T> {
  results?: T[];
  count?: number;
  next?: string;
  previous?: string;
  data?: T;
}

export interface CreateNoteRequest {
  title: string;
}

export interface UpdateNoteRequest {
  title?: string;
}

export interface CreateBlockRequest {
  note: string;
  block_type: BlockType;
  content: BlockContent;
  order: number;
}

export interface UpdateBlockRequest {
  block_type?: BlockType;
  content?: BlockContent;
  order?: number;
}

export interface ReorderBlocksRequest {
  note_id: string;
  block_ids: string[];
}

export interface SearchRequest {
  q: string;
}

export interface AddCollaboratorRequest {
  email: string;
}

export interface RemoveCollaboratorRequest {
  user_id: string;
}