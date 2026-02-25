import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { generateId } from '@chatbot/shared';
import type { ChatMessage, Conversation, StreamChunk } from '@chatbot/shared';
import type { ModelProviderType } from './interfaces/llm-provider.interface';
import { HistoryService } from './history.service';
import { LlmService } from './llm.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly historyService: HistoryService,
    private readonly llmService: LlmService,
  ) {}

  async streamChat(
    conversation: Conversation,
    message: string,
    res: Response,
    providerType?: ModelProviderType,
  ): Promise<void> {
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    this.historyService.addMessage(conversation.id, userMessage);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const assistantMessageId = generateId();
    let fullResponse = '';

    const sendChunk = (chunk: StreamChunk) => {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    };

    await this.llmService.streamChat(
      conversation.messages,
      {
        onToken: (token: string) => {
          fullResponse += token;
          sendChunk({ type: 'token', data: token });
        },
        onError: (error: Error) => {
          sendChunk({ type: 'error', data: error.message });
          res.end();
        },
        onComplete: () => {
          const assistantMessage: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: fullResponse,
            timestamp: Date.now(),
          };
          this.historyService.addMessage(conversation.id, assistantMessage);

          sendChunk({
            type: 'done',
            data: JSON.stringify({
              message: assistantMessage,
              conversationId: conversation.id,
            }),
          });
          res.end();
        },
      },
      providerType,
    );
  }

  async textToSql(schema: string, prompt: string, providerType?: ModelProviderType): Promise<string> {
    const systemPrompt = `You are a SQL expert. Convert natural language queries to SQL based on the provided database schema.

Database Schema:
${schema}

Rules:
1. Return only the SQL query without any explanation
2. Use proper SQL syntax compatible with PostgreSQL
3. Include appropriate JOINs when needed
4. Use meaningful aliases for tables when necessary
5. Format the SQL with proper indentation`;

    const messages: ChatMessage[] = [
      {
        id: generateId(),
        role: 'system',
        content: systemPrompt,
        timestamp: Date.now(),
      },
      {
        id: generateId(),
        role: 'user',
        content: prompt,
        timestamp: Date.now(),
      },
    ];

    const sql = await this.llmService.chat(messages, providerType);
    return sql.trim();
  }

  getAvailableProviders() {
    return this.llmService.getAvailableProviders();
  }
}
