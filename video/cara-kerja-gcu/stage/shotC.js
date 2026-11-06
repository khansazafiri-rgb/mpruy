// ADEGAN C (32,1 - 35,6): Raka berpikir "bagaimana kalau cek kolesterol total atau asam urat?" - strip di alat DIGANTI (GLUKOSA -> KOLESTEROL TOTAL -> ASAM URAT) sinkron dengan ucapan.
// ADEGAN D (35,0 - 42,9): tiga strip berdampingan (potongan bening): nama, reagen berbeda, tiap strip dengan hasil contoh SENDIRI (satu pemeriksaan per strip).
// ADEGAN E/F (42,5 - 50,52): rangkuman TETES DARAH -> REAKSI DI STRIP -> SINYAL LISTRIK -> HASIL DI LAYAR; Raka menunjuk strip dan alat, mengerti; logo MEDCOEL masuk singkat.
import { f1, clamp, lerp, sm, eo, ei, eio, eob, seg, win, rad, rot, MC, FONT, pchip, track, step } from './core.js';
import { raka, lerpState, rIdle, solveArm, rakaBody } from './raka.js';
import * as A from './art.js';

export const ANA = [A.ANALYT.glukosa, A.ANALYT.kolesterol, A.ANALYT.urat];
const EXs = (n) => raka(n, 'netral');
const FACE = { berpikir: EXs('berpikir'), penasaran: EXs('penasaran'), kaget: EXs('kaget'), mengerti: EXs('mengerti'), senang: EXs('senang'), lega: EXs('lega'), netral: EXs('netral'), menunjuk: EXs('menunjuk') };
function faceAt(t, keys) { let cur = FACE[keys[0][1]]; for (let k = 1; k < keys.length; k++) { const [tk, nm, d] = keys[k]; if (t >= tk) cur = lerpState(FACE[keys[k - 1][1]], FACE[nm], sm((t - tk) / d)); else break; } return JSON.parse(JSON.stringify(cur)); }
const GRIP_SU = 720, G_HOLD = [150, 562], TH_HOLD = 24;
const rotp = (p, th) => rot(p, th);
export const worldOf = (G, th, p) => { const v = rotp([p[0] * A.U, (p[1] - GRIP_SU) * A.U], th); return [G[0] + v[0], G[1] + v[1]]; };

// ---------------------------------------------------------------- Raka (dipakai C dan E/F)
function rakaBlock(t, o) {
  const base = faceAt(t, o.face);
  const gx = o.gaze ? o.gaze(t) : [0, 0];
  base.gazeX = gx[0]; base.gazeY = gx[1]; base.yaw = gx[2] ?? 0;
  const st = rIdle(base, t);
  const [hx, hy, fa, fg] = o.hr(t);
  const G = o.G ? o.G(t) : G_HOLD, th = o.th ? o.th(t) : TH_HOLD;
  st.armR = solveArm(st, 'R', [hx, hy], { finger: fg, fa, front: 1, len: 142 });
  st.armL = solveArm(st, 'L', G, { finger: 0, front: 1, len: 150 });
  const body = rakaBody(st, o.uid || 'rk');
  const strip = o.strip ? o.strip(t) : { cover: 1, fill: 1, tint: ANA[0].warna, tintDark: ANA[0].gelap };
  const asm = A.assemblySvg({ id: o.uid + 'a', meter: { screen: o.screen ? o.screen(t) : { text: '92', tag: 'GLUKOSA' } }, strip: strip.dy ? { ...strip } : strip });
  const dev = `<g transform="translate(${f1(G[0])} ${f1(G[1])}) rotate(${f1(th)}) scale(${A.U}) translate(0 ${-GRIP_SU})">${asm}</g>`;
  const hand = `<g transform="translate(${f1(G[0])} ${f1(G[1])}) rotate(${f1(th)})"><circle r="22" fill="#F7BC8E"/><rect x="-6" y="-24" width="16" height="36" rx="8" fill="#F7BC8E" transform="rotate(-14 0 0)"/></g>`;
  return { st, G, th, svg: `<g>${body}${dev}${hand}</g>` };
}
const camTf = (cx, cy, s) => `translate(540 960) scale(${s.toFixed(4)}) translate(${f1(-cx)} ${f1(-cy)})`;
const toScr = (cx, cy, s, p) => [540 + (p[0] - cx) * s, 960 + (p[1] - cy) * s];

