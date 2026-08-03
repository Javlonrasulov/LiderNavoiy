import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { assertAllowedUpload } from '../common/upload-allowlist';

const MAX_UPLOAD = 8 * 1024 * 1024;
const MAX_DIM = 1280;

@Injectable()
export class PaymentPhotoUploadService {
  private readonly logger = new Logger(PaymentPhotoUploadService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = join(process.cwd(), 'uploads', 'payments');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    if (file.size > MAX_UPLOAD) {
      throw new BadRequestException('File too large (max 8MB)');
    }
    assertAllowedUpload(file, { imagesOnly: true });

    let buffer = file.buffer;
    try {
      let pipeline = sharp(buffer).rotate();
      const meta = await sharp(buffer).metadata();
      if ((meta.width ?? 0) > MAX_DIM || (meta.height ?? 0) > MAX_DIM) {
        pipeline = pipeline.resize(MAX_DIM, MAX_DIM, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
      buffer = await pipeline.jpeg({ quality: 80 }).toBuffer();
    } catch (e) {
      this.logger.warn('Payment photo compress failed', e);
    }

    const safeName = `${uuidv4()}.jpg`;
    writeFileSync(join(this.uploadDir, safeName), buffer);
    const url = `/uploads/payments/${safeName}`;
    const baseUrl = this.config.get('PUBLIC_URL', 'http://localhost:3000');
    return { url, fullUrl: `${baseUrl}${url}` };
  }
}
