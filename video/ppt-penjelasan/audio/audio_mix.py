"""Musik ringan + SFX jarang di bawah narasi asli (tidak diubah). Semua disintesis dengan numpy.
Jalankan dari folder video/kok-dia-paham: python3 audio/gen_data.py; python3 audio/audio_mix.py
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
# ---- komposisi: musik TENANG dan sederhana (72 BPM; tetap santai saat diputar 1,2x-1,3x), tanpa drum/hat/kick; pad hangat + denting lembut + bass pelan
B = 60 / 72
PROG = [('C', 'maj'), ('A', 'min'), ('F', 'maj'), ('G', 'maj')]      # satu akor per 2 bar
def soft_pluck(f, dur=0.9):
    n = int(dur * sr); tt = np.arange(n) / sr
    return (np.sin(2*np.pi*f*tt) + 0.25*np.sin(2*np.pi*f*2*tt)*np.exp(-tt/0.12)) * np.exp(-tt/0.45) * np.minimum(1, tt/0.012)
def calm(t0, t1, vel=1.0, arp=True):
    bar = B * 4; tt = t0; k = 0
    while tt < t1 - 0.05:
        notes, root = ch(*PROG[(k // 2) % 4]); L = min(bar * 2, t1 - tt) if k % 2 == 0 else 0
        if k % 2 == 0:
            for fq in notes[:3]: add(mus, tt, pad(fq, L, 0.8, 1.2), 0.055 * vel)
            add(mus, tt, bass(root, min(L, B * 3)), 0.16 * vel)
        if arp:
            for j in range(4):
                x = tt + j * B
                if x < t1 - 0.2 and (j % 2 == 0 or k % 2): add(mus, x, soft_pluck(notes[[0, 2, 1, 3][j]] * 2, 1.0), 0.05 * vel)
        k += 1; tt += bar
calm(0.0, 4.04, vel=0.7, arp=False)       # hook: hanya pad
calm(4.04, 20.5, vel=0.85)                # situasi dan masalah
calm(20.5, 32.88, vel=0.9)                # solusi dan contoh penjelasan
calm(32.88, T, vel=1.0)                   # penutup
notes, root = ch('C', 'maj')
for fq in notes[:3]: add(mus, T - 1.6, pad(fq, 1.5, 0.05, 1.2), 0.06)
g = np.ones(N); mus *= np.clip(t / 0.4, 0, 1) * np.clip((T - 0.05 - t) / 1.0, 0, 1)
env = lp(np.abs(dlg), int(0.06 * sr)); env = env / (np.percentile(env, 98) + 1e-6)
duck = 1 - 0.7 * np.clip(lp((env > 0.12).astype(np.float32), int(0.2 * sr)), 0, 1)
mus *= duck
# ---- efek sangat sedikit: hanya yang membantu cerita
pop(2.7, 0.07, 560)                                                                   # tanda tanya muncul pada gambar slide
chime(4.15, [784, 1047, 1319], 0.08, 0.09)                                            # maskot muncul
whoosh(7.1, 0.3, 0.07, True); whoosh(9.72, 0.3, 0.07, True)                           # pindah ke ruang kuliah lalu ke kamar
pop(13.4, 0.07, 540); pop(14.3, 0.07, 520)                                            # bingung: tanda tanya
click(17.5, 0.12)                                                                     # kursor ragu di tombol berikutnya
pop(18.6, 0.07, 500)                                                                  # tanda tanya
for tc in (21.05, 21.5, 22.0, 22.5, 23.0): click(tc, 0.1)                             # ketukan di Chat Admin (rekaman asli)
pop(23.55, 0.07, 620); pop(23.9, 0.07, 650); pop(24.35, 0.07, 680); chime(24.9, [659, 784, 988], 0.07, 0.09)   # tahapan pengajuan
pop(27.55, 0.07, 640); pop(28.4, 0.07, 600)                                           # konsep dan gambar disorot
chime(33.0, [784, 988, 1175], 0.07, 0.09)                                             # penjelasan mendampingi slide
chime(38.4, [784, 1047, 1319], 0.08, 0.09); pop(40.85, 0.09, 760)                     # logo, alamat web
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4]**2) + 1e-12)
dd = dlg / (np.abs(dlg).max() + 1e-6) * 0.85; dr = rms(dd)
mu = mus / (rms(mus) + 1e-9) * dr * 10**(-16/20)
fx = sfx / (np.abs(sfx).max() + 1e-9) * dr * 0.8
mix = dd + mu + fx
pk = np.abs(mix).max(); print('puncak', pk, 'rms dialog', dr)
mix = mix / max(1, pk / 0.95)
for nm, a in (('mix', mix), ('music', mu), ('sfx', fx)):
    w = wave.open(os.path.join(HERE, nm + '.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1)*32767).astype(np.int16).tobytes()); w.close()
print('ok', round(T, 3))
