// Panggung video "Bayangin kamu jadi anak FK". Semua dihitung dari waktu t (detik), jadi tiap frame deterministik.
// Raka digambar dari brand/characters/raka/raka.js (karakter kanonik); footage web adalah rekaman nyata dari kode repo.
import { raka, rakaSvg, lerpState, idle, ease as rEase } from '/brand/characters/raka/raka.js';
import { C, clamp, lerp, ease, easeOut, backOut, pop, seg, win, r1, g, rect, circ, txt, hand, sparkle } from './lib.js';
import { sceneHook, sceneChat, sceneMonth1, sceneMonth2, sceneYear1, sceneYear2, sceneMoney, sceneRelief, sceneFinal } from './scenes.js';

const $ = (id) => document.getElementById(id);
const D = await (await fetch('data.json')).json();
const Q = await (await fetch('question.json')).json();
const FPS = D.fps;
const NS = 'http://www.w3.org/2000/svg';
const normTok = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/* ---------- jangkar kata ---------- */
function at(clip, phrase) {
  const P = phrase.split(/\s+/).map(normTok), ws = D.words.filter((w) => w.clip === clip);
  for (let i = 0; i + P.length <= ws.length; i++) if (P.every((p, k) => normTok(ws[i + k].w) === p)) return ws[i].s;
  throw new Error(`frasa tidak ditemukan: ${clip} "${phrase}"`);
}

/* ---------- Raka ---------- */
function stateAt(keys, t) {
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1][0] <= t) i += 1;
  const mk = (k) => raka(k[1], k[2], k[3] || {});
  const cur = mk(keys[i]);
  if (i === 0) return cur;
  return lerpState(mk(keys[i - 1]), cur, ease((t - keys[i][0]) / 0.42));
}
const envAt = (arr, t) => { const f = clamp(Math.round(t * FPS), 0, arr.length - 1); return (arr[Math.max(0, f - 1)] + arr[f] * 2 + arr[Math.min(arr.length - 1, f + 1)]) / 4; };
let CUR_T = 0;
function rk(keys, { x = 0, y = 0, s = 1, uid = 'rk', speak = null, flip = false } = {}) {
  const t = CUR_T;
  let st = idle(stateAt(keys, t), t + (uid === 'ph' ? 0.7 : 0));
  const e = envAt(D.envR, t);
  const talking = speak === null ? uid === 'rk' : speak;
  if (talking && e > 0.04) { st = JSON.parse(JSON.stringify(st)); const o = clamp(e, 0, 1.15); st.mouth.lo = st.mouth.lo + o * 22; st.mouth.up = st.mouth.up - o * 4; st.mouth.w = st.mouth.w + o * 2; }
  if (flip) st.flip = 1;
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})">${rakaSvg(st, { bare: true, shadow: false, uid })}</g>`;
}

/* ---------- takarir ---------- */
function phrases() {
  const out = [];
  for (const cid of D.order) {
    const ws = D.words.filter((w) => w.clip === cid); let cur = [];
    const flush = () => { if (cur.length) { out.push({ clip: cid, words: cur, s: cur[0].s, e: cur[cur.length - 1].e }); cur = []; } };
    ws.forEach((w, i) => {
      cur.push(w);
      const len = cur.map((x) => x.w).join(' ').length, end = /[.!?]$/.test(w.w), comma = /,$/.test(w.w);
      const next = ws[i + 1];
      if (end || (comma && len >= 16) || len >= 30 || (next && len + next.w.length > 36)) flush();
    });
    flush();
  }
  return out;
}
const PH = phrases();
function captionHtml(t) {
  let idx = -1;
  for (let i = 0; i < PH.length; i++) { if (t >= PH[i].s - 0.04) idx = i; else break; }
  if (idx < 0) return null;
  const p = PH[idx], nxt = PH[idx + 1];
  const holdEnd = Math.min(p.e + 0.45, nxt ? nxt.s - 0.02 : 1e9);
  if (t > holdEnd) return null;
  const isR = p.clip[0] === 'R';
  const html = (isR ? `<div class="tag">Raka</div><br>` : '') + p.words.map((w) => {
    const cls = t >= w.s - 0.02 && t < w.e + 0.1 ? 'on' : (t >= w.e + 0.1 ? 'past' : 'fut');
    return `<span class="w ${cls}">${w.w.replace(/[.!?]+$/, (m) => m)}</span>`;
  }).join('');
  return { html, cls: isR ? 'box r' : 'box n' };
}

