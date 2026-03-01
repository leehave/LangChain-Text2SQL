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

// Skill System Types
export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
  defaultValue?: any;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  parameters: SkillParameter[];
  category: string;
  version: string;
  author?: string;
}

export interface SkillExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SkillExecutionRequest {
  skillId: string;
  parameters: Record<string, any>;
}

export interface SkillExecutionResponse {
  result: SkillExecutionResult;
  executionTime: number;
}
