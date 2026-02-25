import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: this.convertMessages(messages),
          stream: true,
          temperature: this.configService.get<number>('LOCAL_MODEL_TEMPERATURE', 0.7),
          max_tokens: this.configService.get<number>('LOCAL_MODEL_MAX_TOKENS', 4096),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') {
                callbacks.onComplete();
                return;
              }

              try {
                const data: OpenAIStreamResponse = JSON.parse(dataStr);
                const content = data.choices[0]?.delta?.content;
                if (content) {
                  callbacks.onToken(content);
                }
                if (data.choices[0]?.finish_reason === 'stop') {
                  callbacks.onComplete();
                  return;
                }
              } catch (e) {
                console.error('Failed to parse stream data:', e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      callbacks.onComplete();
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: this.convertMessages(messages),
        stream: false,
        temperature: this.configService.get<number>('LOCAL_MODEL_TEMPERATURE', 0.7),
        max_tokens: this.configService.get<number>('LOCAL_MODEL_MAX_TOKENS', 4096),
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || '';
  }
}
