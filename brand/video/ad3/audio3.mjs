// Efek suara ringan dan musik latar buatan sendiri (disintesis di sini: bebas hak cipta, tanpa unduhan) untuk video ke-3.
// Ketukan dan ketikan mengikuti waktu klik/ketik di rekaman (clips.json), jadi pas dengan kursor di layar.
// Menulis build/sfx.wav dan build/music.wav sepanjang total video.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAMPLE_RATE as SR, writeWav } from '../src/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(fs.readFileSync(path.join(HERE, 'narasi.json'), 'utf8'));
const clips = JSON.parse(fs.readFileSync(path.join(HERE, 'clips', 'clips.json'), 'utf8'));
const a2 = path.join(HERE, '..', 'ad2', 'clips', 'clips.json');   // klip video ke-2 dipakai ulang di montase shot 4
if (fs.existsSync(a2)) for (const [k, c] of Object.entries(JSON.parse(fs.readFileSync(a2, 'utf8')))) clips[`a2_${k}`] = c;
const TOTAL = spec.total; const N = Math.round(TOTAL * SR);
const BUILD = path.join(HERE, 'build'); fs.mkdirSync(BUILD, { recursive: true });
const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
let seed = 24680; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const buf = () => new Float32Array(N);
const add = (dst, src, at, gain = 1) => { const o = Math.round(at * SR); for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * gain; };

// ---------- efek ----------
const env = (i, n, a, r) => Math.min(1, i / (a * SR)) * Math.pow(Math.max(0, 1 - i / n), r);
function pop(f0 = 760, f1 = 320, dur = .11) { const n = Math.round(dur * SR); const o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const f = f0 + (f1 - f0) * (i / n); ph += 2 * Math.PI * f / SR; o[i] = Math.sin(ph) * env(i, n, .003, 2.2); } return o; }
function tap() { const n = Math.round(.09 * SR); const o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { ph += 2 * Math.PI * (210 - 90 * i / n) / SR; o[i] = (Math.sin(ph) * .9 + rnd() * .15 * Math.max(0, 1 - i / (.012 * SR))) * env(i, n, .001, 2.6); } return o; }
function key() { const n = Math.round(.035 * SR); const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = (rnd() * .6 + Math.sin(2 * Math.PI * 1900 * i / SR) * .4) * Math.exp(-i / (.006 * SR)); return o; }
function whoosh(dur = .38) { const n = Math.round(dur * SR); const o = new Float32Array(n); let lp = 0, bp = 0; for (let i = 0; i < n; i++) { const k = i / n; const fc = 400 + 3800 * Math.sin(Math.PI * k); const a = Math.min(.95, 2 * Math.PI * fc / SR); lp += a * (rnd() - lp); bp += a * (lp - bp); o[i] = (lp - bp) * 2.2 * Math.sin(Math.PI * k) ** 1.5; } return o; }
function ding(f = 1318, dur = .75) { const n = Math.round(dur * SR); const o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (Math.sin(2 * Math.PI * f * t) + .45 * Math.sin(2 * Math.PI * f * 2.01 * t) * Math.exp(-t * 9) + .25 * Math.sin(2 * Math.PI * f * 3.02 * t) * Math.exp(-t * 14)) * env(i, n, .002, 3.2) * .6; } return o; }
function paper(dur = .2) { const n = Math.round(dur * SR); const o = new Float32Array(n); let hp = 0, prev = 0; for (let i = 0; i < n; i++) { const x = rnd(); hp = .86 * (hp + x - prev); prev = x; o[i] = hp * env(i, n, .004, 1.5) * (.6 + .4 * Math.sin(i / 90)); } return o; }
function thud() { const n = Math.round(.22 * SR); const o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { ph += 2 * Math.PI * (150 - 80 * i / n) / SR; o[i] = (Math.sin(ph) + rnd() * .3 * Math.max(0, 1 - i / (.02 * SR))) * env(i, n, .001, 3); } return o; }
function boing() { const n = Math.round(.45 * SR); const o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; const f = 240 + 420 * Math.sin(Math.min(1, t / .12) * Math.PI / 2) - 120 * t; ph += 2 * Math.PI * f / SR; o[i] = Math.sin(ph) * (1 + .4 * Math.sin(2 * Math.PI * 14 * t)) * env(i, n, .004, 1.6); } return o; }
function gasp() { const n = Math.round(.25 * SR); const o = new Float32Array(n); let lp = 0; for (let i = 0; i < n; i++) { const k = i / n; lp += .12 * (rnd() - lp); o[i] = lp * 1.6 * Math.sin(Math.PI * k) ** 2; } return o; }
function sparkle() { const o = new Float32Array(Math.round(.5 * SR)); [1568, 2093, 2637].forEach((f, k) => add(o, ding(f, .25), k * .07, .4)); return o; }

