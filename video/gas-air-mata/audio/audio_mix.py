"""Musik tipis + SFX jarang untuk "Kena gas air mata saat demo?" di bawah narasi asli (tidak diubah).
Semua disintesis dengan numpy. Jalankan dari folder video/gas-air-mata: python3 audio/audio_mix.py
Hasil: audio/mix.wav (dialog + musik + SFX), audio/music.wav, audio/sfx.wav."""
import os, json, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sr = 44100
def load_wav(p):
    w = wave.open(p); return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
dlg = load_wav(os.path.join(ROOT, 'dialog.wav'))
T = len(dlg) / sr; N = len(dlg)
rng = np.random.default_rng(11)
t = np.arange(N) / sr
DATA = json.load(open(os.path.join(ROOT, 'stage', 'data.json')))
def wd(id, i):
    l = [x for x in DATA['lines'] if x['id'] == id][0]; return l['words'][min(i, len(l['words']) - 1)]['s']
def lp(x, k):
    k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')
def add(buf, t0, sig, g=1.0):
    i = int(t0 * sr)
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i] * g
mus = np.zeros(N); sfx = np.zeros(N); amb = np.zeros(N)

# ---- instrumen
def pluck(f, dur=0.5, bright=1.0):
    n = int(dur * sr); tt = np.arange(n) / sr
    s = np.sin(2*np.pi*f*tt) + 0.45*bright*np.sin(2*np.pi*f*2*tt)*np.exp(-tt/0.09) + 0.2*bright*np.sin(2*np.pi*f*3*tt)*np.exp(-tt/0.05)
    return s * np.exp(-tt/(0.16+0.05*dur)) * np.minimum(1, tt/0.002)
def rhodes(f, dur, vel=1.0):
    n = int(dur * sr); tt = np.arange(n) / sr
    s = np.sin(2*np.pi*f*tt) + np.sin(2*np.pi*f*2.003*tt)*0.3*np.exp(-tt/0.22) + np.sin(2*np.pi*f*3.01*tt)*0.1*np.exp(-tt/0.1) + np.sin(2*np.pi*f*0.5*tt)*0.18
    s *= np.minimum(1, tt/0.006) * np.exp(-tt/(dur*0.5)) * (1+0.08*np.sin(2*np.pi*4.6*tt)) * np.clip((dur-tt)/0.1, 0, 1)
    return s * vel
def bass(f, dur):
    n = int(dur * sr); tt = np.arange(n) / sr
    return (np.sin(2*np.pi*f*tt) + 0.25*np.sin(2*np.pi*f*2*tt)) * np.minimum(1, tt/0.012) * np.exp(-tt/(dur*0.65)) * np.clip((dur-tt)/0.06, 0, 1)
def pad(f, dur, a=0.5, r=0.6):
    n = int(dur * sr); tt = np.arange(n) / sr
    s = sum(np.sin(2*np.pi*f*(1+d)*tt) for d in (-0.003, 0, 0.003)) / 3 + 0.3*np.sin(2*np.pi*f*2*tt)
    return s * np.minimum(1, tt/a) * np.clip((dur-tt)/r, 0, 1)
def drone(f, dur):
    n = int(dur * sr); tt = np.arange(n) / sr
    s = np.sin(2*np.pi*f*tt) + 0.5*np.sin(2*np.pi*f*1.5*tt + 0.3) + 0.25*np.sin(2*np.pi*f*2.01*tt)
    return s * np.minimum(1, tt/1.0) * np.clip((dur-tt)/1.0, 0, 1) * (0.8 + 0.2*np.sin(2*np.pi*0.25*tt))
def beat_soft():  # denyut rendah (bukan detak jantung yang jelas)
    n = int(0.3*sr); tt = np.arange(n)/sr
    return np.sin(2*np.pi*np.cumsum(52 + 40*np.exp(-tt/0.04))/sr) * np.exp(-tt/0.11)
