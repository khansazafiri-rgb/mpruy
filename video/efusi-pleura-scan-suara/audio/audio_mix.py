"""Musik medical-tech lembut (tanpa alarm) + klik/ting kecil + bunyi napas simulasi (04, 05) + voice-over pemesan untuk "Ruang gelap di atas diafragma kanan?" (±44,9 dtk).
Semua musik dan efek disintesis dari kode (numpy), judul "MEDCOEL Soft Pulse (varian pleura)". Tidak ada sampel/musik pihak ketiga.
Lisensi musik dan efek: CC0 1.0 (domain publik), dibuat untuk MEDCOEL pada sesi ini; boleh untuk promosi Instagram/TikTok tanpa atribusi.
Dicampur: audio/voiceover-susun.wav (voice-over pemesan, disusun per kalimat oleh tools/susun_linimasa.py, suara tidak diubah), bunyi napas dari berkas 04/05 (1,6 dtk pertama, GAIN SAMA sehingga
perbedaan level normal vs lebih lemah tidak diubah), musik dan efek (musik turun ±-15 dB selama perbandingan bunyi napas dan di bawah suara narator).
Pemakaian: python3 video/efusi-pleura-scan-suara/audio/audio_mix.py -> music.wav, sfx.wav, bed.wav, mix.wav (butuh ffmpeg)"""
import json, os, subprocess, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); C = json.load(open(os.path.join(HERE, '..', 'cues.json')))
sr = 44100; T = C['dur']; N = int(T * sr); t = np.arange(N) / sr; rng = np.random.default_rng(57)
V = {v['id']: v['t'] for v in C['vo']}; KK = C['k']; D = C['demo']
def rd(path, rate):
    b = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(rate), '-'], capture_output=True).stdout
    return np.frombuffer(b, dtype=np.float32).astype(np.float64)
mus = np.zeros(N); sfx = np.zeros(N); br = np.zeros(N)
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
A1 = V['s4'][0] - 0.25; A2 = V['s9'][0] - 0.2
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
# klik hanya pada aksi antarmuka sungguhan di rekaman: skenario dipilih (klip 01, +0,47 dtk dari awal bagian 3D) dan tombol "Bandingkan dengan normal" (klip 02)
S9 = V['s9'][0] - 0.2; click(S9 + 0.47, 1500); ting(S9 + 0.54, 1174.7, 0.8); click(KK['bandingkan'], 1500)
ting(A1 + 0.15, 1046.5, 0.9); ting(V['s4'][0] + 0.2, 1174.7, 0.6)                   # "oh, jadi begitu": mulai animasi mekanisme
rise(KK['terlentang'] - 0.5, 1.2, 0.8); ting(KK['tertekan'] - 0.1, 987.8, 0.7)      # diputar ke posisi terlentang; paru sedikit tertekan
ting(V['s2'][0] + 0.7, 1318.5, 0.6)                                                # penanda cairan muncul
rise(A2 - 0.4, 0.8, 0.7); ting(V['s13'][0] + 0.8, 1568, 0.7)                        # kembali ke rekaman; teks ajakan
# bunyi napas simulasi (gain SAMA untuk keduanya); 1,6 dtk pertama (inspirasi)
for key, fn in (('N', '04_suara_napas_normal_simulasi.wav'), ('W', '05_suara_napas_lebih_lemah_simulasi.wav')):
    a = rd(os.path.join(HERE, fn), sr)[:int(1.6 * sr)].copy(); f1 = int(0.015 * sr); f2 = int(0.07 * sr); a[:f1] *= np.linspace(0, 1, f1); a[-f2:] *= np.linspace(1, 0, f2)
    add(br, D[key][0], a, 0.62)
vo = np.zeros(N); w = rd(os.path.join(HERE, 'voiceover-susun.wav'), sr); vo[:min(N, len(w))] = w[:N]
e = lp(np.abs(vo), int(0.06 * sr)); e = e / (np.percentile(e[e > 0], 95) + 1e-9) if np.any(e > 0) else e; sp = np.clip(e * 2.0, 0, 1)
duck = 1 - 0.7 * lp(sp, int(0.22 * sr)); sfx_duck = 1 - 0.3 * lp(sp, int(0.18 * sr))
# musik turun jauh selama perbandingan bunyi napas (halus 0,35 dtk)
g_demo = 1 - 0.86 * np.clip(np.minimum((t - (D['N'][0] - 0.45)) / 0.35, ((D['W'][1] + 0.45) - t) / 0.35), 0, 1)
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mu = mus / (rms(mus) + 1e-9) * 0.075 * duck * g_demo; fx = sfx / (np.abs(sfx).max() + 1e-9) * 0.25 * sfx_duck * (1 - 0.8 * np.clip(np.minimum((t - (D['N'][0] - 0.2)) / 0.2, ((D['W'][1] + 0.2) - t) / 0.2), 0, 1))
bed = mu + fx
def wr(name, a):
    w = wave.open(os.path.join(HERE, name), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
wr('music.wav', mus / (np.abs(mus).max() + 1e-9) * 0.5); wr('sfx.wav', fx); wr('bed.wav', bed); wr('vo-pos.wav', vo * 0.9); wr('napas.wav', br)
mixed = bed + vo * 0.9 + br; wr('premix.wav', mixed)
m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', os.path.join(HERE, 'premix.wav'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
li = float([l for l in m.splitlines() if l.strip().startswith('I:')][-1].split()[1]); gdb = -14.0 - li
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'premix.wav'), '-af', f'volume={gdb}dB,alimiter=limit=0.89:level=0', '-ar', str(sr), '-ac', '1', '-t', str(T), os.path.join(HERE, 'mix.wav')], check=True)
print('ok', 'premix LUFS', li, 'gain dB', round(gdb, 2))