const sfx = buf();
const cue = (t, wave, g = .5) => add(sfx, wave, t, g);
const S = (n) => spec.shot[String(n).padStart(2, '0')];
const st = (n) => S(n).start;
// peralihan antar shot dan masuknya judul
for (let n = 1; n <= 16; n++) { if (n > 1) cue(st(n) - .02, whoosh(), .4); cue(st(n) + .1, pop(900, 420, .1), .28); }
// ketukan dan ketikan dari rekaman: waktu klip -> waktu video lewat potongan web tiap shot
const mk = (clip, from) => (typeof from === 'string' ? clips[clip].marks[from] : (from || 0));
for (let n = 2; n <= 14; n++) {
  let acc = 0;
  for (const w of S(n).web) {
    const c = clips[w.clip]; const a = mk(w.clip, w.from) + (w.off || 0); const room = Math.max(0, S(n).end - S(n).start - acc); const b = a + Math.min(w.len, room);
    (c.clicks || []).forEach((t) => { if (t >= a && t < b) cue(st(n) + acc + (t - a), tap(), .55); });
    (c.keys || []).forEach((t) => { if (t >= a && t < b) cue(st(n) + acc + (t - a), key(), .32); });
    Object.entries(c.marks || {}).forEach(([k, t]) => { if (/^sheet\d+$/.test(k) && t >= a && t < b) cue(st(n) + acc + (t - a), pop(520, 760, .12), .35); });
    acc += w.len;
  }
}
// Shot 1: kartu soal berjatuhan menimpa Kila
[.25, .38, .51, .64, .77, .9, 1.03, 1.16, 1.29].forEach((t, i) => { cue(t + .3, thud(), .45 + (i % 3) * .08); cue(t + .3, paper(.14), .25); });
cue(1.55, gasp(), .5); cue(1.55, boing(), .5); cue(1.6, pop(560, 380, .15), .4); cue(1.05, pop(700, 420, .1), .3);
// Shot 2: stiker GRATIS
cue(st(2) + .5, pop(520, 980, .16), .45); cue(st(2) + .55, sparkle(), .3);
// Shot 3: angka naik
for (let i = 0; i < 16; i++) cue(st(3) + .08 + i * .085, tap(), .12 + i * .007); cue(st(3) + 1.4, ding(1568, .6), .4); cue(st(3) + 1.35, sparkle(), .3);
// Stiker kecil di shot 4-14 (waktu = detik di dalam shot)
[[4, .05], [4, 1.3], [4, 2.65], [5, 2.2], [6, .9], [7, 2.0], [8, 1.4], [9, 1.2], [12, .6], [12, 2.6], [14, 2.2], [15, 1.6]].forEach(([n, t]) => cue(st(n) + t, pop(700, 420, .12), .3));
cue(st(6) + 1.6, sparkle(), .3);
// Shot 10: cek jawaban, Kila senang; shot 11: bohlam; shot 13: piala
cue(st(10) + clips.learn.marks.checked - clips.learn.marks.s10 + .1, ding(1318, .6), .4);
cue(st(11) + 2.2, ding(1175, .5), .4); cue(st(11) + 2.4, sparkle(), .3);
cue(st(13) + 1.9, ding(1318, .6), .35); cue(st(13) + 1.95, sparkle(), .3);
// Shot 16: logo, tombol ditekan, penutup
cue(st(16) + .05, pop(520, 980, .16), .4); cue(st(16) + .9, pop(700, 420, .12), .3); cue(st(16) + 1.58, tap(), .6); cue(st(16) + 1.62, ding(1568, 1.2), .4); cue(st(16) + 1.8, sparkle(), .4);

