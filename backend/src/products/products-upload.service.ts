import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

/** Kiruvchi base64 — JSON body limiti bilan mos */
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIM = 1280;
const MAX_OUTPUT_BYTES = 900 * 1024;

@Injectable()
export class ProductsUploadService {
  private readonly logger = new Logger(ProductsUploadService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = join(process.cwd(), 'uploads', 'products');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveDataUrl(dataUrl: string) {
    const match = dataUrl.match(/^data:(image\/[a-z0-9+.-]+);base64,(.+)$/i);
    if (!match) throw new BadRequestException('Invalid image data');

    const mime = match[1].toLowerCase();
    let buffer = Buffer.from(match[2], 'base64');

    if (buffer.length === 0) {
      throw new BadRequestException('Empty image data');
    }
    if (buffer.length > MAX_INPUT_BYTES) {
      throw new BadRequestException('Image too large');
    }

    const compressed = await this.compressBuffer(buffer, mime);
    const output = Buffer.from(compressed.buffer);

    const safeName = `${uuidv4()}${compressed.ext}`;
    writeFileSync(join(this.uploadDir, safeName), output);

    const url = `/uploads/products/${safeName}`;
    const baseUrl = this.config.get('PUBLIC_URL', 'http://localhost:3000');
    return {
      url,
      fullUrl: `${baseUrl}${url}`,
      mimeType: compressed.mimeType,
      fileSize: output.length,
    };
  }

  private async compressBuffer(
    input: Buffer,
    mime: string,
  ): Promise<{ buffer: Buffer; ext: string; mimeType: string }> {
    try {
      const meta = await sharp(input).metadata();
      let pipeline = sharp(input).rotate();

      if (
        (meta.width ?? 0) > MAX_IMAGE_DIM ||
        (meta.height ?? 0) > MAX_IMAGE_DIM
      ) {
        pipeline = pipeline.resize(MAX_IMAGE_DIM, MAX_IMAGE_DIM, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      let quality = 85;
      let buffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();

      while (buffer.length > MAX_OUTPUT_BYTES && quality > 45) {
        quality -= 10;
        buffer = await sharp(input)
          .rotate()
          .resize(MAX_IMAGE_DIM, MAX_IMAGE_DIM, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
      }

      return { buffer, ext: '.jpg', mimeType: 'image/jpeg' };
    } catch (e) {
      this.logger.warn('Product image compression failed, saving original', e);
      if (input.length > MAX_OUTPUT_BYTES) {
        throw new BadRequestException('Image could not be compressed');
      }
      const ext = mime.includes('png') ? '.png' : mime.includes('webp') ? '.webp' : '.jpg';
      return { buffer: input, ext, mimeType: mime };
    }
  }
}