NOTE = {'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23, 'G': 392.0, 'A': 440.0, 'B': 493.88}
def ch(root, kind):
    r = NOTE[root[0]] * (2 ** ((1 if '#' in root else 0) / 12))
    iv = {'maj': [0,4,7,12], 'min': [0,3,7,12], 'maj7': [0,4,7,11], 'min7': [0,3,7,10], 'dom7': [0,4,7,10]}[kind]
    return [r * 2**(i/12) for i in iv], r / 2
def section(t0, t1, prog, bpm, vel=1.0, kind='rhodes', arp=True, bassline=True, pad_on=False, pulse=False):
    beatl = 60 / bpm; bar = beatl * 4; tt = t0; k = 0
    while tt < t1 - 0.05:
        notes, root = ch(*prog[k % len(prog)]); L = min(bar, t1 - tt)
        if kind == 'rhodes':
            for i, fq in enumerate(notes): add(mus, tt + 0.012*i, rhodes(fq, min(L, beatl*3.7)), 0.13*vel)
        elif kind == 'uke':
            for j in range(4):
                x = tt + j*beatl
                if x >= t1: break
                for i, fq in enumerate(notes[:4]): add(mus, x + 0.012*i, pluck(fq*(2 if j % 2 else 1), 0.5, 1.2), 0.12*vel*(1.0 if j % 2 == 0 else 0.7))
        if arp:
            for j in range(8):
                x = tt + j*beatl/2
                if x >= t1: break
                add(mus, x, pluck(notes[[0,2,1,3,0,2,3,1][j]]*2, 0.4), 0.06*vel)
        if bassline: add(mus, tt, bass(root, min(L, beatl*2.0)), 0.26*vel)
        if pad_on:
            for fq in notes[:3]: add(mus, tt, pad(fq, L), 0.06*vel)
        if pulse:
            for j in range(4):
                x = tt + j*beatl
                if x < t1: add(mus, x, beat_soft(), 0.22*vel)
        k += 1; tt += bar
Am, Dm, Em, Fm = ('A','min'), ('D','min'), ('E','min'), ('F','maj')
# ---- bagian musik: tegang -> informatif -> tenang
for f_, d_ in ((55.0, 8.0), (82.4, 8.0)): add(mus, 0.0, drone(f_, d_), 0.20)           # drone tegang pembuka
section(0.0, 7.2, [Am, Em], 62, 0.8, 'rhodes', arp=False, bassline=False, pulse=True)   # denyut cemas
section(9.6, 20.9, [Am, Fm, ('C','maj'), Em], 98, 0.85, 'rhodes', arp=True, pulse=True)  # makin cemas, ritme
for f_ in (55.0, 82.4): add(mus, 20.9, drone(f_, 3.2), 0.28)                             # bingkai beku: hanya drone
add(mus, 20.92, bass(41.2, 3.0), 0.5)
section(23.92, 35.97, [('A','min7'), Dm, ('E','dom7'), Am], 92, 0.8, 'rhodes', arp=True, pulse=False)
section(35.97, 51.46, [('A','min7'), ('F','maj7'), ('C','maj7'), ('G','dom7')], 78, 0.62, 'rhodes', arp=False, bassline=True, pad_on=True)
section(51.46, 57.19, [('C','maj7'), ('F','maj7')], 74, 0.7, 'rhodes', arp=True, pad_on=True)  # lega
section(57.19, 62.31, [('A','min7'), ('F','maj7')], 66, 0.5, 'rhodes', arp=False, bassline=False, pad_on=True)  # keesokan harinya
section(62.31, 87.36, [('D','min7'), ('G','dom7'), ('C','maj7'), ('A','min7')], 84, 0.55, 'rhodes', arp=False, bassline=True, pad_on=True)
section(87.36, 107.8, [('C','maj7'), ('F','maj7'), ('A','min7'), ('G','dom7')], 78, 0.85, 'rhodes', arp=True, pad_on=True)   # tenang, menenangkan
section(107.8, T, [('C','maj'), ('G','maj'), Am[:0] or ('A','min'), ('F','maj')], 100, 0.95, 'uke', arp=True, bassline=True)
add(mus, 114.0, pad(523.25, 1.6), 0.05)
g = np.ones(N)
def dip(a, b, lvl, fade=0.08):
    global g; g = g * (1 - (1 - lvl) * lp(((t >= a) & (t < b)).astype(np.float32), int(fade * sr)))
dip(7.6, 9.4, 0.12, 0.1)       # musik menepi saat bunyi gas
dip(20.9, 23.9, 0.55, 0.15)    # beku bingkai: tipis
mus *= g
fadeout = np.clip((T - 0.1 - t) / 2.0, 0, 1)
mus *= fadeout * np.clip(t / 1.0, 0, 1)
env = lp(np.abs(dlg), int(0.06 * sr)); env = env / (np.percentile(env, 98) + 1e-6)
duck = 1 - 0.6 * np.clip(lp((env > 0.12).astype(np.float32), int(0.22 * sr)), 0, 1)
mus *= duck

# ---- SFX
def whoosh(t0, dur=0.45, gv=0.35, up=True):
    n = int(dur*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n)
    bell = np.sin(np.pi*np.clip(tt/dur, 0, 1))**1.5; lo = lp(nz, 26); hi = nz - lp(nz, 6); fr = np.linspace(0, 1, n) if up else np.linspace(1, 0, n)
    add(sfx, t0, (lo*(1-fr) + hi*fr*0.6) * bell * 1.4, gv)
def pop(t0, gv=0.35, f0=620):
    n = int(0.1*sr); tt = np.arange(n)/sr; add(sfx, t0, np.sin(2*np.pi*(f0+420*np.exp(-tt/0.02))*tt) * np.exp(-tt/0.03), gv)
def thud(t0, gv=0.6, f=70):
    n = int(0.4*sr); tt = np.arange(n)/sr; nz = lp(rng.standard_normal(n), 20)
    add(sfx, t0, np.sin(2*np.pi*f*tt)*np.exp(-tt/0.12) + nz*np.exp(-tt/0.04)*0.6, gv)
def chime(t0, notes, gv=0.25, gap=0.08, dur=1.2):
    for i, f in enumerate(notes):
        n = int(dur*sr); tt = np.arange(n)/sr
        add(sfx, t0 + i*gap, (np.sin(2*np.pi*f*tt) + 0.35*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt/0.3)) * np.exp(-tt/0.45) * np.minimum(1, tt/0.003), gv)