// ---------- musik: bantalan akor + petikan + detak ringan ----------
const music = buf(); const BPM = 104; const beat = 60 / BPM; const bar = beat * 4;
const CH = [[48, [60, 64, 67, 71]], [45, [57, 60, 64, 69]], [41, [57, 60, 65, 69]], [43, [59, 62, 67, 71]]];
function tone(f, dur, a = .02, r = .4, harm = [1, .35, .12]) { const n = Math.round((dur + r) * SR); const o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; let s = 0; harm.forEach((h, k) => { s += h * Math.sin(2 * Math.PI * f * (k + 1) * t); }); const e = Math.min(1, t / a) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / r)); o[i] = s * e; } return o; }
function pluck(f, dur = .38) { const n = Math.round(dur * SR); const o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (Math.sin(2 * Math.PI * f * t) + .5 * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 14) + .2 * Math.sin(2 * Math.PI * f * 3 * t) * Math.exp(-t * 20)) * Math.exp(-t * 7) * Math.min(1, t / .004); } return o; }
for (let b = 0; b * bar < TOTAL; b++) {
  const [root, notes] = CH[b % 4]; const t0 = b * bar;
  notes.slice(0, 3).forEach((m) => add(music, tone(hz(m - 12), bar * .98, .35, .5, [1, .25]), t0, .06));
  add(music, tone(hz(root), beat * 1.8, .01, .4, [1, .4]), t0, .17); add(music, tone(hz(root), beat * 1.6, .01, .4, [1, .4]), t0 + beat * 2, .13);
  const pat = [0, 1, 2, 3, 2, 1, 2, 3];
  for (let k = 0; k < 8; k++) { const t = t0 + k * beat / 2; if (t < 2) continue; add(music, pluck(hz(notes[pat[k]] + (t > 66 ? 12 : 0))), t, .15 + (k % 2 ? 0 : .03)); }
  if (t0 >= 2) for (let k = 0; k < 4; k++) { const t = t0 + k * beat + beat / 2; const n = Math.round(.04 * SR); const sh = new Float32Array(n); let hp = 0, pv = 0; for (let i = 0; i < n; i++) { const x = rnd(); hp = .9 * (hp + x - pv); pv = x; sh[i] = hp * Math.exp(-i / (.012 * SR)); } add(music, sh, t, .05); }
  if (t0 >= 2) { const kick = (t) => { const n = Math.round(.16 * SR); const o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { ph += 2 * Math.PI * (120 * Math.exp(-i / (.025 * SR)) + 45) / SR; o[i] = Math.sin(ph) * Math.exp(-i / (.07 * SR)); } add(music, o, t, .22); }; kick(t0); kick(t0 + beat * 2); }
}
const fade = (a, from, to) => { const i0 = Math.round(from * SR), i1 = Math.round(to * SR); for (let i = i0; i < Math.min(a.length, i1); i++) a[i] *= 1 - (i - i0) / (i1 - i0); };
fade(music, TOTAL - 2.0, TOTAL);
for (let i = 0; i < Math.round(1.2 * SR); i++) music[i] *= Math.min(1, i / (1.2 * SR));
const toPcm = (f, peak) => { let m = 0; for (const v of f) m = Math.max(m, Math.abs(v)); const g = peak / (m || 1); const o = new Int16Array(f.length); for (let i = 0; i < f.length; i++) o[i] = Math.max(-32767, Math.min(32767, Math.round(f[i] * g * 32767))); return o; };
writeWav(path.join(BUILD, 'sfx.wav'), toPcm(sfx, .85));
writeWav(path.join(BUILD, 'music.wav'), toPcm(music, .8));
console.log('build/sfx.wav, build/music.wav');
