// Panggung video "Dunia tanpa oralit": semua dihitung dari waktu t (detik) sehingga tiap frame deterministik.
import { createPerson, posePerson, clamp, lerp, ease, easeOut, easeInOut, easeOutBack, el } from './rig.js';
import { C, YF, SEAT, TABLE, buildBackground, buildSofa, buildTable, sachetSVG, glassSVG, jugSVG, ICONS } from './world.js';
import { createBody } from './body.js';

const DATA = await (await fetch('data.json')).json();
const KORI_SVG = await (await fetch('kori.svg')).text();
const $ = (id) => document.getElementById(id);
const FPS = DATA.fps;
const TT = (id) => DATA.turns[id];

// ---------- util ----------
// keyframe: [[t, v], ...] dengan v angka atau larik; easing antar kunci
function kf(t, keys, fn = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
    if (t <= t1) {
      const k = fn((t - t0) / (t1 - t0 || 1));
      return Array.isArray(v0) ? v0.map((x, j) => lerp(x, v1[j], k)) : lerp(v0, v1, k);
    }
  }
  return keys[keys.length - 1][1];
}
const win = (t, a, b, fi = 0.2, fo = 0.2) => clamp((t - a) / fi, 0, 1) * clamp((b - t) / fo, 0, 1);
const blinkAt = (t, period, off) => { const ph = (((t + off) % period) + period) % period; const d = Math.abs(ph - 0.12); return d < 0.12 ? 1 - d / 0.12 : 0; };
const envAt = (arr, t) => { const f = t * FPS, i = Math.floor(f); const a = arr[clamp(i, 0, arr.length - 1)] || 0, b = arr[clamp(i + 1, 0, arr.length - 1)] || 0; return lerp(a, b, f - i); };
const wl = (p, x, y) => [(x - p.x) / (p.s * (p.flip || 1)), (y - p.y) / p.s];
const lw = (p, [lx, ly]) => [p.x + lx * p.s * (p.flip || 1), p.y + ly * p.s];

// ---------- batas adegan ----------
const B = [0, 4.25, 13.5, 26.5, 35.9, 43.0, 60.7, 78.0, 83.6, DATA.total];
const T_REW = [43.0, 45.0]; // rewind

// ---------- dunia ----------
const cam = $('cam');
const L = {};
for (const n of ['bg', 'sofaBack', 'tableBack', 'people', 'sofaFront', 'tableFront', 'props', 'stand', 'over']) L[n] = el('g', { class: n }, cam);
buildBackground(L.bg);
buildSofa(L.sofaBack, L.sofaFront);
buildTable(L.tableBack, L.tableFront);

const parent = createPerson('parent');
const child = createPerson('child');
L.people.appendChild(parent.root); L.people.appendChild(child.root);
const overP = { parent: el('g', {}, L.over), child: el('g', {}, L.over) };
// overlay lengan (di atas semua) dipakai sebagai 'top'
parent.overlay = overP.parent; child.overlay = overP.child;
const put = (p, layer) => { if (p.root.parentNode !== L[layer]) L[layer].appendChild(p.root); };

// properti meja
const jug = el('g', {}, L.props); jug.innerHTML = jugSVG();
const ghost = el('g', {}, L.props);
const sachet = el('g', {}, L.props); sachet.innerHTML = sachetSVG();
const glass = el('g', {}, L.props);
const glassBody = el('path', { d: 'M-30 -64L30 -64L25 0Q25 8 17 8L-17 8Q-25 8 -25 0Z', fill: '#E4F5FB', opacity: 0.95 }, glass);
const glassWater = el('path', { fill: '#BFE7F5' }, glass);
const glassShine = el('path', { d: 'M-21 -54L-17 -8', stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.7, fill: 'none' }, glass);
ghost.innerHTML = `<rect x="-86" y="-126" width="172" height="252" rx="26" fill="none" stroke="#8AA3A0" stroke-width="6" stroke-dasharray="14 12" stroke-linecap="round"/>
  <text x="0" y="22" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="90" fill="#8AA3A0" opacity=".8">?</text>`;
const spoon = el('g', {}, L.props); spoon.innerHTML = `<rect x="-5" y="-70" width="10" height="110" rx="5" fill="#C9D6D3"/><ellipse cx="0" cy="-74" rx="13" ry="17" fill="#C9D6D3"/>`;
const powder = el('g', {}, L.props);
const grains = Array.from({ length: 14 }, (_, i) => el('circle', { r: 4 + (i % 3), fill: i % 3 === 0 ? '#F8C038' : '#fff' }, powder));
const sparkle = el('g', {}, L.props);
sparkle.innerHTML = `<path d="M0 -34Q4 -4 34 0Q4 4 0 34Q-4 4 -34 0Q-4 -4 0 -34z" fill="#F8C038"/>`;
const halo = el('circle', { r: 150, fill: '#FFE9A8', opacity: 0 }, L.bg); // dipindah ke bawah properti

// body view penuh dan PiP
const bodyScene = $('bodyScene');
const bodyBg = el('rect', { x: 0, y: 0, width: 1080, height: 1920, fill: '#E5F6EE' }, bodyScene);
for (let i = 0; i < 9; i++) el('circle', { cx: 80 + (i * 197) % 1000, cy: 120 + (i * 331) % 1500, r: 40 + (i * 29) % 70, fill: '#fff', opacity: 0.35 }, bodyScene);
const bodyG = el('g', {}, bodyScene);
const bodyFull = createBody(bodyG, { bg: false });
const pip = $('pip');
const pipRing = el('circle', { cx: 540, cy: 490, r: 196, fill: '#fff' }, pip);
const pipClipId = 'pipclip';
const pipDefs = el('defs', {}, pip);
el('clipPath', { id: pipClipId }, pipDefs).innerHTML = '<circle cx="540" cy="490" r="184"/>';
const pipBg = el('g', { 'clip-path': `url(#${pipClipId})` }, pip);
el('rect', { x: 300, y: 290, width: 480, height: 400, fill: '#E5F6EE' }, pipBg);
const pipInner = el('g', { transform: 'translate(297 82) scale(0.43)' }, pipBg);
const bodyPip = createBody(pipInner, { bg: false });
const pipRim = el('circle', { cx: 540, cy: 490, r: 190, fill: 'none', stroke: '#00A383', 'stroke-width': 14 }, pip);
const pipTagG = el('g', { transform: 'translate(540 700)' }, pip);
pipTagG.innerHTML = `<rect x="-170" y="-34" width="340" height="62" rx="31" fill="#0A3830"/><text x="0" y="9" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="34" fill="#fff">Di dalam tubuh</text>`;