def gas_release(t0, gv=1.0):
    """SATU bunyi pelepasan gas: letupan kecil 'pok' + desis yang cepat mereda (1,3 detik)."""
    n = int(0.12*sr); tt = np.arange(n)/sr
    add(sfx, t0, (np.sin(2*np.pi*(150*np.exp(-tt/0.04) + 60)*tt) + lp(rng.standard_normal(n), 6)*0.8) * np.exp(-tt/0.035), gv*0.9)
    n = int(1.3*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n); hi = nz - lp(nz, 4); mid = lp(nz, 3) - lp(nz, 40)
    env = np.minimum(1, tt/0.02) * np.exp(-tt/0.42)
    add(sfx, t0 + 0.03, (hi*0.5 + mid*0.9) * env, gv*0.55)
def crack(t0, gv=0.5):
    n = int(0.35*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n)
    add(sfx, t0, (nz - lp(nz, 3)) * np.exp(-tt/0.05) * (1 + 0.6*np.sin(2*np.pi*40*tt)), gv)
def rise(t0, dur, gv=0.3):
    n = int(dur*sr); tt = np.arange(n)/sr; nz = rng.standard_normal(n)
    add(sfx, t0, (lp(nz, 12) * np.linspace(0, 1, n) ** 2) * np.minimum(1, tt/0.1), gv)
def murmur(a, b, gv=0.06):  # gumam kerumunan sangat tipis, hanya sebelum gas
    nz = lp(rng.standard_normal(N), 30) - lp(rng.standard_normal(N), 160)
    wob = 0.6 + 0.4*np.sin(2*np.pi*0.7*(t - a))*np.sin(2*np.pi*0.23*(t - a) + 1)
    env_ = lp(((t >= a) & (t < b)).astype(np.float32), int(0.4*sr))
    amb[:] += nz * env_ * wob * gv * 6
