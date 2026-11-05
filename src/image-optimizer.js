import { imageDimensions } from './image-metadata.js';

// Storage accepts 1 MiB WebP; this is an OUTPUT budget, never an input-file limit.
export const PHOTO_MAX_BYTES = 1024 * 1024;
export const PHOTO_MAX_EDGE = 2048;
const qualities = [0.9, 0.86, 0.82];
const processingError = 'Foto gagal diproses. Coba unggah kembali atau gunakan browser terbaru.';
const formatError = 'Foto tidak dapat dibaca. Gunakan file JPG, PNG, atau WebP yang valid.';

export function photoSize(width, height, edge = PHOTO_MAX_EDGE) {
  const scale = Math.min(1, edge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function validatePhoto(file) {
  // Mobile file pickers sometimes leave MIME empty. Decode still validates the contents.
  if (!file || !file.size || !(['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name || '')))) throw Error(formatError);
}

async function decodePhoto(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const size = await imageDimensions(file);
      const options = { imageOrientation: 'from-image', resizeQuality: 'high' };
      // One axis preserves aspect ratio, including browser-applied EXIF rotation.
      if (size) {
        const axis = size.width >= size.height ? 'resizeWidth' : 'resizeHeight';
        options[axis] = Math.min(PHOTO_MAX_EDGE, Math.max(size.width, size.height));
      }
      return await createImageBitmap(file, options);
    } catch {
      // Older Safari versions need the HTML image decoder below.
    }
  }
  if (typeof Image === 'undefined') throw Error(formatError);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight,
      close() { image.src = ''; URL.revokeObjectURL(url); } };
  } catch {
    URL.revokeObjectURL(url);
    throw Error(formatError);
  }
}

function makeCanvas(width, height) {
  if (typeof OffscreenCanvas === 'function' && typeof OffscreenCanvas.prototype.convertToBlob === 'function') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  Object.assign(canvas, { width, height });
  return canvas;
}

async function encodeWebp(canvas, quality) {
  const blob = typeof canvas.convertToBlob === 'function'
    ? await canvas.convertToBlob({ type: 'image/webp', quality })
    : await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
  if (!blob?.size) throw Error(processingError);
  // Unsupported encoders silently return PNG. Never mislabel it as WebP on upload.
  if (blob.type !== 'image/webp') throw Error('Browser ini belum mendukung optimasi foto. Gunakan Chrome, Edge, Firefox, atau Safari terbaru.');
  return blob;
}

export async function optimizeInContext(file, { decode = decodePhoto, canvasFactory = makeCanvas, encode = encodeWebp } = {}) {
  validatePhoto(file);
  let image, canvas;
  try {
    image = await decode(file);
    if (!(image.width > 0 && image.height > 0)) throw Error(formatError);
    let { width, height } = photoSize(image.width, image.height);
    canvas = canvasFactory(width, height);
    while (true) {
      Object.assign(canvas, { width, height });
      const context = canvas.getContext('2d');
      if (!context) throw Error(processingError);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      // Always resample the decoded image, avoiding cumulative compression artifacts.
      context.drawImage(image.source || image, 0, 0, width, height);
      let blob;
      for (const quality of qualities) {
        blob = await encode(canvas, quality);
        if (!blob?.size || blob.type !== 'image/webp') throw Error(processingError);
        if (blob.size <= PHOTO_MAX_BYTES) return blob;
      }
      if (width === 1 && height === 1) throw Error(processingError);
      const scale = Math.min(0.9, Math.max(0.5, Math.sqrt(PHOTO_MAX_BYTES / blob.size) * 0.95));
      width = Math.max(1, Math.floor(width * scale));
      height = Math.max(1, Math.floor(height * scale));
    }
  } finally {
    image?.close?.();
    if (canvas) Object.assign(canvas, { width: 1, height: 1 });
  }
}
