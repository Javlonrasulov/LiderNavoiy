export interface CompressOptions {
  maxDimension?: number;
  maxBytes?: number;
  minQuality?: number;
  minDimension?: number;
}

const PRODUCT_PRESET: Required<CompressOptions> = {
  maxDimension: 1024,
  maxBytes: 512 * 1024,
  minQuality: 0.42,
  minDimension: 320,
};

const CATEGORY_PRESET: Required<CompressOptions> = {
  maxDimension: 512,
  maxBytes: 256 * 1024,
  minQuality: 0.45,
  minDimension: 200,
};

function dataUrlByteSize(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return dataUrl.length;
  const b64 = dataUrl.slice(comma + 1);
  return Math.ceil((b64.length * 3) / 4);
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

function drawScaled(img: HTMLImageElement, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height, 1));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL('image/jpeg', quality);
}

async function compressLoadedImage(
  img: HTMLImageElement,
  opts: Required<CompressOptions>,
): Promise<string> {
  let dimension = opts.maxDimension;
  let quality = 0.85;

  while (dimension >= opts.minDimension) {
    const canvas = drawScaled(img, dimension);
    let q = quality;
    while (q >= opts.minQuality) {
      const dataUrl = canvasToJpeg(canvas, q);
      if (dataUrlByteSize(dataUrl) <= opts.maxBytes) return dataUrl;
      q -= 0.07;
    }
    dimension = Math.round(dimension * 0.72);
    quality = 0.8;
  }

  const canvas = drawScaled(img, opts.minDimension);
  return canvasToJpeg(canvas, opts.minQuality);
}

function mergeOptions(options?: CompressOptions): Required<CompressOptions> {
  return { ...PRODUCT_PRESET, ...options };
}

/** Faylni maqsadli hajmga kichraytiradi (katta rasmlar ham qabul qilinadi) */
export async function compressImageFile(
  file: File,
  options?: CompressOptions,
): Promise<string> {
  const img = await loadImageFromFile(file);
  return compressLoadedImage(img, mergeOptions(options));
}

/** Mahsulot rasmi — 1024px, ~512 KB */
export function compressProductImage(file: File): Promise<string> {
  return compressImageFile(file, PRODUCT_PRESET);
}

/** Kategoriya rasmi — 512px, ~256 KB */
export function compressCategoryImage(file: File): Promise<string> {
  return compressImageFile(file, CATEGORY_PRESET);
}

/** Base64 data URL hajmi katta bo'lsa qayta siqadi */
export async function compressDataUrlIfNeeded(
  dataUrl: string,
  options?: CompressOptions,
): Promise<string> {
  if (!dataUrl.startsWith('data:')) return dataUrl;
  const opts = mergeOptions(options);
  if (dataUrlByteSize(dataUrl) <= opts.maxBytes) return dataUrl;
  const img = await loadImageFromDataUrl(dataUrl);
  return compressLoadedImage(img, opts);
}

/** @deprecated compressImageFile yoki compressProductImage ishlating */
export async function compressImage(
  file: File,
  maxSize = 512,
  quality = 0.78,
): Promise<string> {
  return compressImageFile(file, {
    maxDimension: maxSize,
    maxBytes: 400 * 1024,
    minQuality: Math.min(quality, 0.5),
  });
}
