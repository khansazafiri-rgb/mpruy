"""Musik instrumental medical-tech ringan + klik skenario + 'ting' momen "oh, jadi begitu" "Kenapa ada cairan di sekitar jantung?" (38,8 dtk), disintesis 100% dari kode (numpy).
Judul: "MEDCOEL Soft Pulse (varian mekanisme)". Tidak ada sampel/musik pihak ketiga. Lisensi musik dan efek: CC0 1.0 (domain publik), dibuat untuk MEDCOEL pada sesi ini, boleh untuk promosi Instagram/TikTok tanpa atribusi.
Struktur: pad hangat + bel lembut 84 BPM; saat animasi (8,94-29,08) musik menipis dan lebih jernih, dengan 'ting' naik pada momen kunci (lapis perikardium, peradangan, cairan bertambah, tekanan) dan sapuan naik saat kembali ke produk;
klik kecil HANYA saat skenario dipilih (cues.json["klik"]). Voice-over (audio/voiceover.wav, Google AI Studio dari pemesan) dicampur apa adanya; musik dan efek turun di bawahnya.
Pemakaian: python3 video/live-4d-perikardial-mekanisme/audio/audio_mix.py -> music.wav, sfx.wav, bed.wav, mix.wav (butuh ffmpeg)"""
import json, os, subprocess, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); C = json.load(open(os.path.join(HERE, '..', 'cues.json')))
sr = 44100; T = C['dur']; N = int(T * sr); t = np.arange(N) / sr; rng = np.random.default_rng(41)
mus = np.zeros(N); sfx = np.zeros(N)
def add(buf, t0, sig, g=1.0):
    i = int(t0 * sr)
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i] * g
def lp(x, k): k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')
def env(n, a, d): tt = np.arange(n) / sr; return np.minimum(1, tt / a) * np.exp(-tt / d)
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def nf(name, o=0):
    base = NOTE[name[0]] + (-1 if 'b' in name else 1 if '#' in name else 0); return 440.0 * 2 ** ((base - 9) / 12 + o)
def bell(f, g=0.1, d=0.8):
    n = int(2.0 * sr); tt = np.arange(n) / sr
    return (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt / 0.2) + 0.1 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt / 0.07)) * env(n, 0.004, d) * g
def pad(freqs, dur, g=0.1):
    n = int(dur * sr); tt = np.arange(n) / sr; s = np.zeros(n)
    for f in freqs:
        for d in (-0.004, 0.004): s += 0.6 * np.sin(2 * np.pi * f * (1 + d) * tt) + 0.4 * (2 * np.abs(2 * ((f * (1 + d) * tt) % 1) - 1) - 1)
    return lp(s, 22) / max(1, len(freqs)) * np.minimum(1, tt / 0.9) * np.clip((dur - tt) / 1.0, 0, 1) * g
def sub(f, dur, g=0.2):
    n = int(dur * sr); tt = np.arange(n) / sr; return np.sin(2 * np.pi * f * tt) * np.minimum(1, tt / 0.06) * np.clip((dur - tt) / 0.4, 0, 1) * g
def thump(t0, g=1.0):
    n = int(0.28 * sr); tt = np.arange(n) / sr; add(mus, t0, np.sin(2 * np.pi * (62 - 22 * tt / 0.25) * tt) * np.exp(-tt / 0.07) * 0.5, g)
BPM = 84; B1 = 60 / BPM; BAR = 4 * B1; AN = C['shots']['anim']['out']
CH = [('D', 'F', 'A', 'C'), ('Bb', 'D', 'F', 'A'), ('G', 'Bb', 'D', 'F'), ('A', 'C#', 'E', 'G')]; RT = ['D', 'Bb', 'G', 'A']
def dens(x): return 0.45 if x < AN[0] else 0.32 if x < AN[1] else 0.85 if x < 36.1 else 0.7
bi = 0
while bi * BAR < T:
    xs = bi * BAR; ch = CH[bi % 4]; d = dens(xs)
    add(mus, xs, pad([nf(ch[0], -1), nf(ch[1], 0), nf(ch[2], 0), nf(ch[3], 0)], BAR + 0.7, 0.12 * (0.7 + 0.5 * d)))
    add(mus, xs, sub(nf(RT[bi % 4], -2), BAR * 0.95, 0.18 * (0.6 + 0.6 * d))); bi += 1
