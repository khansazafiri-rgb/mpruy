// Panggung video "Udah hafal soal kakak tingkat, kok yang keluar beda?": renderFrame(t) deterministik. a = waktu audio narator asli, t = a + LEAD.
// Tampilan web MEDCOEL (beranda, catatan materi, latihan soal + pembahasan, flashcard) = bingkai hasil rekaman web asli lokal (rekam/web.cjs) di dalam bingkai laptop.
import { C, clamp, lerp, ease, easeOut, easeInOut, backOut, kf, win, seg, r1, rnd, g, rect, circ, txt, poly, cam, folder, paperStack } from './lib.js';
import { raka, rakaSvg, lerpState, idle } from '../../../brand/characters/raka/raka.js';
import { orang, orangSvg, LOOKS, idleOrang } from './orang.js';
import { kos, deskFront, rakaDesk, DESK_Y } from './kos.js';

await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
const DATA = await (await fetch('data.json')).json();
const LEAD = DATA.lead, FPS = DATA.fps;
const $ = (id) => document.getElementById(id);
const camEl = $('cam');
const W = 1080, H = 1920;
const mixS = (a, b, k) => lerpState(a, b, clamp(k, 0, 1));
const holdKeys = (a, keys) => {
  if (a <= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) if (a <= keys[i + 1][0]) return mixS(keys[i][1], keys[i + 1][1], ease((a - keys[i][0]) / (keys[i + 1][0] - keys[i][0])));
  return keys[keys.length - 1][1];
};
const speak = (a) => DATA.env[Math.round((a + LEAD) * FPS)] || 0;

// ================================================================ rekaman web asli di dalam bingkai laptop
// klip: [mulai, selesai (audio), nama, jumlah bingkai terpakai, kecepatan, kamera [[a, cx, cy, zoom], ...] (cx, cy dalam piksel CSS halaman 1100 x 680)]
const CLIPS = [
  { a0: 8.2, a1: 11.3, name: 'beranda', n: 94, sp: 1.0, cam: [[8.2, 550, 250, 1.0], [9.3, 560, 300, 1.3], [10.0, 550, 360, 1.6]] },
  { a0: 31.8, a1: 36.62, name: 'materi', n: 92, sp: 0.72, cam: [[31.8, 400, 250, 1.15], [33.2, 640, 300, 1.65], [34.8, 700, 330, 1.65]] },
  { a0: 36.65, a1: 41.66, name: 'soal', n: 148, sp: 1.0, cam: [[36.65, 550, 320, 1.0], [38.2, 380, 340, 1.6], [39.5, 400, 380, 1.6], [41.0, 420, 420, 1.6]] },
  { a0: 41.7, a1: 45.1, name: 'flash', n: 90, sp: 0.95, cam: [[41.7, 420, 430, 1.5], [43.2, 460, 440, 1.5]] },
];
const SCR = { x: 40, y: 400, w: 900, h: 557, pw: 1100, ph: 680 };   // layar laptop di panggung (px) dan ukuran halaman rekaman (px CSS)
const scrEl = $('scr'), scrImg = $('scrimg');
let scrSrc = ''; const loaded = new Map();
const pre = (url) => { if (!loaded.has(url)) { const im = new Image(); im.src = url; loaded.set(url, im.decode().catch(() => {})); } return loaded.get(url); };
async function updateScreen(a) {
  const c = CLIPS.find((k) => a >= k.a0 - 0.2 && a <= k.a1 + 0.3);
  if (!c) { scrEl.style.display = 'none'; return false; }
  scrEl.style.display = 'block';
  const gap = CLIPS.some((k) => k !== c && Math.abs(k.a0 - c.a1) < 0.2);
  scrEl.style.opacity = (ease(seg(a, c.a0 - 0.2, c.a0 + 0.05)) * (gap ? 1 : 1 - ease(seg(a, c.a1 + 0.05, c.a1 + 0.3)))).toFixed(3);
  scrEl.style.transform = 'none';
  const idx = clamp(Math.floor((a - c.a0) * FPS * c.sp), 0, c.n - 1);
  const url = `media/web/${c.name}/f${String(idx).padStart(4, '0')}.jpg`;
  if (url !== scrSrc) { scrSrc = url; await pre(url); scrImg.src = url; try { await scrImg.decode(); } catch (e) { /* lanjut */ } }
  // kamera: titik (cx, cy) halaman dibawa ke tengah layar dengan zoom z (1 = halaman penuh selebar layar)
  let k0 = c.cam[0], k1 = c.cam[0];
  for (let i = 0; i < c.cam.length; i++) { if (c.cam[i][0] <= a) k0 = c.cam[i]; if (c.cam[i][0] > a) { k1 = c.cam[i]; break; } k1 = c.cam[i]; }
  const u = k1[0] > k0[0] ? easeInOut((a - k0[0]) / (k1[0] - k0[0])) : 1;
  const cx = lerp(k0[1], k1[1], u), cy = lerp(k0[2], k1[2], u), z = lerp(k0[3], k1[3], u);
  const k = (SCR.w / SCR.pw) * z;
  const tx = clamp(SCR.w / 2 - cx * k, SCR.w - SCR.pw * k, 0), ty = clamp(SCR.h / 2 - cy * k, SCR.h - SCR.ph * k, 0);
  scrImg.style.width = `${r1(SCR.pw * k)}px`; scrImg.style.transform = `translate(${r1(tx)}px, ${r1(ty)}px)`;
  return true;
}
const laptopFrame = () => rect(SCR.x - 26, SCR.y - 26, SCR.w + 52, SCR.h + 52, '#222B3A', 28) + rect(SCR.x - 10, SCR.y - 10, SCR.w + 20, SCR.h + 20, '#0F1722', 16)
  + rect(SCR.x - 80, SCR.y + SCR.h + 26, SCR.w + 160, 30, '#3A455B', 14) + rect(SCR.x + SCR.w / 2 - 70, SCR.y + SCR.h + 26, 140, 10, '#2A3446', 5);

