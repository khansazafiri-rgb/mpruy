#!/usr/bin/env node
// 2D image studios from official, openly licensed archives (members fetched by HTTP Range, CRC-verified):
//   chest-xray        <- PTX-498 v2-fix (Zenodo 10.5281/zenodo.8266529): pneumothorax radiographs + pixel masks
//   pelvis-ultrasound <- HC18 (Zenodo 10.5281/zenodo.1327317): fetal head ultrasound + head-contour annotation (OBSTETRIC)
// Images are re-encoded as plain greyscale PNG (IHDR/IDAT/IEND only: no text/EXIF chunks). Masks/contours become polygons
// (boundary tracing + Douglas-Peucker) for server-side point-in-polygon grading; the polygons never reach a Challenge client.
// Nothing is invented: no laterality for PNG radiographs without orientation metadata, no diagnosis beyond the source label.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { png as encodePng } from './make-image-fixture.mjs';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const RAW = path.join(REPO, 'local-data/studio-resources/raw'), BUILD = path.join(REPO, 'local-data/studio-resources/build');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw Error('Not a PNG');
  let p = 8, w, h, depth, ctype, inter; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9]; inter = data[12]; }
    if (type === 'IDAT') idat.push(data);
    if (type === 'IEND') break;
    p += 12 + len;
  }
  const bpp = { 0: 1, 2: 3, 4: 2, 6: 4 }[ctype];
  if (depth !== 8 || !bpp || inter !== 0) throw Error(`Unsupported PNG (depth ${depth}, colour ${ctype}, interlace ${inter})`);
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(w * h), prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      cur[i] = (row[i] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 0xff;
    }
    for (let x = 0; x < w; x++) out[y * w + x] = cur[x * bpp]; // first channel (greyscale sources)
    cur.copy(prev);
  }
  return { w, h, px: out };
}

/** Connected components (4-neighbour) of a binary grid; returns arrays of pixel indices, largest first. */
function components(bin, w, h) {
  const seen = new Uint8Array(w * h), out = [];
  for (let s = 0; s < w * h; s++) {
    if (!bin[s] || seen[s]) continue;
    const comp = [], stack = [s]; seen[s] = 1;
    while (stack.length) { const i = stack.pop(); comp.push(i); const x = i % w, y = (i / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * w + nx; if (nx >= 0 && ny >= 0 && nx < w && ny < h && bin[j] && !seen[j]) { seen[j] = 1; stack.push(j); } } }
    out.push(comp);
  }
  return out.sort((a, b) => b.length - a.length);
}
/** Outer boundary (Moore-neighbour tracing) of one component, simplified with Douglas-Peucker. */
export function tracePolygon(comp, w, h, epsilon = 1.5) {
  const inC = new Uint8Array(w * h); for (const i of comp) inC[i] = 1;
  const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && inC[y * w + x];
  let start = comp.reduce((m, i) => Math.min(m, i), Infinity); const sx = start % w, sy = (start / w) | 0;
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const pts = [[sx, sy]]; let x = sx, y = sy, d = 6, guard = 0;
  do {
    let found = false;
    for (let k = 0; k < 8; k++) { const nd = (d + 6 + k) % 8, nx = x + dirs[nd][0], ny = y + dirs[nd][1]; if (at(nx, ny)) { x = nx; y = ny; d = nd; found = true; break; } }
    if (!found) break;
    pts.push([x, y]);
  } while ((x !== sx || y !== sy) && ++guard < 4 * comp.length + 16);
  const dp = (a, b) => { if (b - a < 2) return [pts[a]]; const [x1, y1] = pts[a], [x2, y2] = pts[b], L = Math.hypot(x2 - x1, y2 - y1) || 1; let m = 0, k = a;
    for (let i = a + 1; i < b; i++) { const dd = Math.abs((y2 - y1) * pts[i][0] - (x2 - x1) * pts[i][1] + x2 * y1 - y2 * x1) / L; if (dd > m) { m = dd; k = i; } }
    return m > epsilon ? [...dp(a, k), ...dp(k, b)] : [pts[a]]; };
  const half = pts.length >> 1;
  return [...dp(0, half), ...dp(half, pts.length - 1)].map(([px, py]) => [px + 0.5, py + 0.5]);
}
const inside = (poly, [px, py]) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c; } return c; };
/** Fraction of component pixels inside the polygon (fails closed if tracing went wrong). */
function coverage(poly, comp, w) { let n = 0; for (const i of comp) if (inside(poly, [(i % w) + 0.5, ((i / w) | 0) + 0.5])) n++; return n / comp.length; }

