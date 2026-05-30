import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_IMAGE = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_DOC = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.zip', '.rar'];
const MAX_SIZE = 20 * 1024 * 1024;

@Injectable()
export class MessagesUploadService {
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = join(process.cwd(), 'uploads', 'chat');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  saveFile(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    if (file.size > MAX_SIZE) throw new BadRequestException('File too large (max 20MB)');

    const ext = extname(file.originalname).toLowerCase();
    const isImage = ALLOWED_IMAGE.includes(ext) || file.mimetype.startsWith('image/');
    const isDoc =
      ALLOWED_DOC.includes(ext) ||
      file.mimetype.startsWith('application/') ||
      file.mimetype.startsWith('text/');

    if (!isImage && !isDoc) {
      throw new BadRequestException('Unsupported file type');
    }

    const safeName = `${uuidv4()}${ext}`;
    const diskPath = join(this.uploadDir, safeName);
    writeFileSync(diskPath, file.buffer);

    const url = `/uploads/chat/${safeName}`;
    const baseUrl = this.config.get('PUBLIC_URL', 'http://localhost:3000');

    return {
      url,
      fullUrl: `${baseUrl}${url}`,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      messageType: isImage ? ('image' as const) : ('document' as const),
    };
  }
}
