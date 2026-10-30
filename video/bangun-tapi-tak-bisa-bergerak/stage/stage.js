// Panggung video "Bangun, tapi tak bisa bergerak": semua dihitung dari waktu t sehingga tiap frame deterministik.
// a = waktu audio narator asli (detik); t = a + LEAD (jeda awal agar mata tokoh terbuka sebelum suara).
import { el, clamp, lerp, ease, easeInOut, easeOut, easeOutBack } from './rig.js';
import { kf, win, blinkAt } from './util.js';
import { createPOV } from './pov.js';
import { createTopDown } from './topdown.js';
import { createRoom } from './room.js';
import { createExplain } from './explain.js';
import { posePerson } from './rig.js';

const DATA = await (await fetch('data.json')).json();
const KORI_SVG = await (await fetch('kori.svg')).text();
const $ = (id) => document.getElementById(id);
const LEAD = DATA.lead;

const ICON = {
  clinic: `<svg viewBox="0 0 80 80"><path d="M10 70V30L40 12l30 18v40z" fill="#fff" stroke="#00A383" stroke-width="5" stroke-linejoin="round"/><rect x="33" y="28" width="14" height="30" rx="4" fill="#00A383"/><rect x="25" y="36" width="30" height="14" rx="4" fill="#00A383"/></svg>`,
  repeat: `<svg viewBox="0 0 80 80"><path d="M16 34a24 24 0 0 1 42-10M64 46a24 24 0 0 1-42 10" fill="none" stroke="#F29B38" stroke-width="8" stroke-linecap="round"/><path d="M58 8v18H40M22 72V54h18" fill="none" stroke="#F29B38" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  moon: `<svg viewBox="0 0 80 80"><path d="M52 10a30 30 0 1 0 18 52A26 26 0 0 1 52 10z" fill="#7F97D6"/></svg>`,
  book: `<svg viewBox="0 0 80 80"><path d="M8 18q16-6 32 4v44q-16-10-32-4z" fill="#00A383"/><path d="M72 18q-16-6-32 4v44q16-10 32-4z" fill="#9DE0BD"/></svg>`,
  check: `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="#00A383"/><path d="M24 41l11 11 21-24" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  heart: `<svg viewBox="0 0 80 80"><path d="M40 68S10 48 10 28q0-14 14-14 12 0 16 12 4-12 16-12 14 0 14 14c0 20-30 40-30 40z" fill="#E8665F"/></svg>`,
  brain: `<svg viewBox="0 0 80 80"><path d="M30 14q-16 0-16 16 0 6 4 10-6 6-2 16 4 10 16 8 6 8 14 0 12 2 16-8 4-10-2-16 4-4 4-10 0-16-16-16-6-6-18 0z" fill="#F2A99A"/><path d="M40 20v50M24 34q8 4 16 0M56 34q-8 4-16 0M24 52q8 4 16 0M56 52q-8 4-16 0" fill="none" stroke="#C86F63" stroke-width="4" stroke-linecap="round"/></svg>`,
};

// ---------- adegan ----------
const tdG = $('tdG'), povG = $('povG'), expG = $('expG'), roomG = $('roomG'), fx = $('fx');
const exp = createExplain(expG, null);
const pov = createPOV(povG);
const td = createTopDown(el('g', {}, tdG));
const tdWrap = tdG.firstElementChild;
const room = createRoom(el('g', {}, roomG));
const roomWrap = roomG.firstElementChild;

// efek layar: vinyet, kelopak mata, gelembung suara, ikon bisu
const vig = el('rect', { x: -10, y: -10, width: 1100, height: 1940, fill: 'url(#vigG)', opacity: 0 }, fx);
const lidTop = el('path', { fill: '#03050D' }, fx), lidBot = el('path', { fill: '#03050D' }, fx);
const bubble = el('g', { opacity: 0 }, fx);
bubble.innerHTML = `<path d="M300 380Q300 300 380 300L700 300Q780 300 780 380L780 480Q780 560 700 560L610 560L540 640L520 560L380 560Q300 560 300 480Z" fill="#fff" opacity=".92"/>
  <circle cx="440" cy="430" r="26" fill="#9AA3C2"/><circle cx="540" cy="430" r="26" fill="#9AA3C2"/><circle cx="640" cy="430" r="26" fill="#9AA3C2"/>`;
