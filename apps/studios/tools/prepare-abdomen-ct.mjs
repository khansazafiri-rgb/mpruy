#!/usr/bin/env node
// Abdomen CT data: ONE labelled CT case (amos_0004) of AMOS 2022 (Zenodo 10.5281/zenodo.7262581), members fetched by HTTP
// Range from the official amos22.zip (CRC verified). LICENCE DISCREPANCY: the Zenodo record says CC BY 4.0, the archive's own
// dataset.json says CC-BY-SA 4.0 -> REVIEW_REQUIRED (the stricter SA terms are applied to this adaptation meanwhile).
// The image header is kept bit-exact for geometry (qform/sform/pixdim) but descrip/aux_file/db_name are cleared
// (descrip carries an acquisition time) and no header extension is written. Voxel data are unchanged.
// Kidney labels (2, 3) are WITHHELD from the shipped label map pending the owner's quarantine decision on kidney content.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const RAW = path.join(REPO, 'local-data/studio-resources/raw/amos/amos22');
const OUT = path.join(REPO, 'local-data/studio-resources/build/abdomen-ct');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const EXPECT = { 'imagesTr/amos_0004.nii.gz': '0c65994c6c53182ef0fe8e1d86e597b843cb99db2dc1ac8f27876e34319ca9d9', 'labelsTr/amos_0004.nii.gz': 'cb8bac8e724ccff8842285f460c0d5ab361aa15c4bab25bd371a25fef9cf79b3', 'dataset.json': '02db984f724dba8d19c694c89bd98b0d36a5da5c8ee136c45c6174f81a169d49' };
const WITHHELD = new Set([2, 3]);
// Source label -> display name. Two source labels are spelled idiosyncratically ("arota", "postcava"); the mapping is shown
// with the source label so a terminology reviewer can confirm it. Indonesian/Latin names follow terminology review.
const NAMES = { 1: 'Spleen', 4: 'Gallbladder', 5: 'Oesophagus', 6: 'Liver', 7: 'Stomach', 8: 'Aorta (source label "arota")', 9: 'Inferior vena cava (source label "postcava")', 10: 'Pancreas', 11: 'Right adrenal gland', 12: 'Left adrenal gland', 13: 'Duodenum', 14: 'Urinary bladder', 15: 'Prostate/uterus (source label)' };
const ATTRIBUTION = 'AMOS 2022 abdominal multi-organ dataset: Ji Y. et al., AMOS: A Large-Scale Abdominal Multi-Organ Benchmark for Versatile Medical Image Segmentation, NeurIPS 2022 Datasets and Benchmarks, arXiv:2206.08023; data doi:10.5281/zenodo.7262581. Licence: the Zenodo record states CC BY 4.0; the archive\'s dataset.json states CC-BY-SA 4.0 (under review; this adaptation is offered under CC BY-SA 4.0).';

function readNifti(buf) {
  const h = buf.subarray(0, 348), dims = [1, 2, 3].map(i => h.readInt16LE(40 + 2 * i)), dt = h.readInt16LE(70), off = Math.round(h.readFloatLE(108));
  if (h.readInt32LE(0) !== 348 || h.readInt16LE(40) !== 3) throw Error('Unexpected NIfTI');
  const n = dims[0] * dims[1] * dims[2];
  const read = { 2: i => buf[off + i], 4: i => buf.readInt16LE(off + 2 * i), 512: i => buf.readUInt16LE(off + 2 * i) }[dt];
  if (!read) throw Error('Unsupported datatype ' + dt);
  // Affine: sform when sform_code > 0, otherwise the qform (quaternion + pixdim + qfac), per the NIfTI-1 standard.
  let sform = [0, 1, 2].map(r => [0, 1, 2, 3].map(c => h.readFloatLE(280 + r * 16 + c * 4)));
  const qform = (() => {
    const [b, c, d] = [256, 260, 264].map(o => h.readFloatLE(o)), a = Math.sqrt(Math.max(0, 1 - b * b - c * c - d * d));
    const R = [[a * a + b * b - c * c - d * d, 2 * (b * c - a * d), 2 * (b * d + a * c)], [2 * (b * c + a * d), a * a + c * c - b * b - d * d, 2 * (c * d - a * b)], [2 * (b * d - a * c), 2 * (c * d + a * b), a * a + d * d - c * c - b * b]];
    const qfac = h.readFloatLE(76) < 0 ? -1 : 1, px = [1, 2, 3].map(i => h.readFloatLE(76 + 4 * i)); px[2] *= qfac;
    return R.map((row, r) => [...row.map((v, k) => v * px[k]), h.readFloatLE(268 + 4 * r)]);
  })();
  if (h.readInt16LE(254) <= 0) { if (h.readInt16LE(252) <= 0) throw Error('NIfTI without qform or sform'); sform = qform; }
  else if (h.readInt16LE(252) > 0 && qform.some((r, i) => r.some((v, j) => Math.abs(v - sform[i][j]) > 1e-3))) throw Error('qform and sform disagree');
  return { header: Buffer.from(buf.subarray(0, 352)), dims, dt, off, n, read, sform, pixdim: [1, 2, 3].map(i => h.readFloatLE(76 + 4 * i)), slope: h.readFloatLE(112), inter: h.readFloatLE(116), data: buf.subarray(off) };
}
function cleanHeader(h, datatype, bitpix) {
  const c = Buffer.from(h); c.fill(0, 4, 14); c.fill(0, 14, 32); c.fill(0, 148, 228); c.fill(0, 228, 252); c.fill(0, 328, 344); c.fill(0, 348, 352);
  c.writeFloatLE(352, 108); if (datatype) { c.writeInt16LE(datatype, 70); c.writeInt16LE(bitpix, 72); c.writeFloatLE(1, 112); c.writeFloatLE(0, 116); }
  return c;
}

