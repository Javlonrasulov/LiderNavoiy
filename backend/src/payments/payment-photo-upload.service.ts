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
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }
    if (file.size > MAX_UPLOAD || file.buffer.length > MAX_UPLOAD) {
      throw new BadRequestException('File too large (max 8MB)');
    }
    if (file.buffer.length < 64) {
      throw new BadRequestException('File is empty or too small');
    }

    assertAllowedUpload(file, { imagesOnly: true });

    let buffer = file.buffer;
    try {
      let pipeline = sharp(buffer).rotate();
      const meta = await sharp(buffer).metadata();
      if (!meta.width || !meta.height || meta.width < 16 || meta.height < 16) {
        throw new BadRequestException('Invalid image dimensions');
      }
      if ((meta.width ?? 0) > MAX_DIM || (meta.height ?? 0) > MAX_DIM) {
        pipeline = pipeline.resize(MAX_DIM, MAX_DIM, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
      buffer = await pipeline.jpeg({ quality: 80 }).toBuffer();
      if (buffer.length < 64) {
        throw new BadRequestException('Processed image is empty');
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      // sharp ishlamasa — allaqachon allowlist dan o‘tgan originalni saqlaymiz
      this.logger.warn(`Payment photo compress failed, saving original: ${(e as Error).message}`);
      buffer = file.buffer;
    }

    const safeName = `${uuidv4()}.jpg`;
    writeFileSync(join(this.uploadDir, safeName), buffer);
    const url = `/uploads/payments/${safeName}`;
    const baseUrl = this.config.get('PUBLIC_URL', 'http://localhost:3000');
    this.logger.log(`Payment photo saved ${safeName} (${buffer.length} bytes)`);
    return { url, fullUrl: `${baseUrl}${url}` };
  }

  /** Agent APK: multipart o‘rniga JSON ichida base64 */
  async saveFromBase64(input: string): Promise<{ url: string; fullUrl: string }> {
    const raw = (input || '').trim();
    if (!raw) throw new BadRequestException('photoBase64 required');

    let buffer: Buffer;
    const dataUrl = raw.match(/^data:(image\/[a-z0-9+.-]+);base64,(.+)$/i);
    if (dataUrl) {
      buffer = Buffer.from(dataUrl[2], 'base64');
    } else {
      buffer = Buffer.from(raw.replace(/\s/g, ''), 'base64');
    }
    if (!buffer.length || buffer.length < 64) {
      throw new BadRequestException('photoBase64 empty or too small');
    }
    if (buffer.length > MAX_UPLOAD) {
      throw new BadRequestException('File too large (max 8MB)');
    }

    const file = {
      buffer,
      size: buffer.length,
      originalname: 'payment.jpg',
      mimetype: 'image/jpeg',
      fieldname: 'file',
      encoding: '7bit',
    } as Express.Multer.File;

    return this.saveFile(file);
  }
}
