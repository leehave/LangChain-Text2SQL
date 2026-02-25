import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { LLMProvider, ModelProviderType } from '../interfaces/llm-provider.interface';
import { DeepSeekProvider } from './deepseek.provider';
import { OllamaProvider } from './ollama.provider';
import { OpenAICompatibleProvider } from './openai-compatible.provider';

@Injectable()
export class ProviderFactory {
  constructor(private configService: ConfigService) {}

  createProvider(providerType?: ModelProviderType): LLMProvider {
    const type = providerType || this.configService.get<ModelProviderType>('MODEL_PROVIDER', 'deepseek');

    switch (type) {
      case 'deepseek':
        return new DeepSeekProvider(this.configService);
      case 'ollama':
        return new OllamaProvider(this.configService);
      case 'openai-compatible':
        return new OpenAICompatibleProvider(this.configService);
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  getAvailableProviders(): Array<{ type: ModelProviderType; name: string }> {
    return [
      { type: 'deepseek', name: 'DeepSeek (Remote API)' },
      { type: 'ollama', name: 'Ollama (Local)' },
      { type: 'openai-compatible', name: 'OpenAI Compatible (Local)' },
    ];
  }
}
