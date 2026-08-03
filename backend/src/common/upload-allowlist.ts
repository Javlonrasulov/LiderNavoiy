import { BadRequestException } from '@nestjs/common';

/** Shared upload allowlist — Security First TZ */

export const ALLOWED_UPLOAD_EXT = [
  '.jpg',
  '.jpeg',
  '.png',
  '.pdf',
  '.docx',
  '.xlsx',
] as const;

export const ALLOWED_UPLOAD_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const MAGIC: Array<{ mime: string; ext: string; check: (b: Buffer) => boolean }> = [
  {
    mime: 'image/jpeg',
    ext: '.jpg',
    check: (b) => b.length > 2 && b[0] === 0xff && b[1] === 0xd8,
  },
  {
    mime: 'image/png',
    ext: '.png',
    check: (b) =>
      b.length > 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47,
  },
  {
    mime: 'application/pdf',
    ext: '.pdf',
    check: (b) => b.length > 4 && b.slice(0, 4).toString('ascii') === '%PDF',
  },
  {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ext: '.docx',
    check: (b) => b.length > 3 && b[0] === 0x50 && b[1] === 0x4b,
  },
  {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ext: '.xlsx',
    check: (b) => b.length > 3 && b[0] === 0x50 && b[1] === 0x4b,
  },
];

export function detectUploadMagic(buffer: Buffer): { mime: string; ext: string } | null {
  for (const m of MAGIC) {
    if (m.check(buffer)) return { mime: m.mime, ext: m.ext };
  }
  return null;
}

export function assertAllowedUpload(
  file: Express.Multer.File,
  opts?: { imagesOnly?: boolean },
): { ext: string; mime: string; isImage: boolean } {
  const declaredExt = (file.originalname.match(/\.[^.]+$/)?.[0] || '').toLowerCase();
  const magic = detectUploadMagic(file.buffer);
  if (!magic) {
    throw new BadRequestException('File content not allowed');
  }

  let ext = magic.ext;
  let mime = magic.mime;
  if (magic.ext === '.docx' || magic.ext === '.xlsx') {
    if (declaredExt === '.xlsx') {
      ext = '.xlsx';
      mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (declaredExt === '.docx') {
      ext = '.docx';
      mime =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      throw new BadRequestException('docx/xlsx extension required');
    }
  }

  if (opts?.imagesOnly && ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') {
    throw new BadRequestException('Only jpg/jpeg/png images are allowed');
  }

  if (!(ALLOWED_UPLOAD_EXT as readonly string[]).includes(ext) && ext !== '.jpeg') {
    throw new BadRequestException('Unsupported file type');
  }

  const isImage = ext === '.jpg' || ext === '.jpeg' || ext === '.png';
  return { ext: ext === '.jpeg' ? '.jpg' : ext, mime, isImage };
}
