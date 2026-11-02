"""Musik ringan + SFX jarang di bawah narasi asli (tidak diubah). Semua disintesis dengan numpy.
Jalankan dari folder video/introvert-ekstrovert: python3 audio/gen_data.py; python3 audio/audio_mix.py
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
# hangat dan ringan; lebih tenang untuk bagian lab dan istirahat
section(0.0, 6.0, [C, G, Am, F], 96, 0.8, arp=True, shake=True)
section(6.0, 19.0, [F, G, C, Am], 92, 0.75, arp=True)
section(19.0, 28.5, [('A','min7'), ('D','min7'), ('G','maj'), ('C','maj')], 88, 0.65, arp=True)
section(28.5, 39.8, [C, G, Am, F], 100, 0.8, arp=True, shake=True)
section(39.8, 45.7, [Am, F, C, G], 84, 0.6, arp=False)
section(45.7, 71.2, [Am, F, C, G], 90, 0.7, arp=True)
section(71.2, 81.3, [F, G, C, Am], 86, 0.65, arp=False)
section(81.3, 88.2, [C, G, Am, F], 96, 0.75, arp=True)
section(88.2, 95.7, [C, F, G, C], 76, 0.55, arp=False)
section(95.7, 102.3, [C, G, Am, F], 100, 0.8, arp=True, shake=True)
section(102.3, T, [C, G, Am, F], 100, 0.95, arp=True, shake=False)
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
# ---- cue SFX mengikuti stage/scenesA.js dan scenesB.js
for tw in (6.0, 12.4, 19.0, 28.5, 33.3, 39.8, 45.7, 64.3, 71.2, 81.3, 88.2, 95.7, 102.3): whoosh(tw - 0.1, 0.38, 0.2, True)
pop(6.4, 0.16, 640); pop(9.76, 0.16, 520)                                    # ajakan, pikiran kasur
boing(16.44, 0.28); chime(16.5, [784, 1047], 0.09, 0.09); rise(17.9, 1.0, 0.1)  # Kori muncul, melompat ke otak
for i in range(13): pop(19.9 + i * 0.22, 0.07, 560 + 18 * i)                 # orang di sepanjang spektrum
pop(21.8, 0.12, 700); pop(22.3, 0.12, 760); pop(24.86, 0.15, 520); thud(26.0, 0.3, 80)
for tc in (29.2, 29.9, 30.5, 31.3, 32.0): pop(tc, 0.1, 700 + 20 * int(tc))   # ikon obrolan
pop(41.0, 0.14, 640); pop(43.4, 0.14, 700)
for tc in (53.4, 54.9, 56.1): pop(tc, 0.12, 760)                              # imbalan terbang ke layar
chime(56.6, [880, 1175, 1568], 0.1, 0.08)                                    # sistem imbalan menyala
for tc in (59.0, 60.5, 61.9, 62.9): pop(tc, 0.12, 620)
for i in range(0, 26, 3): pop(65.0 + i * 0.1, 0.06, 600 + 12 * i)             # titik data
pop(68.6, 0.1, 800)
pop(74.5, 0.14, 560); thud(75.9, 0.35, 75); pop(78.48, 0.14, 560); thud(79.8, 0.35, 75)
for tc in (84.44, 85.1, 86.36, 87.28): pop(tc, 0.14, 640); chime(tc, [784, 1047], 0.06, 0.08)
chime(92.9, [659, 784], 0.07, 0.12)
pop(99.0, 0.14, 700); pop(101.0, 0.12, 620)
for tp, f in ((104.74, 700), (105.6, 780), (107.2, 860)): pop(tp, 0.14, f)
chime(104.74, [784, 1047, 1319], 0.12, 0.08)
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
