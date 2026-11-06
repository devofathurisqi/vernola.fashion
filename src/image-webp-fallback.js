import createEncoder from '@jsquash/webp/codec/enc/webp_enc.js';
import wasmUrl from '@jsquash/webp/codec/enc/webp_enc.wasm?url';
import { defaultOptions } from '@jsquash/webp/meta.js';

let encoder;
async function loadEncoder() {
  if (!encoder) {
    // The non-SIMD, single-threaded build works without cross-origin isolation.
    encoder = createEncoder({ noInitialRun: true, locateFile: () => wasmUrl });
  }
  try {
    return await encoder;
  } catch {
    encoder = undefined; // A failed/offline download must not poison later retries.
    throw Error('Optimasi foto belum dapat dimuat. Periksa koneksi lalu coba unggah kembali.');
  }
}

export async function encodeWebp(canvas, quality) {
  const module = await loadEncoder();
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  const result = module.encode(pixels.data, pixels.width, pixels.height, {
    ...defaultOptions, quality: quality * 100, thread_level: 0, low_memory: 1,
  });
  if (!result?.byteLength) throw Error('Foto belum berhasil diproses. Coba unggah kembali.');
  return new Blob([result], { type: 'image/webp' });
}
