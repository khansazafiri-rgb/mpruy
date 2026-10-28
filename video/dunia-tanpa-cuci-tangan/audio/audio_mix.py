"""Musik instrumental lembut + SFX untuk "Dunia tanpa cuci tangan", di-mix di bawah dialog asli (tidak diubah)."""
import numpy as np, wave, json
S = '/tmp/claude-0/-home-user/c3dc5e70-a599-57ff-91be-f3087c292010/scratchpad/cuci'
sr = 44100; T = 72.0; N = int(T * sr)
rng = np.random.default_rng(11)

def load_wav(p):
    w = wave.open(p); return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
dlg = load_wav(S + '/dialog.wav'); dlg = np.pad(dlg, (0, max(0, N - len(dlg))))[:N]
t = np.arange(N) / sr

def lp(x, k): k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')
def add(buf, t0, sig, g=1.0):
    i = int(t0 * sr)
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i] * g

def rhodes(f, dur, vel=1.0):
    n = int(dur * sr); tt = np.arange(n) / sr
    s = (np.sin(2 * np.pi * f * tt) + np.sin(2 * np.pi * f * 2.003 * tt) * 0.3 * np.exp(-tt / 0.22) + np.sin(2 * np.pi * f * 3.01 * tt) * 0.1 * np.exp(-tt / 0.1) + np.sin(2 * np.pi * f * 0.5 * tt) * 0.18)
    s *= np.minimum(1, tt / 0.006) * np.exp(-tt / (dur * 0.5)) * (1 + 0.1 * np.sin(2 * np.pi * 4.6 * tt)) * np.clip((dur - tt) / 0.1, 0, 1)
    return s * vel
def pluck(f, dur=0.6):
    n = int(dur * sr); tt = np.arange(n) / sr
    return (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt / 0.1)) * np.exp(-tt / 0.18) * np.minimum(1, tt / 0.003)
def bass(f, dur):
    n = int(dur * sr); tt = np.arange(n) / sr
    return (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * f * 2 * tt)) * np.minimum(1, tt / 0.012) * np.exp(-tt / (dur * 0.65)) * np.clip((dur - tt) / 0.06, 0, 1)
def kick():
    n = int(0.25 * sr); tt = np.arange(n) / sr
    return np.sin(2 * np.pi * np.cumsum(46 + 90 * np.exp(-tt / 0.03)) / sr) * np.exp(-tt / 0.1)
def hat():
    n = int(0.035 * sr); tt = np.arange(n) / sr; nz = rng.standard_normal(n); return (nz - lp(nz, 4)) * np.exp(-tt / 0.01)
def shaker():
    n = int(0.07 * sr); tt = np.arange(n) / sr; nz = rng.standard_normal(n); return (nz - lp(nz, 5)) * np.minimum(1, tt / 0.02) * np.exp(-tt / 0.03)

BEAT = 60 / 84.0; BAR = BEAT * 4
CHORDS = [([220.0, 261.63, 329.63, 392.0], 110.0), ([174.61, 220.0, 261.63, 329.63], 87.31), ([261.63, 329.63, 392.0, 493.88], 130.81), ([196.0, 246.94, 293.66, 392.0], 98.0)]
MAJ = [([261.63, 329.63, 392.0, 493.88], 130.81), ([196.0, 246.94, 293.66, 392.0], 98.0), ([220.0, 261.63, 329.63, 392.0], 110.0), ([174.61, 220.0, 261.63, 329.63], 87.31)]
music = np.zeros(N); perc = np.zeros(N); pad = np.zeros(N)

def sec(t_start, t_end, chords, vel=1.0, plucks=False, beat=False, kicks=False, step=0):
    tt = t_start; bar = 0
    while tt < t_end - 0.05:
        ch, root = chords[(bar + step) % 4]
        L = min(BAR, t_end - tt)
        for i, fq in enumerate(ch): add(music, tt + 0.012 * i, rhodes(fq, min(L, BEAT * 3.6)), 0.15 * vel)
        add(music, tt, bass(root, min(L, BEAT * 2.0)), 0.30 * vel)
        if L > BEAT * 2.4: add(music, tt + BEAT * 2.5, bass(root, BEAT * 1.0), 0.2 * vel)
        if plucks:
            for j, fq in enumerate((ch[0] * 2, ch[2] * 2, ch[1] * 2, ch[3] * 2, ch[0] * 2, ch[2] * 2, ch[3] * 2, ch[1] * 2)):
                if j * BEAT / 2 < L: add(music, tt + j * BEAT / 2, pluck(fq, 0.5), 0.07 * vel)
        if beat:
            for b in range(8):
                x = tt + b * BEAT / 2
                if x >= t_end: break
                add(perc, x, shaker(), 0.10 if b % 2 else 0.16)
                if kicks and b in (0, 5): add(perc, x, kick(), 0.5)
        bar += 1; tt += BAR

