// Panggung video "Kenapa kopi bikin kita nggak ngantuk?": renderFrame(t) deterministik. a = waktu audio narator asli, t = a + LEAD.
import { C, clamp, lerp, ease, easeOut, easeInOut, backOut, kf, win, seg, r1, rnd, g, rect, circ, txt, poly, cam } from './lib.js';
import { raka, rakaSvg, lerpState, idle } from '../../../brand/characters/raka/raka.js';
import { COL, adenosine, caffeine, receptor, dock, NEURON, neuronBg, sleepGauge, zzz, GI, giWorld, bodyMap } from './bio.js';
import { W, H, DESK_Y, rakaDesk, room, deskFront, mugOnDesk, laptopTasks, bookPile, ICON } from './world.js';

await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
const DATA = await (await fetch('data.json')).json();
const LEAD = DATA.lead, FPS = DATA.fps;
const $ = (id) => document.getElementById(id);
const camEl = $('cam'), fx = $('fx');
const envAt = (t) => DATA.env[clamp(Math.round(t * FPS), 0, DATA.env.length - 1)];
const fx0 = (s) => Math.round(s * 100) / 100;

// ================================================================ keadaan Raka
const MOUTH_TALK = false;
const SLEEPY = raka('netral', null, { blink: 0.6, browL: { y: 5, rot: -8 }, browR: { y: 5, rot: 8 }, mouth: { w: 12, up: 2, lo: 4 }, bags: 1, slump: 1, tilt: -5, lean: 2 });
const REACH = raka('netral', null, { blink: 0.5, browL: { y: 4, rot: -6 }, browR: { y: 4, rot: 6 }, mouth: { w: 12, up: 2, lo: 4 }, bags: 1, slump: 0.6, tilt: -3, lean: 4, armR: { wx: 394, wy: 536, ex: 360, ey: 500, finger: 0, fa: -90, front: 1, hold: 0, holdRot: 0 } });
const SIP = raka('netral', null, { blink: 1, happyEyes: 0.5, browL: { y: 0, rot: 0 }, browR: { y: 0, rot: 0 }, mouth: { w: 10, up: 4, lo: 4 }, bags: 0.6, tilt: -4, lean: 1, armR: { wx: 262, wy: 338, ex: 336, ey: 420, finger: 0, fa: -90, front: 1, hold: 1, holdRot: -24 } });
const HOLD = raka('netral', null, { wide: 0.9, browL: { y: -9, rot: 0 }, browR: { y: -9, rot: 0 }, mouth: { w: 17, up: 5, lo: 13 }, bags: 0.2, lean: 0, armR: { wx: 300, wy: 470, ex: 340, ey: 520, finger: 0, fa: -90, front: 1, hold: 1, holdRot: -4 }, sparkle: 1 });
const THINK = raka('berpikir', null, { wide: 0.5, bags: 0.2, armR: { wx: 300, wy: 470, ex: 340, ey: 520, finger: 0, fa: -90, front: 1, hold: 1, holdRot: -4 } });
const TIRED2 = raka('netral', null, { blink: 0.35, browL: { y: 2, rot: -4 }, browR: { y: 2, rot: 4 }, mouth: { w: 12, up: 4, lo: 5 }, bags: 0.8, slump: 0.6, armR: { wx: 300, wy: 470, ex: 340, ey: 520, finger: 0, fa: -90, front: 1, hold: 1, holdRot: -4 } });
const mix = (a, b, k) => lerpState(a, b, clamp(k, 0, 1));
const holdKeys = (a, keys) => { // keys: [[a, state], ...] -> lerp antar keadaan terdekat (easeInOut)
  if (a <= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) if (a <= keys[i + 1][0]) return mix(keys[i][1], keys[i + 1][1], ease((a - keys[i][0]) / (keys[i + 1][0] - keys[i][0])));
  return keys[keys.length - 1][1];
};
function sipArc(a, a0) { // satu rangkaian: raih cangkir -> angkat -> minum -> turunkan; mengembalikan keadaan relatif a0
  return holdKeys(a, [[a0, SLEEPY], [a0 + 0.35, REACH], [a0 + 0.8, mix(REACH, SIP, 0.0)], [a0 + 1.35, SIP], [a0 + 2.2, SIP], [a0 + 2.75, HOLD]]);
}
function rkState(a, t, key) { return idle(key, t); }

