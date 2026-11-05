import { optimizeInContext } from './image-optimizer.js';

self.onmessage = async ({ data: file }) => {
  try {
    self.postMessage({ blob: await optimizeInContext(file) });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
