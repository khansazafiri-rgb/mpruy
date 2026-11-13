"""Musik + efek bunyi "Satu Kasus, Banyak yang Harus Nyambung" (39,0 dtk), disintesis 100% dari kode (numpy). Tidak ada sampel/musik pihak ketiga.
Narasi: audio/narasi.wav (Google AI Studio, dari pemesan) dipakai APA ADANYA: tidak diubah/diganti; hanya diberi penurunan level musik di bawahnya dan normalisasi akhir (penguatan seragam).
Judul: "MEDCOEL Case Notes" (musik: ringan dan sedikit sibuk -> lebih teratur dan tenang saat Raka mulai dari satu BAB -> cerah dan rapi saat materi nyambung)
dan "MEDCOEL Soft Pings" (blip kartu, ting lembut). Pembuat: dibuat untuk MEDCOEL pada sesi ini. Lisensi musik dan efek: CC0 1.0 (domain publik), boleh untuk promosi tanpa atribusi.
Jadwal bunyi mengikuti ../cues.json (sama dengan animasi).
Pemakaian: python3 video/satu-kasus/audio/audio_mix.py -> music.wav, sfx.wav, bed.wav, mix.wav (butuh ffmpeg)"""
import json, os, subprocess, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); C = json.load(open(os.path.join(HERE, '..', 'cues.json')))
sr = 44100; T = C['dur']; N = int(T * sr); t = np.arange(N) / sr; rng = np.random.default_rng(13)
mus = np.zeros(N); sfx = np.zeros(N)
def add(buf, t0, sig, g=1.0):
    i = int(t0 * sr)
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i] * g
def lp(x, k): k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')
def env(n, a, d): tt = np.arange(n) / sr; return np.minimum(1, tt / a) * np.exp(-tt / d)
N0 = {'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23, 'G': 392.0, 'A': 440.0, 'B': 493.88}
def nf(name, o=0): return N0[name] * (2 ** o)
def pluck(f, g=0.1, d=0.16):                      # marimba/kalimba ringan
    n = int(0.5 * sr); tt = np.arange(n) / sr
    return (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 3 * f * tt) * np.exp(-tt / 0.05) + 0.12 * np.sin(2 * np.pi * 5.9 * f * tt) * np.exp(-tt / 0.03)) * env(n, 0.003, d) * g
def pad(freqs, dur, g=0.12):
    n = int(dur * sr); tt = np.arange(n) / sr; s = np.zeros(n)
    for f in freqs:
        for d in (-0.003, 0.003): s += (2 * np.abs(2 * ((f * (1 + d) * tt) % 1) - 1) - 1) * 0.5 + np.sin(2 * np.pi * f * (1 + d) * tt) * 0.5
    return lp(s, 12) / max(1, len(freqs)) * np.minimum(1, tt / 0.35) * np.clip((dur - tt) / 0.5, 0, 1) * g
def bass(f, dur, g=0.2):
    n = int(dur * sr); tt = np.arange(n) / sr
    return (np.sin(2 * np.pi * f * tt) + 0.2 * np.sin(2 * np.pi * 2 * f * tt)) * env(n, 0.006, dur * 0.6) * g
def kick(g=0.22):
    n = int(0.18 * sr); tt = np.arange(n) / sr; f = 48 + 110 * np.exp(-tt / 0.03); return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-tt / 0.08) * g
def hat(g=0.035, d=0.012):
    n = int(0.05 * sr); tt = np.arange(n) / sr; x = rng.standard_normal(n); return (x - lp(x, 3)) * np.exp(-tt / d) * g
def clap(g=0.08):
    n = int(0.12 * sr); tt = np.arange(n) / sr; x = rng.standard_normal(n); return (x - lp(x, 5)) * np.exp(-tt / 0.03) * g