/* ---------- kartu waktu ---------- */
const CARDS = [
  { t0: at('N03', 'Bulan pertama') - 0.1, t1: at('N03', 'Bulan pertama') + 2.4, label: 'Bulan pertama', sub: 'berlalu' },
  { t0: at('N04', 'Bulan kedua') - 0.05, t1: at('N04', 'Bulan kedua') + 2.4, label: 'Bulan kedua', sub: '' },
  { t0: at('N05', 'Akhir tahun') - 0.05, t1: at('N05', 'Akhir tahun') + 2.7, label: 'Akhir tahun pertama', sub: '' },
  { t0: at('N05', 'Masuk tahun') - 0.1, t1: at('N05', 'Masuk tahun') + 2.5, label: 'Tahun kedua', sub: '' },
];
function cardsSvg(t) {
  let s = '';
  for (const c of CARDS) {
    if (t < c.t0 || t > c.t1 + 0.4) continue;
    const pin = backOut((t - c.t0) / 0.45), pout = seg(t, c.t1, c.t1 + 0.35);
    const w = 120 + c.label.length * 40;
    const y = lerp(-170, 78, clamp(pin, 0, 1.08)) - pout * 220;
    s += g(`<rect x="${-w / 2}" y="0" width="${w}" height="132" rx="44" fill="#fff" stroke="${C.forest}" stroke-width="5"/><rect x="${-w / 2 + 18}" y="18" width="96" height="96" rx="30" fill="${C.green}"/>`
      + `<rect x="${-w / 2 + 38}" y="40" width="56" height="52" rx="10" fill="#fff"/><rect x="${-w / 2 + 38}" y="40" width="56" height="16" rx="8" fill="${C.gold}"/><circle cx="${-w / 2 + 58}" cy="70" r="5" fill="${C.green}"/><circle cx="${-w / 2 + 76}" cy="70" r="5" fill="${C.green}"/>`
      + txt(c.label, -w / 2 + 130 + (w - 148) / 2, 86, { size: 56, fill: C.forest, weight: 800 }), { x: 540, y });
  }
  return s;
}

/* ---------- footage web ---------- */
const WEB = {
  p1: { n: 184, t0: 80.9 }, a: { n: 100, t0: 89.3 }, p2: { n: 644, t0: 91.9 },
};
const imgEl = $('webimg'), wrap = $('webwrap');
const loaded = {};
async function setWebFrame(take, t) {
  const m = WEB[take], f = clamp(Math.round((t - m.t0) * FPS), 0, m.n - 1);
  const src = `web/${take}/${String(f).padStart(5, '0')}.jpg`;
  if (imgEl.getAttribute('src') !== src) { imgEl.src = src; try { await imgEl.decode(); } catch (e) { /* frame ada tapi belum siap */ } }
}
const WEBBOX = { x: 36, y: 262, w: 1008, h: 1239 };
function webBackdrop(t) {
  let s = rect(0, 0, 1080, 1920, C.forest);
  // pola titik halus
  for (let i = 0; i < 40; i++) s += circ(((i * 211) % 1080), ((i * 389) % 1920), 5 + (i % 3) * 2, 'rgba(157,224,189,.08)');
  return s;
}
const AV = { cx: 150, cy: 134, r: 104 };
function avatar(keys, t, big = false) {
  const clip = `<clipPath id="avclip"><circle cx="${AV.cx}" cy="${AV.cy}" r="${AV.r}"/></clipPath>`;
  const body = g(rk(keys, { x: AV.cx - 200 * 0.66, y: AV.cy - 235 * 0.66 + 14, s: 0.66, uid: 'rk' }), {});
  return `<defs>${clip}</defs>${circ(AV.cx, AV.cy, AV.r + 8, '#fff')}${circ(AV.cx, AV.cy, AV.r, '#CFE8F3')}<g clip-path="url(#avclip)">${body}</g>`;
}
function chip(label, t0, t1, x = 300, y = 70, color = '#fff', ink = C.forest) {
  const p = pop(t, t0, 0.35) * (1 - seg(t, t1 - 0.2, t1));
  if (p <= 0.01) return '';
  const w = 70 + label.length * 24;
  return g(rect(0, 0, w, 96, color, 36, 'stroke="rgba(10,56,48,.16)" stroke-width="3"') + txt(label, w / 2, 66, { size: 44, fill: ink }), { x: x - (clamp(1 - p, 0, 1)) * 40, y, o: clamp(p, 0, 1), s: clamp(p, 0, 1.04), ox: 0, oy: 48 });
}
let t = 0;

