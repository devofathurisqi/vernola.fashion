const processingError = 'Foto belum berhasil diproses. Periksa koneksi lalu coba unggah kembali.';

async function nativeEncode(canvas, quality) {
  return typeof canvas.convertToBlob === 'function'
    ? canvas.convertToBlob({ type: 'image/webp', quality })
    : new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
}

async function portableEncode(canvas, quality) {
  // Lazy, same-origin codec: Safari can display WebP while being unable to encode it.
  let encodeWebp;
  try {
    ({ encodeWebp } = await import('./image-webp-fallback.js'));
  } catch {
    throw Error('Optimasi foto belum dapat dimuat. Periksa koneksi lalu muat ulang dashboard.');
  }
  return encodeWebp(canvas, quality);
}

export function createWebpEncoder({ native = nativeEncode, portable = portableEncode } = {}) {
  let nativeSupported = true;
  return async (canvas, quality) => {
    if (nativeSupported) {
      try {
        const blob = await native(canvas, quality);
        if (blob?.size && blob.type === 'image/webp') return blob;
      } catch {
        // Some browsers expose the API but cannot export this format.
      }
      // Do not repeatedly create oversized PNGs at every quality/resolution attempt.
      nativeSupported = false;
    }
    const blob = await portable(canvas, quality);
    if (!blob?.size || blob.type !== 'image/webp') throw Error(processingError);
    return blob;
  };
}

export const encodeWebp = createWebpEncoder();