// ================================================================ teks layar
const chipHost = $('chips');
const mkEl = (host, cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; d.style.display = 'none'; host.appendChild(d); return d; };
const CHIPS = [
  { a0: 0.12, a1: 2.9, cls: 'big', html: '<span>UDAH HAFAL <em>SOAL KAKAK TINGKAT</em></span>' },
  { a0: 5.35, a1: 7.0, cls: 'big red', html: '<span>KOK SOALNYA <em>BEDA?!</em></span>' },
  { a0: 12.1, a1: 14.3, cls: 'big night', html: '<span>MALAM SEBELUM <em>UJIAN</em></span>' },
  { a0: 20.9, a1: 23.4, cls: 'big gold', html: '<span>BESOKNYA…</span>' },
  { a0: 24.5, a1: 26.9, cls: 'big red', html: '<span>MATERI YANG <em>MANA?!</em></span>' },
  { a0: 27.25, a1: 31.2, cls: 'big violet', html: '<span>HAFAL JAWABAN ≠<br>PAHAM KONSEP</span>' },
  { a0: 29.2, a1: 31.2, cls: 'small green', html: '<span>Soal kakak tingkat = bahan latihan</span>' },
  { a0: 32.0, a1: 36.6, cls: 'big green', html: '<span>PAHAMI <em>KONSEPNYA</em></span>' },
  { a0: 36.75, a1: 41.5, cls: 'big blue', html: '<span>LATIHAN + <em>PEMBAHASAN</em></span>' },
  { a0: 41.85, a1: 45.0, cls: 'big orange', html: '<span>ULANGI DENGAN <em>FLASHCARD</em></span>' },
  { a0: 45.15, a1: 50.0, cls: 'word green', html: '<span>1  PAHAMI</span>' },
  { a0: 47.5, a1: 50.0, cls: 'word blue', html: '<span>2  LATIHAN</span>' },
  { a0: 49.0, a1: 50.0, cls: 'word orange', html: '<span>3  ULANGI</span>' },
];
const chipEls = CHIPS.map((c) => mkEl(chipHost, 'chip ' + c.cls, c.html));
function popEls(list, els, a) {
  list.forEach((c, i) => {
    const d = els[i], on = a >= c.a0 && a <= c.a1 + 0.2;
    if (!on) { d.style.display = 'none'; return; }
    d.style.display = 'inline-flex';
    const k = backOut(clamp((a - c.a0) / 0.4, 0, 1)), o = clamp((c.a1 + 0.2 - a) / 0.2, 0, 1);
    d.style.opacity = Math.min(1, (a - c.a0) / 0.12) * o;
    d.style.transform = `scale(${lerp(0.75, 1, k).toFixed(3)}) translateY(${lerp(-18, 0, clamp(k, 0, 1)).toFixed(1)}px)`;
  });
}
const capBox = $('capbox'); let capIdx = -2;
function updateCaption(a) {
  let idx = -1;
  for (let i = 0; i < DATA.caps.length; i++) if (a >= DATA.caps[i].a0 - 0.04 && a < DATA.caps[i].a1) { idx = i; break; }
  if (idx !== capIdx) { capIdx = idx; if (idx < 0) capBox.style.display = 'none'; else { capBox.style.display = 'block'; capBox.textContent = DATA.caps[idx].text; } }
}

