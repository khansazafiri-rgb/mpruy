// "KENAPA JARI KERIPUT HABIS BERENANG?" (1080 x 1920, 30 fps, 46,4 dtk; narasi Google AI Studio 40,36 dtk dipakai apa adanya: audio/narasi.wav).
// Adegan: (1) tangan berukuran nyata bergerak di air, ujung jari berkerut, kamera mendekat ke ujung jari; (2) penampang kulit ujung jari (ilustrasi): saraf simpatik -> pembuluh darah kecil menyempit
// -> volume jaringan di bawah permukaan berkurang -> kulit melipat; (3) kembali ke luar (ujung jari tangan, sekilas ujung jari kaki); (4) overview web MEDCOEL ASLI; (5) kartu penutup.
// Seluruh waktu dari ../cues.json; tiap bingkai dihitung dari t (deterministik). Skala tangan tetap (kamera yang mendekat), jumlah jari/arah sendi konsisten (hand.js).
import { f1, clamp, lerp, sm, eio } from './core.js';
import { K, R, T, pill, ILU, win } from './ui.js';
import { hand, foot, ORDER, FINGERS } from './hand.js';
import { section, secState } from './section.js';
const $ = (id) => document.getElementById(id);
const C = await (await fetch('../cues.json')).json();
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
export const DUR = C.dur;
let NEED = [];
const need = (u) => { NEED.push(u); return u; };
const cache = new Map();
const load = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().catch(() => {})); } return cache.get(u); };
const rnd = (seed) => { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };

// ------------------------------------------------------------------ kamera dan gerak tangan di dalam air
const ZB = 52;                                          // px per cm pada zoom 1 (tangan ±19 cm -> ±1180 px)
const WR = (t) => sm((t - C.kerut.mulai) / (C.kerut.penuh - C.kerut.mulai));       // tingkat kerutan ujung jari 0..1
const zoomK = (t) => (t < 12 ? sm((t - C.zoom.masuk[0]) / (C.zoom.masuk[1] - C.zoom.masuk[0])) : 1 - sm((t - C.zoom.keluar[0]) / (C.zoom.keluar[1] - C.zoom.keluar[0])));
function motion(t, m) {                                 // gerak keseluruhan tangan (translasi + putar pergelangan) dalam cm / derajat
  return { dx: 0.9 * m * Math.sin(2 * Math.PI * t / 4.6), dy: 0.55 * m * Math.sin(2 * Math.PI * t / 3.7 + 1), rot: 3.6 * m * Math.sin(2 * Math.PI * t / 5.3) };
}
const toWorld = (M, p) => { const a = M.rot * Math.PI / 180, x = p[0], y = p[1] - 10.6, c = Math.cos(a), s = Math.sin(a); return [M.dx + x * c - y * s, M.dy + 10.6 + x * s + y * c]; };
/** adegan "tangan di air": kembali {svg, S(p) = titik lokal tangan -> layar} */
function waterWorld(t, o = {}) {
  const k = zoomK(t), m = lerp(1, 0.28, k), ampl = o.m ?? m, M = motion(t, ampl), wrk = o.wrk ?? WR(t);
  const h = hand(t, wrk, ampl), tipL = h.G.index[3], tip = toWorld(M, tipL);
  const base = o.center ?? [0, 5.2], zoom = lerp(o.zoom0 ?? 1, 5.6, k), cx = lerp(base[0], tip[0], k), cy = lerp(base[1], tip[1] - 0.5, k), sc = ZB * zoom;
  const Sx = (x) => 540 + (x - cx) * sc, Sy = (y) => (o.cy ?? 960) + (y - cy) * sc;
  let s = `<g transform="translate(540 ${o.cy ?? 960}) scale(${f1(sc * 100) / 100}) translate(${f1(-cx * 100) / 100} ${f1(-cy * 100) / 100})">`;
  // ubin dasar kolam (12,5 cm) samar
  let grid = ''; for (let i = -16; i <= 16; i++) { grid += `<path d="M${i * 10 + 1} -90V110M-120 ${i * 10 + 4}H120" stroke="rgba(210,245,255,.20)" stroke-width="0.22"/>`; }
  // garis tali jalur kolam (lebar 25 cm) sebagai acuan skala; hanya dasar kolam, bukan bagian tangan
  s += `<g filter="url(#blurTile)">${grid}<rect x="7" y="-90" width="25" height="200" fill="rgba(8,40,66,.40)"/><rect x="-46" y="-80" width="25" height="180" fill="rgba(8,40,66,.0)"/></g>`;
  s += `<g transform="translate(${f1(M.dx * 100) / 100} ${f1(M.dy * 100) / 100}) rotate(${f1(M.rot * 10) / 10} 0 10.6)">${h.svg}</g></g>`;
  return { svg: s, S: (p) => { const w = toWorld(M, p); return [Sx(w[0]), Sy(w[1])]; }, sc, tipS: [Sx(tip[0]), Sy(tip[1])], h, M };
}
function waterBg(t) {
  let s = `<rect width="1080" height="1920" fill="url(#waterG)"/>`;
  // sorotan cahaya (kaustik) bergerak
  const r = rnd(7); for (let i = 0; i < 16; i++) { const x = (r() * 1200 + 40 * Math.sin(t * 0.7 + i)) % 1100, y = (r() * 2000 + 36 * Math.cos(t * 0.55 + i * 1.7)) % 1960, rx = 80 + r() * 150, ry = 26 + r() * 54, a = 0.05 + 0.05 * Math.sin(t * 1.3 + i * 2); s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="rgba(210,250,255,${f1(Math.max(0.02, a))})" transform="rotate(${f1(-18 + i * 7)} ${f1(x)} ${f1(y)})"/>`; }
  // berkas cahaya dari permukaan
  for (let i = 0; i < 4; i++) { const x = 140 + i * 280 + 30 * Math.sin(t * 0.4 + i); s += `<path d="M${f1(x)} 0L${f1(x + 150)} 0L${f1(x - 60)} 1920L${f1(x - 230)} 1920Z" fill="rgba(200,245,255,${f1(0.035 + 0.015 * Math.sin(t * 0.9 + i))})"/>`; }
  return s;
}
function waterFx(t) {                                   // gelembung dan riak di atas semuanya (efek air)
  let s = ''; const r = rnd(21);
  for (let i = 0; i < 22; i++) { const x0 = r() * 1080, sp = 40 + r() * 70, rad = 4 + r() * 11, y = 1960 - ((t * sp + r() * 2200) % 2100), x = x0 + 16 * Math.sin(t * 1.8 + i * 2.1); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(rad)}" fill="rgba(235,252,255,.12)" stroke="rgba(255,255,255,.55)" stroke-width="2"/><circle cx="${f1(x - rad * 0.3)}" cy="${f1(y - rad * 0.3)}" r="${f1(rad * 0.25)}" fill="rgba(255,255,255,.7)"/>`; }
  s += `<rect width="1080" height="1920" fill="rgba(20,120,170,.10)"/>`;
  return s;
}
const FILTERS = `<defs>
<linearGradient id="waterG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#37B4D2"/><stop offset=".5" stop-color="#1B8DB5"/><stop offset="1" stop-color="#0B5D86"/></linearGradient>
<linearGradient id="skinG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EDB68B"/><stop offset="1" stop-color="#D8946A"/></linearGradient><filter id="blurTile" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="0.5"/></filter>
<linearGradient id="bgDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.bg0}"/><stop offset="1" stop-color="${K.bg1}"/></linearGradient></defs>`;