// ---------------------------------------------------------------- pergantian strip pada alat (C)
const SWAP = [[33.6, 1], [34.72, 2]];   // waktu ucapan "kolesterol" (33,66) dan "asam urat" (34,72): strip mulai diganti ~0,1 dtk lebih awal
function swapState(t) {
  let idx = 0, ph = 1, lastT = -9;
  for (const [ts, i] of SWAP) if (t >= ts) { idx = i; lastT = ts; }
  const u = clamp((t - lastT) / 0.55);   // 0..0.45 strip lama keluar, 0.45..1 strip baru masuk
  if (lastT < 0) return { idx: 0, dy: 0, a: 1, tint: ANA[0] };
  const prev = ANA[Math.max(0, idx - 1)], cur = ANA[idx];
  if (u < 0.45) { const k = eio(u / 0.45); return { idx: idx - 1, dy: -150 * k, a: 1 - k, tint: prev }; }
  const k = eo((u - 0.45) / 0.55); return { idx, dy: -150 * (1 - k), a: k, tint: cur };
}
const stripFor = (t) => { const s = swapState(t); return { cover: 1, fill: 1, tint: s.tint.warna, tintDark: s.tint.gelap, swap: s }; };
// rakitan khusus (strip bergeser/memudar saat ganti)
function asmSwap(id, sw, screenOpt) {
  const meter = A.meterSvg({ id: id + 'm', screen: screenOpt });
  const clip = `<clipPath id="${id}sc"><rect x="-200" y="-600" width="400" height="${f1(640 + 600)}"/></clipPath><clipPath id="${id}sc2"><rect x="-200" y="-900" width="400" height="${f1(900 + 240)}"/></clipPath>`;
  const strip = A.stripSvg({ id: id + 's', cover: 1, fill: 1, tint: sw.tint.warna, tintDark: sw.tint.gelap });
  return `<g class="gv-asm">${meter}${clip}<g clip-path="url(#${id}sc2)" opacity="${f1(sw.a)}" transform="translate(0 ${f1(sw.dy)})"><g clip-path="none">${strip}</g></g></g>`;
}