// ================================================================ maskot Kori
const KORI_SVG = await (await fetch('kori.svg')).text();
function mkKori(host) {
  const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'g'); host.appendChild(wrap);
  const inner = document.createElementNS('http://www.w3.org/2000/svg', 'g'); wrap.appendChild(inner);
  inner.innerHTML = new DOMParser().parseFromString(KORI_SVG, 'image/svg+xml').documentElement.innerHTML;
  const q = (s) => inner.querySelector(s);
  const K = { float: q('.mc-float'), eN: q('.mc-eyes-normal'), eH: q('.mc-eyes-happy'), mN: q('.mc-mouth-normal'), mH: q('.mc-mouth-happy'), mT: q('.mc-mouth-think'), arm: q('.mc-arm-right'), dots: [...inner.querySelectorAll('.mc-eyes > circle')] };
  return {
    set(a, { x = 0, y = 0, s = 1, rot = 0, o = 1, mood = 'happy', wave = 0, flip = 1 } = {}) {
      wrap.setAttribute('transform', `translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)}) scale(${(Math.round(s * 1000) / 1000) * flip} ${(Math.round(s * 1000) / 1000)}) translate(-160 -290)`);
      wrap.setAttribute('opacity', o);
      K.float.setAttribute('transform', `translate(0 ${(Math.sin(a * 2.6) * 6).toFixed(1)})`);
      const happy = mood === 'happy';
      K.eN.setAttribute('opacity', happy ? 0 : 1); K.eH.setAttribute('opacity', happy ? 1 : 0); K.dots.forEach((c) => c.setAttribute('opacity', happy ? 0 : 1));
      K.mN.setAttribute('opacity', mood === 'normal' ? 1 : 0); K.mH.setAttribute('opacity', happy ? 1 : 0); if (K.mT) K.mT.setAttribute('opacity', mood === 'think' ? 1 : 0);
      if (K.arm) K.arm.setAttribute('style', `transform-box:fill-box;transform-origin:10% 60%;transform:rotate(${wave.toFixed(1)}deg)`);
    },
  };
}
const koriMain = mkKori($('koriLayer'));
const waveAt = (a) => Math.sin(a * 9) * 18 - 14;
// jadwal Kori: [mulai, selesai, x, y, skala, suasana, cermin]
const KORI = [
  [7.2, 11.5, 870, 1290, 1.25, 'happy', -1],
  [27.4, 31.5, 900, 1290, 1.25, 'think', -1],
  [31.7, 36.8, 840, 1390, 0.95, 'happy', -1],
  [36.9, 41.6, 840, 1390, 0.95, 'happy', -1],
  [41.8, 45.2, 840, 1390, 0.95, 'think', -1],
  [45.3, 50.3, 850, 1290, 1.3, 'happy', -1],
];
function koriShow(a) {
  for (const [a0, a1, x, y, s, mood, fl] of KORI) {
    if (a < a0 - 0.02 || a > a1 + 0.35) continue;
    const pin = backOut(seg(a, a0, a0 + 0.5)), pout = 1 - ease(seg(a, a1, a1 + 0.3));
    const p = pin * pout, hop = Math.abs(Math.sin(a * 5)) * 8;
    koriMain.set(a, { x: x + (1 - pin) * 220, y: y - hop, s: s * Math.max(0.01, p), rot: (1 - pin) * -16, o: Math.min(1, p * 2), mood, wave: waveAt(a), flip: fl });
    return;
  }
  koriMain.set(a, { o: 0, s: 0.01 });
}

// ================================================================ ekspresi Raka
const N = 'netral';
const E = (e, over = {}) => raka(e, N, over);
const SMUG = E('senang', { happyEyes: 0.55, browL: { y: -7, rot: -8 }, browR: { y: -7, rot: 8 }, mouth: { w: 24, up: 5, lo: 12 }, tilt: -4 });   // percaya diri
const SHOCK = E('kaget', { wide: 1, yaw: 0.15 });
const PANIK = E('khawatir', { wide: 0.9, sweat: 1, tilt: 3, browL: { y: -10, rot: 18 }, browR: { y: -10, rot: -18 }, mouth: { w: 16, up: -6, lo: 22 } });
const BING = E('bingung', { blink: 0, wide: 0.25, gazeX: -0.7, browL: { y: -9, rot: 14 }, browR: { y: -2, rot: -6 }, mouth: { w: 12, up: 5, lo: 9 } });
const THINK = E('berpikir', { gazeX: 0.6, gazeY: -0.6 });
const LEGA = E('lega');
const HAPPY = E('senang');
const FOCUS = E('netral', { browL: { y: 1, rot: -6 }, browR: { y: 1, rot: 6 }, mouth: { w: 12, up: 3, lo: 3 }, gazeY: 0.5 });

