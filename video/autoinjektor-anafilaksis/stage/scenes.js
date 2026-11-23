// Semua adegan. frame(t) -> { A: dunia SVG, U: teks/label }. tn = t - OFF (detik narasi).
import { f1, clamp, lerp, R, T, GOLD, INK, FOREST, pill, eo, eio, sm, rndf, tw } from './lib.js';
import { raka, rakaSvg, rIdle } from './raka.js';
import { orang, SK0, SKD0 } from './orang.js';
import { CL, frame as pframe, vessel, airway, heart, ease } from './organ.js';
import * as TL from './timeline.js';
export const A = TL.A, OFF = TL.OFF;
const kw = (tn, t0, t1, f = 0.22) => clamp((tn - t0) / f) * clamp((t1 - tn) / f);
const mod = (a, n) => ((a % n) + n) % n;
const camT = (cx, cy, z, sx = 540, sy = 780) => `translate(${f1(sx - cx * z)} ${f1(sy - cy * z)}) scale(${f1(z * 1000) / 1000})`;
const gOp = (svg, a) => `<g opacity="${f1(clamp(a) * 100) / 100}">${svg}</g>`;
const bgDark = `<defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B6075"/><stop offset="1" stop-color="#0A2B34"/></linearGradient></defs>${R(-1000, -1000, 4000, 5000, 'url(#g2)')}`;
const bgRoom = `<defs><linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DDEBEE"/><stop offset="1" stop-color="#BBD3D8"/></linearGradient></defs>${R(-1000, -1000, 4000, 5000, 'url(#g3)')}`;
const wrap = (s, size, maxW) => { const words = s.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && tw(t, size) > maxW) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; };
export function captions(tn, list = TL.KAL, y = 1400) {
  const c = list.find(([a, b]) => tn >= a - 0.02 && tn <= b + 0.12); if (!c) return '';
  const size = 46, lines = wrap(c[2], size, 840), a = clamp((tn - c[0] + 0.02) / 0.15) * clamp((c[1] + 0.12 - tn) / 0.12 + 0.2), lh = size * 1.22, h = lines.length * lh + 30;
  return `<g opacity="${f1(a * 100) / 100}">${R(90, y + 6, 900, h, 'rgba(0,0,0,.28)', 34)}${R(90, y, 900, h, 'rgba(8,16,28,.92)', 34)}${lines.map((l, i) => T(l, 540, y + 14 + size * 0.88 + i * lh, { size, fill: '#fff', w: 800 })).join('')}</g>`;
}
const pillAt = (tn, t0, t1, lines, y, o = {}) => { const k = kw(tn, t0, t1, 0.3); return k > 0.01 ? pill(lines, o.cx ?? 540, y + (1 - eo(clamp((tn - t0) / 0.35))) * -44, { a: k, size: o.size ?? 54, bg: o.bg, fg: o.fg }) : ''; };
const tag = (tn, t0, t1, lines, x, y, o = {}) => { const k = kw(tn, t0, t1, 0.25); return k > 0.01 ? pill(lines, x, y, { a: k, size: o.size ?? 34, bg: o.bg ?? '#fff', fg: o.fg, k: 0.92 + 0.08 * eo(clamp((tn - t0) / 0.3)) }) : ''; };
const kf = (keys, x) => { if (x <= keys[0][0]) return keys[0].slice(1); for (let i = 0; i + 1 < keys.length; i++) if (x <= keys[i + 1][0]) { const u = sm((x - keys[i][0]) / (keys[i + 1][0] - keys[i][0])); return keys[i].slice(1).map((a, j) => lerp(a, keys[i + 1][1 + j], u)); } return keys[keys.length - 1].slice(1); };
/** fase napas = integral frekuensi (Hz) terhadap waktu; frekuensi dari keyframe [tn, f] */
const phase = (tn, keys) => { let p = 0, dt = 0.05; for (let x = 0; x < tn; x += dt) p += kf(keys, x)[0] * Math.min(dt, tn - x); return p; };
const BR1 = [[0, 0.4], [4, 0.5], [6.4, 1.5], [7.5, 1.8]];

// ================================================================ ADEGAN 1 (0 - 7,5): makan -> bentol -> suara berubah -> sulit bernapas -> hampir pingsan
function sceneHook(tn) {
  const eat = tn < 2.4 ? Math.pow(Math.sin(tn * Math.PI / 1.15), 2) : 0;
  const [hives] = kf([[0, 0], [2.7, 0], [6.4, 0.85]], tn), flush = kf([[0, 0], [3.0, 0.05], [6.0, 0.9]], tn)[0];
  const worry = kf([[0, 0], [3.8, 0.1], [6.4, 0.9]], tn)[0], mouth = kf([[0, 0], [5.0, 0], [5.8, 0.45], [7.5, 0.7]], tn)[0];
  const hand = kf([[0, 0], [5.0, 0], [5.9, 1]], tn)[0], tilt = kf([[0, 0], [6.3, 0], [7.4, 9]], tn)[0], eyes = kf([[0, 0], [6.3, 0], [7.4, 0.75]], tn)[0];
  const sweat = kf([[0, 0], [5.2, 0], [6.2, 1]], tn)[0], amp = kf([[0, 0.025], [4, 0.03], [6.4, 0.07]], tn)[0], ph = phase(tn, BR1);
  const body = orang({ hives, flush, worry, mouth, eyes, tilt, breathe: ph, amp, hand, eat, sweat, fork: tn < 2.6 });
  const z = kf([[0, 1.18], [4.5, 1.35], [6.8, 1.75], [7.5, 3.2]], tn)[0], cy = kf([[0, 300], [4.5, 290], [6.8, 235], [7.5, 330]], tn)[0];
  // meja + piring: terlihat di awal (makanan), hilang saat kamera mendekat
  const table = `<rect x="-900" y="640" width="1800" height="500" fill="#A98463"/><rect x="-900" y="628" width="1800" height="24" fill="#C39A74"/><ellipse cx="230" cy="660" rx="150" ry="34" fill="#F4F1EA"/><ellipse cx="230" cy="652" rx="108" ry="22" fill="#E7E1D4"/><circle cx="196" cy="640" r="18" fill="#7BC043"/><circle cx="232" cy="646" r="20" fill="#D9A04A"/><circle cx="268" cy="640" r="16" fill="#7BC043"/>`;
  // gelombang suara di dekat mulut: melemah dan bergerigi (suaranya berubah)
  const vk = kw(tn, 3.9, 5.6, 0.25), va = kf([[3.9, 1], [4.5, 0.6], [5.4, 0.18]], tn)[0];
  let wave = ''; if (vk > 0.01) { let d = ''; for (let i = 0; i <= 40; i++) { const x = 150 + i * 5, yy = 120 + Math.sin(i * 0.9 + tn * 14) * 26 * va * (1 + 0.5 * (i % 3 === 0 ? (rndf(i + Math.floor(tn * 10)) - 0.5) * 2 * (1 - va) * 2 : 0)); d += `${i ? 'L' : 'M'}${x} ${f1(yy)}`; } wave = `<g opacity="${f1(vk * 100) / 100}"><circle cx="205" cy="125" r="60" fill="#fff" stroke="${INK}" stroke-width="6" opacity="0"/><path d="${d}" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`; }
  const A_ = `${bgRoom}<g transform="${camT(0, cy, z, 540, 800)}">${tn < 7.0 ? table : ''}${body}${wave}</g>`;
  const U = pillAt(tn, -1, 7.35, ['REAKSI ALERGI BERAT?'], 150, { bg: '#fff', fg: FOREST, size: 58 }) + (tn < 3.2 ? '' : tag(tn, 3.1, 7.0, ['bentol muncul'], 540, 1160, { size: 32 })) + (tn < 4.0 ? '' : tag(tn, 4.4, 7.0, ['suara berubah'], 540, 1230, { size: 32 })) + tag(tn, 5.6, 7.0, ['napas sulit'], 540, 1300, { size: 32, bg: '#FFE3E0' });
  return { A: A_, U };
}

