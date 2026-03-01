import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ChatModule } from './chat/chat.module';
import { UploadModule } from './upload/upload.module';
import { SkillsModule } from './skills/skills.module';
import { MemoryModule } from './memory/memory.module';
import { IntegrationsModule } from './integrations/integrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: './memory.db',
      synchronize: true, // Note: Use migrations in production
      logging: false,
      entities: [join(__dirname, '**', '*.entity.{js,ts}')],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    ChatModule,
    UploadModule,
    SkillsModule,
    MemoryModule,
    IntegrationsModule,
  ],
})
export class AppModule {}