// ------------------------------------------------------------------ S1/S3/S4 adegan luar (air + tangan/kaki)
function sceneAir(t) {
  const W = waterWorld(t); let s = waterBg(t) + W.svg + waterFx(t);
  const q = win(t, C.tanya[0], C.tanya[1] + 0.1, 0.3);
  if (q > 0.01) s += `<g opacity="${f1(q)}">${R(70, 300, 940, 210, 'rgba(6,34,43,.82)', 50, `stroke="${K.cyan}" stroke-width="4"`)}${T(540, 395, 'Kenapa jari keriput', K.text, 62, 800)}${T(540, 472, 'habis berenang?', K.gold, 62, 800)}</g>`;
  return s;
}
function footWorld(t) {
  const f = foot(t, 1), zoom = 1.3, cx = 0.3, cy = 3.2, sc = ZB * zoom, wob = 0.25 * Math.sin(t * 2.0);
  const S = (p) => [540 + (p[0] * 1.18 - cx) * sc, 960 + (p[1] - cy) * sc];
  return { svg: `<g transform="translate(540 960) scale(${f1(sc * 100) / 100}) translate(${-cx} ${-cy})"><g transform="rotate(${f1(wob * 4) / 1} 0 12)">${f.svg}</g></g>`, S, cl: f.cl, sc };
}
function ring(x, y, r, c, a, t) { return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r + 6 * Math.sin(t * 6))}" fill="none" stroke="${c}" stroke-width="7" opacity="${f1(a)}"/>`; }
function sceneLuar(t) {
  const u = C.luar; let s = waterBg(t), over = '';
  const zi = t < 25.2 ? 1 : 0;
  if (t >= u.kaki[0] - 0.01 && t < u.kaki[1] + 0.15) {
    const F = footWorld(t), a = clamp((t - u.kaki[0]) / 0.3) * clamp((u.kaki[1] + 0.15 - t) / 0.3);
    s += `<g opacity="${f1(a)}">${F.svg}</g>`;
    if (a > 0.05) { const tips = F.cl.map((c) => c[c.length - 1]); tips.forEach((p) => { const q = F.S([p.x, p.y]); over += ring(q[0], q[1], 30 + 6 * (1 - p.w / 3), K.gold, 0.9 * a, t); }); over += pill(540, 1286, 'UJUNG JARI KAKI', { fs: 34, c: K.gold, a, px: 52 }); }
    if (a < 1 && t < u.kaki[0] + 0.3) { const W = waterWorld(t, { zoom0: 1, center: [0, 5.2], m: 0.6 }); s += `<g opacity="${f1(1 - a)}">${W.svg}</g>`; }
    else if (a < 1) { const W = waterWorld(t, { m: 0.6 }); s += `<g opacity="${f1(1 - a)}">${W.svg}</g>`; }
  } else {
    // tangan: dari zoom ujung jari -> seluruh tangan; setelah 29 dtk geser kamera ke bawah untuk ruang PiP
    const rec = u.recap, shift = sm((t - rec[0]) / 0.9) * (1 - sm((t - (rec[1] - 0.2)) / 0.4)), W = waterWorld(t, { m: t < 25.2 ? undefined : 0.85, center: [0, lerp(5.2, -8.4, shift)], cy: 960 });
    s += W.svg;
    if (t >= u.tangan[0] && t < u.tangan[1] + 0.1) { const a = win(t, u.tangan[0], u.tangan[1] + 0.1, 0.3); ['index', 'middle', 'ring', 'pinky', 'thumb'].forEach((k) => { const p = W.h.G[k][W.h.G[k].length - 1], q = W.S(p); over += ring(q[0], q[1], 64, K.gold, 0.9 * a, t); }); over += pill(540, 1286, 'UJUNG JARI TANGAN', { fs: 34, c: K.gold, a, px: 52 }); }
    const j = win(t, C.luar.jadi + 0.9, rec[0] - 0.1, 0.4); if (j > 0.01) over += pill(540, 1286, 'BUKAN SEKADAR KULIT BASAH', { fs: 36, c: K.cyan, a: j, px: 54 });
    if (t >= rec[0] - 0.4 && t < rec[1] + 0.2) {
      const a = clamp((t - (rec[0] - 0.2)) / 0.5) * clamp((rec[1] + 0.2 - t) / 0.4), y = lerp(-80, 0, sm((t - (rec[0] - 0.2)) / 0.6));
      const st = { constrict: 1, volume: 1, fold: 1, reveal: 1, pulseOn: true };
      over += `<g opacity="${f1(a)}" transform="translate(236 ${f1(y + 40)}) scale(0.62)">${section(t, st, { id: 'rec', noLabels: true, pt: 14.76 + ((t - rec[0]) % 1.9) * 0.8 + 0.6 })}</g>`;
      over += pill(540, 304 + 0, 'SARAF + PEMBULUH DARAH IKUT BEKERJA', { fs: 31, c: K.gold, a, px: 48 });
    }
  }
  return s + over;
}
// ------------------------------------------------------------------ transisi dari air ke penampang (4,4-4,9) dan kembali
function scenePenampang(t) {
  const a = clamp((t - C.sc.penampang[0]) / 0.5);
  let s = `<rect width="1080" height="1920" fill="url(#bgDark)"/>`;
  s += section(t, secState(t));
  // inset kecil: letak potongan di ujung jari
  const ia = win(t, 4.9, 10.8, 0.5) * 0.95;
  if (ia > 0.01) s += `<g opacity="${f1(ia)}" transform="translate(70 1226)"><rect x="-10" y="-8" width="200" height="176" rx="26" fill="rgba(6,34,43,.82)" stroke="${K.line}" stroke-width="2"/><path d="M40 140V60Q40 18 90 18Q140 18 140 60V140Z" fill="#E4A87C" stroke="#8E5A38" stroke-width="3"/><g stroke="rgba(110,64,38,.5)" stroke-width="2" fill="none"><path d="M58 52q-4 14 0 30M76 40q-4 18 0 40M96 38q-4 18 0 42M116 42q-4 18 0 40M132 54q-3 12 0 26"/></g><path d="M20 98H160" stroke="${K.gold}" stroke-width="4" stroke-dasharray="9 7"/>${T(95, 160, 'potongan', K.gold, 20, 700)}</g>`;
  const MEK = [['SARAF SIMPATIK', 'MEMICU SINYAL', 14.0, 16.95], ['PEMBULUH', 'MENYEMPIT', 16.96, 18.27], ['VOLUME JARINGAN', 'BERKURANG', 18.28, 21.35], ['KULIT', 'MELIPAT', 21.36, 23.9]];
  const ca = clamp((t - 13.9) / 0.5) * clamp((24.0 - t) / 0.4);
  if (ca > 0.01) {
    const wd = 238, xs = [0, 1, 2, 3].map((i) => 40 + i * (wd + 22));
    s += MEK.map(([l1, l2, a0, a1], i) => { const on = t >= a0 && t < a1, done = t >= a1, c = on ? K.gold : done ? K.teal : 'rgba(168,208,204,.45)';
      return `<g opacity="${f1(ca)}">${R(xs[i], 1232, wd, 112, on ? 'rgba(248,192,56,.16)' : 'rgba(6,34,43,.72)', 26, `stroke="${c}" stroke-width="${on ? 5 : 3}"`)}<circle cx="${xs[i] + 32}" cy="1288" r="19" fill="${c}"/>${T(xs[i] + 32, 1296, done ? '✓' : String(i + 1), '#06222B', 24, 800)}${T(xs[i] + 62, 1282, l1, on ? K.text : K.mute, 18, 800, 'start')}${T(xs[i] + 62, 1312, l2, on ? K.text : K.mute, 18, 800, 'start')}</g>`; }).join('');
    s += [0, 1, 2].map((i) => `<path d="M${xs[i] + wd + 5} 1280l10 8l-10 8" stroke="rgba(168,208,204,${f1(0.8 * ca)})" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  }
  s += ILU(a, 'Ilustrasi sederhana (penampang), bukan citra pasien');
  return `<g opacity="${f1(a)}">${s}</g>`;
}
// ------------------------------------------------------------------ rekaman web MEDCOEL asli (dipakai ulang dari rekaman Level Up)
const WEB = '../rekam/web';
const VW = [540, 790, 1];
const SEGW = [   // [t0, t1, klip, bingkai0, bingkai1, tampilan0 [cx, cy, zoom], tampilan1, langkah]
  [36.4, 37.5, 'mk', 0, 73, VW, VW, 0],
  [37.5, 38.45, 'bab', 40, 89, [540, 840, 1.06], [540, 940, 1.08], 1],
  [38.45, 39.7, 'materi', 52, 196, [540, 800, 1.06], [540, 980, 1.08], 1],
  [39.7, 40.9, 'flash', 48, 136, [540, 860, 1.06], [540, 920, 1.08], 2],
  [40.9, 42.4, 'learning', 98, 200, [540, 820, 1.06], [540, 1000, 1.08], 3],
  [42.4, 43.7, 'atlas', 1, 46, null, null, 4],
];
const STEPS = ['', 'MATERI PER BAB', 'FLASHCARD', 'LATIHAN SOAL + PEMBAHASAN', 'ANATOMI INTERAKTIF'];
const wurl = (clip, i) => `${WEB}/${clip}/f${String(Math.round(i)).padStart(4, '0')}.jpg`;
export function webSeg(t) {
  const tt = clamp(t, SEGW[0][0], SEGW[SEGW.length - 1][1] - 0.001), s = SEGW.find((x) => tt >= x[0] && tt < x[1]) || SEGW[SEGW.length - 1], u = clamp((tt - s[0]) / (s[1] - s[0]));
  return { seg: s, i: lerp(s[3], s[4], u), v: s[5] ? [0, 1, 2].map((k) => lerp(s[5][k], s[6][k], sm(u))) : null };
}
function sceneWeb(t) {
  const f = webSeg(t), [, , clip, , , , , step] = f.seg, inA = clamp((t - C.web.masuk[0]) / 0.9);
  const P = { x: 140, y: 330, w: 800, h: 1100 }, atlas = clip === 'atlas';
  let s = `<rect width="1080" height="1920" fill="url(#bgDark)"/><ellipse cx="540" cy="900" rx="600" ry="760" fill="rgba(0,160,138,.14)"/>`;
  // kartu panel (ponsel) dengan rekaman web asli
  const scale = 1 + 0.06 * (1 - sm(inA)), tf = `translate(540 880) scale(${f1(scale * 1000) / 1000}) translate(-540 -880)`;
  let panel;
  if (atlas) {
    const Q = { x: 90, y: 420, w: 900, h: 900 };
    panel = `<clipPath id="clipP"><rect x="${Q.x}" y="${Q.y}" width="${Q.w}" height="${Q.h}" rx="40"/></clipPath><g clip-path="url(#clipP)"><rect x="${Q.x}" y="${Q.y}" width="${Q.w}" height="${Q.h}" fill="#0E3A3F"/><image href="${need(wurl(clip, f.i))}" x="${Q.x}" y="${Q.y}" width="${Q.w}" height="${Q.h}" preserveAspectRatio="xMidYMid slice"/></g><rect x="${Q.x}" y="${Q.y}" width="${Q.w}" height="${Q.h}" rx="40" fill="none" stroke="${K.line}" stroke-width="4"/>`;
  } else {
    const [cx, cy, z] = f.v, sc = (P.w / 1080) * z, x = P.x + P.w / 2 - cx * sc, y = P.y + P.h / 2 - cy * sc;
    panel = `<clipPath id="clipP"><rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" rx="44"/></clipPath><g clip-path="url(#clipP)"><rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" fill="#F3F6F1"/><image href="${need(wurl(clip, f.i))}" x="${f1(x)}" y="${f1(y)}" width="${f1(1080 * sc)}" height="${f1(1800 * sc)}" preserveAspectRatio="none"/></g><rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" rx="44" fill="none" stroke="${K.line}" stroke-width="5"/>`;
  }
  s += `<g opacity="${f1(inA)}" transform="${tf}">${panel}</g>`;
  // penanda langkah: 4 titik + nama fitur yang sedang ditunjukkan
  if (step > 0) {
    const dots = [1, 2, 3, 4].map((n, i) => `<circle cx="${f1(540 + (i - 1.5) * 64)}" cy="302" r="${n === step ? 15 : 10}" fill="${n === step ? K.gold : 'rgba(168,208,204,.45)'}" stroke="${n === step ? '#06222B' : 'none'}" stroke-width="3"/>`).join('');
    s += dots + pill(540, 1488 - 4, `${step}  ${STEPS[step]}`, { fs: 34, c: K.gold, px: 58 });
  } else s += pill(540, 1488 - 4, 'MEDCOEL: belajar FK', { fs: 34, c: K.cyan, px: 58 });
  return s;
}
// ------------------------------------------------------------------ kartu penutup (tampilan web + logo + teks)
function sceneAkhir(t) {
  const u = t - C.akhir[0], a = clamp(u / 0.4);
  let s = `<rect width="1080" height="1920" fill="url(#bgDark)"/><ellipse cx="540" cy="760" rx="620" ry="760" fill="rgba(0,160,138,.16)"/>`;
  const P = { x: 270, y: 290, w: 540, h: 800 }, sc = P.w / 1080, ms = 1800 * sc;
  s += `<g opacity="${f1(a)}"><clipPath id="clipEnd"><rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" rx="40"/></clipPath><g clip-path="url(#clipEnd)"><rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" fill="#F3F6F1"/><image href="${need(wurl('mk', 0))}" x="${P.x}" y="${P.y}" width="${P.w}" height="${f1(ms)}" preserveAspectRatio="none"/></g><rect x="${P.x}" y="${P.y}" width="${P.w}" height="${P.h}" rx="40" fill="none" stroke="rgba(124,224,184,.6)" stroke-width="5"/></g>`;
  const lg = sm(clamp((u - 0.15) / 0.45)), tx = sm(clamp((u - 0.45) / 0.5));
  s += `<g opacity="${f1(lg)}" transform="translate(0 ${f1((1 - lg) * 24)})">${R(190, 1140, 700, 150, 'rgba(248,247,243,.98)', 38)}<image href="../stage/logo-full.webp" x="290" y="1154" width="500" height="122" preserveAspectRatio="xMidYMid meet"/></g>`;
  need('../stage/logo-full.webp');
  s += `<g opacity="${f1(tx)}" transform="translate(0 ${f1((1 - tx) * 30)})">${R(70, 1322, 940, 108, K.gold, 54)}${T(540, 1393, 'BELAJAR FK GRATIS · MEDCOEL.COM', K.ink, 48, 800)}</g>`;
  return s;
}
// ------------------------------------------------------------------ rakit adegan
function compose(t) {
  NEED = []; let s = FILTERS; const sc = C.sc;
  if (t < sc.air[1]) s += sceneAir(t);
  if (t >= sc.penampang[0] && t < sc.penampang[1]) s += scenePenampang(t);
  if (t >= sc.luar[0] && t < sc.luar[1]) { const a = (t < sc.luar[0] + 0.7 ? clamp((t - sc.luar[0]) / 0.7) : 1) * clamp((sc.luar[1] - t) / 0.7); s += `<g opacity="${f1(a)}">${waterBg(t) ? '' : ''}${sceneLuar(t)}</g>`; }
  if (t >= C.web.masuk[0] && t < sc.web[1]) s += `<g opacity="${f1(clamp((t - C.web.masuk[0]) / 0.7))}">${sceneWeb(t)}</g>`;
  if (t >= C.akhir[0]) s += sceneAkhir(t);
  return s;
}
window.renderFrame = async (t) => {
  const s = compose(t); await Promise.all(NEED.map(load));
  $('scene').innerHTML = s;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
window.__ready = true;
