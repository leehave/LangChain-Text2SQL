import axios from 'axios';
import type { Conversation, UploadResponse, ConversationsResponse, HistoryResponse, TextToSqlRequest, TextToSqlResponse } from '@chatbot/shared';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ModelProvider {
  type: 'deepseek' | 'ollama' | 'openai-compatible';
  name: string;
}

export interface ProvidersResponse {
  providers: ModelProvider[];
}

export async function sendChatMessage(
  message: string,
  conversationId?: string,
  onToken?: (token: string) => void,
  onComplete?: (conversationId: string, message: { id: string; content: string }) => void,
  onError?: (error: string) => void,
  provider?: string,
): Promise<void> {
  const url = provider 
    ? `${API_URL}/api/chat?provider=${encodeURIComponent(provider)}`
    : `${API_URL}/api/chat`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, conversationId }),
  });

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'token' && onToken) {
              onToken(data.data);
            } else if (data.type === 'error' && onError) {
              onError(data.data);
            } else if (data.type === 'done' && onComplete) {
              const result = JSON.parse(data.data);
              onComplete(result.conversationId, result.message);
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function getConversations(): Promise<Conversation[]> {
  const response = await api.get<ConversationsResponse>('/api/conversations');
  return response.data.conversations;
}

export async function getConversation(id: string): Promise<Conversation> {
  const response = await api.get<HistoryResponse>(`/api/conversations/${id}`);
  return response.data.conversation;
}

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`/api/conversations/${id}`);
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<UploadResponse>('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

export async function textToSql(schema: string, prompt: string, provider?: string): Promise<string> {
  const url = provider 
    ? `/api/text-to-sql?provider=${encodeURIComponent(provider)}`
    : '/api/text-to-sql';
  
  const response = await api.post<TextToSqlResponse>(url, {
    schema,
    prompt,
  } as TextToSqlRequest);
  return response.data.sql;
}

export async function getProviders(): Promise<ModelProvider[]> {
  const response = await api.get<ProvidersResponse>('/api/providers');
  return response.data.providers;
}

export default api;
