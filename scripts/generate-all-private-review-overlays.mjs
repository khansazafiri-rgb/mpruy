#!/usr/bin/env node
/**
 * MEDCOEL LOCAL-ONLY review hub. This never serves a public route, grants rights,
 * or sends patient data to GitHub. Only private verified assets are rendered.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { generatePrivateFracAtlasReview } from './private-fracatlas-review.mjs';
import {
  renderPrivateOverlay, generatePrivateChestXrayOverlays
} from './generate-private-chest-xray-overlays.mjs';
import {
  renderPrivateSpineSlices, renderPrivateEcgSvg
} from './private-multimodal-review-core.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const BUILD = path.join(ROOT, 'local-data/studio-resources/build');
const OUT = path.join(ROOT, 'local-data/studio-resources/review-overlays');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const html = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function safeLocal(location) {
  const rel = path.relative(ROOT, location);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw Error('REVIEW_OUTSIDE_LOCAL_WORKSPACE');
  let cursor = ROOT;
  for (const part of rel.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    const item = fs.lstatSync(cursor, { throwIfNoEntry: false });
    if (item?.isSymbolicLink()) throw Error('REVIEW_UNSAFE_SYMLINK');
  }
}
function writePrivate(file, content) {
  safeLocal(path.dirname(file)); safeLocal(file);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  safeLocal(file);
  fs.writeFileSync(file, content, { mode: 0o600 });
}
function verifiedStudio(studio, registry) {
  const root = path.join(BUILD, studio), provenancePath = path.join(root, 'provenance.json');
  safeLocal(root); safeLocal(provenancePath);
  if (!fs.existsSync(provenancePath)) throw Error('REVIEW_PRIVATE_BUILD_UNAVAILABLE');
  const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
  if (provenance.schema !== 'medcoel.provenance.v1' || provenance.studio !== studio ||
      !provenance.outputs || typeof provenance.outputs !== 'object') {
    throw Error('REVIEW_INCORRECT_PROVENANCE');
  }
  const read = rel => {
    if (!/^(data\/[A-Za-z0-9._/-]+)$/.test(rel) || rel.includes('..') || rel.includes('//'))
      throw Error('REVIEW_UNSAFE_ASSET_PATH');
    const filename = path.join(root, rel);
    safeLocal(filename);
    const matches = registry.assets.filter(a =>
      a.id.startsWith(studio + '.') && !a.sourceFile && a.path === rel);
    if (matches.length !== 1 || !provenance.outputs[rel]) throw Error('REVIEW_ASSET_UNPINNED:' + rel);
    const bytes = fs.readFileSync(filename);
    const asset = matches[0], prov = provenance.outputs[rel];
    if (bytes.length !== asset.bytes || sha(bytes) !== asset.sha256 ||
        bytes.length !== prov.bytes || sha(bytes) !== prov.sha256) {
      throw Error('REVIEW_SOURCE_HASH_MISMATCH:' + rel);
    }
    return bytes;
  };
  return { read };
}
function pageShell(title, cards, note) {
  return [
    '<!doctype html><html lang="id"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>' + html(title) + '</title>',
    '<style>',
    ':root{color-scheme:dark;font-family:system-ui,sans-serif;background:#0d1322;color:#e9f1ff}',
    'body{max-width:1300px;margin:0 auto;padding:24px}',
    'a{color:#8ec9ff}h1{font-size:27px}p{line-height:1.5;color:#c8d6e9}',
    '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,430px),1fr));gap:20px}',
    'article{padding:18px;border:1px solid #334765;border-radius:15px;background:#172239}',
    '.comparison{position:relative;background:#000;border-radius:8px;overflow:hidden;line-height:0}',
    '.comparison img{display:block;width:100%;height:auto}',
    '.comparison .overlay{position:absolute;inset:0}',
    'input[type=range]{width:73%;vertical-align:middle;accent-color:#ef646e}',
    'article.single img{width:100%;max-width:100%;background:white;border-radius:7px}',
    '.warning{border-left:4px solid #ef8e8e;padding-left:14px;margin:20px 0}',
    '</style></head><body>',
    '<p><a href="../index.html">Kembali ke Review Hub</a></p>',
    '<h1>' + html(title) + '</h1>',
    '<p class="warning">PRIVAT · HUMAN_REVIEW_REQUIRED. ' + html(note) +
    ' Tidak boleh diunggah ke GitHub atau server publik.</p>',
    '<div class="grid">' + cards.join('\n') + '</div>',
    '<script>document.querySelectorAll("input[data-layer]").forEach(function(s){',
    's.addEventListener("input",function(){',
    'document.getElementById(s.dataset.layer).style.opacity=s.value/100;',
    'document.getElementById(s.dataset.layer+"-pct").textContent=s.value+"%";',
    '});});</script></body></html>'
  ].join('\n');
}
function compareCard(id, title, originalUrl, overlayUrl, caption) {
  return [
    '<article><h2>' + html(title) + '</h2><p>' + html(caption) + '</p>',
    '<div class="comparison">',
    '<img src="' + html(originalUrl) + '" alt="Citra tanpa warna label">',
    '<img class="overlay" id="' + html(id) + '" src="' + html(overlayUrl) +
    '" alt="Citra dengan label sumber">',
    '</div><p><label>Overlay <input data-layer="' + html(id) +
    '" type="range" min="0" max="100" value="100"></label> <span id="' +
    html(id) + '-pct">100%</span></p>',
    '</article>'
  ].join('');
}

export function generatePelvisPrivateReview(registry) {
  const { read } = verifiedStudio('pelvis-ultrasound', registry);
  const frames = [];
  for (let n = 1; n <= 4; n++) {
    const image = read('data/image-' + n + '.png');
    const annotation = JSON.parse(read('data/annotations-' + n + '.json').toString('utf8'));
    frames.push(renderPrivateOverlay(image, annotation));
  }
  const target = path.join(OUT, 'pelvis-ultrasound');
  const cards = [];
  for (let n = 1; n <= 4; n++) {
    writePrivate(path.join(target, 'image-' + n + '-overlay.png'), frames[n - 1].png);
    cards.push(compareCard('pelvis-' + n, 'USG Kepala Janin · Kasus ' + n,
      '../../build/pelvis-ultrasound/data/image-' + n + '.png',
      'image-' + n + '-overlay.png',
      frames[n - 1].regions + ' kontur dari anotasi HC18 · ' +
      frames[n - 1].width + '×' + frames[n - 1].height + ' px'));
  }
  writePrivate(path.join(target, 'index.html'), pageShell(
    'Pelvis Ultrasound · HC18 (OBSTETRI, kepala janin)', cards,
    'Area merah berasal dari kontur kepala janin sumber, BUKAN temuan kelainan pelvis ginekologis. Cek kalibrasi, posisi kontur, dan burned-in data dengan reviewer.'
  ));
  return { images: 4, kind: 'fetal-head-contour' };
}

export function generateSpinePrivateReview(registry) {
  const { read } = verifiedStudio('spine-mri', registry);
  const mri = read('data/t1.nii.gz'), mask = read('data/labels-lpba40.nii.gz');
  const structures = JSON.parse(read('data/labels.json').toString('utf8'));
  const frames = renderPrivateSpineSlices(mri, mask, structures);
  const target = path.join(OUT, 'spine-mri'), cards = [];
  for (const frame of frames) {
    writePrivate(path.join(target, frame.name + '-original.png'), frame.original);
    writePrivate(path.join(target, frame.name + '-overlay.png'), frame.overlay);
    cards.push(compareCard('spine-' + frame.name, frame.name + ' · voxel index ' + frame.index,
      frame.name + '-original.png', frame.name + '-overlay.png',
      frame.width + '×' + frame.height + ' px · ' + frame.markedPixels + ' voxel berlabel pada irisan'));
  }
  writePrivate(path.join(target, 'index.html'), pageShell(
    'Spine MRI · SPIDER · segmentasi vertebra / diskus / kanalis', cards,
    'Potongan sagittal, coronal dan axial berada pada INDEX voxel, belum diorientasikan sebagai view radiologi diagnostik. Label dari SPIDER, BUKAN atlas LPBA40 meskipun nama file legacy mengandung lpba40.'
  ));
  return { images: frames.length, kind: 'nifti-orthogonal-slice-labels' };
}

export function generateEcgPrivateReview(registry) {
  const { read } = verifiedStudio('ecg', registry);
  const target = path.join(OUT, 'ecg'), cards = [];
  // Read and verify the exact registered label file for completeness;
  // no dataset diagnosis/Challenge answers are published into SVG.
  const labels = JSON.parse(read('data/labels.json').toString('utf8'));
  if (labels.schema !== 'medcoel.ecg-labels.v1') throw Error('REVIEW_INVALID_ECG_LABEL_TABLE');
  const svgs = [];
  for (let n = 1; n <= 6; n++) {
    const id = 'c' + n;
    const wave = JSON.parse(read('data/cases/' + id + '.json').toString('utf8'));
    if (wave.caseId !== id) throw Error('REVIEW_ECG_CASE_MISMATCH');
    svgs.push(renderPrivateEcgSvg(wave));
  }
  for (let n = 1; n <= 6; n++) {
    writePrivate(path.join(target, 'case-c' + n + '.svg'), svgs[n - 1]);
    cards.push('<article class="single"><h2>ECG Kasus ' + n + '</h2>' +
      '<p>12 lead · 2.5 detik pertama / sadapan · 25 mm/s · 10 mm/mV</p>' +
      '<img src="case-c' + n + '.svg" alt="Grafik ECG 12 sadapan kasus ' + n + '"></article>');
  }
  writePrivate(path.join(target, 'index.html'), pageShell(
    'ECG · PTB-XL · visualisasi 12-lead', cards,
    'Grafik merepresentasikan sampel, gain dan baseline sumber. Bukan overlay diagnosis; label AFIB/AFLT/BBB dan kunci soal menunggu reviewer medis.'
  ));
  return { images: 6, kind: 'twelve-lead-waveform' };
}

function dashboard(catalog, results) {
  const byId = new Map(results.map(x => [x.studio, x]));
  const blocks = catalog.studios.filter(x => !x.internal).map(s => {
    const result = byId.get(s.id);
    const state = result ? result.status
      : s.id === 'chest-ct' ? 'QUARANTINED_TCIA_SOURCE'
      : s.id === 'brain-mri' ? 'BLOCKED_LPBA40_OR_ALTERNATE_REVIEW_PENDING'
      : s.id.endsWith('-anatomy') ? '3D_VIEWER_AND_RIGHTS_REVIEW_PENDING'
      : 'DATA_OR_RENDERER_NOT_READY';
    const detail = result?.error ? ' — ' + result.error : '';
    const link = ['PRIVATE_PREVIEW_READY', 'PRIVATE_CANDIDATE_REVIEW_READY'].includes(result?.status)
      ? '<a href="' + html(s.id) + '/index.html">Lihat visualisasi</a>' : 'Belum bisa dirender';
    return '<tr><td><strong>' + html(s.title || s.id) + '</strong><br><small>' +
      html(s.id) + '</small></td><td>' + html(state + detail) + '</td><td>' + link + '</td></tr>';
  });
  return [
    '<!doctype html><html lang="id"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>MEDCOEL Private Clinical Review Hub</title>',
    '<style>:root{color-scheme:dark;font:16px system-ui,sans-serif;background:#101727;color:#eff4ff}',
    'body{max-width:1100px;margin:0 auto;padding:32px}h1{font-size:30px}',
    'p{line-height:1.55;color:#c9d9ed}a{color:#8bcaff}',
    'table{width:100%;border-collapse:collapse}td,th{padding:12px;text-align:left;border-bottom:1px solid #34445a}',
    'small{color:#9bb0c9}tr:hover{background:#1a2940}',
    '.warn{border-left:4px solid #fa9b95;padding-left:16px;margin:20px 0}</style></head><body>',
    '<h1>MEDCOEL · Private Clinical Review Hub</h1>',
    '<p class="warn">Hanya file <strong>lokal</strong>. Pratinjau teknis ini bukan bukti',
    ' persetujuan medis, privasi, terminologi, hak komersial, atau rilis. Seluruh status release tetap terkunci.</p>',
    '<p>X-ray & USG: poligon sumber · Spine MRI: label NIfTI pada tiga irisan · ECG: waveform 12-lead. MSK X-ray: kandidat FracAtlas, hanya untuk review privat dan belum terdaftar sebagai aset rilis.',
    ' Chest CT ditahan selama karantina TCIA. Anatomy 3D dan studio tanpa data perlu renderer serta rights review tersendiri.</p>',
    '<table><thead><tr><th>Clinical Studio</th><th>Status</th><th>Pratinjau privat</th></tr></thead><tbody>',
    ...blocks,
    '</tbody></table></body></html>'
  ].join('\n');
}

export async function generateAllPrivateOverlays() {
  safeLocal(BUILD); safeLocal(OUT);
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'licensing/resources.v1.json'), 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/studios/catalog.v1.json'), 'utf8'));
  const tasks = [
    ['chest-xray', () => generatePrivateChestXrayOverlays()],
    ['pelvis-ultrasound', () => generatePelvisPrivateReview(registry)],
    ['spine-mri', () => generateSpinePrivateReview(registry)],
    ['ecg', () => generateEcgPrivateReview(registry)],
    ['msk-xray', () => generatePrivateFracAtlasReview()]
  ];
  const results = [];
  for (const [studio, run] of tasks) {
    try {
      const result = await run();
      results.push({ studio, status: result.status || 'PRIVATE_PREVIEW_READY', kind: result.kind || 'source-polygon', images: result.images?.length || result.images });
    } catch (e) {
      const isMissingCandidate = studio === 'msk-xray' &&
        (e.code === 'ENOENT' || e.message === 'FRAC_PRIVATE_ACQUISITION_NOT_RECORDED');
      results.push({ studio, status: isMissingCandidate ? 'CANDIDATE_PRIVATE_DATA_PENDING'
        : e.message === 'REVIEW_PRIVATE_BUILD_UNAVAILABLE' ? 'PRIVATE_BUILD_MISSING'
        : 'REVIEW_FAILED_CLOSED',
        error: isMissingCandidate ? 'FracAtlas private archive not yet available'
          : String(e.message).slice(0, 120) });
    }
  }
  writePrivate(path.join(OUT, 'index.html'), dashboard(catalog, results));
  writePrivate(path.join(OUT, 'review-hub-status.json'), JSON.stringify({
    schema: 'medcoel.private-review-hub.v1', medicalApproval: false,
    privacyApproval: false, releaseApproved: false, totalStudios: catalog.studios.filter(s => !s.internal).length,
    results
  }, null, 2) + '\n');
  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await generateAllPrivateOverlays();
  console.table(result);
  console.log('Private dashboard: local-data/studio-resources/review-overlays/index.html');
  if (result.some(x => x.status === 'REVIEW_FAILED_CLOSED')) process.exitCode = 1;
}
