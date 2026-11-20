// Chest CT Studio: independent application. CT volume in Hounsfield units with DICOM-derived geometry, window presets,
// MPR, mm measurements, and reader annotations shown as an agreement count (never as a single consensus).
import '../shell/studio.css';
import { connectHost } from '../shell/bridge.js';
import { el, studioFrame } from '../shell/ui.js';
import { createGuide } from '../shell/guided.js';
import { createChallengeClient, createScore } from '../shell/challenge.js';
import { createVolumeViewer } from '../engines/volume/viewer.js';
import { parseNifti, sameGrid } from '../engines/volume/nifti.js';
import { gunzipToArrayBuffer } from '../engines/volume/gzip.js';

const STUDIO = 'chest-ct';
async function getJson(u) { const r = await fetch(u, { credentials: 'same-origin' }); if (!r.ok) throw Error('dataset unavailable: ' + u); return r.json(); }
async function getVolume(u) { const r = await fetch(u, { credentials: 'same-origin' }); if (!r.ok) throw Error('dataset unavailable: ' + u); return parseNifti(await gunzipToArrayBuffer(await r.arrayBuffer())); }
const popcount = v => (v & 1) + ((v >> 1) & 1) + ((v >> 2) & 1) + ((v >> 3) & 1);
connectHost({ studioId: STUDIO, alsoAccept: ['test-' + STUDIO], onLaunch: (launch, post) => start(launch, post).catch(err => {
  console.error(err); document.body.append(el('p', { class: 'bad', role: 'alert' }, 'Studio tidak dapat dimuat: ' + err.message));
  post('studio.error', { code: /dataset/i.test(err.message) ? 'dataset-unavailable' : 'internal', message: String(err.message).slice(0, 200) });
}) });

