import { optimizeInContext, validatePhoto } from './image-optimizer.js';

export async function optimizePhoto(file) {
  validatePhoto(file);
  if (typeof Worker === 'function' && typeof OffscreenCanvas === 'function' && typeof createImageBitmap === 'function') {
    let worker;
    try {
      return await new Promise((resolve, reject) => {
        worker = new Worker(new URL('./image-worker.js', import.meta.url), { type: 'module' });
        worker.onmessage = ({ data }) => data.blob ? resolve(data.blob) : reject(Error(data.error || 'Foto gagal diproses.'));
        worker.onerror = event => { event.preventDefault(); reject(Error('Foto gagal diproses.')); };
        worker.postMessage(file);
      });
    } catch {
      // Worker creation/codec support varies on mobile. Retry with native main-thread APIs.
    } finally {
      worker?.terminate();
    }
  }
  return optimizeInContext(file);
}