const FACE_C = [[32.0, 'berpikir', 0.01], [33.3, 'penasaran', 0.3], [34.6, 'kaget', 0.2], [35.1, 'berpikir', 0.3]];
const HR_C = track([[32.0, 276, 376, -100, 0.55], [32.9, 272, 372, -100, 0.55], [33.5, 300, 440, -112, 1], [35.6, 300, 440, -112, 1]]);
export function rakaC(t) {
  const sw = swapState(t);
  const R = rakaBlockSwap(t, { uid: 'rkc', face: FACE_C, hr: HR_C, gaze: () => [0.0, -0.75, 0.0], sw });
  return R;
}
function rakaBlockSwap(t, o) {
  const base = faceAt(t, o.face); const gz = o.gaze(t); base.gazeX = gz[0]; base.gazeY = gz[1]; base.yaw = gz[2];
  const st = rIdle(base, t); const [hx, hy, fa, fg] = o.hr(t);
  st.armR = solveArm(st, 'R', [hx, hy], { finger: fg, fa, front: 1, len: 142 });
  st.armL = solveArm(st, 'L', G_HOLD, { finger: 0, front: 1, len: 150 });
  const asm = asmSwap(o.uid + 'a', o.sw, { text: '92', tag: ANA[o.sw.idx].nama.slice(0, 9), tagA: 1 });
  const dev = `<g transform="translate(${f1(G_HOLD[0])} ${f1(G_HOLD[1])}) rotate(${TH_HOLD}) scale(${A.U}) translate(0 ${-GRIP_SU})">${asm}</g>`;
  const hand = `<g transform="translate(${f1(G_HOLD[0])} ${f1(G_HOLD[1])}) rotate(${TH_HOLD})"><circle r="22" fill="#F7BC8E"/><rect x="-6" y="-24" width="16" height="36" rx="8" fill="#F7BC8E" transform="rotate(-14 0 0)"/></g>`;
  return { st, svg: `<g>${rakaBody(st, o.uid)}${dev}${hand}</g>` };
}
// kartu "karusel" tiga strip di bagian atas adegan C (latar hutan), strip aktif disorot
export function cardC(t, expand = 0) {
  const a = seg(t, 32.5, 33.1, eob), act = t < 33.55 ? 0 : t < 34.68 ? 1 : 2;
  const x0 = lerp(60, 0, expand), y0 = lerp(100, 0, expand), w = lerp(960, 1080, expand), h = lerp(600, 1920, expand), rx = lerp(60, 0, expand);
  if (a <= 0.01) return '';
  let g = `<g opacity="${f1(Math.min(1, a))}" transform="translate(540 ${f1(y0 + h / 2)}) scale(${f1(0.9 + 0.1 * Math.min(1, a))}) translate(-540 ${f1(-(y0 + h / 2))})"><rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(rx)}" fill="${MC.forest}" stroke="${MC.ink}" stroke-width="${f1(6 * (1 - expand))}"/>`;
  g += `<rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(rx)}" fill="url(#cardGl)"/>`;
  [0, 1, 2].forEach((i) => {
    const sc = lerp(1.2, 2.7, expand) * (1 + 0.1 * (i === act ? 1 : 0) * (1 - expand)), cx = lerp(240, 220, expand) + i * lerp(300, 320, expand), top = lerp(135, 470, expand);
    const dim = i === act || expand > 0 ? 1 : 0.5;
    g += `<g opacity="${f1(dim)}" transform="translate(${f1(cx)} ${f1(top)}) scale(${f1(sc)})">${i === act && expand < 1 ? `<rect x="-38" y="-10" width="76" height="340" rx="14" fill="none" stroke="${MC.gold}" stroke-width="${f1(5 / sc)}" opacity=".95"/>` : ''}${A.stripSvg({ id: 'cc' + i, cover: 0.55, fill: 0, tint: ANA[i].warna, tintDark: ANA[i].gelap, shadow: false })}</g>`;
  });
  return g + '</g>';
}
export const CARD_DEFS = `<defs><radialGradient id="cardGl" cx=".3" cy=".2" r=".9"><stop offset="0" stop-color="#00A58A" stop-opacity=".35"/><stop offset="1" stop-color="#00A58A" stop-opacity="0"/></radialGradient></defs>`;

export function sceneC(t) {
  const R = rakaC(t), s = 1.9, cx = 200, cy = 175;
  let g = `<g transform="${camTf(cx, cy, s)}">${R.svg}</g>`;
  // nama strip aktif sebagai label (dua baris bila panjang) di bawah kartu
  const act = t < 33.55 ? 0 : t < 34.68 ? 1 : 2;
  const names = [['GLUKOSA', 33.0, 33.62], ['KOLESTEROL\nTOTAL', 33.62, 34.74], ['ASAM URAT', 34.74, 35.4]];
  const out = [];
  names.forEach(([n, a0, a1], i) => { const al = seg(t, a0, a0 + 0.2) * (1 - seg(t, a1 - 0.2, a1)); if (al > 0.01) out.push(A.chipSvg(240 + i * 300, 520, n, { cx: 240 + i * 300, cy: 605, a: al, fs: 32 })); });
  return { svg: g, labels: out.join(''), card: (e) => cardC(t, e) };
}