// Kori (maskot asli, tidak diubah)
function makeKori(host) {
  const kori = el('g', {}, host);
  const inner = el('g', {}, kori);
  inner.innerHTML = new DOMParser().parseFromString(KORI_SVG, 'image/svg+xml').documentElement.innerHTML;
  const q = (sel) => inner.querySelector(sel);
  const K = { float: q('.mc-float'), eyesN: q('.mc-eyes-normal'), eyesH: q('.mc-eyes-happy'), mN: q('.mc-mouth-normal'), mH: q('.mc-mouth-happy'), arm: q('.mc-arm-right'), spark: q('.mc-spark'), dots: [...inner.querySelectorAll('.mc-eyes > circle')] };
  return { kori, K };
}
const koriA = makeKori($('kori'));
const koriB = makeKori($('endsvg'));
function poseKori(kk, x, y, s, t, o = {}) {
  const { kori, K } = kk;
  const happy = o.mood === 'happy';
  const bob = Math.sin(t * 2.3) * 6;
  kori.setAttribute('transform', `translate(${x} ${y}) scale(${s})`);
  kori.setAttribute('opacity', o.alpha ?? 1);
  K.float.setAttribute('transform', `translate(0 ${bob.toFixed(1)}) rotate(${((o.tilt || 0) + Math.sin(t * 1.4) * 1.5).toFixed(1)} 160 260)`);
  K.eyesN.setAttribute('opacity', happy ? 0 : 1); K.eyesH.setAttribute('opacity', happy ? 1 : 0);
  K.dots.forEach((c) => c.setAttribute('opacity', happy ? 0 : 1));
  K.mN.setAttribute('opacity', happy ? 0 : 1); K.mH.setAttribute('opacity', happy ? 1 : 0);
  if (K.arm) K.arm.setAttribute('style', `transform-box:fill-box;transform-origin:10% 60%;transform:rotate(${((o.wave || 0) * (Math.sin(t * 9) * 16 - 10) + (o.arm || 0)).toFixed(1)}deg)`);
  if (K.spark) K.spark.setAttribute('opacity', 0.7 + Math.sin(t * 6) * 0.3);
}
const endSvg = $('endsvg');

// ---------- kamera ----------
function setCam(cx, cy, z, jx = 0) {
  cam.setAttribute('transform', `translate(${540 + jx} 960) scale(${z.toFixed(4)}) translate(${-cx.toFixed(2)} ${-cy.toFixed(2)})`);
}

// ---------- pose bantu ----------
const PX = { seat: 440, childSeat: 650 };
const SOFA_CHILD = { x: 650, y: SEAT + 128 * 0.8 };
function parentSeated(t, o = {}) {
  const p = { x: o.x ?? PX.seat, y: 1330, s: 0.9, t, seated: true, ph: 0 };
  return p;
}
const MOUTH = { smile: 'smile', small: 'smallsmile', flat: 'flat', worry: 'worry' };

// ---------- adegan dapur (dipakai juga untuk rewind) ----------
const TAB = { glassX: 1500, jugX: 1735, sachetX: 1620, top: TABLE.top };
const CHILD_TABLE_Y = 1249;
function kitchenState(u) {
  // u: 0..9.4 detik sejak 26.5 (S4a). Kembalikan pose orang tua dan keadaan properti.
  const st = { glassUp: 0, glass: [TAB.glassX, TAB.top], sachetOn: 0, ghost: 0 };
  const walkEnd = 2.4;
  const x = kf(u, [[0, 1120], [walkEnd, 1385]], easeOut);
  const moving = u < walkEnd - 0.05;
  const ph = x * 0.052;
  const P = { x, y: 1380, s: 0.9, flip: 1, t: u * 3, walk: moving ? { phase: ph, amp: clamp(1 - (u / walkEnd - 0.7) / 0.3 * (u / walkEnd > 0.7 ? 1 : 0), 0.15, 1) } : null, turn: 0.8, look: [1, 0.2], lean: moving ? 3 : 0 };
  P.expr = { brow: 'neutral', mouth: 'small' };
  st.ghost = win(u, 0.5, 9.6, 0.6, 0.4);
  // meraih dan mengangkat gelas (3.1..6.0)
  const reach = kf(u, [[3.0, 0], [3.9, 1], [5.9, 1], [6.7, 0]]);
  const lift = kf(u, [[4.0, 0], [4.9, 1], [5.5, 1], [6.1, 0]]);
  st.glassUp = lift;
  const gx = lerp(TAB.glassX, 1530, lift), gy = lerp(TAB.top, 930, lift);
  st.glass = [gx, gy];
  const Pn = wl(P, gx + 36, gy - 22);
  if (u >= 3.0 && u < 6.9) {
    P.armR = { w: Pn, bend: -1 };
    P.armL = { w: [-80, -190] };
    P.look = [lerp(1, 0.7, lift), lerp(0.4, 0.2, lift)];
    P.expr = { brow: 'up', mouth: 'smile' };
  }
  // mengangkat bahu (6.0..9.4)
  const shrug = kf(u, [[6.2, 0], [7.0, 1]]);
  if (u >= 6.2) {
    P.armR = { w: [lerp(100, 135, shrug), lerp(-200, -300, shrug)], bend: 1 };
    P.armL = { w: [lerp(-80, -135, shrug), lerp(-190, -300, shrug)], bend: 1 };
    P.headTilt = 6 * shrug;
    P.look = [1, 0.5];
    P.expr = { brow: 'worry', mouth: 'worry' };
    P.lean = 2 * shrug;
  }
  P.blink = blinkAt(u * 3, 3.4, 0.4);
  return { P, st };
}