const mute = el('g', { opacity: 0 }, fx);
mute.innerHTML = `<circle cx="540" cy="460" r="130" fill="#fff" opacity=".9"/><path d="M470 430h36l54-44v148l-54-44h-36z" fill="#9AA3C2"/><path d="M590 410q26 26 0 52M620 386q46 50 0 100" fill="none" stroke="#9AA3C2" stroke-width="12" stroke-linecap="round" opacity=".7"/><path d="M450 540L632 380" stroke="#E8665F" stroke-width="16" stroke-linecap="round"/>`;
const bubDots = [...bubble.querySelectorAll('circle')];
// gelembung pikiran tokoh (kamar terang)
const thought = el('g', { opacity: 0 }, fx);
thought.innerHTML = `<g transform="translate(790 560)"><path d="M-170 -150Q-170 -250 -70 -250L120 -250Q220 -250 220 -150L220 -50Q220 50 120 50L20 50L-50 130L-60 50L-70 50Q-170 50 -170 -50Z" fill="#fff"/>
  <text x="25" y="-60" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="190" fill="#00A383">?</text>
  <path d="M-130 -170l8 18 18 8-18 8-8 18-8-18-18-8 18-8z" fill="#F8C038"/><path d="M170 -190l6 14 14 6-14 6-6 14-6-14-14-6 14-6z" fill="#F29B38"/></g>
  <circle cx="660" cy="720" r="14" fill="#fff"/><circle cx="620" cy="770" r="9" fill="#fff"/>`;
fx.appendChild(exp.bigQElement || document.createElementNS('http://www.w3.org/2000/svg','g'));

// Kori kecil di kartu akhir
const koriWrap = el('g', {}, $('endsvg'));
const koriInner = el('g', {}, koriWrap); koriInner.innerHTML = new DOMParser().parseFromString(KORI_SVG, 'image/svg+xml').documentElement.innerHTML;
const kq = (s) => koriInner.querySelector(s);
const K = { float: kq('.mc-float'), eyesN: kq('.mc-eyes-normal'), eyesH: kq('.mc-eyes-happy'), mN: kq('.mc-mouth-normal'), mH: kq('.mc-mouth-happy'), arm: kq('.mc-arm-right'), dots: [...koriInner.querySelectorAll('.mc-eyes > circle')] };

// ---------- chip, kartu, takarir ----------
const CHIPS = [
  { a0: 27.0, a1: 29.3, icon: 'moon', html: 'Tidur REM: kita bermimpi' },
  { a0: 29.5, a1: 32.2, icon: 'repeat', html: 'Gerak otot ditahan sementara', raw: 1 },
  { a0: 32.4, a1: 34.6, icon: 'brain', html: 'Kesadaran muncul lebih dulu' },
  { a0: 34.8, a1: 38.5, icon: 'moon', html: 'Tubuh belum sepenuhnya bangun' },
  { a0: 38.9, a1: 42.5, icon: 'brain', html: 'Sadar, tapi belum bisa bergerak' },
  { a0: 47.3, a1: 50.8, icon: 'brain', html: 'Tidak semua orang mengalaminya' },
  { a0: 51.0, a1: 54.9, icon: 'moon', html: 'Hanya persepsi, bukan sosok nyata' },
  { a0: 55.25, a1: 57.3, icon: 'check', html: 'Umumnya singkat' },
];
const chipHost = $('chips');
const chipEls = CHIPS.map((c) => { const d = document.createElement('div'); d.className = 'chip'; d.innerHTML = `<span class="ic">${ICON[c.icon]}</span><span>${c.html}</span>`; d.style.display = 'none'; chipHost.appendChild(d); return d; });
function updateChips(a) {
  CHIPS.forEach((c, i) => {
    const d = chipEls[i]; const on = a >= c.a0 && a <= c.a1 + 0.25;
    if (!on) { d.style.display = 'none'; return; }
    d.style.display = 'inline-flex';
    const k = easeOutBack(clamp((a - c.a0) / 0.38, 0, 1)), o = clamp((c.a1 + 0.25 - a) / 0.25, 0, 1);
    d.style.opacity = Math.min(1, (a - c.a0) / 0.15) * o;
    d.style.transform = `scale(${lerp(0.7, 1, k).toFixed(3)}) translateY(${lerp(-18, 0, clamp(k, 0, 1)).toFixed(1)}px)`;
  });
}
const card = $('card');
card.innerHTML = `<h3>Kalau pengalaman ini…</h3>
  <div class="row" id="k1"><span class="ic">${ICON.repeat}</span><span>Sering berulang</span></div>
  <div class="row" id="k2"><span class="ic">${ICON.moon}</span><span>Mengganggu tidurmu</span></div>
  <div class="row" id="k3"><span class="ic">${ICON.clinic}</span><span>Ceritakan ke tenaga kesehatan</span></div>`;
