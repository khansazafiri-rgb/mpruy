#!/usr/bin/env python3
"""Mix audio final "Ada Satu yang Kamu Lupa": suara ElevenLabs asli (tanpa ubah kecepatan) + musik sintetis tipis + SFX hemat.

Keluaran: audio/mix.wav (stereo 48 kHz, ≈ -14 LUFS) dan stem terpisah di audio/stems/.
Semua musik dan efek dibuat dari nol di sini (numpy), jadi tidak ada lisensi pihak ketiga.
"""
import json, os, re, subprocess, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
D = json.load(open(os.path.join(HERE, '..', 'stage', 'data.json')))
CL = D['clips']
TOTAL = D['total']
N = int(TOTAL * SR) + SR
rng = np.random.default_rng(7)
norm = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())


def at(clip, phrase):
    P = [norm(x) for x in phrase.split()]
    ws = [w for w in D['words'] if w['clip'] == clip]
    for i in range(len(ws) - len(P) + 1):
        if all(norm(ws[i + k]['w']) == p for k, p in enumerate(P)):
            return ws[i]['s']
    raise KeyError((clip, phrase))


def clip_wav(cid):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(HERE, 'clips', cid + '.wav'), '-ar', str(SR), '-ac', '1', '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def lp(x, k):   # lowpass sederhana (rata-rata bergerak)
    return np.convolve(x, np.ones(k) / k, mode='same')


def env(n, a, d, shape=3.0):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d * shape / 3)


def put(buf, t0, sig, amp=1.0):
    i = int(t0 * SR)
    if i < 0 or i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[:j - i] * amp


# ------------------------------------------------------------ suara
voice = np.zeros(N)
for cid in D['order']:
    s = clip_wav(cid)
    # samakan kekerasan Raka dan narator secara halus (hanya gain, tanpa mengubah kecepatan/nada)
    put(voice, D['clips'][cid]['start'], s)


# ------------------------------------------------------------ efek
def ding(f=880, dur=0.45, amp=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.01 * t) + 0.2 * np.sin(2 * np.pi * f * 3.02 * t)) * np.exp(-t / 0.11) * amp * np.minimum(1, t / 0.004)


def pop_snd(f0=420, f1=760, dur=0.09, amp=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 + (f1 - f0) * t / dur
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.03) * amp


def whoosh(dur=0.45, amp=0.5, k=60):
    n = int(dur * SR); x = lp(rng.standard_normal(n), k)
    return x / (np.abs(x).max() + 1e-9) * np.sin(np.pi * np.arange(n) / n) ** 2 * amp


def page(dur=0.16, amp=0.5):
    n = int(dur * SR); x = np.diff(rng.standard_normal(n + 1)) * 0.5
    x = lp(x, 6)
    return x / (np.abs(x).max() + 1e-9) * np.exp(-np.arange(n) / SR / 0.05) * amp


def click(amp=0.4):
    n = int(0.05 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.008) + 0.4 * rng.standard_normal(n) * np.exp(-t / 0.003)) * amp


def thump(f=170, amp=0.6):
    n = int(0.16 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * np.exp(-t * 6) * t * 4 + 2 * np.pi * f * t * 0.2) * np.exp(-t / 0.05) * amp


def coin(amp=0.4):
    n = int(0.5 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1480 * t) + 0.7 * np.sin(2 * np.pi * 2220 * t)) * np.exp(-t / 0.09) * amp * np.minimum(1, t / 0.002)


def chime(f=1046, amp=0.4):
    return ding(f, 0.9, amp) + ding(f * 1.5, 0.9, amp * 0.6)


def sparkle_snd(amp=0.3):
    out = np.zeros(int(0.9 * SR))
    for i, f in enumerate([1568, 2093, 2637]):
        put(out, i * 0.07, ding(f, 0.4, amp * (1 - i * 0.15)))
    return out




