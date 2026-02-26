import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { ChatMessage } from '@chatbot/shared';
import type { LLMProvider, StreamCallbacks } from '../interfaces/llm-provider.interface';

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenAIStreamResponse {
  choices: Array<{
    delta: {
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

@Injectable()
export class OpenAICompatibleProvider implements LLMProvider {
  name = 'OpenAI Compatible';
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('OPENAI_COMPATIBLE_BASE_URL', 'http://localhost:1234/v1');
    this.apiKey = this.configService.get<string>('OPENAI_COMPATIBLE_API_KEY', 'not-needed');
    this.model = this.configService.get<string>('OPENAI_COMPATIBLE_MODEL', 'local-model');
  }

  private convertMessages(messages: ChatMessage[]): OpenAIMessage[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  async streamChat(messages: ChatMessage[], callbacks: StreamCallbacks): Promise<void> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: this.convertMessages(messages),
          stream: true,
          temperature: this.configService.get<number>('LOCAL_MODEL_TEMPERATURE', 0.7),
          max_tokens: this.configService.get<number>('LOCAL_MODEL_MAX_TOKENS', 4096),
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
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
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]' && !isCompleted) {
              isCompleted = true;
              callbacks.onComplete();
              return;
            }

            try {
              const data: OpenAIStreamResponse = JSON.parse(dataStr);
              const content = data.choices[0]?.delta?.content;
              if (content) {
                callbacks.onToken(content);
              }
              if (data.choices[0]?.finish_reason === 'stop' && !isCompleted) {
                isCompleted = true;
                callbacks.onComplete();
                return;
              }
            } catch (e) {
              console.error('Failed to parse stream data:', e);
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
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: this.model,
        messages: this.convertMessages(messages),
        stream: false,
        temperature: this.configService.get<number>('LOCAL_MODEL_TEMPERATURE', 0.7),
        max_tokens: this.configService.get<number>('LOCAL_MODEL_MAX_TOKENS', 4096),
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      },
    );

    const data = response.data as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || '';
  }
}