// ================================================================ ADEGAN 2 (7,5 - 16,1): kamera masuk ke kulit; alergen ditangkap sel imun; mediator dilepas
const CELL = { x: 540, y: 760, r: 150 };
function mediatorParticles(tn) {
  let s = ''; const t0 = A.lepas - 0.3;
  for (let i = 0; i < 22; i++) {
    const hist = i % 3 === 0, th = (i / 22) * Math.PI * 2 + 0.3, ts = t0 + (i % 11) * 0.11;
    const u1 = ease((tn - ts) / 0.9), u2 = ease((tn - ts - 0.7) / 2.4); if (tn < ts) continue;
    const bx = CELL.x + Math.cos(th) * (CELL.r + 40 + 70 * u1), by = CELL.y + Math.sin(th) * (CELL.r + 40 + 70 * u1);
    const toV = i % 2 === 0, tx = toV ? 300 + (i % 7) * 90 : 1180, ty = toV ? 1190 : 520 + (i % 5) * 110;
    const x = lerp(bx, tx, u2), y = lerp(by, ty, u2), a = clamp(1 - (u2 - 0.85) / 0.15);
    s += hist ? `<g opacity="${f1(a * 100) / 100}"><circle cx="${f1(x)}" cy="${f1(y)}" r="17" fill="${CL.med}" stroke="${INK}" stroke-width="4"/></g>` : `<g opacity="${f1(a * 100) / 100}"><path d="M${f1(x)} ${f1(y - 19)}L${f1(x + 15)} ${f1(y)}L${f1(x)} ${f1(y + 19)}L${f1(x - 15)} ${f1(y)}Z" fill="${CL.med}" stroke="${INK}" stroke-width="4"/></g>`;
  }
  return s;
}
function sceneSkin(tn) {
  const zi = kf([[7.5, 0.4], [9.2, 1]], tn)[0], shake = tn > 11.6 && tn < 14.3 ? Math.sin(tn * 40) * 3 : 0;
  // jaringan: epidermis, dermis, pembuluh kapiler (koral) di bawah
  let s = `<rect x="-300" y="-300" width="1700" height="2600" fill="#F6D2BE"/><rect x="-300" y="-300" width="1700" height="640" fill="#DDA583"/><rect x="-300" y="320" width="1700" height="22" fill="#C98E64"/>`;
  for (let i = 0; i < 16; i++) s += `<ellipse cx="${60 + (i * 211) % 1000}" cy="${440 + (i * 137) % 600}" rx="${40 + (i % 4) * 14}" ry="${22 + (i % 3) * 8}" fill="#EDBDA6" opacity=".55"/>`;
  s += `<text x="56" y="285" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="34" fill="#7A4A32">kulit (epidermis)</text><text x="56" y="396" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="34" fill="#A86B4E">dermis</text>`;
  s += `<rect x="-60" y="1130" width="1200" height="130" fill="${CL.blood}"/><rect x="-60" y="1104" width="1200" height="28" fill="${CL.ves}"/><rect x="-60" y="1258" width="1200" height="28" fill="${CL.ves}"/>`;
  for (let j = 0; j < 8; j++) { const xx = mod(j * 170 + tn * 90, 1300) - 60; s += `<ellipse cx="${f1(xx)}" cy="${1170 + (j % 3) * 28}" rx="30" ry="15" fill="${CL.rbc}"/>`; }
  s += `<text x="56" y="1330" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="34" fill="${CL.vesD}">pembuluh darah kecil</text>`;
  // sel imun dengan butir mediator; Y = antibodi di permukaan
  const att = clamp((tn - 10.6) / 1.0), burst = clamp((tn - A.lepas + 0.3) / 0.8);
  let cell = `<circle cx="0" cy="0" r="${CELL.r}" fill="#D9CCF6" stroke="${INK}" stroke-width="7"/><circle cx="-26" cy="-14" r="48" fill="#B79BEA" stroke="${INK}" stroke-width="5"/>`;
  for (let i = 0; i < 14; i++) { const a = i * 2.4, rr = 52 + (i % 4) * 24, st = clamp(1 - burst * (0.6 + 0.4 * rndf(i))); cell += `<circle cx="${f1(Math.cos(a) * rr)}" cy="${f1(Math.sin(a) * rr)}" r="${i % 3 === 0 ? 14 : 11}" fill="${CL.med}" opacity="${f1(0.25 + 0.75 * st)}"/>`; }
  for (let i = 0; i < 9; i++) { const a = (i * 40 + 12) * Math.PI / 180, x0 = Math.cos(a) * CELL.r, y0 = Math.sin(a) * CELL.r; cell += `<g transform="translate(${f1(x0)} ${f1(y0)}) rotate(${f1(a * 180 / Math.PI + 90)})"><path d="M0 0V-34M0 -34L-12 -50M0 -34L12 -50" stroke="${INK}" stroke-width="12" stroke-linecap="round" fill="none"/><path d="M0 0V-34M0 -34L-12 -50M0 -34L12 -50" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none"/></g>`; }
  s += `<g transform="translate(${f1(CELL.x + shake)} ${CELL.y})">${cell}</g>`;
  // alergen (segitiga hijau) datang dari atas dan menempel pada antibodi
  for (let i = 0; i < 6; i++) {
    const ts = 9.1 + i * 0.35, u = ease((tn - ts) / 1.6); if (tn < ts) continue;
    const a = (i * 40 + 12 + 0) * Math.PI / 180, tx = CELL.x + Math.cos(a) * (CELL.r + 66), ty = CELL.y + Math.sin(a) * (CELL.r + 66), sx = tx + (i % 2 ? 160 : -160), sy = 380 + i * 18;
    const x = lerp(sx, tx, u), y = lerp(sy, ty, u);
    s += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(20 + u * 40)})"><path d="M0 -24L22 16L-22 16Z" fill="${CL.alg}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></g>`;
  }
  s += mediatorParticles(tn);
  // panah arah (pembuluh darah dan saluran napas) saat mediator keluar
  const ka = kw(tn, 14.6, 16.2, 0.3);
  if (ka > 0.01) s += `<g opacity="${f1(ka * 100) / 100}"><path d="M540 960V1090" stroke="${GOLD}" stroke-width="12" stroke-linecap="round" stroke-dasharray="4 20"/><path d="M520 1076L540 1100L560 1076" stroke="${GOLD}" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M760 760H940" stroke="${GOLD}" stroke-width="12" stroke-linecap="round" stroke-dasharray="4 20"/><path d="M924 740L948 760L924 780" stroke="${GOLD}" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const A_ = `${bgDark}<g transform="${camT(540, 760, zi, 540, 800)}">${s}</g>`;
  let U = pillAt(tn, A.ini, A.saat - 0.1, ['ANAFILAKSIS'], 130, { bg: GOLD, fg: INK, size: 64 }) + pillAt(tn, A.sel - 0.3, 16.1, ['SEL IMUN → MEDIATOR'], 130, { bg: '#fff', fg: FOREST, size: 56 });
  const lg = clamp((tn - 13.9) / 0.4) * clamp((16.4 - tn) / 0.2);
  if (lg > 0.01) U += `<g opacity="${f1(lg * 100) / 100}">${R(110, 1280, 860, 90, 'rgba(4,16,24,.86)', 28)}<circle cx="190" cy="1325" r="17" fill="${CL.med}" stroke="#fff" stroke-width="3"/>${T('histamin', 225, 1337, { size: 32, fill: '#fff', anchor: 'start', w: 800 })}<path d="M540 1306L555 1325L540 1344L525 1325Z" fill="${CL.med}" stroke="#fff" stroke-width="3"/>${T('mediator lain', 575, 1337, { size: 32, fill: '#fff', anchor: 'start', w: 800 })}</g>`;
  if (tn > 9.6 && tn < 12.2) U += tag(tn, 9.8, 12.2, ['alergen (hijau) ditangkap sel imun'], 540, 1000, { size: 32 });
  return { A: A_, U };
}
// ================================================================ ADEGAN 3 (16,1 - 26,7): dua akibat serentak
function medDots(x, y, w, h, tn, t0, t1, cyf) {
  let s = ''; const k = kw(tn, t0, t1, 0.3); if (k < 0.01) return '';
  for (let i = 0; i < 9; i++) { const u = ease((tn - t0 - i * 0.12) / 1.0); const sx = x + 40, ex = x + 130 + i * 70, cy = y + h * cyf; s += `<circle cx="${f1(lerp(sx, ex, u))}" cy="${f1(cy + (i % 3 - 1) * 70 * (1 - u * 0.6))}" r="10" fill="${CL.med}" stroke="${INK}" stroke-width="3" opacity="${f1(k * 0.9)}"/>`; }
  return s;
}
const VP = { x: 60, y: 190, w: 960, h: 520 }, AP = { x: 60, y: 735, w: 960, h: 560 };
export function stateS3(tn) {
  const d = ease((tn - 16.64) / 1.8), leak = ease((tn - 17.9) / 1.5), bp = 1 - 0.6 * ease((tn - 18.96) / 1.5);
  const sw = ease((tn - 21.5) / 1.5), ct = ease((tn - 22.7) / 1.6) * (1 - 0) + 0.05 * Math.sin(tn);
  return { d, leak, bp, sw, ct: clamp(ct) };
}
function sceneEffects(tn) {
  const s3 = stateS3(tn), t = tn;
  let A_ = bgDark + pframe(VP.x, VP.y, VP.w, VP.h, 'PEMBULUH DARAH', CL.ves, { on: tn < 20.5 }) + vessel(VP.x, VP.y, VP.w, VP.h, { d: s3.d, leak: s3.leak, bp: s3.bp, t, id: 1 }) + medDots(VP.x, VP.y, VP.w, VP.h, tn, 16.1, 17.4, 0.58);
  A_ += pframe(AP.x, AP.y, AP.w, AP.h, 'SALURAN NAPAS', CL.airL, { on: tn >= 20.5 }) + airway(AP.x, AP.y, AP.w, AP.h, { swell: s3.sw, contract: s3.ct, t, adr: 0 }) + medDots(AP.x, AP.y, AP.w, AP.h, tn, 20.64, 22.0, 0.58);
  const pillT = tn < 20.5 ? (tn < 18.9 ? ['PEMBULUH MELEBAR + BOCOR'] : ['TEKANAN DARAH TURUN']) : (tn < 24.2 ? ['SALURAN NAPAS MENYEMPIT'] : ['NAPAS MAKIN SULIT']);
  let U = pill(pillT, 540, 64, { a: clamp((tn - 16.1) / 0.3), size: 52, bg: tn >= 24.2 ? '#FFE3E0' : GOLD, fg: INK });
  U += tag(tn, 17.4, 19.5, ['cairan (biru muda) keluar dari dinding'], 540, 650, { size: 32 });
  U += tag(tn, 22.2, 24.4, ['dinding membengkak + otot menyempit'], 540, 1236, { size: 32 });
  U += tag(tn, 24.5, 26.8, ['rongga mengecil: udara sulit lewat'], 540, 1236, { size: 32, bg: '#FFE3E0' });
  return { A: A_, U };
}

