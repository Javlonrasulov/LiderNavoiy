import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { assertAllowedUpload } from '../common/upload-allowlist';

const MAX_UPLOAD = 8 * 1024 * 1024;

@Injectable()
export class ClientsUploadService {
  private readonly logger = new Logger(ClientsUploadService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = join(process.cwd(), 'uploads', 'clients');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async savePhoto(file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('File is required');
    if (file.size > MAX_UPLOAD || file.buffer.length > MAX_UPLOAD) {
      throw new BadRequestException('File too large (max 8MB)');
    }

    assertAllowedUpload(file, { imagesOnly: true });

    let buffer = file.buffer;
    try {
      buffer = await sharp(file.buffer)
        .rotate()
        .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 78 })
        .toBuffer();
    } catch (e) {
      // sharp Alpine/musl da ba’zan yiqiladi — original JPEG/PNG ni saqlaymiz
      this.logger.warn(`Client photo compress failed, saving original: ${(e as Error).message}`);
      buffer = file.buffer;
    }

    if (!buffer.length) throw new BadRequestException('Processed image is empty');

    const safeName = `${uuidv4()}.jpg`;
    writeFileSync(join(this.uploadDir, safeName), buffer);

    const url = `/uploads/clients/${safeName}`;
    const baseUrl = this.config.get('PUBLIC_URL', 'http://localhost:3000');
    return {
      url,
      fullUrl: `${baseUrl}${url}`,
      mimeType: 'image/jpeg',
      fileSize: buffer.length,
    };
  }
}