async function start(launch, post) {
  const dataset = await getJson('./data/dataset.json');
  const challenge = launch.mode === 'challenge';
  const ui = studioFrame({ title: 'Chest CT', modality: 'CT', mode: launch.mode, dataNotice: dataset.notice });
  const canvas = el('canvas', { 'aria-label': 'CT toraks multiplanar. Klik untuk memindahkan crosshair, scroll untuk berpindah irisan.' });
  ui.workspace.append(el('div', { style: 'position:absolute;inset:0' }, canvas));
  const readout = el('div', { class: 'readout', 'data-testid': 'readout' }, '—'); readout.style.whiteSpace = 'pre-line';
  let preset = 'lung', overlayOpacity = challenge ? 0 : 0.5, lastMeasure = null, guide = null;
  const guideBox = el('div', { 'data-testid': 'guide' });
  const viewerState = () => ({ ...viewer.state, preset, overlayOpacity, lastMeasure });
  const viewer = await createVolumeViewer(canvas, {
    radiological: true,
    onLocation: s => { render(s); guide?.update(viewerState()); paintGuide(); },
    onMeasure: m => { lastMeasure = m; render(viewer.state); guide?.update(viewerState()); paintGuide(); post('studio.action', { capability: 'measurement', action: 'ruler', ok: true }); },
  });
  ui.status('Memuat volume CT…');
  const vols = [{ url: './' + dataset.image, colormap: 'gray', name: 'ct.nii.gz' }];
  if (!challenge && dataset.readers) vols.push({ url: './' + dataset.readers, colormap: 'gray', opacity: overlayOpacity, name: 'readers.nii.gz' });
  await viewer.load(vols);
  const applyPreset = name => { preset = name; const [lo, hi] = dataset.presets[name]; viewer.setWindow(0, lo, hi); render(viewer.state); guide?.update(viewerState()); paintGuide(); presetButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.preset === name))); };
  let annotations = null;
  if (!challenge && dataset.readers) {
    const readers = await getVolume('./' + dataset.readers);
    if (!sameGrid(viewer.loadedGrid(0), readers, 1e-3)) throw Error('Annotation grid differs from the CT: overlay disabled');
    viewer.setLabelVolume(readers);
    annotations = await getJson('./' + dataset.annotations);
    const colours = [[0, 0, 0], [255, 230, 80], [255, 160, 40], [255, 80, 40], [220, 20, 60]];
    viewer.setLabelColormap(1, Array.from({ length: 15 }, (_, v) => ({ id: v + 1, nameEn: popcount(v + 1) + ' anotasi', rgb: colours[popcount(v + 1)] })));
  }
  function render(s) {
    const hu = s.value == null ? '—' : Math.round(s.value) + ' HU';
    const agree = annotations ? (s.label ? popcount(s.label) + ' dari ' + annotations.readers.length + ' anotasi' : 'tidak ada anotasi') : '';
    readout.textContent = 'RAS (mm): ' + s.mm.map(v => v.toFixed(1)).join(', ') + '\nDensitas: ' + hu + '\nWindow: ' + preset + (annotations ? '\nNodul: ' + agree : '') + (lastMeasure ? '\nUkuran terakhir: ' + lastMeasure.mm.toFixed(1) + ' mm' : '');
  }
  const presetButtons = Object.keys(dataset.presets).map(name => el('button', { type: 'button', 'data-preset': name, onclick: () => applyPreset(name) }, { lung: 'Paru', mediastinum: 'Mediastinum', bone: 'Tulang' }[name] || name));
  const views = ['multiplanar', 'axial', 'coronal', 'sagittal'].map(v => el('button', { type: 'button', onclick: () => viewer.setView(v) }, { multiplanar: 'MPR', axial: 'Aksial', coronal: 'Koronal', sagittal: 'Sagital' }[v]));
  const ruler = el('button', { type: 'button', 'aria-pressed': 'false', onclick: () => { const on = ruler.getAttribute('aria-pressed') !== 'true'; ruler.setAttribute('aria-pressed', String(on)); viewer.setDragMode(on ? 'measurement' : 'pan'); } }, 'Penggaris (mm)');
  ui.panel.append(el('h2', {}, 'Window'), el('div', { class: 'tools' }, presetButtons), el('h2', {}, 'Tampilan'), el('div', { class: 'tools' }, views),
    el('div', { class: 'tools' }, ruler, el('button', { type: 'button', onclick: () => viewer.zoom(1.25) }, 'Zoom +'), el('button', { type: 'button', onclick: () => viewer.zoom(0.8) }, 'Zoom −'), el('button', { type: 'button', onclick: () => viewer.reset() }, 'Reset')), readout);
  if (!challenge && dataset.readers) {
    const op = el('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(overlayOpacity), 'aria-label': 'Opasitas anotasi nodul' });
    op.addEventListener('input', () => { overlayOpacity = Number(op.value); viewer.setOpacity(1, overlayOpacity); guide?.update(viewerState()); paintGuide(); });
    ui.panel.append(el('label', {}, 'Anotasi pembaca (kuning = 1, merah = semua)', op), el('p', { class: 'studio-status' }, 'Anotasi dari beberapa radiolog ditampilkan sebagai jumlah kesepakatan, bukan konsensus tunggal.'));
  }
  applyPreset('lung');
  function paintGuide() {
    if (!guide) return;
    const st = guide.step, done = guide.completed.has(guide.index);
    guideBox.replaceChildren(el('h2', {}, 'Guided · langkah ' + (guide.index + 1) + ' dari ' + steps.length),
      el('div', { class: 'step' + (done ? ' done' : '') }, el('strong', {}, st.title), el('p', {}, st.text), el('p', { class: done ? 'ok' : '' }, done ? '✓ Terdeteksi di viewer.' : 'Coba sekarang.')),
      el('div', { class: 'tools' }, el('button', { type: 'button', onclick: () => { guide.back(); paintGuide(); } }, 'Kembali'),
        el('button', { type: 'button', class: 'primary', disabled: !done || guide.index === steps.length - 1, onclick: () => { guide.next(); paintGuide(); } }, 'Lanjut')),
      ...(guide.finished ? [el('p', { class: 'ok' }, 'Pembacaan terpandu selesai.')] : []));
  }
  const nearNodule = mm => Math.hypot(...mm.map((v, i) => v - dataset.noduleMm[i])) < 30;
  const steps = [
    { id: 'lung-window', title: 'Window paru', text: 'CT ditampilkan dengan konvensi radiologis: sisi kanan pasien di kiri layar (huruf R/L menunjukkan sisi pasien). Pilih window Paru (lebar ±1500 HU, level ±−600 HU), lalu klik di paru.', check: s => s.preset === 'lung' && s.moves > 0 },
    { id: 'find-nodule', title: 'Temukan nodul', text: 'Gulir irisan dan klik di dalam nodul yang ditandai warna (anotasi pembaca).', check: s => s.label > 0 },
    { id: 'measure', title: 'Ukur diameter', text: 'Aktifkan Penggaris (mm), lalu seret melintasi nodul pada satu irisan. Panjang dihitung dari spasi voxel DICOM.', check: s => !!s.lastMeasure && s.lastMeasure.mm > 5 && s.lastMeasure.mm < 60 && nearNodule(s.lastMeasure.start) },
    { id: 'mediastinum', title: 'Window mediastinum', text: 'Ganti ke window Mediastinum dan perhatikan nodul kini tampak sebagai jaringan lunak.', check: s => s.preset === 'mediastinum' },
    { id: 'agreement', title: 'Bandingkan anotasi', text: 'Naikkan opasitas anotasi ≥ 50% dan letakkan crosshair di titik yang ditandai SEMUA anotasi (merah).', check: s => s.overlayOpacity >= 0.5 && s.label > 0 && popcount(s.label) === (annotations?.readers.length || 4) },
  ];
  if (launch.mode === 'guided') { guide = createGuide(steps); ui.panel.append(guideBox); paintGuide(); }
  if (challenge) {
    const box = el('div', { 'data-testid': 'challenge' }, el('h2', {}, 'Challenge')); ui.panel.append(box);
    if (launch.standalone) box.append(el('p', {}, 'Challenge dinilai server dan hanya tersedia saat diluncurkan dari MEDCOEL.'));
    else {
      const client = createChallengeClient('./'), score = createScore(client);
      const session = await client.start().catch(e => ({ error: e.code }));
      if (session.error) box.append(el('p', { class: 'bad' }, 'Challenge belum tersedia (' + session.error + ').'));
      else {
        let i = 0;
        const show = () => {
          const item = session.items[i];
          if (!item) { box.replaceChildren(el('h2', {}, 'Challenge selesai'), el('p', {}, 'Skor: ' + score.correct + ' / ' + score.answered + (score.persisted ? ' (dinilai server, tersimpan di progres Anda).' : ' (dinilai server).'))); return; }
          viewer.setCrosshairMm(item.prompt.mm);
          const fb = el('div', { role: 'status', 'aria-live': 'polite' });
          const btns = item.options.map((o, idx) => el('button', { type: 'button', onclick: async () => { btns.forEach(b => { b.disabled = true; }); const r = await client.answer(session.attempt, item.id, { index: idx }); score.record(item.id, r.correct); post('studio.answer', { itemId: item.id, correct: r.correct, attempt: 1 });
            fb.replaceChildren(el('p', { class: r.correct ? 'ok' : 'bad' }, r.correct ? 'Benar.' : 'Belum tepat: ' + r.canonical), el('p', {}, r.explanation), el('button', { type: 'button', class: 'primary', onclick: () => { i++; show(); } }, 'Soal berikutnya')); } }, o));
          box.replaceChildren(el('h2', {}, 'Soal ' + (i + 1) + ' dari ' + session.items.length), el('p', {}, item.prompt.text), el('div', { class: 'options' }, btns), fb);
        };
        show();
      }
    }
  }
  if (launch.standalone) window.__medcoelStudio = { viewer };
  ui.status('Siap.');
  post('studio.ready', { releaseId: launch.releaseId, capabilities: ['slice-navigation', 'mpr', 'window-level', 'measurement', 'structure-identification'] });
}
