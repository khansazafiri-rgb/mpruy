import { f1, MC, FONT, clamp, lerp, seg, eo, eio, sm, win, pchip } from './core.js';
import * as A from './art.js';
import { bg } from './bg.js';
import { camV as camVessel, worldTf, chipsHeart, chipsVessel, labSheet, rewindDial, ldlCards, yearsRibbon, rakaHealthy, myoPanel } from './scenes.js';
import { heart, heartToScreen, LAD_PT } from './heart.js';
import { sceneSeated, sceneWait, scenePrevent, sceneDoctor, sceneStroll, sceneClose } from './scenes2.js';
import { vesselWorld } from './vessel.js';
import { stairsWorld, stairsDefs, rakaS1, rakaGroup, chestWorld, K, sCl } from './stairs.js';
const q = new URLSearchParams(location.search), $ = (id) => document.getElementById(id);
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
export const DUR = 72.24;
function cam1(t, r) { const S = pchip([[0, 1.22], [3, 1.22], [5.2, 1.34], [7.1, 1.5], [8.7, 2.8]])(t), w = seg(t, 7.2, 8.4, eio), ch = chestWorld(r.st, r.X, r.Y); return { S, cx: lerp(r.X + 70 - (t > 5 ? 60 : 0), ch[0], w), cy: lerp(r.Y - 380, ch[1], w) }; }
function scene1(t) {
  const r = rakaS1(t), c = cam1(t, r);
  const tf = `translate(${f1(540 - c.cx * c.S)} ${f1(980 - c.cy * c.S)}) scale(${c.S})`;
  const toS = (wx, wy) => [540 + (wx - c.cx) * c.S, 980 + (wy - c.cy) * c.S], [chx, chy] = toS(...chestWorld(r.st, r.X, r.Y)), [hdx, hdy] = toS(r.X + 20, r.Y + (150 + (r.st.bob || 0) - 778) * K);
  return bg(t, { px: c.cx, py: c.cy }) + stairsDefs() + `<g transform="${tf}">${stairsWorld(c.cx - 900, c.cx + 900)}${rakaGroup(r.st, r.X, r.Y, r.ank, 'rk1')}</g>` + A.chips(t, [[3.1, 4.8, 'Dada terasa\ntertindih', chx, chy, 880, chy + 10], [5.1, 6.9, 'Keringat\ndingin', hdx, hdy, 190, hdy - 60]]);
}
const camH = (t) => { const k = (a) => pchip(a)(t); return { cx: k([[7.9, 285], [10.5, 320], [11.3, 375], [12.6, 389]]), cy: k([[7.9, 740], [10.5, 790], [11.3, 830], [12.6, 830]]), S: k([[7.9, 0.75], [9.0, 1.7], [10.5, 2.0], [11.3, 3.6], [12.6, 7.5]]) }; };
const op = (a, x) => (a <= 0.003 ? '' : a >= 0.997 ? x : `<g opacity="${f1(a)}">${x}</g>`);
function sceneH(t) { const c = camH(t); const tt = t >= 11.3 ? 1 : 0.8 + 0.2 * Math.sin(t * 5); return bg(t, { px: c.cx, py: c.cy }) + heart(t, c, { blocked: seg(t, 9.2, 10.0), isk: seg(t, 10.1, 11.0) }) + chipsHeart(t, c, heartToScreen); }
function sceneV(t) { const c = camVessel(t); return bg(t, { px: c.cx * c.S * 0.3, py: c.cy * c.S * 0.3 }) + `<g transform="${worldTf(c)}">${vesselWorld(t, c)}</g>` + labSheet(t) + rewindDial(t) + ldlCards(t) + yearsRibbon(t) + rakaHealthy(t) + myoPanel(t) + chipsVessel(t, c); }
export function master(t) {
  if (q.has('H')) return sceneH(t); if (q.has('V')) return sceneV(t);
  if (q.has('Q')) return sceneSeated(t); if (q.has('W')) return sceneWait(t); if (q.has('P')) return scenePrevent(t); if (q.has('D')) return sceneDoctor(t); if (q.has('R')) return sceneStroll(t); if (q.has('C')) return sceneClose(t);
  const a1 = 1 - seg(t, 7.8, 8.6), a2 = seg(t, 7.9, 8.7) * (1 - seg(t, 11.7, 12.6)), a3 = seg(t, 11.6, 12.5) * (1 - seg(t, 44.0, 44.8)), a4 = seg(t, 44.0, 44.8) * (1 - seg(t, 51.3, 51.9));
  let g = '';
  if (t < 8.7) g += op(a1, scene1(Math.min(t, 8.7)));
  if (t >= 7.9 && t < 12.7) g += op(a2, sceneH(Math.min(Math.max(t, 7.9), 12.7)));
  if (t >= 11.6 && t < 44.9) g += op(a3, sceneV(Math.min(Math.max(t, 11.6), 44.9)));
  if (t >= 44.0 && t < 52) g += op(a4, sceneSeated(Math.min(Math.max(t, 44.0), 51.9)));
  if (t >= 51.3 && t < 55.3) g += sceneWait(t);
  if (t >= 54.6 && t < 63.1) g += scenePrevent(t);
  if (t >= 62.4 && t < 66.3) g += sceneDoctor(t);
  if (t >= 65.6 && t < 69.1) g += sceneStroll(t);
  if (t >= 68.4) g += sceneClose(t);
  return g;
}
async function renderFrame(t) { $('scene').innerHTML = A.defs() + master(t); }
window.renderFrame = renderFrame; await renderFrame(+(q.get('t') ?? 0)); window.__ready = true;

// ---- ekspor aset berlapis yang dapat diedit (SVG mandiri): window.asetSvg(nama)
const WRAP = (inner, w = 1080, h = 1920, vb = `0 0 ${w} ${h}`) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${vb}">${A.defs()}${inner}</svg>`;
window.asetSvg = (nama) => {
  const V = (t, c) => WRAP(`<g>${vesselWorld(t, c)}</g>`, 1080, 1920, `${c.cx - 540 / c.S} ${c.cy - 960 / c.S} ${1080 / c.S} ${1920 / c.S}`);
  if (nama === 'latar') return WRAP(bg(0));
  if (nama === 'arteri-normal') return V(21.0, { cx: 0, cy: 0, S: 0.9 });
  if (nama === 'arteri-plak-menyempit') return V(39.6, { cx: 60, cy: 0, S: 0.9 });
  if (nama === 'arteri-ruptur-bekuan') return V(43.8, { cx: 60, cy: -40, S: 0.9 });
  if (nama === 'dinding-ldl-sel-imun') return V(31.0, { cx: 150, cy: 0, S: 2.4 });
  if (nama === 'jantung-koroner') return WRAP(heart(10.5, { cx: 285, cy: 740, S: 1.75 }, { blocked: 1, isk: 1 }));
  if (nama === 'tangga-raka-duduk') return WRAP(bg(8) + stairsDefs() + (() => { const r = rakaS1(8.2); const c = { cx: 600, cy: r.Y - 340, S: 1.4 }; return `<g transform="translate(${540 - c.cx * c.S} ${980 - c.cy * c.S}) scale(${c.S})">${stairsWorld(c.cx - 700, c.cx + 700)}${rakaGroup(r.st, r.X, r.Y, r.ank, 'rkE')}</g>`; })());
  return '';
};
