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
C, G, Am, F = ('C','maj'), ('G','maj'), ('A','min'), ('F','maj')
C, G, Am, F = ('C','maj'), ('G','maj'), ('A','min'), ('F','maj')
# malam hari yang tenang, penasaran, lalu hangat di penutup
section(0.0, 8.3, [Am, F, C, G], 88, 0.7, arp=True)
section(8.3, 19.0, [C, G, Am, F], 100, 0.85, arp=True, shake=True)
section(19.0, 35.7, [('A','min7'), ('D','min7'), ('G','maj'), ('C','maj')], 92, 0.75, arp=True)
section(35.7, 54.5, [Am, F, C, G], 78, 0.6, arp=False)
section(54.5, 66.3, [F, G, C, Am], 104, 0.9, arp=True, shake=True)
section(66.3, 84.8, [C, G, Am, F], 98, 0.85, arp=True, shake=True)
section(84.8, 93.2, [F, G, C, Am], 100, 0.75, arp=False)
section(93.2, T, [C, G, Am, F], 100, 0.95, arp=True, shake=False)
for fq in (261.63, 329.63, 392.0, 523.25): add(mus, T - 3.2, pad(fq, 3.1, 0.5, 1.4), 0.05)
g = np.ones(N); mus *= np.clip(t / 0.4, 0, 1) * np.clip((T - 0.1 - t) / 2.0, 0, 1)
env = lp(np.abs(dlg), int(0.06 * sr)); env = env / (np.percentile(env, 98) + 1e-6)
duck = 1 - 0.6 * np.clip(lp((env > 0.12).astype(np.float32), int(0.22 * sr)), 0, 1)
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
# ---- cue SFX mengikuti stage/scenes*.js
for tw in (8.26, 13.9, 19.0, 25.2, 35.74, 39.5, 54.5, 60.3, 66.2, 73.0, 77.8, 84.84, 93.15): whoosh(tw - 0.1, 0.38, 0.2, True)
rise(5.78, 0.4, 0.1); pop(6.2, 0.2, 520); pop(9.4, 0.18, 640)               # perut berbunyi, Grelin muncul
slide(11.35, 500, 1100, 1.7, 0.1); chime(13.1, [988, 1319], 0.12, 0.08)      # sinyal sampai otak
pop(15.2, 0.12, 700); pop(17.15, 0.12, 520)                                  # label naik, turun
boing(20.3, 0.28); chime(22.0, [784, 988], 0.09, 0.1)                        # Jambi muncul
for i in range(12): pop(25.9 + i * 0.12, 0.08, 600 + 25 * i)               # 12 orang
chime(34.3, [784, 1047, 1319], 0.12, 0.08)                                   # puncak 20.00
for i in range(4): pop(36.3 + i * 0.35, 0.12, 560 + 60 * i)                  # jam berbeda-beda
for p_ in (0.17, 0.4, 0.62, 0.86): pop(45.76 + p_ * 3.9, 0.12, 760)         # kesempatan makan
pop(44.66, 0.15, 500); pop(51.5, 0.1, 600); pop(52.76, 0.1, 680)
thud(59.36, 0.45, 70); chime(59.45, [784, 988, 1175], 0.1, 0.07)             # "Nggak harus!"
for tc in (62.0, 62.6, 63.2): pop(tc, 0.14, 880)                             # centang
pop(63.9, 0.12, 640); pop(70.2, 0.16, 700); pop(71.7, 0.16, 760)             # camilan
for tc in (74.2, 74.9, 75.7): pop(tc, 0.13, 640)
pop(76.2, 0.14, 520); chime(76.4, [523, 659], 0.07, 0.12)
rise(82.76, 1.6, 0.08); pop(80.44, 0.12, 560)                                # asam naik
for tc in (88.94, 90.56, 91.94): pop(tc, 0.16, 720); chime(tc, [784, 1047], 0.08, 0.08)
for tp, f in ((95.5, 700), (96.0, 780), (97.3, 860)): pop(tp, 0.14, f)
chime(95.5, [784, 1047, 1319], 0.12, 0.08)
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4]**2) + 1e-12)
dd = dlg / (np.abs(dlg).max() + 1e-6) * 0.85; dr = rms(dd)
mu = mus / (rms(mus) + 1e-9) * dr * 10**(-16.5/20)
fx = sfx / (np.abs(sfx).max() + 1e-9) * dr * 0.8
mix = dd + mu + fx
pk = np.abs(mix).max(); print('puncak', pk, 'rms dialog', dr)
mix = mix / max(1, pk / 0.95)
for nm, a in (('mix', mix), ('music', mu), ('sfx', fx)):
    w = wave.open(os.path.join(HERE, nm + '.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1)*32767).astype(np.int16).tobytes()); w.close()
print('ok', round(T, 3))
