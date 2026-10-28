#!/usr/bin/env python3
"""Mix audio final: suara ElevenLabs asli (tanpa ubah kecepatan) + musik sintetis tipis + SFX hemat.

Keluaran: audio/mix.wav (stereo 48 kHz, ≈ -14 LUFS) dan stem terpisah di audio/stems/.
Semua musik dan efek dibuat dari nol di sini (numpy), jadi tidak ada lisensi pihak ketiga.
"""
import json, os, re, subprocess, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000
D = json.load(open(os.path.join(HERE, '..', 'stage', 'data.json')))
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


sfx = np.zeros(N)
A = D['anchors']
# bagian 1 – hook: foto lalu zoom keluar ke meja, lalu zoom ke dalam polaroid
put(sfx, 1.05, whoosh(0.9, 0.35, 220)); put(sfx, 4.45, whoosh(0.55, 0.28, 120))
put(sfx, 2.9, click(0.25))
# bagian 2 – grup chat: notifikasi bersahutan tapi tidak menusuk
for ph, f in [('Jadwal ospek', 880), ('tugas', 988), ('pengumuman', 784), ('nama-nama', 932)]:
    put(sfx, at('N02', ph), ding(f, 0.4, 0.30))
tSpam = at('N02', 'notifikasi sudah')
for i in range(14):
    put(sfx, tSpam + i * 0.24, ding([740, 830, 988, 880][i % 4], 0.3, 0.14 + 0.1 * np.exp(-i / 6)))
# bagian 3 – bulan pertama: kertas, folder, stabilo
put(sfx, A['bulan_pertama'] - 0.1, pop_snd(520, 880, 0.12, 0.35))
for i in range(6):
    put(sfx, A['folder'] - 0.2 + i * 0.28, page(0.16, 0.35 + 0.05 * (i % 2)))
for i in range(5):
    put(sfx, A['menandai'] + i * 0.4, page(0.22, 0.22))
# bagian 4 – bulan kedua: ketuk, hening saat blank
put(sfx, A['bulan_kedua'] - 0.05, pop_snd(520, 880, 0.12, 0.35))
put(sfx, A['baca_semalaman'], page(0.2, 0.3))
put(sfx, A['satu_soal'] + 0.1, click(0.3))
# bagian 5 – akhir tahun pertama, tahun kedua
put(sfx, A['akhir_tahun'] - 0.05, pop_snd(520, 880, 0.12, 0.35))
put(sfx, at('N05', 'Masuk tahun') - 0.1, pop_snd(560, 940, 0.12, 0.35))
for ph in ('anatomi', 'farmakologi'):
    put(sfx, A[ph], pop_snd(400, 650, 0.1, 0.30))
# bagian 6 – uang, ringan saja
put(sfx, A['uang'], coin(0.30)); put(sfx, A['buku'], page(0.2, 0.3)); put(sfx, A['fotokopi'], whoosh(0.25, 0.22, 20))
put(sfx, A['perjalanan'], thump(150, 0.35)); put(sfx, A['kopi'], thump(210, 0.28))
# bagian 7 – lega, MEDCOEL, web asli
put(sfx, 86.7, chime(784, 0.28))
put(sfx, A['kenalin'], pop_snd(440, 860, 0.14, 0.4)); put(sfx, A['gratis'] - 0.1, pop_snd(600, 1100, 0.12, 0.35))
for ph, c in [('pilih_matkul', 'N07'), ('kerjakan', 'N07'), ('pembahasan', 'N07')]:
    put(sfx, A[ph], click(0.3))
put(sfx, A['simulasi'] - 0.4, click(0.28))
put(sfx, at('N07', 'Kamu nggak'), click(0.25)); put(sfx, at('N07', 'Mulai dari'), click(0.25))
# bagian 8 – penutup
put(sfx, 112.55, chime(1175, 0.35))
put(sfx, at('N08', 'Belajar') - 0.5, sparkle_snd(0.3))
# gelombang pindah adegan (panel hijau menyapu), sangat tipis
st = D['clips']
bounds = [st['N02']['start'] - 0.05, st['N03']['start'] - 0.05, A['malam'], st['N04']['start'] - 0.04, st['N05']['start'] - 0.06,
          at('N05', 'Masuk tahun') - 0.45, st['N06']['start'] - 0.06, st['N07']['start'] - 0.06, at('N07', 'Tanpa harus') - 0.12,
          at('N07', 'Kenalin') - 0.18, at('N07', 'Pilih mata') - 0.22, st['R06']['end'] + 0.1]
for b in bounds:
    put(sfx, b - 0.17, whoosh(0.34, 0.16, 90))

# ------------------------------------------------------------ ambience (hanya hari pertama)
amb = np.zeros(N)
n = int(6.8 * SR); tt = np.arange(n) / SR
mur = lp(rng.standard_normal(n), 30) * (0.6 + 0.4 * np.sin(2 * np.pi * 3.1 * tt + 1) * np.sin(2 * np.pi * 0.7 * tt))
mur = mur / (np.abs(mur).max() + 1e-9) * 0.11
fade = np.minimum(1, tt / 0.6) * np.clip((6.8 - tt) / 1.2, 0, 1)
put(amb, 0, mur * fade)
for tc, f in [(1.5, 3300), (3.4, 3900), (5.9, 3000)]:   # kicau burung sangat samar
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


