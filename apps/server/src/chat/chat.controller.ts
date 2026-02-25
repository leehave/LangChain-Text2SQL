import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Res,
  HttpStatus,
  HttpException,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import type { ChatRequest, TextToSqlRequest } from '@chatbot/shared';
import type { ModelProviderType } from './interfaces/llm-provider.interface';
import { ChatService } from './chat.service';
import { HistoryService } from './history.service';

@Controller('api')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly historyService: HistoryService,
  ) {}

  @Post('chat')
  async chat(
    @Body() body: ChatRequest,
    @Res() res: Response,
    @Query('provider') provider?: ModelProviderType,
  ) {
    try {
      const { message, conversationId } = body;

      if (!message || typeof message !== 'string') {
        throw new HttpException('Message is required', HttpStatus.BAD_REQUEST);
      }

      let conversation;
      if (conversationId) {
        conversation = this.historyService.getConversation(conversationId);
      }

      if (!conversation) {
        conversation = this.historyService.createConversation(message);
      }

      await this.chatService.streamChat(conversation, message, res, provider);
    } catch (error) {
      console.error('Chat error:', error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('conversations')
  getConversations() {
    try {
      const conversations = this.historyService.getAllConversations();
      return { conversations };
    } catch (error) {
      console.error('Get conversations error:', error);
      throw new HttpException(
        'Failed to get conversations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('conversations/:id')
  getConversation(@Param('id') id: string) {
    try {
      const conversation = this.historyService.getConversation(id);

      if (!conversation) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }

      return { conversation };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Get conversation error:', error);
      throw new HttpException(
        'Failed to get conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('conversations/:id')
  deleteConversation(@Param('id') id: string) {
    try {
      const success = this.historyService.deleteConversation(id);

      if (!success) {
        throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
      }

      return { success: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Delete conversation error:', error);
      throw new HttpException(
        'Failed to delete conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Post('text-to-sql')
  async textToSql(
    @Body() body: TextToSqlRequest,
    @Query('provider') provider?: ModelProviderType,
  ) {
    try {
      const { schema, prompt } = body;

      if (!schema || typeof schema !== 'string') {
        throw new HttpException('Schema is required', HttpStatus.BAD_REQUEST);
      }

      if (!prompt || typeof prompt !== 'string') {
        throw new HttpException('Prompt is required', HttpStatus.BAD_REQUEST);
      }

      const sql = await this.chatService.textToSql(schema, prompt, provider);
      return { sql };
    } catch (error) {
      console.error('Text to SQL error:', error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('providers')
  getProviders() {
    try {
      const providers = this.chatService.getAvailableProviders();
      return { providers };
    } catch (error) {
      console.error('Get providers error:', error);
      throw new HttpException(
        'Failed to get providers',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