def scribble(dur=0.5, amp=0.3):
    n = int(dur * SR); x = np.diff(rng.standard_normal(n + 1))
    x = lp(x, 3) * (0.55 + 0.45 * np.sin(np.arange(n) / SR * 38))
    return x / (np.abs(x).max() + 1e-9) * np.minimum(1, np.arange(n) / (0.05 * SR)) * np.clip((n - np.arange(n)) / (0.08 * SR), 0, 1) * amp


def breath(dur=1.3, amp=0.18):
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(rng.standard_normal(n), 18)
    env_ = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return x / (np.abs(x).max() + 1e-9) * env_ * amp


def rise(dur=1.2, amp=0.25, rev=False):
    n = int(dur * SR); t = np.arange(n) / SR
    x = lp(rng.standard_normal(n), 14) + 0.5 * np.sin(2 * np.pi * (300 + 900 * (t / dur) ** 2) * t)
    e = (t / dur) ** 2 if not rev else np.exp(-t / (dur * 0.35))
    return x / (np.abs(x).max() + 1e-9) * e * amp


# ------------------------------------------------------------ efek
sfx = np.zeros(N)
A = lambda c, p: at(c, p)
T_END = TOTAL

# 1. hook: halaman dibalik, kalender dilingkari, soal tiba-tiba muncul
tBesok, tAda, tLupa, tSadar, tSoal = A('N1', 'Besok'), A('N1', 'Ada'), A('N1', 'lupakan'), A('N1', 'sadar'), A('N1', 'soalnya')
for i in range(4):
    put(sfx, 0.35 + i * 0.62, page(0.18, 0.22))
put(sfx, tBesok + 0.05, scribble(0.8, 0.24))
put(sfx, tBesok + 0.18, thump(190, 0.16))
put(sfx, tLupa - 0.15, pop_snd(430, 800, 0.1, 0.32)); put(sfx, tLupa + 0.05, pop_snd(520, 900, 0.08, 0.2))
put(sfx, tSoal - 0.05, whoosh(0.32, 0.3, 40)); put(sfx, tSoal + 0.28, thump(130, 0.4)); put(sfx, tSoal + 0.28, page(0.22, 0.25))
# 2. rutinitas
tJ, tK, tP, tT, tQ, tS = A('N2', 'jadwalmu'), A('N2', 'Kuliah'), A('N2', 'praktikum'), A('N2', 'tugas'), A('N2', 'kuis'), A('N2', 'Setiap')
put(sfx, tJ + 0.2, page(0.2, 0.26))
for i in range(6):
    put(sfx, tJ + 0.25 + i * 0.28, page(0.1, 0.16 + 0.03 * (i % 2)))
put(sfx, tK + 0.15, click(0.16)); put(sfx, tK + 0.5, click(0.14))
put(sfx, tP + 0.2, ding(1560, 0.3, 0.12)); put(sfx, tP + 0.5, ding(1320, 0.3, 0.1))
for i, f in enumerate([880, 988, 784]):
    put(sfx, tT + 0.12 + i * 0.28, ding(f, 0.34, 0.26))
put(sfx, tQ + 0.1, pop_snd(500, 900, 0.1, 0.32)); put(sfx, tQ + 0.65, ding(1240, 0.5, 0.2))
for i in range(5):
    put(sfx, tS + 0.5 + i * 0.35, pop_snd(380 + 30 * i, 700 + 30 * i, 0.08, 0.26))
# 3. siklus
tPag, tMata, tKamu3, tJadi, tBer, tSeb, tBers = A('N3', 'Besok'), A('N3', 'matamu'), A('N3', 'merasa'), A('N3', 'Jadi'), A('N3', 'Berhenti'), A('N3', 'sebentar'), A('N3', 'bersalah')
put(sfx, tPag + 0.1, ding(1760, 0.5, 0.1)); put(sfx, tPag + 0.5, ding(2093, 0.5, 0.08))     # burung pagi samar
put(sfx, tKamu3 + 0.35, whoosh(0.28, 0.2, 30)); put(sfx, tKamu3 + 0.6, thump(210, 0.2))
for i, tt in enumerate([tJadi + 0.45, tJadi + 1.15, tJadi + 1.95]):
    put(sfx, tt, whoosh(0.5, 0.2, 80)); put(sfx, tt + 0.25, page(0.2, 0.2))