// ================================================================ ADEGAN 4 (26,7 - 32,9): tubuh utuh + pena di sisi luar paha; (32,9 - 35,3): makro mekanisme (ilustrasi)
// Skala: 9 px = 1 cm. Bahu 40 cm = 360 px; paha 17 cm = 153 px; pena 15 cm = 135 px; tangan ~ 9 cm.
const PX = 9, CX0 = 540, THIGH_X = CX0 + 17 * PX, PEN_Y = 1060;
const pants = (x0, y0, kneeY) => { const L = (sg) => `M${CX0 + sg * 3} 780L${CX0 + sg * 156} 780L${CX0 + sg * 150} ${kneeY}L${CX0 + sg * 118} 1580L${CX0 + sg * 16} 1580L${CX0 + sg * 8} ${kneeY}Z`; return `<path d="M${CX0 - 156} 770Q${CX0} 800 ${CX0 + 156} 770L${CX0 + 156} 800L${CX0 - 156} 800Z" fill="#4A5568"/><path d="${L(-1)}" fill="#4A5568"/><path d="${L(1)}" fill="#4A5568"/><path d="M${CX0} 962V${kneeY}" stroke="#39424F" stroke-width="4"/><path d="M${CX0} 800V962" stroke="#39424F" stroke-width="3" opacity=".5"/><ellipse cx="${CX0 - 79}" cy="${kneeY}" rx="64" ry="10" fill="#3C4552"/><ellipse cx="${CX0 + 79}" cy="${kneeY}" rx="64" ry="10" fill="#3C4552"/>`; };
function penSide(x, y, a = 1) {   // pena tampak samping, mengarah ke kiri (ujung di x); panjang 15 cm = 135 px, tebal 2,6 cm = 23 px
  return `<g opacity="${a}"><path d="M${f1(x)} ${f1(y - 7)}L${f1(x + 16)} ${f1(y - 11)}L${f1(x + 16)} ${f1(y + 11)}L${f1(x)} ${f1(y + 7)}Z" fill="#59636F"/><rect x="${f1(x + 16)}" y="${f1(y - 12)}" width="${PX * 15 - 36}" height="24" rx="5" fill="#EEF2F5" stroke="#A8B4BE" stroke-width="2.5"/><rect x="${f1(x + 16 + 28)}" y="${f1(y - 12)}" width="14" height="24" fill="${CL.adr}"/><rect x="${f1(x + 16 + PX * 15 - 36)}" y="${f1(y - 12)}" width="20" height="24" rx="5" fill="#8A96A3"/></g>`;
}
function sceneBody(tn) {
  const ap = kf([[26.6, 0], [30.7, 1]], tn)[0], ea = ease(ap);
  // pernapasan masih berat tetapi tenang (tokoh yang sama, keadaan lanjut)
  const body = `<g transform="translate(${CX0} 330) scale(0.66)">${orang({ hives: 0.9, flush: 0.7, worry: 0.7, mouth: 0.5, eyes: 0.3, tilt: 4, breathe: phase(tn, [[0, 1.4]]), amp: 0.06, arms: false, sweat: 0.7 })}</g>`;
  const legs = pants(0, 0, 1323);
  // lengan kanan tokoh (kiri layar = sisi gelap), kiri layar menggantung; lengan menjulur ke pena
  const hand0 = [880, 1010], hand1 = [808, PEN_Y], hx = lerp(hand0[0], hand1[0], ea), hy = lerp(hand0[1], hand1[1], ea), sh = [CX0 + 156, 495], el = [lerp(775, 750, ea), 790];
  const arm = (s, e, h) => `<path d="M${s[0]} ${s[1]}L${f1(s[0] + (e[0] - s[0]) * 0.38)} ${f1(s[1] + (e[1] - s[1]) * 0.38)}" stroke="#8AA5C8" stroke-width="74" stroke-linecap="round" fill="none"/><path d="M${f1(s[0] + (e[0] - s[0]) * 0.34)} ${f1(s[1] + (e[1] - s[1]) * 0.34)}L${e[0]} ${e[1]}L${f1(h[0])} ${f1(h[1])}" stroke="${SK0}" stroke-width="58" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  const armLeft = arm([CX0 - 156, 495], [335, 790], [305, 1040]) + `<circle cx="305" cy="1048" r="30" fill="${SK0}"/>`;
  const armRight = arm(sh, el, [hx, hy]);
  const tipX = lerp(hx - 120, THIGH_X, ea);
  const penX = lerp(hx - 128, THIGH_X + 2, ea);
  const fist = `<circle cx="${f1(hx)}" cy="${f1(hy)}" r="36" fill="${SK0}"/><circle cx="${f1(hx - 16)}" cy="${f1(hy - 14)}" r="17" fill="${SKD0}"/>`;
  let hl = ''; const hk = kw(tn, A.luar - 0.5, 33.0, 0.25);
  if (hk > 0.01) hl = `<g opacity="${f1(hk * 100) / 100}"><rect x="${THIGH_X - 34}" y="${PEN_Y - 150}" width="68" height="300" rx="34" fill="none" stroke="${GOLD}" stroke-width="10" stroke-dasharray="26 14" stroke-dashoffset="${f1(-tn * 60)}"/></g>`;
  const z = kf([[26.6, 0.78], [30.6, 0.88], [32.4, 1.25], [32.9, 1.35]], tn)[0], cy = kf([[26.6, 800], [30.6, 840], [32.4, 1040], [32.9, 1060]], tn)[0], cxx = kf([[26.6, 540], [32.4, 650], [32.9, 660]], tn)[0];
  const A_ = `${bgDark}<g transform="${camT(cxx, cy, z, 540, 800)}">${legs}${body}${armLeft}${armRight}${penSide(penX, PEN_Y)}${fist}${hl}</g>`;
  let U = pillAt(tn, A.pena - 1.3, 30.0, ['AUTOINJEKTOR ADRENALIN'], 50, { bg: GOLD, fg: INK, size: 56 }) + pillAt(tn, 30.1, 32.95, ['SISI LUAR PAHA'], 50, { bg: '#fff', fg: FOREST, size: 60 });
  U += tag(tn, 28.0, 30.0, ['pena ± 15 cm (ukuran berbeda antarproduk)'], 540, 1300, { size: 30 });
  if (tn > 31.8 && tn < 33.0) U += tag(tn, 31.9, 33.0, ['bukan ke lengan, jantung, atau pembuluh darah'], 540, 1300, { size: 30, bg: '#FFE3E0' });
  return { A: A_, U };
}
function sceneMacro(tn) {
  const need = ease((tn - 33.2) / 0.75), push = ease((tn - 34.0) / 1.1), spring = 1 - 0.55 * ease((tn - 33.1) / 0.6);
  const Cx = 540, skinY = 820;
  let s = `<rect x="-100" y="${skinY}" width="1300" height="80" fill="#DDA583"/><rect x="-100" y="${skinY - 6}" width="1300" height="12" fill="#C98E64"/><rect x="-100" y="${skinY + 80}" width="1300" height="130" fill="#F3D58B"/><rect x="-100" y="${skinY + 210}" width="1300" height="400" fill="#B5524A"/>`;
  for (let i = 0; i < 16; i++) s += `<path d="M${-60 + i * 85} ${skinY + 230}Q${-30 + i * 85} ${skinY + 420} ${-60 + i * 85} ${skinY + 600}" stroke="#96403A" stroke-width="8" fill="none" opacity=".6"/>`;
  s += `<text x="40" y="${skinY + 56}" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="30" fill="#7A4A32">kulit</text><text x="40" y="${skinY + 160}" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="30" fill="#8A6A1E">lemak</text><text x="40" y="${skinY + 290}" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="30" fill="#FFD9D2">otot paha</text>`;
  // pena (irisan): casing, pegas, batang pendorong, kartrid berisi adrenalin emas
  const top = 330, w = 260, bx = Cx - w / 2;
  s += `<path d="M${bx} ${top}H${bx + w}V${skinY - 60}L${Cx + 40} ${skinY - 6}H${Cx - 40}L${bx} ${skinY - 60}Z" fill="#EEF2F5" stroke="#A8B4BE" stroke-width="6"/>`;
  let coil = `M${Cx - 70} ${top + 30}`; const ch = (170 * spring); for (let i = 0; i < 8; i++) coil += `L${Cx + (i % 2 ? -70 : 70)} ${f1(top + 30 + (i + 1) * ch / 8)}`;
  s += `<path d="${coil}" stroke="#7B8794" stroke-width="9" fill="none" stroke-linejoin="round"/>`;
  const plY = top + 30 + ch + 6 + 120 * push;
  s += `<rect x="${Cx - 90}" y="${f1(plY)}" width="180" height="26" rx="8" fill="#8A96A3"/>`;
  const cartTop = top + 250, cartBot = skinY - 90; s += `<rect x="${Cx - 90}" y="${cartTop}" width="180" height="${cartBot - cartTop}" rx="18" fill="rgba(255,255,255,.65)" stroke="#A8B4BE" stroke-width="5"/>`;
  const lvl = Math.max(plY + 26, cartTop + 6); s += `<rect x="${Cx - 84}" y="${f1(lvl)}" width="168" height="${f1(Math.max(0, cartBot - lvl - 4))}" rx="14" fill="${CL.adr}"/>`;
  s += `<rect x="${Cx - 90}" y="${plY - 0}" width="0" height="0"/>`;
  // jarum keluar otomatis dari ujung ke otot
  const nl = 40 + 330 * need; s += `<rect x="${Cx - 6}" y="${skinY - 60}" width="12" height="${f1(nl + 54)}" rx="5" fill="#C9D3DC" stroke="#7B8794" stroke-width="3"/>`;
  if (push > 0.05) s += `<rect x="${Cx - 3}" y="${skinY - 56}" width="6" height="${f1(nl + 46)}" fill="${CL.adr}" opacity="${f1(Math.min(1, push * 2))}"/>`;
  // adrenalin menyebar di otot
  if (push > 0.1) for (let i = 0; i < 22; i++) { const a = i * 2.39996, r = (30 + 150 * push) * (0.3 + 0.7 * rndf(i)) + 8 * Math.sin(tn * 3 + i), x = Cx + Math.cos(a) * r * 1.2, y = skinY + 300 + Math.sin(a) * r * 0.8; s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(8 + 5 * rndf(i + 3))}" fill="${CL.adr}" stroke="${INK}" stroke-width="3" opacity="${f1(Math.min(1, push * 1.4))}"/>`; }
  const mini = (() => { const x = 770, y = 210; return `<g transform="translate(${x} ${y})"><rect x="0" y="0" width="250" height="300" rx="28" fill="rgba(4,16,24,.86)" stroke="${CL.edge}" stroke-width="3"/><g transform="translate(125 40) scale(0.5)"><path d="M-153 0H153V150L146 330L10 330L2 150H-2L-10 330L-146 330L-153 150Z" fill="#4A5568"/></g><rect x="52" y="86" width="40" height="110" rx="20" fill="none" stroke="${GOLD}" stroke-width="7"/><text x="125" y="272" text-anchor="middle" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="24" fill="#fff">paha (kanan layar)</text></g>`; })();
  const A_ = `${bgDark}<g>${s}</g>${mini}`;
  let U = pill(['ILUSTRASI MEKANISME AUTOINJEKTOR'], 540, 100, { size: 40, bg: '#fff', fg: FOREST, a: clamp((tn - 32.9) / 0.3) });
  U += tag(tn, 33.2, 34.6, ['jarum bekerja otomatis'], 540, 1010 + 330, { size: 34 });
  U += tag(tn, 34.6, 35.5, ['adrenalin (emas) masuk ke otot'], 540, 1010 + 330, { size: 34, bg: GOLD, fg: INK });
  U += tag(tn, 33.0, 35.4, ['desain pena berbeda antarproduk'], 540, 190, { size: 32 });
  return { A: A_, U };
}
// ================================================================ ADEGAN 5 (35,3 - 48,3): tiga panel efek adrenalin
const P3 = [{ y: 190, h: 360 }, { y: 570, h: 360 }, { y: 950, h: 360 }].map((p) => ({ ...p, x: 60, w: 960 }));
export function stateS5(tn) {
  const al = ease((tn - 39.0) / 2.4), b2 = ease((tn - 42.6) / 2.0), b1 = ease((tn - 45.6) / 1.6);
  return { al, b2, b1, d: lerp(1, 0.05, al), leak: lerp(1, 0.1, al), bp: lerp(0.4, 0.8, al), sw: lerp(1, 0.5, al), ct: lerp(1, 0.12, b2), a: lerp(0.3, 1, b1) };
}
function sceneAdr(tn) {
  const s5 = stateS5(tn), t = tn, ap = (k) => clamp((tn - 35.5 - k * 0.45) / 0.5), recShow = clamp((tn - A.reseptor + 0.3) / 0.4);
  const act = tn < A.alfa ? -1 : tn < A.beta2 ? 0 : tn < A.beta1 ? 1 : tn < 47.6 ? 2 : -1, all = tn >= 47.6, pre = tn < A.alfa;
  const dim = (i) => (act < 0 ? 1 : act === i ? 1 : 0.5);
  const adr = clamp((tn - 36.0) / 0.6) * (tn < 47.6 ? 1 : 0.8);
  let A_ = bgDark;
  const panels = [
    { p: P3[0], title: 'α  PEMBULUH', col: CL.alfa, svg: (p) => vessel(p.x, p.y, p.w, p.h, { d: s5.d, leak: s5.leak, bp: s5.bp, t, adr, rec: recShow > 0.02 ? s5.al * 1 : null, id: 5 }) },
    { p: P3[1], title: 'β2  BRONKUS', col: CL.b2, svg: (p) => airway(p.x, p.y, p.w, p.h, { swell: s5.sw, contract: s5.ct, t, adr, rec: recShow > 0.02 ? s5.b2 : null }) },
    { p: P3[2], title: 'β1  JANTUNG', col: CL.b1, svg: (p) => heart(p.x, p.y, p.w, p.h, { a: s5.a, t, rate: lerp(1.15, 1.45, s5.b1), adr, rec: recShow > 0.02 ? s5.b1 : null }) },
  ];
  panels.forEach((pn, i) => { const k = ap(i), on = act === i || all; A_ += `<g opacity="${f1(k * dim(i) * 100) / 100}" transform="translate(${f1((1 - ease(k)) * -80)} 0)">${pframe(pn.p.x, pn.p.y, pn.p.w, pn.p.h, pn.title, pn.col, { on })}${pn.svg(pn.p)}</g>`; });
  let U = pillAt(tn, 35.3, A.alfa - 0.05, ['ADRENALIN → RESEPTOR'], 64, { bg: GOLD, fg: INK, size: 52 }) + pillAt(tn, A.alfa - 0.05, A.beta2 - 0.05, ['ALFA: PEMBULUH'], 64, { bg: CL.alfa, fg: '#fff', size: 52 }) + pillAt(tn, A.beta2 - 0.05, A.beta1 - 0.05, ['BETA 2: BRONKUS'], 64, { bg: CL.b2, fg: '#fff', size: 52 }) + pillAt(tn, A.beta1 - 0.05, 47.6, ['BETA 1: JANTUNG'], 64, { bg: CL.b1, fg: '#fff', size: 52 }) + pillAt(tn, 47.6, 48.5, ['ADRENALIN: BEBERAPA REESEPTOR'.replace('REESEPTOR', 'RESEPTOR')], 64, { bg: GOLD, fg: INK, size: 46 });
  if (pre) U += tag(tn, 36.3, 38.9, ['adrenalin (emas) mengalir ke pembuluh, saluran napas, jantung'], 540, 1340, { size: 32 });
  if (act === 0) U += tag(tn, 39.2, 42.3, ['pembuluh menyempit, kebocoran dan bengkak berkurang'], 540, 1340, { size: 32 });
  if (act === 1) U += tag(tn, 42.7, 45.3, ['otot bronkus mengendur, rongga melebar'], 540, 1340, { size: 32 });
  if (act === 2) U += tag(tn, 45.7, 47.6, ['denyut jantung lebih kuat'], 540, 1340, { size: 32 });
  return { A: A_, U };
}

