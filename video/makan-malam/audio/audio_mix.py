"""Musik ringan + SFX jarang di bawah narasi asli (tidak diubah). Semua disintesis dengan numpy.
Jalankan dari folder video/malam-lapar: python3 audio/gen_data.py; python3 audio/audio_mix.py
Hasil: audio/mix.wav (narasi + musik + SFX), audio/music.wav, audio/sfx.wav."""
import os, json, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sr = 44100
def load_wav(p):
    w = wave.open(p); return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
dlg = load_wav(os.path.join(ROOT, 'dialog.wav')); N = len(dlg); T = N / sr
t = np.arange(N) / sr; rng = np.random.default_rng(5)
def lp(x, k):
    k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')
def add(buf, t0, sig, g=1.0):
    i = int(t0 * sr)
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i] * g
mus = np.zeros(N); sfx = np.zeros(N)
def pluck(f, dur=0.4, br=1.0):
    n = int(dur * sr); tt = np.arange(n) / sr
    s = np.sin(2*np.pi*f*tt) + 0.4*br*np.sin(2*np.pi*f*2*tt)*np.exp(-tt/0.08) + 0.15*br*np.sin(2*np.pi*f*3*tt)*np.exp(-tt/0.04)
    return s * np.exp(-tt/(0.14+0.05*dur)) * np.minimum(1, tt/0.002)
def rhodes(f, dur):
    n = int(dur * sr); tt = np.arange(n) / sr
    s = np.sin(2*np.pi*f*tt) + 0.3*np.sin(2*np.pi*f*2.003*tt)*np.exp(-tt/0.2) + 0.1*np.sin(2*np.pi*f*3.01*tt)*np.exp(-tt/0.1) + 0.18*np.sin(2*np.pi*f*0.5*tt)
    return s * np.minimum(1, tt/0.006) * np.exp(-tt/(dur*0.55)) * (1+0.07*np.sin(2*np.pi*4.8*tt)) * np.clip((dur-tt)/0.1, 0, 1)
def bass(f, dur):
    n = int(dur * sr); tt = np.arange(n) / sr
    return (np.sin(2*np.pi*f*tt) + 0.22*np.sin(2*np.pi*f*2*tt)) * np.minimum(1, tt/0.01) * np.exp(-tt/(dur*0.6)) * np.clip((dur-tt)/0.05, 0, 1)
def pad(f, dur, a=0.4, r=0.5):
    n = int(dur * sr); tt = np.arange(n) / sr
    s = sum(np.sin(2*np.pi*f*(1+d)*tt) for d in (-0.003, 0, 0.003)) / 3 + 0.25*np.sin(2*np.pi*f*2*tt)
    return s * np.minimum(1, tt/a) * np.clip((dur-tt)/r, 0, 1)
def shaker():
    n = int(0.06*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n); return (nz - lp(nz, 5)) * np.minimum(1, tt/0.015) * np.exp(-tt/0.025)