function updateCard(a) {
  const a0 = 66.75, a1 = 72.3; const on = a >= a0 && a <= a1 + 0.3;
  card.style.display = on ? 'block' : 'none'; if (!on) return;
  const k = easeOutBack(clamp((a - a0) / 0.45, 0, 1)), o = clamp((a1 + 0.3 - a) / 0.3, 0, 1);
  card.style.opacity = o; card.style.transform = `scale(${lerp(0.85, 1, k).toFixed(3)}) translateY(${lerp(-30, 0, clamp(k, 0, 1)).toFixed(1)}px)`;
  [['k1', 66.9], ['k2', 69.0], ['k3', 70.4]].forEach(([id, t0]) => { const d = $(id); d.style.display = a >= t0 ? 'flex' : 'none'; const kk = easeOutBack(clamp((a - t0) / 0.35, 0, 1)); d.style.opacity = clamp((a - t0) / 0.2, 0, 1); d.style.transform = `scale(${lerp(0.7, 1, kk).toFixed(3)})`; });
}
const capBox = $('capbox'); let capIdx = -2;
function updateCaption(t) {
  let idx = -1;
  for (let i = 0; i < DATA.caps.length; i++) if (t >= DATA.caps[i].t0 - 0.04 && t < DATA.caps[i].t1) { idx = i; break; }
  if (idx !== capIdx) { capIdx = idx; if (idx < 0) capBox.style.display = 'none'; else { capBox.style.display = 'block'; capBox.textContent = DATA.caps[idx].text; } }
}
// kartu akhir
const e1 = $('er1'), e2 = $('er2');
e1.innerHTML = `<span class="ic">${ICON.book}</span><span>Belajar kedokteran gratis</span>`;
e2.innerHTML = `<span class="ic">${ICON.check}</span><span>38.400 soal + pembahasan</span>`;

// ---------- keadaan POV ----------
function povState(a, t) {
  const c = kf(a, [[2.9, [1150, -380, 1.0]], [4.3, [1150, 780, 1.0]], [4.45, [1150, 780, 1.0]], [5.15, [830, 960, 1.9]], [5.95, [830, 960, 2.05]], [6.95, [1880, 1010, 1.7]], [7.9, [1880, 1010, 1.78]], [8.95, [950, 1720, 1.25]],
    [10.45, [950, 1745, 1.4]], [11.6, [950, 1745, 1.4]], [12.75, [1620, 1010, 1.2]], [15.5, [1580, 1010, 1.3]], [16.45, [830, 950, 2.4]], [18.3, [830, 950, 2.95]], [19.7, [260, 930, 1.7]], [24.0, [250, 940, 2.45]], [25.0, [250, 940, 2.1]]], easeInOut);
  const foc = kf(a, [[2.9, 0], [4.45, 0], [5.15, 0.8], [5.95, 0.8], [6.7, 0], [7.9, 0], [8.8, 0.8], [11.6, 0.8], [12.6, 0.05], [15.5, 0.05], [16.4, 0.8], [18.3, 0.8], [19.6, 0.4], [24.9, 0.4]], easeInOut)
    + (a > 20 ? Math.sin(a * 1.3) * 0.12 * clamp((a - 20) / 2, 0, 1) : 0);
  const fuzz = kf(a, [[2.9, 16], [4.4, 0]], easeOut);
  const B = (d) => fuzz + 24 * Math.max(0, Math.abs(d - foc) - 0.14);
  const shake = kf(a, [[7.9, 0], [8.3, 0.7], [10.3, 1.0], [10.5, 0], [17.9, 0], [19, 1.0], [24, 2.4]], (x) => x);
  const hbPh = ((a - 13.5) * 1.35) % 1; const hb = a > 13.5 ? Math.exp(-hbPh * 9) + 0.55 * (hbPh > 0.25 ? Math.exp(-(hbPh - 0.25) * 9) : 0) : 0;
  const clockSlow = a > 15.6 && a < 18.4;
  const colon = clockSlow ? (((a - 15.6) / 2.4) % 1) < 0.55 : (Math.floor(a) % 2 === 0);
  return {
    cx: c[0] + Math.sin(a * 23) * shake * 3, cy: c[1] + Math.cos(a * 19) * shake * 3, z: c[2], roll: Math.sin(a * 17) * shake * 0.22 + (a > 18.5 ? Math.sin(a * 0.8) * 0.8 : 0),
    fFar: B(0), fMid: B(0.4), fNear: B(0.8), colon, clock: ['03', '12'], strain: win(a, 8.35, 10.3, 0.4, 0.3) * (0.6 + 0.4 * Math.sin(a * 9)), tremor: 0,
    coatBreath: kf(a, [[18.3, 0], [23, 1]]) * (0.5 + 0.5 * Math.sin(a * 1.7)), t, hb,
    vig: kf(a, [[2.9, 0.35], [8, 0.35], [10.4, 0.62], [13, 0.45], [16, 0.66], [20, 0.82], [23.8, 0.92]]),
  };
}
const BLINKS = [[6.95, 0.3, 1], [13.1, 0.36, 1], [15.55, 0.7, 1], [20.9, 0.32, 1], [22.9, 0.3, 1]];
function lidAmount(a) {
  let v = 0;
  for (const [s, d, m] of BLINKS) { const k = (a - s) / d; if (k > 0 && k < 1) v = Math.max(v, Math.sin(k * Math.PI) * m); }
  v = Math.max(v, win(a, 8.2, 10.4, 0.5, 0.4) * (0.16 + 0.07 * Math.sin(a * 6)));
  return v;
}
function setLids(c) {
  const h = c * 980;
  lidTop.setAttribute('d', c > 0.005 ? `M-10 -10H1090V${h.toFixed(0)}Q540 ${(h + 150 * c).toFixed(0)} -10 ${h.toFixed(0)}Z` : '');
  lidBot.setAttribute('d', c > 0.005 ? `M-10 1930H1090V${(1920 - h).toFixed(0)}Q540 ${(1920 - h - 150 * c).toFixed(0)} -10 ${(1920 - h).toFixed(0)}Z` : '');
}

