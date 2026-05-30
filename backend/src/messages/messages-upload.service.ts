import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const ALLOWED_IMAGE = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_DOC = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.zip', '.rar'];
const MAX_UPLOAD = 10 * 1024 * 1024;
const MAX_DOC = 5 * 1024 * 1024;
const MAX_IMAGE_DIM = 1280;
const WEBP_QUALITY = 80;
const SKIP_COMPRESS_BELOW = 200 * 1024;

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

    const ext = extname(file.originalname).toLowerCase();
    const isImage =
      ALLOWED_IMAGE.includes(ext) || file.mimetype.startsWith('image/');
    const isDoc =
      ALLOWED_DOC.includes(ext) ||
      file.mimetype.startsWith('application/') ||
      file.mimetype.startsWith('text/');

    if (!isImage && !isDoc) {
      throw new BadRequestException('Unsupported file type');
    }

    let buffer = file.buffer;
    let outExt = ext || (isImage ? '.jpg' : '.bin');
    let mimeType = file.mimetype;
    let outName = file.originalname;

    if (isImage && file.mimetype !== 'image/gif') {
      const compressed = await this.compressImage(buffer, file.size);
      buffer = compressed.buffer;
      outExt = compressed.ext;
      mimeType = compressed.mimeType;
      outName = this.withExtension(file.originalname, outExt);
    } else if (isImage && file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('GIF too large (max 2MB)');
    } else if (isDoc && file.size > MAX_DOC) {
      throw new BadRequestException('Document too large (max 5MB)');
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
      messageType: isImage ? ('image' as const) : ('document' as const),
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

      const buffer = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
      return { buffer, ext: '.webp', mimeType: 'image/webp' };
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