// ---------- state utama ----------
const CHIPS = [
  { t0: 0.45, t1: 4.0, cls: 'big', html: 'Dunia tanpa <em>oralit</em>?' },
  { t0: 4.7, t1: 9.1, icon: 'tired', html: 'Anak diare di rumah' },
  { t0: 15.25, t1: 18.2, icon: 'toilet', html: 'Bukan cuma sering ke toilet' },
  { t0: 19.95, t1: 26.4, icon: 'drop', html: 'Air + elektrolit ikut hilang' },
  { t0: 29.65, t1: 32.45, icon: 'check', html: 'Minum &amp; layanan kesehatan: ada' },
  { t0: 32.55, t1: 35.8, icon: 'cross', html: 'Larutan pengganti: tidak ada' },
  { t0: 38.65, t1: 42.8, icon: 'low', cls: 'warn', html: 'Risiko dehidrasi meningkat' },
  { t0: 51.0, t1: 55.7, icon: 'drop', html: 'Oralit: ganti air + elektrolit' },
  { t0: 55.9, t1: 60.5, icon: 'cross', html: 'Bukan obat penghenti diare' },
];
const chipHost = $('chips');
const chipEls = CHIPS.map((c) => {
  const d = document.createElement('div'); d.className = 'chip ' + (c.cls || '');
  d.innerHTML = (c.icon ? `<span class="ic">${ICONS[c.icon]}</span>` : '') + `<span>${c.html}</span>`;
  d.style.display = 'none'; chipHost.appendChild(d); return d;
});
function updateChips(t) {
  CHIPS.forEach((c, i) => {
    const d = chipEls[i];
    const on = t >= c.t0 && t <= c.t1 + 0.25;
    if (!on) { d.style.display = 'none'; return; }
    d.style.display = 'inline-flex';
    const k = easeOutBack(clamp((t - c.t0) / 0.38, 0, 1)), o = clamp((c.t1 + 0.25 - t) / 0.25, 0, 1);
    d.style.opacity = Math.min(1, (t - c.t0) / 0.15) * o;
    d.style.transform = `scale(${lerp(0.7, 1, k).toFixed(3)}) translateY(${lerp(-18, 0, clamp(k, 0, 1)).toFixed(1)}px)`;
  });
}
// legenda S3
const legendHost = $('legendHost');
const LEG = [
  { t0: 20.05, t1: 26.4, x: 40, y: 1290, icon: 'drop', html: 'Air' },
  { t0: 21.25, t1: 26.4, x: 40, y: 1388, icon: 'diamond', html: 'Elektrolit<small>mineral penting bagi tubuh</small>' },
];
const legEls = LEG.map((l) => { const d = document.createElement('div'); d.className = 'legend'; d.style.left = l.x + 'px'; d.style.top = l.y + 'px'; d.innerHTML = `<span class="ic">${ICONS[l.icon]}</span><span>${l.html}</span>`; d.style.display = 'none'; legendHost.appendChild(d); return d; });
function updateLegend(t) {
  LEG.forEach((l, i) => {
    const d = legEls[i]; const on = t >= l.t0 && t <= l.t1 + 0.25;
    d.style.display = on ? 'flex' : 'none';
    if (on) { const k = easeOutBack(clamp((t - l.t0) / 0.38, 0, 1)); d.style.transform = `scale(${lerp(0.6, 1, k).toFixed(3)})`; d.style.opacity = Math.min(1, (t - l.t0) / 0.15) * clamp((l.t1 + 0.25 - t) / 0.25, 0, 1); }
  });
}
// kartu S6
const card = $('card');
const CARD = { t0: 60.95, t1: 78.0 };
const cardRows = [
  { t: 63.6, icon: 'tired', html: 'Sangat lemas' },
  { t: 66.45, icon: 'cupNo', html: 'Tidak mampu minum' },
  { t: 67.8, icon: 'low', html: 'Tanda dehidrasi berat' },
  { t: 70.25, icon: 'clinic', html: 'Segera periksa ke tenaga kesehatan' },
  { t: 72.8, icon: 'iv', html: 'Infus mungkin diperlukan' },
];
card.innerHTML = `<h3 id="cardT1">Banyak kasus: rehidrasi oral membantu</h3><h3 id="cardT2" class="warn" style="display:none">Perlu segera diperiksa bila:</h3>
  <div id="cardRows">${cardRows.map((r, i) => `<div class="row ${r.soft ? 'soft' : ''}" id="cr${i}" style="display:none"><span class="ic">${ICONS[r.icon]}</span><span>${r.html}</span></div>`).join('')}</div>
  <div class="row" id="cOK" style="display:none"><span class="ic">${ICONS.check}</span><span>Anak minum dengan tenang</span></div>`;
function updateCard(t) {
  const on = t >= CARD.t0 && t <= CARD.t1 + 0.3;
  card.style.display = on ? 'block' : 'none';
  if (!on) return;
  const k = easeOutBack(clamp((t - CARD.t0) / 0.45, 0, 1));
  const out = clamp((CARD.t1 + 0.3 - t) / 0.3, 0, 1);
  card.style.opacity = out; card.style.transform = `scale(${lerp(0.85, 1, k).toFixed(3)}) translateY(${lerp(-30, 0, clamp(k, 0, 1)).toFixed(1)}px)`;
  const phase2 = t >= 63.3;
  $('cardT1').style.display = phase2 ? 'none' : 'block';
  $('cardT2').style.display = phase2 ? 'block' : 'none';
  $('cOK').style.display = !phase2 && t > 61.7 ? 'flex' : 'none';
  cardRows.forEach((r, i) => {
    const d = $('cr' + i); const on2 = phase2 && t >= r.t;
    d.style.display = on2 ? 'flex' : 'none';
    if (on2) { const kk = easeOutBack(clamp((t - r.t) / 0.35, 0, 1)); d.style.transform = `scale(${lerp(0.7, 1, kk).toFixed(3)})`; d.style.opacity = clamp((t - r.t) / 0.15, 0, 1); }
  });
}

// takarir
const capBox = $('capbox');
let capIdx = -2;
function updateCaption(t) {
  let idx = -1;
  for (let i = 0; i < DATA.caps.length; i++) if (t >= DATA.caps[i].t0 - 0.04 && t < DATA.caps[i].t1) { idx = i; break; }
  if (idx !== capIdx) {
    capIdx = idx;
    if (idx < 0) { capBox.style.display = 'none'; }
    else { const c = DATA.caps[idx]; capBox.style.display = 'block'; capBox.className = 'box ' + (c.actor === 'O' ? 'par' : ''); capBox.innerHTML = (c.actor === 'O' ? '<span class="who">ORANG TUA</span>' : '') + c.text; }
  }
}