// ---------------------------------------------------------------- adegan D: tiga strip berdampingan
const RES = [{ txt: '92', unit: 'mg/dL', tag: 'GLUKOSA' }, { txt: '180', unit: 'mg/dL', tag: 'KOLESTEROL' }, { txt: '5,2', unit: 'mg/dL', tag: 'ASAM URAT' }];
export const OWN = [39.9, 40.55, 41.2];
export function sceneD(t) {
  let g = '';
  const lt = (i) => 36.4 + i * 0.5;   // sorot bergantian "sesuai pemeriksaannya"
  const nameA = seg(t, 35.45, 35.8) * (1 - seg(t, 38.2, 38.5));
  const mix = (i) => 0;
  const tops = 470, sc = 2.7, xs = [220, 540, 860];
  [0, 1, 2].forEach((i) => {
    const hi = win(t, 36.3 + i * 0.75, 37.1 + i * 0.75, 0.2);
    const tintPulse = win(t, 38.7 + i * 0.15, 39.6 + i * 0.15, 0.2);
    const own = OWN[i], fillI = seg(t, own, own + 0.5, (x) => 1 - Math.pow(1 - x, 1.7));
    const sg = t > own + 0.45 && t < own + 1.05 ? (t - own - 0.45) / 0.6 : -1;
    g += `<g transform="translate(${xs[i]} ${tops}) scale(${(sc * (1 + 0.04 * hi)).toFixed(3)})"><g>${A.stripSvg({ id: 'dd' + i, cover: lerp(0.55, 0.2, seg(t, 35.6, 36.3)), fill: fillI, tint: ANA[i].warna, tintDark: ANA[i].gelap, glow: tintPulse * 0.9 + (fillI > 0.95 ? 0.15 : 0), glowColor: '#FFF2A8', sig: sg })}${hi > 0.02 ? `<rect x="-36" y="-8" width="72" height="344" rx="12" fill="none" stroke="${MC.gold}" stroke-width="${f1(4 / sc)}" opacity="${f1(hi)}"/>` : ''}</g></g>`;
    // tetes darah di ujung strip ini (hanya saat pemeriksaannya)
    const dr = win(t, own - 0.12, own + 0.65, 0.12) * (1 - fillI * 0.8);
    if (dr > 0.02) g += A.blobSvg(xs[i], tops - 22, 16 * dr, { sx: 1, sy: 1 });
    // layar hasil sendiri
    const ra = seg(t, own + 1.05, own + 1.35);
    const lcdX = xs[i] - 130, lcdY = 1420;
    g += `<g opacity="${f1(0.35 + 0.65 * ra)}"><rect x="${lcdX}" y="${lcdY}" width="260" height="170" rx="22" fill="#16262E"/><rect x="${lcdX + 12}" y="${lcdY + 12}" width="236" height="146" rx="13" fill="url(#gvLcd)"/>${ra > 0.02 ? `<text x="${xs[i]}" y="${lcdY + 56}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="25" fill="#1B3B34" opacity="${f1(ra)}">${RES[i].tag}</text><text x="${xs[i] - 10}" y="${lcdY + 128}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="76" fill="#1B3B34" opacity="${f1(ra)}" letter-spacing="-2">${RES[i].txt}</text><text x="${xs[i] + 82}" y="${lcdY + 146}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="22" fill="#1B3B34" opacity="${f1(0.75 * ra)}">${RES[i].unit}</text>` : `<text x="${xs[i]}" y="${lcdY + 112}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="60" fill="#1B3B34" opacity=".3" letter-spacing="6">- - -</text>`}</g>`;
    // jalur sinyal strip -> layar sendiri (garis putus emas), menyala saat hasil
    g += `<path d="M${xs[i]} ${tops + 330}V${lcdY}" stroke="${MC.gold}" stroke-width="5" stroke-dasharray="3 14" stroke-linecap="round" opacity="${f1(0.18 + 0.7 * ra)}"/>`;
  });
  // label nama (tiga) di atas strip
  const names = ['GLUKOSA', 'KOLESTEROL\nTOTAL', 'ASAM URAT'];
  names.forEach((n, i) => { if (nameA > 0.01) g += A.chipSvg(xs[i], tops - 4, n, { cx: xs[i], cy: 340, a: nameA, fs: 32 }); });
  // "Reagen berbeda": satu label di tengah atas dengan tiga titik jangkar pada ruang reaksi
  const ra2 = seg(t, 38.55, 38.85) * (1 - seg(t, 39.75, 40.05));
  if (ra2 > 0.01) {
    const w = A.chipW('Reagen berbeda'), cy = 340;
    g += `<g opacity="${f1(ra2)}">${[0, 1, 2].map((i) => `<path d="M${xs[i]} ${tops + 110 * sc}L${xs[i]} ${cy + 36}" stroke="${MC.ink}" stroke-width="7" opacity=".5" stroke-linecap="round"/><path d="M${xs[i]} ${tops + 110 * sc}L${xs[i]} ${cy + 36}" stroke="${MC.gold}" stroke-width="3.6" stroke-linecap="round"/><circle cx="${xs[i]}" cy="${tops + 110 * sc}" r="9" fill="${MC.gold}" stroke="${MC.ink}" stroke-width="3"/>`).join('')}<rect x="${f1(540 - w / 2)}" y="${cy - 28}" width="${f1(w)}" height="56" rx="28" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="2.5"/><text x="540" y="${cy + 11}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="32" fill="${MC.ink}">Reagen berbeda</text></g>`;
  }
  // satu pemeriksaan per strip (kalimat positif) saat hasil muncul
  const ra3 = seg(t, 40.2, 40.5) * (1 - seg(t, 42.45, 42.75));
  if (ra3 > 0.01) g += A.tag(540, 340, '1 strip = 1 pemeriksaan', { a: ra3, fs: 34 });
  const foot = seg(t, 40.5, 40.9) * (1 - seg(t, 42.45, 42.75));
  if (foot > 0.01) g += `<g opacity="${f1(0.92 * foot)}"><rect x="130" y="1660" width="820" height="52" rx="26" fill="${MC.ink}" opacity=".8"/><text x="540" y="1695" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="25" fill="${MC.ivory}">Angka contoh · ilustrasi · tiga pemeriksaan terpisah</text></g>`;
  return g;
}

