// Model saraf SATU untuk seluruh video (normal dan setelah obat memakai ruang, sudut, dan ukuran yang sama).
// Orientasi: akson horizontal; KULIT di KANAN, sinyal nyeri berjalan KANAN -> KIRI menuju sumsum tulang belakang (kolom vertikal di kiri), lalu NAIK ke otak.
// Warna tetap: Na+ = oranye, sinyal/gelombang = teal, molekul obat = magenta, kanal = emas, membran = indigo.
import { f1, clamp, lerp, sm, eo, eio, seg, rndf, mixc, T } from './common.js';
export const NK = { ecf: '#D3E6F8', ecfD: '#B4D0EE', mem: '#5B4BC4', memD: '#35298F', cyto: '#FFEBD6', na: '#FF9F1C', naD: '#B86A00', wave: '#14D8B8', waveD: '#0A8F7B', drug: '#E040A0', drugD: '#8F1F66', gate: '#F8C038', gateD: '#B9861A', door: '#E8A100', skin: '#F7C9A9', skinD: '#EDA98A', epi: '#EFA283', cord: '#FFF1C9', cordD: '#D9B86A', ink: '#172B38' };
export const H = 120, MT = 34, XL = -1780, XR = 440;
export const CHX = Array.from({ length: 13 }, (_, k) => 440 - 170 * k);       // posisi kanal natrium sepanjang akson
export const BLOCK = [-900, 300];                                              // segmen yang diberi obat
const dot = (x, y, r, fill, stroke, sw = 3, o = 1) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${f1(clamp(o) * 100) / 100}"/>`;
export const naIon = (x, y, o = 1, r = 13) => `<g opacity="${f1(clamp(o) * 100) / 100}"><circle cx="${f1(x)}" cy="${f1(y)}" r="${r}" fill="${NK.na}" stroke="${NK.naD}" stroke-width="3"/><path d="M${f1(x - r * 0.5)} ${f1(y)}h${f1(r)}M${f1(x)} ${f1(y - r * 0.5)}v${f1(r)}" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/></g>`;
export const drugMol = (x, y, o = 1, s = 1, rot = 0) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s})" opacity="${f1(clamp(o) * 100) / 100}"><rect x="-17" y="-10" width="34" height="20" rx="10" fill="${NK.drug}" stroke="${NK.drugD}" stroke-width="3"/><ellipse cx="-6" cy="-3" rx="6" ry="3" fill="#fff" opacity=".55"/></g>`;
// ---- bentuk akson: tabung horizontal yang menyempit menjadi ujung saraf bebas di kulit
const VW = 64, YT = -1180;           // setengah lebar tabung vertikal (di dalam sumsum tulang belakang) dan ujung atasnya
const axonPath = () => `M${XL - VW} ${H}L${XL - VW} ${YT}L${XL + VW} ${YT}L${XL + VW} ${-H}L${XR} ${-H}C560 ${-H} 700 -62 800 -24L800 24C700 62 560 ${H} ${XR} ${H}Z`;
const edge = `M${XL - VW} ${H}L${XL - VW} ${YT}M${XL + VW} ${YT}L${XL + VW} ${-H}L${XR} ${-H}C560 ${-H} 700 -62 800 -24M${XL - VW} ${H}L${XR} ${H}C560 ${H} 700 62 800 24`;
// kolom sumsum tulang belakang (vertikal) + akson masuk dari kanan; sinyal naik ke otak
const CORD = { x: -1780, w: 120 };
// kanal natrium: sepasang blok protein (pintu kecil). open 0..1, plug 0..1 (molekul obat terikat dari sisi dalam)
function channel(x, side, open, plug, t) {
  const yc = side * H, g = 5 + 36 * open, o = side < 0 ? -1 : 1;
  const blk = (x0, x1) => `<rect x="${f1(x0)}" y="${f1(yc - MT / 2 - 9)}" width="${f1(x1 - x0)}" height="${MT + 18}" rx="9" fill="${NK.gate}" stroke="${NK.gateD}" stroke-width="4"/>`;
  let s = blk(x - 48, x - g / 2) + blk(x + g / 2, x + 48);
  // pintu (tutup) di sisi luar: menyusut saat kanal membuka
  const lw = (g + 10) * (1 - open); if (lw > 1) s += `<rect x="${f1(x - g / 2 - 5)}" y="${f1(yc - o * (MT / 2 + 13) - 6)}" width="${f1(lw)}" height="12" rx="6" fill="${NK.door}" stroke="${NK.gateD}" stroke-width="3"/>`;
  if (plug > 0.02) s += drugMol(x, yc - side * (MT / 2 + 15), clamp(plug * 2), 1.05, 90);
  return s;
}
const bell = (u) => Math.pow(Math.max(0, 1 - u * u), 1.4);
/** waves: [{ t0, x0, v, amp(x) }]; posisi gelombang di akson xw = x0 - v (t - t0) */
export const waveX = (w, t) => w.x0 - w.v * (t - w.t0);
export function openAmt(x, waves, t) { let o = 0; for (const w of waves) { if (t < w.t0) continue; const xw = waveX(w, t); if (xw < XL) continue; const a = w.amp ? w.amp(x) : 1; o = Math.max(o, bell((x - (xw + 50)) / 115) * a); } return o; }
/** gambar akson + kanal + gelombang + ion. cfg: { waves, blocked: {x0,x1,t0 (kapan plug mulai), t1}, plugTimes:{k:{side:t}} , showNaBg } */
export function nerveWorld(t, cfg = {}) {
  const waves = cfg.waves || [], plugAt = cfg.plugAt || (() => Infinity), blockedAt = cfg.blockedAt || (() => Infinity);
  let w = `<defs><clipPath id="axonClip"><path d="${axonPath()}"/></clipPath></defs>`;
  // latar cairan di luar sel + jaringan
  w += `<rect x="-2400" y="-3600" width="4200" height="6000" fill="${NK.ecf}"/>`;
  for (let i = 0; i < 34; i++) w += `<circle cx="${f1(-1800 + rndf(i) * 2800)}" cy="${f1(-500 + rndf(i + 40) * 1000)}" r="${f1(16 + rndf(i + 7) * 30)}" fill="${NK.ecfD}" opacity=".55"/>`;
  // kolom sumsum tulang belakang dan otak (jalur ke atas)
  w += `<rect x="${CORD.x - CORD.w}" y="-1250" width="${CORD.w * 2}" height="1500" rx="${CORD.w}" fill="${NK.cord}" stroke="${NK.cordD}" stroke-width="8"/><path d="M${CORD.x - 40} -1180C${CORD.x - 52} -900 ${CORD.x - 30} -300 ${CORD.x - 34} 60M${CORD.x + 40} -1180C${CORD.x + 52} -900 ${CORD.x + 30} -300 ${CORD.x + 34} 60" fill="none" stroke="#E6CF92" stroke-width="22" stroke-linecap="round"/>`;
  // kulit (kanan) dengan permukaan di atas
  w += `<rect x="520" y="-190" width="1400" height="760" fill="${NK.skin}"/><rect x="520" y="-232" width="1400" height="46" fill="${NK.epi}"/><path d="M520 -186H1920" stroke="${NK.skinD}" stroke-width="5"/>`;
  for (let i = 0; i < 22; i++) w += `<circle cx="${f1(560 + rndf(i + 70) * 1200)}" cy="${f1(-120 + rndf(i + 80) * 560)}" r="${f1(8 + rndf(i + 9) * 14)}" fill="${NK.skinD}" opacity=".55"/>`;
  // sitoplasma + tabung akson + ujung saraf
  w += `<path d="${axonPath()}" fill="${NK.cyto}"/>`;
  w += `<path d="M800 0C850 -20 880 -80 880 -150" fill="none" stroke="${NK.memD}" stroke-width="22" stroke-linecap="round"/><path d="M800 0C850 -20 880 -80 880 -150" fill="none" stroke="${NK.mem}" stroke-width="14" stroke-linecap="round"/>`;
  // gelombang (teal): pita di dalam akson, intensitas sesuai amplitudo di posisi itu
  let wv = '', chg = '';
  for (const wa of waves) {
    if (t < wa.t0) continue; const xw = waveX(wa, t);
    if (xw >= XL - 80) { const a = wa.amp ? wa.amp(xw) : 1; if (a > 0.02) { wv += `<rect x="${f1(xw - 70)}" y="${-H - MT}" width="250" height="${2 * H + 2 * MT}" fill="url(#wgrad)" opacity="${f1(a)}"/>`; for (let x = Math.ceil((xw - 40) / 54) * 54; x < xw + 150; x += 54) { if (x > XR + 5 || x < XL) continue; chg += `<text x="${x}" y="8" font-family="Plus Jakarta Sans" font-weight="800" font-size="34" fill="${NK.waveD}" text-anchor="middle" opacity="${f1(a * bell((x - (xw + 50)) / 120))}">+</text>`; } } }
    else if (wa.cord !== false) { const yw = -(XL - xw) * 0.0 - wa.vc * (t - (wa.t0 + (wa.x0 - XL) / wa.v)); if (yw > YT - 60) wv += `<rect x="${CORD.x - VW}" y="${f1(yw - 70)}" width="${2 * VW}" height="250" fill="url(#wgradV)"/>`; }
  }
  w += `<defs><linearGradient id="wgrad" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${NK.wave}" stop-opacity="0"/><stop offset=".25" stop-color="${NK.wave}" stop-opacity=".55"/><stop offset=".6" stop-color="${NK.wave}" stop-opacity=".75"/><stop offset="1" stop-color="${NK.wave}" stop-opacity="0"/></linearGradient><linearGradient id="wgradV" x1="0" x2="0" y1="1" y2="0"><stop offset="0" stop-color="${NK.wave}" stop-opacity="0"/><stop offset=".3" stop-color="${NK.wave}" stop-opacity=".7"/><stop offset="1" stop-color="${NK.wave}" stop-opacity="0"/></linearGradient></defs>`;
  w += `<g clip-path="url(#axonClip)">${wv}${chg}</g>`;
  // membran (pita indigo) sepanjang tepi akson
  w += `<path d="${edge}" fill="none" stroke="${NK.memD}" stroke-width="${MT + 8}" stroke-linecap="butt"/><path d="${edge}" fill="none" stroke="${NK.mem}" stroke-width="${MT}" stroke-linecap="butt"/>`;
  // sorot gelombang di membran
  for (const wa of waves) { if (t < wa.t0) continue; const xw = waveX(wa, t); if (xw < XL - 80 || xw > XR) continue; const a = wa.amp ? wa.amp(xw) : 1; if (a > 0.02) w += `<g opacity="${f1(a * 0.8)}"><rect x="${f1(xw - 40)}" y="${-H - MT / 2}" width="190" height="${MT}" fill="${NK.wave}" opacity=".7"/><rect x="${f1(xw - 40)}" y="${H - MT / 2}" width="190" height="${MT}" fill="${NK.wave}" opacity=".7"/></g>`; }
  // kanal natrium
  CHX.forEach((x, k) => { for (const side of [-1, 1]) { const pa = cfgPlug(cfg, k, side, t), bl = cfg.blockedAt ? clamp((t - cfg.blockedAt(k, side)) / 0.3) : 0; const o = bl > 0.5 ? 0 : openAmt(x, waves, t) * (cfg.openGain ?? 1); w += channel(x, side, o, pa, t); } });
  // ion Na+: di luar (jingga, melayang) dan mengalir masuk lewat kanal yang terbuka
  const NB = 44; for (let i = 0; i < NB; i++) { const x = -1650 + rndf(i + 1) * 2250 , side = i % 2 ? 1 : -1, y = side * (H + MT + 40 + rndf(i + 2) * 150); w += naIon(x + 14 * Math.sin(t * 1.7 + i * 2.3), y + 11 * Math.cos(t * 2.1 + i * 1.3), 0.95, 15); }
  CHX.forEach((x, k) => { for (const side of [-1, 1]) {
    const o = openAmt(x, waves, t) * (cfg.openGain ?? 1), bl = cfg.blockedAt ? clamp((t - cfg.blockedAt(k, side)) / 0.3) : 0;
    if (bl > 0.5) { if (cfg.naBounce && t > cfg.naBounce) for (let i = 0; i < 2; i++) { const u = Math.abs(Math.sin((t * 1.6 + i * 0.5 + k * 0.3))); const y = side * lerp(H + MT / 2 + 150, H + MT / 2 + 34, u); w += naIon(x + (i - 0.5) * 22, y, clamp((t - cfg.naBounce) / 0.4), 12); } continue; }
    if (o < 0.12) continue;
    for (let i = 0; i < 3; i++) { const u = ((t * 1.5 + i / 3 + k * 0.31) % 1), yOut = side * (H + 150), yIn = side * (H - 120), y = lerp(yOut, yIn, u); w += naIon(x + (u > 0.5 ? (u - 0.5) * 70 * (i - 1) : 0), y, o * Math.min(1, u * 5) * (1 - clamp((u - 0.85) / 0.15)), 12); }
  } });
  return w;
}
const cfgPlug = (cfg, k, side, t) => (cfg.plugAt ? clamp((t - cfg.plugAt(k, side)) / 0.35) : 0);
// otak (tampak samping, menghadap kiri) di puncak kolom; nyala saat sinyal tiba
export function brainWorld(t, lit, x = CORD.x, y = -1330) {
  const g = clamp(lit);
  return `<g transform="translate(${x} ${y}) scale(1.55)"><circle cx="0" cy="0" r="${f1(190 + 30 * g * Math.sin(t * 6))}" fill="${NK.wave}" opacity="${f1(0.28 * g)}"/><path d="M-150 20C-170 -90 -80 -170 30 -165C140 -160 190 -80 170 10C150 80 80 110 20 100L-20 100C-100 100 -140 80 -150 20Z" fill="${mixc('#F4B8C1', '#7EF0DA', g * 0.7)}" stroke="#D98B99" stroke-width="6" stroke-linejoin="round"/><path d="M-90 -90C-40 -130 40 -140 100 -100M-120 -20C-60 -60 20 -70 80 -30M-30 10C20 -20 80 -10 120 30" fill="none" stroke="#E69AA7" stroke-width="7" stroke-linecap="round"/><path d="M70 96C100 70 170 80 175 118C178 150 110 160 70 130Z" fill="#E9A5B0" stroke="#D98B99" stroke-width="6"/><path d="M10 96L40 96L50 200L22 200Z" fill="#EDA8B3" stroke="#D98B99" stroke-width="6" stroke-linejoin="round"/></g>`;
}
export const probe = (x, y, press = 0, L = 230) => `<g transform="translate(${f1(x)} ${f1(y - 12 * press)})"><path d="M${f1(L * 0.55)} ${-L}L0 0" stroke="#6B7A89" stroke-width="26" stroke-linecap="round"/><path d="M${f1(L * 0.55)} ${-L}L0 0" stroke="#9AA9B8" stroke-width="16" stroke-linecap="round"/><circle cx="0" cy="0" r="17" fill="#6B7A89"/><circle cx="-4" cy="-4" r="8" fill="#9AA9B8"/><g transform="translate(${f1(L * 0.55)} ${-L})"><rect x="-26" y="-92" width="52" height="96" rx="26" fill="#9ED8F5" stroke="#5FA8D0" stroke-width="5"/><circle cx="0" cy="-100" r="36" fill="#9ED8F5" stroke="#5FA8D0" stroke-width="5"/></g></g>`;