def trickle(a, b, gv=0.07):  # air mengalir lembut saat bilas mata
    nz = rng.standard_normal(N); band = lp(nz, 3) - lp(nz, 14)
    drips = np.zeros(N)
    for tt_ in np.arange(a, b, 0.17):
        i = int((tt_ + rng.uniform(0, 0.05)) * sr); m = int(0.04*sr)
        if i + m < N: drips[i:i+m] += np.sin(2*np.pi*(900 + rng.uniform(-200, 300))*np.arange(m)/sr) * np.exp(-np.arange(m)/sr/0.012)
    env_ = lp(((t >= a) & (t < b)).astype(np.float32), int(0.3*sr)) * (0.7 + 0.3*np.sin(2*np.pi*1.3*(t - a)))
    amb[:] += (band * 1.4 + drips * 0.6) * env_ * gv * 4

murmur(4.3, 7.7, 0.05)
gas_release(7.76, 1.0)                                    # SATU bunyi gas
whoosh(14.22, 0.3, 0.3, True)                             # ke adegan odol
pop(21.0, 0.25, 700); rise(20.35, 0.6, 0.2)               # bingkai beku + tanda tanya
crack(23.92, 0.45); thud(23.93, 0.35, 70)                 # ?? "!" setelah beku
whoosh(26.2, 0.3, 0.28, True); thud(27.62, 0.55, 78)      # tanda larangan menimpa tabung
whoosh(35.9, 0.3, 0.28, True)                             # ke penjelasan tubuh
for i, w in enumerate((5, 7, 9, 11)): pop(wd('K14', w) - 0.05, 0.16, 640 + i*60)  # empat kartu gejala
whoosh(51.4, 0.3, 0.25, True); chime(54.7, [784, 1047, 1319], 0.12, 0.1)          # lega
whoosh(57.1, 0.5, 0.22, False)                            # keesokan harinya
whoosh(62.25, 0.3, 0.22, True)
pop(62.9, 0.14, 700); pop(64.45, 0.14, 800)               # peta: titik asal dan Portland
chime(72.2, [1047, 1319], 0.12, 0.08)                     # angka 47%
whoosh(71.12, 0.3, 0.22, True)
whoosh(87.3, 0.4, 0.2, False)                             # tenang
whoosh(90.25, 0.3, 0.2, True); whoosh(94.1, 0.3, 0.2, True)
trickle(95.6, 100.2, 0.07)                                # bilas dengan air bersih
whoosh(100.45, 0.3, 0.2, True)
for i, w in enumerate((3,)): pop(wd('K27', w) - 0.05, 0.14, 560)
pop(wd('K28', 0) - 0.05, 0.14, 620); pop(wd('K28', 4) - 0.05, 0.14, 680); chime(wd('K29', 1) - 0.05, [880, 1109], 0.12, 0.1)
whoosh(107.7, 0.45, 0.25, True); chime(108.4, [1047, 1319, 1568], 0.14, 0.08)

# ---- campuran
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4]**2) + 1e-12)
dd = dlg / (np.abs(dlg).max() + 1e-6) * 0.85; dr = rms(dd)
mu = mus / (rms(mus) + 1e-9) * dr * 10**(-15.5/20)
fx = sfx / (np.abs(sfx).max() + 1e-9) * dr * 0.7
am = amb / (np.abs(amb).max() + 1e-9) * dr * 0.2
mix = dd + mu + fx + am
pk = np.abs(mix).max(); print('puncak', pk, 'rms dialog', dr)
mix = mix / max(1, pk / 0.95)
for nm, a in (('mix', mix), ('music', mu), ('sfx', fx + am)):
    w = wave.open(os.path.join(HERE, nm + '.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1)*32767).astype(np.int16).tobytes()); w.close()
print('ok', T)
