// Efek suara ringan dan musik latar buatan sendiri (disintesis di sini, jadi bebas hak cipta
// dan tanpa unduhan). Menulis build/sfx.wav dan build/music.wav sepanjang total iklan.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAMPLE_RATE as SR, writeWav } from '../src/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(fs.readFileSync(path.join(HERE, 'ad.json'), 'utf8'));
const TOTAL = spec.total; const N = Math.round(TOTAL * SR);
const BUILD = path.join(HERE, 'build'); fs.mkdirSync(BUILD, { recursive: true });
const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);          // nomor MIDI -> Hz
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const buf = () => new Float32Array(N);
const add = (dst, src, at, gain = 1) => { const o = Math.round(at * SR); for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * gain; };

// ---------- efek ----------
const env = (i, n, a, r) => Math.min(1, i / (a * SR)) * Math.pow(Math.max(0, 1 - i / n), r);
function pop(f0 = 760, f1 = 320, dur = .11) { const n = Math.round(dur * SR); const o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const f = f0 + (f1 - f0) * (i / n); ph += 2 * Math.PI * f / SR; o[i] = Math.sin(ph) * env(i, n, .003, 2.2); } return o; }
function tap() { const n = Math.round(.09 * SR); const o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { ph += 2 * Math.PI * (210 - 90 * i / n) / SR; o[i] = (Math.sin(ph) * .9 + rnd() * .15 * Math.max(0, 1 - i / (.012 * SR))) * env(i, n, .001, 2.6); } return o; }
function whoosh(dur = .38) { const n = Math.round(dur * SR); const o = new Float32Array(n); let lp = 0, bp = 0; for (let i = 0; i < n; i++) { const k = i / n; const fc = 400 + 3800 * Math.sin(Math.PI * k) ; const a = Math.min(.95, 2 * Math.PI * fc / SR); lp += a * (rnd() - lp); bp += a * (lp - bp); o[i] = (lp - bp) * 2.2 * Math.sin(Math.PI * k) ** 1.5; } return o; }
function ding(f = 1318, dur = .75) { const n = Math.round(dur * SR); const o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (Math.sin(2 * Math.PI * f * t) + .45 * Math.sin(2 * Math.PI * f * 2.01 * t) * Math.exp(-t * 9) + .25 * Math.sin(2 * Math.PI * f * 3.02 * t) * Math.exp(-t * 14)) * env(i, n, .002, 3.2) * .6; } return o; }
function paper(dur = .2) { const n = Math.round(dur * SR); const o = new Float32Array(n); let hp = 0, prev = 0; for (let i = 0; i < n; i++) { const x = rnd(); hp = .86 * (hp + x - prev); prev = x; o[i] = hp * env(i, n, .004, 1.5) * (.6 + .4 * Math.sin(i / 90)); } return o; }
function stampThud() { const n = Math.round(.3 * SR); const o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { ph += 2 * Math.PI * (110 - 55 * i / n) / SR; o[i] = (Math.sin(ph) * 1.0 + rnd() * .4 * Math.max(0, 1 - i / (.03 * SR))) * env(i, n, .001, 3); } return o; }
function sparkle() { const o = new Float32Array(Math.round(.5 * SR)); [1568, 2093, 2637].forEach((f, k) => add(o, ding(f, .25), k * .07, .4)); return o; }

const sfx = buf();
const cue = (t, wave, g = .5) => add(sfx, wave, t, g);
const S = (i) => spec.scenes[i - 1];
// peralihan antar shot + masuknya judul
spec.scenes.forEach((s, i) => { if (i > 0) cue(s.start - .02, whoosh(), .42); cue(s.start + .1, pop(900, 420, .1), .3); });
// S1: balon obrolan dan tumpukan PDF
for (let i = 0; i < 8; i++) cue(S(1).start + .3 + i * .27, pop(640 + i * 30, 300, .08), .26);
for (let i = 0; i < 6; i++) cue(S(1).start + .5 + i * .3, paper(.16), .2);
// S2: stiker GRATIS
cue(S(2).start + .55, pop(520, 980, .16), .45); cue(S(2).start + .6, sparkle(), .3);
// S3: hitung naik (detik-detik kecil) lalu kartu
for (let i = 0; i < 14; i++) cue(S(3).start + .1 + i * .1, tap(), .14 + i * .008); cue(S(3).start + 1.5, ding(1568, .6), .4); cue(S(3).start + 1.75, whoosh(.3), .3);
// S5: PDF lama muncul satu per satu, lalu "ketemu!"
for (let i = 0; i < 6; i++) cue(S(5).start + .35 + i * .3, paper(.14), .22); cue(S(5).start + 2.3, pop(500, 900, .18), .5); cue(S(5).start + 2.35, sparkle(), .3);
// Web layar penuh: tiap sorotan (cincin emas) diberi ketukan jari, tiap potongan klip diberi "tik" halus.
// Angka = detik di dalam shot, sama dengan beats[].t di stage-ad.html.
const RING = { 2: [.9, 2.0], 3: [2.2, 4.0], 4: [1.0, 2.0, 3.0], 6: [.8, 2.7, 4.2], 7: [.45, 2.3, 3.5], 8: [1.0, 2.6], 9: [.45, 2.2, 3.8], 11: [.85], 12: [.1] };
for (const [id, ts] of Object.entries(RING)) ts.forEach((t, k) => { cue(S(+id).start + t + .05, tap(), .55); if (k > 0 || +id !== 12) cue(S(+id).start + t + .2, pop(1040, 700, .06), .12); });
[[4, 1.0], [4, 2.0], [4, 3.0], [6, 2.2], [7, 2.1], [9, 1.7]].forEach(([id, t]) => cue(S(id).start + t, paper(.12), .3));
cue(S(5).start + 3.4, whoosh(.35), .4);   // web naik dari bawah
// S10: stempel, balik kartu, label
cue(S(10).start + 1.35, stampThud(), .8); cue(S(10).start + 2.4, whoosh(.3), .4); cue(S(10).start + 2.85, ding(1175, .5), .4);
[3.2, 3.5, 3.8].forEach((t, i) => cue(S(10).start + t, pop(600 + i * 120, 300, .1), .4));
// S12: jawaban benar
cue(S(12).start + .4, ding(1318, .8), .5);
// S13-S14: ikon teman dan kartu komunitas
for (let i = 0; i < 6; i++) cue(S(13).start + .55 + i * .32, pop(520 + i * 70, 260, .12), .42);
for (let i = 0; i < 9; i++) cue(S(14).start + .35 + i * .4, pop(480 + (i % 5) * 80, 250, .1), .36);
// S15: tumpukan bank soal
for (let i = 0; i < 8; i++) cue(S(15).start + .4 + i * .55, pop(420 + i * 50, 240, .1), .36);
// S16: ajakan
cue(S(16).start + .6, pop(520, 980, .16), .45); cue(S(16).start + .9, sparkle(), .35); cue(S(16).start + 1.0, ding(1568, 1.2), .35);