put(sfx, tSeb + 0.35, pop_snd(420, 760, 0.1, 0.3)); put(sfx, tBers - 0.1, thump(105, 0.42)); put(sfx, tBers - 0.1, whoosh(0.4, 0.15, 150))
# 4. ujian
tU, tBaca, tIst, tHal, tTapi, tSus = A('N4', 'ujian'), A('N4', 'membaca'), A('N4', 'Istilah'), A('N4', 'ingat'), A('N4', 'Tapi'), A('N4', 'susah')
put(sfx, tU - 0.1, page(0.3, 0.2)); put(sfx, tU + 0.3, thump(90, 0.25))
for i in range(5):
    put(sfx, tBaca + 0.05 + i * 0.22, scribble(0.12, 0.12))
put(sfx, tIst + 0.12, sparkle_snd(0.26)); put(sfx, tIst + 0.14, pop_snd(500, 900, 0.1, 0.24))
put(sfx, tHal - 0.15, pop_snd(420, 760, 0.1, 0.3)); put(sfx, tHal + 0.2, page(0.2, 0.2))
for i in range(6):
    put(sfx, tTapi + 0.22 + i * 0.5, click(0.13)); put(sfx, tTapi + 0.28 + i * 0.5, pop_snd(300 - 10 * i, 220, 0.12, 0.12))
put(sfx, tTapi, rise(3.9, 0.12))
# 5. reveal
tR = CL['N5']['start']
kamu2 = [w for w in D['words'] if w['clip'] == 'N5' and w['w'].lower() == 'kamu'][1]['s']
put(sfx, tR - 0.12, rise(0.5, 0.35, rev=True)); put(sfx, tR - 0.1, chime(659, 0.18))
for ph in ('nggak', 'lupa', 'membawa'):
    put(sfx, A('N5', ph) + 0.35, pop_snd(700, 1100, 0.07, 0.28))
for tt in (kamu2 + 0.45, A('N5', 'waktu') - 0.1, A('N5', 'semua') - 0.1):
    put(sfx, tt, whoosh(0.3, 0.2, 40)); put(sfx, tt + 0.2, pop_snd(400, 700, 0.08, 0.22))
# 6. penjelasan
tTid, tAk, tFo, tMa, tMe = A('N6', 'tidur'), A('N6', 'Akibatnya'), A('N6', 'fokus'), A('N6', 'materi'), A('N6', 'melekat')
put(sfx, tTid - 0.1, pop_snd(420, 760, 0.1, 0.32)); put(sfx, tAk + 0.1, whoosh(0.4, 0.14, 60))
put(sfx, tFo - 0.1, pop_snd(480, 820, 0.1, 0.3))
for i in range(6):
    put(sfx, tMa + i * 0.32 + 0.38, click(0.2))
put(sfx, tMa + 1.8, page(0.3, 0.16))
# 7. bukti
tC, t39, t12, tSaat, tIng = A('N7', 'Crowley'), A('N7', '39'), A('N7', '1.200'), A('N7', 'Saat'), A('N7', 'ingatan')
put(sfx, tC - 0.15, pop_snd(420, 760, 0.1, 0.28)); put(sfx, t39 - 0.1, pop_snd(480, 820, 0.1, 0.26)); put(sfx, t12 - 0.1, pop_snd(480, 820, 0.1, 0.26))
for i in range(13):
    put(sfx, t39 - 0.2 + i * 0.05, click(0.07 + 0.0 * i))
for i in range(10):
    put(sfx, t12 - 0.3 + i * 0.07, pop_snd(500 + 20 * i, 700 + 20 * i, 0.05, 0.1))
put(sfx, tSaat, whoosh(0.34, 0.16, 50)); put(sfx, tSaat + 0.2, whoosh(0.34, 0.16, 50))
for i in range(5):
    put(sfx, tIng + i * 0.42 + 0.35, click(0.18))
