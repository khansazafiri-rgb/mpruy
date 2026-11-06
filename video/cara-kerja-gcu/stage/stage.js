import { f1, MC, FONT, clamp, eio } from './core.js';
import * as A from './art.js';
import { raws, T_CONTACT, worldPts } from './shotA.js';
import { camA, camTf } from './camA.js';
import { sceneB, B0, B1, camB, bgDark } from './shotB.js';
import { sceneC, sceneD, sceneEF, cardsE, logoEnd, CARD_DEFS, cardC } from './shotC.js';
const q = new URLSearchParams(location.search), $ = (id) => document.getElementById(id);
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;

export function bgCream(t = 0, o = {}) {
  let g = `<defs><linearGradient id="bgC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBF8EE"/><stop offset=".6" stop-color="#F3EEDD"/><stop offset="1" stop-color="#E7E1CC"/></linearGradient><radialGradient id="bgGlow" cx=".2" cy=".15" r=".8"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#bgC)"/><rect width="1080" height="1920" fill="url(#bgGlow)"/>`;
  let ln = ''; for (let x = 0; x <= 1080; x += 90) ln += `<line x1="${x}" y1="0" x2="${x}" y2="1920" stroke="${MC.brand}" stroke-width="${x % 360 ? 1.2 : 2.2}" opacity="${x % 360 ? 0.06 : 0.1}"/>`;
  for (let y = 0; y <= 1920; y += 90) ln += `<line x1="0" y1="${y}" x2="1080" y2="${y}" stroke="${MC.brand}" stroke-width="${y % 360 ? 1.2 : 2.2}" opacity="${y % 360 ? 0.06 : 0.1}"/>`;
  const arc = (x, y, w, h, rx, sw, op) => `<path d="M${x + w} ${y}H${x + rx}A${rx} ${rx} 0 0 0 ${x} ${y + rx}V${y + h - rx}A${rx} ${rx} 0 0 0 ${x + rx} ${y + h}H${x + w}" fill="none" stroke="${MC.brand}" stroke-width="${sw}" stroke-linecap="round" opacity="${op}"/>`;
  g += ln + arc(-520 - t * 4, 160, 1180, 1500, 220, 30, 0.05) + arc(-470 - t * 6, 290, 1000, 1240, 180, 26, 0.06) + arc(-420 - t * 8, 410, 820, 1000, 140, 22, 0.07);
  return g;
}
function sceneA(t) {
  const R = raws(t), c = camA(t);
  return bgCream(t) + `<g transform="${camTf(c)}">${R.svg}</g>`;
}
const iris = (under, over, cx, cy, u, id = 'ir') => { const r = 2400 * u * u; return u <= 0 ? under : u >= 1 ? over : `${under}<clipPath id="${id}"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}"/></clipPath><g clip-path="url(#${id})">${over}</g><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="none" stroke="${MC.ivory}" stroke-width="${f1(14 * (1 - u))}" opacity="${f1(0.9 * (1 - u))}"/>`; };
function sceneCfull(t, expand = 0) {
  const C = sceneC(t);
  return bgCream(t) + CARD_DEFS + C.svg + (expand < 0.02 ? C.card(0) + C.labels : C.card(expand));
}
function sceneDfull(t) { return bgDark(t, { cx: 0, cy: 480 }) + sceneD(t); }
function sceneEFfull(t) { const E = sceneEF(t); return bgCream(t) + E.svg + cardsE(t) + logoEnd(t); }
function master(t) {
  if (t < B0) return sceneA(t);
  if (t < 31.6) return sceneB(t);
  if (t < 32.3) { const c = camB(31.6), lcd = [540 + (0 - c.cx) * c.s, 960 + (555 - c.cy) * c.s]; return iris(sceneB(31.59), sceneCfull(t), lcd[0], lcd[1], (t - 31.6) / 0.7, 'ir1'); }
  if (t < 35.0) return sceneCfull(t);
  if (t < 35.62) return sceneCfull(Math.min(t, 35.0), eio((t - 35.0) / 0.6));
  if (t < 42.45) return sceneDfull(t);
  if (t < 43.0) return iris(sceneDfull(42.44), sceneEFfull(t), 540, 1500, (t - 42.45) / 0.55, 'ir2');
  return sceneEFfull(t);
}
async function renderFrame(t) { $('scene').innerHTML = A.defs() + master(t); }
window.renderFrame = renderFrame; await renderFrame(+(q.get('t') ?? 0)); window.__ready = true;
