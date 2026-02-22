export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  attachments?: Attachment[];
}

export interface ChatResponse {
  message: ChatMessage;
  conversationId: string;
}

export interface StreamChunk {
  type: 'token' | 'error' | 'done';
  data: string;
}

export interface UploadResponse {
  success: boolean;
  file?: Attachment;
  error?: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface HistoryResponse {
  conversation: Conversation;
}

export interface TextToSqlRequest {
  schema: string;
  prompt: string;
}

export interface TextToSqlResponse {
  sql: string;
}
