// Tiny dependency-free PNG encoder for offline evidence images (RGBA8).
import { deflateSync } from 'node:zlib';
const table = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (buf) => { let c = -1; for (const b of buf) c = table[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
export function encodePNG(rgba, w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
/** Paste several RGBA tiles side by side. */
export function montage(tiles, gap = 6) {
  const h = Math.max(...tiles.map((t) => t.h)), w = tiles.reduce((s, t) => s + t.w, 0) + gap * (tiles.length - 1);
  const out = new Uint8ClampedArray(w * h * 4); let x0 = 0;
  for (const t of tiles) { for (let y = 0; y < t.h; y++) out.set(t.rgba.subarray(y * t.w * 4, (y + 1) * t.w * 4), (y * w + x0) * 4); x0 += t.w + gap; }
  return { rgba: out, w, h };
}
