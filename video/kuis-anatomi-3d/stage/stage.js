// Panggung video "Semalaman hafal anatomi, begitu lihat kadaver langsung lupa?": renderFrame(t) deterministik. a = waktu audio narator asli, t = a + LEAD.
// Bagian rekaman kuis (a 9,6 - 40,6) memakai bingkai tangkapan layar aplikasi MEDCOEL asli dari record/rec.cjs (stage/media/quiz).
import { C, clamp, lerp, ease, easeOut, easeInOut, backOut, kf, win, seg, r1, rnd, g, rect, circ, txt, poly, cam } from './lib.js';
import { raka, rakaSvg, lerpState, idle } from '../../../brand/characters/raka/raka.js';
import { W, H, DESK_Y, kos, deskFront, atlasBook, mugOnDesk, laptopQuiz, rakaDesk, rakaStand, lab, labTable, nameTag } from './world.js';

await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
const DATA = await (await fetch('data.json')).json();
const LEAD = DATA.lead, FPS = DATA.fps;
const $ = (id) => document.getElementById(id);
const camEl = $('cam');
const mixS = (a, b, k) => lerpState(a, b, clamp(k, 0, 1));
const holdKeys = (a, keys) => {
  if (a <= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) if (a <= keys[i + 1][0]) return mixS(keys[i][1], keys[i + 1][1], ease((a - keys[i][0]) / (keys[i + 1][0] - keys[i][0])));
  return keys[keys.length - 1][1];
};

// ================================================================ rekaman kuis asli
const REC = { a0: 9.6, a1: 40.55, dir: 'media/quiz' };
let CUR = null, MARKS = null;
try { const r = await fetch(`${REC.dir}/cursor.json`); if (r.ok) CUR = await r.json(); } catch (e) { /* belum direkam */ }
if (CUR) REC.a0 = CUR.a0;
try { const r = await fetch(`${REC.dir}/marks.json`); if (r.ok) MARKS = await r.json(); } catch (e) { /* belum ada */ }
const SHOT = MARKS ? `f${String(MARKS.soal1 + 70).padStart(4, '0')}.jpg` : '';
const clipEl = $('clip'), recEl = $('rec'), curSvg = $('cur');
let clipSrc = '';
const loaded = new Map();
const pre = (url) => { if (!loaded.has(url)) { const im = new Image(); im.src = url; loaded.set(url, im.decode().catch(() => {})); } return loaded.get(url); };
async function setClip(url) { if (url === clipSrc) return; clipSrc = url; await pre(url); clipEl.src = url; try { await clipEl.decode(); } catch (e) { /* lanjut */ } }
// pemosisian rekaman: skala 0,77 dan geser ke bawah supaya takarir (atas) tidak menutupi layar; kamera mendekat ke viewer saat perlu
const BASE = { s: 0.77, x: (1080 - 1080 * 0.77) / 2, y: 372 };
let CAMS = [[0, 1080 / 2, 960, 0]];   // dipakai bila ada: [a, fokusX (px rekaman), fokusY, zoom ekstra]
try { const r = await fetch('camera.json'); if (r.ok) CAMS = await r.json(); } catch (e) { /* bawaan */ }
function camAt(a) {
  // CAMS: [[a, cx, cy, z], ...] antar-kunci diinterpolasi; z = 0 berarti tampilan dasar, z > 0 memperbesar di sekitar (cx, cy) pada piksel rekaman
  let k0 = CAMS[0], k1 = CAMS[0];
  for (let i = 0; i < CAMS.length; i++) { if (CAMS[i][0] <= a) k0 = CAMS[i]; if (CAMS[i][0] > a) { k1 = CAMS[i]; break; } k1 = CAMS[i]; }
  const u = k1[0] > k0[0] ? ease((a - k0[0]) / (k1[0] - k0[0])) : 1;
  return [lerp(k0[1], k1[1], u), lerp(k0[2], k1[2], u), lerp(k0[3], k1[3], u)];
}
function recTransform(a) {
  const [cx, cy, z] = camAt(a), s = BASE.s * (1 + z);
  // titik rekaman (cx, cy) tetap pada posisi layar dasarnya saat zoom
  const bx = BASE.x + cx * BASE.s, by = BASE.y + cy * BASE.s;
  return { s, x: bx - cx * s, y: by - cy * s };
}
const POINTER = '<path d="M0 0L0 32L9 24L15 38L22 35L16 22L28 22Z" fill="#fff" stroke="#172B38" stroke-width="3" stroke-linejoin="round"/>';
async function updateRec(a) {
  const on = CUR && a >= REC.a0 - 0.45 && a <= REC.a1 + 0.35;
  recEl.style.display = on ? 'block' : 'none';
  if (!on) return;
  const idx = clamp(Math.round((a - REC.a0) * FPS), 0, CUR.n - 1);
  await setClip(`${REC.dir}/f${String(idx).padStart(4, '0')}.jpg`);
  const tr = recTransform(a);
  const slide = 1 - easeOut(seg(a, REC.a0 - 0.45, REC.a0 - 0.05)), out = ease(seg(a, REC.a1, REC.a1 + 0.35));
  recEl.style.transform = `translateY(${r1(slide * 1920 + out * 1920)}px)`;
  clipEl.style.transform = `translate(${r1(tr.x)}px, ${r1(tr.y)}px) scale(${tr.s.toFixed(4)})`;
  // kursor dan cincin klik, digambar di atas rekaman
  const c = CUR.cur[idx] || [0, 0, 0], px = tr.x + c[0] * CUR.dpr * tr.s, py = tr.y + c[1] * CUR.dpr * tr.s;
  let s = '';
  for (const kf0 of CUR.clicks) { const d = (idx - kf0) / 16; if (d >= 0 && d < 1) s += circ(px, py, 20 + 60 * easeOut(d), 'none', `stroke="#F8C038" stroke-width="${r1(10 * (1 - d))}" opacity="${r1(1 - d)}"`); }
  s += `<g transform="translate(${r1(px)} ${r1(py)}) scale(${c[2] ? 0.9 : 1.1})">${POINTER}</g>`;
  curSvg.innerHTML = s;
}

