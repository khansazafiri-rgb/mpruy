// "Kena gas air mata saat demo?": orkestrasi. renderFrame(t) deterministik (t = detik video).
import { SCENES, setData, setKori, setLogo, clamp, lerp, sm, eo, eob, win, wd, ln } from './scenes.js';
import { createMascot, poseMascot } from './mascot.js';
import { overlay } from './overlay.js';

const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const CLEAN = new URLSearchParams(location.search).has('clean');
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
const DATA = await (await fetch('data.json')).json();
setData(DATA);
const FPS = DATA.fps;
setKori(createMascot(await (await fetch('kori.svg')).text(), 'kori'), poseMascot);
{ const b = await (await fetch('logo-full.webp')).blob(); setLogo(await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); })); }

const world = $('world'), ui = $('ui'), over = $('over');
world.innerHTML = `<defs><clipPath id="clipB"><circle id="clipBc" cx="540" cy="960" r="0"/></clipPath><clipPath id="clipW"><rect id="clipWr" x="1080" y="0" width="1080" height="1920"/></clipPath></defs>
<g id="gA"></g><g id="gB"></g><g id="gTr"></g>`;
const G = { A: $('gA'), B: $('gB'), Tr: $('gTr'), clipBc: $('clipBc'), clipWr: $('clipWr') };
if (CLEAN) { $('cap').style.display = 'none'; }

// ---------------------------------------------------------------- takarir
const SKIPCAP = new Set(['K01', 'K02']); // dua kalimat pembuka tampil sebagai judul besar
const CHUNKS = [];
for (const L_ of DATA.lines) {
  if (SKIPCAP.has(L_.id)) continue;
  let cur = [], len = 0;
  const flush = () => { if (cur.length) { CHUNKS.push({ words: cur, t0: cur[0].s, t1: cur[cur.length - 1].e }); cur = []; len = 0; } };
  for (const w of L_.words) {
    if (len + w.w.length + 1 > 50 && cur.length) flush();
    cur.push(w); len += w.w.length + 1;
    if (/[.?!…]$/.test(w.w) && len >= 16) flush();
  }
  flush();
}
CHUNKS.forEach((c) => { c.show0 = c.t0 - 0.06; c.show1 = c.t1 + 0.16; });
let capIdx = -2;
function updateCaption(t) {
  if (CLEAN) return;
  let ci = -1;
  for (let i = 0; i < CHUNKS.length; i++) if (t >= CHUNKS[i].show0 && t <= CHUNKS[i].show1) { ci = i; break; }
  const box = $('capbox');
  if (ci !== capIdx) {
    capIdx = ci;
    box.innerHTML = ci < 0 ? '' : CHUNKS[ci].words.map((w) => `<span class="w fut">${w.w}</span>`).join('');
  }
  $('cap').style.opacity = ci < 0 ? 0 : 1;
  if (ci < 0) return;
  const c = CHUNKS[ci];
  box.querySelectorAll('.w').forEach((s, i) => { const w = c.words[i]; s.className = 'w ' + (t >= w.s && t < w.e ? 'on' : t >= w.e ? 'past' : 'fut'); });
}

// ---------------------------------------------------------------- render
const sceneAt = (t) => { let i = 0; while (i + 1 < SCENES.length && t >= SCENES[i + 1].t0) i++; return i; };
const flashR = document.createElementNS(NS, 'rect'); flashR.setAttribute('width', 1080); flashR.setAttribute('height', 1920); flashR.setAttribute('fill', '#fff'); flashR.setAttribute('opacity', 0); over.appendChild(flashR);
const streak = document.createElementNS(NS, 'g'); over.appendChild(streak);