# ---- A (0 - 17,1): ringan dan sedikit sibuk; makin padat saat kartu menumpuk (kunci dari cues)
B1 = 60 / 124; CH_A = [('C', 'E', 'G'), ('A', 'C', 'E'), ('F', 'A', 'C'), ('G', 'B', 'D')]; RT = ['C', 'A', 'F', 'G']
PAT = [0, 2, 1, 2, 0, 1, 2, 1]
k = 0
while k * B1 / 4 < C['recede'][0] + 0.7:
    x = k * B1 / 4; bar = int(x / (B1 * 4)) % 4; ch = CH_A[bar]; step = k % 16
    busy = x >= C['cards']['A']; very = x >= C['notes'][0]
    if step % 2 == 0 or (very and step % 2 == 1) or (busy and step % 4 == 3):
        idx = PAT[(step // 2) % 8] if step % 2 == 0 else (step * 3) % 3
        add(mus, x, pluck(nf(ch[idx], 1 if step % 4 else 2), 0.075 if not very else 0.085))
    if step % 8 == 0: add(mus, x, bass(nf(RT[bar], -2), B1 * 1.8, 0.2))
    if step % 8 == 0 and x > 0.2: add(mus, x, kick(0.16))
    if busy and step % 4 == 2: add(mus, x, hat(0.03))
    if very and step % 2 == 1: add(mus, x + B1 / 8, hat(0.02))
    k += 1
# ---- B (17,1 - 27,45): lebih tenang dan teratur (92 BPM)
B2 = 60 / 92; CH_B = [('C', 'E', 'G'), ('A', 'C', 'E'), ('F', 'A', 'C'), ('G', 'B', 'D')]; b = 0; x0 = C['recede'][0] + 0.4
while x0 + b * B2 * 4 < C['ret'][0] + 0.2:
    xs = x0 + b * B2 * 4; ch = CH_B[b % 4]
    add(mus, xs, pad([nf(ch[0], -1), nf(ch[1], 0), nf(ch[2], 0)], B2 * 4 + 0.3, 0.12))
    add(mus, xs, bass(nf(RT[b % 4], -2), B2 * 1.9, 0.2)); add(mus, xs + B2 * 2, bass(nf(RT[b % 4], -2), B2 * 1.9, 0.16))
    for j in range(4): add(mus, xs + j * B2, pluck(nf(ch[[0, 2, 1, 2][j]], 1), 0.06, 0.2))
    b += 1
# ---- C (27,45 - 39): cerah dan rapi (100 BPM), arpeggio teratur
B3 = 60 / 100; CH_C = [('C', 'E', 'G'), ('G', 'B', 'D'), ('A', 'C', 'E'), ('F', 'A', 'C')]; RC = ['C', 'G', 'A', 'F']; b = 0; x0 = C['ret'][0] - 0.02
while x0 + b * B3 * 4 < T - 0.1:
    xs = x0 + b * B3 * 4; ch = CH_C[b % 4]
    add(mus, xs, pad([nf(ch[0], -1), nf(ch[1], 0), nf(ch[2], 0), nf(ch[0], 1)], B3 * 4 + 0.3, 0.13))
    for j in range(8):
        x = xs + j * B3 / 2
        if x > T - 0.4: break
        add(mus, x, pluck(nf(ch[[0, 1, 2, 1, 0, 1, 2, 1][j]], 1 if j % 2 == 0 else 2), 0.07))
        if j % 2 == 0: add(mus, x, bass(nf(RC[b % 4], -2), B3 * 0.9, 0.2))
        if j % 4 == 0 and x > C['connect']: add(mus, x, kick(0.12))
        if j % 4 == 2 and x > C['connect']: add(mus, x, clap(0.05))
    b += 1
mus *= np.clip(t / 0.05, 0, 1) * np.clip((T - 0.04 - t) / 1.1, 0, 1)
# ---- efek: blip halus, ting lembut
def sine(f, dur, g, d): n = int(dur * sr); tt = np.arange(n) / sr; return np.sin(2 * np.pi * f * tt) * env(n, 0.003, d) * g
def blip(f0=988, f1=1319, g=1.0): return np.concatenate([sine(f0, 0.045, 0.16, 0.05), sine(f1, 0.1, 0.15, 0.06)]) * g
def tick(g=1.0): n = int(0.04 * sr); tt = np.arange(n) / sr; return (np.sin(2 * np.pi * 1700 * tt) * np.exp(-tt / 0.008) + hat(0.06, 0.006)[:n]) * 0.2 * g
def pop(f0=420, f1=900, g=1.0): n = int(0.14 * sr); tt = np.arange(n) / sr; f = f0 + (f1 - f0) * np.minimum(1, tt / 0.07); return np.sin(2 * np.pi * np.cumsum(f) / sr) * env(n, 0.003, 0.06) * 0.2 * g
def swoosh(dur=0.5, up=True, g=1.0):
    n = int(dur * sr); tt = np.arange(n) / sr; x = rng.standard_normal(n); fr = np.linspace(0, 1, n) if up else np.linspace(1, 0, n)
    return (lp(x, 30) * (1 - fr) + (x - lp(x, 6)) * fr * 0.5) * np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.4 * 0.35 * g
def thud(g=1.0): n = int(0.22 * sr); tt = np.arange(n) / sr; return (np.sin(2 * np.pi * (80 - 30 * tt / 0.2) * tt) * np.exp(-tt / 0.07) * 0.5 + hat(0.18, 0.02)[:n].mean() * 0) * g
def bomp(g=1.0): return np.concatenate([sine(262, 0.16, 0.16, 0.12), sine(208, 0.3, 0.16, 0.2)]) * g
def glitch(dur=0.35, g=1.0):
    s = np.zeros(int(dur * sr))
    for i in range(7): x = i * dur / 7; w = sine(float(rng.choice([523, 659, 784, 1047, 1319])), 0.04, 0.12, 0.03); s[int(x * sr):int(x * sr) + len(w)] += w
    return s * g
def ting(g=1.0):                                  # ting lembut: bel dengan partial tak harmonik, peluruhan panjang
    n = int(1.6 * sr); tt = np.arange(n) / sr
    return (np.sin(2 * np.pi * 1318.5 * tt) + 0.45 * np.sin(2 * np.pi * 1318.5 * 2.76 * tt) * np.exp(-tt / 0.18) + 0.5 * np.sin(2 * np.pi * 1760 * tt) * np.exp(-tt / 0.5)) * env(n, 0.004, 0.55) * 0.18 * g
def sparkle(g=1.0):
    s = np.zeros(int(0.9 * sr))
    for i, f in enumerate((2093, 2637, 3136, 3951)): w = sine(f, 0.3, 0.08, 0.08); s[int(i * 0.06 * sr):int(i * 0.06 * sr) + len(w)] += w
    return s * g
def chime(g=1.0):
    s = np.zeros(int(1.8 * sr))
    for i, f in enumerate((784, 988, 1175, 1568)): w = sine(f, 1.2, 0.1, 0.45); s[int(i * 0.1 * sr):int(i * 0.1 * sr) + len(w)] += w
    return s * g
FN = {'blip': blip, 'tick': tick, 'pop': pop, 'swoosh': swoosh, 'thud': thud, 'bomp': bomp, 'glitch': glitch, 'ting': ting, 'sparkle': sparkle, 'chime': chime}
E_ = [(0.55, 'swoosh', {'dur': 1.3, 'up': True, 'g': 0.7}), (C['sheetLand'], 'thud', {'g': 0.9}), (C['sheetLand'] + 0.02, 'pop', {'f0': 300, 'f1': 600, 'g': 0.7}), (C['highlight'][0] + 0.25, 'tick', {}),
      (C['bingung'], 'bomp', {'g': 0.5}), (C['sheetToDesk'][0], 'swoosh', {'dur': 0.6, 'up': False, 'g': 0.6}),
      (C['cards']['A'], 'blip', {'f0': 659, 'f1': 988}), (C['cards']['F'], 'blip', {'f0': 784, 'f1': 1175}), (C['cards']['P'], 'blip', {'f0': 988, 'f1': 1319})]
E_ += [(tn, 'pop', {'f0': 360, 'f1': 700, 'g': 0.6}) for tn in C['notes']] + [(tt, 'blip', {'f0': 880 + 70 * i, 'f1': 1100 + 70 * i, 'g': 0.8}) for i, tt in enumerate(C['tabs'])]
E_ += [(C['slump'], 'bomp', {'g': 0.9}), (C['recede'][0], 'swoosh', {'dur': 0.7, 'up': False, 'g': 0.6}), (C['nilo'], 'pop', {'f0': 380, 'f1': 1000, 'g': 1.0}), (C['nilo'] + 0.45, 'sparkle', {'g': 0.5}),
       (C['cardToLaptop'][0], 'swoosh', {'dur': 0.6, 'up': True, 'g': 0.7}), (C['pixelIn'][0], 'glitch', {'dur': 0.35, 'g': 0.8}), (C['pixelIn'][0] + 0.02, 'swoosh', {'dur': 0.4, 'up': True, 'g': 0.5})]
E_ += [(tc, 'tick', {'g': 1.0}) for tc in C['clicks']]
E_ += [(C['pixelOut'][0], 'glitch', {'dur': 0.4, 'g': 0.8}), (C['zoomOut'][0], 'swoosh', {'dur': 0.8, 'up': False, 'g': 0.55})]
E_ += [(C['ret'][0] + 0.07 * i, 'pop', {'f0': 360 + 60 * i, 'f1': 720 + 60 * i, 'g': 0.6}) for i in range(4)] + [(C['tidy'][0] + 0.12 * i, 'tick', {'g': 1.2}) for i in range(4)]
E_ += [(C['connect'], 'ting', {'g': 1.0}), (C['kila'][0] + 0.05, 'sparkle', {'g': 0.7}), (33.0, 'pop', {'f0': 440, 'f1': 1100, 'g': 0.8}), (C['endCard'], 'chime', {'g': 0.9}), (C['endLogo'], 'blip', {'f0': 784, 'f1': 1175}), (C['endTitle'], 'blip', {'f0': 880, 'f1': 1320}), (C['endUrl'], 'ting', {'g': 1.0})]
for tx, kind, kw in E_: add(sfx, tx, FN[kind](**kw))
# ---- penurunan level musik di bawah narasi (narasi tidak diubah)
ns = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(HERE, 'narasi.wav'), '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout
nar = np.frombuffer(ns, dtype=np.float32).astype(np.float64); nar = np.pad(nar, (0, max(0, N - len(nar))))[:N]
e = lp(np.abs(nar), int(0.06 * sr)); e = e / (np.percentile(e, 95) + 1e-9); sp = np.clip(e * 2.0, 0, 1)
duck = 1 - 0.62 * lp(sp, int(0.18 * sr))                      # ±8 dB saat narator bicara; kembali naik di jeda
sfx_duck = 1 - 0.25 * lp(sp, int(0.18 * sr))
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mu = mus / (rms(mus) + 1e-9) * 0.11 * duck; fx = sfx / (np.abs(sfx).max() + 1e-9) * 0.26 * sfx_duck
bed = mu + fx
def wr(name, a):
    w = wave.open(os.path.join(HERE, name), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
wr('music.wav', mus / (np.abs(mus).max() + 1e-9) * 0.5); wr('sfx.wav', fx); wr('bed.wav', bed)
# ---- campur dengan narasi asli (ffmpeg: resample + campur + normalisasi -14 LUFS)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'narasi.wav'), '-i', os.path.join(HERE, 'bed.wav'), '-filter_complex',
                f'[0:a]aresample={sr},apad=whole_dur={T}[n];[n][1:a]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=9[o]', '-map', '[o]', '-ar', str(sr), '-ac', '1', '-t', str(T), os.path.join(HERE, 'mix.wav')], check=True)
print('ok', round(float(np.abs(bed).max()), 3))
