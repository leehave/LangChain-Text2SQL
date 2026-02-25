import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { HistoryService } from './history.service';
import { LlmService } from './llm.service';
import { ProviderFactory } from './providers/provider.factory';

@Module({
  controllers: [ChatController],
  providers: [ChatService, HistoryService, LlmService, ProviderFactory],
})
export class ChatModule {}
