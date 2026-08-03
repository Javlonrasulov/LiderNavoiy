import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { assertAllowedUpload } from '../common/upload-allowlist';

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

    assertAllowedUpload(file, { imagesOnly: true });

    const buffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();

    const outExt = '.jpg';
    const mimeType = 'image/jpeg';
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