// ================================================================ dunia: ruang ujian FK
const EXFLOOR = 1290;
function ruangUjian(t, { dim = 0 } = {}) {
  let s = rect(0, 0, W, EXFLOOR, '#E7EDF1') + rect(0, 830, W, EXFLOOR - 830, '#D5DEE5') + rect(0, 826, W, 8, 'rgba(255,255,255,.7)');
  // jendela besar (kiri), papan "UJIAN" di dinding, jam dinding
  s += rect(50, 280, 300, 400, '#fff', 20) + rect(66, 296, 268, 368, '#CFE8F3', 12) + rect(196, 296, 8, 368, '#fff') + rect(66, 470, 268, 8, '#fff') + circ(260, 400, 38, '#FFE9A0', 'opacity=".8"');
  s += rect(400, 300, 280, 150, '#2F6B5E', 14) + rect(412, 312, 256, 126, '#3B8070', 8) + txt('UJIAN', 540, 400, { size: 70, fill: '#E9F7EF' });
  s += circ(860, 340, 66, '#2B3646') + circ(860, 340, 56, '#F6F1E3');
  for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6; s += `<line x1="${r1(860 + Math.sin(an) * 44)}" y1="${r1(340 - Math.cos(an) * 44)}" x2="${r1(860 + Math.sin(an) * 51)}" y2="${r1(340 - Math.cos(an) * 51)}" stroke="#2B3646" stroke-width="4" stroke-linecap="round"/>`; }
  s += `<line x1="860" y1="340" x2="860" y2="300" stroke="#2B3646" stroke-width="6" stroke-linecap="round"/><line x1="860" y1="340" x2="885" y2="352" stroke="#2B3646" stroke-width="6" stroke-linecap="round"/>` + circ(860, 340, 6, '#D9382F');
  // lantai
  s += rect(0, EXFLOOR, W, H - EXFLOOR, '#BBA787') + rect(0, EXFLOOR - 6, W, 12, '#8E7C5E');
  for (let i = 0; i < 6; i++) s += rect(0, EXFLOOR + 40 + i * 70, W, 4, 'rgba(0,0,0,.1)');
  return s;
}
// peserta ujian lain di belakang: tenang mengerjakan (kontras dengan Raka)
function pesertaLain(t) {
  const lk = [[LOOKS.perawat, 190, 760, 0.55, 'fokus'], [LOOKS.dokterPria, 540, 760, 0.55, 'fokus'], [LOOKS.ibu, 890, 760, 0.55, 'netral'], [LOOKS.dosen, 330, 930, 0.7, 'fokus'], [LOOKS.perawat, 760, 930, 0.7, 'netral']];
  let s = '';
  lk.forEach(([look, x, dy, sc, ex], i) => {
    const st = idleOrang(orang(ex, 'berdiri', { yaw: i % 2 ? -0.2 : 0.2, headDown: 8 }), t, i * 0.9);
    s += `<g transform="translate(${r1(x - 200 * sc)} ${r1(dy - 580 * sc)}) scale(${sc})">${orangSvg(st, look, { bare: true, shadow: false, legs: false, uid: 'ps' + i })}</g>`;
    s += rect(x - 150 * sc * 1.3, dy - 4, 300 * sc * 1.3, 30 * sc * 1.6, '#C9A472', 8) + rect(x - 150 * sc * 1.3, dy + 22, 300 * sc * 1.3, 90 * sc, '#A98655', 6);
  });
  return s;
}
const RX = 540, RDESK = 1190;
const raUjian = (st, extra = '') => `<g transform="translate(${r1(RX - 200 * 1.2)} ${r1(RDESK - 580 * 1.2)}) scale(1.2)">${rakaSvg(st, { bare: true, shadow: false, uid: 'rkU', outfit: 'kuliah', ransel: false })}</g>` + extra;
const mejaRaka = () => rect(60, RDESK, 960, 56, '#C9A472') + rect(60, RDESK + 56, 960, 340, '#A98655') + rect(60, RDESK + 44, 960, 12, 'rgba(0,0,0,.14)');
/** Lembar soal di atas meja (tampak miring dari depan): judul dan blok isi tanpa teks soal asli. */
function lembar(x, y, s = 1, rot = 0, o = 1) {
  let p = rect(-210, -150, 420, 300, '#FFFDF6', 10, 'stroke="#D6CFB8" stroke-width="4"') + rect(-180, -120, 200, 26, '#2F6B5E', 6) + txt('SOAL', 118, -100, { size: 30, fill: '#2F6B5E', anchor: 'middle' });
  for (let i = 0; i < 3; i++) p += rect(-180, -70 + i * 26, 300 - i * 30, 12, '#C9C3AE', 6);
  ['A', 'B', 'C', 'D'].forEach((l, i) => { p += circ(-160, 24 + i * 32, 12, 'none', 'stroke="#2F6B5E" stroke-width="4"') + rect(-130, 18 + i * 32, 180 + (i % 2) * 60, 12, '#C9C3AE', 6); });
  return g(p, { x, y, s, r: rot, o });
}
/** Lembar ujian besar (zoom): susunan pertanyaan yang berbeda dari yang dihafal. */
function lembarBesar(a, t) {
  const k = ease(seg(a, 3.1, 3.55)) * (1 - ease(seg(a, 4.55, 4.9)));
  if (k <= 0.01) return '';
  const sx = lerp(0.85, 1, k);
  let p = rect(-400, -560, 800, 1120, '#FFFDF6', 28, 'stroke="#D6CFB8" stroke-width="8"') + rect(-340, -500, 460, 62, '#2F6B5E', 16) + txt('LEMBAR UJIAN', -110, -455, { size: 40, fill: '#E9F7EF' });
  const blocks = [[-340, -380, 640], [-340, -330, 560]];
  p += txt('1', -340, -250, { size: 70, fill: '#2F6B5E', anchor: 'start' });
  for (let i = 0; i < 4; i++) p += rect(-250, -285 + i * 36, 560 - i * 70, 20, '#C9C3AE', 10);
  ['A', 'B', 'C', 'D', 'E'].forEach((l, i) => { p += circ(-300, -90 + i * 92, 28, 'none', 'stroke="#2F6B5E" stroke-width="7"') + txt(l, -300, -90 + i * 92 + 14, { size: 36, fill: '#2F6B5E' }) + rect(-250, -100 + i * 92, 360 + ((i * 53) % 190), 22, '#C9C3AE', 11); });
  p += txt('2', -340, 390, { size: 70, fill: '#2F6B5E', anchor: 'start' });
  for (let i = 0; i < 3; i++) p += rect(-250, 355 + i * 36, 540 - i * 90, 20, '#C9C3AE', 10);
  return g(p, { x: 540, y: 880, s: sx * 0.92, o: k });
}

