#!/usr/bin/env node
/**
 * PRIVATE ONLY: inspect a checksum-pinned FracAtlas.zip; make selected
 * original JPG + COCO source-polygon comparison overlays for HUMAN review.
 *
 * Never extracts an entire archive, copies PHI-bearing CSV rows, creates
 * diagnosis keys, changes licensing/resources.v1.json or publishes images.
 *
 * Expected owner-local archive:
 * local-data/studio-resources/alternative-candidates/fracatlas-v7/downloads/FracAtlas.zip
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { crc32 } from '../apps/studios/tools/zip-range.mjs';
import { assessPublisherRecord } from './batch-alternative-resources.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SOURCE_ID = 'fracatlas-v7';
const BASE = path.join(ROOT, 'local-data/studio-resources/alternative-candidates');
const OUT = path.join(ROOT, 'local-data/studio-resources/review-overlays/msk-xray');
const SHA = buf => crypto.createHash('sha256').update(buf).digest('hex');
const escapeHtml = x => String(x).replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const escapeXml = escapeHtml;
const SAFE_ENTRY = /^[^\x00-\x1f\\]+$/;

function ensurePrivate(p) {
  if (!p.startsWith(path.join(ROOT, 'local-data') + path.sep)) throw Error('FRAC_OUTSIDE_PRIVATE_DATA');
  const rel = path.relative(ROOT, p);
  let current = ROOT;
  for (const part of rel.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (fs.lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink())
      throw Error('FRAC_PRIVATE_PATH_SYMLINK');
  }
}
function writePrivate(p, b) {
  ensurePrivate(p);
  fs.mkdirSync(path.dirname(p), { recursive: true, mode: 0o700 });
  ensurePrivate(p);
  fs.writeFileSync(p, b, { mode: 0o600 });
}
function zipNameAllowed(n) {
  return typeof n === 'string' && n.length < 300 && SAFE_ENTRY.test(n) &&
    !n.startsWith('/') && !n.includes('//') &&
    n.split('/').every(x => x && x !== '..' && x !== '.') &&
    !/^[A-Za-z]:/.test(n);
}
const exactRead = (fd, pos, len, total) => {
  if (!Number.isSafeInteger(pos) || !Number.isSafeInteger(len) ||
      pos < 0 || len < 0 || pos + len > total) throw Error('FRAC_ZIP_OUT_OF_BOUNDS');
  const b = Buffer.alloc(len);
  if (fs.readSync(fd, b, 0, len, pos) !== len) throw Error('FRAC_ZIP_SHORT_READ');
  return b;
};

export function openPrivateZip(file) {
  if (fs.lstatSync(file).isSymbolicLink()) throw Error('FRAC_ZIP_SYMLINK');
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    if (size < 22 || size > 3 * 1024 ** 3) throw Error('FRAC_ZIP_SIZE_UNEXPECTED');
    const tailSize = Math.min(size, 65557);
    const tail = exactRead(fd, size - tailSize, tailSize, size);
    let position = -1;
    for (let p = tail.length - 22; p >= 0; p--) {
      if (tail.readUInt32LE(p) === 0x06054b50 &&
          p + 22 + tail.readUInt16LE(p + 20) === tail.length) { position = p; break; }
    }
    if (position < 0) throw Error('FRAC_ZIP_END_RECORD_MISSING');
    if (tail.readUInt16LE(position + 4) || tail.readUInt16LE(position + 6))
      throw Error('FRAC_ZIP_MULTIDISK_REJECTED');
    const count = tail.readUInt16LE(position + 10);
    const cdBytes = tail.readUInt32LE(position + 12);
    const cdOffset = tail.readUInt32LE(position + 16);
    if (count === 0xffff || cdBytes === 0xffffffff || cdOffset === 0xffffffff ||
        count < 1 || count > 25000 || cdBytes > 16 * 1024 ** 2)
      throw Error('FRAC_UNSUPPORTED_ZIP64_OR_INDEX');
    const cd = exactRead(fd, cdOffset, cdBytes, size);
    const entries = [];
    let offset = 0, totalDeclared = 0;
    for (let i = 0; i < count; i++) {
      if (offset + 46 > cd.length || cd.readUInt32LE(offset) !== 0x02014b50)
        throw Error('FRAC_BAD_CENTRAL_DIRECTORY');
      const flags = cd.readUInt16LE(offset + 8);
      const method = cd.readUInt16LE(offset + 10);
      const crc = cd.readUInt32LE(offset + 16);
      const compressed = cd.readUInt32LE(offset + 20);
      const uncompressed = cd.readUInt32LE(offset + 24);
      const n = cd.readUInt16LE(offset + 28);
      const x = cd.readUInt16LE(offset + 30);
      const c = cd.readUInt16LE(offset + 32);
      const external = cd.readUInt32LE(offset + 38);
      const localOffset = cd.readUInt32LE(offset + 42);
      if (offset + 46 + n + x + c > cd.length || flags & 1 ||
          ![0, 8].includes(method) || compressed === 0xffffffff ||
          uncompressed === 0xffffffff || localOffset === 0xffffffff)
        throw Error('FRAC_UNSUPPORTED_ZIP_MEMBER');
      const name = cd.toString('utf8', offset + 46, offset + 46 + n);
      if (!zipNameAllowed(name)) throw Error('FRAC_UNSAFE_ZIP_MEMBER_PATH');
      const unixType = (external >>> 16) & 0xf000;
      if (unixType === 0xa000) throw Error('FRAC_ZIP_SYMLINK_MEMBER');
      entries.push({ name, method, crc, compressed, uncompressed, localOffset });
      totalDeclared += uncompressed;
      if (totalDeclared > 8 * 1024 ** 3) throw Error('FRAC_ZIP_BOMB_DECLARATION');
      offset += 46 + n + x + c;
    }
    if (offset !== cdBytes) throw Error('FRAC_ZIP_TRAILING_INDEX_BYTES');
    const byName = new Map(entries.map(x => [x.name, x]));
    if (byName.size !== entries.length) throw Error('FRAC_ZIP_DUPLICATE_NAMES');
    return {
      entries,
      readMember(name, max = 80 * 1024 ** 2) {
        const e = byName.get(name);
        if (!e || e.uncompressed > max || e.compressed > max)
          throw Error('FRAC_MEMBER_ABSENT_OR_OVER_CAP');
        const h = exactRead(fd, e.localOffset, 30, size);
        if (h.readUInt32LE(0) !== 0x04034b50 || h.readUInt16LE(8) !== e.method)
          throw Error('FRAC_INVALID_LOCAL_HEADER');
        const localName = exactRead(fd, e.localOffset + 30, h.readUInt16LE(26), size).toString('utf8');
        if (localName !== name) throw Error('FRAC_ZIP_ENTRY_NAME_MISMATCH');
        const start = e.localOffset + 30 + h.readUInt16LE(26) + h.readUInt16LE(28);
        const packed = exactRead(fd, start, e.compressed, size);
        const out = e.method === 0 ? packed :
          zlib.inflateRawSync(packed, { maxOutputLength: max });
        if (out.length !== e.uncompressed || crc32(out) !== e.crc)
          throw Error('FRAC_MEMBER_CRC_OR_LENGTH_INVALID');
        return out;
      },
      close() { fs.closeSync(fd); }
    };
  } catch (e) { fs.closeSync(fd); throw e; }
}

/**
 * Strip JPG APPn and COM metadata/EXIF while retaining encoded scan data.
 * Compare all SOF dimensions with COCO before admitting the image.
 * This is NOT a guarantee that text is absent from image pixels.
 */
