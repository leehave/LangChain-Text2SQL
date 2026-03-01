import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { MemoryService } from './memory.service';
import { MemoryRecord } from './entities/memory-record.entity';

interface StoreMemoryDto {
  key: string;
  value: string;
  category?: string;
  metadata?: Record<string, any>;
  ttlInSeconds?: number;
}

interface UpdateMemoryDto {
  value?: string;
  metadata?: Record<string, any>;
  ttlInSeconds?: number;
}

@Controller('api/memory')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Post()
  async store(@Body() dto: StoreMemoryDto): Promise<MemoryRecord> {
    try {
      return await this.memoryService.store(
        dto.key,
        dto.value,
        dto.category,
        dto.metadata,
        dto.ttlInSeconds
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to store memory';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':key')
  async retrieve(@Param('key') key: string): Promise<MemoryRecord | null> {
    try {
      return await this.memoryService.retrieve(key);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve memory';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':key')
  async update(
    @Param('key') key: string, 
    @Body() dto: UpdateMemoryDto
  ): Promise<MemoryRecord | null> {
    try {
      // For update, we need to retrieve first, then update
      const existing = await this.memoryService.retrieve(key);
      if (!existing) {
        throw new HttpException('Memory record not found', HttpStatus.NOT_FOUND);
      }

      // Update the record
      const updated = await this.memoryService.store(
        key,
        dto.value ?? existing.value,
        existing.category,
        dto.metadata ?? existing.metadata,
        dto.ttlInSeconds
      );

      return updated;
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.NOT_FOUND) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to update memory';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':key')
  async delete(@Param('key') key: string): Promise<{ success: boolean }> {
    try {
      const deleted = await this.memoryService.delete(key);
      return { success: deleted };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete memory';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('category/:category')
  async getByCategory(
    @Param('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50
  ): Promise<{ records: MemoryRecord[]; total: number }> {
    try {
      page = Number(page) || 1;
      limit = Number(limit) || 50;
      
      const records = await this.memoryService.getByCategory(category);
      return { records, total: records.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get memory records by category';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('search/:pattern')
  async search(
    @Param('pattern') pattern: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50
  ): Promise<{ records: MemoryRecord[]; total: number }> {
    try {
      page = Number(page) || 1;
      limit = Number(limit) || 50;
      
      // Note: Since we're using LIKE operator, we'll use the pattern as is
      const records = await this.memoryService.searchByKeyPattern(pattern);
      return { records, total: records.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search memory records';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get()
  async getAll(
    @Query('category') category?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50
  ): Promise<{ records: MemoryRecord[]; total: number }> {
    try {
      page = Number(page) || 1;
      limit = Number(limit) || 50;
      
      return await this.memoryService.getAll(category, page, limit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get all memory records';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('cleanup')
  async cleanup(): Promise<{ cleanedUp: number }> {
    try {
      const cleanedUp = await this.memoryService.cleanupExpired();
      return { cleanedUp };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clean up expired records';
      throw new HttpException(
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}