// ---------- render utama ----------
window.renderFrame = function (t) {
  const sc = t < B[1] ? 1 : t < B[2] ? 2 : t < B[3] ? 3 : t < B[5] ? 4 : t < B[6] ? 5 : t < B[7] ? 6 : t < B[8] ? 7 : 8;
  const inBody = t >= B[2] && t < B[3];
  const rewT = t >= T_REW[0] && t < T_REW[1];
  const envO = envAt(DATA.envO, t);
  const isPar = t >= TT('O01').start && t <= TT('O01').end + 0.1 || t >= TT('O02').start && t <= TT('O02').end + 0.1 || t >= TT('O03').start && t <= TT('O03').end + 0.1 || t >= TT('O04').start && t <= TT('O04').end + 0.1;
  const env = isPar ? envO : 0;

  // visibilitas
  cam.setAttribute('opacity', inBody ? 0 : 1);
  bodyScene.setAttribute('opacity', inBody ? 1 : 0);
  let showPip = 0, pipLevel = 1, pipDanger = 0, pipMode = 'off', pipFlow = 0, pipGlass = 0;
  if (t >= 38.6 && t < 42.9) {
    showPip = easeOutBack(clamp((t - 38.65) / 0.4, 0, 1));
    pipLevel = kf(t, [[38.6, 0.5], [42.8, 0.26]], ease); pipDanger = kf(t, [[38.6, 0.5], [41.0, 1]]); pipMode = 'out'; pipFlow = 0.7;
  } else if (t >= 50.65 && t < 60.4) {
    showPip = easeOutBack(clamp((t - 50.7) / 0.4, 0, 1)) * clamp((60.4 - t) / 0.4, 0, 1);
    pipLevel = kf(t, [[52.2, 0.26], [58.2, 0.9]], ease); pipDanger = kf(t, [[52.2, 1], [55.5, 0.2]]); pipMode = 'in';
    pipFlow = win(t, 52.1, 57.8, 0.4, 0.8); pipGlass = pipFlow > 0 ? 1 : 0;
  }
  pip.setAttribute('opacity', showPip > 0 ? clamp(showPip, 0, 1) : 0);
  pip.setAttribute('transform', `translate(540 490) scale(${clamp(showPip, 0, 1.08) || 0.001}) translate(-540 -490)`);
  if (showPip > 0) bodyPip.update({ t, level: pipLevel, danger: pipDanger, mode: pipMode, flow: pipFlow, glass: pipGlass });
  if (inBody) {
    const level = kf(t, [[13.5, 0.95], [18.3, 0.93], [26.0, 0.5]], ease);
    const flow = kf(t, [[18.3, 0], [19.4, 0.4], [23.0, 0.55], [23.4, 1], [26.2, 0.8]], ease);
    bodyFull.update({ t, level, danger: kf(t, [[13.5, 0], [23, 0.2], [26, 0.6]]), mode: 'out', flow, glass: 0 });
    const k = easeOutBack(clamp((t - 13.7) / 0.5, 0, 1));
    bodyG.setAttribute('transform', `translate(540 880) scale(${(0.94 * clamp(k, 0.001, 1.06)).toFixed(3)}) translate(-540 -820)`);
  }

  // --- panggung dunia (hanya bila terlihat) ---
  if (!inBody) renderWorld(t, sc, env, rewT);

  // chips / legenda / kartu / takarir
  updateChips(t); updateLegend(t); updateCard(t); updateCaption(t);

  // Kori
  renderKori(t);

  // transisi: kabur krem di tiap batas adegan
  let fade = 0;
  for (const b of [B[1], B[2], B[3], B[4], B[5] + 2.0, B[6], B[7]]) {
    if (b === B[5] + 2.0) continue;
    fade = Math.max(fade, kf(t, [[b - 0.2, 0], [b - 0.02, 1], [b + 0.02, 1], [b + 0.28, 0]], (x) => x));
  }
  // masuk ke rewind dan keluar dari rewind
  fade = Math.max(fade, kf(t, [[B[5] - 0.2, 0], [B[5] - 0.02, 1], [B[5] + 0.02, 1], [B[5] + 0.28, 0]], (x) => x));
  fade = Math.max(fade, kf(t, [[T_REW[1] - 0.12, 0], [T_REW[1], 0.8], [T_REW[1] + 0.2, 0]], (x) => x));
  $('fade').style.opacity = fade.toFixed(3);
  const rewK = rewT ? clamp(Math.min((t - T_REW[0]) / 0.25, (T_REW[1] - t) / 0.2), 0, 1) : 0;
  $('rew').style.opacity = (rewK * 0.9).toFixed(3);
  $('rew').style.backgroundPositionY = `${(t * 900) % 9}px`;
  $('rewIc').style.opacity = rewK.toFixed(3);
  $('rewIc').textContent = Math.floor(t * 6) % 2 ? '◀◀' : '◀◀ ';
  $('root').style.filter = rewT ? `sepia(${(0.55 * rewK).toFixed(2)}) saturate(${(1 - 0.4 * rewK).toFixed(2)}) contrast(1.05)` : 'none';

  // kartu akhir
  const endK = clamp((t - (B[8] - 0.1)) / 0.6, 0, 1);
  $('end').style.opacity = endK.toFixed(3);
  const logo = document.querySelector('#end .endlogo');
  const lk = easeOutBack(clamp((t - (B[8] + 0.2)) / 0.6, 0, 1));
  logo.style.transform = `scale(${lerp(0.6, 1, lk).toFixed(3)})`; logo.style.opacity = clamp((t - B[8]) / 0.4, 0, 1);
  const tx = document.querySelector('#end .endtxt'); const tk = clamp((t - (B[8] + 0.6)) / 0.5, 0, 1);
  tx.style.opacity = tk; tx.style.transform = `translateY(${lerp(24, 0, ease(tk))}px)`;
  $('logo').style.opacity = t > B[8] - 0.1 ? 0 : 0.95;
  $('cap').style.display = t >= B[8] - 0.4 ? 'none' : 'flex';
  window.__t = t;
};