PAT = [0, 2, 3, 1, 3, 2, 1, 2]; k = 0
while k * B1 / 2 < T - 0.5:
    x = k * B1 / 2; ch = CH[int(x / BAR) % 4]; step = k % 8; d = dens(x)
    if step in (0, 3, 6) or (d > 0.7 and step in (1, 4)): add(mus, x, bell(nf(ch[PAT[step] % 4], 1 if step % 3 else 2), 0.06 + 0.03 * d, 0.5 + 0.4 * (step == 0)))
    k += 1
x = 0.3
while x < T - 0.5:
    if not (AN[0] <= x < AN[1]) or x < AN[0]: thump(x, 0.5)
    x += 60 / 92
def echo(x, d1, d2, f=0.26):
    y = x.copy()
    for k2, dly in enumerate((d1, d2), 1):
        o = int(dly * sr); y[o:] += x[:-o] * (f ** k2)
    return y
mus = echo(mus, 0.75 * B1 * 2, 1.5 * B1 * 2, 0.24)
mus *= np.clip(t / 0.05, 0, 1) * np.clip((T - 0.04 - t) / 1.6, 0, 1)
def click(t0, f=1500, g=1.0):
    n = int(0.06 * sr); tt = np.arange(n) / sr; x = rng.standard_normal(n)
    add(sfx, t0, np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.012) * 0.24 + np.sin(2 * np.pi * f * 0.5 * tt) * np.exp(-tt / 0.02) * 0.1 + (x - lp(x, 4)) * np.exp(-tt / 0.004) * 0.09, g)
def ting(t0, f=1318.5, g=1.0):
    n = int(1.3 * sr); tt = np.arange(n) / sr
    add(sfx, t0, (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt / 0.15) + 0.4 * np.sin(2 * np.pi * f * 1.33 * tt) * np.exp(-tt / 0.4)) * env(n, 0.004, 0.45) * 0.16, g)
def rise(t0, dur, g=1.0):                              # sapuan naik lembut: momen "oh, jadi begitu" / kembali ke produk
    n = int(dur * sr); tt = np.arange(n) / sr; f = 300 + 700 * (tt / dur) ** 1.5; sig = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.5
    add(sfx, t0, sig * 0.07 + lp(rng.standard_normal(n), 30) * np.sin(np.pi * np.clip(tt / dur, 0, 1)) * 0.2, g)
for tk in C['klik']: click(tk, 1500); ting(tk + 0.07)
A = C['anim']
for i, x in enumerate((AN[0] + 0.2, A['radang'][0] + 0.1, A['terkumpul'][0] + 0.1, A['tekanan'][0] + 0.1)): ting(x, (1046.5, 1174.7, 1318.5, 987.8)[i], 0.9)   # "oh, jadi begitu" tiap tahap
rise(AN[1] - 0.5, 0.9, 1.0); ting(AN[1] + 0.3, 1568, 0.7)
vo_path = os.path.join(HERE, 'voiceover.wav'); vo = np.zeros(N)
if os.path.exists(vo_path):
    ns = subprocess.run(['ffmpeg', '-v', 'error', '-i', vo_path, '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout
    w = np.frombuffer(ns, dtype=np.float32).astype(np.float64); vo[:min(N, len(w))] = w[:N]
e = lp(np.abs(vo), int(0.06 * sr)); e = e / (np.percentile(e[e > 0], 95) + 1e-9) if np.any(e > 0) else e; sp = np.clip(e * 2.0, 0, 1)
duck = 1 - 0.7 * lp(sp, int(0.22 * sr)); sfx_duck = 1 - 0.3 * lp(sp, int(0.18 * sr))
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mu = mus / (rms(mus) + 1e-9) * (0.075 if np.any(vo) else 0.11) * duck; fx = sfx / (np.abs(sfx).max() + 1e-9) * 0.25 * sfx_duck
bed = mu + fx
def wr(name, a):
    w = wave.open(os.path.join(HERE, name), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
wr('music.wav', mus / (np.abs(mus).max() + 1e-9) * 0.5); wr('sfx.wav', fx); wr('bed.wav', bed)
if np.any(vo):
    wr('vo-pos.wav', vo * 0.9)
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'bed.wav'), '-i', os.path.join(HERE, 'vo-pos.wav'), '-filter_complex', '[0:a][1:a]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.89:level=0[o]']
else:
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'bed.wav'), '-filter_complex', '[0:a]loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.89:level=0[o]']
subprocess.run(cmd + ['-map', '[o]', '-ar', str(sr), '-ac', '1', '-t', str(T), os.path.join(HERE, 'mix.wav')], check=True)
print('ok', round(float(np.abs(bed).max()), 3), 'dengan VO' if np.any(vo) else 'tanpa VO')