// ---------- render utama ----------
window.renderFrame = function (t) {
  const a = t - LEAD;
  // visibilitas adegan
  const showTD1 = a < 2.95, showPOV = a >= 2.85 && a < 26.6, showEXP = a >= 24.2 && a < 57.2, showTD2 = a >= 57.2 && a < 63.35, showROOM = a >= 63.3;
  tdG.setAttribute('opacity', showTD1 || showTD2 ? 1 : 0); expG.setAttribute('opacity', showEXP ? 1 : 0);
  $('povClip').setAttribute('opacity', showPOV ? 1 : 0); roomG.setAttribute('opacity', showROOM ? 1 : 0);

  // -- TD1 / TD2 --
  if (showTD1 || showTD2) {
    const tdBase = { t, breath: 1, clock: a < 62.5 ? '03:12' : '03:12' };
    if (showTD1) {
      const open = kf(a, [[0.35, 1], [1.05, 0]], ease);
      const startle = kf(a, [[1.0, 0], [1.25, 1], [1.7, 0.4]]);
      const looking = kf(a, [[1.7, [0, 0.4]], [2.1, [-1, 0.2]], [2.9, [-1, 0.2]]], ease);
      const z = kf(a, [[-0.8, 1.0], [2.9, 1.42]], easeInOut);
      tdWrap.setAttribute('transform', `translate(540 960) scale(${z.toFixed(4)}) translate(-540 -690)`);
      td.update({ ...tdBase, mood: 0, eyes: startle > 0.5 ? 'wide' : 'open', blink: open + (a > 1.3 ? blinkAt(a, 3.4, 0.5) : 0) * 0.0, look: Array.isArray(looking) ? looking : [0, 0.4], brow: a > 1.0 ? 'worry' : 'neutral', mouth: a > 1.0 ? 'flat' : 'smallsmile', breath: a < 1 ? 1 : 2.2, clock: '03:12', twL: 0, twR: 0 });
    } else {
      const zz = kf(a, [[57.2, 1.4], [63.7, 0.95]], easeInOut), cyy = kf(a, [[57.2, 700], [63.7, 940]], easeInOut);
      tdWrap.setAttribute('transform', `translate(540 960) scale(${zz.toFixed(4)}) translate(-540 -${cyy.toFixed(0)})`);
      const mood = kf(a, [[57.2, 0.05], [63.5, 0.8]]);
      const lift = kf(a, [[61.0, 0], [62.6, 1]], easeInOut);
      const tw0 = 58.6, tw1 = 59.9;
      const tr = (s) => (a >= s ? Math.exp(-(a - s) * 1.2) * (a < s + 1.6 ? 1 : 0) : 0);
      td.update({ ...tdBase, ring: win(a, 59.7, 61.9, 0.4, 0.4), mood, eyes: 'open', blink: blinkAt(a, 3.4, 0.5), look: a > 62 ? [0.8, 0.2] : [-0.4, 0.4], brow: a > 62.5 ? 'up' : 'worry', mouth: a > 62.7 ? 'o' : 'flat', tilt: kf(a, [[61.5, 0], [62.8, -6]]), lift, twL: tr(tw1), twR: tr(tw0), tw0: tw0, breath: a > 62 ? 2.0 : 1.4, clock: '03:12' });
      // petunjuk lembut ke jaket di sudut (bukan makhluk, hanya jaket)
    }
  }
  // -- POV --
  if (showPOV) {
    const s = povState(a, t);
    pov.update(s);
    const vv = s.vig + s.hb * 0.1; vig.setAttribute('opacity', (clamp(vv, 0, 1) * (showPOV ? 1 : 0)).toFixed(3));
    // gelembung suara tanpa bunyi dan ikon bisu
    bubble.setAttribute('opacity', (win(a, 11.8, 13.5, 0.3, 0.4) * 0.95).toFixed(2));
    bubDots.forEach((d, i) => d.setAttribute('opacity', (0.3 + 0.7 * Math.max(0, Math.sin(a * 6 - i * 1.0))).toFixed(2)));
    mute.setAttribute('opacity', (win(a, 13.9, 15.35, 0.3, 0.35) * 0.95).toFixed(2));
    setLids(lidAmount(a));
    // iris: POV menyusut jadi lingkaran saat pertanyaan "apa yang sebenarnya terjadi?"
    const r = a < 24.9 ? 1400 : kf(a, [[24.9, 1400], [26.5, 8]], easeInOut);
    $('irisC').setAttribute('r', r.toFixed(1));
    if (a > 24.9) { vig.setAttribute('opacity', 0); }
  } else { vig.setAttribute('opacity', 0); bubble.setAttribute('opacity', 0); mute.setAttribute('opacity', 0); setLids(0); $('irisC').setAttribute('r', 1400); }
  // transisi mata: kedip menutup lalu membuka saat berganti dari sudut pandang luar ke pandangan tokoh
  if (a >= 2.55 && a < 3.4) { const k = kf(a, [[2.55, 0], [2.85, 1], [3.0, 1], [3.4, 0]], ease); setLids(k); }
  // -- EXP --
  if (showEXP) exp.update(a, t); else exp.bigQElement.firstElementChild.setAttribute('opacity', 0);
  // -- ROOM --
  if (showROOM) renderRoom(a, t);
  thought.setAttribute('opacity', (win(a, 75.95, 80.0, 0.4, 0.3)).toFixed(2));
  thought.setAttribute('transform', `translate(0 ${(Math.sin(a * 2.2) * 6).toFixed(1)})`);

  // chip/kartu/takarir
  updateChips(a); updateCard(a); updateCaption(t);
  // transisi putih: dari EXP ke kamar dan dari kamar menyala ke kartu akhir
  let fade = 0;
  fade = Math.max(fade, kf(a, [[56.85, 0], [57.12, 1], [57.28, 1], [57.8, 0]], (x) => x));
  fade = Math.max(fade, kf(a, [[62.95, 0], [63.22, 1], [63.42, 1], [63.95, 0]], (x) => x));
  $('fade').style.background = a > 62.9 ? '#FFF1D2' : '#0A1030';
  $('fade').style.opacity = fade.toFixed(3);
  // kartu akhir
  const endK = clamp((a - 79.9) / 0.5, 0, 1);
  $('end').style.opacity = endK.toFixed(3);
  const lk = easeOutBack(clamp((a - 80.15) / 0.6, 0, 1)); const lg = $('elogo'); lg.style.transform = `scale(${lerp(0.7, 1, lk).toFixed(3)})`; lg.style.opacity = clamp((a - 80.1) / 0.4, 0, 1);
  [[e1, 80.35], [e2, 84.75], [$('er3'), 88.07]].forEach(([d, t0]) => { const k = easeOutBack(clamp((a - t0) / 0.45, 0, 1)); d.style.opacity = clamp((a - t0) / 0.2, 0, 1); d.style.transform = `scale(${lerp(0.7, 1, k).toFixed(3)}) translateY(${lerp(24, 0, clamp(k, 0, 1)).toFixed(1)}px)`; });
  const kori = clamp((a - 86.0) / 0.5, 0, 1);
  koriWrap.setAttribute('transform', `translate(120 1250) scale(${(0.8 * easeOutBack(kori)).toFixed(3)})`); koriWrap.setAttribute('opacity', kori);
  K.float.setAttribute('transform', `translate(0 ${(Math.sin(a * 2.3) * 6).toFixed(1)})`);
  K.eyesN.setAttribute('opacity', 0); K.eyesH.setAttribute('opacity', 1); K.dots.forEach((c) => c.setAttribute('opacity', 0)); K.mN.setAttribute('opacity', 0); K.mH.setAttribute('opacity', 1);
  if (K.arm) K.arm.setAttribute('style', `transform-box:fill-box;transform-origin:10% 60%;transform:rotate(${(Math.sin(a * 9) * 16 - 10).toFixed(1)}deg)`);
  $('src').style.opacity = clamp((a - 90.7) / 0.5, 0, 1);
  $('cap').style.display = (t >= DATA.caps[DATA.caps.length - 1].t1 + 0.3) ? 'none' : 'flex';
  window.__t = t;
};