// ================================================================ teks layar
const hookHost = $('hook'), chipHost = $('chips');
const mkEl = (host, cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; d.style.display = 'none'; host.appendChild(d); return d; };
const CHIPS = [
  { a0: 8.3, a1: 9.05, cls: 'big', html: '<span>KUIS ANATOMI <em>3D</em> MEDCOEL</span>' },
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
const capBox = $('capbox'), capWrap = $('cap'); let capIdx = -2;
function updateCaption(a) {
  let idx = -1;
  for (let i = 0; i < DATA.caps.length; i++) if (a >= DATA.caps[i].a0 - 0.04 && a < DATA.caps[i].a1) { idx = i; break; }
  if (idx !== capIdx) { capIdx = idx; if (idx < 0) capBox.style.display = 'none'; else { capBox.style.display = 'block'; capBox.textContent = DATA.caps[idx].text; } }
  capWrap.classList.toggle('top', a >= REC.a0 - 0.3 && a <= REC.a1 + 0.2);
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
    set(a, { x = 0, y = 0, s = 1, rot = 0, o = 1, mood = 'happy', wave = 0 } = {}) {
      wrap.setAttribute('transform', `translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)}) scale(${(Math.round(s * 1000) / 1000)}) translate(-160 -290)`);
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
function koriShow(a) {
  // 8,16: Kori melompat masuk, menyapa, mengajak; 9,3 - 9,8 terbang ke kanan atas saat rekaman masuk
  if (a > 8.1 && a < 9.9) {
    const p = backOut(seg(a, 8.16, 8.7)), leave = ease(seg(a, 9.35, 9.85));
    const x = lerp(lerp(1150, 540, easeOut(seg(a, 8.16, 8.7))), 960, leave), y = lerp(lerp(1500, 1180, easeOut(seg(a, 8.16, 8.7))) - Math.abs(Math.sin(a * 6)) * 24 * (1 - leave), 330, leave);
    koriMain.set(a, { x, y: y - 80 * (1 - leave), s: lerp(1.9, 0.5, leave) * p, rot: (1 - p) * -20, o: 1 - leave * leave, wave: waveAt(a) });
    return;
  }
  // 40,6 - 44,5: Kori menyemangati di samping Raka berlatih
  if (a > 40.4 && a < 44.7) { const p = backOut(seg(a, 40.6, 41.1)) * (1 - ease(seg(a, 44.3, 44.7))); koriMain.set(a, { x: 190, y: 1150, s: 1.25 * p, o: Math.min(1, p * 2), wave: waveAt(a) }); return; }
  koriMain.set(a, { o: 0, s: 0.01 });
}

// ================================================================ adegan: kos (belajar semalaman)
const CONF = raka('netral', null, { browL: { y: -5, rot: 0 }, browR: { y: -5, rot: 0 }, mouth: { w: 18, up: 5, lo: 11 }, tilt: -3, bags: 0.4 });
const READ = raka('netral', null, { browL: { y: -3, rot: 0 }, browR: { y: -3, rot: 0 }, mouth: { w: 14, up: 6, lo: 8 }, tilt: 6, gazeY: 0.9, bags: 0.4, armR: { wx: 300, wy: 540, ex: 330, ey: 560, finger: 0, fa: -90, front: 1 }, armL: { wx: 100, wy: 540, ex: 70, ey: 560, finger: 0, fa: -90, front: 1 } });
function sceneKos1(a, t) {
  const key = idle(holdKeys(a, [[0, READ], [0.9, READ], [1.4, CONF]]), t);
  let s = kos(t, { day: 0, time: a < 1.2 ? '01:40' : '01:42' });
  s += rakaDesk(key, { uid: 'k1' });
  s += atlasBook(540, t, { tilt: 0 }) + mugOnDesk(820, t) + deskFront();
  const z = kf(a, [[0, 1.0], [2.8, 1.12]], (u) => u);
  return cam(s, z, 540, 760);
}
// ================================================================ adegan: praktikum (kaget, lalu nama-nama terbang)
const TAGS = [['Os femur', '#F8C038', -50, -260], ['N. vagus', '#9DE0BD', 120, -330], ['M. biceps', '#F29B8A', 260, -180], ['A. carotis', '#8EC7F0', -150, -120], ['Plexus', '#D9C2F0', 330, -300], ['Fossa', '#FFE08A', 60, -440]];
function sceneLab(a, t) {
  const hx = 300, hy = 560;
  const look = ease(seg(a, 3.0, 3.5));
  let st = holdKeys(a, [[2.8, raka('netral', null, { yaw: 0.5, gazeX: 0.8, mouth: { w: 14, up: 7, lo: 7 } })], [3.5, raka('kaget', null, { yaw: 0.5, gazeX: 0.9, wide: 1 })], [5.1, raka('kaget', null, { yaw: 0.5, gazeX: 0.9, wide: 1 })], [6.0, raka('khawatir', null, { yaw: 0.2, wide: 0.7 })], [7.0, raka('bingung', null, { dizzy: 1, yaw: 0, tilt: -6 })]]);
  st = JSON.parse(JSON.stringify(idle(st, t))); st.dizzyT = t * 1.6;
  const dz = ease(seg(a, 6.3, 6.9)); st.dizzy = dz;
  let s = lab(t) + labTable(700, 940);
  s += rakaStand(st, { x: 300, floorY: 1200, s: 1.02, uid: 'lb', outfit: 'jas' });
  // nama-nama beterbangan dari kepala (5,15 - 7,7)
  TAGS.forEach(([tx, col, dx, dy], i) => {
    const t0 = 5.15 + i * 0.22, u = seg(a, t0, t0 + 1.6); if (u <= 0 || u >= 1) return;
    const e = easeOut(u), x = hx + dx * e * 1.5 + Math.sin(u * 7 + i) * 24, y = hy + dy * e - 40 * u, r = (i % 2 ? 1 : -1) * (u * 80 + 10);
    s += nameTag(x, y, r, tx, col, Math.min(1, u * 6) * (1 - ease(seg(u, 0.7, 1))), 0.8 + 0.5 * u);
  });
  // tanda tanya setelah nama hilang
  const q = ease(seg(a, 6.8, 7.3)) * (1 - ease(seg(a, 7.8, 8.1)));
  if (q > 0.01) for (let i = 0; i < 3; i++) s += g(txt('?', 0, 0, { size: 120, fill: '#E8665F', extra: 'stroke="#fff" stroke-width="10" paint-order="stroke"' }), { x: 200 + i * 100, y: 380 + Math.sin(t * 5 + i) * 10 - (i % 2) * 40, s: q, o: q, r: (i - 1) * 14 });
  const z = kf(a, [[2.8, 1.0], [3.5, 1.4], [5.0, 1.4], [7.0, 1.1]], easeInOut);
  const fx = lerp(540, 330, ease(seg(a, 2.8, 3.5)));
  return cam(s, z, fx, 760);
}
// ================================================================ jembatan: Kori mengajak (8,16 - 9,9)
function sceneKori(a, t) {
  let s = rect(-40, -40, 1160, 2000, '#F4F1E8') + circ(900, 300, 280, '#EAF3E0') + circ(120, 1500, 300, '#EAF3E0');
  for (let i = 0; i < 10; i++) s += circ(80 + ((i * 197) % 920), 260 + ((i * 331) % 1200), 14 + (i % 3) * 8, '#9DE0BD', `opacity=".55"`);
  return s;
}
// ================================================================ adegan: Raka berlatih lebih percaya diri
function sceneKos2(a, t) {
  const hype = raka('senang', null, { browL: { y: -8, rot: 0 }, browR: { y: -8, rot: 0 }, bags: 0, armR: { wx: 290, wy: 520, ex: 340, ey: 540, finger: 0, fa: -90, front: 1 }, armL: { wx: 110, wy: 520, ex: 60, ey: 540, finger: 0, fa: -90, front: 1 } });
  const nod = Math.sin((a - 40.6) * 7) * 3;
  const st = idle(mixS(CONF, hype, ease(seg(a, 41.0, 41.8))), t); st.tilt += nod * 0.5;
  let s = kos(t, { day: 1, time: '09:15', lamp: 0.2 });
  s += rakaDesk(st, { uid: 'k2' });
  let img = '';
  if (SHOT) img = `<image href="${REC.dir}/${SHOT}" x="14" y="14" width="302" height="192" preserveAspectRatio="xMidYMin slice"/>`;
  s += laptopQuiz(660, img) + deskFront();
  const z = kf(a, [[40.4, 1.05], [44.6, 1.0]], (u) => u);
  return cam(s, z, 540, 820);
}

// ================================================================ kartu akhir
const popCss = (d, k, dy = 24) => { const kk = backOut(k); d.style.opacity = clamp(k * 4, 0, 1); d.style.transform = `scale(${lerp(0.85, 1, kk).toFixed(3)}) translateY(${lerp(dy, 0, clamp(kk, 0, 1)).toFixed(1)}px)`; };
$('er1').textContent = 'COBA KUIS ANATOMI 3D'; $('er2').textContent = 'GRATIS DI MEDCOEL'; $('er3').textContent = 'medcoel.com';
$('esrc').innerHTML = '';
const endSvg = $('endsvg'); endSvg.innerHTML = '<g id="rakaEnd"></g>';
const koriEnd = mkKori(endSvg);
function updateEnd(a, t) {
  const endK = ease(seg(a, 44.2, 44.65));
  $('end').style.opacity = endK.toFixed(3);
  if (endK <= 0) return;
  const lk = backOut(seg(a, 44.3, 44.9)); const lg = $('elogo'); lg.style.transform = `scale(${lerp(0.7, 1, lk).toFixed(3)})`; lg.style.opacity = clamp((a - 44.25) / 0.3, 0, 1);
  popCss($('er1'), seg(a, 44.7, 45.15), 24); popCss($('er2'), seg(a, 45.7, 46.15), 24); popCss($('er3'), seg(a, 47.5, 47.95), 24);
  const rk = clamp((a - 44.8) / 0.5, 0, 1);
  const rs = idle(raka('senang', 'sapa'), t); rs.armR = { ...rs.armR, wx: rs.armR.wx + Math.sin(a * 8) * 10 };
  $('rakaEnd').innerHTML = `<g transform="translate(300 1520) scale(${(0.78 * backOut(rk)).toFixed(3)}) translate(-200 -778)" opacity="${rk}">${rakaSvg(rs, { bare: true, shadow: true, uid: 'endraka' })}</g>`;
  const kr = backOut(clamp((a - 45.0) / 0.5, 0, 1));
  koriEnd.set(a, { x: 700, y: 1500, s: 1.7 * kr, o: kr, mood: 'happy', wave: waveAt(a) });
}

// ================================================================ render utama
const SCENES = [
  { a0: -1, a1: 2.95, fn: sceneKos1 },
  { a0: 2.7, a1: 8.4, fn: sceneLab },
  { a0: 8.1, a1: 9.9, fn: sceneKori },
  { a0: 40.2, a1: 44.8, fn: sceneKos2 },
];
const FADE = { 1: [2.7, 2.85], 2: [8.1, 8.3], 3: [40.2, 40.5] };
window.renderFrame = async function (t) {
  const a = t - LEAD;
  let svg = '';
  SCENES.forEach((sc, i) => {
    if (a < sc.a0 || a > sc.a1) return;
    const f = FADE[i], o = f ? ease(seg(a, f[0], f[1])) : 1;
    if (o <= 0.002) return;
    svg += o < 0.999 ? `<g opacity="${o.toFixed(3)}">${sc.fn(a, t)}</g>` : sc.fn(a, t);
  });
  camEl.innerHTML = svg;
  koriShow(a);
  await updateRec(a);
  popEls(CHIPS, chipEls, a);
  updateCaption(a); updateEnd(a, t);
  $('fade').style.opacity = '0';
  window.__t = t;
};
window.__ready = true;