// ---------- adegan A: hook, ruang ujian
function sceneUjianHook(a, t) {
  const open = ease(seg(a, 2.7, 3.2));
  const st0 = holdKeys(a, [[0, SMUG], [2.6, SMUG], [3.3, E('netral', { gazeY: 0.9, browL: { y: -3, rot: 0 }, browR: { y: -3, rot: 0 }, mouth: { w: 14, up: 5, lo: 8 } })], [4.75, E('netral', { gazeY: 0.9 })], [4.95, SHOCK], [5.6, PANIK], [6.4, PANIK]]);
  const st = JSON.parse(JSON.stringify(idle(st0, t)));
  const dz = ease(seg(a, 5.9, 6.4)); st.dizzy = dz; st.dizzyT = t * 1.6;
  const shake = a > 5.4 && a < 7.0 ? Math.sin(a * 38) * 5 : 0;
  let s = ruangUjian(t) + pesertaLain(t);
  s += `<g transform="translate(${r1(shake)} 0)">` + raUjian(st) + `</g>`;
  s += mejaRaka();
  s += lembar(540, RDESK + 6 - open * 120, 0.55 + open * 0.2, -4 * (1 - open) + 2, 1);
  // huruf yang dihafal terbang dari kepala (5,5 - 7,1)
  [['A', '#F8C038', -150, -190], ['C', '#9DE0BD', 140, -250], ['B', '#F29B8A', 10, -330]].forEach(([l, col, dx, dy], i) => {
    const u = seg(a, 5.55 + i * 0.25, 5.55 + i * 0.25 + 1.5); if (u <= 0 || u >= 1) return;
    const e = easeOut(u);
    s += g(circ(0, 0, 44, col, 'stroke="#fff" stroke-width="6"') + txt(l, 0, 16, { size: 52, fill: '#0A3830' }), { x: 540 + dx * e * 1.4, y: 640 + dy * e, r: (i - 1) * 30 * u, o: Math.min(1, u * 5) * (1 - ease(seg(u, 0.7, 1))) });
  });
  const q = ease(seg(a, 6.2, 6.6)) * (1 - ease(seg(a, 7.0, 7.3)));
  if (q > 0.01) for (let i = 0; i < 3; i++) s += g(txt('?!', 0, 0, { size: 110 - i * 14, fill: '#E8665F', extra: 'stroke="#fff" stroke-width="10" paint-order="stroke"' }), { x: 270 + i * 270, y: 560 + Math.sin(t * 5 + i) * 10 - (i % 2) * 50, s: q, o: q, r: (i - 1) * 14 });
  const z = kf(a, [[0, 1.0], [2.8, 1.12], [4.8, 1.2], [6.0, 1.3]], easeInOut);
  s = cam(s, z, 540, 1000);
  s += lembarBesar(a, t);
  return s;
}

// ---------- adegan: kamar malam / hari
const MAX = 200;
function sceneKamar(a, t, { night = 1 } = {}) {
  // pembagian sudut kamera: lebar (meja), close-up wajah, layar laptop
  const camK = kf(a, [[11.9, [1.0, 540, 800]], [14.3, [1.0, 540, 800]], [14.9, [1.7, 540, 640]], [16.2, [1.7, 540, 640]], [16.7, [1.0, 540, 800]], [17.7, [1.0, 540, 800]], [18.3, [1.8, 800, 940]], [19.0, [1.8, 800, 940]], [19.4, [2.0, 540, 560]], [20.6, [2.2, 540, 560]]], easeInOut);
  const pt = a > 14.45 && a < 16.35 ? 1 : 0;
  const st0 = holdKeys(a, [[11.9, SMUG], [14.3, SMUG], [14.5, E('senang', { happyEyes: 0.3, armR: { wx: 330, wy: 330, ex: 345, ey: 410, finger: 1, fa: -60, front: 1 }, tilt: -4 })], [16.4, E('senang', { happyEyes: 0.3, armR: { wx: 330, wy: 330, ex: 345, ey: 410, finger: 1, fa: -60, front: 1 }, tilt: -4 })], [16.7, SMUG], [18.1, THINK], [18.9, THINK], [19.1, E('senang', { happyEyes: 1, armR: { wx: 262, wy: 300, ex: 320, ey: 360, finger: 0, front: 1 } })]]);
  const st = idle(st0, t);
  let s = kos(t, { day: night ? 0 : 1, time: a < 15 ? '21:40' : a < 19 ? '23:15' : '01:20', lamp: 1 });
  s += rakaDesk(st, { uid: 'rkK', outfit: 'rumah' });
  // kumpulan soal kakak tingkat (folder + tumpukan) dan laptop berisi daftar jawaban hafalan
  s += folder(90, DESK_Y - 150, 200, 135, '#E8665F', 'KAKAK TINGKAT') + paperStack(150, DESK_Y - 12, 6, { w: 230, h: 12 });
  const lap = rect(640, DESK_Y - 250, 360, 230, '#2A3446', 20) + rect(654, DESK_Y - 236, 332, 202, '#F4F1E8', 10) + txt('1 · A', 700, DESK_Y - 170, { size: 46, fill: '#2F6B5E', anchor: 'start' }) + txt('2 · C', 700, DESK_Y - 115, { size: 46, fill: '#2F6B5E', anchor: 'start' }) + txt('3 · B', 700, DESK_Y - 60, { size: 46, fill: '#2F6B5E', anchor: 'start' }) + rect(610, DESK_Y - 20, 420, 22, '#3A455B', 11);
  s += lap + deskFront();
  // tag jawaban melayang saat disebut
  [['1 → A', 14.45, 16.5, '#F8C038', 340, 470], ['2 → C', 16.65, 18.3, '#9DE0BD', 760, 470]].forEach(([l, a0, a1, col, x, y]) => {
    const k = backOut(seg(a, a0, a0 + 0.35)) * (1 - ease(seg(a, a1, a1 + 0.3)));
    if (k > 0.01) s += g(rect(-120, -50, 240, 100, col, 30, 'stroke="#fff" stroke-width="6"') + txt(l, 0, 24, { size: 62, fill: '#0A3830' }), { x, y, s: k, o: Math.min(1, k * 2), r: -5 });
  });
  // pikiran: "nomor tiga…" lalu hafal di luar kepala
  const th = ease(seg(a, 18.1, 18.4)) * (1 - ease(seg(a, 18.9, 19.1)));
  if (th > 0.01) s += g(rect(-100, -60, 200, 120, '#fff', 60) + txt('3 …', 0, 26, { size: 68, fill: '#0A3830' }), { x: 700, y: 640, s: th, o: th });
  const gl = ease(seg(a, 19.1, 19.6)) * (1 - ease(seg(a, 20.3, 20.7)));
  if (gl > 0.01) for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 + t; s += `<path d="M${r1(540 + Math.cos(an) * 250)} ${r1(520 + Math.sin(an) * 250)}l${r1(Math.cos(an) * 46)} ${r1(Math.sin(an) * 46)}" stroke="#F8C038" stroke-width="12" stroke-linecap="round" opacity="${r1(gl)}"/>`; }
  return cam(s, camK[0], camK[1], camK[2]);
}