function renderRoom(a, t) {
  const lampT = 64.75;
  const lit = kf(a, [[lampT, 0], [lampT + 0.8, 1]], ease);
  const flash = win(a, lampT - 0.15, lampT + 0.7, 0.2, 0.5) * 0.28;
  room.update({ lit, flash, clock: '03:13' });
  const z = kf(a, [[63.4, 1.0], [80.0, 1.06]]);
  roomWrap.setAttribute('transform', `translate(540 960) scale(${z.toFixed(4)}) translate(-540 -960)`);
  const base = { x: 590, y: 1382, s: 1.0, t, seated: true, noShadow: true, blink: blinkAt(a, 3.6, 0.7), ph: 0 };
  let pose = { ...base, expr: { brow: 'worry', eye: 'wide', mouth: 'o' }, look: [0, 0.2], lean: 0, armL: { w: [-72, -250], bend: 1, top: true }, armR: { w: [72, -250], bend: 1, top: true } };
  if (a < 64.2) { pose.look = [kf(a, [[63.4, -0.6], [64.1, 0.8]]), 0.2]; pose.expr = { brow: 'worry', eye: 'wide', mouth: 'o' }; }
  const reach = kf(a, [[64.15, 0], [64.65, 1], [64.9, 1], [65.6, 0]], ease);
  if (a >= 64.15 && a < 65.7) {
    pose.armR = { w: [lerp(72, 300, reach), lerp(-250, -420, reach)], bend: -1, top: true };
    pose.lean = 9 * reach; pose.look = [0.9, 0.2]; pose.expr = { brow: 'up', eye: 'open', mouth: 'small' };
  }
  if (a >= 65.7) { pose.expr = { brow: 'neutral', eye: 'open', mouth: 'smallsmile' }; pose.look = [0, 0.1]; pose.headTilt = Math.sin(a * 1.3) * 2; }
  if (a >= 66.7 && a < 72.4) pose.headTilt = Math.sin((a - 66.7) * 2.4) * 3;
  if (a >= 72.5 && a < 75.8) {
    const k = kf(a, [[72.5, 0], [73.3, 1]]);
    pose.look = [-1.0 * k, 0.1]; pose.turn = -0.5 * k; pose.headTilt = -3 * k; pose.expr = { brow: a > 74.2 ? 'happy' : 'neutral', eye: 'open', mouth: a > 74.2 ? 'smile' : 'smallsmile' };
  }
  if (a >= 75.8) {
    const k = kf(a, [[75.8, 0], [76.6, 1]], ease);
    pose.armR = { w: [lerp(72, 38, k), lerp(-250, -452, k)], bend: -1, top: true };
    pose.look = [0.5 * k, -0.5 * k]; pose.headTilt = 7 * k; pose.expr = { brow: 'up', eye: 'open', mouth: 'smallsmile' }; pose.turn = 0;
  }
  posePerson(room.hero, pose);
}
window.__ready = true;