// ================================================================ ADEGAN 6a (48,3 - 53,4): anafilaksis vs gatal/bersin ringan
const clipId = (id, x, y, w, h) => `<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="30"/></clipPath></defs>`;
function penIcon(x, y, s = 1, cross = false, check = false) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><g transform="rotate(-30)"><rect x="-70" y="-14" width="140" height="28" rx="8" fill="#EEF2F5" stroke="#A8B4BE" stroke-width="3"/><rect x="-24" y="-14" width="16" height="28" fill="${CL.adr}"/><path d="M-70 -9L-90 -5V5L-70 9Z" fill="#59636F"/></g>${cross ? `<circle r="62" fill="none" stroke="#F2546B" stroke-width="9"/><path d="M-44 -44L44 44" stroke="#F2546B" stroke-width="9" stroke-linecap="round"/>` : ''}${check ? `<circle cx="62" cy="-48" r="30" fill="#2FBF92"/><path d="M48 -48L58 -38L78 -60" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : ''}</g>`;
}
function sceneCompare(tn) {
  const t = tn, c1 = { x: 60, y: 200, w: 960, h: 560 }, c2 = { x: 60, y: 790, w: 960, h: 560 };
  const sev = orang({ hives: 0.95, flush: 0.8, worry: 0.9, mouth: 0.6, eyes: 0.25, hand: 1, breathe: phase(t, [[0, 1.5]]), amp: 0.09, sweat: 0.8, fork: false });
  const mild = orang({ hives: 0.18, flush: 0.12, worry: 0.15, mouth: 0.35 + 0.35 * Math.max(0, Math.sin(t * 5)), eyes: 0.85 * Math.max(0, Math.sin(t * 5)), breathe: phase(t, [[0, 0.5]]), amp: 0.025, fork: false });
  let A_ = bgDark;
  const a1 = clamp((tn - A.jadi + 0.1) / 0.4), a2 = clamp((tn - 50.6) / 0.5);
  A_ += `<g opacity="${f1(a1 * 100) / 100}">${clipId('cc1', c1.x, c1.y, c1.w, c1.h)}<rect x="${c1.x}" y="${c1.y}" width="${c1.w}" height="${c1.h}" rx="30" fill="#E9F1F3"/><g clip-path="url(#cc1)"><g transform="translate(300 ${c1.y + 270}) scale(0.62)">${sev}</g></g><rect x="${c1.x}" y="${c1.y}" width="${c1.w}" height="${c1.h}" rx="30" fill="none" stroke="${CL.ves}" stroke-width="9" stroke-dasharray="40 18" stroke-dashoffset="${f1(-t * 50)}"/>${penIcon(850, c1.y + 130, 1.2 + 0.07 * Math.sin(t * 5), false, true)}</g>`;
  A_ += `<g opacity="${f1(a2 * 100) / 100}">${clipId('cc2', c2.x, c2.y, c2.w, c2.h)}<rect x="${c2.x}" y="${c2.y}" width="${c2.w}" height="${c2.h}" rx="30" fill="#E9F1F3"/><g clip-path="url(#cc2)"><g transform="translate(300 ${c2.y + 270}) scale(0.62)">${mild}</g></g><rect x="${c2.x}" y="${c2.y}" width="${c2.w}" height="${c2.h}" rx="30" fill="none" stroke="#7FA3B5" stroke-width="7" stroke-dasharray="40 18" stroke-dashoffset="${f1(t * 40)}"/>${penIcon(850, c2.y + 130, 1.2 + 0.05 * Math.sin(t * 4), true, false)}</g>`;
  let U = pillAt(tn, A.jadi, 50.85, ['UNTUK ANAFILAKSIS'], 64, { bg: CL.ves, fg: '#fff', size: 56 }) + pillAt(tn, 50.85, 53.5, ['BUKAN UNTUK GATAL / BERSIN RINGAN'], 64, { bg: '#fff', fg: FOREST, size: 44 });
  const ck = clamp((tn - A.jadi) / 0.5);
  U += `<g opacity="${f1(ck * 100) / 100}">${T('napas sulit', 560, 410, { size: 38, fill: INK, anchor: 'start', w: 800 })}${T('suara berubah', 560, 462, { size: 38, fill: INK, anchor: 'start', w: 800 })}${T('hampir pingsan', 560, 514, { size: 38, fill: INK, anchor: 'start', w: 800 })}${T('bentol + bengkak', 560, 566, { size: 38, fill: INK, anchor: 'start', w: 800 })}</g>`;
  U += `<g opacity="${f1(a2 * 100) / 100}">${T('gatal ringan', 560, 1000, { size: 38, fill: INK, anchor: 'start', w: 800 })}${T('bersin', 560, 1052, { size: 38, fill: INK, anchor: 'start', w: 800 })}${T('tanpa napas sulit', 560, 1104, { size: 34, fill: '#4C6773', anchor: 'start', w: 700 })}</g>`;
  U += tag(tn, 51.6, 53.5, ['tidak semua alergi menjadi anafilaksis'], 540, 1360, { size: 30 });
  return { A: A_, U };
}
// ================================================================ ADEGAN 6b (53,4 - akhir): bantuan medis; gejala mereda bertahap; dinilai + dipantau
function sceneHelp(tn) {
  const t = tn, k = (a, b, f) => kf([[53.4, a], [59.0, b]], tn)[0], slide = ease((tn - 54.4) / 1.2);
  const pat = orang({ hives: k(0.9, 0.35), flush: k(0.7, 0.25), worry: k(0.8, 0.3), mouth: k(0.6, 0.15), eyes: k(0.4, 0), tilt: k(6, 0), breathe: phase(t, [[0, 1.4], [53.4, 1.4], [59, 0.75]]), amp: k(0.07, 0.035), sweat: k(0.8, 0.2), fork: false, hand: k(0.9, 0.3) });
  const med = orang({ sk: '#F1C7A0', skd: '#DDAE86', hair: '#6B4A2B', shirt: '#F4F7FA', shirtd: '#DCE4EA', worry: 0.1, breathe: phase(t, [[0, 0.5]]), amp: 0.02, fork: false });
  const medic = `<g transform="translate(${f1(lerp(1000, 760, slide))} 640) scale(0.62)">${med}<g transform="translate(110 480)"><rect x="-40" y="-40" width="80" height="80" rx="14" fill="#fff" stroke="#2FBF92" stroke-width="8"/><path d="M0 -24V24M-24 0H24" stroke="#2FBF92" stroke-width="14" stroke-linecap="round"/></g></g>`;
  // monitor sederhana (garis denyut tanpa angka)
  let d = ''; for (let i = 0; i <= 80; i++) { const x = i * 7, ph = mod((x + t * 130) / 140, 1), y = ph < 0.1 ? -70 * Math.sin(ph / 0.1 * Math.PI) : ph < 0.18 ? 22 * Math.sin((ph - 0.1) / 0.08 * Math.PI) : 0; d += `${i ? 'L' : 'M'}${x} ${f1(y)}`; }
  const mk = clamp((tn - 55.2) / 0.6);
  const mon = `<g opacity="${f1(mk * 100) / 100}" transform="translate(70 ${210})"><rect width="940" height="200" rx="28" fill="#04090B" stroke="${CL.edge}" stroke-width="4"/><g transform="translate(190 120)"><path d="${d}" stroke="#4CE08A" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g><text x="40" y="60" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="34" fill="#CFE8E2">pemantauan</text><circle cx="64" cy="130" r="22" fill="#4CE08A"/></g>`;
  let st = raka(tn < 57 ? 'khawatir' : 'lega', null, { yaw: -0.2, tilt: 3, gazeX: 0.4, gazeY: 0.2 }); st = rIdle(st, tn);
  const rk = `<g transform="translate(${f1(70 - 200 * 0.56)} 1010) scale(0.56)">${rakaSvg(st, { bare: true, shadow: false, uid: 'rkH', dark: true })}</g>`;
  const A_ = `${bgDark}${clipId('cc3', 0, 0, 1080, 1380)}<g clip-path="url(#cc3)"><g transform="translate(330 ${700}) scale(0.78)">${pat}</g>${medic}${rk}</g>${mon}`;
  let U = pillAt(tn, A.setelahPakai, 55.7, ['CARI BANTUAN MEDIS'], 64, { bg: GOLD, fg: INK, size: 58 }) + pillAt(tn, 55.7, 60.2, ['DINILAI + DIPANTAU'], 64, { bg: '#fff', fg: FOREST, size: 58 });
  U += tag(tn, 56.4, 60.2, ['gejala mereda bertahap, bukan hilang seketika'], 540, 1340, { size: 32 });
  return { A: A_, U };
}
const SCENES = [[-9, sceneHook], [A.ini - 0.05, sceneSkin], [A.pembuluh - 0.05, sceneEffects], [A.disini - 0.02, sceneBody], [32.9, sceneMacro], [A.setelah - 0.05, sceneAdr], [A.jadi - 0.05, sceneCompare], [A.setelahPakai - 0.05, sceneHelp]];
// Raka sebagai pengamat (aset asli brand/characters/raka/raka.js): dada ke atas, di pita bawah layar, ukuran sama di semua adegan.
const RK_MOOD = [['khawatir', null], ['berpikir', null], ['khawatir', null], ['menunjuk', 'menunjuk'], ['berpikir', null], ['berpikir', null], ['menunjuk', 'menunjuk'], null];
function rakaBand(tn, i) {
  const m = RK_MOOD[i]; if (!m) return '';
  const lead = i === 3 || i === 4 ? 0 : 0;
  let st = raka(i === 5 && tn >= 47.6 ? 'senang' : m[0], m[1], { yaw: 0.25, tilt: 3, gazeX: 0.35, gazeY: -0.55 }); st = rIdle(st, tn);
  return `<g transform="translate(${f1(210 - 200 * 0.62)} 1600) scale(0.62)">${rakaSvg(st, { bare: true, shadow: false, uid: 'rkB', dark: true })}</g>`;
}
export async function frame(t) {
  const tn = t - OFF; let i = 0; for (let k = 0; k < SCENES.length; k++) if (tn >= SCENES[k][0]) i = k;
  const s = SCENES[i][1](tn); let A_ = s.A, U = s.U; const fd = 0.4, k = i > 0 ? clamp((tn - SCENES[i][0]) / fd) : 1;
  if (k < 1) { const p = SCENES[i - 1][1](tn), e = ease(k); A_ = p.A + `<g opacity="${f1(e * 100) / 100}">${s.A}</g>`; U = `<g opacity="${f1((1 - e) * 100) / 100}">${p.U}</g><g opacity="${f1(e * 100) / 100}">${s.U}</g>`; }
  return { A: A_ + rakaBand(tn, i), U: U + captions(tn) };
}
export const cover = async () => {
  let st = raka('berpikir', null, { yaw: -0.15, tilt: -3 }); st = rIdle(st, 0.8);
  const pen = `<g transform="translate(540 700) rotate(-12) scale(3.1)"><path d="M-150 -7L-130 -11V11L-150 7Z" fill="#59636F"/><rect x="-130" y="-12" width="236" height="24" rx="6" fill="#EEF2F5" stroke="#A8B4BE" stroke-width="2.5"/><rect x="-96" y="-12" width="52" height="24" fill="${CL.adr}"/><rect x="62" y="-12" width="44" height="24" rx="6" fill="#8A96A3"/></g>`;
  const chip = (x, t, c) => `<g transform="translate(${x} 1010)"><rect x="-130" y="-52" width="260" height="104" rx="52" fill="${c}"/><text y="18" text-anchor="middle" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="52" fill="#fff">${t}</text></g>`;
  const A_ = `${bgDark}${pen}${chip(210, 'α', CL.alfa)}${chip(540, 'β2', CL.b2)}${chip(870, 'β1', CL.b1)}<g transform="translate(${f1(150 - 200 * 0.6)} 1170) scale(0.6)">${rakaSvg(st, { bare: true, shadow: false, uid: 'rkC', dark: true })}</g><g>${R(300, 1330, 700, 260, '#F7F2E4', 40)}<image href="logo-full.webp" x="360" y="1350" width="580" height="${f1(580 * 160 / 794)}" preserveAspectRatio="xMidYMid meet"/>${R(380, 1470, 540, 96, FOREST, 48)}${T('medcoel.com', 650, 1540, { size: 60, fill: GOLD })}</g>`;
  const U = `${T('PENA ADRENALIN', 540, 170, { size: 92, fill: '#fff', w: 800, e: 'stroke="#0A2B34" stroke-width="10" paint-order="stroke"' })}${T('LAWAN ANAFILAKSIS', 540, 270, { size: 80, fill: GOLD, w: 800, e: 'stroke="#0A2B34" stroke-width="10" paint-order="stroke"' })}${pill(['ilustrasi mekanisme · untuk reaksi alergi berat'], 540, 1100, { size: 34, bg: '#fff', fg: FOREST })}`;
  return { A: A_, U };
};
