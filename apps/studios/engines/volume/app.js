// Generic, data-driven volume studio (CT/MRI). Each studio imports this from its OWN entry and is built separately.
// Capabilities follow the dataset: window presets, a named label overlay, or a reader-agreement overlay.
import '../../shell/studio.css';
import { connectHost } from '../../shell/bridge.js';
import { el, studioFrame } from '../../shell/ui.js';
import { createGuide } from '../../shell/guided.js';
import { createChallengeClient, createScore } from '../../shell/challenge.js';
import { createVolumeViewer } from './viewer.js';
import { parseNifti, sameGrid } from './nifti.js';
import { gunzipToArrayBuffer } from './gzip.js';

const popcount = v => { let n = 0; while (v) { n += v & 1; v >>= 1; } return n; };
async function getJson(u) { const r = await fetch(u, { credentials: 'same-origin' }); if (!r.ok) throw Error('dataset unavailable: ' + u); return r.json(); }
async function getVolume(u) { const r = await fetch(u, { credentials: 'same-origin' }); if (!r.ok) throw Error('dataset unavailable: ' + u); return parseNifti(await gunzipToArrayBuffer(await r.arrayBuffer())); }

export function runVolumeStudio({ studioId, title, modality, radiological = false }) {
  connectHost({ studioId, alsoAccept: ['test-' + studioId], onLaunch: (launch, post) => start(launch, post).catch(err => {
    console.error(err); document.body.append(el('p', { class: 'bad', role: 'alert' }, 'Studio tidak dapat dimuat: ' + err.message));
    post('studio.error', { code: /dataset/i.test(err.message) ? 'dataset-unavailable' : 'internal', message: String(err.message).slice(0, 200) });
  }) });

  async function start(launch, post) {
    const dataset = await getJson('./data/dataset.json');
    const challenge = launch.mode === 'challenge';
    const ui = studioFrame({ title, modality, mode: launch.mode, dataNotice: dataset.notice });
    const canvas = el('canvas', { 'aria-label': title + ' multiplanar. Klik untuk memindahkan crosshair, scroll untuk berpindah irisan.' });
    ui.workspace.append(el('div', { style: 'position:absolute;inset:0' }, canvas));
    const readout = el('div', { class: 'readout', 'data-testid': 'readout' }, '—'); readout.style.whiteSpace = 'pre-line';
    let preset = null, overlayOpacity = challenge ? 0 : 0.4, lastMeasure = null, guide = null, names = null, readers = null;
    const overlay = challenge ? null : dataset.labels || dataset.readers || null;
    const guideBox = el('div', { 'data-testid': 'guide' });
    const snapshot = () => ({ ...viewer.state, preset, overlayOpacity, lastMeasure });
    const viewer = await createVolumeViewer(canvas, { radiological,
      onLocation: s => { render(s); guide?.update(snapshot()); paintGuide(); },
      onMeasure: m => { lastMeasure = m; render(viewer.state); guide?.update(snapshot()); paintGuide(); } });
    ui.status('Memuat volume…');
    const vols = [{ url: './' + dataset.image, colormap: 'gray', name: 'image.nii.gz' }];
    if (overlay) vols.push({ url: './' + overlay, colormap: 'gray', opacity: overlayOpacity, name: 'overlay.nii.gz' });
    await viewer.load(vols);
    if (overlay) {
      const vol = await getVolume('./' + overlay);
      if (!sameGrid(viewer.loadedGrid(0), vol, 1e-3)) throw Error('Overlay grid differs from the image: overlay disabled');
      viewer.setLabelVolume(vol);
      if (dataset.labels) { names = (await getJson('./' + dataset.labelTable)).structures; viewer.setLabelColormap(1, names); }
      else { readers = await getJson('./' + dataset.annotations); const c = [[0, 0, 0], [255, 230, 80], [255, 160, 40], [255, 80, 40], [220, 20, 60]]; viewer.setLabelColormap(1, Array.from({ length: 15 }, (_, v) => ({ id: v + 1, nameEn: popcount(v + 1) + ' anotasi', rgb: c[Math.min(4, popcount(v + 1))] }))); }
    }
    function render(s) {
      const value = s.value == null ? '—' : Math.round(s.value) + (dataset.units === 'HU' ? ' HU' : '');
      const what = names ? (names.find(n => n.id === s.label)?.nameEn || (s.label ? 'label ' + s.label : 'di luar label')) : readers ? (s.label ? popcount(s.label) + ' dari ' + readers.readers.length + ' anotasi' : 'tanpa anotasi') : '';
      readout.textContent = 'RAS (mm): ' + s.mm.map(v => v.toFixed(1)).join(', ') + '\nNilai: ' + value + (preset ? '\nWindow: ' + preset : '') + (what && !challenge ? '\nStruktur: ' + what : '') + (lastMeasure ? '\nUkuran terakhir: ' + lastMeasure.mm.toFixed(1) + ' mm' : '');
    }
    const presets = dataset.presets || {};
    const presetButtons = Object.keys(presets).map(name => el('button', { type: 'button', 'data-preset': name, onclick: () => applyPreset(name) }, name));
    function applyPreset(name) { preset = name; viewer.setWindow(0, presets[name][0], presets[name][1]); presetButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.preset === name))); render(viewer.state); guide?.update(snapshot()); paintGuide(); }
    const views = ['multiplanar', 'axial', 'coronal', 'sagittal'].map(v => el('button', { type: 'button', onclick: () => viewer.setView(v) }, { multiplanar: 'MPR', axial: 'Aksial', coronal: 'Koronal', sagittal: 'Sagital' }[v]));
    const ruler = el('button', { type: 'button', 'aria-pressed': 'false', onclick: () => { const on = ruler.getAttribute('aria-pressed') !== 'true'; ruler.setAttribute('aria-pressed', String(on)); viewer.setDragMode(on ? 'measurement' : 'pan'); } }, 'Penggaris (mm)');
    ui.panel.append(...(presetButtons.length ? [el('h2', {}, 'Window'), el('div', { class: 'tools' }, presetButtons)] : []), el('h2', {}, 'Tampilan'), el('div', { class: 'tools' }, views),
      el('div', { class: 'tools' }, ruler, el('button', { type: 'button', onclick: () => viewer.zoom(1.25) }, 'Zoom +'), el('button', { type: 'button', onclick: () => viewer.zoom(0.8) }, 'Zoom −'), el('button', { type: 'button', onclick: () => viewer.reset() }, 'Reset'),
        el('button', { type: 'button', onclick: () => (document.fullscreenElement ? document.exitFullscreen() : document.querySelector('.studio')?.requestFullscreen?.()) }, 'Layar penuh')), readout);
    if (overlay) {
      const op = el('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(overlayOpacity), 'aria-label': 'Opasitas overlay' });
      op.addEventListener('input', () => { overlayOpacity = Number(op.value); viewer.setOpacity(1, overlayOpacity); guide?.update(snapshot()); paintGuide(); });
      ui.panel.append(el('label', {}, 'Overlay (opasitas)', op));
    }
    if (dataset.window) viewer.setWindow(0, dataset.window[0], dataset.window[1]);
    if (presetButtons.length) applyPreset(Object.keys(presets)[0]);
    function paintGuide() {
      if (!guide) return;
      const st = guide.step, done = guide.completed.has(guide.index);
      guideBox.replaceChildren(el('h2', {}, 'Guided · langkah ' + (guide.index + 1) + ' dari ' + steps.length),
        el('div', { class: 'step' + (done ? ' done' : '') }, el('strong', {}, st.title), el('p', {}, st.text), el('p', { class: done ? 'ok' : '' }, done ? '✓ Terdeteksi di viewer.' : 'Coba sekarang.')),
        el('div', { class: 'tools' }, el('button', { type: 'button', onclick: () => { guide.back(); paintGuide(); } }, 'Kembali'),
          el('button', { type: 'button', class: 'primary', disabled: !done || guide.index === steps.length - 1, onclick: () => { guide.next(); paintGuide(); } }, 'Lanjut')),
        ...(guide.finished ? [el('p', { class: 'ok' }, 'Langkah terpandu selesai.')] : []));
    }
    const steps = [
      { id: 'orient', title: 'Orientasi', text: (radiological ? 'Konvensi radiologis: sisi kanan pasien di kiri layar.' : 'Konvensi neurologis: sisi kiri pasien di kiri layar.') + ' Klik satu titik pada citra.', check: s => s.moves > 0 },
      { id: 'plane', title: 'Ganti bidang', text: 'Pilih tampilan Sagital.', check: s => s.view === 'sagittal' },
      ...(presetButtons.length > 1 ? [{ id: 'window', title: 'Ganti window', text: 'Pilih preset window yang lain (' + Object.keys(presets)[1] + ').', check: s => s.preset === Object.keys(presets)[1] }] : []),
      ...(overlay ? [{ id: 'find', title: 'Temukan struktur berlabel', text: 'Kembali ke MPR dan letakkan crosshair di dalam area berlabel/teranotasi.', check: s => s.label > 0 && s.overlayOpacity > 0 }] : []),
      { id: 'measure', title: 'Ukur', text: 'Aktifkan Penggaris (mm) lalu seret pada satu irisan. Panjang dihitung dari ukuran voxel pada header citra.', check: s => !!s.lastMeasure && s.lastMeasure.mm > 1 },
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
            if (item.prompt.mm) viewer.setCrosshairMm(item.prompt.mm);
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
    post('studio.ready', { releaseId: launch.releaseId, capabilities: ['slice-navigation', 'mpr', 'window-level', 'measurement'] });
  }
}
