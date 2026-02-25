import type { ChatMessage } from '@chatbot/shared';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

export interface LLMProvider {
  name: string;
  streamChat(messages: ChatMessage[], callbacks: StreamCallbacks): Promise<void>;
  chat(messages: ChatMessage[]): Promise<string>;
}

export type ModelProviderType = 'deepseek' | 'ollama' | 'openai-compatible';

export interface ModelConfig {
  provider: ModelProviderType;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
}