NOTE = {'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23, 'G': 392.0, 'A': 440.0, 'B': 493.88}
def ch(root, kind):
    r = NOTE[root]; iv = {'maj': [0,4,7,12], 'min': [0,3,7,12], 'maj7': [0,4,7,11], 'min7': [0,3,7,10]}[kind]
    return [r * 2**(i/12) for i in iv], r / 2
def section(t0, t1, prog, bpm, vel=1.0, arp=True, shake=False):
    bl = 60 / bpm; bar = bl * 4; tt = t0; k = 0
    while tt < t1 - 0.05:
        notes, root = ch(*prog[k % len(prog)]); L = min(bar, t1 - tt)
        for i, fq in enumerate(notes): add(mus, tt + 0.01*i, rhodes(fq, min(L, bl*3.6)), 0.12*vel)
        if arp:
            for j in range(8):
                x = tt + j*bl/2
                if x < t1: add(mus, x, pluck(notes[[0,2,1,3,0,3,2,1][j]]*2, 0.35), 0.06*vel)
        add(mus, tt, bass(root, min(L, bl*2)), 0.24*vel); add(mus, tt + bl*2.5, bass(root, bl*1.2), 0.16*vel)
        if shake:
            for j in range(8):
                x = tt + j*bl/2
                if x < t1: add(mus, x, shaker(), 0.07 if j % 2 else 0.11)
        k += 1; tt += bar
# ---- SFX
def whoosh(t0, dur=0.4, gv=0.3, up=True):
    n = int(dur*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n)
    bell = np.sin(np.pi*np.clip(tt/dur, 0, 1))**1.5; lo = lp(nz, 26); hi = nz - lp(nz, 6); fr = np.linspace(0, 1, n) if up else np.linspace(1, 0, n)
    add(sfx, t0, (lo*(1-fr) + hi*fr*0.6) * bell * 1.4, gv)
def click(t0, gv=0.3):  # klik tombol: ketukan kering + denting kecil
    n = int(0.09*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n)
    add(sfx, t0, (nz - lp(nz, 6)) * np.exp(-tt/0.006) * 0.8 + np.sin(2*np.pi*1500*tt) * np.exp(-tt/0.012) * 0.5, gv)
def pop(t0, gv=0.2, f0=700):
    n = int(0.1*sr); tt = np.arange(n)/sr; add(sfx, t0, np.sin(2*np.pi*(f0 + 400*np.exp(-tt/0.02))*tt) * np.exp(-tt/0.03), gv)
def chime(t0, notes, gv=0.2, gap=0.07, dur=1.2):
    for i, f in enumerate(notes):
        n = int(dur*sr); tt = np.arange(n)/sr
        add(sfx, t0 + i*gap, (np.sin(2*np.pi*f*tt) + 0.35*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt/0.3)) * np.exp(-tt/0.45) * np.minimum(1, tt/0.003), gv)
def thud(t0, gv=0.5, f=70):
    n = int(0.35*sr); tt = np.arange(n)/sr; nz = lp(rng.standard_normal(n), 20)
    add(sfx, t0, np.sin(2*np.pi*f*tt)*np.exp(-tt/0.1) + nz*np.exp(-tt/0.04)*0.6, gv)
def rise(t0, dur, gv=0.25):
    n = int(dur*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n)
    add(sfx, t0, (lp(nz, 10) * np.linspace(0, 1, n)**2) * np.minimum(1, tt/0.05), gv)
def boing(t0, gv=0.35):
    n = int(0.5*sr); tt = np.arange(n)/sr
    add(sfx, t0, np.sin(2*np.pi*np.cumsum(260 + 340*np.sin(tt*30)*np.exp(-tt/0.18) + 120*np.exp(-tt/0.3))/sr) * np.exp(-tt/0.22) * np.minimum(1, tt/0.004), gv)
def slide(t0, f0, f1, dur=0.6, gv=0.25):
    n = int(dur*sr); tt = np.arange(n)/sr; f = np.linspace(f0, f1, n)
    add(sfx, t0, np.sin(2*np.pi*np.cumsum(f)/sr) * np.minimum(1, tt/0.01) * np.clip((dur-tt)/0.05, 0, 1), gv)
def kick(t0, g=0.55):
    n = int(0.28*sr); tt = np.arange(n)/sr; f = 48 + 110*np.exp(-tt/0.035)
    add(mus, t0, np.sin(2*np.pi*np.cumsum(f)/sr) * np.exp(-tt/0.12) * np.minimum(1, tt/0.002), g)
def clap(t0, g=0.28):
    n = int(0.16*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n); x = (nz - lp(nz, 4)) * (np.exp(-tt/0.035) + 0.6*np.exp(-(tt-0.012).clip(0)/0.03))
    add(mus, t0, x, g)
def hat(t0, g=0.10, open_=False):
    n = int((0.16 if open_ else 0.04)*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n)
    add(mus, t0, (nz - lp(nz, 3)) * np.exp(-tt/(0.07 if open_ else 0.015)), g)
def synbass(f, dur, g=0.3):
    n = int(dur*sr); tt = np.arange(n)/sr
    s = (2*((f*tt) % 1) - 1)*0.5 + np.sin(2*np.pi*f*tt) + 0.25*np.sin(2*np.pi*f*2*tt)
    s = lp(s, 5) * np.exp(-tt/(dur*0.8)) * np.minimum(1, tt/0.004) * np.clip((dur-tt)/0.03, 0, 1)
    return s*g
def lead(f, dur):
    n = int(dur*sr); tt = np.arange(n)/sr
    s = np.sin(2*np.pi*f*tt + 0.6*np.sin(2*np.pi*f*2*tt)*np.exp(-tt/0.15)) + 0.35*np.sin(2*np.pi*f*2.005*tt)
    return s * np.exp(-tt/(dur*0.55)) * np.minimum(1, tt/0.004) * np.clip((dur-tt)/0.02, 0, 1)
