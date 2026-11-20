// Brain MRI Studio: independent application (own build, own release). Multiplanar MRI with a validated label overlay.
import '../shell/studio.css';
import { connectHost } from '../shell/bridge.js';
import { el, studioFrame } from '../shell/ui.js';
import { createGuide } from '../shell/guided.js';
import { createChallengeClient, createScore } from '../shell/challenge.js';
import { createVolumeViewer } from '../engines/volume/viewer.js';
import { parseNifti, sameGrid } from '../engines/volume/nifti.js';
import { gunzipToArrayBuffer } from '../engines/volume/gzip.js';

const STUDIO = 'brain-mri';
connectHost({ studioId: STUDIO, alsoAccept: ['test-' + STUDIO], onLaunch: (launch, post) => start(launch, post).catch(err => fail(err, post)) });

function fail(err, post) {
  console.error(err);
  document.body.append(el('p', { class: 'bad', role: 'alert' }, 'Studio tidak dapat dimuat: ' + (err.message || 'galat')));
  post('studio.error', { code: /dataset/i.test(err.message) ? 'dataset-unavailable' : 'internal', message: String(err.message || '').slice(0, 200) });
}

async function getJson(url) { const r = await fetch(url, { credentials: 'same-origin' }); if (!r.ok) throw Error('dataset unavailable: ' + url); return r.json(); }
async function getVolume(url) { const r = await fetch(url, { credentials: 'same-origin' }); if (!r.ok) throw Error('dataset unavailable: ' + url); return parseNifti(await gunzipToArrayBuffer(await r.arrayBuffer())); }

async function start(launch, post) {
  const dataset = await getJson('./data/dataset.json');
  const ui = studioFrame({ title: 'Brain MRI', modality: 'MRI', mode: launch.mode, dataNotice: dataset.notice });
  const canvas = el('canvas', { 'aria-label': 'Tampilan MRI multiplanar. Klik untuk memindahkan crosshair; seret untuk menggeser; scroll untuk berpindah irisan.' });
  const stage = el('div', { style: 'position:absolute;inset:0' }, canvas);
  ui.workspace.append(stage);
  const readout = el('div', { class: 'readout', 'data-testid': 'readout' }, '—');
  const challenge = launch.mode === 'challenge';
  let structures = [], overlayOpacity = challenge ? 0 : 0.35;
  const viewer = await createVolumeViewer(canvas, { onLocation: s => { render(s); guide?.update({ ...s, overlayOpacity }); paintGuide(); } });
  ui.status('Memuat volume MRI…');
  const volumes = [{ url: './' + dataset.image, colormap: 'gray', name: 't1.nii.gz' }];
  if (!challenge && dataset.labels) volumes.push({ url: './' + dataset.labels, colormap: 'gray', opacity: overlayOpacity, name: 'labels.nii.gz' });
  await viewer.load(volumes);
  if (dataset.window) viewer.setWindow(0, dataset.window[0], dataset.window[1]);
  if (!challenge && dataset.labels) {
    const [labelVol, imageVol, table] = await Promise.all([getVolume('./' + dataset.labels), getVolume('./' + dataset.image), getJson('./' + dataset.labelTable)]);
    if (!sameGrid(labelVol, imageVol)) throw Error('Overlay grid differs from image: overlay disabled');
    structures = table.structures;
    viewer.setLabelVolume(labelVol);
    viewer.setLabelColormap(1, structures);
  }
  const nameOf = id => structures.find(s => s.id === id)?.nameEn || '';
  function render(s) {
    readout.textContent = 'RAS (mm): ' + s.mm.map(v => v.toFixed(1)).join(', ') + '\nVoxel: ' + s.vox.join(', ') + '\nIntensitas: ' + (s.value == null ? '—' : Math.round(s.value)) +
      (challenge ? '' : '\nStruktur: ' + (nameOf(s.label) || (s.label ? 'label ' + s.label : 'di luar label atlas')));
    readout.style.whiteSpace = 'pre-line';
  }
  // ---- tools (all modes) ----
  const viewButtons = ['multiplanar', 'axial', 'coronal', 'sagittal', 'render'].map(v => el('button', { type: 'button', 'aria-pressed': String(v === 'multiplanar'), 'data-view': v, onclick: () => { viewer.setView(v); viewButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v))); } }, { multiplanar: 'MPR', axial: 'Aksial', coronal: 'Koronal', sagittal: 'Sagital', render: '3D' }[v]));
  const [lo, hi] = dataset.window || [0, 1000];
  const wMin = el('input', { type: 'range', min: String(lo - (hi - lo)), max: String(hi), value: String(lo), 'aria-label': 'Batas bawah intensitas' });
  const wMax = el('input', { type: 'range', min: String(lo), max: String(hi + (hi - lo)), value: String(hi), 'aria-label': 'Batas atas intensitas' });
  const onWindow = () => viewer.setWindow(0, Number(wMin.value), Number(wMax.value));
  wMin.addEventListener('input', onWindow); wMax.addEventListener('input', onWindow);
  ui.panel.append(el('h2', {}, 'Tampilan'), el('div', { class: 'tools' }, viewButtons),
    el('div', { class: 'tools' }, el('button', { type: 'button', onclick: () => viewer.zoom(1.25) }, 'Zoom +'), el('button', { type: 'button', onclick: () => viewer.zoom(0.8) }, 'Zoom −'),
      el('button', { type: 'button', onclick: () => { viewer.reset(); viewButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === 'multiplanar'))); } }, 'Reset'),
      el('button', { type: 'button', onclick: () => (document.fullscreenElement ? document.exitFullscreen() : document.querySelector('.studio')?.requestFullscreen?.()) }, 'Layar penuh')),
    el('label', {}, 'Kontras: batas bawah', wMin), el('label', {}, 'Kontras: batas atas', wMax), readout);
  if (!challenge && dataset.labels) {
    const op = el('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(overlayOpacity), 'aria-label': 'Opasitas overlay label' });
    op.addEventListener('input', () => { overlayOpacity = Number(op.value); viewer.setOpacity(1, overlayOpacity); guide?.update({ ...viewer.state, overlayOpacity }); paintGuide(); });
    ui.panel.append(el('label', {}, 'Overlay label atlas (opasitas)', op));
  }
  // ---- Guided ----
  let guide = null; const guideBox = el('div', { 'data-testid': 'guide' });
  function paintGuide() {
    if (!guide) return;
    const st = guide.step, done = guide.completed.has(guide.index);
    guideBox.replaceChildren(el('h2', {}, 'Guided · langkah ' + (guide.index + 1) + ' dari ' + dataset.guided.length),
      el('div', { class: 'step' + (done ? ' done' : ''), 'data-step': st.id }, el('strong', {}, st.title), el('p', {}, st.text), el('p', { class: done ? 'ok' : '' }, done ? '✓ Terdeteksi di viewer. ' + (st.done || '') : 'Coba sekarang di viewer.')),
      el('div', { class: 'tools' }, el('button', { type: 'button', onclick: () => { guide.back(); paintGuide(); } }, 'Kembali'),
        el('button', { type: 'button', class: 'primary', disabled: !done || guide.index === dataset.guided.length - 1, onclick: () => { guide.next(); paintGuide(); } }, 'Lanjut')),
      ...(guide.finished ? [el('p', { class: 'ok' }, 'Semua langkah selesai.')] : []));
    if (guide.finished) post('studio.lessonCompleted', { lessonId: 'brain-mri-orientation', steps: dataset.guided.length });
  }
  if (launch.mode === 'guided' && dataset.guided) {
    let baseMoves = 0;
    const checks = {
      'left-hemisphere': s => s.moves > 0 && s.mm[0] < dataset.midlineXmm && (s.label > 0 || s.value > dataset.brainThreshold),
      'sagittal-view': s => s.view === 'sagittal',
      'crosshair-sync': s => { if (s.view !== 'multiplanar') { baseMoves = s.moves; return false; } return s.moves > baseMoves + 1; },
      'find-structure': s => s.label === dataset.guidedTarget,
      'read-overlay': s => s.overlayOpacity >= 0.6 && s.label > 0,
    };
    guide = createGuide(dataset.guided.map(g => ({ ...g, check: checks[g.id] || (() => false) })));
    ui.panel.append(guideBox); paintGuide();
  }
  // ---- Challenge (server-graded) ----
  if (challenge) await runChallenge(ui, viewer, post, launch);
  if (launch.standalone) window.__medcoelStudio = { viewer }; // local preview/test handle only (never set when hosted)
  ui.status(dataset.statusLine || 'Siap.');
  post('studio.ready', { releaseId: launch.releaseId, capabilities: ['slice-navigation', 'mpr', 'window-level', 'structure-identification'] });
}

