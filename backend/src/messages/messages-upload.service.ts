import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { assertAllowedUpload } from '../common/upload-allowlist';

const MAX_UPLOAD = 10 * 1024 * 1024;
const MAX_DOC = 5 * 1024 * 1024;
const MAX_IMAGE_DIM = 1280;
const JPEG_QUALITY = 78;
const SKIP_COMPRESS_BELOW = 250 * 1024;

@Injectable()
export class MessagesUploadService {
  private readonly logger = new Logger(MessagesUploadService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = join(process.cwd(), 'uploads', 'chat');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    if (file.size > MAX_UPLOAD) {
      throw new BadRequestException('File too large (max 10MB)');
    }

    const allowed = assertAllowedUpload(file);
    if (!allowed.isImage && file.size > MAX_DOC) {
      throw new BadRequestException('Document too large (max 5MB)');
    }

    let buffer = file.buffer;
    let outExt = allowed.ext;
    let mimeType = allowed.mime;
    let outName = file.originalname;

    if (allowed.isImage) {
      const compressed = await this.compressImage(buffer, file.size);
      buffer = compressed.buffer;
      outExt = compressed.ext;
      mimeType = compressed.mimeType;
      outName = this.withExtension(file.originalname, outExt);
    }

    const safeName = `${uuidv4()}${outExt}`;
    const diskPath = join(this.uploadDir, safeName);
    writeFileSync(diskPath, buffer);

    const url = `/uploads/chat/${safeName}`;
    const baseUrl = this.config.get('PUBLIC_URL', 'http://localhost:3000');

    return {
      url,
      fullUrl: `${baseUrl}${url}`,
      fileName: outName,
      mimeType,
      fileSize: buffer.length,
      messageType: allowed.isImage ? ('image' as const) : ('document' as const),
    };
  }

  private async compressImage(
    input: Buffer,
    originalSize: number,
  ): Promise<{ buffer: Buffer; ext: string; mimeType: string }> {
    try {
      const meta = await sharp(input).metadata();
      const fmt = meta.format ?? 'jpeg';

      if (originalSize <= SKIP_COMPRESS_BELOW) {
        const ext =
          fmt === 'jpeg' ? '.jpg' : fmt === 'png' ? '.png' : fmt === 'webp' ? '.webp' : '.jpg';
        const mimeType = fmt === 'jpeg' ? 'image/jpeg' : `image/${fmt}`;
        return { buffer: input, ext, mimeType };
      }

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

      // Store as jpg/png only (webp not in TZ allowlist for original upload;
      // compressed storage may use webp — keep jpg for strict allowlist compliance)
      const buffer = await pipeline.jpeg({ quality: JPEG_QUALITY }).toBuffer();
      return { buffer, ext: '.jpg', mimeType: 'image/jpeg' };
    } catch (e) {
      this.logger.warn('Image compression failed, saving original', e);
      return { buffer: input, ext: '.jpg', mimeType: 'image/jpeg' };
    }
  }

  private withExtension(name: string, ext: string): string {
    const base = name.replace(/\.[^.]+$/, '');
    return `${base}${ext}`;
  }
}
