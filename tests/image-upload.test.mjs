import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { imageDimensions } from '../src/image-metadata.js';
import { optimizeInContext, photoSize, validatePhoto, PHOTO_MAX_BYTES, PHOTO_MAX_EDGE } from '../src/image-optimizer.js';
import { optimizePhoto } from '../src/image-upload.js';

const file = (size = 100, type = 'image/jpeg', name = 'photo.jpg') => new File([new Uint8Array(size)], name, { type });
function harness({ width = 6000, height = 4000, encode } = {}) {
  const draws = [], calls = [];
  let closed = false, canvas;
  const image = { width, height, close() { closed = true; } };
  const dependencies = {
    decode: async () => image,
    canvasFactory: (width, height) => (canvas = { width, height, getContext: () => ({ drawImage(...args) { draws.push(args); } }) }),
    encode: async (canvas, quality) => {
      calls.push({ width: canvas.width, height: canvas.height, quality });
      return encode ? encode(canvas, quality) : new Blob([new Uint8Array(100)], { type: 'image/webp' });
    },
  };
  return { dependencies, draws, calls, image, get closed() { return closed; }, get canvas() { return canvas; } };
}

test('originals above the former 15 MB / 60 MP limits reach optimization', async () => {
  const original = file(16 * 1024 * 1024 + 1);
  const h = harness({ width: 10000, height: 8000 });
  const output = await optimizeInContext(original, h.dependencies);
  assert.equal(output.type, 'image/webp');
  assert.ok(output.size <= PHOTO_MAX_BYTES);
  assert.deepEqual(h.calls[0], { width: 2048, height: 1638, quality: 0.9 });
  assert.ok(h.closed);
});

test('there is no input byte ceiling and empty-MIME mobile photos are accepted', () => {
  assert.doesNotThrow(() => validatePhoto({ size: 8 * 1024 ** 3, type: 'image/png' }));
  assert.doesNotThrow(() => validatePhoto(file(100, '', 'PHOTO.JPEG')));
  for (const invalid of [file(0), file(10, 'application/pdf'), file(10, '', 'document.txt')]) assert.throws(() => validatePhoto(invalid), /JPG, PNG, atau WebP/);
});

test('a complex photo is automatically resized until it fits, keeping high quality', async () => {
  const h = harness({ width: 8000, height: 8000, encode: async (canvas) => ({ type: 'image/webp', size: Math.ceil(canvas.width * canvas.height * 0.65) }) });
  const output = await optimizeInContext(file(), h.dependencies);
  assert.ok(output.size <= PHOTO_MAX_BYTES);
  assert.ok(h.calls.length > 3, 'goes beyond the former three fixed quality attempts');
  assert.ok(h.calls.every(c => c.quality >= 0.82));
  assert.ok(h.calls.at(-1).width >= 1000, 'retains useful product detail');
  assert.ok(h.draws.every(args => args[0] === h.image), 'resamples the source instead of recompressing a previous output');
});

test('the highest quality that fits is retained without unnecessary shrinking', async () => {
  const h = harness();
  await optimizeInContext(file(), h.dependencies);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].quality, 0.9);
});

test('small images are not enlarged and extreme aspect ratios keep a nonzero canvas', () => {
  assert.deepEqual(photoSize(400, 250), { width: 400, height: 250 });
  assert.deepEqual(photoSize(6000, 8000), { width: 1536, height: PHOTO_MAX_EDGE });
  assert.deepEqual(photoSize(1, 1000000), { width: 1, height: PHOTO_MAX_EDGE });
});

test('failed encoders release image/canvas memory and never return an invalid upload', async () => {
  for (const invalid of [null, { type: 'image/webp', size: 0 }, { type: 'image/png', size: 100 }]) {
    const h = harness({ encode: async () => invalid });
    await assert.rejects(optimizeInContext(file(), h.dependencies), /diproses/);
    assert.ok(h.closed);
    assert.equal(h.canvas.width, 1);
    assert.equal(h.canvas.height, 1);
  }
});

test('codec exceptions also release decoded resources', async () => {
  const h = harness({ encode: async () => { throw Error('codec unavailable'); } });
  await assert.rejects(optimizeInContext(file(), h.dependencies), /codec unavailable/);
  assert.ok(h.closed);
});

test('real JPEG, progressive JPEG, PNG and three WebP encodings expose dimensions', async () => {
  for (const format of ['jpeg', 'progressive', 'png', 'webp', 'lossless', 'alpha']) {
    const channels = format === 'alpha' ? 4 : 3;
    const image = sharp({ create: { width: 48, height: 32, channels, background: { r: 180, g: 75, b: 100, alpha: 0.5 } } });
    const buffer = await (format === 'progressive' ? image.jpeg({ progressive: true }) :
      format === 'lossless' ? image.webp({ lossless: true }) :
      format === 'alpha' ? image.webp() : image.toFormat(format)).toBuffer();
    assert.deepEqual(await imageDimensions(new Blob([buffer])), { width: 48, height: 32 }, format);
  }
});

test('JPEG/WebP EXIF rotation selects the oriented axis for downsampling', async () => {
  for (const format of ['jpeg', 'webp']) {
    for (const orientation of [1, 3, 6, 8]) {
      const buffer = await sharp({ create: { width: 80, height: 40, channels: 3, background: '#e8a2c4' } })
        .withMetadata({ orientation }).toFormat(format).toBuffer();
      assert.deepEqual(await imageDimensions(new Blob([buffer])), orientation >= 5 ? { width: 40, height: 80 } : { width: 80, height: 40 });
    }
  }
});

test('unreadable and truncated headers are handled without unbounded allocation', async () => {
  for (const bytes of [[], [0xff, 0xd8], [0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff, ...new Uint8Array(26)], new Uint8Array(50)]) {
    assert.equal(await imageDimensions(new Blob([new Uint8Array(bytes)])), null);
  }
});

test('worker startup failure falls back to native optimization', async () => {
  const originals = new Map(['Worker', 'OffscreenCanvas', 'createImageBitmap'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let closed = false;
  try {
    globalThis.Worker = class { constructor() { throw Error('worker blocked'); } };
    globalThis.createImageBitmap = async () => ({ width: 500, height: 250, close() { closed = true; } });
    globalThis.OffscreenCanvas = class {
      constructor(width, height) { Object.assign(this, { width, height }); }
      getContext() { return { drawImage() {} }; }
      async convertToBlob() { return new Blob([new Uint8Array(20)], { type: 'image/webp' }); }
    };
    const output = await optimizePhoto(file());
    assert.equal(output.type, 'image/webp');
    assert.ok(closed);
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