CH = [('A', 'min'), ('F', 'maj'), ('C', 'maj'), ('G', 'maj')]    # per 4 ketukan (satu bar)
def play(t0, t1, kicks=True, clap_on=True, hats=True, bass_on=True, arp=True, vel=1.0, pad_on=True):
    bar = B*4; tt = t0; k = 0
    while tt < t1 - 0.01:
        notes, root = ch(*CH[k % 4]); L = min(bar, t1 - tt)
        if pad_on:
            for fq in notes[:3]: add(mus, tt, pad(fq, L, 0.05, 0.2), 0.035*vel)
        for beat in range(4):
            x = tt + beat*B
            if x >= t1 - 0.01: break
            if kicks: kick(x, 0.5*vel)
            if clap_on and beat in (1, 3): clap(x, 0.26*vel)
            if hats:
                hat(x + B/2, 0.085*vel, open_=(beat == 3)); hat(x + B/4, 0.035*vel); hat(x + 3*B/4, 0.035*vel)
            if bass_on:
                add(mus, x, synbass(root*2 if beat % 2 else root, B*0.46), 0.5*vel); add(mus, x + B/2, synbass(root*2, B*0.4, 0.22), 0.5*vel)
            if arp:
                for j in range(4):
                    y = x + j*B/4
                    if y < t1: add(mus, y, lead(notes[[0, 2, 1, 3][j]]*(4 if (beat + j) % 3 == 0 else 2), B/4*1.3), 0.05*vel)
        k += 1; tt += bar
def riser(t0, dur, g=0.16):
    n = int(dur*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n); x = (nz - lp(nz, 6)) * (tt/dur)**2.2
    add(mus, t0, x * np.minimum(1, tt/0.05), g)
def snare_roll(t0, t1, g=0.14):
    x = t0; step = 0.24
    while x < t1 - 0.02:
        n = int(0.1*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n); add(mus, x, (nz - lp(nz, 3)) * np.exp(-tt/0.03), g * (0.5 + 0.5*(x - t0)/(t1 - t0))); step = max(0.06, step*0.8); x += step
def crash(t0, g=0.22):
    n = int(1.4*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n); add(mus, t0, (nz - lp(nz, 3)) * np.exp(-tt/0.45), g)
B = 0.5                       # 120 BPM
# ---- komposisi: hook berisi jam berdetak dan ketegangan lucu; lalu musik ringan yang ceria, lebih tenang saat penjelasan tubuh
def tick(t0, g=0.12, f=1900):
    n = int(0.05*sr); tt = np.arange(n)/sr; add(mus, t0, np.sin(2*np.pi*f*tt) * np.exp(-tt/0.008), g)
for i in range(7): tick(i*0.5 if i*0.5 < 0.5 else 99, 0.10)           # detak jam sampai jam berubah
riser(0.0, 0.5, 0.06)
play(0.50, 3.96, kicks=True, clap_on=False, hats=True, bass_on=True, arp=False, vel=0.85, pad_on=False)
play(3.96, 13.86, vel=0.9)
play(13.86, 19.20, kicks=False, clap_on=False, hats=True, arp=True, vel=0.7)
play(19.20, 22.38, vel=1.0)                                            # Kori menghentikan alarm: musik naik
play(22.38, 31.96, kicks=False, clap_on=False, bass_on=True, arp=True, vel=0.7)   # di dalam tubuh dan kalender: lebih tenang
play(31.96, 40.50, vel=0.85)
play(40.50, 54.02, kicks=False, clap_on=False, hats=True, arp=True, vel=0.7)
play(54.02, 68.00, vel=0.95)                                           # langkah praktis
play(68.00, 80.32, kicks=False, clap_on=False, arp=True, vel=0.7)
play(80.32, T, vel=1.05)
for tr in (13.4, 31.5, 53.6, 79.9): riser(tr, 0.48, 0.07)
for tc in (3.96, 19.20, 31.96, 54.02, 80.32): crash(tc, 0.10)
notes, root = ch('C', 'maj')
for fq in notes[:3]: add(mus, T - 1.4, pad(fq, 1.3, 0.01, 1.0), 0.08)
kick(T - 1.4, 0.5); add(mus, T - 1.4, synbass(root, 1.0, 0.4), 0.5)
g = np.ones(N); mus *= np.clip(t / 0.15, 0, 1) * np.clip((T - 0.05 - t) / 0.8, 0, 1)
env = lp(np.abs(dlg), int(0.06 * sr)); env = env / (np.percentile(env, 98) + 1e-6)
duck = 1 - 0.58 * np.clip(lp((env > 0.12).astype(np.float32), int(0.18 * sr)), 0, 1)
mus *= duck
# ---- SFX
def whoosh(t0, dur=0.4, gv=0.3, up=True):
    n = int(dur*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n)
    bell = np.sin(np.pi*np.clip(tt/dur, 0, 1))**1.5; lo = lp(nz, 26); hi = nz - lp(nz, 6); fr = np.linspace(0, 1, n) if up else np.linspace(1, 0, n)
    add(sfx, t0, (lo*(1-fr) + hi*fr*0.6) * bell * 1.4, gv)