// ---------- adegan: ruang ujian keesokan hari (bingung), lalu menyadari
function sceneUjianBingung(a, t) {
  const st0 = holdKeys(a, [[20.8, SMUG], [22.4, SMUG], [23.45, E('netral', { gazeY: 0.9 })], [24.2, E('netral', { gazeY: 0.9 })], [24.5, BING], [26.2, BING], [27.4, E('netral', { gazeX: 0.5, gazeY: -0.3, browL: { y: -5, rot: 10 }, browR: { y: -5, rot: -10 } })], [29.4, E('berpikir', { gazeX: 0.5, gazeY: -0.5 })], [30.8, LEGA]]);
  const st = idle(st0, t);
  let s = ruangUjian(t) + pesertaLain(t);
  s += raUjian(st) + mejaRaka();
  const open = ease(seg(a, 23.0, 23.5));
  s += lembar(540, RDESK + 6 - open * 90, 0.55 + open * 0.2, -3, 1);
  // tanda tanya di atas kepala saat "Loh?!"
  const q = ease(seg(a, 24.5, 24.9)) * (1 - ease(seg(a, 26.7, 27.1)));
  if (q > 0.01) for (let i = 0; i < 4; i++) s += g(txt('?', 0, 0, { size: 120 - i * 10, fill: '#E8665F', extra: 'stroke="#fff" stroke-width="10" paint-order="stroke"' }), { x: 280 + i * 190, y: 540 + Math.sin(t * 4 + i) * 12 - (i % 2) * 60, s: q, o: q, r: (i - 1.5) * 12 });
  // lembar besar sebentar (23,5 - 24,4): reaksi bergantian dengan lembar
  const big = ease(seg(a, 23.55, 23.9)) * (1 - ease(seg(a, 24.3, 24.6)));
  // huruf hafalan berubah jadi tanda tanya (27,5 - 30)
  [['A', 330, 560], ['B', 540, 470], ['C', 750, 560]].forEach(([l, x, y], i) => {
    const k = ease(seg(a, 27.4 + i * 0.3, 27.9 + i * 0.3)) * (1 - ease(seg(a, 30.6, 31.0)));
    if (k <= 0.01) return;
    const turn = ease(seg(a, 28.4 + i * 0.3, 29.1 + i * 0.3));
    const face = turn < 0.5 ? txt(l, 0, 24, { size: 70, fill: '#0A3830' }) : txt('?', 0, 24, { size: 76, fill: '#E8665F' });
    s += g(circ(0, 0, 54, turn < 0.5 ? ['#F8C038', '#9DE0BD', '#F29B8A'][i] : '#fff', 'stroke="#fff" stroke-width="7"') + face, { x, y: y + Math.sin(t * 3 + i) * 10, sx: Math.abs(Math.cos(turn * Math.PI)) * 0.6 + 0.4, sy: 1, o: k });
  });
  s = cam(s, lerp(1.0, 1.1, ease(seg(a, 20.8, 27))), 540, 1000);
  if (big > 0.01) s += g(rect(-300, -260, 600, 520, '#FFFDF6', 22, 'stroke="#D6CFB8" stroke-width="6"') + rect(-250, -210, 360, 42, '#2F6B5E', 12) + [0, 1, 2].map((i) => rect(-250, -130 + i * 34, 500 - i * 80, 16, '#C9C3AE', 8)).join('') + qmark(160, 130, 190), { x: 540, y: 880, s: 0.7 + 0.3 * big, o: big });
  return s;
}
const qmark = (x, y, sz) => txt('?', x, y, { size: sz, fill: '#E8665F', extra: 'stroke="#fff" stroke-width="10" paint-order="stroke"' });

