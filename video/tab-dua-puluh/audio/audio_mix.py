"""Musik instrumental (sintesis) + SFX + mix di bawah dialog. Keluaran: mix.wav (mono 44.1k) + stems."""
import numpy as np, wave, re, json, sys
S = '/tmp/claude-0/-home-user/c3dc5e70-a599-57ff-91be-f3087c292010/scratchpad'
sr = 44100; T = 100.5; N = int(T * sr)
rng = np.random.default_rng(7)

def load_wav(p):
    w = wave.open(p); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return a
dlg = load_wav(S + '/audio/dialog_reference.wav')
dlg = np.pad(dlg, (0, max(0, N - len(dlg))))[:N]

def lp(x, k):  # lowpass sederhana (moving average)
    k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, mode='same')
def env_exp(n, a=0.004, d=0.3):
    t = np.arange(n) / sr
    return np.minimum(1, t / a) * np.exp(-t / d)
def add(buf, t0, sig, g=1.0):
    i = int(t0 * sr)
    if i < 0 or i >= len(buf): return
    j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i] * g

# ---------- instrumen ----------
def rhodes(f, dur, vel=1.0):
    n = int(dur * sr); t = np.arange(n) / sr
    sig = (np.sin(2 * np.pi * f * t) * 1.0 + np.sin(2 * np.pi * f * 2.003 * t) * 0.35 * np.exp(-t / 0.25)
           + np.sin(2 * np.pi * f * 3.01 * t) * 0.12 * np.exp(-t / 0.12) + np.sin(2 * np.pi * f * 0.5 * t) * 0.2)
    sig *= np.minimum(1, t / 0.006) * np.exp(-t / (dur * 0.55)) * (1 + 0.12 * np.sin(2 * np.pi * 5 * t))
    sig *= np.clip((dur - t) / 0.08, 0, 1)
    return sig * vel
def bass(f, dur):
    n = int(dur * sr); t = np.arange(n) / sr
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2 * t)
    return s * np.minimum(1, t / 0.01) * np.exp(-t / (dur * 0.7)) * np.clip((dur - t) / 0.05, 0, 1)
def kick():
    n = int(0.28 * sr); t = np.arange(n) / sr
    f = 45 + 110 * np.exp(-t / 0.035)
    return np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t / 0.11)
def snare():
    n = int(0.22 * sr); t = np.arange(n) / sr
    nz = rng.standard_normal(n); nz = nz - lp(nz, 6)
    return (nz * 0.8 * np.exp(-t / 0.06) + np.sin(2 * np.pi * 190 * t) * 0.4 * np.exp(-t / 0.05))
def hat(open_=False):
    n = int((0.16 if open_ else 0.045) * sr); t = np.arange(n) / sr
    nz = rng.standard_normal(n); nz = nz - lp(nz, 4)
    return nz * np.exp(-t / (0.07 if open_ else 0.012))
def tick():
    n = int(0.03 * sr); t = np.arange(n) / sr
    return np.sin(2 * np.pi * 1900 * t) * np.exp(-t / 0.006) * 0.6

BEAT = 60 / 94.0; BAR = BEAT * 4
CH = [([261.63, 329.63, 392.0, 493.88], 65.41), ([220.0, 261.63, 329.63, 392.0], 55.0 * 2), ([174.61, 220.0, 261.63, 329.63], 87.31), ([196.0, 246.94, 293.66, 329.63], 98.0)]
T_DROP = 11.85
music = np.zeros(N); drums = np.zeros(N); pad = np.zeros(N)

# --- bagian tegang 0 - T_DROP: pad gelap + tik jam + riser ---
t = np.arange(N) / sr
tense = ((np.sin(2 * np.pi * 110 * t) + np.sin(2 * np.pi * 155.6 * t) * 0.8 + np.sin(2 * np.pi * 196 * t) * 0.6 + np.sin(2 * np.pi * 233.1 * t) * 0.5) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.35 * t)))
tgate = np.clip(t / 1.0, 0, 1) * np.clip((T_DROP + 0.25 - t) / 0.5, 0, 1) * (t < T_DROP + 0.3)
pad += tense * tgate * 0.10
for k in range(int(T_DROP / (BEAT / 2))):
    tt = k * BEAT / 2 + 0.3
    if tt < T_DROP - 0.2: add(drums, tt, tick(), 0.5 if k % 2 else 0.8)
# riser (kebisingan naik) 9.2 - 11.85
rs = rng.standard_normal(N); rs = rs - lp(rs, 8)
riser = rs * np.clip((t - 9.2) / (T_DROP - 9.2), 0, 1) ** 2.2 * ((t > 9.2) & (t < T_DROP))
pad += riser * 0.12