async function runChallenge(ui, viewer, post, launch) {
  const box = el('div', { 'data-testid': 'challenge' }, el('h2', {}, 'Challenge'));
  ui.panel.append(box);
  if (launch.standalone) { box.append(el('p', {}, 'Challenge dinilai oleh server dan hanya tersedia saat diluncurkan dari MEDCOEL.')); return; }
  const client = createChallengeClient('./'), score = createScore();
  let session;
  try { session = await client.start(); } catch (e) { box.append(el('p', { class: 'bad' }, 'Challenge belum tersedia (' + e.code + ').')); return; }
  let i = 0;
  const show = () => {
    const item = session.items[i];
    if (!item) { box.replaceChildren(el('h2', {}, 'Challenge selesai'), el('p', {}, 'Skor: ' + score.correct + ' / ' + score.answered + ' (dinilai server).')); return; }
    viewer.setCrosshairMm(item.prompt.mm);
    const feedback = el('div', { role: 'status', 'aria-live': 'polite' });
    const buttons = item.options.map((o, idx) => el('button', { type: 'button', onclick: async () => {
      buttons.forEach(b => { b.disabled = true; });
      const r = await client.answer(session.attempt, item.id, { index: idx });
      score.record(item.id, r.correct);
      post('studio.answer', { itemId: item.id, correct: r.correct, attempt: 1 });
      feedback.replaceChildren(el('p', { class: r.correct ? 'ok' : 'bad' }, r.correct ? 'Benar.' : 'Belum tepat. Jawaban: ' + r.canonical), el('p', {}, r.explanation),
        el('button', { type: 'button', class: 'primary', onclick: () => { i++; show(); } }, 'Soal berikutnya'));
    } }, o));
    box.replaceChildren(el('h2', {}, 'Challenge · soal ' + (i + 1) + ' dari ' + session.items.length), el('p', {}, item.prompt.text), el('div', { class: 'options' }, buttons), feedback,
      el('p', { class: 'studio-status' }, 'Skor sementara: ' + score.correct + ' / ' + score.answered));
  };
  show();
}