// ================================================================ teks layar
const hookHost = $('hook'), chipHost = $('chips'), legHost = $('legends');
const mkEl = (host, cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; d.style.display = 'none'; host.appendChild(d); return d; };
const MOL = {
  aden: `<span class="ic"><svg viewBox="-60 -60 150 150"><g transform="translate(0 0) scale(.95)"><polygon points="30,0 15,26 -15,26 -30,0 -15,-26 15,-26" fill="${COL.aden}" stroke="${COL.aden}" stroke-width="10" stroke-linejoin="round"/><circle cx="46" cy="58" r="19" fill="${COL.adenD}"/></g></svg></span>`,
  caf: `<span class="ic"><svg viewBox="-70 -60 150 150"><polygon points="30,0 15,26 -15,26 -30,0 -15,-26 15,-26" fill="${COL.caf}" stroke="${COL.caf}" stroke-width="10" stroke-linejoin="round"/><circle cx="-50" cy="0" r="12" fill="${COL.cafBump}"/><circle cx="26" cy="50" r="12" fill="${COL.cafBump}"/></svg></span>`,
};
const HOOK = [{ a0: 0.15, a1: 6.6, cls: 'hk red big', html: 'KOK KOPI BIKIN<br>NGGAK NGANTUK?' }];
const hookEls = HOOK.map((h) => { const d = mkEl(hookHost, h.cls, h.html); d.style.whiteSpace = 'normal'; return d; });
const CHIPS = [
  { a0: 7.44, a1: 11.8, cls: 'violet', html: `${MOL.aden}<span>ADENOSIN</span>` },
  { a0: 12.09, a1: 15.9, cls: '', html: 'Membantu membangun<br>dorongan tidur' },
  { a0: 16.27, a1: 20.5, cls: 'warn', html: 'Makin lama terjaga,<br>dorongan tidur makin besar' },
  { a0: 20.93, a1: 25.8, cls: '', html: 'Mata terasa berat' },
  { a0: 28.27, a1: 30.1, cls: 'orange', html: `${MOL.caf}<span>KAFEIN dalam kopi</span>` },
  { a0: 30.38, a1: 31.5, cls: 'big', html: 'SALURAN PENCERNAAN' },
  { a0: 31.77, a1: 32.95, cls: 'big', html: 'ALIRAN DARAH' },
  { a0: 33.19, a1: 35.6, cls: 'big', html: 'OTAK' },
  { a0: 38.64, a1: 46.3, cls: 'big', html: '<span>KAFEIN <em>MENGHALANGI</em> KERJA ADENOSIN</span>' },
  { a0: 46.61, a1: 50.9, cls: 'green', html: 'Lebih terjaga' },
  { a0: 51.5, a1: 56.4, cls: 'red big', html: 'LEBIH TERJAGA ≠<br>SUDAH CUKUP TIDUR' },
  { a0: 56.5, a1: 59.9, cls: 'warn', html: 'Waspada untuk sementara' },
  { a0: 60.15, a1: 62.3, cls: 'big', html: '<span>Tidak menggantikan <em>tidur</em></span>' },
  { a0: 62.4, a1: 70.0, cls: 'big', html: 'PENELITIAN' },
  { a0: 70.02, a1: 74.4, cls: 'warn', html: 'Tidak semua kemampuan membaik' },
  { a0: 79.4, a1: 82.45, cls: 'big', html: '<span>KOPI BOLEH.<br>ISTIRAHAT <em>TETAP PERLU.</em></span>' },
];
const chipEls = CHIPS.map((c) => mkEl(chipHost, 'chip ' + c.cls, c.html));
const LEGS = [
  { a0: 8.9, a1: 9.6, x: 380, y: 870, cls: 'violet', html: 'Adenosin' },
  { a0: 9.4, a1: 12, x: 60, y: 905, cls: 'blue', html: 'Reseptor' },
  { a0: 36.3, a1: 37.6, x: 130, y: 540, cls: 'orange', html: 'Kafein' },
  { a0: 37.0, a1: 41.7, x: 520, y: 905, cls: 'blue', html: 'Reseptor' },
];
const legEls = LEGS.map((l) => { const d = mkEl(legHost, 'legend ' + l.cls, l.html); d.style.left = l.x + 'px'; d.style.top = l.y + 'px'; d.style.background = { violet: '#6F4CC4', blue: '#2A57B2', orange: '#F5941F' }[l.cls]; if (l.cls === 'orange') d.style.color = '#2A1600'; return d; });
function popEls(list, els, a, flexIfLaw) {
  list.forEach((c, i) => {
    const d = els[i], on = a >= c.a0 && a <= c.a1 + 0.2;
    if (!on) { d.style.display = 'none'; return; }
    d.style.display = d.classList.contains('legend') ? 'block' : d.classList.contains('hk') ? 'block' : 'inline-flex';
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

// ================================================================ ruang kamar
function mugState(a) { return true; }
function roomScene(a, t, key, o = {}) {
  const hold = key.armR && key.armR.hold > 0.5;
  const lamp = o.lamp ?? 1;
  let s = room(t, { lamp, time: o.time || '23:10', dim: o.dim || 0, bedFocus: o.bedFocus || 0 });
  s += laptopTasks(8, t, o.laptop ?? 1);
  if (!hold && !o.noMug) s += mugOnDesk(800, t, 1);
  s += rakaDesk(key, { uid: 'rk' + (o.uid || '') });
  s += deskFront(t);
  return s;
}
function sceneHook(a, t) {
  const key = rkState(a, t, sipArc(a, 1.0));
  // 0..1.0 mengantuk: kepala terkulai bergoyang dan mata berat
  const nod = a < 1.4 ? Math.sin(a * 2.2) * 3 : 0;
  if (a < 1.4) { key.tilt += nod; key.bob = (key.bob || 0) + Math.max(0, Math.sin(a * 2.2)) * 4; }
  const z = kf(a, [[4.6, 1], [6.9, 7]], easeInOut);
  const sceneStr = roomScene(a, t, key, { time: a < 4.5 ? '23:10' : '23:10', uid: 'h' });
  let s = cam(sceneStr, z, 540, 640, 0, 0);
  if (a < 3.0 && a > 2.7) s += '';
  // percikan "ding" saat mata terbuka
  return s;
}
function sceneRoom2(a, t) {   // 26.19 - 28.3: minum kopi lagi, kamera mendekat ke cangkir
  const key = rkState(a, t, sipArc(a, 26.19));
  const z = kf(a, [[27.4, 1], [28.4, 1.9]], easeInOut);
  return cam(roomScene(a, t, key, { uid: 'r2' }), z, 640, 780);
}

// ================================================================ otak -> neuron
function brainFull(a, t) {
  const k = kf(a, [[6.1, 0.7], [7.8, 2.2]], easeInOut);
  let s = rect(-40, -40, 1160, 2000, '#1A1440');
  const brain = `<path d="M300 560C230 430 340 300 480 330C560 270 690 300 720 400C830 400 880 540 800 640C830 740 740 820 640 800C580 860 460 850 420 780C330 800 230 700 300 560Z" fill="#F29BB0"/>`
    + `<path d="M540 340V780M380 470q70 20 30 100M690 450q-70 30 -20 110M420 660q60 -20 90 30M600 650q50 -40 100 10" stroke="#D97592" stroke-width="12" fill="none" stroke-linecap="round"/>`;
  s += g(brain, { x: 540, y: 600, s: k, ox: 540, oy: 580 });
  return s;
}
function neuronBase(a, t) { return neuronBg(t); }
// kondisi pengikatan per reseptor di S2: [waktu terbang mulai, waktu menempel]
const S2_BIND = [[9.6, 10.6], [12.8, 13.7], [17.1, 17.9], [20.6, 21.4]];
const FREE_AT = [11.0, 13.2, 15.0, 16.8, 18.4, 19.6, 20.8, 22.0];
const Z1 = 1.22;
function sceneNeuron1(a, t) {
  const my = NEURON.memY, xs = NEURON.xs;
  const zoomIn = kf(a, [[6.9, 1.7], [8.2, 1]], easeOut);
  let s = neuronBg(t);
  // reseptor (digambar sebelum molekul agar molekul menempel di takiknya)
  const bound = S2_BIND.map(([f, d]) => ease(seg(a, d, d + 0.25)));
  xs.forEach((x, i) => { s += receptor(x, my, 1, 1, bound[i] * (0.7 + 0.3 * Math.sin(t * 5 + i)), COL.aden); });
  // adenosin utama: muncul di tengah lalu terbang ke reseptor 0; sisanya menyusul
  const first = backOut(seg(a, 8.79, 9.3));
  S2_BIND.forEach(([f, d], i) => {
    const [dx, dy] = dock(xs[i], my, 1);
    const sx = i === 0 ? 480 : 150 + i * 220 + Math.sin(i) * 40, sy = i === 0 ? 760 : 700 + (i % 2) * 90;
    const appear = i === 0 ? first : backOut(seg(a, f - 0.5, f));
    if (appear <= 0) return;
    const u = easeInOut(seg(a, f, d));
    const bobx = Math.sin(t * 1.6 + i * 2) * 14 * (1 - u), boby = Math.cos(t * 1.3 + i) * 12 * (1 - u);
    const px = lerp(sx + bobx, dx, u), py = lerp(sy + boby, dy - 10, u);
    s += adenosine(px, py, lerp(1.15 * (i === 0 ? 1.6 : 1), 0.8, u) * appear, lerp(Math.sin(t + i) * 18, 0, u), Math.min(1, appear * 1.2), bound[i]);
    if (bound[i] > 0.5) s += zzz(dx, dy - 90, t + i, bound[i], 1);
  });
  // adenosin bebas yang makin ramai
  FREE_AT.forEach((f, i) => {
    const ap = backOut(seg(a, f, f + 0.4)); if (ap <= 0) return;
    const x = 120 + rnd(i + 20) * 840 + Math.sin(t * 0.9 + i * 1.7) * 36, y = 660 + rnd(i + 40) * 280 + Math.cos(t * 1.1 + i) * 26;
    s += adenosine(x, y, 0.75 * ap, Math.sin(t * 0.8 + i) * 30, 0.95 * ap);
  });
  // gauge dorongan tidur + wajah Raka yang makin berat kelopaknya
  const gk = kf(a, [[12.0, 0.1], [13.8, 0.3], [18.0, 0.55], [20.5, 0.8], [23, 0.9], [25.7, 0.95]], (u) => u);
  const gOn = ease(seg(a, 12.0, 12.4)) * (1 - ease(seg(a, 25.9, 26.2)));
  if (gOn > 0.01) s += g(sleepGauge(gk, t, { x: 60, y: 530, face: rakaHead(gk, t) }), { o: gOn, y: (1 - gOn) * -30 });
  return cam(s, zoomIn * Z1, 540, 1000);
}
const rakaHead = (fill, t) => (cx, cy) => {
  const st = idle(raka('netral', null, { blink: 0.1 + 0.72 * fill, browL: { y: 3 * fill, rot: -6 * fill }, browR: { y: 3 * fill, rot: 6 * fill }, bags: fill, mouth: { w: 12, up: 3, lo: 3 + 5 * fill } }), t);
  const id = 'ghc' + Math.round(cx * 10 + cy);
  return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="48"/></clipPath>` + circ(cx, cy, 52, '#F4EBD8')
    + `<g clip-path="url(#${id})"><g transform="translate(${cx} ${r1(cy + 16)}) scale(0.34) translate(-200 -232)">${rakaSvg(st, { bare: true, shadow: false, uid: 'gh' })}</g></g>`;
};

// ================================================================ perjalanan kafein
function sceneGI(a, t) {
  const camY = kf(a, [[28.27, 700], [29.3, 760], [30.38, 1600], [30.95, 2300], [31.3, 3250], [31.5, 3600], [31.95, 3640], [32.35, 4500], [33.19, 4500]], easeInOut);
  const camVel = (kf(a + 0.05, [[28.27, 700], [29.3, 760], [30.38, 1600], [30.95, 2300], [31.3, 3250], [31.5, 3600], [31.95, 3640], [32.35, 4500], [33.19, 4500]], easeInOut) - camY) / 0.05;
  let s = `<g transform="translate(0 ${r1(800 - camY)})">${giWorld(t, a, 0)}</g>`;
  // molekul kafein mengikuti kamera (menunggu lewat jalur): muncul dari kopi lalu menyebar
  const N = 6;
  for (let i = 0; i < N; i++) {
    const ap = backOut(seg(a, 28.3 + i * 0.12, 28.7 + i * 0.12));
    if (ap <= 0) continue;
    const spread = lerp(260, 120, ease(seg(a, 28.3, 30.0))) * (a > 31.5 ? lerp(1, 2.0, ease(seg(a, 31.5, 33))) : 1);
    const ang = i * 2.1 + t * 0.9, rr = spread * (0.35 + 0.6 * ((i * 0.37) % 1)) * 0.9;
    const lag = camVel * 0.045 * (0.5 + (i % 3) * 0.3);
    const x = 540 + Math.cos(ang) * rr * 0.9, y = 800 + Math.sin(ang * 1.2) * rr * 0.6 + lag;
    const cross = ease(seg(a, 31.55, 31.95)); s += caffeine(x, y + cross * 330 * (0.6 + (i % 3) * 0.2) * (1 - ease(seg(a, 32.0, 32.4))), 0.95 * ap, t * 30 + i * 40, 1, 0.6);
  }
  // penyerapan: beberapa molekul menembus dinding usus ke pembuluh (30.9 - 31.8)
  // pelacak lokasi di sisi kiri
  const stages = ['Kopi', 'Pencernaan', 'Darah', 'Otak'];
  const cur = a < 30.38 ? 0 : a < 31.77 ? 1 : a < 33.19 ? 2 : 3;
  const trk = ease(seg(a, 28.3, 28.7));
  s += `<g opacity="${r1(trk)}">` + rect(40, 560, 8, 330, 'rgba(255,255,255,.35)', 4);
  stages.forEach((nm, i) => { const y = 560 + i * 110; s += circ(44, y, i === cur ? 22 : 14, i <= cur ? COL.caf : 'rgba(255,255,255,.5)'); });
  s += '</g>';
  return s;
}
function sceneBody(a, t) {
  const k = kf(a, [[33.2, 0], [34.7, 1]], easeInOut);
  const zoom = kf(a, [[34.6, 1], [35.8, 4.5]], easeInOut);
  return cam(bodyMap(t, k, { glowBrain: ease(seg(a, 34.3, 34.8)) }), zoom, 540, 560);
}

// ================================================================ mekanisme kafein
const S4 = { caf: [[36.3, 37.2], [36.8, 37.7], [37.3, 38.2]], rec: [0, 1, 2] };
function sceneNeuron2(a, t) {
  const my = NEURON.memY, xs = NEURON.xs;
  const zoomIn = kf(a, [[34.9, 3.2], [36.0, 1]], easeOut);
  let s = neuronBg(t);
  const cafBound = S4.caf.map(([f, d]) => ease(seg(a, d, d + 0.2)));
  const adenBound = ease(seg(a, 40.6, 40.9));
  xs.forEach((x, i) => { s += receptor(x, my, 1, 1, (i < 3 ? cafBound[i] : adenBound) * 0.8, i < 3 ? COL.caf : COL.aden); });
  // kafein terbang dan menempel
  S4.caf.forEach(([f, d], i) => {
    const ap = backOut(seg(a, f - 0.6, f - 0.1)); if (ap <= 0) return;
    const [dx, dy] = dock(xs[i], my, 1);
    const sx = 250 + i * 130, sy = 660 + i * 30;
    const u = easeInOut(seg(a, f, d));
    const px = lerp(sx + Math.sin(t * 1.5 + i) * 14 * (1 - u), dx, u), py = lerp(sy + Math.cos(t * 1.3 + i) * 10 * (1 - u), dy - 10, u);
    s += caffeine(px, py, lerp(1.0, 0.8, u) * ap, lerp(Math.sin(t + i) * 20, 0, u), 1, cafBound[i] > 0.5 ? 1 : 0.4);
  });
  // adenosin berusaha menempel, terpental, tanda silang
  const tries = [[38.9, 39.35, 0], [39.6, 40.05, 1], [40.2, 40.65, 2]];
  tries.forEach(([f, hit, ri], i) => {
    const ap = ease(seg(a, f - 0.5, f - 0.2)) * (1 - ease(seg(a, hit + 1.0, hit + 1.4))); if (ap <= 0) return;
    const [dx, dy] = dock(xs[ri], my, 1);
    const sx = 260 + ri * 220, sy = 700;
    const u = seg(a, f, hit), back = seg(a, hit, hit + 0.8);
    const px = lerp(lerp(sx, dx + 40, easeIn2(u)), sx + 120, easeOut(back)), py = lerp(lerp(sy, dy - 70, easeIn2(u)), sy - 60, easeOut(back));
    s += adenosine(px, py, 0.85 * ap, Math.sin(t * 1.2 + i) * 22 + back * 60, ap);
    if (a > hit && a < hit + 0.9) s += g(ICON.cross(0, 0, 1), { x: dx + 6, y: dy - 56, s: backOut((a - hit) / 0.3) * (1 - ease(seg(a, hit + 0.6, hit + 0.9))), o: 1 });
  });
  // reseptor yang masih bebas menerima adenosin: sinyal kantuk tetap ada, hanya berkurang
  if (adenBound > 0.01) {
    const [dx, dy] = dock(xs[3], my, 1);
    s += adenosine(lerp(dx + 140, dx, easeInOut(seg(a, 40.0, 40.7))), lerp(dy - 160, dy - 10, easeInOut(seg(a, 40.0, 40.7))), 0.8, 0, 1, adenBound);
    s += zzz(dx, dy - 90, t, adenBound * 0.6, 0.8);
  } else if (a > 40.0) {
    const u = easeInOut(seg(a, 40.0, 40.7)), [dx, dy] = dock(xs[3], my, 1);
    s += adenosine(lerp(dx + 140, dx, u), lerp(dy - 160, dy - 10, u), 0.8, 0, 1);
  }
  // adenosin lain tetap melayang di latar
  for (let i = 0; i < 5; i++) { const x = 110 + rnd(i + 70) * 860 + Math.sin(t * 0.8 + i) * 30, y = 620 + rnd(i + 80) * 120 + Math.cos(t + i) * 20; s += adenosine(x, y, 0.55, Math.sin(t * 0.7 + i) * 30, 0.6); }
  // gauge sinyal kantuk berkurang (bukan hilang)
  const gk = kf(a, [[42.14, 0.9], [43.8, 0.9], [45.6, 0.52]], easeInOut);
  const gOn = ease(seg(a, 42.14, 42.5)) * (1 - ease(seg(a, 46.2, 46.5)));
  if (gOn > 0.01) s += g(sleepGauge(gk, t, { x: 60, y: 520, label: 'SINYAL KANTUK', face: rakaHead(gk, t) }), { o: gOn });
  return cam(s, zoomIn * Z1, 540, 1000);
}
const easeIn2 = (u) => u * u;


// ================================================================ kembali ke kamar
function sceneRoom3(a, t) {  // 46.61 - 62.4
  const dim = ease(seg(a, 50.9, 51.6)) * (1 - ease(seg(a, 61.9, 62.4))) * 0.9;
  const awake = clamp(seg(a, 46.6, 47.0), 0, 1);
  let key = a < 50.9 ? mix(HOLD, HOLD, 0) : a < 54.6 ? holdKeys(a, [[50.9, HOLD], [51.5, THINK]]) : holdKeys(a, [[54.6, THINK], [55.2, TIRED2], [56.6, HOLD], [59.8, TIRED2], [60.6, TIRED2]]);
  key = rkState(a, t, key);
  if (a > 54.65 && a < 56.1) { key = JSON.parse(JSON.stringify(key)); key.yaw = Math.sin((a - 54.65) * 9) * 0.5 * (1 - seg(a, 55.6, 56.1)); key.gazeX = key.yaw * 1.2; }
  let s = roomScene(a, t, key, { dim, lamp: 1 - dim * 0.6, uid: 'r3', bedFocus: ease(seg(a, 51.0, 51.8)) * (1 - ease(seg(a, 56.0, 56.5))) });
  // gelembung pikiran: tempat tidur + tanda tanya (50.9 - 56.4)
  const q = ease(seg(a, 50.95, 51.4)) * (1 - ease(seg(a, 55.9, 56.4)));
  if (q > 0.01) s += g(`<path d="M-190 -110Q-190 -190 -110 -190L110 -190Q190 -190 190 -110L190 40Q190 120 110 120L50 120L0 190L-30 120L-110 120Q-190 120 -190 40Z" fill="#fff"/>` + ICON.bed(-20, 0, 1.2) + ICON.qmark(110, 40, 0.8), { x: 800, y: 600, s: backOut(q) * 0.72, o: q });
  // 56.5 - 62.4: gelombang kewaspadaan yang sementara
  const w = ease(seg(a, 56.5, 56.9)) * (1 - ease(seg(a, 59.9, 60.3)));
  if (w > 0.01) {
    let curve = '';
    for (let x = 0; x <= 600; x += 12) { const u = x / 600, y = -Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.9) * (u < 0.62 ? 1 : 1) * 110 * Math.exp(-Math.max(0, u - 0.5) * 2.2) + 0; curve += (x ? 'L' : 'M') + x + ' ' + r1(y); }
    const draw = ease(seg(a, 56.8, 59.6));
    s += g(rect(-40, -170, 680, 220, 'rgba(10,8,40,.72)', 30) + `<path d="${curve}" fill="none" stroke="#9DE0BD" stroke-width="12" stroke-linecap="round" stroke-dasharray="1400" stroke-dashoffset="${r1(1400 * (1 - draw))}"/>`
      + txt('WASPADA', 20, -120, { size: 26, fill: '#9DE0BD', anchor: 'start', ls: 2 }) + txt('sementara', 600, 30, { size: 26, fill: '#CFC8FF', anchor: 'end' }), { x: 220, y: 560, o: w });
  }
  // 60.15: kopi bukan pengganti tidur
  const eq = backOut(seg(a, 60.2, 60.7)) * (1 - ease(seg(a, 61.9, 62.3)));
  if (eq > 0.01) s += g(rect(-300, -130, 600, 260, 'rgba(255,255,255,.95)', 40) + ICON.cup(-170, 0, 1.5) + txt('≠', 0, 36, { size: 130, fill: '#E8665F' }) + ICON.bed(170, 0, 1.4), { x: 540, y: 620, s: eq, o: Math.min(1, eq * 1.5) });
  return s;
}

// ================================================================ penelitian
function sceneStudy(a, t) {
  let s = rect(-40, -40, 1160, 2000, '#F7F2E4') + circ(960, 260, 240, '#EAF3E0') + circ(60, 1180, 260, '#EAF3E0');
  const x0 = 117, y0 = 560, pitch = 36, cols = 23, P2 = 29;
  const split = ease(seg(a, 65.43, 66.1));
  const out = 1 - ease(seg(a, 69.7, 70.1));       // titik dan kapsul memudar saat sumber ditampilkan
  const countUp = Math.round(276 * ease(seg(a, 62.4, 65.0)));
  let dots = '';
  for (let i = 0; i < countUp; i++) {
    const c = i % cols, r = Math.floor(i / cols), grp = i % 2;
    const k = Math.floor(i / 2);
    const tx = (grp === 0 ? 130 : 590) + (k % 12) * P2, ty = 600 + Math.floor(k / 12) * P2;
    dots += circ(lerp(x0 + c * pitch, tx, split), lerp(y0 + r * pitch, ty, split), 12, split > 0.5 ? (grp === 0 ? '#6BA3C4' : '#E8665F') : '#8FA9A0');
  }
  s += `<g opacity="${r1(out * 100) / 100}">` + dots;
  s += txt(String(countUp), 540, 500, { size: 120, fill: '#0A3830' });
  if (countUp > 200) s += txt('peserta', 760, 498, { size: 40, fill: '#4d6b66', anchor: 'start', weight: 700 }).replace('x="760"', `x="${countUp >= 276 ? 690 : 700}"`);
  const lab = ease(seg(a, 66.0, 66.5));
  if (lab > 0.01) {
    s += g(rect(-150, -30, 300, 54, '#6BA3C4', 27) + txt('Tidur di rumah', 0, 8, { size: 28, fill: '#fff' }), { x: 320, y: 566, o: lab });
    s += g(rect(-165, -30, 330, 54, '#E8665F', 27) + txt('Begadang di lab', 0, 8, { size: 28, fill: '#fff' }), { x: 760, y: 566, o: lab });
  }
  const cp = backOut(seg(a, 66.9, 67.5));
  if (cp > 0.01) s += g(ICON.capsule(-190, 0, 1.2, '#8A5A3B', '#C98B5E') + txt('200 mg kafein', -190, 76, { size: 28, fill: '#0A3830' }) + txt('atau', 0, 10, { size: 32, fill: '#4d6b66', weight: 700 }) + ICON.capsule(190, 0, 1.2, '#fff', '#E9E3D2') + txt('plasebo', 190, 76, { size: 28, fill: '#0A3830' }), { x: 540, y: 1010, s: cp, o: Math.min(1, cp * 1.6) });
  s += '</g>';
  const lift = ease(seg(a, 69.8, 70.3));
  const card = (y, ok, l1, l2, k) => k > 0.01 ? g(rect(-440, -72, 880, 144, '#fff', 34, 'stroke="#D9CFB4" stroke-width="3"') + (ok ? ICON.check(-380, 0, 1.0) : ICON.cross(-380, 0, 1.0)) + txt(l1, -330, -6, { size: 36, fill: '#0A3830', anchor: 'start' }) + txt(l2, -330, 40, { size: 27, fill: '#4d6b66', anchor: 'start', weight: 700 }), { x: 480, y, s: k, o: Math.min(1, k * 1.6) }) : '';
  s += card(lerp(1130, 580, lift), true, 'Perhatian berkelanjutan', 'kafein membantu setelah kurang tidur', backOut(seg(a, 68.2, 68.8)));
  s += card(lerp(1250, 740, lift), false, 'Mempertahankan urutan langkah', 'tidak berubah berarti pada sebagian besar peserta', backOut(seg(a, 70.3, 70.9)));
  return s;
}
const srcCard = $('src');
srcCard.innerHTML = `<b>SUMBER</b>Stepan ME, Altmann EM, Fenn KM. <i>Caffeine selectively mitigates cognitive deficits caused by sleep deprivation.</i> J Exp Psychol Learn Mem Cogn, 2021.<br>pubmed.ncbi.nlm.nih.gov/34014758`;

// ================================================================ penutup di kamar
function sceneRoom4(a, t) { // 74.52 - 82.6
  const toBed = ease(seg(a, 78.9, 79.6)), lid = 1 - ease(seg(a, 80.6, 81.4));
  const dim = ease(seg(a, 80.8, 82.0)) * 0.55;
  let key = holdKeys(a, [[74.5, TIRED2], [76.7, mix(HOLD, TIRED2, 0.5)], [79.0, TIRED2]]);
  key = rkState(a, t, key);
  key = JSON.parse(JSON.stringify(key));
  key.yaw = 0.95 * toBed; key.gazeX = 1.0 * toBed; key.tilt = (key.tilt || 0) + 3 * toBed;
  // mulai rileks setelah menutup laptop
  const relax = ease(seg(a, 81.3, 82.1));
  key.happyEyes = Math.max(key.happyEyes || 0, 0.5 * relax); key.mouth = { ...key.mouth, w: lerp(key.mouth.w, 16, relax), up: lerp(key.mouth.up, 5, relax), lo: lerp(key.mouth.lo, 8, relax) };
  let s = roomScene(a, t, key, { dim, lamp: 1 - ease(seg(a, 81.0, 82.2)) * 0.8, uid: 'r4', laptop: lid, bedFocus: toBed * (1 - ease(seg(a, 81.4, 82.2))) * 0.8, time: a > 81.0 ? '23:58' : '23:40' });
  return s;
}

// ================================================================ kartu akhir
const KORI_SVG = await (await fetch('kori.svg')).text();
const endSvg = $('endsvg');
endSvg.innerHTML = `<g id="rakaEnd"></g><g id="koriWrap"><g id="koriIn"></g></g>`;
const koriIn = $('koriIn');
koriIn.innerHTML = new DOMParser().parseFromString(KORI_SVG, 'image/svg+xml').documentElement.innerHTML;
const kq = (q) => koriIn.querySelector(q);
const K = { float: kq('.mc-float'), eyesN: kq('.mc-eyes-normal'), eyesH: kq('.mc-eyes-happy'), mN: kq('.mc-mouth-normal'), mH: kq('.mc-mouth-happy'), arm: kq('.mc-arm-right'), dots: [...koriIn.querySelectorAll('.mc-eyes > circle')] };
$('er1').textContent = 'Belajar bareng MEDCOEL';
$('er3').textContent = 'Gratis di medcoel.com';
$('esrc').innerHTML = 'Sumber penelitian: Stepan ME, Altmann EM, Fenn KM (2021). Caffeine selectively mitigates cognitive deficits caused by sleep deprivation. J Exp Psychol Learn Mem Cogn. PubMed 34014758.';
const popCss = (d, k, dy = 24) => { const kk = backOut(k); d.style.opacity = clamp(k * 4, 0, 1); d.style.transform = `scale(${lerp(0.85, 1, kk).toFixed(3)}) translateY(${lerp(dy, 0, clamp(kk, 0, 1)).toFixed(1)}px)`; };
function updateEnd(a, t) {
  const endK = ease(seg(a, 82.45, 82.85));
  $('end').style.opacity = endK.toFixed(3);
  if (endK <= 0) return;
  const lk = backOut(seg(a, 82.6, 83.2)); const lg = $('elogo'); lg.style.transform = `scale(${lerp(0.7, 1, lk).toFixed(3)})`; lg.style.opacity = clamp((a - 82.55) / 0.3, 0, 1);
  popCss($('er1'), seg(a, 84.8, 85.25), 24); popCss($('er3'), seg(a, 86.5, 86.95), 24);
  $('esrc').style.opacity = ease(seg(a, 85.5, 86.2));
  const rk = clamp((a - 83.0) / 0.5, 0, 1), kr = clamp((a - 83.3) / 0.5, 0, 1);
  const rs = idle(lerpState(raka('lega', 'sapa'), raka('senang', 'sapa'), 0.5 + 0.5 * Math.sin(a * 2)), t);
  rs.armR = { ...rs.armR, wx: rs.armR.wx + Math.sin(a * 8) * 10 };
  $('rakaEnd').innerHTML = `<g transform="translate(300 1560) scale(${(0.78 * backOut(rk)).toFixed(3)}) translate(-200 -778)" opacity="${rk}">${rakaSvg(rs, { bare: true, shadow: true, uid: 'endraka' })}</g>`;
  $('koriWrap').setAttribute('transform', `translate(640 1310) scale(${(1.5 * backOut(kr)).toFixed(3)})`); $('koriWrap').setAttribute('opacity', kr);
  K.float.setAttribute('transform', `translate(0 ${(Math.sin(a * 2.3) * 6).toFixed(1)})`);
  K.eyesN.setAttribute('opacity', 0); K.eyesH.setAttribute('opacity', 1); K.dots.forEach((c) => c.setAttribute('opacity', 0)); K.mN.setAttribute('opacity', 0); K.mH.setAttribute('opacity', 1);
  if (K.arm) K.arm.setAttribute('style', `transform-box:fill-box;transform-origin:10% 60%;transform:rotate(${(Math.sin(a * 9) * 16 - 10).toFixed(1)}deg)`);
}

// ================================================================ render utama
const SCENES = [
  { a0: -1, a1: 6.9, fn: sceneHook },
  { a0: 6.1, a1: 7.9, fn: brainFull },
  { a0: 7.0, a1: 26.3, fn: sceneNeuron1 },
  { a0: 26.0, a1: 28.6, fn: sceneRoom2 },
  { a0: 27.9, a1: 33.4, fn: sceneGI },
  { a0: 33.1, a1: 36.0, fn: sceneBody },
  { a0: 34.9, a1: 46.8, fn: sceneNeuron2 },
  { a0: 46.2, a1: 62.6, fn: sceneRoom3 },
  { a0: 62.2, a1: 74.7, fn: sceneStudy },
  { a0: 74.3, a1: 82.9, fn: sceneRoom4 },
];
// peralihan: tiap adegan fade-in sepanjang awalnya (kecuali yang pertama) di atas adegan sebelumnya
const FADE = { 1: [6.1, 6.9], 2: [7.0, 7.7], 3: [26.0, 26.4], 4: [27.9, 28.45], 5: [33.1, 33.5], 6: [34.9, 35.6], 7: [46.2, 46.8], 8: [62.2, 62.8], 9: [74.3, 74.9] };
window.renderFrame = function (t) {
  const a = t - LEAD;
  let svg = '';
  SCENES.forEach((sc, i) => {
    if (a < sc.a0 || a > sc.a1) return;
    const f = FADE[i];
    const o = f ? ease(seg(a, f[0], f[1])) : 1;
    const o2 = i + 1 < SCENES.length && FADE[i + 1] ? 1 : 1;
    if (o <= 0.002) return;
    svg += o < 0.999 ? `<g opacity="${o.toFixed(3)}">${sc.fn(a, t)}</g>` : sc.fn(a, t);
  });
  camEl.innerHTML = svg;
  popEls(HOOK, hookEls, a); popEls(CHIPS, chipEls, a); popEls(LEGS, legEls, a);
  srcCard.style.display = a >= 70.02 && a <= 74.5 ? 'block' : 'none';
  if (a >= 70.02 && a <= 74.5) srcCard.style.opacity = (ease(seg(a, 70.02, 70.4)) * (1 - ease(seg(a, 74.2, 74.5)))).toFixed(3);
  updateCaption(a); updateEnd(a, t);
  $('fade').style.opacity = '0';
  window.__t = t;
};
fx.innerHTML = '';
window.__ready = true;