function renderWorld(t, sc, env, rewT) {
  // nilai default
  let camX = 1650, camY = 960, camZ = 1.34;
  const par = { ...{ x: -999, y: 1380, s: 0.9, t } }; let pp = null; let cp = null;
  halo.setAttribute('opacity', 0);
  // default objek meja
  let sachetState = { on: 1, x: TAB.sachetX, y: TAB.top - 0.78 * 122, rot: 9, s: 0.78 };
  let glassState = { x: TAB.glassX, y: TAB.top, fill: 0, tint: 0, s: 1.2, rot: 0, show: 1 };
  let ghostA = 0, spoonState = null, powderState = null, sparkleState = null;

  // ============ S1: kait ============
  if (sc === 1) {
    const u = t;
    const z = kf(u, [[0, 1.5], [4.25, 3.2]], easeInOut);
    camZ = z; camX = kf(u, [[0, 1690], [4.25, 1655]], easeInOut); camY = kf(u, [[0, 1000], [4.25, 960]], easeInOut);
    pp = { x: -999 }; cp = { x: -999 };
    sparkleState = { x: 1700, y: 905, k: win(u, 1.2, 2.6, 0.3, 0.6) };
    halo.setAttribute('opacity', 0.55); halo.setAttribute('cx', 1665); halo.setAttribute('cy', 940);
  }

  // ============ S2: di rumah ============
  if (sc === 2) {
    const u = t - B[1];
    camX = kf(u, [[0, 560], [9.25, 585]], ease); camY = 1010; camZ = kf(u, [[0, 1.38], [9.25, 1.5]], ease);
    const bl = blinkAt(t, 3.6, 0.3);
    const rub = Math.sin(u * 2.2) * 9;
    const cr = { x: SOFA_CHILD.x - 8, y: SOFA_CHILD.y, s: 0.8, t, seated: true, lean: 9, headTilt: 7, look: [-0.8, 0.5], blink: blinkAt(t, 4.2, 1.1),
      expr: { brow: 'worry', eye: 'sleepy', mouth: 'flat' }, armL: { w: [-26, -92], bend: 1 }, armR: { w: [26, -92], bend: 1 } };
    const pa = { x: PX.seat, y: 1330, s: 0.9, t, seated: true, turn: 0.55, headTilt: 5, look: [0.9, 0.5], lean: 3, blink: bl, env,
      expr: { brow: 'up', mouth: 'small' },
      armR: { w: [300 + rub, -325 + Math.sin(u * 2.2 + 1) * 4], bend: -1, back: true }, armL: { w: [-58, -245], bend: 1 } };
    pp = pa; cp = cr;
    put(parent, 'people'); L.people.appendChild(child.root);
    ghostA = 0;
  }

  // ============ S4a: dapur ============
  if (sc === 4 && t < B[4]) {
    const u = t - B[3];
    const ks = kitchenState(u);
    pp = ks.P; cp = null;
    const g = ks.st; glassState.x = g.glass[0]; glassState.y = g.glass[1]; ghostA = g.ghost;
    sachetState.on = 0;
    put(parent, 'stand'); put(child, 'people');
    cp = { x: -999 };
  }

  // ============ S4b: ruang tamu, O02 + N06 ============
  if (sc === 4 && t >= B[4]) {
    const u = t - B[4];
    camX = 585; camY = 955; camZ = 1.3;
    const sleepy = kf(t, [[38.6, 0], [41, 1]]);
    const sipK = kf(u, [[0.5, 0], [1.3, 1], [2.5, 1]]);
    const cr = { x: SOFA_CHILD.x - 8, y: SOFA_CHILD.y, s: 0.8, t, seated: true, lean: 9, headTilt: 7, look: [-0.8, 0.5], blink: blinkAt(t, 4.2, 1.1),
      expr: { brow: 'worry', eye: 'sleepy', mouth: 'flat' }, armL: { w: [-26, -92], bend: 1 }, armR: { w: [26, -92], bend: 1 } };
    // anak menerima gelas air dan menyesap
    cr.armL = { w: [lerp(-26, -34, sipK), lerp(-92, -190, sipK)], bend: 1, top: true };
    cr.armR = { w: [lerp(26, 18, sipK), lerp(-92, -190, sipK)], bend: 1, top: true };
    cr.expr = { brow: 'worry', eye: sipK > 0.5 && u < 3.0 ? 'closed' : 'sleepy', mouth: sipK > 0.5 && u < 3.0 ? 'sip' : 'flat' };
    const pa = { x: PX.seat, y: 1330, s: 0.9, t, seated: true, turn: 0.55, headTilt: 5, look: [0.9, 0.5], lean: 3, blink: blinkAt(t, 3.6, 0.3), env,
      expr: { brow: 'worry', mouth: u < 2.4 ? 'small' : 'worry' }, armR: { w: [300, -325], bend: -1, back: true }, armL: { w: [-58, -245], bend: 1 } };
    pp = pa; cp = cr;
    put(parent, 'people'); L.people.appendChild(child.root);
    sachetState.on = 0; glassState.show = 0;
    // gelas air di tangan anak
    const hw = child === null ? null : lw(cr, cr.armL.w);
    glassState = { x: hw[0] + 20, y: hw[1] + 20, fill: 0.7, tint: 0, s: 1.1, rot: -8 * sipK, show: sipK > 0.01 ? 1 : 0 };
  }

  // ============ S5: rewind, sachet ada, menyiapkan oralit ============
  if (sc === 5) {
    const u = t - B[5];
    camX = 1650; camY = 960; camZ = 1.34;
    if (rewT) {
      const r = (t - T_REW[0]) / (T_REW[1] - T_REW[0]);
      const uu = 9.4 * (1 - easeInOut(r));
      const ks = kitchenState(uu);
      pp = ks.P; pp.walk = pp.walk ? { phase: -pp.walk.phase * 1.0, amp: pp.walk.amp } : null;
      glassState.x = ks.st.glass[0]; glassState.y = ks.st.glass[1]; ghostA = ks.st.ghost; sachetState.on = 0;
      put(parent, 'stand'); cp = { x: -999 };
      camX = 1650 + Math.sin(t * 40) * 3;
    } else {
      buildS5(t, (o) => { ({ pp, cp, sachetState, glassState, ghostA, spoonState, powderState, sparkleState } = { pp, cp, sachetState, glassState, ghostA, spoonState, powderState, sparkleState, ...o }); });
    }
  }

  // ============ S6: kartu + meja, pelukan, akhir ============
  if (sc === 6) {
    camX = 1650; camY = 940; camZ = 1.32;
    buildS6a(t, (o) => { ({ pp, cp, sachetState, glassState, ghostA, spoonState, powderState, sparkleState } = { pp, cp, sachetState, glassState, ghostA, spoonState, powderState, sparkleState, ...o }); });
  }
  if (sc === 7 || sc === 8) {
    const u = t - B[7];
    // pelukan di sofa lalu kamera bergeser ke sachet di meja
    const pan = easeInOut(clamp((t - 79.9) / 3.5, 0, 1));
    camX = lerp(520, 1655, pan); camY = lerp(1000, 980, pan); camZ = lerp(1.5, 1.7, pan);
    const lean = Math.sin(u * 1.4) * 1.0;
    const pa = { x: 500, y: 1330, s: 0.9, t, seated: true, headTilt: -9, look: [0.1, 0.8], lean: -2, blink: blinkAt(t, 3.9, 0.2),
      expr: { brow: 'happy', eye: 'happy', mouth: 'smile' }, armL: { w: [-46, -252], bend: 1, top: true }, armR: { w: [46, -252], bend: 1, top: true } };
    const cr = { x: 500, y: 1130 + 128 * 0.8 + 30, s: 0.8, t, seated: true, headTilt: 4, look: [0, 0.4], blink: blinkAt(t, 4.4, 1),
      expr: { brow: 'happy', eye: 'closed', mouth: 'smile' }, armL: { w: [-40, -70], bend: 1 }, armR: { w: [40, -70], bend: 1 } };
    pp = pa; cp = cr;
    put(parent, 'people'); L.people.appendChild(child.root);
    sachetState = { on: 1, x: TAB.sachetX, y: TAB.top - 0.78 * 122, rot: 9, s: 0.78 };
    glassState = { x: TAB.glassX, y: TAB.top, fill: 0, tint: 0, s: 1.2, rot: 0, show: 1 };
    const sp = clamp((t - 82.2) / 0.5, 0, 1);
    halo.setAttribute('opacity', 0.55 * sp); halo.setAttribute('cx', TAB.sachetX); halo.setAttribute('cy', 940);
    sparkleState = { x: TAB.sachetX + 90, y: 880, k: win(t, 82.4, 84.4, 0.3, 0.6) };
  }

  setCam(camX, camY, camZ);
  // terapkan pose
  if (pp && pp.x > -900) { pp.t = pp.t ?? t; posePerson(parent, pp); parent.root.setAttribute('opacity', 1); }
  else { parent.root.setAttribute('opacity', 0); parent.overlay.innerHTML = ''; }
  if (cp && cp.x > -900) { cp.t = cp.t ?? t; posePerson(child, cp); child.root.setAttribute('opacity', 1); }
  else { child.root.setAttribute('opacity', 0); child.overlay.innerHTML = ''; }
  // properti
  const ss = sachetState;
  sachet.setAttribute('opacity', ss.on);
  sachet.setAttribute('transform', `translate(${ss.x.toFixed(1)} ${ss.y.toFixed(1)}) rotate(${ss.rot}) scale(${ss.s})`);
  ghost.setAttribute('opacity', ghostA * (0.6 + 0.3 * Math.sin(t * 5)));
  ghost.setAttribute('transform', `translate(${TAB.sachetX} ${TAB.top - 0.78 * 122}) rotate(9) scale(0.78)`);
  const gs = glassState;
  glass.setAttribute('opacity', gs.show);
  glass.setAttribute('transform', `translate(${gs.x.toFixed(1)} ${gs.y.toFixed(1)}) rotate(${gs.rot || 0}) scale(${gs.s})`);
  const fillH = 64 * (gs.fill ?? 0.62);
  glassWater.setAttribute('d', `M${-26.5 + (1 - (gs.fill ?? 0.62)) * 0 } ${-fillH}L26.5 ${-fillH}L25 0Q25 8 17 8L-17 8Q-25 8 -25 0Z`);
  const tint = gs.tint || 0;
  glassWater.setAttribute('fill', tint > 0 ? `rgb(${Math.round(lerp(191, 247, tint))},${Math.round(lerp(231, 231, tint))},${Math.round(lerp(245, 170, tint))})` : '#BFE7F5');
  jug.setAttribute('transform', `translate(${TAB.jugX} ${TAB.top}) scale(1.25)`);
  jug.setAttribute('opacity', 1);
  // sendok dan bubuk
  if (spoonState) { spoon.setAttribute('opacity', 1); spoon.setAttribute('transform', `translate(${spoonState.x.toFixed(1)} ${spoonState.y.toFixed(1)}) rotate(${spoonState.rot.toFixed(1)}) scale(1.1)`); } else spoon.setAttribute('opacity', 0);
  if (powderState) {
    powder.setAttribute('opacity', 1);
    grains.forEach((c, i) => {
      const k = (((powderState.k * 1.6 + i / grains.length) % 1) + 1) % 1;
      c.setAttribute('cx', (powderState.x + (i % 4 - 1.5) * 6 + Math.sin(k * 6 + i) * 3).toFixed(1));
      c.setAttribute('cy', (powderState.y + k * powderState.fall).toFixed(1));
      c.setAttribute('opacity', (clamp(k / 0.1, 0, 1) * clamp((1 - k) / 0.2, 0, 1) * powderState.a).toFixed(2));
    });
  } else powder.setAttribute('opacity', 0);
  if (sparkleState && sparkleState.k > 0) { sparkle.setAttribute('opacity', sparkleState.k); sparkle.setAttribute('transform', `translate(${sparkleState.x} ${sparkleState.y}) scale(${(0.6 + 0.6 * sparkleState.k).toFixed(2)}) rotate(${(t * 40).toFixed(0)})`); } else sparkle.setAttribute('opacity', 0);
}