def click(t0, gv=0.3):  # klik tombol: ketukan kering + denting kecil
    n = int(0.09*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n)
    add(sfx, t0, (nz - lp(nz, 6)) * np.exp(-tt/0.006) * 0.8 + np.sin(2*np.pi*1500*tt) * np.exp(-tt/0.012) * 0.5, gv)
def pop(t0, gv=0.2, f0=700):
    n = int(0.1*sr); tt = np.arange(n)/sr; add(sfx, t0, np.sin(2*np.pi*(f0 + 400*np.exp(-tt/0.02))*tt) * np.exp(-tt/0.03), gv)
def chime(t0, notes, gv=0.2, gap=0.07, dur=1.2):
    for i, f in enumerate(notes):
        n = int(dur*sr); tt = np.arange(n)/sr
        add(sfx, t0 + i*gap, (np.sin(2*np.pi*f*tt) + 0.35*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt/0.3)) * np.exp(-tt/0.45) * np.minimum(1, tt/0.003), gv)
def thud(t0, gv=0.5, f=70):
    n = int(0.35*sr); tt = np.arange(n)/sr; nz = lp(rng.standard_normal(n), 20)
    add(sfx, t0, np.sin(2*np.pi*f*tt)*np.exp(-tt/0.1) + nz*np.exp(-tt/0.04)*0.6, gv)
def rise(t0, dur, gv=0.25):
    n = int(dur*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n)
    add(sfx, t0, (lp(nz, 10) * np.linspace(0, 1, n)**2) * np.minimum(1, tt/0.05), gv)
def boing(t0, gv=0.35):
    n = int(0.5*sr); tt = np.arange(n)/sr
    add(sfx, t0, np.sin(2*np.pi*np.cumsum(260 + 340*np.sin(tt*30)*np.exp(-tt/0.18) + 120*np.exp(-tt/0.3))/sr) * np.exp(-tt/0.22) * np.minimum(1, tt/0.004), gv)
def slide(t0, f0, f1, dur=0.6, gv=0.25):
    n = int(dur*sr); tt = np.arange(n)/sr; f = np.linspace(f0, f1, n)
    add(sfx, t0, np.sin(2*np.pi*np.cumsum(f)/sr) * np.minimum(1, tt/0.01) * np.clip((dur-tt)/0.05, 0, 1), gv)
B = 0.48                      # 125 BPM: titik potong (4,80; 5,76; 7,20; 9,60; 13,44; 16,80 dtk) jatuh tepat pada ketukan
def kick(t0, g=0.55):
    n = int(0.28*sr); tt = np.arange(n)/sr; f = 48 + 110*np.exp(-tt/0.035)
    add(mus, t0, np.sin(2*np.pi*np.cumsum(f)/sr) * np.exp(-tt/0.12) * np.minimum(1, tt/0.002), g)
def clap(t0, g=0.28):
    n = int(0.16*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n); x = (nz - lp(nz, 4)) * (np.exp(-tt/0.035) + 0.6*np.exp(-(tt-0.012).clip(0)/0.03))
    add(mus, t0, x, g)
def hat(t0, g=0.10, open_=False):
    n = int((0.16 if open_ else 0.04)*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n)
    add(mus, t0, (nz - lp(nz, 3)) * np.exp(-tt/(0.07 if open_ else 0.015)), g)
