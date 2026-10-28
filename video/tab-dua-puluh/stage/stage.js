// Panggung video "Tab Dua Puluh": semua dihitung dari waktu t (detik) sehingga tiap frame deterministik.
import { createNadia, poseNadia, ARMS, createMascot, poseMascot, clamp, lerp, ease } from './chars.js';
import { buildWorld } from './world.js';

const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const DATA = await (await fetch('data.json')).json();
const SVG = { kori: await (await fetch('kori.svg')).text(), kila: await (await fetch('kila.svg')).text(), nilo: await (await fetch('nilo.svg')).text() };
const FPS = DATA.fps;
const WEB_T0 = 12.0, WEB_N = 2396;

// ---------- konstanta panggung ----------
const T_IN = [11.85, 12.55], T_OUT = [90.5, 91.4];
const T_WIPE = [52.15, 52.55, 52.95]; // mulai tutup, tutup penuh (ganti dunia), selesai buka

const world = buildWorld($('world'), $('fore'));
const nadia = createNadia(); $('nadia').appendChild(nadia.root);
const kori = createMascot(SVG.kori, 'kori'); $('mascots').appendChild(kori.root);
const kila = createMascot(SVG.kila, 'kila'); $('mascots').appendChild(kila.root);
const nilo = createMascot(SVG.nilo, 'nilo'); $('mascots').appendChild(nilo.root);
const kori2 = createMascot(SVG.kori, 'kori2'); $('mascots').appendChild(kori2.root); // untuk adegan penutup (cadangan)
kori2.root.setAttribute('opacity', 0);

