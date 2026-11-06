import test from 'node:test';
import assert from 'node:assert/strict';
import { createWebpEncoder } from '../src/image-encoding.js';

test('Safari-style PNG output uses the bundled encoder instead of rejecting the photo', async () => {
  let nativeCalls = 0;
  const qualities = [];
  const expected = new Blob(['encoded pixels'], { type: 'image/webp' });
  const encode = createWebpEncoder({
    native: async () => { nativeCalls++; return new Blob([new Uint8Array(2 * 1024 * 1024)], { type: 'image/png' }); },
    portable: async (_, quality) => { qualities.push(quality); return expected; },
  });
  for (const quality of [0.9, 0.86, 0.82]) assert.equal(await encode({}, quality), expected);
  assert.equal(nativeCalls, 1, 'unsupported native encoding is not repeated for each compression attempt');
  assert.deepEqual(qualities, [0.9, 0.86, 0.82]);
});

test('native encoder exceptions and null blobs still allow automatic WebP encoding', async () => {
  for (const native of [async () => { throw Error('NotSupportedError'); }, async () => null]) {
    const encode = createWebpEncoder({ native, portable: async () => new Blob(['pixels'], { type: 'image/webp' }) });
    assert.equal((await encode({}, 0.9)).type, 'image/webp');
  }
});

test('browsers with native WebP do not load the portable codec', async () => {
  const encode = createWebpEncoder({
    native: async () => new Blob(['pixels'], { type: 'image/webp' }),
    portable: async () => { throw Error('unnecessary codec download'); },
  });
  assert.equal((await encode({}, 0.9)).type, 'image/webp');
});

test('failed codec loads can be retried and invalid results cannot reach Storage', async () => {
  let attempts = 0;
  const encode = createWebpEncoder({
    native: async () => new Blob(['png'], { type: 'image/png' }),
    portable: async () => { if (!attempts++) throw Error('offline'); return new Blob(['pixels'], { type: 'image/webp' }); },
  });
  await assert.rejects(encode({}, 0.9), /offline/);
  assert.equal((await encode({}, 0.9)).type, 'image/webp');
  for (const blob of [null, new Blob([], { type: 'image/webp' }), new Blob(['png'], { type: 'image/png' })]) {
    const invalid = createWebpEncoder({ native: async () => null, portable: async () => blob });
    await assert.rejects(invalid({}, 0.9), /diproses/);
  }
});