// ---------- S5 ----------
function buildS5(t, out) {
  const o = {};
  const P0x = 1385;
  let P = { x: P0x, y: 1380, s: 0.9, flip: 1, t, turn: 0.8, look: [1, 0.2], blink: blinkAt(t, 3.4, 0.4), env: (t >= TT('O03').start && t <= TT('O03').end + 0.1) ? envAt(DATA.envO, t) : 0, expr: { brow: 'neutral', mouth: 'small' } };
  // masuk berjalan
  const x = kf(t, [[45.3, 1130], [46.75, P0x]], easeOut);
  const moving = t < 46.75;
  P.x = x;
  if (moving) { P.walk = { phase: x * 0.052, amp: 1 - clamp((t - 46.2) / 0.55, 0, 0.8) }; P.lean = 3; P.armL = { w: [-30, -170], bend: 1 }; }
  // sachet muncul dengan pantulan (N07 kedua: 45.135)
  const popK = clamp((t - 45.15) / 0.5, 0, 1);
  let S = { on: popK > 0 ? 1 : 0, x: TAB.sachetX, y: TAB.top - 0.78 * 122 - (1 - easeOutBack(popK)) * 160, rot: 9, s: 0.78 * clamp(popK * 3, 0, 1) };
  let G = { x: TAB.glassX, y: TAB.top, fill: 0.62, tint: 0, s: 1.2, rot: 0, show: 1 };
  let ghostA = kf(t, [[45.0, 0.6], [45.2, 0]]);
  let spoonState = null, powderState = null, sparkleState = null;
  sparkleState = { x: TAB.sachetX + 85, y: 880, k: win(t, 45.2, 46.6, 0.2, 0.5) };
  // meraih sachet (46.9..47.8) dan mengangkat
  const sachetHand = (pose, arm) => lw(pose, arm.w);
  const grab = kf(t, [[46.8, 0], [47.55, 1]]);
  let sx = TAB.sachetX, sy = TAB.top - 0.78 * 122, srot = 9;
  const showK = kf(t, [[47.6, 0], [48.1, 1], [48.8, 1], [49.5, 0]]); // bawa ke depan dada
  const pourK = kf(t, [[48.75, 0], [49.2, 1], [49.85, 1], [50.3, 0]]);
  const stirK = win(t, 49.9, 50.7, 0.12, 0.1);
  if (t >= 46.8 && t < 50.8) {
    // posisi target tangan kanan (dunia)
    const reachW = [TAB.sachetX + 8, TAB.top - 90];
    const holdW = [1560, 930];
    const readW = [1500, 905];
    const pourW = [TAB.glassX + 20, 885];
    let wxy = reachW;
    if (t > 47.5) wxy = [lerp(reachW[0], holdW[0], ease(clamp((t - 47.5) / 0.6, 0, 1))), lerp(reachW[1], holdW[1], ease(clamp((t - 47.5) / 0.6, 0, 1)))];
    if (t > 48.2) wxy = [lerp(holdW[0], readW[0], ease(clamp((t - 48.2) / 0.5, 0, 1))), lerp(holdW[1], readW[1], ease(clamp((t - 48.2) / 0.5, 0, 1)))];
    if (t > 48.75) { const k = ease(clamp((t - 48.75) / 0.5, 0, 1)); wxy = [lerp(readW[0], pourW[0], k), lerp(readW[1], pourW[1], k)]; }
    P.armR = { w: wl(P, wxy[0], wxy[1]), bend: -1 };
    P.armL = { w: [-70, -200] };
    const rot = kf(t, [[47.4, 9], [47.9, -5], [48.7, -5], [49.25, 95], [49.85, 95], [50.3, 0]]);
    sx = wxy[0] + 10; sy = wxy[1] + 4; srot = rot;
    S = { on: 1, x: sx, y: sy, rot: srot, s: 0.62 + 0.0 * grab };
    if (t > 50.1) { S.on = 1 - clamp((t - 50.2) / 0.3, 0, 1); }
    P.look = t > 47.9 && t < 49.5 ? [0.7, 0.9] : [1, 0.3];
    P.turn = 0.8;
    P.expr = { brow: 'up', mouth: 'small' };
    if (t > 49.1 && t < 49.9) powderState = { x: TAB.glassX + 12, y: 905, k: t - 49.1, fall: 80, a: 1 };
    G.tint = kf(t, [[49.5, 0], [50.9, 1]]);
    if (stirK > 0) spoonState = { x: TAB.glassX + Math.sin(t * 14) * 7, y: TAB.top - 40, rot: Math.sin(t * 14) * 6 };
    if (t > 49.85) { P.armR = { w: wl(P, TAB.glassX + 30, TAB.top - 110 + Math.sin(t * 14) * 5), bend: -1 }; }
    P.lean = 4;
  } else if (t >= 50.8) {
    S.on = 0;
  }
  G.tint = Math.max(G.tint, t >= 50.9 ? 1 : 0);
  // N08: geser gelas ke anak, anak meminum
  const slide = kf(t, [[50.7, 0], [52.0, 1]]);
  const cgrab = kf(t, [[51.8, 0], [52.5, 1]]);
  const mouthK = kf(t, [[52.3, 0], [53.1, 1], [54.5, 1], [55.2, 0], [55.5, 0], [56.1, 0.9], [57.0, 0.9], [57.5, 0]]);
  const childBase = { x: 1900, y: CHILD_TABLE_Y, s: 0.85, t, seated: true, look: [-0.6, 0.2], blink: blinkAt(t, 4.2, 1.1) };
  let C = { ...childBase, lean: 4, headTilt: 5, expr: { brow: 'worry', eye: 'sleepy', mouth: 'flat' } };
  if (t < 46.9) C.expr = { brow: 'worry', eye: 'sleepy', mouth: 'flat' };
  if (t >= 50.7) {
    const gx = lerp(TAB.glassX, 1850, ease(slide));
    G.x = gx; G.y = TAB.top;
    if (slide > 0.05 && t < 52.1) {
      P.armR = { w: wl(P, lerp(TAB.glassX + 30, 1680, ease(slide)), TAB.top - 96), bend: -1 };
      P.lean = 6;
    } else if (t >= 52.1) { P.armR = { w: [100, -190] }; P.lean = 2; P.armL = { w: [-76, -196] }; }
    P.look = [1, 0.1]; P.expr = { brow: 'up', mouth: 'smile' };
    // tangan anak meraih gelas, lalu mengangkat ke mulut
    const toGlass = [wl(C, gx - 28, TAB.top - 34), wl(C, gx + 28, TAB.top - 34)];
    const toMouth = [[-28, -240], [28, -240]];
    const gl = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
    const l1 = gl([-86, -92], toGlass[0], cgrab), r1 = gl([86, -92], toGlass[1], cgrab);
    const m = ease(mouthK);
    C.armL = { w: gl(l1, toMouth[0], m), bend: 1, top: cgrab > 0.85 };
    C.armR = { w: gl(r1, toMouth[1], m), bend: 1, top: cgrab > 0.85 };
    // gelas mengikuti tangan
    if (cgrab > 0.95 || mouthK > 0) {
      const lh = lw(C, C.armL.w), rh = lw(C, C.armR.w);
      G.x = (lh[0] + rh[0]) / 2; G.y = (lh[1] + rh[1]) / 2 + 22; G.rot = -8 * m;
    }
    const happyK = kf(t, [[55.8, 0], [57.2, 1]]);
    C.headTilt = lerp(5, -1, happyK); C.lean = lerp(6, 1, happyK);
    C.expr = { brow: happyK > 0.5 ? 'neutral' : 'worry', eye: mouthK > 0.5 ? 'closed' : happyK > 0.6 ? 'open' : 'sleepy', mouth: mouthK > 0.5 ? 'sip' : happyK > 0.6 ? 'smallsmile' : 'flat' };
    C.look = [-0.7, 0.2];
  }
  Object.assign(o, { pp: P, cp: C, sachetState: S, glassState: G, ghostA, spoonState, powderState, sparkleState });
  put(parent, 'stand'); put(child, 'people');
  out(o);
}

