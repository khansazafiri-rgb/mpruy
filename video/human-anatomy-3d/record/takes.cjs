// Rekaman adegan atlas MEDCOEL asli. Tiap "take" mulai dari halaman baru; semua aksi memakai klik/seret/roda mouse sungguhan.
// Keluaran per take: rec/<take>/f*.png (bingkai kanvas 3D), u_*.png (antarmuka tanpa kanvas), manifest.json (urutan kejadian).
const fs = require('fs');
const path = require('path');
const { start } = require('./rec.cjs');
const BASE = process.env.REC_BASE || path.join(__dirname, 'rec2');

const sel = {
  canvas: '#threeCanvas', front: '#frontViewBtn', side: '#sideViewBtn', back: '#backViewBtn', top: '#topViewBtn', reset: '#resetBtn',
  zin: '#zoomInAtlas', zout: '#zoomOutAtlas', pan: '#panAtlas', restore: '#restoreAtlas', undo: '#undoAtlas',
  presetMuscles: '[data-preset="muscles"]', presetBones: '[data-preset="bones"]', presetAll: '[data-preset="all"]',
};
const tog = (id) => `[data-toggle="${id}"]`;
const minus = (id) => `[data-step="${id}"][data-delta="-1"]`;
const plus = (id) => `[data-step="${id}"][data-delta="1"]`;

async function run(name, body) {
  const dir = path.join(BASE, name); fs.rmSync(dir, { recursive: true, force: true });
  const a = await start(dir); const man = []; const t0 = Date.now();
  const log = (m) => console.log(`[${name}] ${((Date.now() - t0) / 1000).toFixed(0)}s ${m}`);
  const save = () => fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(man, null, 1));
  const ev = (o) => { man.push(o); save(); };
  let uiN = 0;
  const shot = async () => { const f = `u_${String(uiN++).padStart(3, '0')}.png`; await a.ui(f); return f; };
  const rects = async (names) => { const o = {}; for (const [k, s] of Object.entries(names)) o[k] = await a.rect(s); return o; };
  const rowRect = (id) => a.p.evaluate((i) => { const e = document.querySelector(`[data-toggle="${i}"]`)?.closest('.atlas-compact-row'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }, id);
  // klik kontrol asli: catat kotak kontrol, bingkai sebelum/sesudah, antarmuka sebelum/sesudah
  const click = async (label, selector, { record = true } = {}) => {
    const before = { ui: record ? await shot() : null };
    const r = await a.rect(selector); const row = selector.includes('data-toggle') ? await rowRect(selector.match(/"(.*?)"/)[1]) : null;
    await a.click(selector);
    const frames = await a.settle(40, false, /Btn|preset/.test(selector));
    const after = { ui: record ? await shot() : null };
    const titles = await a.loaded();
    log(`klik ${label}: ${frames.length} bingkai`);
    if (record) ev({ type: 'click', label, selector, rect: r, row, beforeUi: before.ui, afterUi: after.ui, frames, titles });
    return frames;
  };
  // seret putar: profil kecepatan lonceng (sin^2), total piksel horizontal/vertikal, N bingkai
  const drag = async (label, totalX, totalY, N, { record = true } = {}) => {
    const c = await a.rect(sel.canvas); const cx = c[0] + c[2] / 2, cy = c[1] + c[3] * 0.62;
    const w = Array.from({ length: N }, (_, i) => Math.sin(Math.PI * (i + 0.5) / N) ** 2); const sw = w.reduce((p, q) => p + q, 0);
    let x = cx, y = cy; await a.p.mouse.move(x, y); await a.p.mouse.down();
    const frames = []; const ui = record ? await shot() : null;
    for (let i = 0; i < N; i++) {
      const dx = totalX * w[i] / sw, dy = totalY * w[i] / sw;
      if (Math.abs(x + dx - cx) > 280) { await a.p.mouse.up(); x = cx; y = cy; await a.p.mouse.move(x, y); await a.p.mouse.down(); }
      x += dx; y += dy; await a.p.mouse.move(x, y);
      const f = await a.frame(30000); if (f) frames.push(f);
    }
    await a.p.mouse.up(); log(`${label}: ${frames.length}/${N} bingkai`);
    if (record) ev({ type: 'motion', label, kind: 'drag', frames, ui, totalX, totalY, cursor: { x: cx, y: cy } });
    return frames;
  };
  // roda mouse: zoom (deltaY<0 = mendekat); shift = geser vertikal
  const wheel = async (label, perFrame, N, { shift = false, record = true } = {}) => {
    const c = await a.rect(sel.canvas); const cx = c[0] + c[2] / 2, cy = c[1] + c[3] * 0.55;
    await a.p.mouse.move(cx, cy); if (shift) await a.p.keyboard.down('Shift');
    const frames = []; const ui = record ? await shot() : null;
    const w = Array.from({ length: N }, (_, i) => Math.sin(Math.PI * (i + 0.5) / N) ** 2); const sw = w.reduce((p, q) => p + q, 0);
    for (let i = 0; i < N; i++) { await a.p.mouse.wheel(0, perFrame * N * w[i] / sw); const f = await a.frame(30000); if (f) frames.push(f); }
    if (shift) await a.p.keyboard.up('Shift');
    log(`${label}: ${frames.length}/${N} bingkai`);
    if (record) ev({ type: 'motion', label, kind: shift ? 'pan' : 'zoom', frames, ui, cursor: { x: cx, y: cy } });
    return frames;
  };
  try {
    log('dimuat');
    const f0 = await a.poke(); const u0 = await shot();
    const geo = await rects({ canvas: sel.canvas, front: sel.front, side: sel.side, back: sel.back, top: sel.top, reset: sel.reset, zin: sel.zin, zout: sel.zout, pan: sel.pan, presetMuscles: sel.presetMuscles, presetBones: sel.presetBones, presetAll: sel.presetAll, restore: sel.restore, undo: sel.undo });
    ev({ type: 'start', frame: f0, ui: u0, geo, titles: await a.loaded() });
    const mark = async (label) => { const ui = await shot(); ev({ type: 'mark', label, frame: a.last(), ui, titles: await a.loaded() }); log('tanda ' + label); };
    await body({ a, click, drag, wheel, ev, log, shot, sel, tog, minus, plus, mark });
    ev({ type: 'end' }); log('selesai');
  } catch (e) { console.log(`[${name}] GAGAL`, e.stack); ev({ type: 'error', msg: String(e) }); }
  await a.b.close();
}
exports.run = run; exports.sel = sel; exports.tog = tog; exports.minus = minus; exports.plus = plus;

