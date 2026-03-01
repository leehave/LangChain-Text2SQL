import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Like } from 'typeorm';
import { MemoryRecord } from './entities/memory-record.entity';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    @InjectRepository(MemoryRecord)
    private memoryRecordRepository: Repository<MemoryRecord>,
  ) {}

  /**
   * Store a value in memory with optional metadata and expiration
   */
  async store(
    key: string, 
    value: string, 
    category?: string, 
    metadata?: Record<string, any>, 
    ttlInSeconds?: number
  ): Promise<MemoryRecord> {
    const record = new MemoryRecord();
    record.key = key;
    record.value = value;
    record.category = category;
    record.metadata = metadata;

    if (ttlInSeconds) {
      const now = new Date();
      record.expiresAt = new Date(now.getTime() + ttlInSeconds * 1000);
    }

    const savedRecord = await this.memoryRecordRepository.save(record);
    this.logger.log(`Stored memory record with key: ${key}`);

    return savedRecord;
  }

  /**
   * Retrieve a value from memory by key
   */
  async retrieve(key: string): Promise<MemoryRecord | null> {
    const now = new Date();
    const record = await this.memoryRecordRepository.findOne({
      where: {
        key,
        expiresAt: MoreThanOrEqual(now), // Only return non-expired records
      },
    });

    if (!record) {
      this.logger.log(`Memory record not found for key: ${key} or expired`);
      return null;
    }

    return record;
  }

  /**
   * Get all records by category
   */
  async getByCategory(category: string): Promise<MemoryRecord[]> {
    const now = new Date();
    return await this.memoryRecordRepository.find({
      where: {
        category,
        expiresAt: MoreThanOrEqual(now), // Only return non-expired records
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Search records by partial key match
   */
  async searchByKeyPattern(pattern: string): Promise<MemoryRecord[]> {
    const now = new Date();
    return await this.memoryRecordRepository.find({
      where: {
        key: Like(`%${pattern}%`),
        expiresAt: MoreThanOrEqual(now), // Only return non-expired records
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Delete a record by key
   */
  async delete(key: string): Promise<boolean> {
    const result = await this.memoryRecordRepository.delete({ key });
    const affected = result.affected ?? 0;
    const deleted = affected > 0;
    
    if (deleted) {
      this.logger.log(`Deleted memory record with key: ${key}`);
    } else {
      this.logger.log(`Memory record not found for deletion with key: ${key}`);
    }

    return deleted;
  }

  /**
   * Clean up expired records
   */
  async cleanupExpired(): Promise<number> {
    const now = new Date();
    const result = await this.memoryRecordRepository.delete({
      expiresAt: LessThanOrEqual(now),
    });

    const deletedCount = result.affected || 0;
    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} expired memory records`);
    }

    return deletedCount;
  }

  /**
   * Get all records (with pagination and filtering options)
   */
  async getAll(
    category?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ records: MemoryRecord[]; total: number }> {
    const whereCondition: any = {};
    if (category) {
      whereCondition.category = category;
    }

    const [records, total] = await this.memoryRecordRepository.findAndCount({
      where: whereCondition,
      order: {
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { records, total };
  }
}