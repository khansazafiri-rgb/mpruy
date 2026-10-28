// Orkestrasi: dunia + overlay + takarir + kartu akhir. renderFrame(t) deterministik.
import { buildWorld, tauAt, T } from './scene.js';
import { createMascot, poseMascot } from './mascot.js';
import { clamp, lerp, smooth, smoother } from './chars2.js';

const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
const DATA = await (await fetch('data.json')).json();
const KORI = await (await fetch('kori.svg')).text();
const FPS = DATA.fps;
const world = buildWorld($('wsvg'));
const ui = $('ui'), top = $('top');
const mk = (parent, html, attrs = {}) => { const g = document.createElementNS(NS, 'g'); for (const k in attrs) g.setAttribute(k, attrs[k]); g.innerHTML = html; parent.appendChild(g); return g; };
const FONT = `font-family="Plus Jakarta Sans" font-weight="800"`;
const easeOutBack = (x) => { x = clamp(x, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const win = (t, a, b, fade = 0.25) => clamp((t - a) / fade, 0, 1) * clamp((b - t) / fade, 0, 1);
const set = (g, x, y, s, o, r = 0) => { g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${r.toFixed(2)}) scale(${s.toFixed(3)})`); g.setAttribute('opacity', clamp(o, 0, 1).toFixed(3)); };
const line = (code) => DATA.lines.find((l) => l.code === code);
const wordT = (code, i, edge = 's') => line(code).words[Math.min(i, line(code).words.length - 1)][edge];

// ---------------- label pill (di bawah logo, area aman atas) ----------------
function makePill(lines, { fs = 46, bg = '#fff', fg = '#0A3830', pad = 30, w = 0 } = {}) {
  const g = document.createElementNS(NS, 'g');
  const rect = document.createElementNS(NS, 'rect'); g.appendChild(rect);
  const texts = lines.map((tx, i) => { const t = document.createElementNS(NS, 'text'); t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-family', 'Plus Jakarta Sans'); t.setAttribute('font-weight', '800'); t.setAttribute('font-size', fs); t.setAttribute('fill', fg); t.setAttribute('y', (i * fs * 1.2).toFixed(1)); t.textContent = tx; g.appendChild(t); return t; });
  ui.appendChild(g);
  let maxw = 0; texts.forEach((t) => { maxw = Math.max(maxw, t.getBBox().width); });
  const bw = Math.max(w, maxw + pad * 2), bh = lines.length * fs * 1.2 + pad * 0.7;
  rect.setAttribute('x', -bw / 2); rect.setAttribute('y', -fs * 0.98 - pad * 0.35); rect.setAttribute('width', bw); rect.setAttribute('height', bh); rect.setAttribute('rx', 34); rect.setAttribute('fill', bg);
  const sh = document.createElementNS(NS, 'rect'); sh.setAttribute('x', -bw / 2); sh.setAttribute('y', -fs * 0.98 - pad * 0.35 + 8); sh.setAttribute('width', bw); sh.setAttribute('height', bh); sh.setAttribute('rx', 34); sh.setAttribute('fill', 'rgba(10,56,48,.18)'); g.insertBefore(sh, rect);
  g.setAttribute('opacity', 0);
  return g;
}
const LABELS = [
  { id: 'title', t0: 0.3, t1: 4.45, lines: ['Dunia tanpa', 'kebersihan tangan?'], y: 780, fs: 80, bg: '#0A3830', fg: '#fff', pad: 46 },
  { id: 'l1', t0: 11.7, t1: 15.0, lines: ['Sekitar pasien juga bagian', 'dari lingkungan perawatan'], y: 330, fs: 50 },
  { id: 'l2', t0: 16.4, t1: 19.3, lines: ['Titik = gambaran', 'mikroorganisme'], y: 330, fs: 52, bg: '#FFF1C6' },
  { id: 'l3', t0: 28.0, t1: 30.9, lines: ['Yang berpindah', 'tidak terlihat'], y: 330, fs: 54 },
  { id: 'l4', t0: 31.1, t1: 33.9, lines: ['Risiko infeksi', 'bisa meningkat'], y: 330, fs: 54, bg: '#FFE3DF' },
  { id: 'l5', t0: 41.3, t1: 45.6, lines: ['Kebersihan tangan', 'pada waktu yang tepat'], y: 330, fs: 52, bg: '#DDF5EA' },
  { id: 'l6', t0: 57.3, t1: 60.3, lines: ['Rantai terputus'], y: 330, fs: 60, bg: '#DDF5EA' },
  { id: 'l7', t0: 60.5, t1: 66.9, lines: ['Gambaran risiko,', 'bukan kepastian infeksi'], y: 330, fs: 46, bg: '#fff' },
];
LABELS.forEach((L) => { L.g = makePill(L.lines, L); });

// ---------------- infografik jalur (saat membeku) ----------------
const bedIcon = `<rect x="-64" y="14" width="128" height="26" rx="10" fill="#A9BFBA"/><rect x="-64" y="-12" width="128" height="28" rx="14" fill="#fff"/><circle cx="-38" cy="-28" r="18" fill="#E3AD86"/><rect x="-66" y="-50" width="10" height="92" rx="5" fill="#8FA6A0"/><rect x="-20" y="-16" width="80" height="24" rx="10" fill="#8EC9E8"/><rect x="-24" y="-26" width="86" height="8" rx="4" fill="#C8D3D8"/>`;
const handIcon = `<rect x="-36" y="-6" width="72" height="62" rx="28" fill="#EDB78E"/>${[-30, -12, 6, 24].map((x, i) => `<rect x="${x}" y="${-52 - (i === 1 || i === 2 ? 8 : 0)}" width="16" height="70" rx="8" fill="#EDB78E"/>`).join('')}<ellipse cx="-40" cy="20" rx="12" ry="24" fill="#EDB78E" transform="rotate(30 -40 20)"/>`;
const gloveIcon = `<rect x="-36" y="-6" width="72" height="62" rx="28" fill="#8EC9E8"/>${[-30, -12, 6, 24].map((x, i) => `<rect x="${x}" y="${-52 - (i === 1 || i === 2 ? 8 : 0)}" width="16" height="70" rx="8" fill="#8EC9E8"/>`).join('')}<ellipse cx="-40" cy="20" rx="12" ry="24" fill="#8EC9E8" transform="rotate(30 -40 20)"/><rect x="-40" y="52" width="80" height="24" rx="10" fill="#6FB1D6"/>`;
const NODES = [
  { x: 195, label: ['Lingkungan', 'pasien A'], icon: bedIcon, word: ['N08', 0] },
  { x: 530, label: ['Tangan'], icon: handIcon, word: ['N08', 5] },
  { x: 865, label: ['Pasien B'], icon: bedIcon, word: ['N08', 7] },
];
const info = mk(ui, '', { opacity: 0 });
const infoBG = mk(info, `<rect x="60" y="570" width="920" height="560" rx="52" fill="rgba(10,56,48,.2)"/><rect x="60" y="560" width="920" height="560" rx="52" fill="#fff"/>
  ${[195, 530, 865].map((x) => `<circle cx="${x}" cy="800" r="104" fill="none" stroke="#C9DBD6" stroke-width="6" stroke-dasharray="3 16" stroke-linecap="round"/>`).join('')}`);
const infoArrows = mk(info, `<path d="M310 810 Q362 764 420 810" fill="none" stroke="#E8665F" stroke-width="9" stroke-dasharray="4 16" stroke-linecap="round"/><path d="M640 810 Q695 764 750 810" fill="none" stroke="#E8665F" stroke-width="9" stroke-dasharray="4 16" stroke-linecap="round"/>`);
const nodeG = NODES.map((n) => mk(info, `<circle cx="${n.x}" cy="800" r="104" fill="#EAF5F1"/><g transform="translate(${n.x} 806) scale(1.0)">${n.icon}</g>${n.label.map((tx, i) => `<text x="${n.x}" y="${960 + i * 46}" text-anchor="middle" ${FONT} font-size="40" fill="#0A3830">${tx}</text>`).join('')}`, { opacity: 0 }));
const flowDots = mk(info, Array.from({ length: 6 }, (_, i) => `<circle r="${9 + (i % 3) * 2}" fill="${['#F8C038', '#E8665F', '#8E7CE8'][i % 3]}"/>`).join(''));
const infoTitle = mk(info, `<text x="520" y="650" text-anchor="middle" ${FONT} font-size="44" fill="#E8665F">Jalur perpindahan</text><text x="520" y="1050" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="700" font-size="30" fill="#5c7078">Gambaran risiko, bukan kepastian infeksi</text>`);

// ---------------- sarung tangan ≠ kebersihan tangan ----------------
const glove = mk(ui, `<rect x="-470" y="-112" width="940" height="250" rx="48" fill="rgba(10,56,48,.18)"/><rect x="-470" y="-122" width="940" height="250" rx="48" fill="#fff"/>
  <g transform="translate(-340 -6) scale(1.1)">${gloveIcon}</g><text x="-215" y="34" text-anchor="middle" ${FONT} font-size="120" fill="#E8665F">≠</text>
  <g transform="translate(-92 -10) scale(1.05)">${handIcon}</g><path d="M-10 -86q4 18 22 22q-18 4 -22 22q-4 -18 -22 -22q18 -4 22 -22z" fill="#F8C038"/>
  <text x="70" y="-36" ${FONT} font-size="34" fill="#0A3830">Sarung tangan</text><text x="70" y="8" ${FONT} font-size="34" fill="#E8665F">bukan pengganti</text><text x="70" y="52" ${FONT} font-size="34" fill="#0A3830">kebersihan tangan</text>`, { opacity: 0 });

// ---------------- rantai terputus ----------------
const chain = mk(ui, `<g class="ch-l" transform="translate(-92 0) rotate(-14)"><rect x="-96" y="-34" width="130" height="68" rx="34" fill="none" stroke="#007060" stroke-width="16"/></g>
  <g class="ch-r" transform="translate(92 0) rotate(14)"><rect x="-34" y="-34" width="130" height="68" rx="34" fill="none" stroke="#007060" stroke-width="16"/></g>
  <g class="ch-s" fill="#F8C038"><path d="M0 -44l9 22 22 9-22 9-9 22-9-22-22-9 22-9z"/></g>`, { opacity: 0 });

// ---------------- logo kecil tetap ----------------
const logo = mk(top, `<rect x="-6" y="-6" width="268" height="70" rx="35" fill="#fff" opacity=".94"/><image href="logo.png" x="2" y="-2" width="62" height="62"/><text x="76" y="44" ${FONT} font-size="32" fill="#0A3830" letter-spacing="-.5">MEDCOEL</text>`, {});
set(logo, 54, 142, 1, 1);

// ---------------- Kori ----------------
const kori = createMascot(KORI, 'kori'); top.appendChild(kori.root);

// ---------------- kartu akhir ----------------
const card = mk(top, `<rect x="0" y="0" width="1080" height="1920" fill="#F7F2E4"/>
  <circle cx="540" cy="780" r="420" fill="#DDF5EA"/><circle cx="200" cy="360" r="90" fill="#FFF1C6"/><circle cx="900" cy="1500" r="130" fill="#FFE3DF"/>
  <clipPath id="lg"><rect x="440" y="370" width="200" height="200" rx="48"/></clipPath><rect x="446" y="382" width="200" height="200" rx="48" fill="rgba(10,56,48,.14)"/><image href="logo.png" x="440" y="370" width="200" height="200" clip-path="url(#lg)"/>
  <text x="540" y="660" text-anchor="middle" ${FONT} font-size="86" fill="#0A3830" letter-spacing="-2">MEDCOEL</text>
  <text id="ct1" x="540" y="790" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="56" fill="#0A3830"></text>
  <text id="ct2" x="540" y="862" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="56" fill="#0A3830"></text>`, {});
const N14W = DATA.lines.find((l) => l.code === 'N14').words; // Cerita kedokteran lainnya bareng MEDCOEL.
const ctL = [N14W.slice(0, 3), N14W.slice(3)];
function updateCardText(t) {
  [card.querySelector('#ct1'), card.querySelector('#ct2')].forEach((tx, k) => {
    tx.innerHTML = ctL[k].map((w, i) => `<tspan fill="${t >= w.s && t < w.e ? '#E8665F' : '#0A3830'}">${w.w}${i < ctL[k].length - 1 ? ' ' : ''}</tspan>`).join('');
  });
}
card.setAttribute('opacity', 0);
const koriEnd = createMascot(KORI, 'kori2'); top.appendChild(koriEnd.root);

// ---------------- takarir per kata ----------------
const CHUNKS = [];
for (const L of DATA.lines) {
  if (L.code === 'N14') continue; // teks N14 tampil di kartu akhir dengan sorotan per kata
  let cur = [], len = 0;
  const flush = () => { if (cur.length) { CHUNKS.push({ words: cur, who: L.who, t0: cur[0].s, t1: cur[cur.length - 1].e }); cur = []; len = 0; } };
  for (const w of L.words) {
    if (len + w.w.length + 1 > 46 && cur.length) flush();
    cur.push(w); len += w.w.length + 1;
    if (/[.?!…]$/.test(w.w) && len >= 18) flush();
  }
  flush();
}
CHUNKS.forEach((c) => { c.show0 = c.t0 - 0.06; c.show1 = c.t1 + 0.14; });
let capIdx = -2;
function updateCaption(t) {
  let ci = -1;
  for (let i = 0; i < CHUNKS.length; i++) if (t >= CHUNKS[i].show0 && t <= CHUNKS[i].show1) { ci = i; break; }
  const box = $('capbox');
  if (ci !== capIdx) {
    capIdx = ci;
    if (ci < 0) box.innerHTML = '';
    else {
      const c = CHUNKS[ci];
      box.className = 'box' + (c.who === 'P' ? ' p' : '');
      box.innerHTML = (c.who === 'P' ? '<span class="tag">Perawat</span>' : '') + c.words.map((w, i) => `<span class="w fut" data-i="${i}">${w.w}</span>`).join('');
    }
  }
  $('cap').style.opacity = ci < 0 ? 0 : 1;
  if (ci < 0) return;
  const c = CHUNKS[ci];
  const spans = box.querySelectorAll('.w');
  spans.forEach((s, i) => { const w = c.words[i]; const on = t >= w.s && t < w.e; s.className = 'w ' + (on ? 'on' : t >= w.e ? 'past' : 'fut');  });
}

// ---------------- util kedip & envelope ----------------
const blinkAt = (t, per, off) => { const ph = ((t + off) % per + per) % per; const d = Math.abs(ph - 0.1); return d < 0.1 ? 1 - d / 0.1 : 0; };
const envAt = (arr, f) => { const i = clamp(f, 0, arr.length - 1); return clamp((arr[Math.max(0, i - 1)] + arr[i] * 2 + arr[Math.min(arr.length - 1, i + 1)]) / 4, 0, 1); };

// ---------------- efek layar ----------------
const fxg = mk(top, `<rect id="flash" x="0" y="0" width="1080" height="1920" fill="#fff" opacity="0"/><g id="rw"></g><rect id="dim" x="0" y="0" width="1080" height="1920" fill="#0A3830" opacity="0"/><rect id="wipe" x="0" y="0" width="1080" height="1920" fill="#0A3830" transform="translate(-1200 0)"/>`);
const flash = fxg.querySelector('#flash'), rw = fxg.querySelector('#rw'), dim = fxg.querySelector('#dim'), wipe = fxg.querySelector('#wipe');
ui.insertBefore(dim, ui.firstChild);
// letak ujung efek: dim & flash di bawah UI? (UI di atas) — tidak masalah karena UI hanya muncul bila dibutuhkan


// ================= render =================
async function renderFrame(t) {
  const f = Math.round(t * FPS);
  const spkP = envAt(DATA.envP, f);
  const r = world.render(t, { spk: { P: spkP } });
  const ph = tauAt(t);
  // filter dunia: membeku & putar balik
  const frozen = t >= T.freeze && t < T.rewind[0];
  const rew = t >= T.rewind[0] && t < T.rewind[1];
  const fr = smooth((t - T.freeze) / 0.35) * (1 - smooth((t - T.rewind[0]) / 0.2));
  let filt = '';
  if (frozen || fr > 0) filt = `saturate(${(1 - 0.5 * fr).toFixed(3)}) brightness(${(1 - 0.12 * fr).toFixed(3)})`;
  if (rew) { const k = Math.sin(Math.PI * (t - T.rewind[0]) / (T.rewind[1] - T.rewind[0])); filt = `sepia(${(0.55 * k).toFixed(2)}) hue-rotate(${(-18 * k).toFixed(1)}deg) saturate(${(1 + 0.2 * k).toFixed(2)})`; }
  $('wsvg').style.filter = filt || 'none';
  flash.setAttribute('opacity', (0.55 * Math.max(0, 1 - Math.abs(t - T.freeze) / 0.18)).toFixed(3));
  dim.setAttribute('opacity', (0.22 * fr).toFixed(3));
  // efek putar balik: garis pindai + ikon
  if (rew || (t >= T.rewind[0] - 0.05 && t < T.rewind[1] + 0.1)) {
    const k = Math.sin(Math.PI * clamp((t - T.rewind[0]) / (T.rewind[1] - T.rewind[0]), 0, 1));
    let h = '';
    for (let i = 0; i < 14; i++) { const y = ((i * 151 + t * 900) % 1920); h += `<rect x="0" y="${y.toFixed(0)}" width="1080" height="${(6 + (i % 3) * 5)}" fill="#fff" opacity="${(0.1 * k).toFixed(3)}"/>`; }
    const sx = 540 + Math.sin(t * 40) * 6 * k;
    h += `<g transform="translate(${sx.toFixed(1)} 950) scale(${(1 + 0.12 * Math.sin(t * 18)).toFixed(3)})" opacity="${k.toFixed(3)}"><circle r="130" fill="#0A3830" opacity=".85"/><path d="M10 -52L-44 0L10 52Z M62 -52L8 0L62 52Z" fill="#fff"/></g>`;
    rw.innerHTML = h;
  } else rw.innerHTML = '';

  // pill label
  for (const L of LABELS) {
    const o = win(t, L.t0, L.t1, 0.28);
    const s = 0.82 + 0.18 * easeOutBack((t - L.t0) / 0.35);
    set(L.g, 540, L.y, s, o);
  }
  // infografik
  const io = win(t, 33.9, 38.3, 0.35);
  info.setAttribute('opacity', io.toFixed(3));
  info.setAttribute('transform', `translate(0 ${((1 - io) * 40).toFixed(1)})`);
  NODES.forEach((n, i) => { const t0 = wordT(n.word[0], n.word[1]); const p = easeOutBack((t - (t0 - 0.05)) / 0.4); nodeG[i].setAttribute('opacity', clamp(p * 1.4, 0, 1).toFixed(3)); nodeG[i].setAttribute('transform', `translate(${n.x} 800) scale(${(0.7 + 0.3 * clamp(p, 0, 1.1)).toFixed(3)}) translate(${-n.x} -800)`); });
  infoArrows.setAttribute('opacity', (clamp((t - wordT('N08', 5) + 0.2) / 0.4, 0, 1)).toFixed(3));
  // titik mengalir di panah
  const cs = flowDots.children; const pts = [[310, 810, 362, 764, 420, 810], [640, 810, 695, 764, 750, 810]];
  for (let i = 0; i < cs.length; i++) {
    const seg = pts[i < 3 ? 0 : 1]; const u = (((t * 0.7 + (i % 3) / 3) % 1) + 1) % 1; const v = 1 - u;
    const x = v * v * seg[0] + 2 * v * u * seg[2] + u * u * seg[4], y = v * v * seg[1] + 2 * v * u * seg[3] + u * u * seg[5];
    const show = (i < 3 ? clamp((t - wordT('N08', 5) + 0.1) / 0.3, 0, 1) : clamp((t - wordT('N08', 7) + 0.1) / 0.3, 0, 1));
    cs[i].setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`); cs[i].setAttribute('opacity', show.toFixed(2));
  }
  // sarung tangan
  const go = win(t, line('N11').words[line('N11').words.findIndex((w) => /Sarung/.test(w.w))].s - 0.2, 56.7, 0.3);
  set(glove, 530, 340, 0.66 + 0.28 * easeOutBack((t - 52.6) / 0.4), go);
  // rantai terputus
  const co = win(t, 57.3, 60.3, 0.3);
  const gap = smooth((t - 57.6) / 0.6) * 46;
  const cl = chain.querySelector('.ch-l'), cr = chain.querySelector('.ch-r');
  cl.setAttribute('transform', `translate(${(-92 - gap).toFixed(1)} ${(Math.sin(t * 5) * 3).toFixed(1)}) rotate(${(-14 - gap * 0.4).toFixed(1)})`);
  cr.setAttribute('transform', `translate(${(92 + gap).toFixed(1)} ${(Math.cos(t * 5) * 3).toFixed(1)}) rotate(${(14 + gap * 0.4).toFixed(1)})`);
  chain.querySelector('.ch-s').setAttribute('transform', `scale(${(0.6 + 0.5 * Math.abs(Math.sin(t * 6))).toFixed(2)}) rotate(${(t * 40).toFixed(0)})`);
  chain.querySelector('.ch-s').setAttribute('opacity', smooth((t - 57.9) / 0.4));
  set(chain, 540, 480, 0.8 + 0.2 * easeOutBack((t - 57.3) / 0.35), co * (t >= 57.3 ? 1 : 0));
  // Kori kecil (adegan 6)
  const ko = win(t, 57.4, 66.9, 0.35);
  poseMascot(kori, { t, env: 0, mood: t > 60 ? 'happy' : 'normal', blink: blinkAt(t, 4.1, 0.8) > 0.5 ? 1 : 0, wave: t > 57.6 && t < 59.2 ? 1 : 0, phase: 0.3 });
  set(kori.root, 800, 1130, 0.78 * (0.6 + 0.4 * easeOutBack((t - 57.4) / 0.4)), ko);
  // kartu akhir
  const cu = smoother((t - 66.9) / 0.6);
  card.setAttribute('opacity', cu.toFixed(3));
  card.setAttribute('transform', `translate(0 ${((1 - cu) * 120).toFixed(1)})`);
  poseMascot(koriEnd, { t, env: line('N14') && t >= line('N14').t0 && t <= line('N14').t1 ? envAt(DATA.envN, f) : 0, mood: 'happy', blink: blinkAt(t, 3.7, 0.2) > 0.5 ? 1 : 0, wave: t > 68 ? 1 : 0, phase: 0 });
  set(koriEnd.root, 540 - 160 * 1.5, 1135 - 160 * 1.5, 1.5 * (0.8 + 0.2 * easeOutBack((t - 67.1) / 0.5)), cu);
  // logo kecil: tetap, sembunyi saat kartu akhir menutup
  logo.setAttribute('opacity', (1 - cu).toFixed(3));
  // wipe antar-adegan (pemotongan hook -> ruang A)
  let wx = -1200;
  if (t >= T.cut[0] && t < T.cut[1]) wx = lerp(-1200, 0, smooth((t - T.cut[0]) / (T.cut[1] - T.cut[0])));
  else if (t >= T.cut[1] && t < T.cut[2]) wx = lerp(0, 1200, smooth((t - T.cut[1]) / (T.cut[2] - T.cut[1])));
  else if (t >= T.cut[2]) wx = 1300;
  wipe.setAttribute('transform', `translate(${wx.toFixed(1)} 0)`);
  updateCardText(t);
  updateCaption(t);
  return r;
}
window.renderFrame = renderFrame;
window.__ready = true;