# --- bagian hangat T_DROP - 91.2 (lo-fi) ---
def section(t_start, t_end, bright=False, drums_on=True, step=0):
    bar = 0; tt = t_start
    while tt < t_end - 0.05:
        ch, root = CH[(bar + step) % 4]
        L = min(BAR, t_end - tt)
        # chord stab panjang + comping tersinkop
        for i, fq in enumerate(ch):
            add(music, tt + 0.012 * i, rhodes(fq, BEAT * 3.4), 0.16)
        for off, dur in ((BEAT * 2.5, BEAT * 1.2), (BEAT * 3.5, BEAT * 0.5)):
            if off < L:
                for fq in ch[1:]: add(music, tt + off, rhodes(fq, dur), 0.10)
        add(music, tt, bass(root, BEAT * 1.8), 0.34); add(music, tt + BEAT * 2.5, bass(root, BEAT * 1.2), 0.26)
        if bright:
            for j, fq in enumerate((ch[0] * 2, ch[2] * 2, ch[1] * 2, ch[3] * 2, ch[0] * 2, ch[2] * 2, ch[3] * 2, ch[1] * 2)):
                add(music, tt + j * BEAT / 2, rhodes(fq, BEAT * 0.45), 0.09)
        if drums_on:
            for b in range(8):
                x = tt + b * BEAT / 2
                if x >= t_end: break
                if b in (0, 5): add(drums, x, kick(), 0.62)
                if b in (2, 6): add(drums, x, snare(), 0.34)
                add(drums, x + (BEAT / 2 * 0.12 if b % 2 else 0), hat(b == 7), 0.12 if b % 2 else 0.18)
        bar += 1; tt += BAR
section(T_DROP, 66.0 - 0.0, bright=False)
# dip detak jantung 65.3 - 68.4: tanpa drum, hanya pad rendah
section(66.0, 66.0)  # placeholder
section(68.4, 91.2, bright=True)
# finale terang 91.2 - 97.46 lalu penutup
section(91.2, 97.9, bright=True, step=0)
# penutup: akor C mayor panjang
for fq in (261.63, 329.63, 392.0, 493.88, 659.25): add(music, 97.9, rhodes(fq, 2.6), 0.18)
add(music, 97.9, bass(65.41, 2.6), 0.3)
add(drums, 97.9, kick(), 0.6)
# mute bagian dip (65.3-68.4) untuk musik utama selain pad
dip = ((t >= 65.2) & (t < 68.5)).astype(np.float32); dipg = 1 - 0.85 * np.clip(lp(dip, int(0.25 * sr)), 0, 1)
drums *= 1 - 0.97 * np.clip(lp(dip, int(0.1 * sr)), 0, 1)
music *= dipg
pad += (np.sin(2 * np.pi * 73.4 * t) * 0.5 + np.sin(2 * np.pi * 110 * t) * 0.35) * np.clip(lp(dip, int(0.3 * sr)), 0, 1) * 0.12
# fade out di ujung
fade = np.clip((T - 0.1 - t) / 1.4, 0, 1)
music_all = (music + pad + drums * 0.9) * fade

# --- ducking di bawah dialog ---
env = lp(np.abs(dlg), int(0.06 * sr)); env = env / (np.percentile(env, 98) + 1e-6)
duck = 1 - 0.5 * np.clip(lp((env > 0.12).astype(np.float32), int(0.2 * sr)), 0, 1)
music_all *= duck

# ---------- SFX ----------
sfx = np.zeros(N)
def whoosh(t0, dur=0.55, g=0.5, up=True):
    n = int(dur * sr); tt = np.arange(n) / sr; nz = rng.standard_normal(n)
    bell = np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.5
    k = (np.linspace(40, 6, n) if up else np.linspace(6, 40, n))
    out = np.zeros(n)
    for a, b in ((0, 1), (1, 2)):
        pass
    # lowpass berubah: campur dua tingkat
    lo = lp(nz, 28); hi = nz - lp(nz, 6)
    frac = np.linspace(0, 1, n) if up else np.linspace(1, 0, n)
    out = (lo * (1 - frac) + hi * frac * 0.6) * bell
    add(sfx, t0, out * 1.4, g)
def pop(t0, g=0.5, f0=620):
    n = int(0.12 * sr); tt = np.arange(n) / sr
    add(sfx, t0, np.sin(2 * np.pi * (f0 + 500 * np.exp(-tt / 0.02)) * tt) * np.exp(-tt / 0.04), g)