// ---------- S6a ----------
function buildS6a(t, out) {
  const P = { x: 1385, y: 1380, s: 0.9, flip: 1, t, turn: 0.8, look: [1, 0.2], blink: blinkAt(t, 3.4, 0.4), env: (t >= TT('O04').start && t <= TT('O04').end + 0.1) ? envAt(DATA.envO, t) : 0, expr: { brow: 'up', mouth: 'smile' }, lean: 2, armL: { w: [-70, -200] }, armR: { w: [100, -190] } };
  // anak minum dengan tenang (sesekali), orang tua menatap sambil tersenyum
  const cycle = (t - 60.7) % 4.2;
  const mouthK = kf(cycle, [[0, 0], [0.7, 1], [2.2, 1], [2.9, 0]]);
  const gx = 1850;
  const C0 = { x: 1900, y: CHILD_TABLE_Y, s: 0.85, t, seated: true, look: [-0.6, 0.2], blink: blinkAt(t, 4.2, 1.1), headTilt: -1, lean: 1 };
  const gl = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const rest = [wl(C0, gx - 28, TAB.top - 34), wl(C0, gx + 28, TAB.top - 34)];
  const toMouth = [[-28, -240], [28, -240]];
  const m = ease(mouthK);
  const C = { ...C0, armL: { w: gl(rest[0], toMouth[0], m), bend: 1, top: true }, armR: { w: gl(rest[1], toMouth[1], m), bend: 1, top: true },
    expr: { brow: 'neutral', eye: mouthK > 0.5 ? 'closed' : 'open', mouth: mouthK > 0.5 ? 'sip' : 'smallsmile' } };
  const lh = lw(C, C.armL.w), rh = lw(C, C.armR.w);
  const G = { x: (lh[0] + rh[0]) / 2, y: (lh[1] + rh[1]) / 2 + 22, fill: 0.5, tint: 1, s: 1.2, rot: -8 * m, show: 1 };
  // O04: orang tua tegas, mengangkat tangan menunjuk keluar
  const firm = kf(t, [[74.6, 0], [75.1, 1], [77.9, 1], [78.0, 0]]);
  if (firm > 0) {
    P.armR = { w: [lerp(100, 175, firm), lerp(-190, -405, firm)], bend: -1 };
    P.expr = { brow: 'neutral', mouth: 'small' };
    P.headTilt = -3 * firm; P.look = [1, 0.1]; P.lean = 4 * firm;
  }
  P.blink = blinkAt(t, 3.4, 0.4);
  put(parent, 'stand'); put(child, 'people');
  out({ pp: P, cp: C, sachetState: { on: 0, x: 0, y: 0, rot: 0, s: 0.78 }, glassState: G, ghostA: 0, spoonState: null, powderState: null, sparkleState: null });
}

