import { useCallback, useEffect } from 'react';
import { generateId } from '@chatbot/shared';
import type { ChatMessage, Attachment, Conversation } from '@chatbot/shared';
import { useChatStore } from '../stores/chatStore';
import { sendChatMessage, getConversations, deleteConversation as apiDeleteConversation, getProviders, getConversation } from '../services/api';

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
    addConversation,
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

      // For existing conversations, add user message immediately
      // For new conversations, user message will be added when we fetch the conversation from server
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
          async (convId, message) => {
            // Check if conversation exists in local state
            const conversationExists = conversations.some((c) => c.id === convId);
            
            if (!conversationExists) {
              // Fetch the new conversation from server
              try {
                const conversation = await getConversation(convId);
                addConversation(conversation);
              } catch (error) {
                console.error('Failed to fetch new conversation:', error);
                // Fallback: create a minimal conversation object
                const newConversation: Conversation = {
                  id: convId,
                  title: message.content.slice(0, 50) || 'New Conversation',
                  messages: [message],
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };
                addConversation(newConversation);
              }
            } else {
              // For existing conversations, refresh from server to get the updated messages
              // Backend has already added the message, we just need to sync
              try {
                const conversation = await getConversation(convId);
                // Update the conversation in the list
                const updatedConversations = conversations.map((c) =>
                  c.id === convId ? conversation : c
                );
                setConversations(updatedConversations);
              } catch (error) {
                console.error('Failed to refresh conversation:', error);
              }
            }
            
            if (!currentConversationId) {
              setCurrentConversationId(convId);
            }
            
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
      conversations,
      addConversation,
      setConversations,
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
