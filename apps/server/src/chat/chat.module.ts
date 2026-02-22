import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { HistoryService } from './history.service';
import { LlmService } from './llm.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, HistoryService, LlmService],
})
export class ChatModule {}