/* ---------- pemilihan adegan ---------- */
const B = {   // batas adegan (detik)
  hookEnd: D.clips.N02.start - 0.05, chatEnd: D.clips.N03.start - 0.05, m1End: D.clips.N04.start - 0.04, m2End: D.clips.N05.start - 0.06,
  y1End: at('N05', 'Masuk tahun') - 0.45, y2End: D.clips.N06.start - 0.06, moneyEnd: D.clips.N07.start - 0.06,
  p1End: at('N07', 'Tanpa harus') - 0.12, reliefEnd: at('N07', 'Kenalin') - 0.18, landEnd: at('N07', 'Pilih mata') - 0.22, p2End: D.clips.R06.end + 0.1,
};
const bounds = [B.hookEnd, B.chatEnd, D.anchors.malam, B.m1End, B.m2End, B.y1End, B.y2End, B.moneyEnd, B.p1End, B.reliefEnd, B.landEnd, B.p2End];
function wipeX(t) {
  // panel hijau menyapu layar di sekitar tiap batas adegan (menutup 0.16 dtk sebelum, membuka 0.16 sesudah)
  for (const b of bounds) {
    if (t >= b - 0.17 && t < b) return lerp(-1100, 0, easeOut(seg(t, b - 0.17, b)));
    if (t >= b && t < b + 0.17) return lerp(0, 1100, ease(seg(t, b, b + 0.17)));
  }
  return -1200;
}

function webScene(take, keysAv, extra) {
  const x = WEBBOX;
  return { svg: webBackdrop(t) + extra, web: { take, box: x }, avatar: keysAv };
}
function buildFrame(tt) {
  t = tt; CUR_T = tt;
  const X = { t, D, rk, at, q: Q, W: 1080, H: 1920 };
  let sc;
  if (t < B.hookEnd) sc = sceneHook(X);
  else if (t < B.chatEnd) sc = sceneChat(X);
  else if (t < B.m1End) sc = sceneMonth1(X);
  else if (t < B.m2End) sc = sceneMonth2(X);
  else if (t < B.y1End) sc = sceneYear1(X);
  else if (t < B.y2End) sc = sceneYear2(X);
  else if (t < B.moneyEnd) sc = sceneMoney(X);
  else if (t < B.p1End) {
    const ch = chip('Coba jawab', at('N07', 'mencoba,'), at('N07', 'salah,') - 0.1) + chip('Salah? Tidak apa-apa', at('N07', 'salah,'), at('N07', 'membaca') - 0.05) + chip('Baca alasannya', at('N07', 'membaca'), at('N07', 'lalu mencoba') - 0.05) + chip('Coba lagi', at('N07', 'lalu mencoba'), B.p1End + 0.1);
    sc = webScene('p1', [[0, 'berpikir', 'netral', { gazeX: 0.2 }], [83.3, 'sedih', 'netral', {}], [84.1, 'berpikir', 'netral', { gazeX: 0.3, gazeY: 0.4 }], [85.6, 'netral', 'netral', {}]], ch);
  } else if (t < B.reliefEnd) sc = sceneRelief(X);
  else if (t < B.landEnd) {
    const kenal = at('N07', 'Kenalin'), grat = at('N07', 'Gratis');
    const lg = pop(t, kenal, 0.5), gp = pop(t, grat - 0.1, 0.4);
    const logo = g(`<rect x="-16" y="-12" width="492" height="112" rx="34" fill="#fff"/><image href="/apps/web/src/assets/logo-full.webp" x="0" y="0" width="460" height="92.5"/>`, { x: 290, y: 84, o: clamp(lg, 0, 1), s: clamp(lg, 0, 1.04), ox: 0, oy: 50 });
    const gr = g(rect(0, 0, 210, 92, C.coral, 46) + txt('Gratis', 105, 66, { size: 54, fill: '#fff' }), { x: 880, y: 88, o: clamp(gp, 0, 1), s: clamp(gp, 0, 1.1), r: -6, ox: 105, oy: 46 });
    sc = webScene('a', [[0, 'netral', 'netral', {}], [kenal, 'senang', 'netral', {}]], logo + (gp > 0 ? gr : '') + (gp > 0 ? sparkle(1010, 90, 0.9, C.gold, clamp(gp, 0, 1)) : ''));
  } else if (t < B.p2End) {
    const L = [['Pilih mata kuliah & bab', at('N07', 'Pilih mata'), at('N07', 'kerjakan') - 0.05], ['Kerjakan soal', at('N07', 'kerjakan'), at('N07', 'lalu baca') - 0.05], ['Baca pembahasan', at('N07', 'lalu baca'), at('N07', 'Simulasi') - 0.4],
      ['Simulasi Dokter', at('N07', 'Simulasi') - 0.4, at('N07', 'Kamu nggak') - 0.2], ['Pelan-pelan saja', at('N07', 'Kamu nggak'), at('N07', 'Mulai dari') - 0.05], ['Mulai dari satu bab', at('N07', 'Mulai dari'), at('N07', 'satu soal,')],
      ['Satu soal dulu', at('N07', 'satu soal,'), D.clips.R06.start - 0.05], ['Mulai dari bab yang bikin bingung', D.clips.R06.start + 0.1, B.p2End + 0.2]];
    const ch = L.map(([a, s0, s1]) => chip(a, s0, s1)).join('');
    const r6 = D.clips.R06.start;
    sc = webScene('p2', [[0, 'netral', 'netral', {}], [at('N07', 'lalu baca'), 'berpikir', 'netral', { gazeX: 0.3, gazeY: 0.4 }], [at('N07', 'Simulasi'), 'senang', 'netral', { wide: 0.2 }], [at('N07', 'Kamu nggak'), 'netral', 'netral', {}], [at('N07', 'Mulai dari'), 'senang', 'netral', {}], [r6 - 0.1, 'menunjuk', 'menunjuk', {}]], ch);
  } else sc = sceneFinalWrapper(X);
  return sc;
}

