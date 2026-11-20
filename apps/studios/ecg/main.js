// ECG Studio: independent application. Real 12-lead waveforms with calibrated grid, calipers and rate measurement.
import '../shell/studio.css';
import { connectHost } from '../shell/bridge.js';
import { el, studioFrame } from '../shell/ui.js';
import { createGuide } from '../shell/guided.js';
import { createChallengeClient, createScore } from '../shell/challenge.js';
import { createEcgViewer } from '../engines/ecg/viewer.js';

const STUDIO = 'ecg';
// Declared before connectHost: a standalone preview launches synchronously.
const get = async u => { const r = await fetch(u, { credentials: 'same-origin' }); if (!r.ok) throw Error('dataset unavailable: ' + u); return r.json(); };
connectHost({ studioId: STUDIO, alsoAccept: ['test-' + STUDIO], onLaunch: (launch, post) => start(launch, post).catch(err => {
  console.error(err); document.body.append(el('p', { class: 'bad', role: 'alert' }, 'Studio tidak dapat dimuat: ' + err.message));
  post('studio.error', { code: /dataset/i.test(err.message) ? 'dataset-unavailable' : 'internal', message: String(err.message).slice(0, 200) });
}) });

async function start(launch, post) {
  const dataset = await get('./data/dataset.json');
  const challenge = launch.mode === 'challenge';
  const labels = challenge ? null : await get('./' + dataset.labels);
  const ui = studioFrame({ title: 'ECG 12-lead', modality: 'EKG', mode: launch.mode, dataNotice: dataset.notice });
  ui.workspace.style.background = '#fff';
  const stage = el('div', { style: 'position:absolute;inset:0' }); ui.workspace.append(stage);
  const readout = el('div', { class: 'readout', 'data-testid': 'readout' }, '—'); readout.style.whiteSpace = 'pre-line';
  let guide = null; const guideBox = el('div', { 'data-testid': 'guide' });
  let regularityAnswer = null;
  const viewer = createEcgViewer(stage, { onState: s => {
    readout.textContent = 'Tampilan: ' + (s.view === 'overview' ? '12 sadapan' : 'sadapan ' + s.lead) + ' · zoom ' + s.zoom.toFixed(1) + '×' +
      (s.hr ? '\nLaju (deteksi R otomatis, II): ' + Math.round(s.hr.bpm) + ' bpm · SD RR ' + Math.round(s.hr.rrSdMs) + ' ms' : '') +
      (s.measurement ? '\nKaliper: ' + Math.round(s.measurement.ms) + ' ms (bila R-R: ' + Math.round(s.measurement.bpmIfRr) + ' bpm)' : '\nKaliper: klik dua titik pada tampilan satu sadapan');
    guide?.update({ ...s, regularityAnswer }); paintGuide();
  } });
  let current = null;
  const caseSelect = el('select', { 'aria-label': 'Pilih kasus EKG' }, ...dataset.cases.map(c => el('option', { value: c }, 'Kasus ' + c)));
  const loadCase = async id => { current = id; viewer.load(await get('./data/cases/' + id + '.json')); info.textContent = labels ? 'Label kurasi: ' + labels.cases[id].label + '\n' + labels.cases[id].teaching : ''; };
  const info = el('div', { class: 'readout' }); info.style.whiteSpace = 'pre-line';
  caseSelect.addEventListener('change', () => loadCase(caseSelect.value));
  const leadSelect = el('select', { 'aria-label': 'Sadapan' }, ...['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'].map(l => el('option', { value: l, selected: l === 'II' }, l)));
  ui.panel.append(el('h2', {}, 'Rekaman'), ...(challenge ? [] : [caseSelect]),
    el('div', { class: 'tools' }, el('button', { type: 'button', onclick: () => viewer.setView('overview') }, '12 sadapan'), el('button', { type: 'button', onclick: () => viewer.setView('detail', leadSelect.value) }, 'Satu sadapan'), leadSelect),
    el('div', { class: 'tools' }, el('button', { type: 'button', onclick: () => viewer.zoom(1.5) }, 'Zoom +'), el('button', { type: 'button', onclick: () => viewer.zoom(1 / 1.5) }, 'Zoom −'),
      el('button', { type: 'button', onclick: () => viewer.pan(-1) }, '◀ 1 s'), el('button', { type: 'button', onclick: () => viewer.pan(1) }, '1 s ▶')),
    readout, info);
  leadSelect.addEventListener('change', () => viewer.setView('detail', leadSelect.value));
  // ---- guided: checks use the detected R peaks of the real signal ----
  function paintGuide() {
    if (!guide) return;
    const st = guide.step, done = guide.completed.has(guide.index);
    guideBox.replaceChildren(el('h2', {}, 'Guided · langkah ' + (guide.index + 1) + ' dari ' + steps.length),
      el('div', { class: 'step' + (done ? ' done' : '') }, el('strong', {}, st.title), el('p', {}, st.text), ...(st.extra ? [st.extra()] : []), el('p', { class: done ? 'ok' : '' }, done ? '✓ Terdeteksi dari sinyal.' : 'Coba sekarang.')),
      el('div', { class: 'tools' }, el('button', { type: 'button', onclick: () => { guide.back(); paintGuide(); } }, 'Kembali'),
        el('button', { type: 'button', class: 'primary', disabled: !done || guide.index === steps.length - 1, onclick: () => { guide.next(); paintGuide(); } }, 'Lanjut')),
      ...(guide.finished ? [el('p', { class: 'ok' }, 'Interpretasi terpandu selesai.')] : []));
  }
  const near = (x, list, tol) => list.some(p => Math.abs(p - x) <= tol);
  const tol = () => Math.round(0.04 * 500);
  const steps = [
    { id: 'calibration', title: 'Kalibrasi kertas', text: 'Pulsa kalibrasi setinggi 10 mm = 1 mV. Satu kotak kecil = 0,04 s dan 0,1 mV pada 25 mm/s. Buka tampilan Satu sadapan, sadapan II.', check: s => s.view === 'detail' && s.lead === 'II' },
    { id: 'rr', title: 'Ukur interval R-R', text: 'Klik puncak R dan puncak R berikutnya di sadapan II. Laju = 60 000 / R-R (ms).', check: s => { const p = viewer.peaks('II'); if (s.lead !== 'II' || s.calipers.length < 2) return false; const [a, b] = s.calipers.slice().sort((x, y) => x - y); const i = p.findIndex(q => Math.abs(q - a) <= tol()); return i >= 0 && i + 1 < p.length && Math.abs(p[i + 1] - b) <= tol(); } },
    { id: 'navigate', title: 'Navigasi waktu', text: 'Perbesar (Zoom +) setidaknya dua kali dan geser waktu dengan tombol 1 s ▶.', check: s => s.zoom >= 2 && s.offsetS > 0 },
    { id: 'qrs', title: 'Durasi QRS', text: 'Pilih sadapan V1. Tempatkan kaliper di awal dan akhir satu kompleks QRS (normal < 120 ms).', check: s => { if (s.lead !== 'V1' || !s.measurement) return false; const [a, b] = s.calipers.slice().sort((x, y) => x - y), p = viewer.peaks('V1'); return s.measurement.ms >= 40 && s.measurement.ms <= 220 && p.some(q => q > a && q < b); } },
    { id: 'regularity', title: 'Keteraturan ritme', text: 'Berdasarkan variasi R-R pada panel (SD RR), apakah ritme ini teratur?', extra: () => el('div', { class: 'tools' }, ...['teratur', 'tidak teratur'].map(v => el('button', { type: 'button', 'aria-pressed': String(regularityAnswer === v), onclick: () => { regularityAnswer = v; guide.update({ ...viewer.state(), regularityAnswer }); paintGuide(); } }, v))),
      check: s => { if (!s.regularityAnswer || !s.hr) return false; return (s.hr.rrSdMs < 80) === (s.regularityAnswer === 'teratur'); } },
  ];
  if (launch.mode === 'guided') { guide = createGuide(steps); ui.panel.append(guideBox); paintGuide(); }
  if (challenge) {
    const box = el('div', { 'data-testid': 'challenge' }, el('h2', {}, 'Challenge')); ui.panel.append(box);
    if (launch.standalone) box.append(el('p', {}, 'Challenge dinilai server dan hanya tersedia saat diluncurkan dari MEDCOEL.'));
    else {
      const client = createChallengeClient('./'), score = createScore();
      const session = await client.start().catch(e => ({ error: e.code }));
      if (session.error) box.append(el('p', { class: 'bad' }, 'Challenge belum tersedia (' + session.error + ').'));
      else {
        let i = 0;
        const show = async () => {
          const item = session.items[i];
          if (!item) { box.replaceChildren(el('h2', {}, 'Challenge selesai'), el('p', {}, 'Skor: ' + score.correct + ' / ' + score.answered + ' (dinilai server).')); return; }
          await loadCase(item.prompt.caseId);
          const fb = el('div', { role: 'status', 'aria-live': 'polite' });
          const btns = item.options.map((o, idx) => el('button', { type: 'button', onclick: async () => { btns.forEach(b => { b.disabled = true; }); const r = await client.answer(session.attempt, item.id, { index: idx }); score.record(item.id, r.correct); post('studio.answer', { itemId: item.id, correct: r.correct, attempt: 1 });
            fb.replaceChildren(el('p', { class: r.correct ? 'ok' : 'bad' }, r.correct ? 'Benar.' : 'Belum tepat. Label: ' + r.canonical), el('p', {}, r.explanation), el('button', { type: 'button', class: 'primary', onclick: () => { i++; show(); } }, 'Soal berikutnya')); } }, o));
          box.replaceChildren(el('h2', {}, 'Soal ' + (i + 1) + ' dari ' + session.items.length), el('p', {}, item.prompt.text), el('div', { class: 'options' }, btns), fb, el('p', { class: 'studio-status' }, 'Skor sementara: ' + score.correct + ' / ' + score.answered));
        };
        await show();
      }
    }
  } else await loadCase(dataset.guidedCase || dataset.cases[0]);
  if (launch.standalone) window.__medcoelStudio = { viewer };
  ui.status('Siap.');
  post('studio.ready', { releaseId: launch.releaseId, capabilities: ['clinical-case'] });
}