# 0 - 4.9 hook: pad redup + detak jam
hook = (np.sin(2 * np.pi * 110 * t) + np.sin(2 * np.pi * 164.8 * t) * 0.7 + np.sin(2 * np.pi * 196 * t) * 0.5) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.3 * t))
pad += hook * np.clip(t / 1.2, 0, 1) * np.clip((5.3 - t) / 0.6, 0, 1) * (t < 5.4) * 0.07
for k in range(int(4.8 / 0.6)): add(perc, 0.5 + k * 0.6, np.sin(2 * np.pi * 1800 * np.arange(int(0.02 * sr)) / sr) * np.exp(-np.arange(int(0.02 * sr)) / sr / 0.004), 0.35)
sec(4.9, 19.8, CHORDS, 0.9, plucks=False, beat=True)
sec(19.8, 24.4, CHORDS, 1.0, plucks=False, beat=True, kicks=True, step=2)
# ketegangan naik 22.4 - 26.9
rs = rng.standard_normal(N); rs = rs - lp(rs, 10)
rise = np.clip((t - 22.6) / (26.85 - 22.6), 0, 1) ** 2.2 * ((t > 22.6) & (t < 26.9))
pad += rs * rise * 0.10 + np.sin(2 * np.pi * (200 + 260 * np.clip((t - 22.6) / 4.3, 0, 1)) * t) * rise * 0.05
# membeku 26.9 - 38.4: dengung rendah + kilau jarang
fz = ((t >= 26.9) & (t < 38.5)).astype(np.float32); fzs = lp(fz, int(0.2 * sr))
pad += (np.sin(2 * np.pi * 73.4 * t) * 0.6 + np.sin(2 * np.pi * 110 * t) * 0.35 + np.sin(2 * np.pi * 146.8 * t) * 0.18) * fzs * 0.10
for k, tt in enumerate(np.arange(27.6, 38.0, 1.9)): add(music, tt, pluck(1568 if k % 2 else 1175, 1.0), 0.07)
# putar balik 38.4 - 39.9: gliss turun (kaset)
u = np.clip((t - 38.4) / 1.5, 0, 1); rwm = ((t >= 38.4) & (t < 39.9)).astype(np.float32)
pad += np.sin(2 * np.pi * np.cumsum(900 - 700 * u) / sr) * rwm * np.sin(np.pi * u) * 0.10
# bagian hangat 39.9 - 66.9
sec(39.9, 44.4, MAJ, 0.85, plucks=False, beat=False)
sec(44.4, 57.2, MAJ, 1.0, plucks=True, beat=True, kicks=False, step=0)
sec(57.2, 66.9, MAJ, 1.05, plucks=True, beat=True, kicks=True, step=1)
for fq in (261.63, 329.63, 392.0, 523.25, 659.25): add(music, 66.9, rhodes(fq, 3.6), 0.17)
add(music, 66.9, bass(130.81, 3.6), 0.3); add(perc, 66.9, kick(), 0.45)
dip = ((t >= 26.9) & (t < 38.5)).astype(np.float32); dg = 1 - 0.6 * np.clip(lp(dip, int(0.2 * sr)), 0, 1)
music *= dg; perc *= (1 - 0.95 * np.clip(lp(dip, int(0.1 * sr)), 0, 1))
fade = np.clip((T - 0.1 - t) / 1.6, 0, 1)
mus = (music + pad + perc * 0.9) * fade
env = lp(np.abs(dlg), int(0.06 * sr)); env = env / (np.percentile(env, 98) + 1e-6)
duck = 1 - 0.55 * np.clip(lp((env > 0.12).astype(np.float32), int(0.2 * sr)), 0, 1)
mus *= duck

# ---------------- SFX ----------------
sfx = np.zeros(N)
def pop(t0, g=0.4, f0=620):
    n = int(0.1 * sr); tt = np.arange(n) / sr; add(sfx, t0, np.sin(2 * np.pi * (f0 + 420 * np.exp(-tt / 0.02)) * tt) * np.exp(-tt / 0.03), g)
def tap(t0, g=0.4):
    n = int(0.12 * sr); tt = np.arange(n) / sr; nz = lp(rng.standard_normal(n), 14)
    add(sfx, t0, (np.sin(2 * np.pi * 95 * tt) * np.exp(-tt / 0.05) + nz * 0.5 * np.exp(-tt / 0.025)), g)
