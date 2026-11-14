"""Musik + bunyi klik "Efusi pleura kanan di Live 4D Lab" (52,88 dtk), disintesis 100% dari kode (numpy). Tidak ada sampel/musik pihak ketiga.
Narasi: audio/narasi.wav (Google AI Studio, dari pemesan) dipakai APA ADANYA; hanya diberi penurunan level musik di bawahnya dan normalisasi akhir (penguatan seragam).
Judul musik: "MEDCOEL Quiet Scan" (medical-tech tenang, rasa ingin tahu: bel lembut berpantul, bantalan hangat, denyut bas pelan; makin penuh saat USG, menipis saat ilustrasi, lega di penutup).
Bunyi klik hanya pada pemilihan jendela probe, pindah tab Patologi, pilihan skenario/pembanding, dan perpindahan mode (USG -> CT): jadwal = cues.json["klik"] + tabPatologi.
Lisensi musik dan efek: CC0 1.0 (domain publik), dibuat untuk MEDCOEL pada sesi ini, boleh untuk promosi tanpa atribusi.
Pemakaian: python3 video/efusi-pleura/audio/audio_mix.py -> music.wav, sfx.wav, bed.wav, mix.wav (butuh ffmpeg)"""
import json, os, subprocess, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); C = json.load(open(os.path.join(HERE, '..', 'cues.json')))
sr = 44100; T = C['dur']; N = int(T * sr); t = np.arange(N) / sr; rng = np.random.default_rng(7)
mus = np.zeros(N); sfx = np.zeros(N)
def add(buf, t0, sig, g=1.0):
    i = int(t0 * sr)
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i] * g
def lp(x, k): k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')
def env(n, a, d): tt = np.arange(n) / sr; return np.minimum(1, tt / a) * np.exp(-tt / d)
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def nf(name, o=0):                                    # nama + 'b'/'#' + oktaf (A4 = 440)
    base = NOTE[name[0]] + (-1 if 'b' in name else 1 if '#' in name else 0)
    return 440.0 * 2 ** ((base - 9) / 12 + o)
def bell(f, g=0.1, d=0.9):                            # bel/kalimba lembut dengan sedikit partial tak harmonik
    n = int(2.4 * sr); tt = np.arange(n) / sr
    return (np.sin(2 * np.pi * f * tt) + 0.28 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt / 0.25) + 0.12 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt / 0.08)) * env(n, 0.004, d) * g
def pad(freqs, dur, g=0.1):                           # bantalan hangat: segitiga + sinus tersebar sedikit, naik pelan
    n = int(dur * sr); tt = np.arange(n) / sr; s = np.zeros(n)
    for f in freqs:
        for d in (-0.004, 0.004): s += 0.55 * np.sin(2 * np.pi * f * (1 + d) * tt) + 0.45 * (2 * np.abs(2 * ((f * (1 + d) * tt) % 1) - 1) - 1)
    return lp(s, 22) / max(1, len(freqs)) * np.minimum(1, tt / 1.0) * np.clip((dur - tt) / 1.2, 0, 1) * g
def sub(f, dur, g=0.2):
    n = int(dur * sr); tt = np.arange(n) / sr
    return np.sin(2 * np.pi * f * tt) * np.minimum(1, tt / 0.08) * np.clip((dur - tt) / 0.5, 0, 1) * g
def echo(x, d1=0.375, d2=0.75, f=0.34):
    y = x.copy()
    for k, dly in enumerate((d1, d2), 1):
        o = int(dly * sr); y[o:] += x[:-o] * (f ** k)
    return y
# ---- struktur: 78 BPM (bar = 3,08 dtk); akor tiap 2 bar (Dm9, Bbmaj7, Gm9, A7sus4) -> lega di penutup (Dmaj9)
BPM = 78; B1 = 60 / BPM; BAR = 4 * B1; CH = [('D', 'F', 'A', 'E'), ('Bb', 'D', 'F', 'A'), ('G', 'Bb', 'D', 'A'), ('A', 'D', 'E', 'G')]; ROOT = ['D', 'Bb', 'G', 'A']
def dens(x):                                          # kepadatan musik menurut adegan (0..1)
    if x < 5: return 0.45
    if x < 12.4: return 0.6
    if x < 17.4: return 0.4
    if x < 32.4: return 0.85
    if x < 38.6: return 0.5
    if x < 49.4: return 0.6
    return 0.85