// ---------- util ----------
const trackAt = (list, t) => {
  let i = 0;
  while (i + 1 < list.length && list[i + 1][0] <= t) i++;
  return { cur: list[i], prev: list[Math.max(0, i - 1)], dt: t - list[i][0] };
};
const blinkAt = (t, period, off) => {
  const ph = ((t + off) % period + period) % period;
  const d = Math.abs(ph - 0.1);
  return d < 0.1 ? 1 - d / 0.1 : 0;
};
const easeOutBack = (x) => { x = clamp(x, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const pop = (t, t0, d = 0.35) => (t < t0 ? 0 : easeOutBack((t - t0) / d));
const win = (t, a, b, fade = 0.2) => clamp((t - a) / fade, 0, 1) * clamp((b - t) / fade, 0, 1);

// ---------- track animasi Nadia ----------
const N_EXPR = [[0, 'panic'], [6.3, 'worried'], [7.7, 'surprised'], [9.9, 'happy'], [12.2, 'surprised'], [13.3, 'worried'], [16.9, 'neutral'], [23.2, 'happy'], [25.4, 'neutral'], [30.1, 'think'], [33.0, 'think'], [36.9, 'aha'], [38.6, 'happy'], [41.4, 'happy'], [48.7, 'grin'], [52.6, 'neutral'], [57.5, 'think'], [60.4, 'neutral'], [65.1, 'nervous'], [69.0, 'worried'], [73.9, 'neutral'], [74.2, 'happy'], [78.6, 'neutral'], [79.0, 'happy'], [84.5, 'think'], [86.9, 'neutral'], [90.9, 'happy'], [91.1, 'grin'], [94.4, 'happy']];
const N_ARMS = [[0, 'panic'], [2.0, 'cheeks'], [3.0, 'panic'], [4.2, 'cheeks'], [5.2, 'panic'], [6.3, 'rest'], [8.0, 'think'], [10.2, 'rest'], [12.2, 'think'], [16.9, 'rest'], [23.2, 'point'], [25.5, 'rest'], [30.1, 'think'], [33.2, 'think'], [36.8, 'cheer'], [38.8, 'rest'], [51.4, 'cheer'], [52.8, 'rest'], [57.6, 'point'], [60.3, 'rest'], [65.2, 'cheeks'], [68.3, 'rest'], [74.2, 'thumb'], [78.6, 'rest'], [84.6, 'point'], [87.0, 'rest'], [91.1, 'cheer'], [94.3, 'rest'], [95.0, 'wave']];
const K_MOOD = [[0, 'normal'], [9.9, 'happy'], [12.0, 'normal'], [37.0, 'happy'], [41.0, 'normal'], [74.3, 'happy'], [78.6, 'normal'], [94.5, 'happy']];

function speakerEnv(f) {
  const a = DATA.envA, b = DATA.envB;
  const g = (arr) => {
    const i = clamp(f, 0, arr.length - 1);
    return (arr[Math.max(0, i - 1)] + arr[i] * 2 + arr[Math.min(arr.length - 1, i + 1)]) / 4;
  };
  return { A: clamp(g(a), 0, 1), B: clamp(g(b), 0, 1) };
}

// ---------- kartu info (pojok tengah) ----------
const CARDS = [
  { t0: 17.1, t1: 22.95, title: 'Cara mulai', rows: [[17.3, '1', 'Pilih mata kuliah'], [19.0, '2', 'Pilih BAB'], [20.9, '!', 'Segera hadir = belum ada soal', 'muted']] },
  { t0: 25.7, t1: 29.9, title: 'Mode Learning', rows: [[26.5, '✓', 'Pembahasan langsung muncul per soal']] },
  { t0: 32.9, t1: 36.85, title: 'Cek jawaban', rows: [[33.3, '✓', 'Pembahasan di tiap pilihan'], [34.9, '✓', 'Bukan cuma kunci']] },
  { t0: 41.5, t1: 52.2, title: 'Coba Simulasi', rows: [[43.8, '1', 'Atur BAB'], [45.2, '2', 'Jumlah soal'], [46.5, '3', 'Mode Learning / Ujian'], [47.6, '4', 'Timer (opsional)']] },
  { t0: 53.45, t1: 57.5, title: 'Simulasi Dokter', rows: [[55.2, '1', 'Pilih poli'], [56.3, '2', 'Pasien diundi']] },
  { t0: 60.7, t1: 65.0, title: 'Alur konsultasi', rows: [[60.8, '1', 'Anamnesis'], [61.7, '2', 'Pemeriksaan fisik'], [62.9, '3', 'Penunjang'], [64.1, '4', 'Diagnosis']] },
  { t0: 69.0, t1: 74.0, title: 'Laporan sesi', rows: [[70.2, '✓', 'Skor'], [71.1, '✓', 'Diagnosis'], [72.3, '✓', 'Urutan tindakan']] },
  { t0: 79.2, t1: 84.2, title: 'Semua tercatat', rows: [[79.8, '✓', 'Progres tiap BAB'], [82.4, '★', 'Leaderboard']] },
  { t0: 87.2, t1: 90.8, title: 'Punya PDF soal?', rows: [[87.6, '1', 'Ajukan lewat Chat Admin'], [89.0, '2', 'Admin periksa dulu'], [90.2, '3', 'Soal tayang']] },
];
let activeCard = -1;
function updateCards(t) {
  const host = $('cards');
  let ci = CARDS.findIndex((c) => t >= c.t0 - 0.05 && t <= c.t1 + 0.25);
  if (ci !== activeCard) {
    activeCard = ci;
    host.innerHTML = '';
    if (ci >= 0) {
      const c = CARDS[ci];
      const d = document.createElement('div'); d.className = 'card';
      d.innerHTML = `<h4>${c.title}</h4>` + c.rows.map(([, b, txt, cls]) => `<div class="row ${cls || ''}"><b>${b}</b><span>${txt}</span></div>`).join('');
      host.appendChild(d);
    }
  }
  if (ci < 0) return;
  const c = CARDS[ci]; const d = host.firstChild;
  const sc = pop(t, c.t0, 0.3), out = clamp((c.t1 + 0.25 - t) / 0.25, 0, 1);
  d.style.transform = `scale(${(0.6 + 0.4 * sc).toFixed(3)})`;
  d.style.opacity = Math.min(clamp(sc * 1.4, 0, 1), out);
  [...d.querySelectorAll('.row')].forEach((r, i) => {
    const at = c.rows[i][0];
    const p = pop(t, at, 0.28);
    r.style.display = p > 0.001 ? 'flex' : 'none';
    r.style.opacity = clamp(p * 1.5, 0, 1);
    r.style.transform = `translateX(${((1 - clamp(p, 0, 1)) * -18).toFixed(1)}px)`;
    const next = c.rows[i + 1] ? c.rows[i + 1][0] : 1e9;
    r.classList.toggle('hl', t >= at && t < next && c.title === 'Alur konsultasi');
  });
}

// ---------- takarir per kata ----------
const CHUNKS = [];
for (const L of DATA.lines) {
  let cur = [], len = 0;
  const flush = () => { if (cur.length) { CHUNKS.push({ words: cur, t0: cur[0].s, t1: cur[cur.length - 1].e }); cur = []; len = 0; } };
  for (const w of L.words) {
    if (len + w.w.length + 1 > 50 && cur.length) flush();
    cur.push(w); len += w.w.length + 1;
    if (/[.?!…]$/.test(w.w) && len >= 22) flush();
  }
  flush();
}
CHUNKS.forEach((c, i) => { const n = CHUNKS[i + 1]; c.show0 = c.t0 - 0.06; c.show1 = Math.max(c.t1 + 0.12, 0); if (n && n.t0 - c.t1 < 0.5 && n.words[0] && false) c.show1 = n.t0; });
let capIdx = -2;
function updateCaption(t) {
  let ci = -1;
  for (let i = 0; i < CHUNKS.length; i++) if (t >= CHUNKS[i].show0 && t <= CHUNKS[i].show1) { ci = i; break; }
  const box = $('capbox');
  if (ci !== capIdx) {
    capIdx = ci;
    if (ci < 0) { box.innerHTML = ''; }
    else {
      const c = CHUNKS[ci];
      box.innerHTML = c.words.map((w, i) => `<span class="w fut" data-i="${i}">${w.w}</span>`).join('');
    }
  }
  $('cap').style.opacity = ci < 0 ? 0 : 1;
  if (ci < 0) return;
  const c = CHUNKS[ci];
  [...box.children].forEach((s, i) => {
    const w = c.words[i];
    const on = t >= w.s && t < w.e;
    s.className = 'w ' + (on ? 'on' : t >= w.e ? 'past' : 'fut');
    s.style.transform = on ? 'scale(1.08)' : 'scale(1)';
  });
}

// ---------- overlay (SVG) ----------
const over = $('over');
const mk = (html, attrs = {}) => { const g = document.createElementNS(NS, 'g'); for (const k in attrs) g.setAttribute(k, attrs[k]); g.innerHTML = html; over.appendChild(g); return g; };
// banner besar hook
const banner = mk(`
  <g id="bn-sticker" transform="translate(540 168) rotate(-5)"><rect x="-190" y="-58" width="380" height="116" rx="34" fill="#E8665F"/><text x="0" y="30" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="86" fill="#fff" letter-spacing="2">GRATIS</text></g>
  <g id="bn-card" transform="translate(540 380)"><rect x="-420" y="-110" width="840" height="220" rx="48" fill="#F8C038"/><rect x="-420" y="86" width="840" height="24" rx="12" fill="#D9A21A" opacity=".55"/>
    <text id="bn-num" x="0" y="52" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="190" fill="#0A3830" letter-spacing="-4">0</text></g>
  <g id="bn-sub" transform="translate(540 536)"><text x="0" y="0" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="60" fill="#fff" stroke="#0A3830" stroke-width="9" paint-order="stroke" stroke-linejoin="round" word-spacing="10">SOAL KEDOKTERAN</text></g>`, { id: 'banner' });
// chip permanen
const chip = mk(`<rect x="-196" y="-27" width="392" height="54" rx="27" fill="#0A3830"/><text x="0" y="11" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="29" fill="#F8C038" letter-spacing=".5">GRATIS · 38.400 SOAL</text>`, { id: 'chip' });
// stiker tab
const tabBadge = mk(`<circle r="86" fill="#E8665F"/><text x="0" y="22" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="84" fill="#fff" id="tb-num">20</text><text x="0" y="60" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="34" fill="#fff" letter-spacing="3">TAB</text>`, { id: 'tabbadge' });
// sticker UTS
const uts = mk(`<rect x="-150" y="-44" width="300" height="88" rx="22" fill="#fff"/><text x="0" y="-4" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="30" fill="#E8665F">UTS 3 HARI LAGI</text><text x="0" y="30" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="700" font-size="24" fill="#5c7078">belum hafal apa-apa…</text>`, { id: 'uts' });
// bohlam aha
const bulb = mk(`<g stroke="#F8C038" stroke-width="9" stroke-linecap="round"><path d="M0 -92v-26M-66 -66l-18 -18M66 -66l18 -18M-82 -10h-26M82 -10h26"/></g>
  <path d="M0 -76a50 50 0 0 0 -28 92c6 6 6 14 6 22h44c0-8 0-16 6-22a50 50 0 0 0 -28 -92z" fill="#FFD66B"/><rect x="-20" y="42" width="40" height="12" rx="6" fill="#0A3830"/><rect x="-14" y="58" width="28" height="9" rx="4.5" fill="#0A3830"/>`, { id: 'bulb' });
// kartu akhir (logo + url)
const endc = mk(`<image href="logo.png" x="-300" y="-82" width="164" height="164"/><text x="-120" y="40" font-family="Plus Jakarta Sans" font-weight="800" font-size="118" fill="#0A3830" letter-spacing="-3">MEDCOEL</text>`, { id: 'endlogo' });
const url = mk(`<rect x="-250" y="-46" width="500" height="92" rx="46" fill="#0A3830"/><text x="0" y="22" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="56" fill="#F8C038">medcoel.com</text>`, { id: 'endurl' });
const cta = mk(`<text x="0" y="0" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="46" fill="#fff" stroke="#0A3830" stroke-width="7" paint-order="stroke" stroke-linejoin="round" word-spacing="12">Mulai dari satu bab dulu</text>`, { id: 'endcta' });
const spark = (n) => Array.from({ length: n }, (_, i) => `<path d="M0 -${10 + i % 3 * 3}Q2 -2 ${10 + i % 3 * 3} 0Q2 2 0 ${10 + i % 3 * 3}Q-2 2 -${10 + i % 3 * 3} 0Q-2 -2 0 -${10 + i % 3 * 3}Z" fill="#F8C038" transform="translate(${Math.cos(i * 2.4) * 120} ${Math.sin(i * 2.4) * 120})"/>`).join('');
const sparks = mk(spark(8), { id: 'sparks' });
const bigchip = mk(`<rect x="-196" y="-27" width="392" height="54" rx="27" fill="#0A3830"/><text x="0" y="11" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="29" fill="#F8C038" letter-spacing=".5">GRATIS · 38.400 SOAL</text>`, { id: 'bigchip' });

const fmt = (n) => Math.round(n).toLocaleString('id-ID');
const tr = (e, x, y, s = 1, r = 0, o = 1) => { e.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r.toFixed(2)}) scale(${s.toFixed(3)})`); e.setAttribute('opacity', clamp(o, 0, 1).toFixed(3)); };

// ---------- render ----------
const webimg = $('webimg');
const place = (root, x, y, s, extra = '') => root.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(4)}) ${extra}`);

