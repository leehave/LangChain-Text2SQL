import { Injectable } from '@nestjs/common';
import type { Conversation, ChatMessage } from '@chatbot/shared';
import { generateId, generateConversationTitle } from '@chatbot/shared';

interface ConversationStore {
  [id: string]: Conversation;
}

@Injectable()
export class HistoryService {
  private conversations: ConversationStore = {};

  createConversation(firstMessage?: string): Conversation {
    const now = Date.now();
    const conversation: Conversation = {
      id: generateId(),
      title: firstMessage ? generateConversationTitle(firstMessage) : 'New Conversation',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    this.conversations[conversation.id] = conversation;
    return conversation;
  }

  getConversation(id: string): Conversation | undefined {
    return this.conversations[id];
  }

  getAllConversations(): Conversation[] {
    return Object.values(this.conversations).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
  }

  addMessage(conversationId: string, message: ChatMessage): Conversation | undefined {
    const conversation = this.conversations[conversationId];
    if (!conversation) return undefined;

    conversation.messages.push(message);
    conversation.updatedAt = Date.now();

    if (conversation.messages.length === 1 && message.role === 'user') {
      conversation.title = generateConversationTitle(message.content);
    }

    return conversation;
  }

  updateConversationTitle(conversationId: string, title: string): Conversation | undefined {
    const conversation = this.conversations[conversationId];
    if (!conversation) return undefined;

    conversation.title = title;
    conversation.updatedAt = Date.now();
    return conversation;
  }

  deleteConversation(id: string): boolean {
    if (this.conversations[id]) {
      delete this.conversations[id];
      return true;
    }
    return false;
  }

  clearAllConversations(): void {
    this.conversations = {};
  }
}