const SOURCES = {
  'chest-xray': {
    raw: path.join(RAW, 'ptx498'),
    cases: ['SiteA/1', 'SiteA/10', 'SiteB/1', 'SiteC/1'].map(c => ({ id: c, image: c + '.1.img.png', mask: c + '.2.mask.png' })),
    label: 'Area pneumotoraks (anotasi sumber)', regionPrefix: 'ptx',
    attribution: 'PTX-498 pneumothorax chest X-ray dataset (v2-fix): Wang Y. et al., Neurocomputing 2021, doi:10.1016/j.neucom.2021.05.029; data doi:10.5281/zenodo.8266529. Licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).',
    noticeName: 'NOTICE-PTX-498.txt', licence: 'CC-BY-4.0',
    datasetNotice: 'Data: PTX-498 (Wang dkk., 2021), CC BY 4.0. Radiograf toraks dengan pneumotoraks dari tiga rumah sakit; anotasi piksel oleh dua radiolog senior. Semua kasus di dataset ini positif pneumotoraks (tidak ada kontrol normal). Orientasi kiri/kanan tidak tercatat pada PNG, jadi sisi tidak disebutkan. Review medis belum selesai: hanya review privat.',
    spacing: () => null, filled: true,
    explain: () => 'Area pneumotoraks menurut anotasi piksel PTX-498 (dua radiolog senior). Perhatikan garis pleura viseral dan hilangnya corakan paru di luar garis itu.',
  },
  'pelvis-ultrasound': {
    raw: path.join(RAW, 'hc18'),
    cases: ['000', '010', '100', '300'].map(n => ({ id: n, image: 'training_set/' + n + '_HC.png', mask: 'training_set/' + n + '_HC_Annotation.png' })),
    label: 'Kepala janin (kontur referensi)', regionPrefix: 'head',
    attribution: 'HC18 fetal head circumference dataset: van den Heuvel TLA et al., Automated measurement of fetal head circumference using 2D ultrasound images, PLoS ONE 13(8):e0200412 (2018), doi:10.1371/journal.pone.0200412; data doi:10.5281/zenodo.1327317. Licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).',
    noticeName: 'NOTICE-HC18.txt', licence: 'CC-BY-4.0',
    datasetNotice: 'Data: HC18 (van den Heuvel dkk., 2018), CC BY 4.0. USG 2D kepala janin (OBSTETRI, bukan USG pelvis ginekologis) dengan kontur kepala dari sonografer. Kalibrasi spasi piksel dari CSV resmi. Review medis belum selesai: hanya review privat.',
    spacing: c => { const row = fs.readFileSync(path.join(RAW, 'hc18/training_set_pixel_size_and_HC.csv'), 'utf8').split('\n').find(l => l.startsWith(c.id + '_HC.png,')); const [, ps, hc] = row.split(','); return { mm: Number(ps), hc: Number(hc) }; },
    filled: false, // annotation is an ellipse outline: the interior is filled from the outside
    explain: c => 'Kontur kepala janin dari anotasi HC18. Lingkar kepala referensi: ' + c.hc.toFixed(1) + ' mm.',
  },
};

