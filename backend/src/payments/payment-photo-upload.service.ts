import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { assertAllowedUpload } from '../common/upload-allowlist';

const MAX_UPLOAD = 8 * 1024 * 1024;

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
    if (!file.buffer || file.buffer.length < 256) {
      throw new BadRequestException('File is empty or too small');
    }

    let buffer = file.buffer;
    // Sharp ixtiyoriy — Alpine/native xato bersa ham rasmni saqlaymiz
    try {
      const sharp = (await import('sharp')).default;
      let pipeline = sharp(buffer).rotate();
      const meta = await sharp(buffer).metadata();
      if (!meta.width || !meta.height || meta.width < 16 || meta.height < 16) {
        throw new BadRequestException('Invalid image dimensions');
      }
      const maxDim = 1280;
      if ((meta.width ?? 0) > maxDim || (meta.height ?? 0) > maxDim) {
        pipeline = pipeline.resize(maxDim, maxDim, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
      const out = await pipeline.jpeg({ quality: 80 }).toBuffer();
      if (out.length >= 256) buffer = out;
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      this.logger.warn(`Payment photo sharp skipped: ${(e as Error)?.message || e}`);
      try {
        assertAllowedUpload(file, { imagesOnly: true });
      } catch {
        // Magic tekshiruvi ham yiqilsa — JPEG SOI bo‘lsa qabul
        const b = file.buffer;
        const isJpeg = b.length > 2 && b[0] === 0xff && b[1] === 0xd8;
        const isPng =
          b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
        if (!isJpeg && !isPng) {
          throw new BadRequestException('Invalid image file');
        }
      }
      buffer = file.buffer;
    }

    const safeName = `${uuidv4()}.jpg`;
    try {
      writeFileSync(join(this.uploadDir, safeName), buffer);
    } catch (e) {
      this.logger.error(`Failed to write payment photo ${safeName}`, e);
      throw new BadRequestException('Could not save photo to disk');
    }
    const url = `/uploads/payments/${safeName}`;
    const baseUrl = this.config.get('PUBLIC_URL', 'http://localhost:3000');
    this.logger.log(`Payment photo saved ${safeName} (${buffer.length} bytes)`);
    return { url, fullUrl: `${baseUrl}${url}` };
  }

  /** JSON ichida base64 (multipart o‘rniga) */
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
    if (!buffer.length || buffer.length < 256) {
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
