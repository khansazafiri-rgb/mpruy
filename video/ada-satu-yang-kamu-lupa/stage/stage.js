// Panggung video "Ada Satu yang Kamu Lupa". Semua dihitung dari waktu t (detik), jadi tiap frame deterministik.
// Raka digambar dari brand/characters/raka/raka.js (karakter kanonik); logo dari apps/web/src/assets.
import { raka, rakaSvg, lerpState, idle } from '/brand/characters/raka/raka.js';
import { C, clamp, lerp, ease, easeOut, r1, g, rect, circ, txt } from './lib.js';
import { sceneHook, sceneRoutine, routineBounds, sceneCycle, cycleBounds } from './scenes1.js';
import { sceneExam, examBounds, sceneReveal, revealBounds, sceneExplain, explainBounds, sceneEvidence, evidenceBounds, sceneWinddown, sceneBrand } from './scenes2.js';

const $ = (id) => document.getElementById(id);
const D = await (await fetch('data.json')).json();
const FPS = D.fps;
const normTok = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function at(clip, phrase) {
  const P = phrase.split(/\s+/).map(normTok), ws = D.words.filter((w) => w.clip === clip);
  for (let i = 0; i + P.length <= ws.length; i++) if (P.every((p, k) => normTok(ws[i + k].w) === p)) return ws[i].s;
  throw new Error(`frasa tidak ditemukan: ${clip} "${phrase}"`);
}
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
function rk(keys, { x = 0, y = 0, s = 1, uid = 'rk', flip = false } = {}) {
  const t = CUR_T;
  let st = idle(stateAt(keys, t), t + (uid === 'rk' ? 0 : uid.length * 0.37));
  const e = envAt(D.envR, t);
  if (e > 0.04) { st = JSON.parse(JSON.stringify(st)); const o = clamp(e, 0, 1.15); st.mouth.lo = st.mouth.lo + o * 22; st.mouth.up = st.mouth.up - o * 4; st.mouth.w = st.mouth.w + o * 2; }
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
      const len = cur.map((x) => x.w).join(' ').length, end = /[.!?]$/.test(w.w) || /\.\.\.$/.test(w.w), comma = /[,:]$/.test(w.w);
      const next = ws[i + 1];
      if (end || (comma && len >= 14) || len >= 26 || (next && len + next.w.length > 31)) flush();
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
  const holdEnd = Math.min(p.e + 0.5, nxt ? nxt.s - 0.02 : 1e9);
  if (t > holdEnd) return null;
  const isR = p.clip[0] === 'R';
  const html = (isR ? `<div class="tag">Raka</div><br>` : '') + p.words.map((w) => {
    const cls = t >= w.s - 0.02 && t < w.e + 0.1 ? 'on' : (t >= w.e + 0.1 ? 'past' : 'fut');
    return `<span class="w ${cls}">${w.w}</span>`;
  }).join('');
  return { html, cls: isR ? 'box r' : 'box n' };
}

/* ---------- adegan dan transisi ---------- */
const cl = D.clips, A = at;
const SC = {
  hook: { start: 0, end: cl.N2.start - 0.05 },
  routine: { start: cl.N2.start - 0.05, end: cl.N3.start - 0.05 },
  cycle: { start: cl.N3.start - 0.05, end: cl.N4.start - 0.05 },
  exam: { start: cl.N4.start - 0.05, end: cl.N5.start - 0.1 },
  reveal: { start: cl.N5.start - 0.1, end: cl.N6.start - 0.05 },
  explain: { start: cl.N6.start - 0.05, end: cl.N7.start - 0.05 },
  evidence: { start: cl.N7.start - 0.05, end: cl.N8.start - 0.05 },
  wind: { start: cl.N8.start - 0.05, end: cl.N9.start - 0.05 },
  brand: { start: cl.N9.start - 0.05, end: D.total },
};
// jenis transisi: 'wipe' = panel hijau menyapu; 'flash' = kilatan putih (reveal); 'none' = potongan halus oleh gerak kamera
const TR = [];
const addT = (t, type = 'wipe') => TR.push({ t, type });
addT(SC.routine.start); routineBounds(A).forEach((b) => addT(b));
addT(SC.cycle.start); cycleBounds(A).forEach((b) => addT(b));
addT(SC.exam.start); examBounds(A, D).slice(1, 6).forEach((b, i) => addT(b, i === 4 ? 'flash' : 'wipe'));
addT(SC.reveal.start, 'flash'); revealBounds(A, D).forEach((b) => addT(b, 'flash'));
addT(SC.explain.start); explainBounds(A).forEach((b) => addT(b));
addT(SC.evidence.start); evidenceBounds(A).forEach((b) => addT(b));
addT(SC.wind.start); addT(SC.brand.start);
function transition(t) {
  let wipe = -1200, flash = 0, wcol = C.forest;
  for (const { t: b, type } of TR) {
    if (type === 'wipe') {
      if (t >= b - 0.15 && t < b) wipe = lerp(-1100, 0, easeOut((t - (b - 0.15)) / 0.15));
      else if (t >= b && t < b + 0.15) wipe = lerp(0, 1100, ease((t - b) / 0.15));
    } else if (type === 'flash') {
      if (t >= b - 0.08 && t < b) flash = (t - (b - 0.08)) / 0.08;
      else if (t >= b && t < b + 0.22) flash = 1 - (t - b) / 0.22;
    }
  }
  return { wipe, flash, wcol };
}

function buildFrame(tt) {
  CUR_T = tt;
  const X = { t: tt, D, rk, at, W: 1080, H: 1920 };
  for (const [name, T] of Object.entries(SC)) {
    if (tt < T.end || name === 'brand') {
      switch (name) {
        case 'hook': return sceneHook(X);
        case 'routine': return sceneRoutine(X, T);
        case 'cycle': return sceneCycle(X, T);
        case 'exam': return sceneExam(X, T);
        case 'reveal': return sceneReveal(X, T);
        case 'explain': return sceneExplain(X, T);
        case 'evidence': return sceneEvidence(X, T);
        case 'wind': return sceneWinddown(X, T);
        default: return sceneBrand(X, T);
      }
    }
  }
}

const world = $('world'), capbox = $('capbox');
window.renderFrame = async (tt) => {
  world.innerHTML = buildFrame(tt);
  const cap = captionHtml(tt);
  const capEl = $('cap');
  if (cap) { capEl.style.display = 'flex'; capbox.className = cap.cls; capbox.innerHTML = cap.html; } else capEl.style.display = 'none';
  const tr = transition(tt);
  $('fade').style.cssText = `transform:translateX(${tr.wipe}px);opacity:1;background:${tr.wcol}`;
  $('flash').style.opacity = String(tr.flash);
};
window.__ready = true;
window.__info = { SC, TR, total: D.total };