def synbass(f, dur, g=0.3):
    n = int(dur*sr); tt = np.arange(n)/sr
    s = (2*((f*tt) % 1) - 1)*0.5 + np.sin(2*np.pi*f*tt) + 0.25*np.sin(2*np.pi*f*2*tt)
    s = lp(s, 5) * np.exp(-tt/(dur*0.8)) * np.minimum(1, tt/0.004) * np.clip((dur-tt)/0.03, 0, 1)
    return s*g
def lead(f, dur):
    n = int(dur*sr); tt = np.arange(n)/sr
    s = np.sin(2*np.pi*f*tt + 0.6*np.sin(2*np.pi*f*2*tt)*np.exp(-tt/0.15)) + 0.35*np.sin(2*np.pi*f*2.005*tt)
    return s * np.exp(-tt/(dur*0.55)) * np.minimum(1, tt/0.004) * np.clip((dur-tt)/0.02, 0, 1)
CH = [('A', 'min'), ('F', 'maj'), ('C', 'maj'), ('G', 'maj')]    # per 4 ketukan (satu bar)
def play(t0, t1, kicks=True, clap_on=True, hats=True, bass_on=True, arp=True, vel=1.0, pad_on=True):
    bar = B*4; tt = t0; k = 0
    while tt < t1 - 0.01:
        notes, root = ch(*CH[k % 4]); L = min(bar, t1 - tt)
        if pad_on:
            for fq in notes[:3]: add(mus, tt, pad(fq, L, 0.05, 0.2), 0.035*vel)
        for beat in range(4):
            x = tt + beat*B
            if x >= t1 - 0.01: break
            if kicks: kick(x, 0.5*vel)
            if clap_on and beat in (1, 3): clap(x, 0.26*vel)
            if hats:
                hat(x + B/2, 0.085*vel, open_=(beat == 3)); hat(x + B/4, 0.035*vel); hat(x + 3*B/4, 0.035*vel)
            if bass_on:
                add(mus, x, synbass(root*2 if beat % 2 else root, B*0.46), 0.5*vel); add(mus, x + B/2, synbass(root*2, B*0.4, 0.22), 0.5*vel)
            if arp:
                for j in range(4):
                    y = x + j*B/4
                    if y < t1: add(mus, y, lead(notes[[0, 2, 1, 3][j]]*(4 if (beat + j) % 3 == 0 else 2), B/4*1.3), 0.05*vel)
        k += 1; tt += bar
def riser(t0, dur, g=0.16):
    n = int(dur*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n); x = (nz - lp(nz, 6)) * (tt/dur)**2.2
    add(mus, t0, x * np.minimum(1, tt/0.05), g)
def snare_roll(t0, t1, g=0.14):
    x = t0; step = 0.24
    while x < t1 - 0.02:
        n = int(0.1*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n); add(mus, x, (nz - lp(nz, 3)) * np.exp(-tt/0.03), g * (0.5 + 0.5*(x - t0)/(t1 - t0))); step = max(0.06, step*0.8); x += step
def crash(t0, g=0.22):
    n = int(1.4*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n); add(mus, t0, (nz - lp(nz, 3)) * np.exp(-tt/0.45), g)
