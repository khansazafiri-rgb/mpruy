"""Musik + efek digital "Seseorang kolaps di kampus: langkah awal" (43,6 dtk), disintesis 100% dari kode (numpy). Tidak ada sampel/musik pihak ketiga.
Cerita 0-31 dtk TANPA narator: musik tenang dan serius (bukan "menang level"), klik digital kecil saat teks langkah berganti, metronom 110/menit mengikuti kompresi RJP,
bunyi ketukan bahu, nada telepon, napas megap-megap (derau lembut), AED menyala dan bunyi petunjuk. Outro 31-43,6 dtk: musik lebih terang; narasi pendek Google AI Studio
(audio/narasi-outro.wav, DARI PEMESAN) dicampur bila berkas ada; jika belum ada, outro hanya musik + takarir layar.
Lisensi musik dan efek: CC0 1.0 (domain publik), dibuat untuk MEDCOEL pada sesi ini, boleh untuk promosi Instagram/TikTok tanpa atribusi.
Pemakaian: python3 video/ppgd-kampus/audio/audio_mix.py -> music.wav, sfx.wav, bed.wav, mix.wav (butuh ffmpeg)"""
import json, os, subprocess, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); C = json.load(open(os.path.join(HERE, '..', 'cues.json')))
sr = 44100; T = C['dur']; N = int(T * sr); t = np.arange(N) / sr; rng = np.random.default_rng(23)
mus = np.zeros(N); sfx = np.zeros(N)
def add(buf, t0, sig, g=1.0):
    i = int(t0 * sr)
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i] * g
def lp(x, k): k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')
def hp(x, k): return x - lp(x, k)
def env(n, a, d): tt = np.arange(n) / sr; return np.minimum(1, tt / a) * np.exp(-tt / d)
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def nf(name, o=0):
    base = NOTE[name[0]] + (-1 if 'b' in name else 1 if '#' in name else 0); return 440.0 * 2 ** ((base - 9) / 12 + o)
def sq(f, dur, g, d=0.25, duty=0.5):                    # pluck persegi lembut (rasa chiptune modern)
    n = int(dur * sr); tt = np.arange(n) / sr; ph = (f * tt) % 1
    return lp(np.where(ph < duty, 1.0, -1.0), 6) * env(n, 0.004, d) * g
def pad(freqs, dur, g=0.1):
    n = int(dur * sr); tt = np.arange(n) / sr; s = np.zeros(n)
    for f in freqs:
        for d in (-0.004, 0.004): s += 0.6 * np.sin(2 * np.pi * f * (1 + d) * tt) + 0.4 * (2 * np.abs(2 * ((f * (1 + d) * tt) % 1) - 1) - 1)
    return lp(s, 24) / max(1, len(freqs)) * np.minimum(1, tt / 1.0) * np.clip((dur - tt) / 1.0, 0, 1) * g
def sub(f, dur, g=0.2):
    n = int(dur * sr); tt = np.arange(n) / sr; return np.sin(2 * np.pi * f * tt) * np.minimum(1, tt / 0.06) * np.clip((dur - tt) / 0.4, 0, 1) * g
# ---- musik: Am - F - C - E (cerita, 55 BPM pad panjang); outro C - G - Am - F lebih terang
BAR = 4 * 60 / 66
CS = [('A', 'C', 'E', 'G'), ('F', 'A', 'C', 'E'), ('C', 'E', 'G', 'B'), ('E', 'G#', 'B', 'D')]; RS = ['A', 'F', 'C', 'E']
CO = [('C', 'E', 'G', 'B'), ('G', 'B', 'D', 'F#'), ('A', 'C', 'E', 'G'), ('F', 'A', 'C', 'E')]; RO = ['C', 'G', 'A', 'F']
O0 = C['sc']['outro'][0]; bi = 0
while bi * BAR < O0 + 0.4:
    xs = bi * BAR; ch = CS[bi % 4]; lvl = 0.5 if xs < 18 else (0.32 if xs < 27.8 else 0.55)
    add(mus, xs, pad([nf(ch[0], -1), nf(ch[1], 0), nf(ch[2], 0), nf(ch[3], 0)], BAR + 0.6, 0.11 * lvl * 2)); add(mus, xs, sub(nf(RS[bi % 4], -2), BAR * 0.95, 0.2 * lvl * 1.4)); bi += 1