async function renderFrame(t) {
  const f = Math.round(t * FPS);
  // faktor mode penuh (1) <-> strip (0)
  let k = 1;
  if (t >= T_IN[0] && t < T_OUT[0]) k = 1 - ease((t - T_IN[0]) / (T_IN[1] - T_IN[0]));
  if (t >= T_OUT[0]) k = ease((t - T_OUT[0]) / (T_OUT[1] - T_OUT[0]));
  if (t >= T_IN[1] && t < T_OUT[0]) k = 0;
  const lorOn = t >= T_WIPE[1];
  const night = t < 20 ? 1 : t < 48 ? lerp(1, 0.2, (t - 20) / 28) : 0.2;
  const tabsN = t < 1.0 ? 6 : t < 2.7 ? lerp(6, 20, ease((t - 1.0) / 1.7)) : 20;
  const shake = t > 2.0 && t < 3.2 ? 3 : 0;
  world.update({ t, k, lor: lorOn, night, tabsN, shake });

  // dialog
  const env = speakerEnv(f);
  const line = DATA.lines.find((l) => t >= l.t0 - 0.02 && t <= l.t1 + 0.02);
  const who = line ? line.who : null;

  // --- Nadia ---
  const ex = trackAt(N_EXPR, t).cur[1];
  const ar = trackAt(N_ARMS, t);
  const aName = ar.cur[1], pName = ar.prev[1];
  const aa = ARMS[aName], pa = ARMS[pName];
  const bl = ease(ar.dt / 0.4);
  const arms = [lerp(pa[0], aa[0], bl), lerp(pa[1], aa[1], bl)];
  const kx = t < 6.4 ? 0 : 1;
  const look = (t > 6.8 && t < 12 && who !== 'A') ? [0.9, 0] : undefined;
  poseNadia(nadia, {
    t, env: env.A * (who === 'A' || !who ? 1 : 0.0), expr: ex, arms, blink: blinkAt(t, 3.7, 0.4),
    wave: aName === 'wave' ? 1 : 0, waveSide: 'L', straps: t >= 90.8, look,
    tilt: t < 6.3 ? Math.sin(t * 9) * 2.2 * clamp(1 - (t - 4.5) / 1.8, 0, 1) : 0,
  });
  const nx = lerp(25, 100, k), ny = lerp(-20, 660, k), ns = lerp(0.95, 1.3, k);
  place(nadia.root, nx, ny, ns);

  // --- Kori (sahabat / pemandu) ---
  const entry = t < 6.35 ? 0 : easeOutBack((t - 6.35) / 0.5);
  const kOff = (1 - clamp(entry, 0, 1.2)) * 720;
  const kmood = trackAt(K_MOOD, t).cur[1];
  const hop = t > 6.35 && t < 7.1 ? Math.sin((t - 6.35) / 0.75 * Math.PI) * 50 : 0;
  poseMascot(kori, { t, env: who === 'B' ? env.B : 0, mood: kmood, blink: blinkAt(t, 4.3, 1.1) > 0.5 ? 1 : 0, wave: (t > 6.6 && t < 8.4) || t > 94.8 ? 1 : 0, tilt: 0, phase: 0.7 });
  const kxx = lerp(652, 560, k), kyy = lerp(178, 892, k), ks = lerp(1.3, 1.5, k);
  place(kori.root, kxx + kOff, kyy - hop, ks);

  // --- kameo maskot kecil (tengah) ---
  const cameo = (m, root, t0, t1, mood, px, extraS = 0.46) => {
    const v = win(t, t0, t1, 0.25) * (1 - k);
    if (v <= 0.001) { root.setAttribute('opacity', 0); return; }
    poseMascot(m, { t, env: 0, mood, blink: blinkAt(t, 3.9, 0.3) > 0.5 ? 1 : 0, phase: px, wave: mood === 'happy' ? 1 : 0 });
    const s = extraS * (0.55 + 0.45 * easeOutBack(Math.min(1, (t - t0) / 0.3)));
    place(root, px - 160 * s, 524 - 285 * s, s);
    root.setAttribute('opacity', v.toFixed(3));
  };
  cameo(kila, kila.root, 36.9, 41.2, 'happy', 540);
  cameo(nilo, nilo.root, 53.5, 78.0, t > 65 && t < 68.5 ? 'think' : 'normal', 540);
  cameo(kila, kila.root, 74.2, 78.6, 'happy', 540);
  kori2.root.setAttribute('opacity', 0);

  // --- panel web ---
  const panel = $('panel');
  const pv = k < 0.999;
  panel.style.display = pv ? 'block' : 'none';
  if (pv) {
    panel.style.transform = `translateY(${(k * 1400).toFixed(1)}px)`;
    const idx = clamp(Math.round((t - WEB_T0) * FPS) + 1, 1, WEB_N);
    const src = `web/${String(idx).padStart(5, '0')}.jpg`;
    if (!webimg.src.endsWith(src)) { webimg.src = src; try { await webimg.decode(); } catch (e) { /* abaikan */ } }
  }

  // --- overlay ---
  // UTS (hook awal)
  tr(uts, 330, 120, 1, -4, win(t, 0.3, 6.3, 0.25) * k);
  // stiker 20 tab
  tr(tabBadge, 520, 960 + Math.sin(t * 5) * 6, 0.9 * (t < 2.0 ? 0 : easeOutBack((t - 2.0) / 0.3)), -8 + Math.sin(t * 7) * 3, win(t, 2.0, 6.4, 0.25) * k);
  const tbn = tabBadge.querySelector('#tb-num'); tbn.textContent = Math.round(tabsN);
  // banner besar
  const bIn = pop(t, 7.6, 0.45), bFade = t < 11.45 ? 1 : 1 - ease((t - 11.45) / 0.4);
  const cnt = clamp((t - 7.7) / 2.0, 0, 1);
  banner.querySelector('#bn-num').textContent = fmt(38400 * ease(cnt));
  const bnOp = (t >= 7.6 && t < 12.0 ? bFade : 0);
  banner.setAttribute('opacity', bnOp.toFixed(3));
  const sc = lerp(0.5, 1, clamp(bIn, 0, 1.15));
  banner.setAttribute('transform', `translate(${(540 * (1 - sc)).toFixed(1)} ${(380 * (1 - sc)).toFixed(1)}) scale(${sc.toFixed(3)})`);
  // banner kedua di outro
  // chip permanen
  const chipV = t >= 12.0 ? clamp((t - 12.0) / 0.3, 0, 1) * (1 - k * 0 ) : 0;
  tr(chip, 540, 52, 0.55 + 0.45 * easeOutBack((t - 12.0) / 0.4), 0, t >= 12.0 && t < 90.6 ? chipV : 0);
  // bohlam aha
  tr(bulb, 190, 100, 0.8 * (t < 36.9 ? 0 : easeOutBack((t - 36.9) / 0.3)), 0, win(t, 36.9, 39.2, 0.2) * (1 - k));
  // outro
  const outV = clamp((t - 91.6) / 0.4, 0, 1) * k;
  const endV = clamp((t - 94.5) / 0.4, 0, 1) * k;
  // banner statis di outro (pakai chip besar)
  tr(endc, 585, 395, 0.9, 0, endV);
  tr(url, 540, 560, 1 * (0.7 + 0.3 * easeOutBack((t - 94.9) / 0.4)), 0, endV);
  tr(cta, 540, 262, 1, 0, endV);
  tr(bigchip, 540, 130, 1.55 * (0.8 + 0.2 * easeOutBack((t - 91.6) / 0.4)), -2, outV);
  sparks.setAttribute('opacity', (win(t, 36.9, 39.6, 0.2) * (1 - k)).toFixed(2));
  sparks.setAttribute('transform', `translate(190 100) scale(${(0.6 + ((t - 36.9) * 0.4)).toFixed(2)}) rotate(${((t - 36.9) * 30).toFixed(1)})`);
  // chip besar saat outro (di atas)


  updateCards(t);
  updateCaption(t);

  // wipe
  let wx = -1200;
  if (t >= T_WIPE[0] && t < T_WIPE[1]) wx = lerp(-1200, 0, ease((t - T_WIPE[0]) / (T_WIPE[1] - T_WIPE[0])));
  else if (t >= T_WIPE[1] && t < T_WIPE[2]) wx = lerp(0, 1200, ease((t - T_WIPE[1]) / (T_WIPE[2] - T_WIPE[1])));
  else if (t >= T_WIPE[2]) wx = 1300;
  $('wipe').style.transform = `translateX(${wx.toFixed(1)}px)`;
  void kx;
}

window.renderFrame = renderFrame;
window.__ready = true;