# intro (0-2,40): hanya ketukan ringan + riser; 2,40-16,80: lagu penuh; 16,80-akhir: puncak lalu selesai
for i in range(5): kick(i*B, 0.30 + 0.05*i) if i >= 1 else None
for i in range(10): hat(i*B/2 + B/2, 0.05 + 0.005*i)
riser(0.0, 2.4, 0.20); snare_roll(1.68, 2.40, 0.16)
crash(2.40, 0.22)
play(2.40, 4.80, vel=0.95); play(4.80, 7.20, vel=1.0); play(7.20, 9.60, vel=1.0, arp=True); play(9.60, 13.44, vel=0.95); play(13.44, 16.80, vel=1.0); play(16.80, 19.20, vel=1.05)
for tr in (4.32, 6.72, 9.12, 12.96, 16.32): riser(tr, 0.48, 0.10)
for tc in (4.80, 7.20, 9.60, 13.44, 16.80): crash(tc, 0.12)
# penutup: akor akhir pada ".com" lalu habis
notes, root = ch('A', 'min')
for fq in notes[:3]: add(mus, 19.20, pad(fq, 1.1, 0.01, 0.9), 0.10)
kick(19.20, 0.6); crash(19.20, 0.2); add(mus, 19.20, synbass(root, 0.9, 0.4), 0.6)
g = np.ones(N); mus *= np.clip(t / 0.15, 0, 1) * np.clip((T - 0.05 - t) / 0.9, 0, 1)
env = lp(np.abs(dlg), int(0.06 * sr)); env = env / (np.percentile(env, 98) + 1e-6)
duck = 1 - 0.68 * np.clip(lp((env > 0.12).astype(np.float32), int(0.18 * sr)), 0, 1)
mus *= duck
# ---- alarm (sekali, saat jam berubah 20.59 -> 21.00) dan efek lain
def alarm(t0, dur=1.7, g=0.34):
    n = int(dur*sr); tt = np.arange(n)/sr
    gate = ((tt*10) % 1 < 0.55) * ((tt % 0.9) < 0.62)
    tone = np.sin(2*np.pi*1780*tt) + 0.4*np.sin(2*np.pi*3560*tt)*0.4 + 0.5*np.sin(2*np.pi*890*tt)
    env_ = np.minimum(1, tt/0.01) * np.clip((dur - tt)/0.12, 0, 1)
    add(sfx, t0, lp(tone, 2) * gate * env_, g)
alarm(0.50)
for tw in (3.96, 6.5, 7.74, 13.86, 19.2, 22.38, 27.0, 31.96, 36.9, 40.5, 43.38, 47.55, 50.9, 54.02, 58.9, 60.24, 62.14, 67.96, 74.9, 80.32): whoosh(tw - 0.1, 0.3, 0.16, True)
rise(4.5, 1.6, 0.05); rise(44.66, 1.2, 0.05)                              # perut berbunyi
thud(0.50, 0.3, 70); pop(9.46, 0.14, 560); pop(14.0, 0.12, 600); pop(14.26, 0.1, 640); boing(16.14, 0.22); pop(17.02, 0.1, 700)
boing(19.3, 0.26); click(19.9, 0.3); chime(20.28, [784, 1047, 1319], 0.12, 0.08)       # Kori muncul, alarm berhenti, banner
pop(23.84, 0.12, 640); slide(24.0, 400, 700, 1.2, 0.05); chime(24.74, [659, 784], 0.07, 0.1)
for tc in (26.9, 27.7, 28.88, 29.54, 30.78): pop(tc, 0.11, 620 + 20*int(tc))   # faktor muncul
pop(33.16, 0.12, 560); click(33.5, 0.28); thud(33.66, 0.18, 90)                    # tombol ajaib ditekan: tidak terjadi apa-apa
pop(37.58, 0.12, 600); pop(39.34, 0.12, 680); pop(41.64, 0.1, 560); pop(48.2, 0.1, 640); pop(52.74, 0.12, 700)
pop(55.1, 0.12, 600); pop(55.3, 0.1, 660); pop(57.62, 0.12, 720)
for i in range(7): pop(63.5 + i*0.4, 0.09, 700 + 30*i)                             # centang konsisten
pop(65.26, 0.1, 540); thud(66.44, 0.2, 100)                                       # aturan ekstrem retak
pop(68.92, 0.12, 600); pop(70.38, 0.12, 640); pop(72.6, 0.12, 680)
chime(77.7, [784, 988, 1175], 0.09, 0.09); click(78.3, 0.16); click(79.3, 0.16)    # makan dengan tenang
pop(82.62, 0.14, 700); pop(83.34, 0.14, 780); chime(83.34, [784, 1047, 1319], 0.1, 0.08); pop(83.96, 0.14, 860)
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4]**2) + 1e-12)
dd = dlg / (np.abs(dlg).max() + 1e-6) * 0.85; dr = rms(dd)
mu = mus / (rms(mus) + 1e-9) * dr * 10**(-12.5/20)
fx = sfx / (np.abs(sfx).max() + 1e-9) * dr * 0.8
mix = dd + mu + fx
pk = np.abs(mix).max(); print('puncak', pk, 'rms dialog', dr)
mix = mix / max(1, pk / 0.95)
for nm, a in (('mix', mix), ('music', mu), ('sfx', fx)):
    w = wave.open(os.path.join(HERE, nm + '.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1)*32767).astype(np.int16).tobytes()); w.close()
print('ok', round(T, 3))
