// "Kok dia sekali dengar langsung paham?": orkestrasi. renderFrame(t) deterministik (t = detik video).
// Satu lapisan SVG berisi adegan (Raka, Grelin, Jambi) + takarir HTML per kata. Tanpa rekaman web.
import { setKori, setLogo, clamp, sm, eo } from './core.js';
import { ALL as SCENES, FLASH_AT } from './timeline.js';
import { createMascot, poseMascot } from './mascot.js';
import { beginFrame, endFrame, loads } from './panels.js';

const $ = (id) => document.getElementById(id);
const CLEAN = new URLSearchParams(location.search).has('clean');
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
const DATA = await (await fetch('data.json')).json();
setKori(createMascot(await (await fetch('kori.svg')).text(), 'kori'), poseMascot);
{ const b = await (await fetch('logo-full.webp')).blob(); setLogo(await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); })); }

// ---------------------------------------------------------------- takarir
const CHUNKS = [];
for (const L_ of DATA.lines) {
  let cur = [], len = 0;
  const flush = () => { if (cur.length) { CHUNKS.push({ words: cur, t0: cur[0].s, t1: cur[cur.length - 1].e }); cur = []; len = 0; } };
  for (const w of L_.words) { if (len + w.w.length + 1 > 40 && cur.length) flush(); cur.push(w); len += w.w.length + 1; if (/[.?!…]$/.test(w.w) && len >= 12) flush(); }
  flush();
}
CHUNKS.forEach((c, i) => { c.show0 = c.t0 - 0.06; c.show1 = c.t1 + 0.16; const n = CHUNKS[i + 1]; if (n && c.show1 > n.t0 - 0.06) c.show1 = n.t0 - 0.06; });
let capIdx = -2;
function updateCaption(t) {
  if (CLEAN) { $('cap').style.display = 'none'; return; }
  let ci = -1;
  for (let i = 0; i < CHUNKS.length; i++) if (t >= CHUNKS[i].show0 && t <= CHUNKS[i].show1) { ci = i; break; }
  const box = $('capbox');
  if (ci !== capIdx) { capIdx = ci; box.innerHTML = ci < 0 ? '' : CHUNKS[ci].words.map((w) => `<span class="w fut">${w.w}</span>`).join(''); }
  $('cap').style.opacity = ci < 0 ? 0 : 1;
  if (ci < 0) return;
  const c = CHUNKS[ci];
  box.querySelectorAll('.w').forEach((s, i) => { const w = c.words[i]; s.className = 'w ' + (t >= w.s && t < w.e ? 'on' : t >= w.e ? 'past' : 'fut'); });
}

// ---------------------------------------------------------------- adegan dan transisi
const world = $('world'), gA = $('gA'), gB = $('gB'), gTr = $('gTr');
const clipBc = $('clipBc'), clipWr = $('clipWr');
async function renderFrame(t) {
  beginFrame();
  let idx = 0; for (let i = 0; i < SCENES.length; i++) if (SCENES[i].t0 <= t) idx = i;
  const cs = SCENES[idx], prev = idx ? SCENES[idx - 1] : null, tr = cs.tr;
  const u = tr && prev ? clamp((t - cs.t0) / tr.d, 0, 1) : 1;
  const ovEl = $('ov'); let ovs = '';
  const norm = (r) => { if (r && typeof r === 'object') { ovs += r.ov || ''; return r.w || ''; } return r || ''; };
  const cur = norm(cs.draw(t));
  if (u < 1 && prev) {
    const pv = norm(prev.draw(Math.min(t, cs.t0 - 0.001))); gA.innerHTML = pv; gB.innerHTML = cur; gTr.innerHTML = '';
    if (tr.type === 'iris') {
      gB.setAttribute('clip-path', 'url(#clipB)'); clipBc.setAttribute('cx', tr.cx ?? 540); clipBc.setAttribute('cy', tr.cy ?? 900); clipBc.setAttribute('r', (sm(u) * 1700).toFixed(1));
      gTr.innerHTML = `<circle cx="${tr.cx ?? 540}" cy="${tr.cy ?? 900}" r="${(sm(u) * 1700).toFixed(1)}" fill="none" stroke="#fff" stroke-width="14" opacity="${(1 - u).toFixed(2)}"/>`;
    } else {
      gB.setAttribute('clip-path', 'url(#clipW)'); const x = 1080 * (1 - eo(u)); clipWr.setAttribute('x', x.toFixed(1));
      gTr.innerHTML = `<rect x="${(x - 10).toFixed(0)}" y="0" width="20" height="1920" fill="#fff" opacity="${(0.8 * (1 - u)).toFixed(2)}"/>` + Array.from({ length: 7 }, (_, q) => `<rect x="${(x - 80 - q * 110).toFixed(0)}" y="${q * 270 + 40}" width="${100 + (q % 3) * 60}" height="12" rx="6" fill="#fff" opacity="${(0.45 * (1 - u)).toFixed(2)}"/>`).join('');
    }
  } else { gA.innerHTML = cur; gB.innerHTML = ''; gB.removeAttribute('clip-path'); gTr.innerHTML = ''; }
  ovEl.innerHTML = ovs;
  let fl = 0; for (const c of FLASH_AT) if (t >= c && t < c + 0.16) fl = Math.max(fl, 0.55 * (1 - (t - c) / 0.16));
  $('flash').style.opacity = fl.toFixed(3);
  endFrame();
  updateCaption(t);
  await Promise.all(loads);
}
window.renderFrame = renderFrame;
window.__ready = true;
