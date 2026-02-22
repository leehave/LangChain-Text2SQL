import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { generateId } from '@chatbot/shared';

@Controller('api')
export class UploadController {
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${uniqueSuffix}-${file.originalname}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowedTypes = [
          'text/plain',
          'text/markdown',
          'application/pdf',
          'application/json',
          'text/csv',
          'text/javascript',
          'text/typescript',
          'text/html',
          'text/css',
        ];

        const allowedExtensions = [
          '.txt',
          '.md',
          '.pdf',
          '.json',
          '.csv',
          '.js',
          '.ts',
          '.html',
          '.css',
          '.py',
          '.java',
          '.cpp',
          '.c',
          '.go',
          '.rs',
        ];

        const ext = extname(file.originalname).toLowerCase();

        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error('File type not allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
      }

      return {
        success: true,
        file: {
          id: generateId(),
          name: file.originalname,
          type: file.mimetype,
          size: file.size,
          url: `/uploads/${file.filename}`,
        },
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Upload failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
