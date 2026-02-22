import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatDeepSeek } from '@langchain/deepseek';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import type { ChatMessage } from '@chatbot/shared';

export interface ChatStreamCallbacks {
  onToken: (token: string) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
}

@Injectable()
export class LlmService {
  private model: ChatDeepSeek;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is required');
    }

    this.model = new ChatDeepSeek({
      apiKey,
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 4096,
      streaming: true,
    });
  }

  private convertToLangChainMessages(messages: ChatMessage[]) {
    return messages.map((msg) => {
      switch (msg.role) {
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          return new AIMessage(msg.content);
        case 'system':
          return new SystemMessage(msg.content);
        default:
          return new HumanMessage(msg.content);
      }
    });
  }

  async streamChat(
    messages: ChatMessage[],
    callbacks: ChatStreamCallbacks,
  ): Promise<void> {
    try {
      const langChainMessages = this.convertToLangChainMessages(messages);

      const stream = await this.model.stream(langChainMessages);

      for await (const chunk of stream) {
        const content = chunk.content;
        if (typeof content === 'string') {
          callbacks.onToken(content);
        } else if (Array.isArray(content)) {
          for (const item of content) {
            if (typeof item === 'string') {
              callbacks.onToken(item);
            } else if (item && typeof item === 'object' && 'text' in item) {
              callbacks.onToken((item as { text: string }).text);
            }
          }
        }
      }

      callbacks.onComplete();
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const langChainMessages = this.convertToLangChainMessages(messages);
    const response = await this.model.invoke(langChainMessages);
    return typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);
  }
}