# 8. penutup cerita
tIn, tBh, r3 = A('N8', 'ingat'), A('N8', 'berhenti'), CL['R3']
put(sfx, tBh + 0.55, thump(140, 0.4)); put(sfx, tBh + 0.55, page(0.14, 0.2))
put(sfx, tBh + 0.9, breath(1.4, 0.2))
put(sfx, tBh + 1.85, click(0.5)); put(sfx, tBh + 1.86, thump(90, 0.2))
# 9. identitas
t38, tG, tM, tSa, tSe = A('N9', '38'), A('N9', 'gratis'), A('N9', 'MEDCOEL'), A('N9', 'Satu'), A('N9', 'Sekarang')
put(sfx, 95.0 + 0.05, ding(2093, 0.6, 0.07)); put(sfx, 95.6, ding(2349, 0.6, 0.06))
put(sfx, t38 - 0.1, pop_snd(420, 760, 0.1, 0.3))
for i in range(14):
    put(sfx, t38 - 0.05 + i * 0.07, click(0.1))
put(sfx, tG - 0.05, pop_snd(600, 1100, 0.12, 0.34)); put(sfx, tM - 0.05, chime(1046, 0.3)); put(sfx, tM + 0.1, sparkle_snd(0.22))
put(sfx, tSa - 0.05, ding(1318, 0.5, 0.2))
tEnd = tSe + 1.6
put(sfx, tEnd, whoosh(0.5, 0.22, 90)); put(sfx, tEnd + 0.25, chime(1175, 0.3)); put(sfx, tEnd + 0.5, sparkle_snd(0.22))
# peralihan adegan: sapuan hijau tipis
bounds = [CL['N2']['start'] - 0.05, CL['N3']['start'] - 0.05, CL['N4']['start'] - 0.05, CL['N6']['start'] - 0.05, CL['N7']['start'] - 0.05, CL['N8']['start'] - 0.05, CL['N9']['start'] - 0.05]
for b in bounds:
    put(sfx, b - 0.15, whoosh(0.3, 0.14, 90))
for b in [tJ - 0.05, tK - 0.05, tP - 0.05, tT - 0.05, tQ - 0.05, tS - 0.05, tMata - 0.05, tKamu3 - 0.05, tJadi - 0.05, tBer - 0.05, tBaca - 0.05, tIst - 0.05, tTapi - 0.05]:
    put(sfx, b - 0.12, whoosh(0.26, 0.1, 90))

# ------------------------------------------------------------ ambience
amb = np.zeros(N)


def murmur(t0, dur, amp):
    n = int(dur * SR); tt = np.arange(n) / SR
    m = lp(rng.standard_normal(n), 30) * (0.6 + 0.4 * np.sin(2 * np.pi * 3.1 * tt + 1) * np.sin(2 * np.pi * 0.7 * tt))
    m = m / (np.abs(m).max() + 1e-9) * amp
    put(amb, t0, m * np.minimum(1, tt / 0.3) * np.clip((dur - tt) / 0.4, 0, 1))


murmur(tJ - 1.2, 1.4, 0.07)                               # keramaian ospek (samar)
murmur(tK, tP - tK, 0.05)                                  # kelas
# ruang ujian: dengung ruangan sangat rendah + goresan pensil, dibungkam sebelum dialog Raka
tU0, tU1 = CL['N4']['start'] - 0.05, CL['R2']['start'] - 0.55
n = int((tU1 - tU0) * SR); tt = np.arange(n) / SR
room = lp(rng.standard_normal(n), 400) * 0.9
room = room / (np.abs(room).max() + 1e-9) * 0.05 * np.minimum(1, tt / 0.8) * np.clip((tU1 - tU0 - tt) / 0.5, 0, 1)
put(amb, tU0, room)
for tp in (38.9, 40.2, 42.6, 43.1, 44.8, 46.4):
    put(amb, tp, scribble(0.35, 0.06))
# pagi: kicau burung samar
for tc, f in [(95.6, 3300), (96.4, 3900), (98.0, 3000), (100.9, 3600), (103.0, 3100)]:
    m = int(0.14 * SR); t = np.arange(m) / SR
    put(amb, tc, np.sin(2 * np.pi * (f + 600 * t / 0.14) * t) * np.exp(-t / 0.05) * 0.03)

