#!/usr/bin/env node
// Fetch single members of a remote ZIP with HTTP Range requests (no bulk download). Supports ZIP64 (multi-GB archives),
// stored and deflated members, and verifies every member's CRC-32 from the central directory.
//   node apps/studios/tools/zip-range.mjs list <url> [filter-regex]
//   node apps/studios/tools/zip-range.mjs get <url> <member> <outFile>
// Used for official, openly licensed archives only (licence checked separately from the publisher's own record).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const UA = { 'User-Agent': 'resource-audit/1.0' };
async function range(url, start, end) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, { headers: { ...UA, Range: `bytes=${start}-${end}` }, redirect: 'follow' });
    if (r.status === 206) return Buffer.from(await r.arrayBuffer());
    if (r.status !== 429 && r.status < 500) throw Error(`Range not supported (${r.status}) for ${url}`);
    await new Promise(res => setTimeout(res, 1000 * 2 ** attempt));
  }
  throw Error('Range request failed repeatedly');
}
async function size(url) {
  const r = await fetch(url, { headers: { ...UA, Range: 'bytes=0-0' }, redirect: 'follow' });
  const cr = r.headers.get('content-range'); await r.arrayBuffer().catch(() => {});
  const m = cr && cr.match(/\/(\d+)$/); if (!m) throw Error('No Content-Range total for ' + url);
  return Number(m[1]);
}

const CRC_TABLE = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
export function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

/** Central directory entries: { name, method, crc, compressed, uncompressed, localOffset }. */
export async function listZip(url) {
  const total = await size(url), tailLen = Math.min(total, 70000);
  const tail = await range(url, total - tailLen, total - 1);
  const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw Error('EOCD not found');
  let cdSize = tail.readUInt32LE(eocd + 12), cdOffset = tail.readUInt32LE(eocd + 16), count = tail.readUInt16LE(eocd + 10);
  if (cdOffset === 0xffffffff || cdSize === 0xffffffff || count === 0xffff) {
    const loc = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x06, 0x07]), eocd);
    if (loc < 0) throw Error('ZIP64 locator not found');
    const z64Off = Number(tail.readBigUInt64LE(loc + 8));
    const z64 = z64Off >= total - tailLen ? tail.subarray(z64Off - (total - tailLen)) : await range(url, z64Off, z64Off + 55);
    if (z64.readUInt32LE(0) !== 0x06064b50) throw Error('ZIP64 EOCD not found');
    count = Number(z64.readBigUInt64LE(32)); cdSize = Number(z64.readBigUInt64LE(40)); cdOffset = Number(z64.readBigUInt64LE(48));
  }
  const cd = cdOffset >= total - tailLen ? tail.subarray(cdOffset - (total - tailLen), cdOffset - (total - tailLen) + cdSize) : await range(url, cdOffset, cdOffset + cdSize - 1);
  const out = [];
  for (let p = 0, i = 0; i < count; i++) {
    if (cd.readUInt32LE(p) !== 0x02014b50) throw Error('Bad central directory entry');
    const method = cd.readUInt16LE(p + 10), crc = cd.readUInt32LE(p + 16);
    let compressed = cd.readUInt32LE(p + 20), uncompressed = cd.readUInt32LE(p + 24);
    const nLen = cd.readUInt16LE(p + 28), xLen = cd.readUInt16LE(p + 30), cLen = cd.readUInt16LE(p + 32);
    let localOffset = cd.readUInt32LE(p + 42);
    const name = cd.subarray(p + 46, p + 46 + nLen).toString('utf8');
    for (let x = p + 46 + nLen; x < p + 46 + nLen + xLen;) {
      const id = cd.readUInt16LE(x), len = cd.readUInt16LE(x + 2); let q = x + 4;
      if (id === 0x0001) {
        if (uncompressed === 0xffffffff) { uncompressed = Number(cd.readBigUInt64LE(q)); q += 8; }
        if (compressed === 0xffffffff) { compressed = Number(cd.readBigUInt64LE(q)); q += 8; }
        if (localOffset === 0xffffffff) { localOffset = Number(cd.readBigUInt64LE(q)); q += 8; }
      }
      x += 4 + len;
    }
    out.push({ name, method, crc, compressed, uncompressed, localOffset });
    p += 46 + nLen + xLen + cLen;
  }
  return out;
}

export async function getMember(url, entry) {
  const head = await range(url, entry.localOffset, entry.localOffset + 29);
  if (head.readUInt32LE(0) !== 0x04034b50) throw Error('Bad local header for ' + entry.name);
  const start = entry.localOffset + 30 + head.readUInt16LE(26) + head.readUInt16LE(28);
  const raw = entry.compressed ? await range(url, start, start + entry.compressed - 1) : Buffer.alloc(0);
  const data = entry.method === 0 ? raw : entry.method === 8 ? zlib.inflateRawSync(raw) : (() => { throw Error('Unsupported method ' + entry.method); })();
  if (data.length !== entry.uncompressed || crc32(data) !== entry.crc) throw Error('CRC/size mismatch for ' + entry.name);
  return data;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, url, a, b] = process.argv.slice(2);
  const entries = await listZip(url);
  if (cmd === 'list') { const re = a ? new RegExp(a) : null; for (const e of entries.filter(e => !re || re.test(e.name))) console.log(e.uncompressed, e.compressed, e.name); console.log(entries.length, 'entries'); }
  else if (cmd === 'get') { const e = entries.find(x => x.name === a); if (!e) throw Error('No member ' + a); const d = await getMember(url, e); fs.mkdirSync(path.dirname(b), { recursive: true }); fs.writeFileSync(b, d); console.log('ok', a, d.length, 'bytes, CRC verified'); }
  else { console.error('usage: zip-range.mjs list|get <url> ...'); process.exit(1); }
}
