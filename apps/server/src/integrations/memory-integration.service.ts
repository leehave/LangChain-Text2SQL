import { Injectable, Logger } from '@nestjs/common';
import { MemoryService } from '../memory/memory.service';
import { SkillExecutorService } from '../skills/skill-executor.service';
import { ChatService } from '../chat/chat.service';
import type { ChatMessage, Conversation } from '@chatbot/shared';

@Injectable()
export class MemoryIntegrationService {
  private readonly logger = new Logger(MemoryIntegrationService.name);

  constructor(
    private memoryService: MemoryService,
    private skillExecutor: SkillExecutorService,
    private chatService: ChatService,
  ) {}

  /**
   * Store conversation context in memory
   */
  async storeConversationContext(conversation: Conversation): Promise<void> {
    try {
      // Store the full conversation
      await this.memoryService.store(
        `conversation:${conversation.id}`,
        JSON.stringify(conversation),
        'conversations',
        { 
          conversationId: conversation.id,
          title: conversation.title,
          messageCount: conversation.messages.length,
          lastUpdatedAt: conversation.updatedAt
        },
        3600 // Expire in 1 hour
      );

      // Store recent messages separately for quick access
      const recentMessages = conversation.messages.slice(-10); // Last 10 messages
      await this.memoryService.store(
        `recent_messages:${conversation.id}`,
        JSON.stringify(recentMessages),
        'messages',
        { 
          conversationId: conversation.id,
          messageCount: recentMessages.length
        },
        1800 // Expire in 30 minutes
      );

      this.logger.log(`Stored conversation context for: ${conversation.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to store conversation context: ${errorMessage}`);
    }
  }

  /**
   * Retrieve conversation context from memory
   */
  async getConversationContext(conversationId: string): Promise<Conversation | null> {
    try {
      const record = await this.memoryService.retrieve(`conversation:${conversationId}`);
      if (record) {
        return JSON.parse(record.value) as Conversation;
      }
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to retrieve conversation context: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Store skill execution results in memory
   */
  async storeSkillResult(
    skillId: string, 
    parameters: Record<string, any>, 
    result: any
  ): Promise<void> {
    try {
      const key = `skill_result:${skillId}:${Date.now()}`;
      const value = JSON.stringify(result);
      
      await this.memoryService.store(
        key,
        value,
        'skills',
        { 
          skillId,
          parameters,
          executedAt: new Date().toISOString()
        },
        7200 // Expire in 2 hours
      );

      // Also store a shorter-term cache with the parameters as key
      const cacheKey = `skill_cache:${skillId}:${JSON.stringify(parameters)}`;
      await this.memoryService.store(
        cacheKey,
        value,
        'skill_cache',
        { 
          skillId,
          parameters,
          cachedAt: new Date().toISOString()
        },
        300 // Expire in 5 minutes
      );

      this.logger.log(`Stored skill result for: ${skillId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to store skill result: ${errorMessage}`);
    }
  }

  /**
   * Get cached skill result
   */
  async getCachedSkillResult(
    skillId: string, 
    parameters: Record<string, any>
  ): Promise<any | null> {
    try {
      const cacheKey = `skill_cache:${skillId}:${JSON.stringify(parameters)}`;
      const record = await this.memoryService.retrieve(cacheKey);
      
      if (record) {
        return JSON.parse(record.value);
      }
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to retrieve cached skill result: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Store user preferences in memory
   */
  async storeUserPreferences(userId: string, preferences: Record<string, any>): Promise<void> {
    try {
      await this.memoryService.store(
        `user_preferences:${userId}`,
        JSON.stringify(preferences),
        'user_data',
        { userId, updatedAt: new Date().toISOString() },
        86400 // Expire in 24 hours
      );

      this.logger.log(`Stored user preferences for: ${userId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to store user preferences: ${errorMessage}`);
    }
  }

  /**
   * Get user preferences from memory
   */
  async getUserPreferences(userId: string): Promise<Record<string, any> | null> {
    try {
      const record = await this.memoryService.retrieve(`user_preferences:${userId}`);
      if (record) {
        return JSON.parse(record.value);
      }
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to retrieve user preferences: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Store contextual information during chat
   */
  async storeContextInfo(contextKey: string, info: any, category: string = 'context'): Promise<void> {
    try {
      const key = `${category}:${contextKey}`;
      const value = typeof info === 'string' ? info : JSON.stringify(info);
      
      await this.memoryService.store(
        key,
        value,
        category,
        { storedAt: new Date().toISOString() },
        3600 // Expire in 1 hour
      );

      this.logger.log(`Stored context info for key: ${key}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to store context info: ${errorMessage}`);
    }
  }

  /**
   * Retrieve contextual information
   */
  async getContextInfo(contextKey: string, category: string = 'context'): Promise<any | null> {
    try {
      const key = `${category}:${contextKey}`;
      const record = await this.memoryService.retrieve(key);
      
      if (record) {
        try {
          return JSON.parse(record.value);
        } catch {
          // If parsing fails, return the raw value
          return record.value;
        }
      }
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to retrieve context info: ${errorMessage}`);
      return null;
    }
  }
}