def step(t0, g=0.14):
    n = int(0.09 * sr); tt = np.arange(n) / sr; nz = lp(rng.standard_normal(n), 18)
    add(sfx, t0, (nz * np.exp(-tt / 0.02) + np.sin(2 * np.pi * 120 * tt) * np.exp(-tt / 0.03) * 0.6), g)
def whoosh(t0, dur=0.6, g=0.4, up=True):
    n = int(dur * sr); tt = np.arange(n) / sr; nz = rng.standard_normal(n)
    bell = np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.5
    lo = lp(nz, 26); hi = nz - lp(nz, 6); fr = np.linspace(0, 1, n) if up else np.linspace(1, 0, n)
    add(sfx, t0, (lo * (1 - fr) + hi * fr * 0.6) * bell * 1.4, g)
def chime(t0, notes, g=0.3, gap=0.08, dur=1.4):
    for i, f in enumerate(notes):
        n = int(dur * sr); tt = np.arange(n) / sr
        add(sfx, t0 + i * gap, (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt / 0.3)) * np.exp(-tt / 0.5) * np.minimum(1, tt / 0.003), g)
def squirt(t0, g=0.3):
    n = int(0.25 * sr); tt = np.arange(n) / sr; nz = rng.standard_normal(n); add(sfx, t0, (nz - lp(nz, 5)) * np.sin(np.pi * np.clip(tt / 0.25, 0, 1)), g)
def rub(t0, dur, g=0.2):
    n = int(dur * sr); tt = np.arange(n) / sr; nz = rng.standard_normal(n); nz = nz - lp(nz, 3)
    add(sfx, t0, nz * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * tt)) * np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 0.7, g)

wl = lambda *a: whoosh(*a)
wl(4.55, 0.7, 0.4, True)                                             # potong ke ruang A
for i in range(6): pop(11.0 + i * 0.1, 0.22, 600 + i * 60)            # titik muncul di pagar
for k in range(12): pop(12.0 + k * 0.22, 0.2, 540 + (k % 5) * 70)    # titik di lingkungan
tap(10.5, 0.45); tap(17.5, 0.45)                                      # sentuh pagar
whoosh(17.7, 1.0, 0.3, True)                                          # titik naik ke tangan
for tt in np.arange(19.4, 24.9, 0.37): step(tt, 0.13)                  # langkah bergegas
whoosh(25.2, 1.7, 0.45, True); tap(26.9, 0.9); whoosh(26.9, 0.9, 0.3, False)  # tegang, lalu beku
for tt in (28.0, 31.1): pop(tt, 0.2, 520)
for tt, f in ((34.2, 660), (36.1, 760), (36.9, 880)): pop(tt, 0.3, f)  # simpul infografik
whoosh(38.4, 1.5, 0.55, False); tap(39.9, 0.5); chime(39.95, [880], 0.12)  # putar balik
for tt in np.arange(40.9, 42.5, 0.37): step(tt, 0.13)
squirt(42.45, 0.35); tap(42.45, 0.3)                                  # pompa dispenser
rub(43.0, 1.3, 0.22)                                                  # menggosok tangan
for i in range(6): pop(43.1 + i * 0.18, 0.18, 760 + i * 70)           # titik hilang
chime(44.3, [1175, 1568, 1976], 0.22, 0.09)                           # tangan bersih
for tt in np.arange(44.8, 49.3, 0.37): step(tt, 0.12)
chime(49.3, [523, 659, 784], 0.16, 0.1)                               # menyentuh pasien B dengan tangan bersih
pop(52.6, 0.3, 700); chime(52.7, [988], 0.1)                          # kartu sarung tangan
chime(57.7, [1318, 988], 0.3, 0.12); pop(57.4, 0.3, 700)              # rantai terputus
whoosh(66.7, 0.7, 0.4, True); chime(67.0, [784, 1047, 1319, 1568], 0.28, 0.08)  # kartu akhir
for L in (0.3, 11.7, 16.4, 28.0, 31.1, 41.3, 57.3, 60.5): pop(L + 0.02, 0.14, 820)

# ---------------- mix ----------------
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
dd = dlg / (np.abs(dlg).max() + 1e-6) * 0.85; dr = rms(dd)
mu = mus / (rms(mus) + 1e-9) * dr * 10 ** (-14.5 / 20)
fx = sfx / (np.abs(sfx).max() + 1e-9) * dr * 1.9
mix = dd + mu + fx
pk = np.abs(mix).max(); print('puncak', pk, 'rms dialog', dr)
mix = mix / max(1, pk / 0.95)
for nm, a in (('mix', mix), ('music', mu), ('sfx', fx)):
    w = wave.open(f'{S}/{nm}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print('ok')