const DRIFT = { tidak: 0.05, tubuh: 0.045, peta: 0.05, angka: 0.06, bilas: 0.045 };
function drifted(sc, t) {
  const cur = sc.draw(t);
  if (DRIFT[sc.id]) { // gerak kamera pelan agar adegan infografis tidak terasa diam
    const u = (t - sc.t0) / (sc.t1 - sc.t0), z = 1 + DRIFT[sc.id] * u, dx = Math.sin(t * 0.7) * 7, dy = Math.cos(t * 0.5) * 5;
    const tf = `translate(${(540 + dx).toFixed(1)} ${(960 + dy).toFixed(1)}) scale(${z.toFixed(4)}) translate(-540 -960)`;
    cur.svg = `<g transform="${tf}">${cur.svg}</g>`; cur.ui = `<g transform="${tf}">${cur.ui || ''}</g>`;
  }
  return cur;
}
function renderFrame(t) {
  const i = sceneAt(t), sc = SCENES[i], prev = i > 0 ? SCENES[i - 1] : null;
  const cur = drifted(sc, t);
  let post = cur.post || {};
  let uiExtra = null;
  G.Tr.innerHTML = '';
  streak.innerHTML = '';
  const tr = sc.tr, u = tr && prev ? clamp((t - sc.t0) / tr.d, 0, 1) : 1;
  if (tr && prev && u < 1) {
    const pv = drifted(prev, Math.min(t, prev.t1 - 0.001));
    G.A.innerHTML = pv.svg;
    uiExtra = `<g opacity="${clamp(1 - u * 2.2, 0, 1).toFixed(3)}">${pv.ui || ''}</g>`;
    cur.ui = `<g opacity="${clamp(u * 2 - 0.1, 0, 1).toFixed(3)}">${cur.ui || ''}</g>`;
    G.B.innerHTML = cur.svg;
    if (tr.type === 'iris') {
      G.B.setAttribute('clip-path', 'url(#clipB)');
      G.clipBc.setAttribute('cx', tr.cx ?? 540); G.clipBc.setAttribute('cy', tr.cy ?? 960); G.clipBc.setAttribute('r', (sm(u) * 1700).toFixed(1));
      G.Tr.innerHTML = `<circle cx="${tr.cx ?? 540}" cy="${tr.cy ?? 960}" r="${(sm(u) * 1700).toFixed(1)}" fill="none" stroke="#fff" stroke-width="14" opacity="${(1 - u).toFixed(2)}"/>`;
    } else if (tr.type === 'fade') {
      G.B.removeAttribute('clip-path'); G.B.setAttribute('opacity', sm(u).toFixed(3));
    } else { // whip: tirai geser dari kanan ke kiri
      G.B.setAttribute('clip-path', 'url(#clipW)');
      const x = 1080 * (1 - eo(u));
      G.clipWr.setAttribute('x', x.toFixed(1)); G.clipWr.setAttribute('width', 1200);
      let s = ''; for (let k = 0; k < 9; k++) s += `<rect x="${(x - 60 - k * 90).toFixed(0)}" y="${k * 213}" width="${(120 + 70 * k % 3 * 20)}" height="12" fill="#fff" opacity="${(0.5 * (1 - u)).toFixed(2)}"/>`;
      streak.innerHTML = s + `<rect x="${(x - 10).toFixed(0)}" y="0" width="20" height="1920" fill="#fff" opacity="${(0.7 * (1 - u)).toFixed(2)}"/>`;
    }
    if (tr.type !== 'fade') G.B.setAttribute('opacity', 1);
  } else {
    G.A.innerHTML = cur.svg; G.B.innerHTML = ''; G.B.removeAttribute('clip-path'); G.B.setAttribute('opacity', 1);
  }
  const sat = post.sat ?? 1, bright = post.bright ?? 1;
  world.style.filter = sat === 1 && bright === 1 ? 'none' : `saturate(${sat}) brightness(${bright})`;
  $('vig').style.opacity = (post.vig ?? 0).toFixed(3);
  ui.innerHTML = overlay(t) + (uiExtra || '') + (cur.ui || '');
  updateCaption(t);
}
window.renderFrame = renderFrame;
window.__ready = true;