export function prepareImage2d(studio) {
  const S = SOURCES[studio]; if (!S) throw Error('Unknown studio ' + studio);
  const OUT = path.join(BUILD, studio);
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, 'data'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'server'), { recursive: true });
  const outputs = {}, inputs = {}, images = [], items = [], validation = [];
  S.cases.forEach((c, n) => {
    const imgBuf = fs.readFileSync(path.join(S.raw, c.image)), maskBuf = fs.readFileSync(path.join(S.raw, c.mask));
    inputs[c.image] = sha(imgBuf); inputs[c.mask] = sha(maskBuf);
    const img = decodePng(imgBuf), mask = decodePng(maskBuf);
    if (img.w !== mask.w || img.h !== mask.h) throw Error('Mask size differs for ' + c.id);
    let bin = Uint8Array.from(mask.px, v => (v > 127 ? 1 : 0));
    if (!S.filled) { // fill the closed outline: everything not reachable from the border (and not on the line) is interior
      const outside = new Uint8Array(bin.length), stack = [];
      for (let x = 0; x < img.w; x++) stack.push(x, (img.h - 1) * img.w + x); for (let y = 0; y < img.h; y++) stack.push(y * img.w, y * img.w + img.w - 1);
      while (stack.length) { const i = stack.pop(); if (outside[i] || bin[i]) continue; outside[i] = 1; const x = i % img.w, y = (i / img.w) | 0;
        if (x > 0) stack.push(i - 1); if (x < img.w - 1) stack.push(i + 1); if (y > 0) stack.push(i - img.w); if (y < img.h - 1) stack.push(i + img.w); }
      bin = Uint8Array.from(bin, (v, i) => (v || !outside[i] ? 1 : 0));
    }
    const comps = components(bin, img.w, img.h).filter(k => k.length >= 200);
    if (!comps.length) throw Error('Empty annotation for ' + c.id);
    const regions = comps.slice(0, 3).map((k, r) => {
      // Trace a 1-pixel dilation so that boundary pixel centres of thin regions fall inside the polygon.
      const grown = new Set(k); for (const i of k) { const x = i % img.w; if (x > 0) grown.add(i - 1); if (x < img.w - 1) grown.add(i + 1); if (i >= img.w) grown.add(i - img.w); if (i < img.w * (img.h - 1)) grown.add(i + img.w); }
      const polygon = tracePolygon([...grown], img.w, img.h), cov = coverage(polygon, k, img.w);
      if (cov < 0.97) throw Error(`Polygon covers only ${(cov * 100).toFixed(1)}% of region ${c.id}/${r}`);
      return { id: S.regionPrefix + '-' + (n + 1) + '-' + (r + 1), label: S.label, polygon, areaPx: k.length, coverage: +cov.toFixed(4) };
    });
    const cal = S.spacing(c), file = 'data/image-' + (n + 1) + '.png', ann = 'data/annotations-' + (n + 1) + '.json';
    outputs[file] = encodePng(img.w, img.h, (x, y) => img.px[y * img.w + x]);
    outputs[ann] = Buffer.from(JSON.stringify({ schema: 'medcoel.annotations.v1', source: S.attribution.split(':')[0] + ' (case ' + c.id + ')', regions: regions.map(({ id, label, polygon }) => ({ id, label, polygon })) }));
    images.push({ id: 'img' + (n + 1), title: 'Kasus ' + (n + 1), file, pixelSpacingMm: cal ? [cal.mm, cal.mm] : null, annotations: ann });
    items.push({ id: studio + '-find-' + (n + 1), prompt: { kind: 'find-region', imageId: 'img' + (n + 1), text: 'Klik di dalam: ' + S.label.replace(/ \(.*\)$/, '').toLowerCase() + '.' }, options: [],
      answer: { polygon: regions[0].polygon }, canonical: S.label, explanation: S.explain(cal ? { ...c, ...cal } : c) });
    validation.push({ case: c.id, size: [img.w, img.h], regions: regions.map(r => ({ areaPx: r.areaPx, vertices: r.polygon.length, coverage: r.coverage })), pixelSpacingMm: cal ? cal.mm : null, referenceHcMm: cal ? cal.hc : undefined });
  });
  outputs['data/dataset.json'] = Buffer.from(JSON.stringify({ schema: 'medcoel.dataset.v1', status: 'PRIVATE_REVIEW', source: S.attribution.split(' Licensed')[0], notice: S.datasetNotice,
    images, guidedRegion: { id: S.regionPrefix + '-1-1', label: S.label } }, null, 1));
  outputs['data/' + S.noticeName] = Buffer.from(S.attribution + '\n\nChanges by MEDCOEL: selected images re-encoded as greyscale PNG without metadata chunks; reference masks/contours converted to polygons (boundary tracing, Douglas-Peucker 1.5 px). Adapted data shared under ' + S.licence.replace('CC-BY-', 'CC BY ') + '.\n');
  outputs['server/challenge.json'] = Buffer.from(JSON.stringify({ schema: 'medcoel.challenge.v1', source: S.attribution.split(':')[0], medicalReview: 'pending', count: items.length, items }, null, 1));
  for (const [rel, b] of Object.entries(outputs)) fs.writeFileSync(path.join(OUT, rel), b);
  const provenance = { schema: 'medcoel.provenance.v1', studio, generatedAt: new Date().toISOString(), tool: 'apps/studios/tools/prepare-image2d.mjs', source: { inputs, licence: S.licence },
    outputs: Object.fromEntries(Object.entries(outputs).map(([k, b]) => [k, { bytes: b.length, sha256: sha(b) }])), validation, privacy: 'Pixel data only; PNG metadata chunks dropped; no patient metadata exists in the source subset.', medicalReview: 'pending' };
  fs.writeFileSync(path.join(OUT, 'provenance.json'), JSON.stringify(provenance, null, 2));
  return provenance;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const p = prepareImage2d(process.argv[2] || 'chest-xray'); console.log(JSON.stringify(p.validation)); console.log(Object.fromEntries(Object.entries(p.outputs).map(([k, v]) => [k, v.bytes]))); }
