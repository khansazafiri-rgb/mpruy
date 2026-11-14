"""Musik ringan + efek air "Kenapa jari keriput habis berenang?" (46,4 dtk), disintesis 100% dari kode (numpy). Tidak ada sampel/musik pihak ketiga.
Narasi: audio/narasi.wav (Google AI Studio, dari pemesan, 40,36 dtk) dipakai APA ADANYA; setelah kalimat terakhir hanya musik dan efek (kartu penutup).
Judul musik: "MEDCOEL Pool Day" (marimba/pluck ringan dan bantalan hangat, 96 BPM, rasa ingin tahu -> terang di overview web).
Efek air: dengung air bawah (derau lolos-rendah), kecipak, gelembung; efek tipis untuk sinyal saraf, penyempitan, dan lipatan; tik UI lembut pada klik di rekaman web (cues.json["klik"]).
Semua bunyi di bawah narasi (penurunan level otomatis). Lisensi musik dan efek: CC0 1.0 (domain publik), dibuat untuk MEDCOEL pada sesi ini, boleh untuk promosi tanpa atribusi.
Pemakaian: python3 video/jari-keriput/audio/audio_mix.py -> music.wav, sfx.wav, bed.wav, mix.wav (butuh ffmpeg)"""
import json, os, subprocess, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); C = json.load(open(os.path.join(HERE, '..', 'cues.json')))
sr = 44100; T = C['dur']; N = int(T * sr); t = np.arange(N) / sr; rng = np.random.default_rng(11)
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
def pluck(f, g=0.1, d=0.35):                          # marimba/kalimba lembut
    n = int(1.4 * sr); tt = np.arange(n) / sr
    return (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 4 * f * tt) * np.exp(-tt / 0.06) + 0.12 * np.sin(2 * np.pi * 9.2 * f * tt) * np.exp(-tt / 0.02)) * env(n, 0.003, d) * g
def pad(freqs, dur, g=0.1):
    n = int(dur * sr); tt = np.arange(n) / sr; s = np.zeros(n)
    for f in freqs:
        for d in (-0.004, 0.004): s += 0.6 * np.sin(2 * np.pi * f * (1 + d) * tt) + 0.4 * (2 * np.abs(2 * ((f * (1 + d) * tt) % 1) - 1) - 1)
    return lp(s, 20) / max(1, len(freqs)) * np.minimum(1, tt / 0.9) * np.clip((dur - tt) / 1.0, 0, 1) * g
def sub(f, dur, g=0.18):
    n = int(dur * sr); tt = np.arange(n) / sr; return np.sin(2 * np.pi * f * tt) * np.minimum(1, tt / 0.06) * np.clip((dur - tt) / 0.4, 0, 1) * g
# ---- musik: C - Am - F - G (96 BPM), arpeggio ceria ringan; lebih terang saat overview web (36,4+)
BPM = 96; B1 = 60 / BPM; BAR = 4 * B1; CH = [('C', 'E', 'G', 'B'), ('A', 'C', 'E', 'G'), ('F', 'A', 'C', 'E'), ('G', 'B', 'D', 'F')]; ROOT = ['C', 'A', 'F', 'G']
def dens(x):
    if x < 4.6: return 0.55
    if x < 24: return 0.4
    if x < 36.4: return 0.55
    return 0.95
bi = 0
while bi * BAR < T:
    xs = bi * BAR; ch = CH[bi % 4]
    add(mus, xs, pad([nf(ch[0], -1), nf(ch[1], 0), nf(ch[2], 0), nf(ch[3], 0)], BAR + 0.6, 0.11 * (0.7 + 0.5 * dens(xs))))
    add(mus, xs, sub(nf(ROOT[bi % 4], -2), BAR * 0.95, 0.2 * (0.6 + 0.6 * dens(xs))))
    bi += 1
PAT = [0, 2, 1, 3, 2, 1, 3, 2]; k = 0
while k * B1 / 2 < T - 0.4:
    x = k * B1 / 2; bar = int(x / BAR); ch = CH[bar % 4]; step = k % 8; d = dens(x)
    keep = step in (0, 2, 3, 5, 6) or (d > 0.8 and step in (1, 4, 7))
    if keep: add(mus, x, pluck(nf(ch[PAT[step] % 4], 1 if step % 3 else 2), 0.06 + 0.04 * d, 0.3 + 0.2 * (step == 0)))
    k += 1
mus *= np.clip(t / 0.05, 0, 1) * np.clip((T - 0.04 - t) / 1.4, 0, 1)
# ---- efek air
def water_bed(a, b, g):                                # dengung air bawah: derau lolos-rendah dimodulasi pelan
    n = int((b - a) * sr); x = lp(rng.standard_normal(n), 60) * 6 + 0.4 * lp(rng.standard_normal(n), 400) * 12
    tt = np.arange(n) / sr; m = 0.65 + 0.35 * np.sin(2 * np.pi * 0.31 * tt + 1.0) * np.sin(2 * np.pi * 0.13 * tt)
    add(sfx, a, x * m * np.clip(tt / 0.6, 0, 1) * np.clip((b - a - tt) / 0.6, 0, 1), g)
