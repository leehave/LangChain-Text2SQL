import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { ChatMessage } from '@chatbot/shared';
import type { LLMProvider, StreamCallbacks } from '../interfaces/llm-provider.interface';

interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OllamaStreamResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

@Injectable()
export class OllamaProvider implements LLMProvider {
  name = 'Ollama';
  private baseUrl: string;
  private model: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
    this.model = this.configService.get<string>('OLLAMA_MODEL', 'llama2');
  }

  private convertMessages(messages: ChatMessage[]): OllamaMessage[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  async streamChat(messages: ChatMessage[], callbacks: StreamCallbacks): Promise<void> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        {
          model: this.model,
          messages: this.convertMessages(messages),
          stream: true,
        },
        {
          responseType: 'stream',
        },
      );

      const stream = response.data;
      let buffer = '';
      let isCompleted = false;

      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data: OllamaStreamResponse = JSON.parse(line);
              if (data.message?.content) {
                callbacks.onToken(data.message.content);
              }
              if (data.done && !isCompleted) {
                isCompleted = true;
                callbacks.onComplete();
                return;
              }
            } catch (e) {
              console.error('Failed to parse Ollama response:', e);
            }
          }
        }
      });

      stream.on('end', () => {
        if (!isCompleted) {
          isCompleted = true;
          callbacks.onComplete();
        }
      });

      stream.on('error', (error: Error) => {
        callbacks.onError(error);
      });
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const response = await axios.post(`${this.baseUrl}/api/chat`, {
      model: this.model,
      messages: this.convertMessages(messages),
      stream: false,
    });

    const data = response.data as { message?: { content?: string } };
    return data.message?.content || '';
  }
}