export function sanitizeJpeg(raw) {
  if (raw.length < 20 || raw.readUInt16BE(0) !== 0xffd8 ||
      raw.readUInt16BE(raw.length - 2) !== 0xffd9)
    throw Error('FRAC_INVALID_JPEG_CONTAINER');
  const chunks = [raw.subarray(0, 2)];
  let cursor = 2, width = null, height = null, foundScan = false;
  while (cursor < raw.length - 2) {
    const markerStart = cursor;
    if (raw[cursor] !== 0xff) throw Error('FRAC_JPEG_BAD_MARKER');
    while (raw[cursor] === 0xff) cursor++;
    const kind = raw[cursor++];
    if (kind === 0xda) {
      if (cursor + 2 > raw.length) throw Error('FRAC_JPEG_BAD_SOS');
      const len = raw.readUInt16BE(cursor);
      if (len < 2 || cursor + len > raw.length) throw Error('FRAC_JPEG_BAD_SOS');
      chunks.push(raw.subarray(markerStart)); foundScan = true; break;
    }
    if (kind === 0x01 || kind === 0xd8 || kind === 0xd9 || (kind >= 0xd0 && kind <= 0xd7))
      throw Error('FRAC_UNEXPECTED_JPEG_MARKER_BEFORE_SCAN');
    if (cursor + 2 > raw.length) throw Error('FRAC_JPEG_TRUNCATED_SEGMENT');
    const len = raw.readUInt16BE(cursor);
    if (len < 2 || cursor + len > raw.length) throw Error('FRAC_JPEG_BAD_SEGMENT_LENGTH');
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb].includes(kind)) {
      if (len < 7 || (width !== null && (width !== raw.readUInt16BE(cursor + 5) ||
          height !== raw.readUInt16BE(cursor + 3)))) throw Error('FRAC_JPEG_FRAME_INCONSISTENT');
      width = raw.readUInt16BE(cursor + 5);
      height = raw.readUInt16BE(cursor + 3);
    }
    if (!((kind >= 0xe0 && kind <= 0xef) || kind === 0xfe))
      chunks.push(raw.subarray(markerStart, cursor + len));
    cursor += len;
  }
  if (!foundScan || !width || !height || width > 16000 || height > 16000 ||
      width * height > 24_000_000) throw Error('FRAC_JPEG_DIMENSIONS_OR_SCAN_INVALID');
  return { jpeg: Buffer.concat(chunks), width, height };
}
export function selectCocoCases(coco, names, limit = 6) {
  if (!coco || !Array.isArray(coco.images) || !Array.isArray(coco.annotations) ||
      !Number.isInteger(limit) || limit < 1 || limit > 12)
    throw Error('FRAC_INVALID_COCO_SCHEMA');
  const byName = names.filter(n => /(?:^|\/)images\/Fractured\/[^/]+\.jpe?g$/i.test(n));
  const nameByBase = new Map();
  for (const n of byName) {
    const b = n.split('/').at(-1);
    if (nameByBase.has(b)) throw Error('FRAC_AMBIGUOUS_IMAGE_BASENAME');
    nameByBase.set(b, n);
  }
  const byImage = new Map();
  for (const annotation of coco.annotations) {
    const rawPolygons = Array.isArray(annotation.segmentation) ?
      annotation.segmentation : [];
    if (!rawPolygons.length) continue; // Never invent polygon from RLE or bounding boxes.
    for (const flat of rawPolygons) {
      if (!Array.isArray(flat) || flat.length < 6 || flat.length > 20000 || flat.length % 2)
        throw Error('FRAC_INVALID_COCO_POLYGON');
      const pair = [];
      for (let i = 0; i < flat.length; i += 2) {
        if (!Number.isFinite(flat[i]) || !Number.isFinite(flat[i + 1]))
          throw Error('FRAC_NONFINITE_POLYGON');
        pair.push([flat[i], flat[i + 1]]);
      }
      const cur = byImage.get(annotation.image_id) || [];
      if (cur.length < 10) cur.push(pair);
      byImage.set(annotation.image_id, cur);
    }
  }
  const eligible = coco.images.filter(img => {
    if (!img || !Number.isInteger(img.width) || !Number.isInteger(img.height) ||
        img.width < 8 || img.height < 8) return false;
    const base = path.posix.basename(String(img.file_name || ''));
    return nameByBase.has(base) && byImage.has(img.id);
  }).sort((a, b) => String(a.id).localeCompare(String(b.id), 'en', { numeric: true }));
  const out = [];
  for (const img of eligible) {
    if (out.length >= limit) break;
    const polygon = byImage.get(img.id).filter(points =>
      points.every(([x,y]) => x >= -2 && y >= -2 && x <= img.width + 2 && y <= img.height + 2)
    );
    if (!polygon.length) continue;
    out.push({ member: nameByBase.get(path.posix.basename(img.file_name)),
      width: img.width, height: img.height, polygons: polygon });
  }
  return out;
}
const overlaySvg = c => {
  const points = c.polygons.map(poly => '<polygon points="' +
    poly.map(([x,y]) => x.toFixed(2) + ',' + y.toFixed(2)).join(' ') +
    '" fill="#ff293d" fill-opacity=".28" stroke="#ff293d" stroke-width="3" stroke-linejoin="round"/>');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
    c.width + ' ' + c.height + '">' + points.join('') + '</svg>';
};
export function makePrivateFracHtml(cases) {
  const cards = cases.map((c, i) => '<article><h2>Fracture · Case ' + (i+1) +
    '</h2><p>' + c.polygons.length + ' original COCO polygons (not automated diagnosis)</p>' +
    '<div class="compare"><img src="image-' + (i+1) + '.jpg" alt="Radiograph review case ' + (i+1) +
    '"><img class="overlay" id="mask-' + (i+1) + '" src="overlay-' + (i+1) +
    '.svg" alt="Source fracture contours"></div>' +
    '<p>Overlay opacity <input type="range" min="0" max="100" value="100" data-i="' +
    (i+1) + '"> <span id="opacity-' + (i+1) + '">100%</span></p></article>');
  return '<!doctype html><html lang="id"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>MEDCOEL — FracAtlas Private Candidate Review</title>' +
    '<style>:root{color-scheme:dark;background:#101827;color:#edf4ff;font-family:system-ui}' +
    'body{max-width:1200px;margin:24px auto;padding:16px}' +
    'a{color:#9cd2ff}p{color:#cbd9e8}' +
    '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,370px),1fr));gap:18px}' +
    'article{background:#1a2740;border:1px solid #3e536f;border-radius:12px;padding:16px}' +
    '.compare{position:relative;background:black;line-height:0;overflow:hidden;border-radius:8px}' +
    '.compare img{width:100%;height:auto;display:block}.compare .overlay{position:absolute;inset:0}' +
    'input{width:70%}</style></head><body>' +
    '<p><a href="../index.html">Back to private Clinical Review Hub</a></p>' +
    '<h1>MSK X-ray · FracAtlas COCO Candidate</h1>' +
    '<p><strong>LOCAL ONLY · RELEASE BLOCKED · PRIVACY / MEDICAL / RIGHTS REVIEW PENDING.</strong>' +
    ' Annotations come only from the source COCO polygons. The JPEG container metadata was removed,' +
    ' but burned-in patient identifiers in pixels have NOT yet been ruled out.' +
    ' Do not upload, publish, or share screenshots.</p><div class="grid">' + cards.join('') +
    '</div><script>document.querySelectorAll("input[data-i]").forEach(x=>x.addEventListener("input",()=>{' +
    'document.getElementById("mask-"+x.dataset.i).style.opacity=x.value/100;' +
    'document.getElementById("opacity-"+x.dataset.i).textContent=x.value+"%";' +
    '}));</script></body></html>';
}

