import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemoryRecord } from './entities/memory-record.entity';
import { MemoryService } from './memory.service';
import { MemoryController } from './memory.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MemoryRecord]),
  ],
  providers: [
    MemoryService,
  ],
  controllers: [
    MemoryController,
  ],
  exports: [
    MemoryService,
  ],
})
export class MemoryModule {}