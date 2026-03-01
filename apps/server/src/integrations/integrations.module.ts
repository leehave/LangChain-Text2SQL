import { Module } from '@nestjs/common';
import { MemoryModule } from '../memory/memory.module';
import { SkillsModule } from '../skills/skills.module';
import { ChatService } from '../chat/chat.service';
import { HistoryService } from '../chat/history.service';
import { LlmService } from '../chat/llm.service';
import { ProviderFactory } from '../chat/providers/provider.factory';
import { MemoryIntegrationService } from './memory-integration.service';

@Module({
  imports: [
    MemoryModule,
    SkillsModule,
  ],
  providers: [
    ChatService,
    HistoryService,
    LlmService,
    ProviderFactory,
    MemoryIntegrationService,
  ],
  exports: [
    MemoryIntegrationService,
  ],
})
export class IntegrationsModule {}