// ---------------------------------------------------------------- adegan E/F
const FACE_E = [[42.5, 'penasaran', 0.01], [43.0, 'lihat', 0.01], [44.4, 'penasaran', 0.3], [46.6, 'mengerti', 0.35], [49.5, 'senang', 0.6]];
FACE.lihat = EXs('menunjuk');
const HR_E = track([[42.5, 296, 448, -140, 1], [44.4, 296, 440, -150, 1], [46.0, 292, 452, -122, 1], [47.0, 292, 470, -128, 1], [48.4, 296, 466, -140, 1], [50.6, 296, 464, -140, 1]]);
export function rakaE(t) {
  const sw = { idx: 0, dy: 0, a: 1, tint: ANA[0] };
  const o = { uid: 'rke', face: FACE_E, hr: HR_E, gaze: (tt) => [step(tt, [[42.5, 0.0], [48.0, 0]], 0.3), step(tt, [[42.5, 0.4], [46.0, 0.2], [47.5, 0.0]], 0.5), 0], sw };
  return rakaBlockSwap(t, o);
}
const CARDS = [
  { nm: 'TETES DARAH', t0: 42.94, t1: 44.2, ico: 'drop' }, { nm: 'REAKSI DI STRIP', t0: 44.28, t1: 45.5, ico: 'strip' },
  { nm: 'SINYAL LISTRIK', t0: 45.54, t1: 46.74, ico: 'bolt' }, { nm: 'HASIL DI LAYAR', t0: 46.78, t1: 48.0, ico: 'lcd' },
];
function icon(kind, cx, cy, k, t, on) {
  const wob = on ? Math.sin(t * 9) : 0;
  if (kind === 'drop') return `<g transform="translate(${cx} ${cy}) scale(${k})">${A.dropSvg(0, 4, 26, {})}</g>`;
  if (kind === 'strip') return `<g transform="translate(${cx} ${cy - 60}) scale(${k * 0.42})">${A.stripSvg({ id: 'ic1' + (on ? 'a' : ''), cover: 0.3, fill: 1, tint: ANA[0].warna, tintDark: ANA[0].gelap, glow: on ? 0.9 : 0, shadow: false })}</g>`;
  if (kind === 'bolt') return `<g transform="translate(${cx} ${cy}) scale(${k})"><path d="M10 -40L-18 6H-2L-10 40L20 -8H4Z" fill="#FFD43B" stroke="#9A6A08" stroke-width="4" stroke-linejoin="round" transform="rotate(${f1(wob * 2)})"/></g>`;
  return `<g transform="translate(${cx} ${cy}) scale(${k})"><rect x="-44" y="-32" width="88" height="64" rx="10" fill="#16262E"/><rect x="-37" y="-25" width="74" height="50" rx="6" fill="url(#gvLcd)"/><text x="0" y="14" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="34" fill="#1B3B34">92</text></g>`;
}
export function cardsE(t) {
  const fade = seg(t, 42.45, 42.85) * (1 - seg(t, 48.0, 48.35));
  if (fade <= 0.01) return '';
  let g = `<g opacity="${f1(fade)}">`;
  const cw = 880, ch = 146, x0 = 100, y0 = 150, gap = 46;
  CARDS.forEach((c, i) => {
    const y = y0 + i * (ch + gap), on = clamp(win(t, c.t0, c.t1, 0.18) * 1.4), done = t >= c.t0 ? 1 : 0, pop = 1 + 0.045 * on;
    const fill = on > 0.05 ? '#FFF2C4' : done ? '#FFFFFF' : '#F2EFE4';
    g += `<g transform="translate(540 ${y + ch / 2}) scale(${f1(pop)}) translate(-540 ${-(y + ch / 2)})"><rect x="${x0 + 6}" y="${y + 8}" width="${cw}" height="${ch}" rx="36" fill="${MC.ink}" opacity=".16"/><rect x="${x0}" y="${y}" width="${cw}" height="${ch}" rx="36" fill="${fill}" stroke="${on > 0.05 ? MC.gold : MC.ink}" stroke-width="${on > 0.05 ? 7 : 3.5}" opacity="${done ? 1 : 0.55}"/>`;
    g += `<g opacity="${done ? 1 : 0.5}">${icon(c.ico, x0 + 100, y + ch / 2, 1.05, t, on > 0.05)}<text x="${x0 + 200}" y="${y + ch / 2 + 17}" font-family="${FONT}" font-weight="800" font-size="52" fill="${MC.ink}" letter-spacing="-0.5">${c.nm}</text><text x="${x0 + cw - 62}" y="${y + ch / 2 + 22}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="64" fill="${MC.brand}" opacity=".3">${i + 1}</text></g></g>`;
    if (i < 3) { const ay = y + ch + gap / 2, al = seg(t, CARDS[i + 1].t0 - 0.25, CARDS[i + 1].t0 + 0.1); g += `<path d="M540 ${ay - 18}V${ay + 14}M520 ${ay - 2}L540 ${ay + 20}L560 ${ay - 2}" fill="none" stroke="${MC.brand}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity="${f1(0.25 + 0.75 * al)}"/>`; }
  });
  return g + '</g>';
}
export function sceneEF(t) {
  const z = seg(t, 47.85, 48.55, eio);
  const s = lerp(1.75, 2.5, z), cx = lerp(200, 205, z), cy = lerp(71, 330, z);
  const R = rakaE(t);
  let g = `<g transform="${camTf(cx, cy, s)}">${R.svg}</g>`;
  return { svg: g };
}
// logo MEDCOEL masuk singkat (pil gading + logo asli di apps/web/src/assets/logo-full.webp)
export function logoEnd(t) {
  const a = seg(t, 49.0, 49.4, eob) * 1; if (a <= 0.01) return '';
  const k = 0.82 + 0.18 * Math.min(1.05, a);
  return `<g opacity="${f1(Math.min(1, a))}" transform="translate(540 250) scale(${f1(k)}) translate(-540 -250)"><rect x="240" y="180" width="600" height="140" rx="70" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="4"/><image href="../../../apps/web/src/assets/logo-full.webp" x="285" y="198" height="104" preserveAspectRatio="xMidYMid meet"/></g>`;
}