// ---------- adegan: laptop dengan rekaman web asli (materi, latihan, flashcard)
function sceneLaptop(a, t) {
  let st;
  if (a < 36.7) st = holdKeys(a, [[31.8, FOCUS], [34.4, FOCUS], [35.0, E('senang', { happyEyes: 0.3, gazeY: -0.2 })]]);
  else if (a < 41.66) st = holdKeys(a, [[36.7, FOCUS], [38.9, FOCUS], [39.3, HAPPY], [41.0, HAPPY]]);
  else st = holdKeys(a, [[41.7, THINK], [43.0, THINK], [43.6, E('senang', { happyEyes: 0.6 })], [44.8, HAPPY]]);
  const base = idle(st, t);
  let s = rect(0, 0, W, H, '#EAF3E8') + circ(900, 330, 280, '#DDEBD8') + circ(100, 1500, 300, '#DDEBD8') + laptopFrame();
  const sc = 0.8, bx = 300, by = 1475;
  s += `<g transform="translate(${r1(bx - 200 * sc)} ${r1(by - 580 * sc)}) scale(${sc})">${rakaSvg(base, { bare: true, shadow: false, uid: 'rkL', outfit: 'rumah' })}</g>`;
  s += rect(0, 1385, W, H - 1385, '#8A6240') + rect(0, 1385, W, 14, '#A57A52');
  // bola lampu muncul saat Raka menghubungkan konsep dengan soal (materi, 35,0)
  const bk = ease(seg(a, 35.0, 35.4)) * (1 - ease(seg(a, 36.3, 36.7)));
  if (bk > 0.01) s += g(`<path d="M0 -34a30 30 0 1 1 0.1 0Z" fill="#F8C038"/>` + rect(-14, 0, 28, 14, '#E0A91F', 4) + [0, 1, 2, 3, 4].map((i) => `<path d="M${r1(Math.cos(-0.4 - i * 0.6) * 52)} ${r1(Math.sin(-0.4 - i * 0.6) * 52 - 20)}l${r1(Math.cos(-0.4 - i * 0.6) * 18)} ${r1(Math.sin(-0.4 - i * 0.6) * 18)}" stroke="#F8C038" stroke-width="8" stroke-linecap="round"/>`).join(''), { x: 330, y: 1010, s: bk * 1.2, o: bk });
  return s;
}

// ---------- adegan: solusi (Kori, logo, cuplikan web asli)
function sceneSolusi(a, t) {
  let s = rect(0, 0, W, H, '#F4F1E8') + circ(900, 300, 280, '#EAF3E0') + circ(120, 1500, 300, '#EAF3E0');
  for (let i = 0; i < 10; i++) s += circ(80 + ((i * 197) % 920), 260 + ((i * 331) % 1200), 14 + (i % 3) * 8, '#9DE0BD', 'opacity=".5"');
  const lk = backOut(seg(a, 7.7, 8.25)), out = 1 - ease(seg(a, 11.2, 11.5));
  s += `<g transform="translate(${r1(540)} 340) scale(${r1(lk * 0.8)}) translate(-540 -340)" opacity="${r1(Math.min(1, lk * 2) * out * 100) / 100}"><image href="logo-full.webp" x="240" y="270" width="600" height="140" preserveAspectRatio="xMidYMid meet"/></g>`;
  s += g(laptopFrame(), { o: ease(seg(a, 8.0, 8.4)) * out });
  return s;
}

// ---------- peralihan waktu: jam berputar mundur (kembali ke malam sebelumnya) atau maju (besoknya)
function warp(a, a0, a1, dir, label, col) {
  const u = seg(a, a0, a1); if (u <= 0 || u >= 1) return '';
  const o = Math.min(ease(seg(u, 0, 0.25)), 1 - ease(seg(u, 0.7, 1)));
  const rot = dir * easeInOut(u) * 720;
  let s = rect(0, 0, W, H, col, 0, `opacity="${r1(o * 0.92 * 100) / 100}"`);
  const inner = circ(0, 0, 250, '#F6F1E3', 'stroke="#2B3646" stroke-width="16"') + Array.from({ length: 12 }, (_, i) => { const an = i * Math.PI / 6; return `<line x1="${r1(Math.sin(an) * 200)}" y1="${r1(-Math.cos(an) * 200)}" x2="${r1(Math.sin(an) * 228)}" y2="${r1(-Math.cos(an) * 228)}" stroke="#2B3646" stroke-width="10" stroke-linecap="round"/>`; }).join('')
    + `<g transform="rotate(${r1(rot)})"><line x1="0" y1="0" x2="0" y2="-170" stroke="#2B3646" stroke-width="16" stroke-linecap="round"/></g><g transform="rotate(${r1(rot / 12)})"><line x1="0" y1="0" x2="110" y2="0" stroke="#2B3646" stroke-width="20" stroke-linecap="round"/></g>` + circ(0, 0, 14, '#D9382F');
  s += g(inner, { x: 540, y: 880, s: 0.7 + 0.3 * o, o });
  s += g(`<path d="M${dir < 0 ? -330 : 330} -280a360 360 0 0 ${dir < 0 ? 0 : 1} ${dir < 0 ? 100 : -100} 560" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round" opacity=".8"/>`, { x: 540, y: 880, o });
  return s;
}