export function planFracAtlasArchive(zip, limit = 6) {
  const cocoEntries = zip.entries.filter(e =>
    /(?:^|\/)Annotations\/COCO JSON\/COCO_fracture_masks\.json$/i.test(e.name));
  if (cocoEntries.length !== 1) throw Error('FRAC_COCO_SOURCE_NOT_UNIQUE');
  const json = zip.readMember(cocoEntries[0].name, 80 * 1024 ** 2);
  const coco = JSON.parse(json.toString('utf8'));
  const candidates = selectCocoCases(coco, zip.entries.map(e => e.name), limit);
  if (!candidates.length) throw Error('FRAC_NO_MATCHED_FRACTURE_POLYGONS');
  const cases = candidates.map(c => {
    const raw = zip.readMember(c.member, 32 * 1024 ** 2);
    const result = sanitizeJpeg(raw);
    if (result.width !== c.width || result.height !== c.height)
      throw Error('FRAC_COCO_IMAGE_DIMENSIONS_MISMATCH');
    return { ...c, jpeg: result.jpeg };
  });
  return { cases, cocoDigest: SHA(json), entries: zip.entries.length };
}

async function verifiedLocalFractureArchive() {
  const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'licensing/candidates/alternative-sources-batch.v1.json'), 'utf8')).sources.find(x => x.id === SOURCE_ID);
  const dir = path.join(BASE, SOURCE_ID);
  ensurePrivate(dir);
  const e = JSON.parse(fs.readFileSync(path.join(dir, 'source-evidence.json'), 'utf8'));
  const snapshot = fs.readFileSync(path.join(dir, 'source-metadata.snapshot'));
  if (e.status !== 'SOURCE_CANDIDATE_STAGED' || SHA(snapshot) !== e.metadataSha256)
    throw Error('FRAC_SOURCE_METADATA_NOT_VERIFIED');
  const checked = assessPublisherRecord(source, snapshot);
  const f = checked.filenamePins.find(x => x.name === 'FracAtlas.zip');
  if (!f || !/^[a-f0-9]{32}$/i.test(f.publisherMd5) || !Number.isSafeInteger(f.bytes))
    throw Error('FRAC_NO_PINNED_SOURCE_ARCHIVE');
  const report = JSON.parse(fs.readFileSync(path.join(BASE, 'acquisition-report.json'), 'utf8'));
  const row = report.results.find(x => x.source === SOURCE_ID && x.filename === f.name &&
    ['DOWNLOADED_PRIVATE_ONLY', 'ALREADY_VERIFIED_PRIVATE'].includes(x.status));
  if (!row || !/^[a-f0-9]{64}$/i.test(row.sha256) || report.releaseApproved !== false)
    throw Error('FRAC_PRIVATE_ACQUISITION_NOT_RECORDED');
  const archive = path.join(dir, 'downloads', 'FracAtlas.zip');
  ensurePrivate(archive);
  const stat = fs.lstatSync(archive);
  if (!stat.isFile() || stat.size !== f.bytes) throw Error('FRAC_SOURCE_LENGTH_CHANGED');
  const md5 = crypto.createHash('md5'), sha = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(archive)) { md5.update(chunk); sha.update(chunk); }
  const digest = sha.digest('hex');
  if (md5.digest('hex') !== f.publisherMd5.toLowerCase() || digest !== row.sha256)
    throw Error('FRAC_SOURCE_BYTES_NOT_VERIFIED');
  return { archive, digest, publisherMd5: f.publisherMd5, source };
}