BEAT = 0.72   # ~83 bpm

def prog(t0, t1, chords, pad_amp, pl_amp, pattern, bars=2.0, pad_notes=None):
    """chords: list of (bass_midi, [pad midis], [pluck midis]); setiap akor selama `bars` birama (4 ketuk)."""
    t = t0; i = 0
    dur = BEAT * 4 * bars
    while t < t1 - 0.05:
        b, pn, pl = chords[i % len(chords)]
        d = min(dur, t1 - t)
        pad(t, d, [b] + pn, pad_amp)
        if pl_amp > 0:
            for k, step in enumerate(pattern):
                tn = t + k * BEAT / 2
                if tn < t1 - 0.05 and tn < t + d and step is not None:
                    pluck(tn, pl[step % len(pl)], pl_amp * (0.8 + 0.2 * ((k % 2) == 0)))
        t += d; i += 1


C_ = (48, [60, 64, 67], [72, 76, 79, 84]); G_ = (43, [59, 62, 67], [71, 74, 79, 83])
Am = (45, [57, 60, 64], [69, 72, 76, 81]); F_ = (41, [57, 60, 65], [69, 72, 77, 81])
Dm = (50, [57, 62, 65], [69, 74, 77, 81])
# hari pertama: cerah, jarang
prog(0.0, 6.5, [C_, G_], 0.075, 0.07, [0, None, 1, None, 2, None, 1, None], bars=1)
# grup chat dan bulan pertama: lebih sibuk, minor
prog(6.6, 38.5, [Am, F_, C_, G_], 0.075, 0.05, [0, 2, 1, 3, 2, 1, 3, 2], bars=1)
# bulan kedua: menipis lalu hilang sebelum R04
prog(38.7, 47.8, [Dm, Am], 0.07, 0.03, [0, None, None, 2, None, None, 1, None], bars=1.5)
# 47.8 - 55.5: hening untuk "blank" (musik berhenti) — tidak ada not
# akhir tahun pertama dan tahun kedua: mulai pelan lagi, makin tersambung
prog(55.7, 73.3, [Am, F_, C_, G_], 0.07, 0.05, [0, 1, 2, 3, 2, 1, 2, 3], bars=1)
# uang: sangat jarang, sedikit sendu
prog(73.4, 86.4, [Am, Dm], 0.06, 0.04, [0, None, None, 2, None, None, None, None], bars=2)
# lega: major, lebih hangat
prog(86.6, 89.3, [C_], 0.11, 0.06, [0, 1, 2, 3, 2, 1, 0, 1], bars=1)
# MEDCOEL: terang, ritme sendiri
prog(89.4, TOTAL - 1.5, [C_, G_, Am, F_], 0.095, 0.075, [0, 2, 1, 3, 2, 1, 3, 2], bars=1)
# akor penutup
pad(TOTAL - 2.5, 1.6, [48, 60, 64, 67, 71], 0.12, a=0.3, r=1.2)
pluck(TOTAL - 2.5, 84, 0.1, 2.0)

# ------------------------------------------------------------ tulis stem lalu mixdown
os.makedirs(os.path.join(HERE, 'stems'), exist_ok=True)


def wr(name, x):
    p = os.path.join(HERE, 'stems', name)
    pcm = (np.clip(x[:int(TOTAL * SR)], -1, 1) * 32767).astype('<i2').tobytes()
    with wave.open(p, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)
    return p


v, m, s, a = wr('suara.wav', voice * 1.0), wr('musik.wav', mus), wr('sfx.wav', sfx), wr('ambience.wav', amb)
out = os.path.join(HERE, 'mix.wav')
flt = (
    # suara: buang gemuruh rendah, sedikit kehadiran
    '[0:a]highpass=f=70,equalizer=f=3000:t=q:w=1:g=1.5,asplit=2[vo][vsc];'
    # musik: buang bass dan pita suara, kompres otomatis saat narasi berbicara
    '[1:a]highpass=f=120,lowpass=f=5200,equalizer=f=2200:t=q:w=0.9:g=-3[mus];'
    '[mus][vsc]sidechaincompress=threshold=0.015:ratio=8:attack=30:release=420:makeup=1[md];'
    # efek dan ambience: ikut turun sedikit saat suara
    '[2:a]highpass=f=200,lowpass=f=9000[sx];[3:a]highpass=f=150[am];'
    '[sx][am]amix=inputs=2:normalize=0[sa];'
    '[vo][md][sa]amix=inputs=3:normalize=0:weights=1 1.15 0.9,alimiter=limit=0.9[mx];'
    '[mx]loudnorm=I=-14:TP=-1.5:LRA=7,aformat=sample_fmts=s16:sample_rates=48000:channel_layouts=stereo[o]'
)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', v, '-i', m, '-i', s, '-i', a, '-filter_complex', flt, '-map', '[o]', out], check=True)
print('mix ->', out)
