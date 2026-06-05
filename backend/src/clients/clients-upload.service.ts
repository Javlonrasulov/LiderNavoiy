import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const ALLOWED_IMAGE = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_UPLOAD = 8 * 1024 * 1024;

@Injectable()
export class ClientsUploadService {
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = join(process.cwd(), 'uploads', 'clients');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async savePhoto(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    if (file.size > MAX_UPLOAD) {
      throw new BadRequestException('File too large (max 8MB)');
    }

    const ext = extname(file.originalname).toLowerCase();
    const isImage =
      ALLOWED_IMAGE.includes(ext) || file.mimetype.startsWith('image/');
    if (!isImage) {
      throw new BadRequestException('Only image files are allowed');
    }

    let buffer = file.buffer;
    let outExt = '.webp';
    let mimeType = 'image/webp';

    if (file.mimetype !== 'image/gif') {
      buffer = await sharp(buffer)
        .rotate()
        .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } else {
      outExt = '.gif';
      mimeType = 'image/gif';
    }

    const safeName = `${uuidv4()}${outExt}`;
    writeFileSync(join(this.uploadDir, safeName), buffer);

    const url = `/uploads/clients/${safeName}`;
    const baseUrl = this.config.get('PUBLIC_URL', 'http://localhost:3000');
    return {
      url,
      fullUrl: `${baseUrl}${url}`,
      mimeType,
      fileSize: buffer.length,
    };
  }
}
