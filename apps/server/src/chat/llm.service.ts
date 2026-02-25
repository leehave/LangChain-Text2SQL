import { Injectable } from '@nestjs/common';
import type { ChatMessage } from '@chatbot/shared';
import type { StreamCallbacks } from './interfaces/llm-provider.interface';
import type { ModelProviderType } from './interfaces/llm-provider.interface';
import { ProviderFactory } from './providers/provider.factory';

@Injectable()
export class LlmService {
  constructor(private providerFactory: ProviderFactory) {}

  async streamChat(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    providerType?: ModelProviderType,
  ): Promise<void> {
    const provider = this.providerFactory.createProvider(providerType);
    await provider.streamChat(messages, callbacks);
  }

  async chat(messages: ChatMessage[], providerType?: ModelProviderType): Promise<string> {
    const provider = this.providerFactory.createProvider(providerType);
    return await provider.chat(messages);
  }

  getAvailableProviders() {
    return this.providerFactory.getAvailableProviders();
  }
}