export async function generatePrivateFracAtlasReview({ limit = 6 } = {}) {
  const verified = await verifiedLocalFractureArchive();
  const zip = openPrivateZip(verified.archive);
  let plan;
  try { plan = planFracAtlasArchive(zip, limit); }
  finally { zip.close(); }
  ensurePrivate(OUT);
  const written = [];
  for (const [i, c] of plan.cases.entries()) {
    const n = i + 1, imageFile = path.join(OUT, 'image-' + n + '.jpg');
    const svgFile = path.join(OUT, 'overlay-' + n + '.svg');
    writePrivate(imageFile, c.jpeg);
    writePrivate(svgFile, overlaySvg(c));
    written.push({ case: n, image: path.basename(imageFile),
      pixelWidth: c.width, pixelHeight: c.height,
      regionCount: c.polygons.length, sha256: SHA(c.jpeg) });
  }
  writePrivate(path.join(OUT, 'index.html'), makePrivateFracHtml(plan.cases));
  writePrivate(path.join(OUT, 'review-summary.json'), JSON.stringify({
    schema: 'medcoel.private-fracatlas-candidate-review.v1',
    studio: 'msk-xray', source: SOURCE_ID, kind: 'real-radiograph-source-fracture-polygons',
    fullArchiveSha256: verified.digest, publisherArchiveMd5: verified.publisherMd5,
    cocoJsonSha256: plan.cocoDigest, zipEntriesInspected: plan.entries,
    medicalApproved: false, privacyApproved: false, rightsApproved: false,
    releaseApproved: false, reviewRequired: 'Inspect burned-in identifiers and fracture boundaries',
    images: written
  }, null, 2) + '\n');
  return { images: written.length, kind: 'private-candidate-fracture-coco',
    status: 'PRIVATE_CANDIDATE_REVIEW_READY', releaseApproved: false };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  generatePrivateFracAtlasReview().then(r=>console.log(JSON.stringify(r,null,2)))
    .catch(e=>{ console.error('FRACATLAS_PRIVATE_REVIEW_FAILED: '+e.message); process.exitCode=1; });
