// Read only image headers, so a large original need not become a full-size bitmap.
function exifOrientation(view, offset = 0) {
  if (view.byteLength < offset + 8) return 1;
  if (view.getUint32(offset) === 0x45786966) offset += 6; // Exif\0\0
  if (view.byteLength < offset + 8) return 1;
  const order = view.getUint16(offset);
  if (order !== 0x4949 && order !== 0x4d4d) return 1;
  const little = order === 0x4949;
  if (view.getUint16(offset + 2, little) !== 42) return 1;
  const directory = offset + view.getUint32(offset + 4, little);
  if (directory + 2 > view.byteLength) return 1;
  const count = view.getUint16(directory, little);
  for (let i = 0; i < count; i++) {
    const entry = directory + 2 + i * 12;
    if (entry + 12 > view.byteLength) break;
    if (view.getUint16(entry, little) === 0x0112 &&
        view.getUint16(entry + 2, little) === 3 &&
        view.getUint32(entry + 4, little) === 1) {
      return view.getUint16(entry + 8, little);
    }
  }
  return 1;
}

const read = async (file, offset, length) => new DataView(await file.slice(offset, offset + length).arrayBuffer());

export async function imageDimensions(file) {
  const header = await read(file, 0, 32);
  if (header.byteLength < 12) return null;
  let width, height, orientation = 1;
  if (header.getUint32(0) === 0x89504e47 && header.byteLength >= 24) {
    width = header.getUint32(16);
    height = header.getUint32(20);
  } else if (header.getUint16(0) === 0xffd8) {
    let offset = 2;
    while (offset + 4 <= file.size) {
      const segment = await read(file, offset, 4);
      if (segment.getUint8(0) !== 0xff) break;
      const marker = segment.getUint8(1);
      if (marker === 0xff) { offset++; continue; }
      if (marker === 0xda || marker === 0xd9) break; // Scan/end, no more metadata.
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
      const length = segment.getUint16(2);
      if (length < 2 || offset + 2 + length > file.size) break;
      if (marker === 0xe1) orientation = exifOrientation(await read(file, offset + 4, length - 2));
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
        const frame = await read(file, offset + 4, 5);
        height = frame.getUint16(1);
        width = frame.getUint16(3);
      }
      offset += length + 2;
    }
  } else if (header.getUint32(0) === 0x52494646 && header.getUint32(8) === 0x57454250) {
    let offset = 12;
    while (offset + 8 <= file.size) {
      const chunk = await read(file, offset, 18);
      const kind = chunk.getUint32(0), length = chunk.getUint32(4, true);
      if (offset + 8 + length > file.size) break;
      if (kind === 0x56503858 && chunk.byteLength >= 18) { // VP8X
        width = 1 + chunk.getUint8(12) + (chunk.getUint8(13) << 8) + (chunk.getUint8(14) << 16);
        height = 1 + chunk.getUint8(15) + (chunk.getUint8(16) << 8) + (chunk.getUint8(17) << 16);
      } else if (kind === 0x56503820 && chunk.byteLength >= 18) { // VP8
        width = chunk.getUint16(14, true) & 0x3fff;
        height = chunk.getUint16(16, true) & 0x3fff;
      } else if (kind === 0x5650384c && chunk.byteLength >= 13) { // VP8L
        const bits = chunk.getUint32(9, true);
        width = 1 + (bits & 0x3fff);
        height = 1 + ((bits >>> 14) & 0x3fff);
      } else if (kind === 0x45584946) {
        orientation = exifOrientation(await read(file, offset + 8, Math.min(length, 65536)));
      }
      offset += 8 + length + (length % 2);
    }
  }
  if (!(width > 0 && height > 0)) return null;
  return orientation >= 5 && orientation <= 8 ? { width: height, height: width } : { width, height };
}
