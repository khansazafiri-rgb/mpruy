// Panggung video "Pasien tidak sadar di IGD": renderFrame(t) deterministik. a = waktu audio narator asli, t = a + LEAD.
import { clamp, lerp, ease, easeOut, easeInOut, backOut, kf, win, seg, r1, rnd, rect, circ, txt, poly, g, place, placeHead, blinkAt, C } from './lib.js';
import { raka, rakaSvg, lerpState, idle } from '../../../brand/characters/raka/raka.js';
import { orang, orangSvg, LOOKS, idleOrang, lerpOrang } from './orang.js';
import { povCeiling, povFace, povBody, povDoors, povRunners, POV_DEFS } from './pov.js';
import { bay, BAY, wallClock, monitor, ICON, consult } from './world.js';
import { talkMouth, stationBg, stationFg, CARD, cardFrame, subConsult, subCase, subScale, subConsent, COND_ICON } from './scenes.js';

await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
const DATA = await (await fetch('data.json')).json();
const LEAD = DATA.lead, FPS = DATA.fps;
const $ = (id) => document.getElementById(id);
const cam = $('cam'), fx = $('fx');
const envAt = (f) => { const i = clamp(Math.floor(f), 0, DATA.env.length - 1); return DATA.env[i]; };

// ---------------------------------------------------------------- teks layar
const HOOK = [
  { a0: 0.15, a1: 3.0, cls: '', html: 'KAMU DIBAWA KE IGD' },
  { a0: 0.55, a1: 3.0, cls: '', html: 'DALAM KEADAAN TIDAK SADAR' },
  { a0: 3.2, a1: 8.6, cls: 'red big', html: 'DOKTER HARUS MENUNGGU<br>KELUARGAMU?' },
];
const hookHost = $('hook');
const hookEls = HOOK.map((h) => { const d = document.createElement('div'); d.className = 'hk ' + h.cls; d.innerHTML = h.html; d.style.display = 'none'; hookHost.appendChild(d); return d; });
function updateHook(a) {
  HOOK.forEach((h, i) => {
    const d = hookEls[i], on = a >= h.a0 && a <= h.a1 + 0.25;
    if (!on) { d.style.display = 'none'; return; }
    d.style.display = 'block';
    const k = backOut(clamp((a - h.a0) / 0.4, 0, 1)), o = clamp((h.a1 + 0.25 - a) / 0.25, 0, 1);
    d.style.opacity = Math.min(1, (a - h.a0) / 0.12) * o;
    d.style.transform = `scale(${lerp(0.7, 1, k).toFixed(3)}) translateY(${lerp(-20, 0, clamp(k, 0, 1)).toFixed(1)}px)`;
  });
}
const ICN = {
  check: `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="#00A383"/><path d="M24 41l11 11 21-24" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  book: `<svg viewBox="0 0 80 80"><path d="M8 18q16-6 32 4v44q-16-10-32-4z" fill="#00A383"/><path d="M72 18q-16-6-32 4v44q16-10 32-4z" fill="#9DE0BD"/></svg>`,
};
const capBox = $('capbox'); let capIdx = -2;
function updateCaption(a) {
  let idx = -1;
  for (let i = 0; i < DATA.caps.length; i++) if (a >= DATA.caps[i].a0 - 0.04 && a < DATA.caps[i].a1) { idx = i; break; }
  if (idx !== capIdx) { capIdx = idx; if (idx < 0) capBox.style.display = 'none'; else { capBox.style.display = 'block'; capBox.textContent = DATA.caps[idx].text; } }
}

// ---------------------------------------------------------------- adegan 1: POV pasien
const BUMPS = [1.9, 2.8, 4.1, 6.9, 7.8];
function travelAt(a) {
  let d = 0; const dt = 0.05;
  for (let x = 0; x < a; x += dt) d += kf(x, [[0, 0], [1.1, 0], [2.2, 3.4], [7.2, 3.6], [8.6, 1.0]], (u) => u) * dt;
  return d;
}
function lidAt(a) {
  let c = kf(a, [[0, 1], [0.35, 1], [0.72, 0.84], [1.0, 0.84], [1.12, 1], [1.4, 1], [1.95, 0]], ease);
  for (const [s, d] of [[3.9, 0.32], [6.0, 0.28], [7.1, 0.3]]) { const k = (a - s) / d; if (k > 0 && k < 1) c = Math.max(c, Math.sin(k * Math.PI)); }
  c = Math.max(c, win(a, 4.55, 5.5, 0.15, 0.25) * (0.42 + 0.16 * Math.sin(a * 11)));       // bingung: kelopak berat dan berkedut
  c = Math.max(c, kf(a, [[8.0, 0], [8.95, 1]], easeInOut));                                   // pandangan memudar menjadi gelap
  return c;
}
function setLids(c) {
  const h = c * 980;
  fx.querySelector('#lt').setAttribute('d', c > 0.004 ? `M-20 -20H1100V${r1(h)}Q540 ${r1(h + 150 * Math.min(c, 1))} -20 ${r1(h)}Z` : '');
  fx.querySelector('#lb').setAttribute('d', c > 0.004 ? `M-20 1940H1100V${r1(1920 - h)}Q540 ${r1(1920 - h - 150 * Math.min(c, 1))} -20 ${r1(1920 - h)}Z` : '');
  const gap = c > 0.5 && c < 0.995 ? 1 : 0;
  fx.querySelector('#lg').setAttribute('opacity', gap ? 0.55 * (1 - Math.abs(c - 0.84) * 3) : 0);
}
function scenePOV(a, t) {
  const travel = travelAt(a);
  const pan = kf(a, [[5.5, 0], [6.3, 1], [7.0, 1], [7.8, 0]], easeInOut);
  const fuzz = kf(a, [[1.1, 15], [2.5, 0]], easeOut) + win(a, 4.6, 5.5, 0.25, 0.3) * 6;
  const bump = BUMPS.reduce((s, b) => s + (a > b ? Math.exp(-(a - b) * 9) * Math.sin((a - b) * 40) * 7 : 0), 0);
  const sx = Math.sin(a * 13) * 2.6 + Math.sin(a * 5.3) * 2 + bump, sy = Math.sin(a * 11 + 1) * 2.4 + bump * 0.6, rot = Math.sin(a * 6.5) * 0.45 + bump * 0.06;
  const dim = clamp(kf(a, [[1.0, 0.12], [2.4, 1]]), 0, 1);
  let s = POV_DEFS;
  let world = '';
  world += `<g transform="translate(0 ${r1(-pan * 1300)})">` + povCeiling(travel, dim) + '</g>';
  if (a > 6.9) world += povDoors(seg(a, 7.2, 8.9), t) + povRunners(t, seg(a, 7.4, 8.4));
  // wajah tenaga kesehatan yang menunduk melihat pasien
  const face = (who, side, a0, a1, o) => { const kin = seg(a, a0, a0 + 0.55), kout = seg(a, a1, a1 + 0.5); const k = kin * (1 - kout); return k > 0.01 ? povFace(who, side, k, t, o) : ''; };
  world += `<g transform="translate(0 ${r1(-pan * 1300)})">`
    + face('perawat', 'L', 2.35, 4.3, { talk: true, seed: 1, y: 1170 })
    + face('dokterPria', 'R', 3.05, 5.2, { talk: true, seed: 2, y: 1230 })
    + face('dokterWanita', 'L', 4.1, 5.6, { talk: false, seed: 3, y: 1200, s: 1.55 }) + '</g>';
  if (pan > 0.001) world += `<g transform="translate(0 ${r1((1 - pan) * 1500)})">` + povBody(t, { tremor: win(a, 6.6, 8.4, 0.3, 0.3) * 1.8 }) + '</g>';
  // penglihatan ganda saat bingung
  const dbl = win(a, 4.6, 5.5, 0.3, 0.35);
  s += `<g transform="translate(${r1(sx)} ${r1(sy)}) rotate(${r1(rot)} 540 960)"${fuzz > 0.5 ? ` filter="url(#bl${fuzz > 8 ? 6 : fuzz > 3 ? 3 : 1})"` : ''}>` + world
    + (dbl > 0.02 ? `<g transform="translate(${r1(18 * dbl)} ${r1(-10 * dbl)})" opacity="${r1(0.4 * dbl)}">${world}</g>` : '') + '</g>';
  return s;
}

// ---------------------------------------------------------------- bilik IGD (dipakai adegan 2, jendela, kartu, dan setelah tindakan)
function raState(a, over = {}) { return raka('pingsan', 'berbaring', { blood: 1, ...over }); }
const swing = (t, ph, amp, f = 3) => Math.sin(t * f + ph) * amp;
function staffUrgent(a, t, k = 1) {
  // k = 0..1 seberapa sibuk (0 = tenang memeriksa, 1 = sigap)
  const sw = (ph, amp) => swing(t, ph, amp * (0.5 + 0.5 * k), 2.4 + 2.2 * k);
  const dk = idleOrang(orang('fokus', 'periksa', { yaw: 0.35, lean: 5 + sw(0, 2), armL: { wx: 176 + sw(0, 8), wy: 590, ex: 94, ey: 560, finger: 0, front: 1 }, armR: { wx: 250 + sw(1, 6), wy: 560 + sw(2, 5), ex: 316, ey: 520, finger: 0, front: 1 } }), t, 0);
  const pr = idleOrang(orang('fokus', 'berdiri', { yaw: -0.3, armL: { wx: 150, wy: 470 + sw(2, 18), ex: 70, ey: 470, finger: 0, front: 1 }, armR: { wx: 290 + sw(1, 10), wy: 330 + sw(3, 14), ex: 340, ey: 400, finger: 0, front: 1 } }), t, 1);
  const dw = idleOrang(orang('peduli', 'catat', { yaw: -0.4, armR: { wx: 236, wy: 506 + sw(1, 10), ex: 312, ey: 548, finger: 0, front: 1 } }), t, 2);
  return [{ who: 'dokterPria', x: 520, state: dk, id: 'a', s: 0.72 }, { who: 'perawat', x: 705, state: pr, id: 'b', s: 0.72 }, { who: 'dokterWanita', x: 870, state: dw, id: 'c', y: 1190, s: 0.72 }];
}
function bayUrgent(a, t, o = {}) {
  const wake = win(a, 9.05, 10.0, 0.2, 0.6);
  const rk = idle(raState(a), t);
  const st = wake > 0 ? lerpState(rk, idle(raka('bingung', 'berbaring', { blood: 1 }), t), wake) : rk;
  const urg = kf(a, [[9, 0.4], [13.2, 0.4], [13.75, 1], [17.3, 1], [18.5, 0.6]]);
  return bay({ t, lit: 0, sky: 0, minutes: 12, rakaState: st, staff: staffUrgent(a, t, urg), monitorMode: 'alarm', ...o });
}
// setelah tindakan: tenang, hangat, siang. Raka sadar dan tersenyum lega; Ibu datang belakangan.
function bayAfter(a, t, o = {}) {
  const lit = ease(seg(a, 60.2, 62.0));
  const sky = ease(seg(a, 60.4, 62.2));
  const minutes = 12 + 340 * ease(seg(a, 60.4, 62.2));
  const awake = ease(seg(a, 62.3, 63.2));
  const sleepAgain = ease(seg(a, 65.9, 66.3));    // untuk contoh kedua ("atau kepada wakilnya"), pasien belum cakap
  const rk = idle(lerpState(raka('pingsan', 'berbaring', { blood: 0 }), raka('lega', 'berbaring', { blood: 0 }), awake * (1 - sleepAgain)), t);
  const talkD = (a0, a1) => win(a, a0, a1, 0.2, 0.2) * (0.5 + 0.5 * Math.sin(t * 12));
  const toR = 1 - sleepAgain;
  const dk = idleOrang(orang(toR > 0.5 ? 'peduli' : 'fokus', 'jelaskan', { yaw: toR > 0.5 ? 0.3 : -0.45, lean: 2, armR: { wx: 330 + swing(t, 1, 10), wy: 450 + swing(t, 2, 8), ex: 346, ey: 520, finger: 0, front: 1 }, mouth: { w: 12, up: 3, lo: 3 + (talkD(62.4, 66.0) + talkD(66.4, 69.3)) * 14 } }), t, 0);
  const pr = idleOrang(orang('senyum', 'catat', { yaw: 0.2 }), t, 1);
  const come = ease(seg(a, 66.16, 67.6)), ix = lerp(1260, 825, come);
  const ib = idleOrang(orang(come > 0.99 ? 'khawatir' : 'khawatir', 'dada', { yaw: -0.4, bob: come < 0.99 ? Math.abs(Math.sin(a * 7)) * -6 : 0 }), t, 4);
  const staff = [{ who: 'dokterPria', x: 520, state: dk, id: 'a', s: 0.72 }, { who: 'perawat', x: 690, state: pr, id: 'b', s: 0.72 }];
  if (a > 66.1) staff.push({ who: 'ibu', x: ix, state: ib, id: 'i', s: 0.72, y: 1196 });
  return bay({ t, lit, sky, minutes, rakaState: rk, staff, monitorMode: 'tenang', ivLevel: 0.4, ...o });
}

// ---------------------------------------------------------------- adegan 2: bilik IGD (luar POV)
function sceneBay(a, t) {
  const phoneBubble = a > 17.5 ? g(ICON.phoneOff(0, 0, 1, t), { x: 720, y: 500, s: 1.15 * backOut(seg(a, 17.6, 18.2)), o: 1 }) : '';
  const bubbleQ = win(a, 10.8, 13.4, 0.3, 0.3);
  const q = bubbleQ > 0.01 ? g(`<g>${rect(-70, -64, 140, 108, '#fff', 30)}<path d="M-14 44L0 80L14 44Z" fill="#fff"/>${txt('?', 0, 28, { size: 100, fill: '#E8665F' })}</g>`, { x: 520, y: 600, s: backOut(bubbleQ), o: bubbleQ }) : '';
  const z = kf(a, [[9, 1.05], [22, 1.12]], (u) => u);
  return `<g transform="translate(540 960) scale(${z.toFixed(4)}) translate(-540 -960)">` + bayUrgent(a, t, { extraFront: phoneBubble + q }) + '</g>';
}

// ---------------------------------------------------------------- adegan 3 dan 4: meja perawat, kartu penjelasan
const ZOOM = 0.7, AX = 540, AY = 1420;
function stationState(a, t) {
  const e = envAt(t * FPS);
  const quest = win(a, 22.1, 25.87, 0.15, 0.1), answer = win(a, 25.87, 27.2, 0.1, 0.4);
  const talk = a >= 26.93 && a < 60.1 ? e : a >= 66.16 && a < 82.6 ? e : 0;
  const nurseTalk = a >= 69.4 && a < 82.6 ? e : a >= 26.93 && a < 60.1 ? e : 0;
  const lean = kf(a, [[22.0, -12], [26.3, -14], [27.2, -3]]);
  const bob = kf(a, [[22.0, 46], [26.3, 46], [27.2, 4]]);
  const nod = win(a, 25.9, 26.9, 0.05, 0.3) * Math.sin((a - 25.9) * 10) * 4;
  let nurse = orang(a > 25.87 ? 'senyum' : 'peduli', 'simak', { yaw: -0.5, lean, bob, headDown: 8 * (1 - ease(seg(a, 26.6, 27.2))) + nod, mouth: talkMouth(nurseTalk) });
  if (nurseTalk > 0) {
    const gest = Math.sin(a * 1.9) > 0 ? 'jelaskan' : 'simak';
    nurse = lerpOrang(nurse, orang('peduli', gest, { yaw: -0.5, lean, bob, headDown: 0, mouth: talkMouth(nurseTalk) }), 0.8 * ease(seg(a, 26.9, 27.5)));
  }
  const worry = win(a, 33.9, 39.5, 0.4, 0.5);
  const ex = a > 72.31 ? 'senyum' : a > 52.4 && a < 60.2 ? 'lega' : worry > 0.2 ? 'khawatir' : 'tanya';
  let child = orang(ex, quest > 0.01 ? 'angkat' : 'simak', { yaw: 0.55, headDown: -2, ...(quest > 0.01 ? { mouth: talkMouth(e, 4) } : {}) });
  child = idleOrang(child, t, 6);
  return { nurse: idleOrang(nurse, t, 7), child };
}
function sceneStation(a, t, mode) {
  // mode 'bawa' (22 - 60.2) atau 'ulang' (69.4 - 82.6)
  const st = stationState(a, t);
  const k = kf(a, [[26.4, 1], [27.3, ZOOM]], easeInOut);
  const lit = mode === 'ulang' ? 0.7 : 0;
  const bayIn = mode === 'ulang' ? bayAfter(100, t, { lit: 1, sky: 1, minutes: 12 + 340 }) : bayUrgent(a, t);
  const bayWin = mode === 'ulang' ? bayAfter(80, t) : bayIn;
  let s = stationBg(lit);
  s += `<g transform="translate(${AX} ${AY}) scale(${k.toFixed(4)}) translate(${-AX} ${-AY})">${stationFg({ t, lit, nurse: st.nurse, child: st.child, bayIn: bayWin })}</g>`;
  // gelembung pertanyaan anak (hanya saat bertanya)
  const q = win(a, 22.1, 26.9, 0.3, 0.3) * (1 - ease(seg(a, 26.4, 26.9)));
  if (q > 0.01 && mode === 'bawa') {
    const ok = easeOut(seg(a, 25.87, 26.3));
    s += g(`<g>${rect(-150, -118, 300, 210, '#fff', 44)}<path d="M-30 92L-6 148L24 92Z" fill="#fff"/>`
      + ICON.clipboard(-62, -14, 1, ok) + txt('?', 78, 34, { size: 130, fill: '#E8665F', extra: `opacity="${r1(1 - ok * 0.9)}"` }) + `</g>`, { x: 330, y: 660, s: backOut(q) * 0.95, o: Math.min(1, q * 1.5) });
  }
  return { svg: s, k };
}

// kartu penjelasan di atas meja perawat
function cardScene(a, t, mode) {
  let sub = '', k = 1;
  if (mode === 'bawa') {
    k = ease(seg(a, 26.6, 27.3)) * (1 - ease(seg(a, 59.9, 60.2)));
    const bayIn = bayUrgent(a, t);
    if (a < 33.72) sub = subConsult(a, t, 26.93);
    else if (a < 39.57) sub = subCase(a, t, 33.72, bayIn);
    else if (a < 43.92) sub = subScale(a, t, 39.57);
    else sub = rect(CARD.x, CARD.y, CARD.w, CARD.h, '#FFFFFF');
  } else {
    k = ease(seg(a, 69.4, 69.8)) * (1 - ease(seg(a, 82.3, 82.6)));
    sub = a < 72.31 ? subConsent(a, t, 69.47) : rect(CARD.x, CARD.y, CARD.w, CARD.h, '#FFFFFF');
  }
  return cardFrame(k, sub);
}

// ---------------------------------------------------------------- adegan 5: setelah tindakan
function sceneAfter(a, t) {
  const z = kf(a, [[60.2, 1.1], [69.5, 1.05]], (u) => u);
  const cx = 540;
  return `<g transform="translate(${cx} 900) scale(${z.toFixed(4)}) translate(-${cx} -900)">` + bayAfter(a, t) + '</g>';
}

// ---------------------------------------------------------------- baris syarat (HTML)
const card = $('card'), cardHead = $('cardhead'), rowsHost = $('crows'), stampEl = $('stamp'), whyEl = $('why');
const mkRow = (host, ic, text) => { const d = document.createElement('div'); d.className = 'crow'; d.innerHTML = `<span class="ic">${COND_ICON[ic]}</span><span class="tx">${text}</span><span class="ok">${COND_ICON.centang}</span>`; host.appendChild(d); return d; };
const ROWS_D = [['pingsan', 'Pasien tidak cakap', 45.92], ['darurat', 'Membutuhkan tindakan gawat darurat', 47.41], ['telepon', 'Tidak ada wakil yang dapat dimintai persetujuan', 49.36]].map(([ic, tx, t0]) => ({ el: mkRow(rowsHost, ic, tx), t0 }));
const ROWS_R = [['darurat', 'Gawat darurat', 72.6], ['pingsan', 'Pasien tidak mampu memutuskan', 77.0], ['telepon', 'Tidak ada wakil yang bisa dimintai persetujuan', 79.65]].map(([ic, tx, t0]) => ({ el: mkRow(rowsHost, ic, tx), t0 }));
stampEl.innerHTML = `<span class="ic">${COND_ICON.centang}</span><span>TINDAKAN DAPAT DILAKUKAN</span>`;
whyEl.innerHTML = `<span class="ic">${COND_ICON.perisai}</span><span>Berdasarkan kepentingan terbaik pasien</span>`;
const popCss = (d, k, dy = 24) => { const kk = backOut(k); d.style.opacity = clamp(k * 4, 0, 1); d.style.transform = `scale(${lerp(0.85, 1, kk).toFixed(3)}) translateY(${lerp(dy, 0, clamp(kk, 0, 1)).toFixed(1)}px)`; };
function updateCardHtml(a) {
  const dOn = a >= 43.92 && a < 60.0, rOn = a >= 72.31 && a < 82.4;
  card.style.display = dOn || rOn ? 'flex' : 'none';
  if (!(dOn || rOn)) return;
  const compact = dOn && a >= 52.4;
  rowsHost.style.zoom = compact ? '0.78' : '1';
  cardHead.style.display = compact ? 'none' : 'block';
  cardHead.textContent = dOn ? (a < 49.4 ? 'Syarat pengecualian:' : 'Ketiganya harus terpenuhi') : 'Tindakan darurat tanpa persetujuan, jika:';
  ROWS_D.forEach((r) => { r.el.style.display = dOn ? 'flex' : 'none'; if (dOn) { popCss(r.el, seg(a, r.t0, r.t0 + 0.4), 16); r.el.classList.toggle('done', a >= 52.1); } });
  ROWS_R.forEach((r) => { r.el.style.display = rOn ? 'flex' : 'none'; if (rOn) { popCss(r.el, seg(a, r.t0, r.t0 + 0.4), 16); r.el.classList.toggle('done', a >= r.t0 + 0.9); } });
  const sOn = dOn && a >= 52.4;
  stampEl.style.display = sOn ? 'flex' : 'none';
  if (sOn) { const k = seg(a, 52.4, 52.85); stampEl.style.opacity = clamp(k * 3, 0, 1); stampEl.style.transform = `rotate(-2.5deg) scale(${lerp(1.5, 1, easeOut(k)).toFixed(3)})`; }
  const wOn = dOn && a >= 57.4;
  whyEl.style.display = wOn ? 'flex' : 'none';
  if (wOn) popCss(whyEl, seg(a, 57.4, 57.9), 14);
  card.style.opacity = dOn ? (1 - ease(seg(a, 59.7, 60.0))).toFixed(3) : (ease(seg(a, 72.31, 72.55)) * (1 - ease(seg(a, 82.1, 82.4)))).toFixed(3);
}

// ---------------------------------------------------------------- chip teks layar
const CHIPS = [
  { a0: 13.75, a1: 17.2, cls: 'red', html: 'GAWAT DARURAT' },
  { a0: 18.67, a1: 21.9, html: `<span class="ic">${COND_ICON.pingsan}</span><span>Tidak sadar</span>` },
  { a0: 19.8, a1: 21.9, html: `<span class="ic">${COND_ICON.telepon}</span><span>Keluarga belum bisa dihubungi</span>` },
  { a0: 22.1, a1: 25.87, html: 'Bukannya harus ada persetujuan?' },
  { a0: 25.87, a1: 27.3, cls: 'green', html: 'Benar!' },
  { a0: 29.42, a1: 33.6, html: `<span class="ic">${COND_ICON.buku}</span><span>Penjelasan + persetujuan</span>` },
  { a0: 36.98, a1: 39.5, html: `<span class="ic">${COND_ICON.jam}</span><span>Waktu terus berjalan</span>` },
  { a0: 41.03, a1: 43.8, cls: 'gold', html: 'Ada pengecualian' },
  { a0: 43.92, a1: 60.0, cls: 'law', html: `UU No. 17 Tahun 2023 · Pasal 293<small>ayat (9), (10), (11)</small>` },
  { a0: 60.41, a1: 62.3, html: `<span class="ic">${COND_ICON.jam}</span><span>Beberapa jam kemudian</span>` },
  { a0: 62.3, a1: 66.0, html: `<span class="ic">${COND_ICON.buku}</span><span>Dijelaskan ke pasien yang sudah cakap</span>` },
  { a0: 66.16, a1: 69.47, html: `<span class="ic">${COND_ICON.wakil}</span><span>Atau ke wakilnya yang hadir</span>` },
  { a0: 69.47, a1: 72.31, cls: 'green', html: 'Persetujuan pasien tetap penting' },
];
const chipHost = $('chips');
const chipEls = CHIPS.map((c) => { const d = document.createElement('div'); d.className = 'chip ' + (c.cls || ''); d.innerHTML = c.html; d.style.display = 'none'; chipHost.appendChild(d); return d; });
function updateChips(a) {
  CHIPS.forEach((c, i) => {
    const d = chipEls[i], on = a >= c.a0 && a <= c.a1 + 0.2;
    if (!on) { d.style.display = 'none'; return; }
    d.style.display = c.cls === 'law' ? 'flex' : 'inline-flex';
    const k = backOut(clamp((a - c.a0) / 0.4, 0, 1)), o = clamp((c.a1 + 0.2 - a) / 0.2, 0, 1);
    d.style.opacity = Math.min(1, (a - c.a0) / 0.12) * o;
    d.style.transform = `scale(${lerp(0.75, 1, k).toFixed(3)}) translateY(${lerp(-18, 0, clamp(k, 0, 1)).toFixed(1)}px)`;
  });
}

// ---------------------------------------------------------------- adegan 6: penutup
const KORI_SVG = await (await fetch('kori.svg')).text();
const endSvg = $('endsvg');
endSvg.innerHTML = `<g id="rakaEnd"></g><g id="koriWrap"><g id="koriIn"></g></g>`;
const koriIn = $('koriIn');
koriIn.innerHTML = new DOMParser().parseFromString(KORI_SVG, 'image/svg+xml').documentElement.innerHTML;
const kq = (s) => koriIn.querySelector(s);
const K = { float: kq('.mc-float'), eyesN: kq('.mc-eyes-normal'), eyesH: kq('.mc-eyes-happy'), mN: kq('.mc-mouth-normal'), mH: kq('.mc-mouth-happy'), arm: kq('.mc-arm-right'), dots: [...koriIn.querySelectorAll('.mc-eyes > circle')] };
$('er1').innerHTML = `<span class="ic">${COND_ICON.buku}</span><span>Belajar kedokteran gratis</span>`;
function updateEnd(a, t) {
  const endK = ease(seg(a, 82.62, 83.0));
  $('end').style.opacity = endK.toFixed(3);
  if (endK <= 0) return;
  const lk = backOut(seg(a, 82.9, 83.6)); const lg = $('elogo'); lg.style.transform = `scale(${lerp(0.7, 1, lk).toFixed(3)})`; lg.style.opacity = clamp((a - 82.85) / 0.4, 0, 1);
  [[$("er1"), 85.5], [$('er3'), 88.07]].forEach(([d, t0]) => popCss(d, seg(a, t0, t0 + 0.45), 24));
  const rk = clamp((a - 83.2) / 0.5, 0, 1), kr = clamp((a - 83.5) / 0.5, 0, 1);
  const rs = idle(lerpState(raka('lega', 'sapa'), raka('senang', 'sapa'), 0.5 + 0.5 * Math.sin(a * 2)), t);
  const wave = Math.sin(a * 8) * 10;
  rs.armR = { ...rs.armR, wx: rs.armR.wx + wave, ex: rs.armR.ex };
  $('rakaEnd').innerHTML = `<g transform="translate(300 1500) scale(${(0.78 * backOut(rk)).toFixed(3)}) translate(-200 -778)" opacity="${rk}">${rakaSvg(rs, { bare: true, shadow: true, uid: 'endraka' })}</g>`;
  $('koriWrap').setAttribute('transform', `translate(640 1250) scale(${(1.5 * backOut(kr)).toFixed(3)})`); $('koriWrap').setAttribute('opacity', kr);
  K.float.setAttribute('transform', `translate(0 ${(Math.sin(a * 2.3) * 6).toFixed(1)})`);
  K.eyesN.setAttribute('opacity', 0); K.eyesH.setAttribute('opacity', 1); K.dots.forEach((c) => c.setAttribute('opacity', 0)); K.mN.setAttribute('opacity', 0); K.mH.setAttribute('opacity', 1);
  if (K.arm) K.arm.setAttribute('style', `transform-box:fill-box;transform-origin:10% 60%;transform:rotate(${(Math.sin(a * 9) * 16 - 10).toFixed(1)}deg)`);
}

// ---------------------------------------------------------------- render utama
window.renderFrame = function (t) {
  const a = t - LEAD;
  let svg = '';
  let fade = 0, fadeCol = '#000';
  const wipe = (x0, x1, prev, next) => { const u = easeInOut(seg(a, x0, x1)); return `<g transform="translate(${r1(-1080 * u)} 0)">${prev}</g><g transform="translate(${r1(1080 * (1 - u))} 0)">${next}</g>`; };
  if (a < 9.0) svg = scenePOV(a, t);
  else if (a < 21.95) svg = sceneBay(a, t);
  else if (a < 22.3) svg = wipe(21.95, 22.3, sceneBay(21.94, t), sceneStation(22.1, t, 'bawa').svg);
  else if (a < 60.2) { const s = sceneStation(a, t, 'bawa'); svg = s.svg + cardScene(a, t, 'bawa'); }
  else if (a < 69.4) { svg = sceneAfter(a, t); }
  else if (a < 82.6) { const s = sceneStation(a, t, 'ulang'); svg = s.svg + cardScene(a, t, 'ulang'); }
  else svg = stationBg(0.7) + rect(0, 0, 1080, 1920, '#FBF3E2');
  cam.innerHTML = svg;
  const inPov = a < 9.05;
  fx.querySelector('#vg').setAttribute('opacity', inPov ? clamp(0.55 + 0.35 * win(a, 7.4, 9.0, 0.6, 0.1) + 0.07 * Math.max(0, Math.sin(a * 8.5)), 0, 1) : 0);
  setLids(inPov ? lidAt(a) : 0);
  updateHook(a); updateChips(a); updateCardHtml(a); updateCaption(a); updateEnd(a, t);
  // pelarian: gelap -> bilik (9.0), terang -> setelah tindakan (60.2), dan kembali (69.4)
  if (a >= 9.0 && a < 9.35) { fade = 1 - seg(a, 9.0, 9.35); }
  if (a >= 59.95 && a < 60.5) { fade = a < 60.2 ? seg(a, 59.95, 60.2) : 1 - seg(a, 60.2, 60.5); fadeCol = '#FFF6E2'; }
  if (a >= 69.2 && a < 69.7) { fade = a < 69.4 ? seg(a, 69.2, 69.4) : 1 - seg(a, 69.4, 69.7); fadeCol = '#FFF6E2'; }
  $('fade').style.background = fadeCol; $('fade').style.opacity = fade.toFixed(3);
  window.__t = t;
};
fx.innerHTML = `<defs><radialGradient id="vgg" cx=".5" cy=".5" r=".75"><stop offset=".3" stop-color="#02060E" stop-opacity="0"/><stop offset="1" stop-color="#02060E" stop-opacity=".92"/></radialGradient>
  <linearGradient id="lgg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFE9C8" stop-opacity="0"/><stop offset=".5" stop-color="#FFF3DE" stop-opacity=".9"/><stop offset="1" stop-color="#FFE9C8" stop-opacity="0"/></linearGradient></defs>
  <rect id="vg" x="-10" y="-10" width="1100" height="1940" fill="url(#vgg)" opacity="0"/>
  <rect id="lg" x="0" y="900" width="1080" height="120" fill="url(#lgg)" opacity="0"/>
  <path id="lt" fill="#050810"/><path id="lb" fill="#050810"/>`;
window.__ready = true;