bi = 0
while O0 - 0.2 + bi * BAR < T:
    xs = O0 - 0.2 + bi * BAR; ch = CO[bi % 4]
    add(mus, xs, pad([nf(ch[0], -1), nf(ch[1], 0), nf(ch[2], 0), nf(ch[3], 0)], BAR + 0.6, 0.12)); add(mus, xs, sub(nf(RO[bi % 4], -2), BAR * 0.95, 0.2)); bi += 1
# arpeggio tipis (lebih jarang saat RJP supaya metronom jelas)
B8 = 60 / 132; k = 0
while k * B8 < T - 0.4:
    x = k * B8
    if x < O0:
        ch = CS[int(x / BAR) % 4]; on = (x < 18.0 and k % 3 == 0) or (x >= 27.8 and k % 4 == 0)
        if on: add(mus, x, sq(nf(ch[[0, 2, 1, 3][k % 4]], 1), 0.5, 0.05, 0.22))
    else:
        ch = CO[int((x - O0 + 0.2) / BAR) % 4]
        if k % 2 == 0: add(mus, x, sq(nf(ch[[0, 1, 2, 3][(k // 2) % 4]], 1), 0.5, 0.06, 0.25))
    k += 1
mus *= np.clip(t / 0.05, 0, 1) * np.clip((T - 0.04 - t) / 1.4, 0, 1)
# ---- efek
def tick(t0, f=1500, g=1.0):
    n = int(0.07 * sr); tt = np.arange(n) / sr; x = rng.standard_normal(n)
    add(sfx, t0, (np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.014) * 0.24 + np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt / 0.01) * 0.08 + (x - lp(x, 4)) * np.exp(-tt / 0.004) * 0.06), g)
def blip(t0, f0=880, f1=1320, g=1.0):
    n = int(0.16 * sr); tt = np.arange(n) / sr; f = f0 + (f1 - f0) * np.minimum(1, tt / 0.05); add(sfx, t0, np.sign(np.sin(2 * np.pi * np.cumsum(f) / sr)) * 0.5 * np.exp(-tt / 0.07) * 0.2, g)
def thud(t0, g=1.0):
    n = int(0.45 * sr); tt = np.arange(n) / sr; add(sfx, t0, np.sin(2 * np.pi * (70 - 30 * tt / 0.4) * tt) * np.exp(-tt / 0.1) * 0.9 + lp(rng.standard_normal(n), 30) * np.exp(-tt / 0.06) * 3.0, g)
def knock(t0, g=1.0):
    n = int(0.12 * sr); tt = np.arange(n) / sr; add(sfx, t0, np.sin(2 * np.pi * 180 * tt) * np.exp(-tt / 0.02) * 0.6 + lp(rng.standard_normal(n), 12) * np.exp(-tt / 0.01) * 0.8, g)
def metronome(t0, accent=False, g=1.0):
    n = int(0.09 * sr); tt = np.arange(n) / sr; f = 1000 if accent else 760; add(sfx, t0, np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.02) * 0.5, g)
def gasp(t0, g=1.0):
    n = int(0.7 * sr); tt = np.arange(n) / sr; x = lp(rng.standard_normal(n), 14) * 5; add(sfx, t0, x * np.sin(np.pi * np.clip(tt / 0.7, 0, 1)) ** 2 * 0.25, g)
def phone_tones(t0, g=1.0):
    for i, f in enumerate((697 + 1209, 770 + 1336, 852 + 1477)):
        n = int(0.11 * sr); tt = np.arange(n) / sr; add(sfx, t0 + i * 0.16, (np.sin(2 * np.pi * (f - 1209 if i == 0 else f - (1336 if i == 1 else 1477)) * tt) + np.sin(2 * np.pi * (1209 if i == 0 else 1336 if i == 1 else 1477) * tt)) * 0.09 * np.minimum(1, tt / 0.005) * np.clip((0.11 - tt) / 0.01, 0, 1), g)
def aed_on(t0, g=1.0):
    for i, (f, d) in enumerate(((660, 0.14), (880, 0.2))): n = int(d * sr); tt = np.arange(n) / sr; add(sfx, t0 + i * 0.17, np.sign(np.sin(2 * np.pi * f * tt)) * 0.25 * np.exp(-tt / 0.1), g)
def aed_prompt(t0, g=1.0):
    for i in range(2): n = int(0.1 * sr); tt = np.arange(n) / sr; add(sfx, t0 + i * 0.16, np.sin(2 * np.pi * 1050 * tt) * np.exp(-tt / 0.05) * 0.3, g)
def sticky(t0, g=1.0):
    n = int(0.12 * sr); tt = np.arange(n) / sr; x = rng.standard_normal(n); add(sfx, t0, hp(x, 6) * np.exp(-tt / 0.03) * 0.5, g)
for x in C['klik']: tick(x, 1500, 1.0)
blip(1.5, 520, 300, 1.0); thud(1.95, 1.0)
for x in (7.0, 7.65, 8.3, 8.95): knock(x, 0.8)
phone_tones(10.95, 0.9); blip(12.0, 700, 1000, 0.8)
for x in C['napas']['megap']: gasp(x, 1.0)
x = 18.5
while x < 28.9: metronome(x, accent=False, g=0.9); x += 60 / 110
aed_on(C['aed']['nyala']); aed_prompt(C['aed']['nyala'] + 0.8); aed_prompt(C['aed']['nyala'] + 2.4); sticky(C['aed']['bantalan'][0] + 0.6); sticky(C['aed']['bantalan'][0] + 0.9)
for tt_ in (C['outro']['soal'][0], C['outro']['sim'][0]): tick(tt_, 1700, 0.9)
blip(C['outro']['akhir'], 880, 1760, 0.7); blip(C['wake']['t0'], 600, 900, 0.7)
# ---- narasi outro (opsional, dari pemesan) + penurunan level di bawahnya
nar_path = os.path.join(HERE, 'narasi-outro.wav'); nar = np.zeros(N)
if os.path.exists(nar_path):
    ns = subprocess.run(['ffmpeg', '-v', 'error', '-i', nar_path, '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout
    w = np.frombuffer(ns, dtype=np.float32).astype(np.float64); i0 = int(C['outro']['narasi'] * sr); nar[i0:i0 + len(w)] = w[:N - i0]
e = lp(np.abs(nar), int(0.06 * sr)); e = e / (np.percentile(e[e > 0], 95) + 1e-9) if np.any(e > 0) else e; sp = np.clip(e * 2.0, 0, 1)
duck = 1 - 0.7 * lp(sp, int(0.22 * sr)); sfx_duck = 1 - 0.4 * lp(sp, int(0.18 * sr))
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mu = mus / (rms(mus) + 1e-9) * 0.09 * duck; fx = sfx / (np.abs(sfx).max() + 1e-9) * 0.30 * sfx_duck
bed = mu + fx
def wr(name, a):
    w = wave.open(os.path.join(HERE, name), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
wr('music.wav', mus / (np.abs(mus).max() + 1e-9) * 0.5); wr('sfx.wav', fx); wr('bed.wav', bed)
if np.any(nar != 0): wr('narasi-posisi.wav', nar * 0.9)
if os.path.exists(nar_path):
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'bed.wav'), '-i', os.path.join(HERE, 'narasi-posisi.wav'), '-filter_complex', f'[0:a][1:a]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.89:level=0[o]']
else:
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'bed.wav'), '-filter_complex', '[0:a]loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.89:level=0[o]']
subprocess.run(cmd + ['-map', '[o]', '-ar', str(sr), '-ac', '1', '-t', str(T), os.path.join(HERE, 'mix.wav')], check=True)
print('ok', round(float(np.abs(bed).max()), 3), 'narasi' if os.path.exists(nar_path) else 'tanpa narasi')
