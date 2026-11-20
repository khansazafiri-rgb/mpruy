// Generic 2D image studio (X-ray, ultrasound). Each studio imports this from its own entry and is built separately.
import '../../shell/studio.css';
import { connectHost } from '../../shell/bridge.js';
import { el, studioFrame } from '../../shell/ui.js';
import { createGuide } from '../../shell/guided.js';
import { createChallengeClient, createScore } from '../../shell/challenge.js';
import { createImageViewer } from './viewer.js';

async function getJson(u) { const r = await fetch(u, { credentials: 'same-origin' }); if (!r.ok) throw Error('dataset unavailable: ' + u); return r.json(); }

export function runImageStudio({ studioId, title, modality }) {
  connectHost({ studioId, alsoAccept: ['test-' + studioId], onLaunch: (launch, post) => start(launch, post).catch(err => {
    console.error(err); document.body.append(el('p', { class: 'bad', role: 'alert' }, 'Studio tidak dapat dimuat: ' + err.message));
    post('studio.error', { code: /dataset/i.test(err.message) ? 'dataset-unavailable' : 'internal', message: String(err.message).slice(0, 200) });
  }) });
  async function start(launch, post) {
    const dataset = await getJson('./data/dataset.json');
    const challenge = launch.mode === 'challenge';
    const ui = studioFrame({ title, modality, mode: launch.mode, dataNotice: dataset.notice });
    const stage = el('div', { style: 'position:absolute;inset:0' }); ui.workspace.append(stage);
    const readout = el('div', { class: 'readout', 'data-testid': 'readout' }, '—'); readout.style.whiteSpace = 'pre-line';
    let guide = null, annotations = [];
    const guideBox = el('div', { 'data-testid': 'guide' });
    const viewer = createImageViewer(stage, { onState: s => {
      const hitLabel = s.hit ? annotations.find(a => a.id === s.hit)?.label : null;
      readout.textContent = 'Zoom ' + s.zoom.toFixed(2) + '× · kontras ' + s.contrast.toFixed(2) + (s.lastMeasure ? '\nUkuran: ' + s.lastMeasure.value.toFixed(1) + ' ' + s.lastMeasure.unit : '') + (s.lastClick && !challenge ? '\nArea: ' + (hitLabel || 'tanpa anotasi') : '');
      guide?.update(s); paintGuide();
    } });
    const images = dataset.images, current = { i: 0 };
    async function show(i) {
      const im = images[i]; current.i = i;
      annotations = challenge ? [] : im.annotations ? (await getJson('./' + im.annotations)).regions : [];
      await viewer.load('./' + im.file, im, annotations);
    }
    const contrast = el('input', { type: 'range', min: '0.5', max: '3', step: '0.05', value: '1', 'aria-label': 'Kontras' });
    const bright = el('input', { type: 'range', min: '0.3', max: '2', step: '0.05', value: '1', 'aria-label': 'Kecerahan' });
    const onCB = () => viewer.setContrast(Number(contrast.value), Number(bright.value));
    contrast.addEventListener('input', onCB); bright.addEventListener('input', onCB);
    const rulerBtn = el('button', { type: 'button', 'aria-pressed': 'false', onclick: () => { const on = rulerBtn.getAttribute('aria-pressed') !== 'true'; rulerBtn.setAttribute('aria-pressed', String(on)); viewer.setRuler(on); } }, 'Penggaris');
    const annBtn = el('button', { type: 'button', 'aria-pressed': 'false', disabled: challenge, onclick: () => { const on = annBtn.getAttribute('aria-pressed') !== 'true'; annBtn.setAttribute('aria-pressed', String(on)); viewer.setAnnotations(on); } }, 'Anotasi');
    const pick = el('select', { 'aria-label': 'Pilih citra' }, ...images.map((im, i) => el('option', { value: String(i) }, im.title || 'Citra ' + (i + 1))));
    pick.addEventListener('change', () => show(Number(pick.value)));
    ui.panel.append(el('h2', {}, 'Citra'), ...(challenge ? [] : [pick]), el('div', { class: 'tools' }, el('button', { type: 'button', onclick: () => viewer.setZoom(1.25) }, 'Zoom +'), el('button', { type: 'button', onclick: () => viewer.setZoom(0.8) }, 'Zoom −'), rulerBtn, annBtn, el('button', { type: 'button', onclick: () => viewer.reset() }, 'Reset')),
      el('label', {}, 'Kontras', contrast), el('label', {}, 'Kecerahan', bright), readout);
    function paintGuide() {
      if (!guide) return;
      const st = guide.step, done = guide.completed.has(guide.index);
      guideBox.replaceChildren(el('h2', {}, 'Guided · langkah ' + (guide.index + 1) + ' dari ' + steps.length),
        el('div', { class: 'step' + (done ? ' done' : '') }, el('strong', {}, st.title), el('p', {}, st.text), el('p', { class: done ? 'ok' : '' }, done ? '✓ Terdeteksi di viewer.' : 'Coba sekarang.')),
        el('div', { class: 'tools' }, el('button', { type: 'button', onclick: () => { guide.back(); paintGuide(); } }, 'Kembali'),
          el('button', { type: 'button', class: 'primary', disabled: !done || guide.index === steps.length - 1, onclick: () => { guide.next(); paintGuide(); } }, 'Lanjut')),
        ...(guide.finished ? [el('p', { class: 'ok' }, 'Langkah terpandu selesai.')] : []));
    }
    const target = dataset.guidedRegion;
    const steps = [
      { id: 'zoom', title: 'Perbesar', text: 'Perbesar citra (Zoom + atau scroll) hingga minimal 1,5×.', check: s => s.zoom >= 1.5 },
      { id: 'contrast', title: 'Atur kontras', text: 'Ubah kontras atau kecerahan agar batas struktur lebih jelas.', check: s => s.contrast !== 1 || s.brightness !== 1 },
      ...(target ? [{ id: 'landmark', title: 'Temukan area', text: 'Nyalakan Anotasi dan klik di dalam area "' + target.label + '".', check: s => s.showAnnotations && s.hit === target.id }] : []),
      { id: 'measure', title: 'Ukur', text: 'Aktifkan Penggaris dan klik dua titik. Satuan mm hanya bila citra punya kalibrasi spasi piksel; jika tidak, hasilnya dalam piksel.', check: s => !!s.lastMeasure },
    ];
    if (launch.mode === 'guided') { guide = createGuide(steps); ui.panel.append(guideBox); paintGuide(); }
    await show(0);
    if (challenge) {
      const box = el('div', { 'data-testid': 'challenge' }, el('h2', {}, 'Challenge')); ui.panel.append(box);
      if (launch.standalone) box.append(el('p', {}, 'Challenge dinilai server dan hanya tersedia saat diluncurkan dari MEDCOEL.'));
      else {
        const client = createChallengeClient('./'), score = createScore(client);
        const session = await client.start().catch(e => ({ error: e.code }));
        if (session.error) box.append(el('p', { class: 'bad' }, 'Challenge belum tersedia (' + session.error + ').'));
        else {
          let i = 0;
          const next = async () => {
            const item = session.items[i];
            if (!item) { box.replaceChildren(el('h2', {}, 'Challenge selesai'), el('p', {}, 'Skor: ' + score.correct + ' / ' + score.answered + (score.persisted ? ' (dinilai server, tersimpan di progres Anda).' : ' (dinilai server).'))); return; }
            const idx = images.findIndex(im => im.id === item.prompt.imageId); if (idx >= 0 && idx !== current.i) await show(idx);
            const fb = el('div', { role: 'status', 'aria-live': 'polite' });
            const finish = r => { score.record(item.id, r.correct); post('studio.answer', { itemId: item.id, correct: r.correct, attempt: 1 }); fb.replaceChildren(el('p', { class: r.correct ? 'ok' : 'bad' }, r.correct ? 'Benar.' : 'Belum tepat: ' + r.canonical), el('p', {}, r.explanation), el('button', { type: 'button', class: 'primary', onclick: () => { i++; next(); } }, 'Soal berikutnya')); };
            if (item.prompt.kind === 'find-region') {
              box.replaceChildren(el('h2', {}, 'Soal ' + (i + 1)), el('p', {}, item.prompt.text), fb);
              const wait = setInterval(async () => { const s = viewer.state(); if (s.lastClick && s.lastClick !== item._last) { clearInterval(wait); finish(await client.answer(session.attempt, item.id, { point: s.lastClick.map(Math.round) })); } }, 150);
              item._last = viewer.state().lastClick;
            } else {
              const btns = item.options.map((o, k) => el('button', { type: 'button', onclick: async () => { btns.forEach(b => { b.disabled = true; }); finish(await client.answer(session.attempt, item.id, { index: k })); } }, o));
              box.replaceChildren(el('h2', {}, 'Soal ' + (i + 1)), el('p', {}, item.prompt.text), el('div', { class: 'options' }, btns), fb);
            }
          };
          next();
        }
      }
    }
    if (launch.standalone) window.__medcoelStudio = { viewer };
    ui.status('Siap.');
    post('studio.ready', { releaseId: launch.releaseId, capabilities: ['window-level', 'measurement', 'structure-identification'] });
  }
}