def swish(t0, dur=0.7, g=1.0, up=True):                 # kecipak halus
    n = int(dur * sr); tt = np.arange(n) / sr; x = rng.standard_normal(n); fr = tt / dur
    bright = np.sin(np.pi * np.clip(fr, 0, 1)) ** 1.5
    add(sfx, t0, (lp(x, 14) * (1 - fr if up else fr) + hp(x, 8) * 0.25 * bright) * bright * 0.5, g)
def bubble(t0, f0=320, g=1.0):
    n = int(0.16 * sr); tt = np.arange(n) / sr; f = f0 * (1 + 2.2 * tt / 0.16); sig = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-tt / 0.045)
    add(sfx, t0, sig * 0.22, g)
def drip(t0, f0=900, g=1.0):
    n = int(0.22 * sr); tt = np.arange(n) / sr; f = f0 * (1 + 1.4 * np.exp(-tt / 0.03)); sig = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-tt / 0.07)
    add(sfx, t0, sig * 0.2, g)
def tick(t0, f=1500, g=1.0):                            # tik UI lembut
    n = int(0.06 * sr); tt = np.arange(n) / sr; x = rng.standard_normal(n)
    add(sfx, t0, (np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.012) * 0.22 + np.sin(2 * np.pi * f * 0.5 * tt) * np.exp(-tt / 0.02) * 0.1 + (x - lp(x, 4)) * np.exp(-tt / 0.004) * 0.08), g)
def zing(t0, f0=1200, f1=1900, g=1.0):                  # denyut sinyal saraf: nada pendek naik
    n = int(0.12 * sr); tt = np.arange(n) / sr; f = f0 + (f1 - f0) * tt / 0.12; sig = np.sin(2 * np.pi * np.cumsum(f) / sr) * env(n, 0.004, 0.05)
    add(sfx, t0, sig * 0.18, g)
def squeeze(t0, dur, g=1.0):                            # pembuluh menyempit: glide turun halus
    n = int(dur * sr); tt = np.arange(n) / sr; f = 520 - 200 * tt / dur; sig = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.2
    add(sfx, t0, sig * 0.1, g)
def crinkle(t0, dur, g=1.0):                            # lipatan kulit: kerutan halus (letupan derau pendek)
    for i in range(int(dur * 11)):
        x = t0 + i / 11 + rng.random() * 0.05; n = int(0.025 * sr); tt = np.arange(n) / sr; z = rng.standard_normal(n)
        add(sfx, x, hp(z, 5) * np.exp(-tt / 0.006) * 0.14 * (0.5 + rng.random()), g)
# dengung air: adegan luar (0-4,9 dan 23,3-36,7) kuat, penampang pelan
water_bed(0.0, 4.9, 0.05); water_bed(4.4, 24.0, 0.022); water_bed(23.3, 36.7, 0.05)
for x in (0.35, 1.5, 2.45, 3.4, 24.6, 26.0, 27.5, 30.2, 33.0, 35.1): swish(x, 0.8, 0.9, x % 2 > 1)
for i, x in enumerate((0.9, 2.2, 3.0, 4.2, 25.2, 26.9, 28.3, 31.4, 34.2, 35.8)): bubble(x + 0.1 * (i % 3), 280 + 40 * (i % 4), 0.9)
for x in (5.4, 6.3, 12.6, 13.4): drip(x, 800 + 150 * (x % 3), 0.8)
for k2 in range(4): zing(14.76 + k2 * 0.78, 1100 + 80 * k2, 1750 + 80 * k2, 1.0)
squeeze(C['mekanisme']['menyempit'], 2.6, 1.0); crinkle(C['mekanisme']['lipatan'][0], 2.0, 1.0)
for tk in C['klik']: tick(tk, 1450 + 120 * (int(tk * 10) % 3), 1.0)
# ---- penurunan level musik/efek di bawah narasi (narasi tidak diubah)
ns = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(HERE, 'narasi.wav'), '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout
nar = np.frombuffer(ns, dtype=np.float32).astype(np.float64); nar = np.pad(nar, (0, max(0, N - len(nar))))[:N]
e = lp(np.abs(nar), int(0.06 * sr)); e = e / (np.percentile(e, 95) + 1e-9); sp = np.clip(e * 2.0, 0, 1)
duck = 1 - 0.72 * lp(sp, int(0.22 * sr)); sfx_duck = 1 - 0.45 * lp(sp, int(0.18 * sr))
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mu = mus / (rms(mus) + 1e-9) * 0.075 * duck; fx = sfx / (np.abs(sfx).max() + 1e-9) * 0.22 * sfx_duck
bed = mu + fx
def wr(name, a):
    w = wave.open(os.path.join(HERE, name), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
wr('music.wav', mus / (np.abs(mus).max() + 1e-9) * 0.5); wr('sfx.wav', fx); wr('bed.wav', bed)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'narasi.wav'), '-i', os.path.join(HERE, 'bed.wav'), '-filter_complex',
                f'[0:a]aresample={sr},apad=whole_dur={T}[n];[n][1:a]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-13:TP=-1.2:LRA=11,alimiter=limit=0.89:level=0[o]', '-map', '[o]', '-ar', str(sr), '-ac', '1', '-t', str(T), os.path.join(HERE, 'mix.wav')], check=True)
print('ok', round(float(np.abs(bed).max()), 3))