// ================================================================ kartu akhir
const popCss = (d, k, dy = 24) => { const kk = backOut(k); d.style.opacity = clamp(k * 4, 0, 1); d.style.transform = `scale(${lerp(0.85, 1, kk).toFixed(3)}) translateY(${lerp(dy, 0, clamp(kk, 0, 1)).toFixed(1)}px)`; };
$('er1').textContent = 'BELAJAR KEDOKTERAN GRATIS'; $('er2').textContent = 'medcoel.com';
const endSvg = $('endsvg'); endSvg.innerHTML = '<g id="rakaEnd"></g>';
const koriEnd = mkKori(endSvg);
function updateEnd(a, t) {
  const endK = ease(seg(a, 50.0, 50.45));
  $('end').style.opacity = endK.toFixed(3);
  if (endK <= 0) return;
  const lk = backOut(seg(a, 50.1, 50.7)); const lg = $('elogo'); lg.style.transform = `scale(${lerp(0.7, 1, lk).toFixed(3)})`; lg.style.opacity = clamp((a - 50.05) / 0.3, 0, 1);
  popCss($('er1'), seg(a, 50.8, 51.25), 24); popCss($('er2'), seg(a, 52.6, 53.05), 24);
  const rk = clamp((a - 51.0) / 0.5, 0, 1);
  const rs = idle(raka('senang', 'sapa'), t); rs.armR = { ...rs.armR, wx: rs.armR.wx + Math.sin(a * 8) * 10 };
  $('rakaEnd').innerHTML = `<g transform="translate(300 1500) scale(${(0.88 * backOut(rk)).toFixed(3)}) translate(-200 -778)" opacity="${rk}">${rakaSvg(rs, { bare: true, shadow: true, uid: 'endraka', outfit: 'harian' })}</g>`;
  const kr = backOut(clamp((a - 51.2) / 0.5, 0, 1));
  koriEnd.set(a, { x: 740, y: 1460, s: 1.8 * kr, o: kr, mood: 'happy', wave: waveAt(a) });
}

// ---------- penutup: Raka belajar lebih tenang bersama Kori
function scenePenutup(a, t) {
  const st = idle(holdKeys(a, [[45.0, E('lega')], [47.5, E('senang', { happyEyes: 0.4 })], [49.0, HAPPY]]), t);
  let s = rect(-100, -400, W + 200, 600, '#EBDAB8') + kos(t, { day: 1, time: '08:30', lamp: 0.2 });
  s += rakaDesk(st, { uid: 'rkP', outfit: 'rumah' });
  s += folder(90, DESK_Y - 150, 200, 135, '#00A383', 'MEDCOEL') + paperStack(150, DESK_Y - 12, 4, { w: 230, h: 12 }) + deskFront();
  return cam(s, lerp(1.0, 1.06, ease(seg(a, 45.0, 50.3))), 540, 900, 0, 130);
}

// ================================================================ render utama
const SCENES = [
  { a0: -1, a1: 7.4, fn: sceneUjianHook },
  { a0: 7.0, a1: 12.0, fn: sceneSolusi, f: [7.0, 7.2] },
  { a0: 11.4, a1: 20.9, fn: (a, t) => sceneKamar(a, t), f: [11.9, 12.0] },
  { a0: 20.4, a1: 31.8, fn: sceneUjianBingung, f: [20.9, 21.0] },
  { a0: 31.6, a1: 45.5, fn: sceneLaptop, f: [31.7, 31.9] },
  { a0: 45.0, a1: 50.4, fn: scenePenutup, f: [45.0, 45.2] },
];
window.renderFrame = async function (t) {
  const a = t - LEAD;
  let svg = '';
  SCENES.forEach((sc) => {
    if (a < sc.a0 || a > sc.a1) return;
    const o = sc.f ? ease(seg(a, sc.f[0], sc.f[1])) : 1;
    if (o <= 0.002) return;
    svg += o < 0.999 ? `<g opacity="${o.toFixed(3)}">${sc.fn(a, t)}</g>` : sc.fn(a, t);
  });
  svg += warp(a, 11.1, 12.3, -1, 'MALAM SEBELUM UJIAN', '#16304A') + warp(a, 20.1, 21.3, 1, 'BESOKNYA', '#F2B84B');
  camEl.innerHTML = svg;
  koriShow(a);
  await updateScreen(a);
  popEls(CHIPS, chipEls, a);
  updateCaption(a); updateEnd(a, t);
  $('fade').style.opacity = '0';
  window.__t = t;
};
window.__ready = true;