const TAKES = {
  // 1) tampilan awal berputar, lalu otot dan kurangi layer
  async hero_layers(k) {
    await k.drag('hero', 650, 0, 100);
    await k.click('Front', k.sel.front);
    await k.click('Muscles', k.sel.presetMuscles);
    await k.click('Muscles -1', k.minus('muscular'));
    await k.click('Muscles -2', k.minus('muscular'));
    await k.click('Muscles -3', k.minus('muscular'));
    await k.drag('peek', 200, 0, 40);
  },
  // 2) kerangka: dari otot lapis terdalam, matikan otot, putar
  async skeleton(k) {
    for (let i = 0; i < 3; i++) await k.click('pre -' + i, k.minus('muscular'), { record: false });
    await k.mark('ready');
    await k.click('Muscles off', k.tog('muscular'));
    await k.drag('skeleton-rot', 700, 0, 100);
  },
  // 3) pembuluh darah bersama kerangka
  async vessels(k) {
    await k.click('pre muscles off', k.tog('muscular'), { record: false });
    await k.mark('ready');
    await k.click('Arteries on', k.tog('arterial'));
    await k.click('Veins on', k.tog('venous'));
    await k.drag('vessels-rot', 350, 0, 60);
  },
  // 4) limfatik
  async lymph(k) {
    await k.click('pre muscles off', k.tog('muscular'), { record: false });
    await k.click('pre arteries on', k.tog('arterial'), { record: false });
    await k.click('pre veins on', k.tog('venous'), { record: false });
    await k.mark('ready');
    await k.click('Arteries off', k.tog('arterial'));
    await k.click('Veins off', k.tog('venous'));
    await k.click('Lymphatic on', k.tog('lymphatic'));
    await k.drag('lymph-rot', 300, 0, 50);
  },
  // 5) bebas menjelajah: putar, perbesar, geser
  async explore(k) {
    await k.click('pre muscles off', k.tog('muscular'), { record: false });
    await k.click('pre arteries on', k.tog('arterial'), { record: false });
    await k.click('pre lymph on', k.tog('lymphatic'), { record: false });
    await k.mark('ready');
    await k.drag('explore-rot1', 450, 0, 70);
    await k.wheel('explore-zoom', -60, 50);
    await k.wheel('explore-pan', -40, 24, { shift: true });
    await k.drag('explore-rot2', 260, 40, 50);
  },
  // 6) pilih bebas: beberapa kombinasi cepat
  async free(k) {
    await k.click('pre muscles off', k.tog('muscular'), { record: false });
    await k.click('pre arteries on', k.tog('arterial'), { record: false });
    await k.mark('ready');
    await k.click('Veins on', k.tog('venous'));
    await k.click('Skeleton off', k.tog('skeletal'));
    await k.click('Lymphatic on', k.tog('lymphatic'));
    await k.click('Muscles on', k.tog('muscular'));
    await k.click('Muscles -1', k.minus('muscular'));
    await k.click('Muscles -2', k.minus('muscular'));
    await k.drag('free-rot', 220, 0, 36);
  },
};
exports.TAKES = TAKES;
if (require.main === module) {
  (async () => { for (const n of process.argv.slice(2)) await run(n, TAKES[n]); console.log('SEMUA SELESAI'); })();
}