export function prepare() {
  const files = Object.fromEntries(Object.entries(EXPECT).map(([f, d]) => { const b = fs.readFileSync(path.join(RAW, f)); if (sha(b) !== d) throw Error('Digest mismatch ' + f); return [f, b]; }));
  const meta = JSON.parse(files['dataset.json']);
  const img = readNifti(zlib.gunzipSync(files['imagesTr/amos_0004.nii.gz'])), lab = readNifti(zlib.gunzipSync(files['labelsTr/amos_0004.nii.gz']));
  if (img.dims.join() !== lab.dims.join() || img.sform.some((r, i) => r.some((v, j) => Math.abs(v - lab.sform[i][j]) > 1e-3))) throw Error('Label grid differs from image');
  if (img.slope !== 1 || img.inter !== 0 || img.dt !== 4) throw Error('Expected int16 HU without rescale');
  const [X, Y] = img.dims, labels = Buffer.alloc(img.n), acc = {};
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < img.n; i++) {
    const hu = img.read(i); if (hu < min) min = hu; if (hu > max) max = hu;
    const v = lab.read(i); if (!v) continue;
    if (v > 15) throw Error('Unknown label ' + v);
    const a = acc[v] || (acc[v] = { n: 0, x: 0, y: 0, z: 0, hu: 0 }); a.n++; a.x += i % X; a.y += Math.floor(i / X) % Y; a.z += Math.floor(i / (X * Y)); a.hu += hu;
    if (!WITHHELD.has(v)) labels[i] = v;
  }
  // Plausibility (fails closed): liver and spleen soft tissue, aorta brighter or similar, air outside the body.
  const meanHu = v => acc[v] ? acc[v].hu / acc[v].n : null;
  if (!(meanHu(6) > 20 && meanHu(6) < 200 && meanHu(1) > 20 && meanHu(1) < 200 && min <= -900)) throw Error('HU plausibility failed');
  // Left/right check from the affine. NIfTI RAS+: +X = patient RIGHT, so the spleen and the left adrenal (12) must have a
  // smaller X than the liver and the right adrenal (11). (Cross-checked on 8 AMOS training cases, all consistent.)
  const ras = v => { const a = acc[v]; const c = [a.x / a.n, a.y / a.n, a.z / a.n]; return img.sform.map(r => r[0] * c[0] + r[1] * c[1] + r[2] * c[2] + r[3]); };
  const lr = { spleenX: ras(1)[0], liverX: ras(6)[0], leftAdrenalX: acc[12] ? ras(12)[0] : null, rightAdrenalX: acc[11] ? ras(11)[0] : null };
  if (!(lr.spleenX < lr.liverX) || (lr.leftAdrenalX !== null && lr.rightAdrenalX !== null && !(lr.leftAdrenalX < lr.rightAdrenalX))) throw Error('Laterality check failed: ' + JSON.stringify(lr));
  const present = Object.keys(acc).map(Number).filter(v => !WITHHELD.has(v) && acc[v].n >= 200).sort((a, b) => a - b);
  for (const v of present) if (meta.labels[String(v)] === undefined) throw Error('Label not in source table ' + v);
  const palette = [[230, 120, 120], [120, 200, 120], [120, 160, 230], [230, 200, 100], [200, 120, 220], [120, 220, 220], [240, 160, 90], [170, 170, 250], [250, 130, 180], [150, 230, 150], [230, 230, 140], [140, 190, 240], [220, 150, 150]];
  const structures = present.map((v, k) => ({ id: v, source: 'AMOS label ' + v + ' "' + meta.labels[String(v)] + '"', nameEn: NAMES[v], side: v === 11 ? 'right' : v === 12 ? 'left' : 'midline', rgb: palette[k % palette.length] }));
  // Challenge: interior voxel nearest each organ centroid; options = the answer + 3 other present organs (deterministic).
  const point = v => { const a = acc[v], c = [a.x / a.n, a.y / a.n, a.z / a.n]; let best = null, bd = Infinity;
    for (let i = 0; i < img.n; i++) { if (labels[i] !== v) continue; const p = [i % X, Math.floor(i / X) % Y, Math.floor(i / (X * Y))]; const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; best = p; } }
    return img.sform.map(r => +(r[0] * best[0] + r[1] * best[1] + r[2] * best[2] + r[3]).toFixed(1)); };
  const large = present.filter(v => acc[v].n >= 3000);
  const items = large.map((v, k) => {
    const others = large.filter(x => x !== v); const opts = [v, others[k % others.length], others[(k + 2) % others.length], others[(k + 4) % others.length]].filter((x, i, a) => a.indexOf(x) === i);
    const order = opts.map((x, i) => [((v * 7 + i * 13) % 17), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    return { id: 'abd-' + v, prompt: { kind: 'crosshair-structure', mm: point(v), text: 'Organ apa yang berada di crosshair?' }, options: order.map(x => NAMES[x]), answer: { index: order.indexOf(v) }, canonical: NAMES[v],
      explanation: NAMES[v] + ' menurut segmentasi referensi AMOS pada kasus ini (CT abdomen). Terminologi Indonesia/Latin menunggu review.' };
  });
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, 'data'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'server'), { recursive: true });
  const gz = b => zlib.gzipSync(b, { level: 9, mtime: 0 });
  const target = present.includes(6) ? 6 : present[0];
  const outputs = {
    'data/ct.nii.gz': gz(Buffer.concat([cleanHeader(img.header), img.data.subarray(0, img.n * 2)])),
    'data/labels.nii.gz': gz(Buffer.concat([cleanHeader(img.header, 2, 8), labels])), // image header: identical geometry by construction
    'data/labels.json': Buffer.from(JSON.stringify({ schema: 'medcoel.labels.v1', source: 'AMOS 2022 reference segmentation (case amos_0004)', terminologyReview: 'pending',
      note: 'Kidney labels (source 2, 3) are withheld pending an owner decision. nameEn maps the source label table; two source spellings are shown verbatim.', structures }, null, 1)),
    'data/dataset.json': Buffer.from(JSON.stringify({ schema: 'medcoel.dataset.v1', status: 'PRIVATE_REVIEW', source: 'AMOS 2022 (Zenodo 10.5281/zenodo.7262581); licence under review (CC BY 4.0 vs CC-BY-SA 4.0)',
      notice: 'Data: AMOS 2022 (Ji dkk.), satu kasus CT abdomen dengan segmentasi organ referensi. Lisensi masih ditinjau (Zenodo: CC BY 4.0; berkas dataset: CC BY-SA 4.0). Label ginjal sengaja tidak ditampilkan menunggu keputusan pemilik. Review medis belum selesai: hanya review privat.',
      image: 'data/ct.nii.gz', labels: 'data/labels.nii.gz', labelTable: 'data/labels.json', window: [-160, 240], guidedTarget: target }, null, 1)),
    'data/NOTICE-AMOS.txt': Buffer.from(ATTRIBUTION + '\n\nChanges by MEDCOEL: one CT case and its label map; NIfTI header text fields cleared (geometry unchanged); label map stored as 8-bit with kidney labels (2, 3) removed. No resampling.\n'),
    'server/challenge.json': Buffer.from(JSON.stringify({ schema: 'medcoel.challenge.v1', source: 'AMOS 2022', medicalReview: 'pending', count: Math.min(items.length, 10), items }, null, 1)),
  };
  for (const [rel, b] of Object.entries(outputs)) fs.writeFileSync(path.join(OUT, rel), b);
  const provenance = { schema: 'medcoel.provenance.v1', studio: 'abdomen-ct', generatedAt: new Date().toISOString(), tool: 'apps/studios/tools/prepare-abdomen-ct.mjs',
    source: { doi: '10.5281/zenodo.7262581', members: Object.fromEntries(Object.entries(EXPECT).map(([k, v]) => ['amos22.zip:amos22/' + k, v])), licence: 'REVIEW_REQUIRED (CC-BY-4.0 record vs CC-BY-SA-4.0 dataset.json)' },
    outputs: Object.fromEntries(Object.entries(outputs).map(([k, b]) => [k, { bytes: b.length, sha256: sha(b) }])),
    validation: { dims: img.dims, spacingMm: img.pixdim, huRange: [min, max], meanHu: Object.fromEntries(present.map(v => [v, Math.round(meanHu(v))])), laterality: lr, organs: present.length, withheld: [...WITHHELD], challengeItems: items.length, headerTextCleared: true },
    privacy: 'Voxel data only; source NIfTI descrip (acquisition time) cleared; labeled_data_meta CSV (age/sex/scanner) not downloaded or shipped.', medicalReview: 'pending' };
  fs.writeFileSync(path.join(OUT, 'provenance.json'), JSON.stringify(provenance, null, 2));
  return provenance;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const p = prepare(); console.log(JSON.stringify(p.validation, null, 1)); console.log(Object.fromEntries(Object.entries(p.outputs).map(([k, v]) => [k, v.bytes]))); }
