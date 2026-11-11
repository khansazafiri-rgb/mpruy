// "LEVEL UP" (1080 x 1920, 30 fps, 40 dtk, tanpa narator). Dunia pixel dari kode + maskot MEDCOEL asli + rekaman web MEDCOEL ASLI di panel laptop + montage anatomi dari rekaman produk.
// HUD (LV, PAHAM, ENERGI, BAB x/13) dan blok BAB adalah perangkat cerita video, BUKAN fitur produk.
import { f1, MC, FONT, clamp, lerp, sm, eo, ei, eio, eob, seg, win, pchip } from './core.js';
import { defs } from './art.js';
import { loadMascots, mascot, sweat } from './mascot.js';
import { world, blocks, hud, typer, block, pxt, pxSpark, confetti, bonk, flash, scan, pixelClip, R, T, PX, BS } from './pix.js';
import { LAPTOP, laptop, runPose } from './world.js';
const q = new URLSearchParams(location.search), $ = (id) => document.getElementById(id);
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.load('400 40px "Press Start 2P"'); await document.fonts.ready; await loadMascots();
export const DUR = 40.0;
const WEB = '/video/level-up/rekam/web';
const G = 1260;                                    // garis tanah dunia pixel
const P1 = { x: 20, y: 470, w: 1040, h: 980 };
const ZS = 1080 / LAPTOP.w, ZOOM_RECT = { x: 0, y: 960 - LAPTOP.h * ZS / 2, w: 1080, h: LAPTOP.h * ZS };
// ---- jadwal rekaman web ASLI: [t0, t1, klip, bingkai0, bingkai1, tampilan0 [cx, cy, zoom], tampilan1]; sumber 1080 x 1800
const SEG = [
  [18.0, 19.5, 'mk', 0, 74, [540, 700, 1.04], [540, 760, 1.04]],
  [19.5, 21.0, 'bab', 40, 90, [540, 760, 1.04], [540, 700, 1.04]],
  [21.0, 22.4, 'materi', 36, 108, [540, 700, 1.04], [540, 780, 1.04]],
  [22.4, 24.4, 'flash', 46, 128, [540, 900, 1.04], [540, 900, 1.04]],
  [24.4, 25.7, 'learning', 39, 98, [540, 1000, 1.04], [540, 1000, 1.04]],
  [25.7, 26.9, 'learning', 98, 140, [540, 760, 1.04], [540, 760, 1.04]],
  [26.9, 29.0, 'learning', 140, 216, [540, 760, 1.04], [540, 1060, 1.04]],
  [29.0, 30.5, 'atlas', 1, 46, null, null],
  [30.5, 31.8, 'probe', 1, 43, null, null],
  [31.8, 33.0, 'ct', 1, 42, null, null],
];
const MONT = new Set(['atlas', 'probe', 'ct']);
const urlOf = (clip, i) => `${WEB}/${clip}/f${String(Math.round(i)).padStart(4, '0')}.jpg`;
const cache = new Map();
const load = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().catch(() => {})); } return cache.get(u); };
function webFrame(t) {
  const s = SEG.find((x) => t >= x[0] && t < x[1]) || (t < SEG[0][0] ? SEG[0] : SEG[SEG.length - 1]); const u = clamp((t - s[0]) / (s[1] - s[0]));
  const i = lerp(s[3], s[4], u), v = s[5] ? [0, 1, 2].map((k) => lerp(s[5][k], s[6][k], sm(u))) : null;
  return { clip: s[2], i, v };
}
// ---- HUD per waktu
const stepv = (t, a) => { let v = a[0][1]; for (const [ti, vi] of a) if (t >= ti) v = vi; return v; };
const IMPACT = [3.9, 5.6, 7.3];                    // detik benturan Kori ke tembok BAB (lompatan gagal)
const LVUP = 28.8;                                 // detik LEVEL UP
const pahamF = pchip([[0, 0], [17.9, 0], [18.6, 0.05], [19.5, 0.12], [21.0, 0.15], [22.4, 0.33], [24.4, 0.56], [26.9, 0.62], [27.4, 0.64], [LVUP, 1], [40, 1]]);
function hudAt(t) {
  const energy = stepv(t, [[0, 5], [IMPACT[0], 4], [IMPACT[1], 3], [IMPACT[2], 2], [18.4, 3], [21.0, 4], [LVUP, 5]]);
  const sh = IMPACT.reduce((a, ti) => a + (t >= ti && t < ti + 0.3 ? 1 : 0), 0);
  return { lv: t >= LVUP ? 2 : 1, paham: t < 17.9 ? 0 : pahamF(t), energy, bab: t >= LVUP ? 1 : 0, pop: t >= LVUP ? clamp(1 - (t - LVUP) / 0.9) : 0, shake: sh, t };
}
// ---- Kori: lari, lompat gagal tiga kali, lemas, lalu menemukan MEDCOEL
const KX0 = 340, JUMPS = [3.4, 5.1, 6.8], JD = 1.0;
const pixQ = (t) => [0, 1, 2].map((i) => pxt(60 + i * 100, 64 + (i % 2) * 24 + Math.sin(t * 5 + i * 1.8) * 6, '?', MC.gold, 56, { sw: 10 })).join('');
function koriPose(t) {
  const base = { x: KX0, dy: 0, flip: -1, rot: 0, sx: 1, sy: 1, arm: 0, eyes: 'normal', mouth: 'think', bob: Math.sin(t * 5) * 2, over: '', spark: 0.7 };
  if (t < 3.0) { const sp = 1 - sm((t - 2.3) / 0.7), p = runPose(t, 15); return { ...base, x: lerp(840, KX0, eo(t / 3.0)), bob: p.bob * sp + (1 - sp) * base.bob, rot: p.rot * sp, sx: p.sx, sy: p.sy, arm: p.arm * sp, mouth: 'happy', run: sp }; }
  for (let a = 0; a < 3; a++) {
    const u = (t - JUMPS[a]) / JD; if (u < 0 || u > 1) continue;
    let x, dy;
    if (u < 0.5) { const v = u / 0.5; x = KX0 - 150 * eo(v); dy = -250 * Math.sin(Math.PI / 2 * v); } else { const v = (u - 0.5) / 0.5; x = KX0 - 150 + 130 * sm(v); dy = -250 * (1 - v * v); }
    const hit = u >= 0.5 && u < 0.66;
    return { ...base, x, dy, rot: u < 0.5 ? -6 * (u / 0.5) : -16 * (1 - sm((u - 0.5) / 0.5)), arm: -70 + (hit ? 30 : 0), sx: hit ? 0.92 : 1, sy: hit ? 1.1 : 1.05, eyes: hit || (u > 0.66 && u < 0.85) ? 'blink' : 'normal', mouth: u < 0.5 ? 'happy' : 'think', over: u > 0.5 ? sweat(0.8) : '' };
  }
  const nJ = JUMPS.filter((j) => t >= j + JD).length, tired = Math.min(1, nJ / 3);
  if (t < 9.0) { const crouch = JUMPS.some((j) => t > j - 0.18 && t < j) ? 0.9 : 1; return { ...base, sy: crouch * lerp(1, 0.86, seg(t, 7.8, 9.0)), sx: lerp(1, 1.04, seg(t, 7.8, 9.0)), eyes: nJ ? 'tired' : 'normal', over: sweat(0.3 + tired * 0.6) }; }
  if (t < 12.4) return { ...base, sy: 0.74, sx: 1.07, eyes: 'tired', bob: Math.sin(t * 2.2) * 2, over: sweat(0.9) + `<g transform="translate(20 -30)">${pixQ(t)}</g>` };
  if (t < 14.0) return { ...base, flip: 1, sy: 0.74, sx: 1.07, eyes: 'normal', bob: Math.sin(t * 2.2) * 2, over: sweat(0.6) };
  const r = seg(t, 14.0, 14.6);
  if (t < 15.4) return { ...base, flip: 1, sy: lerp(0.74, 1, r), sx: lerp(1.07, 1, r), bob: Math.sin(t * 5) * 3 };
  return { ...base, flip: 1, eyes: 'happy', mouth: 'happy', arm: lerp(0, -62, eob(seg(t, 15.4, 15.9))) + (t > 15.9 ? Math.sin(t * 14) * 8 : 0), bob: Math.sin(t * 8) * 4, spark: 1 };
}
function koriClosing(t) {
  const hop = seg(t, 36.3, 36.95, (x) => x), u = clamp((t - 36.3) / 0.65);
  const x = lerp(400, 272, sm(u)), dy = -BS * eo(u) - Math.sin(Math.PI * u) * 140, landed = t >= 36.95;
  return { x, dy, flip: -1, rot: 0, sx: 1, sy: landed ? 1 + Math.exp(-(t - 36.95) * 10) * -0.1 : 1, arm: -28 + Math.sin(t * 9) * 12, eyes: t < 35.6 ? 'normal' : 'happy', mouth: 'happy', bob: landed || u > 0 ? 0 : Math.sin(t * 3) * 3, over: '', spark: 1 };
}
function koriSvg(t) {
  const k = t >= 33.7 ? koriClosing(t) : koriPose(t), hh = Math.abs(k.dy);
  return `<ellipse cx="${f1(k.x)}" cy="${G + 6}" rx="${f1(Math.max(40, 112 - hh * 0.25))}" ry="14" fill="#021014" opacity="${f1(Math.max(0.1, 0.35 - hh * 0.0008))}"/>` + mascot('kori', { x: k.x, y: G + k.dy, s: 1.0, flip: k.flip, rot: k.rot, bob: k.bob, sx: k.sx, sy: k.sy, arm: k.arm, eyes: k.eyes, mouth: k.mouth, over: k.over, spark: k.spark });
}
const scrollAt = (t) => { const v = clamp((t - 2.2) / 0.8); const s = t < 2.2 ? 620 * t : 620 * 2.2 + 620 * 0.8 * (v - v * v / 2); return -s; };
function shk(t) { let a = 0; for (const ti of IMPACT) if (t >= ti && t < ti + 0.4) a += 14 * Math.exp(-(t - ti) * 12); return [Math.sin(t * 90) * a, Math.cos(t * 77) * a * 0.6]; }
// ---- adegan dunia pixel (sebelum 18,0 dan sesudah 33,7)
function scene(t) {
  let g = world(t, { scroll: scrollAt(t), G });
  g += blocks(t, { drop: 0.7, morph: 34.5, gold1: t >= 33.7 });
  const dim = 0.4 * seg(t, 9.0, 9.8) * (1 - seg(t, 13.8, 14.8));
  if (dim > 0.01) g += R(0, 0, 1080, 1920, '#020A10', 0, `opacity="${f1(dim)}"`);
  if (t >= 12.4) {
    const st = t < 14.4 ? 'on' : t < 33.7 ? 'prompt' : 'after';
    if (t < 13.6) { const p = seg(t, 12.4, 13.6), px = pixelClip('clipLap', p, { x: LAPTOP.cx - 340, y: LAPTOP.cy - 190, w: 680, h: 480 }, 7, 24); g += px.clip + `<g clip-path="url(#clipLap)">${laptop(t, st, 1)}</g>${px.edge}`; }
    else g += laptop(t, st, 1);
  }
  g += koriSvg(t);
  for (const ti of IMPACT) g += bonk(230, 880, t - ti);
  if (t >= 36.95 && t < 38.2) { const u = t - 36.95; g += pxSpark(272, 1110 - u * 40, 1 + 0.4 * Math.sin(u * 20), MC.gold) + confetti(272, 1150, u, 14, 9, 260); }
  if (t >= 36.0) { const ka = seg(t, 36.0, 36.5, eob), na = seg(t, 36.4, 36.9, eob);
    g += `<g opacity="${f1(ka)}">${mascot('kila', { x: 650, y: 800 + (1 - ka) * 60, s: 0.62, bob: Math.sin(t * 4) * 8, arm: Math.sin(t * 9) * 20, eyes: 'happy', mouth: 'happy', spark: 0.6 + 0.4 * Math.sin(t * 9) })}</g>`;
    g += `<g opacity="${f1(na)}">${mascot('nilo', { x: 985, y: 1330, s: 0.58, bob: Math.sin(t * 3 + 1) * 3, arm: -20 + Math.sin(t * 6) * 14, eyes: 'normal', mouth: 'happy', spark: 0.8 })}</g>`; }
  return g + scan();
}
// ---- panel laptop dengan rekaman web asli / montage
const lerpR = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) });
function panelRect(t) {
  if (t < 18.0) return ZOOM_RECT;
  if (t < 18.7) return lerpR(ZOOM_RECT, P1, eio((t - 18.0) / 0.7));
  if (t < 33.0) return P1;
  if (t < 33.7) return lerpR(P1, ZOOM_RECT, eio((t - 33.0) / 0.7));
  return ZOOM_RECT;
}
function panelSvg(t, r) {
  const f = webFrame(Math.min(Math.max(t, 18.0), 33.0)), mont = MONT.has(f.clip);
  let img;
  if (mont) { img = `<image href="${urlOf(f.clip, f.i)}" x="${f1(r.x)}" y="${f1(r.y)}" width="${f1(r.w)}" height="${f1(r.h)}" preserveAspectRatio="xMidYMid slice"/>`; }
  else { const z = f.v[2], sc = (r.w / 1080) * z, x = r.x + r.w / 2 - f.v[0] * sc, y = r.y + r.h / 2 - f.v[1] * sc; img = `<image href="${urlOf(f.clip, f.i)}" x="${f1(x)}" y="${f1(y)}" width="${f1(1080 * sc)}" height="${f1(1800 * sc)}" preserveAspectRatio="none"/>`; }
  const rad = lerp(10, 28, clamp((r.w - ZOOM_RECT.w * 0.9) / 60));
  return { f, mont, svg: `<clipPath id="clipPanel"><rect x="${f1(r.x)}" y="${f1(r.y)}" width="${f1(r.w)}" height="${f1(r.h)}" rx="${f1(rad)}"/></clipPath><g clip-path="url(#clipPanel)"><rect x="${f1(r.x)}" y="${f1(r.y)}" width="${f1(r.w)}" height="${f1(r.h)}" fill="#EAF6F1"/>${img}</g>`, rad };
}
// ---- teks
function captions(t) {
  let g = '';
  g += typer('POV: KAMU LAGI LEVEL 1', t, 0.12, 3.0, { fs: 58, cps: 38 });
  g += typer('13 BAB. LOMPAT SEKALIGUS?', t, 3.0, 5.0, { fs: 46, w: 1000, cps: 34 });
  g += typer('NYANGKUT.', t, 5.0, 7.0, { fs: 56, cps: 14, px: true, red: true });
  g += typer('ULANG LAGI...', t, 7.0, 9.0, { fs: 52, cps: 14, px: true, red: true });
  g += typer('MULAI DARI MANA?', t, 9.4, 14.0, { fs: 52, cps: 14, px: true });
  g += typer('PILIH SATU BAB.', t, 18.4, 20.8, { fs: 52, cps: 16, px: true });
  g += typer('MATERI → FLASHCARD → LATIHAN', t, 20.9, 25.0, { fs: 44, w: 1000, cps: 30 });
  g += typer('SALAH? LIHAT PEMBAHASANNYA.', t, 25.1, 29.0, { fs: 46, w: 1000, cps: 30 });
  g += typer('ANATOMI? JELAJAHI 3D & LIVE 4D LAB.', t, 29.0, 33.0, { fs: 42, w: 1010, cps: 34 });
  g += typer('SATU BAB DULU.', t, 35.4, 37.6, { fs: 56, cps: 14, px: true });
  const fin = clamp((t - 37.6) / 0.25) * clamp((40.2 - t) / 0.1);
  if (fin > 0) g += `<g opacity="${f1(fin)}">${R(60, 372, 960, 110, 'rgba(10,28,36,.95)', 18, `stroke="${MC.gold}" stroke-width="4"`)}<text x="540" y="425" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="40" fill="${MC.ivory}">MEDCOEL GRATIS DI</text><text x="540" y="468" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="46" fill="${MC.gold}">medcoel.com</text></g>`;
  if (t >= 30.2 && t < 33.0) { const a = clamp((t - 30.2) / 0.2) * clamp((33.0 - t) / 0.1);
    g += `<g opacity="${f1(a)}">${R(48, 486, 330, 54, MC.gold, 0, `stroke="${MC.ink}" stroke-width="4" shape-rendering="crispEdges"`)}${pxt(213, 522, 'BONUS STAGE', MC.ink, 18, { stroke: false })}</g>`; }
  if (t >= 29.0 && t < 33.0) { const a = clamp((t - 30.3) / 0.2) * clamp((33.0 - t) / 0.1);
    if (t >= 30.5) g += `<g opacity="${f1(a)}">${R(40, 1378, 330, 56, 'rgba(10,56,48,.95)', 28, `stroke="${MC.gold}" stroke-width="3"`)}${T(205, 1417, 'Simulasi edukatif', MC.ivory, 28, '', 'middle', 700)}</g>`;
    g += `<g opacity="${f1(clamp((t - 29.3) / 0.2) * clamp((33.0 - t) / 0.1))}">${R(780, 1378, 240, 56, MC.gold, 28, `stroke="${MC.ink}" stroke-width="3"`)}${T(900, 1417, t < 30.5 ? 'Atlas 3D' : 'Live 4D Lab', MC.ink, 28)}</g>`; }
  return g;
}
// ---- maskot pendamping di bagian web + LEVEL UP
function webMascots(t) {
  let g = '';
  const na = win(t, 27.2, 28.6, 0.25), ka = win(t, 28.4, 29.6, 0.25), FY = 1735;
  if (na > 0.01) g += `<g opacity="${f1(na)}">${mascot('nilo', { x: 940, y: FY - (1 - na) * 40, s: 0.62, bob: Math.sin(t * 6) * 5, arm: -18 + Math.sin(t * 8) * 14, eyes: 'normal', mouth: 'think' })}${R(520, 1580, 330, 78, MC.ivory, 34, `stroke="${MC.ink}" stroke-width="3"`)}${T(685, 1630, 'Coba lagi, yuk!', MC.ink, 32)}</g>`;
  if (ka > 0.01) g += `<g opacity="${f1(ka)}">${mascot('kila', { x: 940, y: FY - (1 - ka) * 40, s: 0.62, bob: Math.sin(t * 7) * 7, arm: Math.sin(t * 9) * 18, eyes: 'happy', mouth: 'happy', spark: 0.6 + 0.4 * Math.sin(t * 10) })}${R(520, 1580, 330, 78, MC.ivory, 34, `stroke="${MC.ink}" stroke-width="3"`)}${T(685, 1630, 'Mulai nyambung!', MC.ink, 30)}</g>`;
  return g;
}
function levelUp(t) {
  const u = t - LVUP; if (u < 0 || u > 1.5) return '';
  const a = clamp(u / 0.1) * clamp((1.5 - u) / 0.3), k = eob(clamp(u / 0.35));
  return `<g opacity="${f1(a)}"><rect width="1080" height="1920" fill="#06151C" opacity=".55"/>${confetti(540, 930, u, 44, 5, 620)}<g transform="translate(540 930) scale(${f1(k)}) translate(-540 -930)">${pxt(540, 940, 'LEVEL UP!', MC.gold, 92, { sw: 18 })}${pxt(540, 1040, 'LV 1 > LV 2', MC.ivory, 40, { sw: 12 })}${pxSpark(110, 880, 1.4)}${pxSpark(970, 830, 1.2)}</g></g>`;
}
export function master(t) {
  let g = '';
  const web = t >= 18.0 && t < 33.7;
  let S = 1; if (t >= 16.0 && t < 17.2) S = lerp(1, ZS, eio((t - 16.0) / 1.2)); else if (t >= 17.2 && t < 34.4) S = ZS; else if (t >= 34.4 && t < 35.4) S = lerp(ZS, 1, eio((t - 34.4) / 1.0));
  const [sx, sy] = S === 1 ? shk(t) : [0, 0];
  const camTf = S === 1 ? (sx || sy ? `translate(${f1(sx)} ${f1(sy)})` : '') : `translate(${f1(540 - LAPTOP.cx * S)} ${f1(960 - LAPTOP.cy * S)}) scale(${f1(S * 1000) / 1000})`;
  if (!web) g += `<g transform="${camTf}">${scene(Math.min(t, 40))}</g>`;
  else g += world(t, { scroll: scrollAt(30), G: 1700 }) + scan();
  // transisi pixel dan panel web
  const pIn = seg(t, 17.2, 18.0, sm), pOut = 1 - seg(t, 33.7, 34.4, sm);
  if (t >= 17.2 && t < 34.4) {
    const r = panelRect(t), p = t < 18.0 ? pIn : t >= 33.7 ? pOut : 1;
    const px = pixelClip('clipPix', p, ZOOM_RECT, 3, 40), pn = panelSvg(t, r);
    if (t < 18.0 || t >= 33.7) g += px.clip + `<g clip-path="url(#clipPix)">${pn.svg}</g>${px.edge}`;
    else g += `<rect x="${f1(r.x - 6)}" y="${f1(r.y - 6)}" width="${f1(r.w + 12)}" height="${f1(r.h + 12)}" rx="${f1(pn.rad + 6)}" fill="#141D26" stroke="${MC.gold}" stroke-width="4"/>` + pn.svg;
  }
  if (t >= 18.7 && t < 33.0) g += webMascots(t);
  if (t >= LVUP - 0.02 && t < LVUP + 0.15) g += flash(clamp(1 - (t - LVUP) / 0.15) * 0.6);
  g += levelUp(t) + hud(hudAt(t)) + captions(t);
  return g;
}
async function renderFrame(t) {
  if (t >= 17.2 && t < 34.4) { const f = webFrame(Math.min(Math.max(t, 18.0), 33.0)); await load(urlOf(f.clip, f.i)); }
  $('scene').innerHTML = defs() + master(t); await new Promise((r) => requestAnimationFrame(() => r()));
}
window.renderFrame = renderFrame; await renderFrame(+(q.get('t') ?? 0)); window.__ready = true;
