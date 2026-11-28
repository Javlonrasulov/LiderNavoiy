import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  unlinkSync,
  writeFileSync,
  statSync,
} from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

const AUDIO_MAGIC: Array<{
  mime: string;
  ext: string;
  check: (b: Buffer) => boolean;
}> = [
  {
    mime: 'audio/mp4',
    ext: '.m4a',
    check: (b) =>
      b.length > 12 &&
      b.slice(4, 8).toString('ascii') === 'ftyp',
  },
  {
    mime: 'audio/mpeg',
    ext: '.mp3',
    check: (b) =>
      (b.length > 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0) ||
      (b.length > 3 && b.slice(0, 3).toString('ascii') === 'ID3'),
  },
  {
    mime: 'audio/ogg',
    ext: '.ogg',
    check: (b) => b.length > 4 && b.slice(0, 4).toString('ascii') === 'OggS',
  },
  {
    mime: 'audio/webm',
    ext: '.webm',
    check: (b) =>
      b.length > 4 &&
      b[0] === 0x1a &&
      b[1] === 0x45 &&
      b[2] === 0xdf &&
      b[3] === 0xa3,
  },
  {
    mime: 'audio/aac',
    ext: '.aac',
    check: (b) => b.length > 2 && b[0] === 0xff && (b[1] & 0xf0) === 0xf0,
  },
  {
    mime: 'audio/3gpp',
    ext: '.3gp',
    check: (b) =>
      b.length > 12 &&
      (b.slice(4, 8).toString('ascii') === 'ftyp' ||
        b.slice(4, 8).toString('ascii') === '3gp4' ||
        b.slice(4, 8).toString('ascii') === '3gp5'),
  },
];

@Injectable()
export class RecordingUploadService {
  private readonly logger = new Logger(RecordingUploadService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = join(process.cwd(), 'uploads', 'recordings');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  detectAudio(buffer: Buffer): { mime: string; ext: string } {
    for (const m of AUDIO_MAGIC) {
      if (m.check(buffer)) return { mime: m.mime, ext: m.ext };
    }
    throw new BadRequestException('Audio file content not allowed');
  }

  saveAudio(
    file: Express.Multer.File,
    opts: { companyId: string | null; recordingId: string },
  ): { storageKey: string; fileSizeBytes: number; mimeType: string } {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Audio file is required');
    }
    if (file.size > MAX_AUDIO_BYTES || file.buffer.length > MAX_AUDIO_BYTES) {
      throw new BadRequestException('Audio too large (max 50MB)');
    }
    if (file.buffer.length < 64) {
      throw new BadRequestException('Audio file is empty or too small');
    }

    const detected = this.detectAudio(file.buffer);
    const companySeg = (opts.companyId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
    const dir = join(this.uploadDir, companySeg);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const safeName = `${opts.recordingId}-${uuidv4()}${detected.ext}`;
    const abs = join(dir, safeName);
    writeFileSync(abs, file.buffer);

    const storageKey = `recordings/${companySeg}/${safeName}`;
    this.logger.log(`Recording audio saved (${file.buffer.length} bytes)`);
    return {
      storageKey,
      fileSizeBytes: file.buffer.length,
      mimeType: detected.mime,
    };
  }

  resolveAbsolutePath(storageKey: string): string {
    if (!storageKey || storageKey.includes('..')) {
      throw new BadRequestException('Invalid storage key');
    }
    const full = join(process.cwd(), 'uploads', storageKey);
    if (!existsSync(full)) {
      throw new NotFoundException('Audio file not found');
    }
    return full;
  }

  openReadStream(storageKey: string): { stream: Readable; size: number; abs: string } {
    const abs = this.resolveAbsolutePath(storageKey);
    const size = statSync(abs).size;
    return { stream: createReadStream(abs), size, abs };
  }

  deleteFile(storageKey: string | null | undefined): boolean {
    if (!storageKey) return false;
    try {
      const abs = join(process.cwd(), 'uploads', storageKey);
      if (existsSync(abs)) {
        unlinkSync(abs);
        return true;
      }
    } catch (e) {
      this.logger.warn(`Failed to delete recording file: ${(e as Error).message}`);
    }
    return false;
  }
}