bi = 0
while bi * 2 * BAR < T:
    xs = bi * 2 * BAR; ch = CH[bi % 4]
    add(mus, xs, pad([nf(ch[0], -1), nf(ch[1], 0), nf(ch[2], 0), nf(ch[3], 1)], 2 * BAR + 0.8, 0.12 * (0.7 + 0.5 * dens(xs))))
    add(mus, xs, sub(nf(ROOT[bi % 4], -2), 2 * BAR, 0.20 * (0.6 + 0.6 * dens(xs))))
    bi += 1
# bel arpeggio berpantul (rasa ingin tahu): pola tak simetris di 8 langkah per bar
PAT = [0, 2, 3, 1, 3, 2, 1, 2]
k = 0
while k * B1 / 2 < T - 0.5:
    x = k * B1 / 2; bar = int(x / BAR); ch = CH[(bar // 2) % 4]; step = k % 8; d = dens(x)
    keep = (step in (0, 3, 6)) or (d > 0.7 and step in (1, 4)) or (d > 0.55 and step == 5 and (bar % 2 == 1))
    if keep and d > 0.3:
        o = 1 if step % 3 else 2
        add(mus, x, bell(nf(ch[PAT[step] % 4], o), 0.07 + 0.03 * d, 0.55 + 0.4 * (step == 0)))
    k += 1
# penutup: bel lega menaik
for i, (nm, o) in enumerate([('D', 1), ('A', 1), ('D', 2), ('F#', 2), ('A', 2)]): add(mus, C['sc']['I'][0] + 0.15 + i * 0.22, bell(nf(nm, o), 0.10, 1.2))
mus = echo(mus, 0.5 * B1 * 3, B1 * 3 * 0.5 * 2 + 0.0, 0.26)
mus *= np.clip(t / 0.05, 0, 1) * np.clip((T - 0.04 - t) / 1.6, 0, 1)
# ---- klik UI lembut: tik pendek + sentuhan berfrekuensi 1,3-1,9 kHz
def click(f=1500, g=1.0):
    n = int(0.06 * sr); tt = np.arange(n) / sr; x = rng.standard_normal(n); nz = (x - lp(x, 4)) * np.exp(-tt / 0.004) * 0.10
    return (np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.012) * 0.22 + np.sin(2 * np.pi * f * 0.5 * tt) * np.exp(-tt / 0.02) * 0.10 + nz) * g
def mode_click(g=1.0):                                # perpindahan mode: dua nada pendek naik (USG -> CT)
    a = click(1250, 1.0); b = click(1880, 1.0); o = np.zeros(int(0.12 * sr)); o[:len(a)] += a; o[int(0.055 * sr):int(0.055 * sr) + len(b)] += b; return o * g
for tc in C['klik']:
    add(sfx, tc, mode_click(1.0) if abs(tc - C['EF']['modeCT']) < 0.01 else click(1500 + 120 * (tc % 3), 1.0))
add(sfx, C['BC']['tabPatologi'], click(1350, 0.8))
# ---- penurunan level musik di bawah narasi (narasi tidak diubah)
ns = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(HERE, 'narasi.wav'), '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout
nar = np.frombuffer(ns, dtype=np.float32).astype(np.float64); nar = np.pad(nar, (0, max(0, N - len(nar))))[:N]
e = lp(np.abs(nar), int(0.06 * sr)); e = e / (np.percentile(e, 95) + 1e-9); sp = np.clip(e * 2.0, 0, 1)
duck = 1 - 0.74 * lp(sp, int(0.22 * sr))                      # musik turun saat narator bicara; naik lagi di jeda
sfx_duck = 1 - 0.2 * lp(sp, int(0.18 * sr))
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mu = mus / (rms(mus) + 1e-9) * 0.075 * duck; fx = sfx / (np.abs(sfx).max() + 1e-9) * 0.20 * sfx_duck
bed = mu + fx
def wr(name, a):
    w = wave.open(os.path.join(HERE, name), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
wr('music.wav', mus / (np.abs(mus).max() + 1e-9) * 0.5); wr('sfx.wav', fx); wr('bed.wav', bed)
# ---- campur dengan narasi asli: resample + campur + normalisasi ≈ -14 LUFS (pembatas puncak level=0)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'narasi.wav'), '-i', os.path.join(HERE, 'bed.wav'), '-filter_complex',
                f'[0:a]aresample={sr},apad=whole_dur={T}[n];[n][1:a]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=9,alimiter=limit=0.85:level=0[o]', '-map', '[o]', '-ar', str(sr), '-ac', '1', '-t', str(T), os.path.join(HERE, 'mix.wav')], check=True)
print('ok', round(float(np.abs(bed).max()), 3))
