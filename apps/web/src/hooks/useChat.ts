import { useCallback, useEffect } from 'react';
import { generateId } from '@chatbot/shared';
import type { ChatMessage, Attachment } from '@chatbot/shared';
import { useChatStore } from '../stores/chatStore';
import { sendChatMessage, getConversations, deleteConversation as apiDeleteConversation, getProviders } from '../services/api';

export function useChat() {
  const {
    conversations,
    currentConversationId,
    isLoading,
    streamingMessage,
    selectedProvider,
    availableProviders,
    setConversations,
    addMessage,
    setCurrentConversationId,
    deleteConversation: removeConversation,
    setIsLoading,
    appendToStreamingMessage,
    clearStreamingMessage,
    setSelectedProvider,
    setAvailableProviders,
  } = useChatStore();

  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, [setConversations]);

  const loadProviders = useCallback(async () => {
    try {
      const providers = await getProviders();
      setAvailableProviders(providers);
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  }, [setAvailableProviders]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const sendMessage = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      if (!content.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
        attachments,
      };

      if (currentConversationId) {
        addMessage(currentConversationId, userMessage);
      }

      setIsLoading(true);
      clearStreamingMessage();

      try {
        await sendChatMessage(
          content.trim(),
          currentConversationId || undefined,
          (token) => {
            appendToStreamingMessage(token);
          },
          (convId, message) => {
            if (!currentConversationId) {
              setCurrentConversationId(convId);
            }
            addMessage(convId, {
              id: message.id,
              role: 'assistant',
              content: message.content,
              timestamp: Date.now(),
            });
            clearStreamingMessage();
            setIsLoading(false);
          },
          (error) => {
            console.error('Chat error:', error);
            setIsLoading(false);
          },
          selectedProvider || undefined
        );
      } catch (error) {
        console.error('Failed to send message:', error);
        setIsLoading(false);
      }
    },
    [
      currentConversationId,
      isLoading,
      addMessage,
      setCurrentConversationId,
      setIsLoading,
      clearStreamingMessage,
      appendToStreamingMessage,
    ]
  );

  const createNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    clearStreamingMessage();
  }, [setCurrentConversationId, clearStreamingMessage]);

  const selectConversation = useCallback(
    (id: string) => {
      setCurrentConversationId(id);
      clearStreamingMessage();
    },
    [setCurrentConversationId, clearStreamingMessage]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        await apiDeleteConversation(id);
        removeConversation(id);
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    },
    [removeConversation]
  );

  return {
    conversations,
    currentConversation,
    currentConversationId,
    isLoading,
    streamingMessage,
    selectedProvider,
    availableProviders,
    loadConversations,
    sendMessage,
    createNewConversation,
    selectConversation,
    deleteConversation,
    setSelectedProvider,
  };
}