function endCard(X) {
  const t0 = at('N08', 'Belajar') - 0.5;
  const p = pop(t, t0, 0.6);
  let s = rect(0, 0, 1080, 1920, C.forest);
  for (let i = 0; i < 40; i++) s += circ(((i * 211) % 1080), ((i * 389) % 1920), 5 + (i % 3) * 2, 'rgba(157,224,189,.08)');
  s += g(rect(-20, -16, 700, 150, '#fff', 44) + `<image href="/apps/web/src/assets/logo-full.webp" x="0" y="0" width="660" height="132.7"/>`, { x: 540, y: 250, o: clamp(p, 0, 1), s: clamp(p, 0, 1.04), ox: 340, oy: 60 });
  const p2 = pop(t, t0 + 0.55, 0.5);
  s += g(txt('Belajar gratis,', 0, 0, { size: 84, fill: '#fff' }) + txt('dengan ritmemu sendiri.', 0, 104, { size: 84, fill: C.gold }), { x: 540, y: 560 + (1 - clamp(p2, 0, 1)) * 30, o: clamp(p2, 0, 1) });
  const p3 = pop(t, t0 + 1.2, 0.5);
  s += g(rect(0, 0, 420, 84, 'rgba(255,255,255,.12)', 42) + txt('medcoel.com', 210, 58, { size: 46, fill: C.mint, weight: 700 }), { x: 330, y: 740, o: clamp(p3, 0, 1) });
  return s + rk([[0, 'senang', 'sapa', {}]], { x: 540 - 200 * 0.95, y: 1590 - 778 * 0.95, s: 0.95, uid: 'rk' });
}
function sceneFinalWrapper(X) {
  const t0 = at('N08', 'Belajar') - 0.5;
  if (t < t0) return sceneFinal(X);
  return { svg: endCard(X) };
}

/* ---------- komposisi frame ---------- */
const world = $('world'), over = $('over'), capbox = $('capbox');
window.renderFrame = async (tt) => {
  const sc = buildFrame(tt);
  world.innerHTML = sc.svg;
  let ov = cardsSvg(tt);
  if (sc.web) {
    const b = sc.web.box;
    wrap.style.cssText = `display:block;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;border-radius:44px;box-shadow:0 14px 0 rgba(0,0,0,.25);border:8px solid #fff;box-sizing:border-box`;
    await setWebFrame(sc.web.take, tt);
    ov += avatar(sc.avatar, tt);
  } else wrap.style.display = 'none';
  over.innerHTML = ov + (sc.over || '');
  const cap = captionHtml(tt);
  const capEl = $('cap');
  if (cap) { capEl.style.display = 'flex'; capbox.className = cap.cls; capbox.innerHTML = cap.html; } else capEl.style.display = 'none';
  $('fade').style.cssText = `transform:translateX(${wipeX(tt)}px);opacity:1;background:${C.forest}`;
};
window.__ready = true;
