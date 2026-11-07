import { f1, MC, FONT, clamp, seg, eo, eio, win } from './core.js';
import * as A from './art.js';
import { worldCircuit, camS1, camTf, toScr, NA } from './scene1.js';
import { bg } from './bg.js';
import { sceneKidney, gauges, causes, chart, labels2, camK, camKTf } from './scene2.js';
import { camS3, cutAt, endView, fiber, fiberMarks, controlDial, camF, camFTf, fiberA } from './scene3.js';
import { DZC, DRIP, PUMP } from './circuit.js';
import { limits, actions, raka4 } from './scene4.js';
const q = new URLSearchParams(location.search), $ = (id) => document.getElementById(id);
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
export const DUR = 78.84;

// ---- S1: sirkuit (0 - 8,4 dtk) dengan label singkat
function chipsS1(t, c) {
  let g = '';
  const L = [[1.0, 2.7, 'Akses di lengan', () => NA, 'L'], [3.3, 5.0, 'Pompa darah', () => [PUMP[0] + 0, PUMP[1] - 85], 'L']];
  L.forEach(([t0, t1, txt, anc, side]) => { const a = seg(t, t0, t0 + 0.3, eo) * (1 - seg(t, t1 - 0.3, t1)); if (a <= 0.01) return; const [wx, wy] = anc(), [x, y] = toScr(c, wx, wy); const w = A.chipW(txt); g += A.chip(x, y, txt, { cx: side === 'L' ? 24 + w / 2 : 1056 - w / 2, cy: clamp(y, 330, 1700), a }); });
  const qa = win(t, 6.0, 8.2, 0.3); if (qa > 0.01) { const [x, y] = toScr(c, DZC[0], DZC[1] - 20); const k = 1 + 0.06 * Math.sin(t * 6); g += `<g opacity="${f1(qa)}" transform="translate(${f1(x)} ${f1(y - 250)}) scale(${k.toFixed(3)})"><text text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="230" fill="${MC.gold}" stroke="#0A1A2E" stroke-width="16" paint-order="stroke" stroke-linejoin="round">?</text></g>`; }
  return g;
}
function sceneS1(t) { const c = camS1(t), Wd = worldCircuit(t, { cut: 0.55, expr: t > 6.0 ? 'penasaran' : 'netral', gazeX: t > 6.0 ? 0 : -0.5, gazeY: t > 6.0 ? -0.4 : -0.55 }); return bg(t, { px: c.cx, py: c.cy }) + `<g transform="${camTf(c)}">${Wd.svg}</g>` + chipsS1(t, c); }
function sceneS3c(t) {
  const c = camS3(t), Wd = worldCircuit(t, { cut: cutAt(t), expr: t > 62.5 ? 'lega' : 'netral' });
  let g = bg(t, { px: c.cx, py: c.cy }) + `<g transform="${camTf(c)}">${Wd.svg}</g>`;
  const L = [[34.4, 37.9, 'Hemodialisis', [170, 830 + 120], 'T'], [36.4, 38.6, 'Cuci darah', null, 'x'], [40.0, 41.9, 'Dialiser', () => [DZC[0], DZC[1] - 60], 'R'], [42.5, 44.3, 'Serat halus', () => [DZC[0] - 30, DZC[1] + 20], 'L'], [61.6, 63.6, 'Darah kembali\nke tubuh', () => [NA[0] + 20, NA[1] - 80], 'L']];
  L.forEach(([t0, t1, txt, anc, side]) => { const a = seg(t, t0, t0 + 0.3, eo) * (1 - seg(t, t1 - 0.3, t1)); if (a <= 0.01) return;
    if (side === 'x') { g += A.tag(540, 470, txt, { a, fs: 34 }); return; }
    if (side === 'T') { g += A.chip(540, 360, txt, { cx: 540, cy: 360, a, fs: 44, noLine: true }); return; }
    const [wx, wy] = anc(), [x, y] = toScr(c, wx, wy), w = A.chipW(txt); g += A.chip(x, y, txt, { cx: side === 'L' ? 24 + w / 2 : 1056 - w / 2, cy: clamp(y, 330, 1700), a }); });
  return g;
}
function fiberLayer(t) { const a = fiberA(t); if (a <= 0.01) return ''; const c = camF(t); return `<g opacity="${f1(a)}"><rect width="1080" height="1920" fill="#0B2F38" opacity=".96"/></g><g transform="${camFTf(c)}">${fiber(t)}</g>${fiberMarks(t, c)}${controlDial(t)}`; }
const op = (a, s) => (a <= 0.003 ? '' : a >= 0.997 ? s : `<g opacity="${f1(a)}">${s}</g>`);
export function master(t) {
  const a1 = 1 - seg(t, 7.9, 8.8), a2 = seg(t, 7.9, 8.8) * (1 - seg(t, 32.9, 33.7)), a3 = seg(t, 32.9, 33.7) * (1 - seg(t, 64.0, 64.9)), a4 = seg(t, 64.0, 64.9);
  let g = '';
  if (a1 > 0) g += op(a1, sceneS1(Math.min(t, 8.9)));
  if (a2 > 0) g += op(a2, bg(t) + `<g transform="${camKTf(camK(t))}">${sceneKidney(Math.min(Math.max(t, 8.4), 33.7))}</g>` + gauges(t) + causes(t) + chart(t) + labels2(t));
  if (a3 > 0) g += op(a3, sceneS3c(Math.min(Math.max(t, 33.0), 65)) + endView(t) + fiberLayer(t));
  if (a4 > 0) g += op(a4, bg(t) + limits(t) + (t > 70 ? raka4(t) : '') + actions(t));
  return g;
}
async function renderFrame(t) { $('scene').innerHTML = A.defs() + master(t); }
window.renderFrame = renderFrame; await renderFrame(+(q.get('t') ?? 0)); window.__ready = true;

// ---- ekspor aset yang dapat diedit (SVG mandiri): window.asetSvg(nama)
const WRAP = (inner, w = 1080, h = 1920, vb = `0 0 ${w} ${h}`) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${A.defs()}${inner}</svg>`;
window.asetSvg = (nama) => {
  if (nama === 'ginjal-normal') return WRAP(A.kidney({ fn: 1, cut: 1, id: 'ex1' }), 520, 700, '-170 -300 440 600');
  if (nama === 'ginjal-fungsi-turun') return WRAP(A.kidney({ fn: 0.25, cut: 1, id: 'ex2' }), 520, 700, '-170 -300 440 600');
  if (nama === 'dialiser-cangkang') return WRAP(A.dialyzer({ cut: 0, id: 'ex3' }), 400, 900, '-180 -420 360 840');
  if (nama === 'dialiser-bening-serat') return WRAP(A.dialyzer({ cut: 1, phB: 0, phD: 0, id: 'ex4' }), 400, 900, '-180 -420 360 840');
  if (nama === 'latar') return WRAP(bg(0));
  if (nama === 'sirkuit-dunia') { const Wd = worldCircuit(1.0, { cut: 1 }); return WRAP(Wd.svg, 1100, 1800, '-200 0 1000 1700'); }
  if (nama === 'serat-memanjang') return WRAP(fiber(52.5) + '', 1080, 1920);
  if (nama === 'serat-melintang') return WRAP(endView(45.2), 1080, 1920);
  return '';
};