# ------------------------------------------------------------ musik
mus = np.zeros(N)
MIDI = lambda m: 440.0 * 2 ** ((m - 69) / 12)


def pad(t0, dur, notes, amp=0.10, a=0.9, r=1.4):
    n = int((dur + r) * SR); t = np.arange(n) / SR
    e = np.minimum(1, t / a) * np.clip((dur + r - t) / r, 0, 1)
    sig = np.zeros(n)
    for m in notes:
        f = MIDI(m)
        for dt in (-0.12, 0.0, 0.14):
            sig += np.sin(2 * np.pi * f * (1 + dt * 0.01) * t + rng.random() * 6.28)
        sig += 0.25 * np.sin(2 * np.pi * f * 2 * t)
    sig /= len(notes) * 3
    put(mus, t0, sig * e, amp)


def pluck(t0, m, amp=0.12, dur=1.1):
    n = int(dur * SR); t = np.arange(n) / SR; f = MIDI(m)
    sig = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.15) + 0.15 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.08)) * np.exp(-t / 0.35)
    sig *= np.minimum(1, t / 0.004)
    put(mus, t0, sig, amp)


def prog(t0, t1, chords, pad_amp, pl_amp, pattern, bars=1.0, beat=0.66):
    t = t0; i = 0
    dur = beat * 4 * bars
    while t < t1 - 0.05:
        b, pn, pl = chords[i % len(chords)]
        d = min(dur, t1 - t)
        pad(t, d, [b] + pn, pad_amp)
        if pl_amp > 0:
            for k, step in enumerate(pattern):
                tn = t + k * beat / 2
                if tn < t1 - 0.05 and tn < t + d and step is not None:
                    pluck(tn, pl[step % len(pl)], pl_amp * (0.8 + 0.2 * ((k % 2) == 0)))
        t += d; i += 1


C_ = (48, [60, 64, 67], [72, 76, 79, 84]); G_ = (43, [59, 62, 67], [71, 74, 79, 83])
Am = (45, [57, 60, 64], [69, 72, 76, 81]); F_ = (41, [57, 60, 65], [69, 72, 77, 81])
Dm = (50, [57, 62, 65], [69, 74, 77, 81]); Em = (40, [59, 62, 67], [71, 74, 79, 83])

tN2, tN3, tN4, tN5, tN6, tN7, tN8, tN9 = (CL[k]['start'] for k in ('N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8', 'N9'))
# 1) hook dan rutinitas: ritme ringan, penasaran
prog(0.0, tN3 - 0.05, [C_, G_, Am, F_], 0.06, 0.08, [0, 2, 1, 3, 2, 1, 3, 2], beat=0.6)
# 2) siklus: berulang, makin sesak
prog(tN3 - 0.05, tN4 - 0.05, [Am, F_, C_, G_], 0.065, 0.06, [0, 1, 2, 3, 2, 1, 2, 3], beat=0.6)


def drone(t0, t1, amp0, amp1):
    n = int((t1 - t0) * SR); t = np.arange(n) / SR
    env_ = np.linspace(amp0, amp1, n) ** 1.5
    trem = 0.75 + 0.25 * np.sin(2 * np.pi * (0.35 + 0.35 * t / (t1 - t0)) * t)
    sig = (np.sin(2 * np.pi * MIDI(38) * t) + 0.6 * np.sin(2 * np.pi * MIDI(45) * t) + 0.35 * np.sin(2 * np.pi * MIDI(51) * t + 1) + 0.25 * np.sin(2 * np.pi * MIDI(57) * t))
    sig = sig / 2.2 * env_ * trem * np.clip((t1 - t0 - t) / 0.35, 0, 1) * np.minimum(1, t / 1.0)
    put(mus, t0, sig)