// ---------- musik: bantalan akor + petikan + detak ringan ----------
const music = buf(); const BPM = 100; const beat = 60 / BPM; const bar = beat * 4;
const CH = [[48, [60, 64, 67, 71]], [45, [57, 60, 64, 69]], [41, [57, 60, 65, 69]], [43, [59, 62, 67, 71]]]; // Cmaj7 Am7 Fmaj7 G
function tone(f, dur, a = .02, r = .4, harm = [1, .35, .12]) { const n = Math.round((dur + r) * SR); const o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; let s = 0; harm.forEach((h, k) => { s += h * Math.sin(2 * Math.PI * f * (k + 1) * t); }); const e = Math.min(1, t / a) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / r)); o[i] = s * e; } return o; }
function pluck(f, dur = .38) { const n = Math.round(dur * SR); const o = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; o[i] = (Math.sin(2 * Math.PI * f * t) + .5 * Math.sin(2 * Math.PI * f * 2 * t) * Math.exp(-t * 14) + .2 * Math.sin(2 * Math.PI * f * 3 * t) * Math.exp(-t * 20)) * Math.exp(-t * 7) * Math.min(1, t / .004); } return o; }
for (let b = 0; b * bar < TOTAL; b++) {
  const [root, notes] = CH[b % 4]; const t0 = b * bar;
  notes.slice(0, 3).forEach((m) => add(music, tone(hz(m - 12), bar * .98, .35, .5, [1, .25]), t0, .06));
  add(music, tone(hz(root), beat * 1.8, .01, .4, [1, .4]), t0, .17); add(music, tone(hz(root), beat * 1.6, .01, .4, [1, .4]), t0 + beat * 2, .13);
  const pat = [0, 1, 2, 3, 2, 1, 2, 3];
  for (let k = 0; k < 8; k++) { const t = t0 + k * beat / 2; if (t < 3) continue; add(music, pluck(hz(notes[pat[k]] + (t > 66 && t < 71 ? 12 : 0))), t, .15 + (k % 2 ? 0 : .03)); }
  if (t0 >= 3) for (let k = 0; k < 4; k++) { const t = t0 + k * beat + beat / 2; const n = Math.round(.04 * SR); const sh = new Float32Array(n); let hp = 0, pv = 0; for (let i = 0; i < n; i++) { const x = rnd(); hp = .9 * (hp + x - pv); pv = x; sh[i] = hp * Math.exp(-i / (.012 * SR)); } add(music, sh, t, .05); }
  if (t0 >= 3) { const kick = (t) => { const n = Math.round(.16 * SR); const o = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { ph += 2 * Math.PI * (120 * Math.exp(-i / (.025 * SR)) + 45) / SR; o[i] = Math.sin(ph) * Math.exp(-i / (.07 * SR)); } add(music, o, t, .22); }; kick(t0); kick(t0 + beat * 2); }
}
// akor penutup + peredam di ujung
const fade = (a, from, to) => { const i0 = Math.round(from * SR), i1 = Math.round(to * SR); for (let i = i0; i < Math.min(a.length, i1); i++) a[i] *= 1 - (i - i0) / (i1 - i0); };
fade(music, TOTAL - 2.2, TOTAL);
for (let i = 0; i < Math.round(1.5 * SR); i++) music[i] *= Math.min(1, i / (1.5 * SR));

const toPcm = (f, peak) => { let m = 0; for (const v of f) m = Math.max(m, Math.abs(v)); const g = peak / (m || 1); const o = new Int16Array(f.length); for (let i = 0; i < f.length; i++) o[i] = Math.max(-32767, Math.min(32767, Math.round(f[i] * g * 32767))); return o; };
writeWav(path.join(BUILD, 'sfx.wav'), toPcm(sfx, .85));
writeWav(path.join(BUILD, 'music.wav'), toPcm(music, .8));
console.log('build/sfx.wav, build/music.wav');