// ---------- Kori ----------
function renderKori(t) {
  let alpha = 0, x = 0, y = 0, s = 0.5, mood = 'normal', wave = 0, tilt = 0;
  if (t >= 14.3 && t < 26.4) { // pemandu di tubuh: menunjuk legenda
    const k = easeOutBack(clamp((t - 14.3) / 0.5, 0, 1)); alpha = clamp(k, 0, 1) * clamp((26.4 - t) / 0.3, 0, 1); x = 800; y = 1340; s = 0.48 * clamp(k, 0.01, 1.1);
    mood = t > 24.3 ? 'normal' : 'normal'; wave = win(t, 20.0, 22.5, 0.2, 0.2); tilt = -4;
  } else if (t >= 45.1 && t < 47.3) { // sachet itu ada
    const k = easeOutBack(clamp((t - 45.2) / 0.45, 0, 1)); alpha = clamp(k, 0, 1) * clamp((47.3 - t) / 0.3, 0, 1); x = 800; y = 1390; s = 0.46 * clamp(k, 0.01, 1.1); mood = 'happy';
  } else if (t >= 52.6 && t < 58.4) { // oralit mengganti cairan
    const k = easeOutBack(clamp((t - 52.7) / 0.45, 0, 1)); alpha = clamp(k, 0, 1) * clamp((58.4 - t) / 0.4, 0, 1); x = 880; y = 1390; s = 0.46 * clamp(k, 0.01, 1.1); mood = 'happy'; wave = 1;
  } else if (t >= 82.3 && t < B[8]) { // penutup halus
    const k = easeOutBack(clamp((t - 82.4) / 0.5, 0, 1)); alpha = clamp(k, 0, 1) * clamp((B[8] - 0.05 - t) / 0.2, 0, 1); x = 90; y = 1300; s = 0.5 * clamp(k, 0.01, 1.1); mood = 'happy'; wave = 1;
  }
  if (alpha <= 0.01) koriA.kori.setAttribute('opacity', 0); else poseKori(koriA, x, y, s, t, { alpha, mood, wave, tilt });
  const ek = easeOutBack(clamp((t - (B[8] + 1.0)) / 0.6, 0, 1));
  if (t >= B[8]) poseKori(koriB, 410, 1290, 0.62 * clamp(ek, 0.01, 1.1), t, { alpha: clamp(ek, 0, 1), mood: 'happy', wave: 1 });
  else koriB.kori.setAttribute('opacity', 0);
}
window.__ready = true;