def click(t0, g=0.35):
    n = int(0.03 * sr); tt = np.arange(n) / sr; nz = rng.standard_normal(n)
    add(sfx, t0, (nz * 0.5 + np.sin(2 * np.pi * 2200 * tt)) * np.exp(-tt / 0.005), g)
def chime(t0, notes, g=0.4, gap=0.09):
    for i, f in enumerate(notes):
        n = int(1.4 * sr); tt = np.arange(n) / sr
        s = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt / 0.3)) * np.exp(-tt / 0.55) * np.minimum(1, tt / 0.003)
        add(sfx, t0 + i * gap, s, g)
def thud(t0, g=0.7):
    n = int(0.35 * sr); tt = np.arange(n) / sr
    nz = rng.standard_normal(n); nz = lp(nz, 10)
    add(sfx, t0, (np.sin(2 * np.pi * 85 * tt) * np.exp(-tt / 0.1) + nz * 0.5 * np.exp(-tt / 0.04)), g)
def beat_heart(t0, g=0.8):
    for off in (0, 0.19):
        n = int(0.22 * sr); tt = np.arange(n) / sr
        add(sfx, t0 + off, np.sin(2 * np.pi * 58 * tt) * np.exp(-tt / 0.07), g * (1 if off == 0 else 0.7))

# kamera/hook
for i, tt in enumerate(np.linspace(1.1, 2.6, 14)): pop(tt, 0.22, 700 + i * 40)       # tab bertambah
thud(2.62, 0.5); chime(2.7, [880], 0.12)
whoosh(6.25, 0.45, 0.5, True); pop(6.65, 0.4, 500)                                      # Kori masuk
thud(7.62, 0.75)                                                                          # stempel GRATIS
for tt in np.linspace(7.75, 9.7, 22): click(tt, 0.18)                                    # hitung 38.400
chime(9.75, [660, 880, 1318], 0.22, 0.07)
whoosh(11.75, 0.7, 0.45, False)                                                           # beralih ke panel
# kartu info + baris (dari stage.js)
cards = [17.1, 17.3, 19.0, 20.9, 25.7, 26.5, 32.9, 33.3, 34.9, 41.5, 43.8, 45.2, 46.5, 47.6, 53.45, 55.2, 56.3, 60.7, 60.8, 61.7, 62.9, 64.1, 69.0, 70.2, 71.1, 72.3, 79.2, 79.8, 82.4, 87.2, 87.6, 89.0, 90.2]
for tt in cards: pop(tt, 0.16, 760)
# ketukan di footage (dari rec.mjs)
src = open(S + '/video/rec/rec.mjs').read()
for line in src.splitlines():
    if 'await tap(' in line and 'click: false' not in line:
        m = re.search(r"tap\(.*?, (\d+\.\d+)(?:, \{|\))", line)
        if m: click(float(m.group(1)), 0.3)
for tt in (49.2, 49.38, 50.55, 50.75): click(tt, 0.22)                                    # mengetik 15 / 20
chime(36.95, [1046, 1318, 1568, 2093], 0.28, 0.06)                                       # momen paham
pop(37.0, 0.3, 900)
whoosh(52.1, 0.9, 0.55, True)                                                             # ganti lokasi (wipe)
for k in range(8): beat_heart(65.3 + k * 0.78 - k * k * 0.02, 0.9)                         # detak jantung
chime(68.55, [523, 659, 784], 0.2, 0.1)
chime(74.2, [784, 988, 1175, 1568], 0.25, 0.07)                                          # "Seru!"
pop(82.4, 0.3, 900)
chime(91.3, [784, 1047, 1319, 1568], 0.3, 0.07); whoosh(90.4, 0.9, 0.4, True)
chime(94.7, [1047, 1319, 1568, 2093], 0.3, 0.1); thud(94.62, 0.5)

# ---------- mix ----------
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
dd = dlg / (np.abs(dlg).max() + 1e-6) * 0.85
dlg_r = rms(dd)
mus = music_all / (rms(music_all) + 1e-9) * dlg_r * 10 ** (-13.5 / 20)
fx = sfx / (np.abs(sfx).max() + 1e-9) * 0.55 * dlg_r * 4.2 * 0.5
mix = dd + mus + fx
peak = np.abs(mix).max(); print('peak', peak, 'dlg rms', dlg_r)
mix = mix / max(1, peak / 0.95)
out = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
w = wave.open(S + '/video/mix.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(out.tobytes()); w.close()
for nm, a in (('music', mus), ('sfx', fx)):
    w = wave.open(S + f'/video/{nm}.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
print('ok')
