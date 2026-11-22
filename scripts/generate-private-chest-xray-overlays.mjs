#!/usr/bin/env node
/**
 * LOCAL-ONLY reviewer overlays for the four pinned PTX-498 chest X-rays.
 *
 * Inputs:  local-data/studio-resources/build/chest-xray/data/image-N.png
 *          local-data/studio-resources/build/chest-xray/data/annotations-N.json
 * Output:  local-data/studio-resources/review-overlays/chest-xray/
 *
 * Never commits or publishes patient pixels, polygons or Challenge answer keys.
 * This is a coordinate visualisation, not an automated medical/privacy approval.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { decodePng } from '../apps/studios/tools/prepare-image2d.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DATA = path.join(ROOT, 'local-data/studio-resources/build/chest-xray');
const OUTPUT = path.join(ROOT, 'local-data/studio-resources/review-overlays/chest-xray');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function rejectSymlinks(location) {
  const relative = path.relative(ROOT, location);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw Error('REVIEW_OUTPUT_OUTSIDE_REPO');
  let current = ROOT;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const node = fs.lstatSync(current, { throwIfNoEntry: false });
    if (node?.isSymbolicLink()) throw Error('REVIEW_UNSAFE_SYMLINK:' + part);
  }
}
function validateRegions(document, width, height) {
  if (!document || document.schema !== 'medcoel.annotations.v1' ||
      !Array.isArray(document.regions) || document.regions.length < 1 ||
      document.regions.length > 10) throw Error('REVIEW_INVALID_ANNOTATIONS');
  return document.regions.map((region, ri) => {
    if (!Array.isArray(region.polygon) || region.polygon.length < 3 ||
        region.polygon.length > 20000) throw Error('REVIEW_INVALID_POLYGON:' + ri);
    const polygon = region.polygon;
    for (const p of polygon) {
      if (!Array.isArray(p) || p.length !== 2 ||
          !Number.isFinite(p[0]) || !Number.isFinite(p[1]) ||
          p[0] < -2 || p[0] > width + 2 || p[1] < -2 || p[1] > height + 2) {
        throw Error('REVIEW_POLYGON_OUTSIDE_IMAGE:' + ri);
      }
    }
    return polygon;
  });
}

function rgbaPixel(out, width, x, y, red, green, blue, opacity = 1) {
  const at = (y * width + x) * 4;
  const inv = 1 - opacity;
  out[at] = Math.round(out[at] * inv + red * opacity);
  out[at + 1] = Math.round(out[at + 1] * inv + green * opacity);
  out[at + 2] = Math.round(out[at + 2] * inv + blue * opacity);
}

function fillPolygon(out, width, height, points) {
  // Pixel-centre, even-odd scanline fill; source polygon geometry is not transformed.
  const low = Math.max(0, Math.floor(Math.min(...points.map(p => p[1]))));
  const high = Math.min(height - 1, Math.ceil(Math.max(...points.map(p => p[1]))));
  for (let y = low; y <= high; y++) {
    const scan = y + 0.5, crossings = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      if ((a[1] > scan) !== (b[1] > scan)) {
        crossings.push(a[0] + (scan - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const from = Math.max(0, Math.ceil(crossings[i] - 0.5));
      const to = Math.min(width - 1, Math.floor(crossings[i + 1] - 0.5));
      for (let x = from; x <= to; x++) rgbaPixel(out, width, x, y, 255, 42, 42, 0.28);
    }
  }
}
function outlinePolygon(out, width, height, points) {
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[(i + 1) % points.length];
    const length = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let j = 0; j <= length; j++) {
      const t = length ? j / length : 0;
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < width && yy >= 0 && yy < height) {
          rgbaPixel(out, width, xx, yy, 255, 35, 35);
        }
      }
    }
  }
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const bytes = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(bytes));
  return Buffer.concat([length, bytes, crc]);
}
export function encodeRgbaPng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA, no palette and no PNG metadata.
  const stride = width * 4, raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // PNG filter None.
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

export function renderPrivateOverlay(imageBuffer, annotations) {
  const { w, h, px } = decodePng(imageBuffer);
  if (!Number.isSafeInteger(w) || !Number.isSafeInteger(h) ||
      w < 4 || h < 4 || w * h > 16000000 || px.length !== w * h) {
    throw Error('REVIEW_UNEXPECTED_PNG_DIMENSIONS');
  }
  const polygons = validateRegions(annotations, w, h);
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < px.length; i++) {
    rgba[4 * i] = px[i];
    rgba[4 * i + 1] = px[i];
    rgba[4 * i + 2] = px[i];
    rgba[4 * i + 3] = 255;
  }
  polygons.forEach(poly => fillPolygon(rgba, w, h, poly));
  polygons.forEach(poly => outlinePolygon(rgba, w, h, poly));
  return { png: encodeRgbaPng(w, h, rgba), width: w, height: h, regions: polygons.length };
}

function offlineReviewHtml(records) {
  const cards = records.map(r => [
    '<article><h2>Chest X-ray — Kasus ' + r.case + '</h2>',
    '<p>' + r.regions + ' poligon sumber · ' + r.width + ' × ' + r.height + ' px · <a href="image-' + r.case + '-overlay.png">Buka PNG overlay</a></p>',
    '<div class="comparison"><img src="../../build/chest-xray/data/image-' + r.case + '.png" alt="Citra asli kasus ' + r.case + '">',
    '<img id="overlay-' + r.case + '" class="overlay" src="image-' + r.case + '-overlay.png" alt="Overlay merah poligon kasus ' + r.case + '"></div>',
    '<label>Kekuatan overlay <input type="range" min="0" max="100" value="100" data-overlay="overlay-' + r.case + '"> <span id="pct-' + r.case + '">100%</span></label>',
    '</article>'
  ].join('')).join('\n');
  return [
    '<!doctype html><html lang="id"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>MEDCOEL — PTX-498 private annotation review</title>',
    '<style>',
    ':root{color-scheme:dark;font-family:system-ui,Arial,sans-serif;background:#0c1220;color:#f2f5ff}',
    'body{max-width:1150px;margin:auto;padding:24px}',
    'h1{font-size:24px}p{line-height:1.5;color:#ced7e7}',
    '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,410px),1fr));gap:22px}',
    'article{background:#172236;border:1px solid #31415d;border-radius:16px;padding:16px}',
    '.comparison{position:relative;line-height:0;overflow:hidden;border-radius:8px;background:#000}',
    '.comparison img{width:100%;height:auto;display:block}',
    '.comparison .overlay{position:absolute;inset:0}',
    'input{width:70%;vertical-align:middle;accent-color:#f35a5a}',
    'a{color:#86c8ff}.notice{border-left:3px solid #ea9393;padding-left:12px;margin-bottom:24px}',
    '</style></head><body>',
    '<h1>MEDCOEL · Overlay Anotasi Chest X-ray</h1>',
    '<p class="notice">PRIVAT · PTX-498 · Poligon merah adalah hasil konversi anotasi dataset sumber,',
    ' bukan hasil diagnosis baru atau persetujuan klinis. Periksa posisi kontur, temuan',
    ' medis dan informasi identitas yang tertanam dalam piksel sebelum review formal.',
    ' Jangan unggah gambar/HTML ini ke GitHub atau server publik.</p>',
    '<div class="grid">' + cards + '</div>',
    '<p>Status: HUMAN_REVIEW_REQUIRED. Gambar asli dan PNG overlay tetap tersimpan di local-data/.</p>',
    '<script>',
    'document.querySelectorAll("input[data-overlay]").forEach(function(slider){',
    'slider.addEventListener("input",function(){',
    'var id=slider.getAttribute("data-overlay");',
    'document.getElementById(id).style.opacity=slider.value/100;',
    'document.getElementById(id.replace("overlay-","pct-")).textContent=slider.value+"%";',
    '});});',
    '</script></body></html>'
  ].join('\n');
}

function verifiedInput(relative, resources, provenance) {
  const file = path.join(DATA, relative);
  rejectSymlinks(file);
  const b = fs.readFileSync(file);
  const matches = resources.assets.filter(a => a.id.startsWith('chest-xray.') &&
    !a.sourceFile && a.path === relative);
  const pin = matches.length === 1 && matches[0];
  const recorded = provenance.outputs?.[relative];
  if (!pin || !recorded || sha(b) !== pin.sha256 || b.length !== pin.bytes ||
      sha(b) !== recorded.sha256 || b.length !== recorded.bytes) {
    throw Error('REVIEW_INPUT_BYTES_NOT_PINNED:' + relative);
  }
  return b;
}

export function generatePrivateChestXrayOverlays() {
  rejectSymlinks(DATA);
  rejectSymlinks(path.join(DATA, 'provenance.json'));
  rejectSymlinks(OUTPUT);
  const resources = JSON.parse(fs.readFileSync(path.join(ROOT, 'licensing/resources.v1.json'), 'utf8'));
  const provenance = JSON.parse(fs.readFileSync(path.join(DATA, 'provenance.json'), 'utf8'));
  if (provenance.studio !== 'chest-xray' || provenance.schema !== 'medcoel.provenance.v1') {
    throw Error('REVIEW_WRONG_PRIVATE_BUILD');
  }
  const records = [], results = [];
  for (let n = 1; n <= 4; n++) {
    const image = verifiedInput('data/image-' + n + '.png', resources, provenance);
    const annotationBytes = verifiedInput('data/annotations-' + n + '.json', resources, provenance);
    const result = renderPrivateOverlay(image, JSON.parse(annotationBytes.toString('utf8')));
    records.push({ case: n, width: result.width, height: result.height, regions: result.regions });
    results.push(result.png);
  }
  // Only write after all four inputs, hashes and polygons have been checked.
  fs.mkdirSync(OUTPUT, { recursive: true, mode: 0o700 });
  rejectSymlinks(OUTPUT);
  for (let n = 1; n <= 4; n++) {
    const dest = path.join(OUTPUT, 'image-' + n + '-overlay.png');
    rejectSymlinks(dest);
    fs.writeFileSync(dest, results[n - 1], { mode: 0o600 });
  }
  const page = path.join(OUTPUT, 'index.html');
  rejectSymlinks(page);
  fs.writeFileSync(page, offlineReviewHtml(records), { mode: 0o600 });
  const report = path.join(OUTPUT, 'review-summary.json');
  rejectSymlinks(report);
  fs.writeFileSync(report, JSON.stringify({
    schema: 'medcoel.private-annotation-review.v1',
    studio: 'chest-xray', releaseApproved: false, medicalReview: 'pending',
    privacyReview: 'pending', source: 'PTX-498', exactRegistryBytesVerified: true,
    images: records
  }, null, 2) + '\n', { mode: 0o600 });
  return { output: path.relative(ROOT, OUTPUT), page: path.relative(ROOT, page),
    images: records, medicalReview: 'pending', releaseApproved: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(generatePrivateChestXrayOverlays(), null, 2));
    console.log('Open with: open local-data/studio-resources/review-overlays/chest-xray/index.html');
  } catch (error) {
    console.error('PRIVATE_OVERLAY_FAILED: ' + error.message);
    process.exitCode = 1;
  }
}
