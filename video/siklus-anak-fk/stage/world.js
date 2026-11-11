// Dunia animasi "Siklus anak FK" (kode SVG, identitas MEDCOEL): lorong, ruang kuliah, jalan pulang, meja belajar + tumpukan materi, HUD bergaya game.
import { f1, clamp, lerp, sm, eo, ei, eio, seg, win, MC, FONT, rnd } from './core.js';
import { mascot, sweat, qmarks, swirl } from './mascot.js';

const R = (x, y, w, h, f, rx = 0, e = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx}" fill="${f}" ${e}/>`;
const C = (x, y, r, f, e = '') => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${f}" ${e}/>`;
const T = (x, y, txt, f, size, e = '', anchor = 'middle', w = 800) => `<text x="${f1(x)}" y="${f1(y)}" font-family="${FONT}" font-weight="${w}" font-size="${size}" fill="${f}" text-anchor="${anchor}" ${e}>${txt}</text>`;
const MONO = "'DejaVu Sans Mono','Liberation Mono',monospace";

// ------------------------------------------------------------------ HUD bergaya game (indikator hari, jam, energi, status, tumpukan tugas)
const heart = (x, y, on, k = 1) => { const px = 5 * k, P = ['01100110', '11111111', '11111111', '01111110', '00111100', '00011000']; let g = ''; P.forEach((row, r) => [...row].forEach((c, i) => { if (c === '1') g += `<rect x="${f1(x + i * px)}" y="${f1(y + r * px)}" width="${px}" height="${px}" fill="${on ? '#FF6A6A' : '#3E5560'}"/>`; })); return g; };
export function hud(o) {
  const { day = 1, clock = '07:30', energy = 5, status = 'SEMANGAT', tugas = 0.2, alert = 0, t = 0 } = o;
  const shake = alert ? Math.sin(t * 60) * 3 * alert : 0;
  let s = `<g transform="translate(${f1(shake)} 0)">${R(40, 250, 1000, 92, 'rgba(10,28,36,.94)', 22, `stroke="${MC.gold}" stroke-width="4"`)}`;
  s += `<text x="70" y="292" font-family="${MONO}" font-weight="700" font-size="34" fill="${MC.ivory}">HARI ${day}</text>`;
  s += `<text x="290" y="292" font-family="${MONO}" font-weight="700" font-size="34" fill="${MC.gold}">${clock}</text>`;
  s += `<text x="520" y="292" font-family="${MONO}" font-weight="700" font-size="24" fill="#A9C3C8">ENERGI</text>`;
  for (let i = 0; i < 5; i++) s += heart(655 + i * 62, 267, i < energy, 1.25);
  s += `<text x="70" y="326" font-family="${MONO}" font-weight="700" font-size="25" fill="${alert > 0.5 ? '#FF8A7A' : '#7CE0B8'}">STATUS: ${status}</text>`;
  s += `<text x="560" y="326" font-family="${MONO}" font-weight="700" font-size="25" fill="#A9C3C8">TUGAS</text>`;
  s += R(660, 308, 340, 20, '#27414C', 4) + R(662, 310, f1(336 * clamp(tugas)), 16, tugas > 0.7 ? '#FF8A7A' : MC.gold, 3);
  return s + '</g>';
}
// ------------------------------------------------------------------ teks ketik gaya game (kotak ink + garis emas)
export function typer(txt, t, t0, t1, o = {}) {
  const a = clamp((t - t0) / 0.12) * clamp((t1 - t) / 0.15); if (a <= 0.01) return '';
  const n = Math.min(txt.length, Math.floor((t - t0) * (o.cps ?? 28))), vis = txt.slice(0, n), fs = o.fs ?? 54, y = o.y ?? 400, w = o.w ?? Math.min(1000, 60 + txt.length * fs * 0.62);
  const cur = n < txt.length || Math.floor(t * 4) % 2 ? '▌' : '';
  const flash = o.red ? '#FF8A7A' : MC.ivory;
  return `<g opacity="${f1(a)}">${R(540 - w / 2, y - fs - 14, w, fs + 40, 'rgba(10,28,36,.93)', 18, `stroke="${o.red ? '#FF8A7A' : MC.gold}" stroke-width="4"`)}<text x="540" y="${y + 4}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${fs}" fill="${flash}">${vis}<tspan fill="${MC.gold}">${cur}</tspan></text></g>`;
}
// ------------------------------------------------------------------ kartu slide dan buku
const hues = ['#1D7B75', '#4F7FE0', '#8E7CE8', '#E59A3A', '#E8665F'];
export function card(x, y, rot, i, k = 1) {
  const hue = hues[i % 5];
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${k})"><rect x="-112" y="-72" width="224" height="144" rx="12" fill="#021014" opacity=".3" transform="translate(5 8)"/><rect x="-112" y="-72" width="224" height="144" rx="12" fill="#FFFFFF" stroke="${MC.ink}" stroke-width="3"/><rect x="-112" y="-72" width="224" height="34" rx="12" fill="${hue}"/><rect x="-112" y="-52" width="224" height="14" fill="${hue}"/><text x="-96" y="-47" font-family="${FONT}" font-weight="800" font-size="22" fill="#fff">PPT</text><rect x="-92" y="-18" width="150" height="10" rx="5" fill="#C9D4D9"/><rect x="-92" y="6" width="120" height="10" rx="5" fill="#C9D4D9"/><rect x="-92" y="30" width="170" height="10" rx="5" fill="#C9D4D9"/></g>`;
}
const TOW = [[96, 1260], [200, 1260], [640, 1260]];       // pusat menara (x), garis meja (y)
/** tumpukan: n kartu tersusun di tiga menara; drop 0..1: kartu jatuh dari atas ke atas Kori (adegan remuk) */
export function stack(n, t = 0, o = {}) {
  let g = ''; const r = rnd(5);
  for (let i = 0; i < n; i++) {
    const tw = i % 3, lvl = Math.floor(i / 3), [tx, ty] = TOW[tw], j = (r() - 0.5) * 36, rt = (r() - 0.5) * 14;
    const grow = o.grow !== undefined ? clamp((o.grow - i) / 1.0) : 1; if (grow <= 0) continue;
    const y = ty - 36 - lvl * 40 + (1 - eo(grow)) * -240;
    g += card(tx + j, y, rt, i, 0.78);
  }
  return g;
}
// ------------------------------------------------------------------ lari/berjalan
export function runPose(t, sp = 14) { const s = Math.sin(t * sp), c = Math.cos(t * sp * 0.5); return { bob: -Math.abs(s) * 28, rot: s * 5 + 7, sy: 1 + 0.05 * (Math.abs(s) < 0.2 ? -1 : 0.2), sx: 1 - 0.03 * (Math.abs(s) < 0.2 ? -1 : 0.2), arm: -40 + c * 55 }; }
// ------------------------------------------------------------------ adegan: lorong (hook)
export function corridor(t, o = {}) {
  const sc = (t * 760) % 240, door = clamp((t - 1.5) / 1.5);
  let g = `<rect x="0" y="360" width="1080" height="900" fill="#0F4A52"/><rect x="0" y="1250" width="1080" height="670" fill="#0B3038"/><path d="M0 1250H1080" stroke="#2BB8C4" stroke-width="6" opacity=".5"/>`;
  for (let i = -1; i < 6; i++) { const x = i * 240 - sc; g += R(x + 20, 520, 190, 640, '#176068', 10, 'opacity=".85"') + R(x + 34, 540, 162, 120, '#0E3A44', 6) + C(x + 168, 800, 7, MC.gold); }
  g += `<g opacity=".9">${[0, 1, 2, 3].map((i) => R(((i * 330 - t * 300) % 1320 + 1320) % 1320 - 120, 372, 150, 14, '#FFF3C4', 7)).join('')}</g>`;
  // pintu ruang kuliah (muncul dan mendekat di ujung lorong)
  const dx = lerp(1180, 770, eo(door)); g += `<g transform="translate(${f1(dx)} 0)">${R(0, 560, 300, 700, '#0A3830', 12, `stroke="${MC.gold}" stroke-width="6"`)}${R(30, 600, 240, 400, '#1D7B75', 8)}${C(250, 930, 12, MC.gold)}${R(40, 520, 220, 56, MC.ink, 28, `stroke="${MC.gold}" stroke-width="4"`)}${T(150, 560, 'KULIAH', MC.ivory, 34)}</g>`;
  // kalender dan jam dinding yang ikut bergerak
  const flip = Math.floor(t * 3.2), fr = (t * 3.2) % 1;
  g += `<g transform="translate(110 600)">${R(0, 0, 180, 200, '#F8F7F3', 14, `stroke="${MC.ink}" stroke-width="4"`)}${R(0, 0, 180, 48, '#E8433A', 14)}${R(0, 24, 180, 24, '#E8433A')}${T(90, 36, 'NOV', '#fff', 26)}<g transform="translate(90 ${f1(130 + fr * 8)})" opacity="${f1(1 - fr * 0.9)}">${T(0, 28, String(((flip + 9) % 30) + 1), MC.ink, 84)}</g></g>`;
  g += `<g transform="translate(400 700)">${C(0, 0, 76, MC.ivory, `stroke="${MC.ink}" stroke-width="6"`)}${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<path d="M${f1(Math.sin(a) * 60)} ${f1(-Math.cos(a) * 60)}L${f1(Math.sin(a) * 70)} ${f1(-Math.cos(a) * 70)}" stroke="${MC.ink}" stroke-width="${i % 3 ? 3 : 6}"/>`; }).join('')}<path d="M0 0V-44" stroke="${MC.ink}" stroke-width="8" stroke-linecap="round" transform="rotate(${f1(t * 140)})"/><path d="M0 0V-58" stroke="#E8433A" stroke-width="5" stroke-linecap="round" transform="rotate(${f1(t * 1500)})"/>${C(0, 0, 7, MC.ink)}</g>`;
  // Kori berlari
  const p = runPose(t, 15), kx = lerp(210, 600, ei(clamp(t / 3.1)) * 0.6 + clamp(t / 3.1) * 0.4);
  g += [0, 1, 2, 3].map((i) => `<path d="M${f1(kx - 190 - i * 40)} ${1180 - i * 40 + 18}h${100 + (i % 2) * 40}" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="${f1(0.55 - i * 0.1)}"/>`).join('');
  g += `<ellipse cx="${f1(kx)}" cy="1262" rx="${f1(120 - Math.abs(p.bob) * 0.8)}" ry="14" fill="#021014" opacity=".3"/>` + mascot('kori', { x: kx, y: 1260, s: 1.15, rot: p.rot, bob: p.bob, sx: p.sx, sy: p.sy, arm: p.arm, eyes: 'normal', mouth: 'happy' });
  return g;
}
// ------------------------------------------------------------------ ruang kuliah
export function lecture(t) {
  let g = R(0, 360, 1080, 1000, '#12474F') + R(70, 440, 940, 520, '#0A1A22', 22, `stroke="${MC.gold}" stroke-width="5"`);
  g += T(540, 560, 'ANATOMI', MC.gold, 92) + [0, 1, 2, 3].map((i) => R(150, 620 + i * 66, 500 - i * 70 + ((i * 97) % 90), 20, '#CFE9E3', 10, `opacity="${f1(0.9 - i * 0.08)}"`)).join('');
  g += `<g transform="translate(790 790)">${R(-90, -80, 180, 150, '#1D7B75', 10)}${C(0, -10, 44, '#F8F7F3')}<path d="M-18 -10l14 18l26 -34" stroke="${MC.ink}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  // slide beterbangan dari papan ke arah Kori
  for (let i = 0; i < 6; i++) { const u = ((t * 1.5 + i / 6) % 1), x = lerp(800, 470, u) + Math.sin(i * 2 + t * 4) * 30, y = lerp(900, 1240, eo(u)); g += `<g opacity="${f1(sm(u * 4) * (1 - u * 0.2))}">${card(x, y, -10 + i * 8, i, lerp(0.35, 0.62, u))}</g>`; }
  // bangku deret dan meja
  g += [0, 1, 2].map((i) => `<ellipse cx="${200 + i * 340}" cy="1170" rx="150" ry="46" fill="#0B3038" opacity=".8"/>`).join('');
  const w = Math.sin(t * 9);
  g += mascot('kori', { x: 540, y: 1520, s: 1.5, bob: Math.sin(t * 3) * 3, arm: -25 + w * 22, eyes: 'normal', mouth: 'think', rot: Math.sin(t * 2) * 1.5 });
  g += R(-20, 1390, 1120, 40, '#D9A06C') + R(-20, 1430, 1120, 520, '#8A5A34') + `<path d="M-20 1394H1100" stroke="#F0C79B" stroke-width="5" opacity=".7"/>`;
  return g;
}
// ------------------------------------------------------------------ jalan pulang (senja)
export function street(t) {
  let g = `<defs><linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B3A78"/><stop offset=".6" stop-color="#F28A5A"/><stop offset="1" stop-color="#FFC27A"/></linearGradient></defs>` + R(0, 340, 1080, 940, 'url(#gSky)') + C(780, 900, 120, '#FFE19A', 'opacity=".9"');
  const sc = (t * 220) % 400; for (let i = -1; i < 4; i++) { const x = i * 400 - sc, h = 300 + ((i * 5 + 3) % 4) * 80; g += R(x, 1250 - h, 340, h, '#1E2E52', 8, 'opacity=".9"') + [0, 1, 2].map((r) => R(x + 40, 1250 - h + 50 + r * 80, 60, 40, '#FFD27A', 4, `opacity="${(i + r) % 2 ? .9 : .25}"`)).join(''); }
  g += R(0, 1250, 1080, 700, '#3E3A52') + `<path d="M0 1250H1080" stroke="#8E88AA" stroke-width="6"/>` + [0, 1, 2, 3, 4].map((i) => R(((i * 260 - t * 420) % 1300 + 1300) % 1300 - 100, 1500, 150, 16, '#F6E6A8', 8)).join('');
  const s = Math.sin(t * 7); g += `<ellipse cx="520" cy="1352" rx="118" ry="14" fill="#021014" opacity=".35"/>` + mascot('kori', { x: 520, y: 1350, s: 1.12, bob: -Math.abs(s) * 14, rot: s * 3 + 3, arm: -10 + s * 18, eyes: 'tired', mouth: 'think', over: sweat(0.8) });
  return g;
}
// ------------------------------------------------------------------ meja belajar
export const LAPTOP = { cx: 770, cy: 1010, w: 520, h: 330 };
export function laptopScreen(t, state) {
  const { cx, cy, w, h } = LAPTOP, x = cx - w / 2, y = cy - h / 2;
  let s = `<g>${R(x - 16, y - 16, w + 32, h + 32, '#1A252E', 22, 'stroke="#3B4D5B" stroke-width="3"')}`;
  if (state === 'off') s += R(x, y, w, h, '#0B1218', 10) + `<text x="${cx}" y="${cy + 10}" text-anchor="middle" font-family="${MONO}" font-size="26" fill="#2C3B46">· · ·</text>`;
  else {
    const g = state === 'prompt' ? 0.7 + 0.3 * Math.sin(t * 7) : 1;
    s += R(x, y, w, h, '#EAF6F1', 10) + `<image href="logo-full.webp" x="${cx - 150}" y="${y + 50}" width="300" height="60" preserveAspectRatio="xMidYMid meet"/>`;
    if (state === 'prompt') s += `<g transform="translate(${cx} ${y + 200}) scale(${f1(1 + 0.04 * Math.sin(t * 7))})">${R(-178, -42, 356, 84, MC.brand, 42, `stroke="${MC.ink}" stroke-width="4"`)}${T(0, 14, 'COBA MEDCOEL', '#fff', 38)}</g>`;
    if (state === 'after') s += `${T(cx, y + 190, '1 BAB DULU', MC.brand, 44)}`;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="none" stroke="#7CE0B8" stroke-width="${f1(4 * g)}" opacity="${f1(g)}"/>`;
  }
  return s + '</g>';
}
export function desk(t, o = {}) {
  const { n = 6, grow, kori = {}, laptop = 'off', crush = 0, glow = 0, bookBab = 0, extra = '', koriOn = true } = o;
  let g = R(0, 360, 1080, 900, '#103F47');
  g += `<g opacity=".95">${R(70, 520, 250, 330, '#ECE6D8', 16, `stroke="${MC.ink}" stroke-width="4"`)}${R(86, 536, 218, 298, '#27508A', 8)}<g transform="translate(195 640)">${C(0, 0, 40, '#F4EBC8')}${C(18, -12, 36, '#27508A')}</g>${[0, 1, 2, 3].map((i) => C(120 + ((i * 53) % 150), 580 + ((i * 41) % 120), 2.5, '#FFF3C4', `opacity="${f1(0.5 + 0.4 * Math.sin(t * 2 + i))}"`)).join('')}</g>`;
  g += `<ellipse cx="740" cy="1000" rx="460" ry="300" fill="#7CE0B8" opacity="${f1(0.18 * glow)}"/>`;
  // Kori duduk di balik meja (tubuh bawah tertutup)
  const kb = Math.sin(t * 2.4) * 3;
  if (koriOn) g += mascot('kori', { x: 410, y: 1330 + (kori.dy ?? 0), s: kori.s ?? 1.45, bob: kori.bob ?? kb, rot: kori.rot ?? 0, sx: kori.sx ?? 1, sy: kori.sy ?? 1, arm: kori.arm ?? 0, eyes: kori.eyes ?? 'tired', mouth: kori.mouth ?? 'think', over: kori.over ?? '', spark: kori.spark ?? 0.3 });
  g += `<rect x="-20" y="1260" width="1120" height="40" fill="#D9A06C"/><rect x="-20" y="1300" width="1120" height="640" fill="#8A5A34"/><path d="M-20 1264H1100" stroke="#F0C79B" stroke-width="5" opacity=".7"/><rect x="60" y="1420" width="360" height="260" rx="14" fill="#5E3820" opacity=".7"/>`;
  g += stack(n, t, { grow }) + extra + laptopScreen(t, laptop);
  g += R(LAPTOP.cx - 330, 1262, 660, 24, '#2A3A46', 8) + R(LAPTOP.cx - 190, 1250, 380, 16, '#1A252E', 6);
  return g;
}
// ------------------------------------------------------------------ elemen kecil
export const flash = (a, c = '#fff') => (a > 0.01 ? `<rect width="1080" height="1920" fill="${c}" opacity="${f1(a)}"/>` : '');
/** blok pixel (transisi digital): p 0..1, area rect; mengembalikan clipPath id dan garis tepi glitch */
export function pixelClip(id, p, rect, seed = 3, cell = 40) {
  const r = rnd(seed), cols = Math.ceil(rect.w / cell), rows = Math.ceil(rect.h / cell); let cp = '', edge = '';
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const th = r() * 0.85 + (i / cols) * 0.15, x = rect.x + i * cell, y = rect.y + j * cell; if (th < p) cp += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}"/>`; else if (th < p + 0.1) edge += `<rect x="${x + 4}" y="${y + 4}" width="${cell - 8}" height="${cell - 8}" fill="${(i + j) % 3 ? '#7CE0B8' : MC.gold}" opacity=".85"/>`; }
  return { clip: `<clipPath id="${id}">${cp}</clipPath>`, edge };
}
export { qmarks, swirl, sweat, T, R, C, MONO };