# 3) ujian: ketegangan naik, dipotong bersih sebelum dialog Raka
tTa = at('N4', 'Tapi')
drone(tN4 - 0.05, CL["R2"]["start"] - 0.5, 0.1, 0.34)
for i, (tt, m) in enumerate([(tN4 + 2.3, 76), (tN4 + 4.6, 75), (tN4 + 6.4, 76), (tTa + 0.3, 75), (tTa + 1.4, 76), (tTa + 2.2, 75), (tTa + 3.0, 76)]):
    pluck(tt, m + 12, 0.045 + 0.01 * i, 1.4)
# 4) setelah hening: reveal, hangat tapi belum lega
prog(tN5 - 0.05, tN6 - 0.05, [F_, C_, Am, G_], 0.06, 0.04, [0, None, 2, None, 1, None, 3, None], bars=1.0, beat=0.78)
# 5) penjelasan dan bukti: tenang, ringan
prog(tN6 - 0.05, tN7 - 0.05, [C_, Am, F_, G_], 0.06, 0.055, [0, 2, 1, 3, 2, 1, 3, 2], beat=0.7)
prog(tN7 - 0.05, tN8 - 0.05, [Am, F_, C_, G_], 0.055, 0.05, [0, 1, 2, 3, 2, 1, 2, 1], beat=0.7)
# 6) penutup cerita: kembali hangat dan ringan
prog(tN8 - 0.05, tN9 - 0.05, [F_, C_, Am, G_], 0.085, 0.05, [0, None, 2, None, 1, None, 3, None], bars=1.0, beat=0.8)
# 7) identitas: terang
prog(tN9 - 0.05, TOTAL - 2.4, [C_, G_, Am, F_], 0.09, 0.075, [0, 2, 1, 3, 2, 1, 3, 2], beat=0.66)
pad(TOTAL - 2.7, 1.9, [48, 60, 64, 67, 71], 0.13, a=0.3, r=1.4)
pluck(TOTAL - 2.7, 84, 0.1, 2.2)
# pagi setelah hening: tidak ada musik di jeda hening (52.76 - 54.4) karena prog() baru mulai di tN5

# ------------------------------------------------------------ stem dan mixdown
os.makedirs(os.path.join(HERE, 'stems'), exist_ok=True)


def wr(name, x):
    p = os.path.join(HERE, 'stems', name)
    pcm = (np.clip(x[:int(TOTAL * SR)], -1, 1) * 32767).astype('<i2').tobytes()
    with wave.open(p, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)
    return p


v, m, s, a = wr('suara.wav', voice), wr('musik.wav', mus), wr('sfx.wav', sfx), wr('ambience.wav', amb)
out = os.path.join(HERE, 'mix.wav')
pre = (
    '[0:a]highpass=f=70,equalizer=f=3000:t=q:w=1:g=1.5,asplit=2[vo][vsc];'
    '[1:a]highpass=f=120,lowpass=f=5200,equalizer=f=2200:t=q:w=0.9:g=-3[mus];'
    '[mus][vsc]sidechaincompress=threshold=0.015:ratio=8:attack=30:release=420:makeup=1[md];'
    '[2:a]highpass=f=200,lowpass=f=9000[sx];[3:a]highpass=f=150[am];'
    '[sx][am]amix=inputs=2:normalize=0[sa];'
    '[vo][md][sa]amix=inputs=3:normalize=0:weights=1 1.15 0.9,alimiter=limit=0.9'
)
ins = ['-i', v, '-i', m, '-i', s, '-i', a]
# loudnorm dua lintasan (ukur, lalu terapkan) supaya tepat sekitar -14 LUFS
r = subprocess.run(['ffmpeg', '-v', 'info', *ins, '-filter_complex', pre + ',loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json[o]', '-map', '[o]', '-f', 'null', '-'], capture_output=True, text=True)
j = json.loads(r.stderr[r.stderr.rindex('{'):r.stderr.rindex('}') + 1])
ln = f"loudnorm=I=-14:TP=-1.5:LRA=9:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
subprocess.run(['ffmpeg', '-y', '-v', 'error', *ins, '-filter_complex', pre + ',' + ln + ',aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo[o]', '-map', '[o]', out], check=True)
print('mix ->', out)
