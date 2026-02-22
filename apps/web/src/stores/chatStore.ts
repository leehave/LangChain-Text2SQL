import { create } from 'zustand';
import type { Conversation, ChatMessage } from '@chatbot/shared';

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  streamingMessage: string;
  
  // Actions
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversation: Conversation) => void;
  deleteConversation: (id: string) => void;
  setCurrentConversationId: (id: string | null) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  setIsLoading: (isLoading: boolean) => void;
  setStreamingMessage: (message: string) => void;
  appendToStreamingMessage: (token: string) => void;
  clearStreamingMessage: () => void;
  updateConversationTitle: (id: string, title: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  currentConversationId: null,
  isLoading: false,
  streamingMessage: '',

  setConversations: (conversations) => set({ conversations }),
  
  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      currentConversationId: conversation.id,
    })),
  
  updateConversation: (conversation) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversation.id ? conversation : c
      ),
    })),
  
  deleteConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      currentConversationId:
        state.currentConversationId === id ? null : state.currentConversationId,
    })),
  
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  
  addMessage: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() }
          : c
      ),
    })),
  
  setIsLoading: (isLoading) => set({ isLoading }),
  
  setStreamingMessage: (message) => set({ streamingMessage: message }),
  
  appendToStreamingMessage: (token) =>
    set((state) => ({
      streamingMessage: state.streamingMessage + token,
    })),
  
  clearStreamingMessage: () => set({ streamingMessage: '' }),
  
  updateConversationTitle: (id, title) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    })),
}));
