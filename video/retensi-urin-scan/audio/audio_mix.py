"""Musik medical-tech lembut (tanpa alarm, tanpa suara jantung/organ) + klik kecil saat berpindah tampilan + voice-over pemesan untuk "Kantong gelap besar di panggul ini apa?" (±41 dtk).
Musik dan klik disintesis 100% dari kode (numpy), judul "MEDCOEL Soft Pulse (varian retensi urin)". Tidak ada sampel/musik pihak ketiga.
Lisensi musik dan efek: CC0 1.0 (domain publik), dibuat untuk MEDCOEL pada sesi ini; boleh untuk promosi Instagram/TikTok tanpa atribusi.
Dicampur: audio/voiceover-susun.wav (voice-over pemesan, disusun per kalimat oleh tools/susun_linimasa.py, suara tidak diubah), musik dan klik (musik turun di bawah suara narator).
Pemakaian: python3 video/retensi-urin-scan/audio/audio_mix.py -> music.wav, sfx.wav, bed.wav, mix.wav (butuh ffmpeg)"""
import json, os, subprocess, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); C = json.load(open(os.path.join(HERE, '..', 'cues.json')))
sr = 44100; T = C['dur']; N = int(T * sr); t = np.arange(N) / sr; rng = np.random.default_rng(61)
V = {v['id']: v['t'] for v in C['vo']}; KK = C['k']
def rd(path, rate):
    b = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(rate), '-'], capture_output=True).stdout
    return np.frombuffer(b, dtype=np.float32).astype(np.float64)
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
BPM = 84; B1 = 60 / BPM; BAR = 4 * B1
CH = [('D', 'F', 'A', 'C'), ('Bb', 'D', 'F', 'A'), ('G', 'Bb', 'D', 'F'), ('A', 'C#', 'E', 'G')]; RT = ['D', 'Bb', 'G', 'A']
A1 = 11.8; A2 = 26.4
def dens(x): return 0.5 if x < A1 else 0.34 if x < A2 else 0.6                     # lebih tipis saat animasi, sedikit lebih penuh di bagian rekaman
bi = 0
while bi * BAR < T:
    xs = bi * BAR; ch = CH[bi % 4]; d = dens(xs)
    add(mus, xs, pad([nf(ch[0], -1), nf(ch[1], 0), nf(ch[2], 0), nf(ch[3], 0)], BAR + 0.7, 0.12 * (0.7 + 0.5 * d)))
    add(mus, xs, sub(nf(RT[bi % 4], -2), BAR * 0.95, 0.16 * (0.6 + 0.6 * d))); bi += 1
PAT = [0, 2, 3, 1, 3, 2, 1, 2]; k = 0
while k * B1 / 2 < T - 0.5:
    x = k * B1 / 2; ch = CH[int(x / BAR) % 4]; step = k % 8; d = dens(x)
    if step in (0, 3, 6) or (d > 0.55 and step in (1, 4)): add(mus, x, bell(nf(ch[PAT[step] % 4], 1 if step % 3 else 2), 0.055 + 0.03 * d, 0.5 + 0.4 * (step == 0)))
    k += 1
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
def rise(t0, dur, g=1.0):
    n = int(dur * sr); tt = np.arange(n) / sr; f = 300 + 700 * (tt / dur) ** 1.5; sig = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.5
    add(sfx, t0, sig * 0.07 + lp(rng.standard_normal(n), 30) * np.sin(np.pi * np.clip(tt / dur, 0, 1)) * 0.2, g)
# klik kecil hanya saat berpindah tampilan: mulai animasi, layar terbagi, kembali ke rekaman, tombol Bandingkan (klik asli di klip 02), tampilan perbandingan, penutup
for tk in (11.8, 19.8, 26.4, KK['bandingkan'], 28.9, V['s11'][0] - 0.06): click(tk, 1500 if tk != KK['bandingkan'] else 1650)
vo = np.zeros(N); w = rd(os.path.join(HERE, 'voiceover-susun.wav'), sr); vo[:min(N, len(w))] = w[:N]
e = lp(np.abs(vo), int(0.06 * sr)); e = e / (np.percentile(e[e > 0], 95) + 1e-9) if np.any(e > 0) else e; sp = np.clip(e * 2.0, 0, 1)
duck = 1 - 0.7 * lp(sp, int(0.22 * sr)); sfx_duck = 1 - 0.3 * lp(sp, int(0.18 * sr))
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mu = mus / (rms(mus) + 1e-9) * 0.075 * duck; fx = sfx / (np.abs(sfx).max() + 1e-9) * 0.25 * sfx_duck
bed = mu + fx
def wr(name, a):
    w = wave.open(os.path.join(HERE, name), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
wr('music.wav', mus / (np.abs(mus).max() + 1e-9) * 0.5); wr('sfx.wav', fx); wr('bed.wav', bed); wr('vo-pos.wav', vo * 0.9)
mixed = bed + vo * 0.9; wr('premix.wav', mixed)
m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', os.path.join(HERE, 'premix.wav'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
li = float([l for l in m.splitlines() if l.strip().startswith('I:')][-1].split()[1]); gdb = -14.0 - li
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'premix.wav'), '-af', f'volume={gdb}dB,alimiter=limit=0.89:level=0', '-ar', str(sr), '-ac', '1', '-t', str(T), os.path.join(HERE, 'mix.wav')], check=True)
print('ok', 'premix LUFS', li, 'gain dB', round(gdb, 2))
