// Shared application logic for anatomy 3D studios. Each studio imports this from its OWN entry and is built separately.
import '../../shell/studio.css';
import { connectHost } from '../../shell/bridge.js';
import { el, studioFrame } from '../../shell/ui.js';
import { createGuide } from '../../shell/guided.js';
import { createChallengeClient, createScore } from '../../shell/challenge.js';
import { createAnatomyViewer } from './viewer.js';

export function runAnatomyStudio({ studioId, title }) {
  connectHost({ studioId, alsoAccept: ['test-' + studioId], onLaunch: (launch, post) => start(launch, post).catch(err => {
    console.error(err);
    document.body.append(el('p', { class: 'bad', role: 'alert' }, 'Studio tidak dapat dimuat: ' + err.message));
    post('studio.error', { code: /dataset/i.test(err.message) ? 'dataset-unavailable' : 'internal', message: String(err.message).slice(0, 200) });
  }) });

  async function start(launch, post) {
    const get = async u => { const r = await fetch(u, { credentials: 'same-origin' }); if (!r.ok) throw Error('dataset unavailable: ' + u); return r.json(); };
    const dataset = await get('./data/dataset.json');
    const challenge = launch.mode === 'challenge';
    const table = challenge ? null : await get('./' + dataset.structures);
    const byId = new Map((table?.structures || []).map(s => [s.id, s]));
    const ui = studioFrame({ title, modality: 'Anatomi 3D', mode: launch.mode, dataNotice: dataset.notice });
    const stage = el('div', { style: 'position:absolute;inset:0' });
    ui.workspace.append(stage);
    const info = el('div', { class: 'readout', 'data-testid': 'selection' }, 'Klik sebuah struktur.');
    let guide = null; const guideBox = el('div', { 'data-testid': 'guide' });
    const viewer = await createAnatomyViewer(stage, { url: './' + dataset.model,
      onSelect: (id, byUser) => {
        const s = byId.get(id);
        info.textContent = !id ? 'Tidak ada yang dipilih.' : challenge ? 'Struktur dipilih.' : s.nameEn + '\nFMA: ' + s.fma + ' · ' + s.group + (s.side !== 'midline' ? ' · sisi ' + (s.side === 'left' ? 'kiri' : 'kanan') : '');
        info.style.whiteSpace = 'pre-line';
        if (byUser) onPick?.(id);
        if (byUser && id) post('studio.action', { capability: 'anatomy3d', action: 'select', ok: true });
      },
      onState: st => { guide?.update(st); paintGuide(); } });
    let onPick = null;
    // ---- explore tools ----
    const opacity = el('input', { type: 'range', min: '0.1', max: '1', step: '0.05', value: '1', 'aria-label': 'Transparansi struktur lain' });
    opacity.addEventListener('input', () => viewer.setOpacity(Number(opacity.value)));
    const tools = el('div', { class: 'tools' },
      el('button', { type: 'button', onclick: () => viewer.state.selected && viewer.isolate(viewer.state.selected) }, 'Isolasi'),
      el('button', { type: 'button', onclick: () => viewer.state.selected && viewer.hide(viewer.state.selected) }, 'Sembunyikan'),
      el('button', { type: 'button', onclick: () => viewer.showAll() }, 'Tampilkan semua'),
      el('button', { type: 'button', onclick: () => viewer.home() }, 'Reset kamera'),
      el('button', { type: 'button', onclick: () => (document.fullscreenElement ? document.exitFullscreen() : document.querySelector('.studio')?.requestFullscreen?.()) }, 'Layar penuh'));
    ui.panel.append(el('h2', {}, 'Alat'), tools, el('label', {}, 'Opasitas struktur lain', opacity), info);
    if (!challenge) {
      const search = el('input', { type: 'search', placeholder: 'Cari struktur (Inggris)…', 'aria-label': 'Cari struktur' });
      const list = el('div', { class: 'options', style: 'max-height:240px;overflow:auto', 'data-testid': 'hierarchy' });
      const renderList = () => {
        const q = search.value.trim().toLowerCase();
        list.replaceChildren(...table.groups.flatMap(g => {
          const rows = table.structures.filter(s => s.group === g && (!q || s.nameEn.toLowerCase().includes(q) || s.fma.toLowerCase().includes(q)));
          return rows.length ? [el('strong', {}, g), ...rows.map(s => el('button', { type: 'button', 'data-sid': s.id, onclick: () => { viewer.select(s.id, true); viewer.focus(s.id); } }, s.nameEn))] : [];
        }));
      };
      search.addEventListener('input', renderList); renderList();
      ui.panel.append(el('h2', {}, 'Hierarki'), search, list);
    }
    // ---- guided ----
    function paintGuide() {
      if (!guide) return;
      const st = guide.step, done = guide.completed.has(guide.index);
      guideBox.replaceChildren(el('h2', {}, 'Guided · langkah ' + (guide.index + 1) + ' dari ' + steps.length),
        el('div', { class: 'step' + (done ? ' done' : '') }, el('strong', {}, st.title), el('p', {}, st.text), el('p', { class: done ? 'ok' : '' }, done ? '✓ Terdeteksi di viewer.' : 'Coba sekarang di model.')),
        el('div', { class: 'tools' }, el('button', { type: 'button', onclick: () => { guide.back(); paintGuide(); } }, 'Kembali'),
          el('button', { type: 'button', class: 'primary', disabled: !done || guide.index === steps.length - 1, onclick: () => { guide.next(); paintGuide(); } }, 'Lanjut')),
        ...(guide.finished ? [el('p', { class: 'ok' }, 'Eksplorasi terpandu selesai.')] : []));
    }
    const t = dataset.guidedTargets || {};
    const steps = [
      { id: 'rotate', title: 'Putar model', text: 'Seret di area model untuk memutar dan melihat dari sisi lain. Scroll untuk zoom.', check: s => s.rotations >= 2 },
      { id: 'select', title: 'Pilih struktur', text: 'Klik "' + (byId.get(t.select)?.nameEn || 'struktur target') + '" (atau pilih dari Hierarki). Nama dan FMA ID muncul di panel.', check: s => s.selected === t.select },
      { id: 'isolate', title: 'Isolasi', text: 'Pilih "' + (byId.get(t.isolate)?.nameEn || 'struktur target') + '" lalu tekan Isolasi untuk melihatnya sendirian.', check: s => s.isolated === t.isolate },
      { id: 'transparency', title: 'Transparansi dan konteks', text: 'Tekan Tampilkan semua, lalu turunkan opasitas struktur lain di bawah 50% agar struktur dalam terlihat.', check: s => !s.isolated && s.opacity < 0.5 },
      { id: 'hide', title: 'Sembunyikan', text: 'Pilih sebuah struktur lalu tekan Sembunyikan.', check: s => s.hidden >= 1 },
    ];
    if (launch.mode === 'guided') { guide = createGuide(steps); ui.panel.append(guideBox); paintGuide(); }
    // ---- challenge: Identify / Find / Type, all graded by the server ----
    if (challenge) {
      const box = el('div', { 'data-testid': 'challenge' }, el('h2', {}, 'Challenge'));
      ui.panel.append(box);
      if (launch.standalone) box.append(el('p', {}, 'Challenge dinilai server dan hanya tersedia saat diluncurkan dari MEDCOEL.'));
      else {
        const client = createChallengeClient('./'), score = createScore(client);
        const session = await client.start().catch(e => ({ error: e.code }));
        if (session.error) box.append(el('p', { class: 'bad' }, 'Challenge belum tersedia (' + session.error + ').'));
        else runItems(session, client, score, box);
      }
    }
    function runItems(session, client, score, box) {
      let i = 0;
      const next = () => { i++; show(); };
      const feedback = (r, more) => el('div', { role: 'status', 'aria-live': 'polite' }, el('p', { class: r.correct ? 'ok' : 'bad' }, r.correct ? (r.verdict === 'accepted-typo' ? 'Benar (ejaan sedikit berbeda): ' + r.canonical : 'Benar.') : 'Belum tepat. Jawaban: ' + r.canonical), el('p', {}, r.explanation || ''), more);
      const show = () => {
        const item = session.items[i];
        onPick = null; viewer.select(null);
        if (!item) { box.replaceChildren(el('h2', {}, 'Challenge selesai'), el('p', {}, 'Skor: ' + score.correct + ' / ' + score.answered + (score.persisted ? ' (dinilai server, tersimpan di progres Anda).' : ' (dinilai server).'))); return; }
        const head = [el('h2', {}, 'Soal ' + (i + 1) + ' dari ' + session.items.length + ' · ' + ({ identify: 'Identify', find: 'Find', typed: 'Type' }[item.prompt.kind] || '')), el('p', {}, item.prompt.text)];
        const grade = async response => {
          const r = await client.answer(session.attempt, item.id, response);
          score.record(item.id, r.correct); post('studio.answer', { itemId: item.id, correct: r.correct, attempt: 1 });
          return r;
        };
        const nextBtn = el('button', { type: 'button', class: 'primary', onclick: next }, 'Soal berikutnya');
        if (item.prompt.kind === 'identify') {
          viewer.select(item.prompt.highlight); viewer.focus(item.prompt.highlight);
          const btns = item.options.map((o, idx) => el('button', { type: 'button', onclick: async () => { btns.forEach(b => { b.disabled = true; }); const r = await grade({ index: idx }); box.append(feedback(r, nextBtn)); } }, o));
          box.replaceChildren(...head, el('div', { class: 'options' }, btns));
        } else if (item.prompt.kind === 'find') {
          box.replaceChildren(...head, el('p', { class: 'studio-status' }, 'Klik struktur itu pada model.'));
          onPick = async id => { if (!id) return; onPick = null; const r = await grade({ structureId: id }); box.append(feedback(r, nextBtn)); };
        } else if (item.prompt.kind === 'typed') {
          viewer.select(item.prompt.highlight); viewer.focus(item.prompt.highlight);
          const input = el('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Ketik nama struktur (Indonesia, Inggris, atau Latin)', 'data-testid': 'typed-input' });
          let answered = false;
          input.addEventListener('keydown', async e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (answered) { next(); return; }
            if (!input.value.trim()) return;
            answered = true; input.readOnly = true;
            const r = await grade({ text: input.value });
            box.append(feedback(r, el('p', { class: 'studio-status' }, 'Tekan Enter untuk soal berikutnya.')));
            if (r.correct) setTimeout(() => { if (session.items[i] === item) next(); }, 1500);
          });
          box.replaceChildren(...head, input, el('p', { class: 'studio-status' }, 'Tekan Enter untuk menjawab.'));
          input.focus();
        }
        box.append(el('p', { class: 'studio-status' }, 'Skor sementara: ' + score.correct + ' / ' + score.answered));
      };
      show();
    }
    if (launch.standalone) window.__medcoelStudio = { viewer };
    ui.status('Siap. ' + viewer.ids.length + ' struktur dimuat.');
    post('studio.ready', { releaseId: launch.releaseId, capabilities: ['anatomy3d', 'structure-identification'] });
  }
}
