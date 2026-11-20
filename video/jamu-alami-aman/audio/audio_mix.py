"""Mix audio video "Jamu bekerja bagaimana, dan apakah alami berarti aman?". Tiga JALUR TERPISAH (stem) yang kemudian dicampur:
  1) suara  = audio/narasi-edukasi.wav (Google AI Studio, dipotong di cues.json["edu_end"] = akhir kalimat "...yang memang kamu perlukan.") lalu audio/medcoel-outro-master.wav (master outro MEDCOEL, tidak direkam ulang) mulai di cues.json["t_outro"] saat web sudah terlihat.
     Suara TIDAK diubah (tidak dipercepat, nada tidak diubah); hanya potongan akhir (fade 40 ms) dan penyamaan level outro ke level narasi (gain statis, selisih LUFS terukur).
  2) musik  = audio/stem-musik.wav: instrumen "ingin tahu" ringan (marimba/pluck pentatonik + pad lembut, 96 BPM), disintesis dari kode (numpy), turun di bawah suara.
  3) sfx    = audio/stem-sfx.wav: plop bahan masuk wadah, tok alu, kilau senyawa, blip penyerapan, tok kartu naik tangga, ting centang, klik web; TANPA bunyi "obat ajaib" dan tanpa efek dramatis pada bagian risiko.
Lisensi musik + SFX: CC0 1.0 (dibuat dari kode, tanpa sampel/musik pihak ketiga), aman untuk promosi Instagram/TikTok. Pemakaian: python3 video/jamu-alami-aman/audio/audio_mix.py -> stem-*.wav, premix.wav, mix.wav (butuh ffmpeg)."""
import json, os, subprocess, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); C = json.load(open(os.path.join(HERE, '..', 'cues.json'))); EV = C['ev']
sr = 44100; T = C['dur']; N = int(T * sr); t = np.arange(N) / sr; rng = np.random.default_rng(5)
def rd(path, rate=sr):
    b = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(rate), '-'], capture_output=True).stdout
    return np.frombuffer(b, dtype=np.float32).astype(np.float64)
def lufs(x):
    p = os.path.join(HERE, '_tmp.wav'); w = wave.open(p, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
    m = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', p, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr; os.remove(p)
    return float([l for l in m.splitlines() if l.strip().startswith('I:')][-1].split()[1])
# ---------------------------------------------------------------- 1) suara
voice = np.zeros(N)
edu = rd(os.path.join(HERE, 'narasi-edukasi.wav'))[:int(C['edu_end'] * sr)].copy(); f = int(0.04 * sr); edu[-f:] *= np.linspace(1, 0, f); voice[:len(edu)] += edu
out = rd(os.path.join(HERE, 'medcoel-outro-master.wav')); gdb = lufs(edu) - lufs(out); gain = 10 ** (gdb / 20)   # samakan level outro dengan narasi edukasi (tanpa kejutan keras)
o0 = int(C['t_outro'] * sr); voice[o0:o0 + len(out)] += out * gain
print('LUFS narasi', round(lufs(edu), 2), 'outro', round(lufs(out), 2), 'gain outro dB', round(gdb, 2))
# ---------------------------------------------------------------- 2) musik
mus = np.zeros(N)
def put(buf, t0, sig, g=1.0):
    i = int(t0 * sr)
    if i < 0 or i >= N: return
    j = min(N, i + len(sig)); buf[i:j] += sig[:j - i] * g
def pluck(f, dur=0.5, g=0.3):
    n = int(dur * sr); tt = np.arange(n) / sr
    s = np.sin(2 * np.pi * f * tt) + 0.45 * np.sin(2 * np.pi * f * 4 * tt) * np.exp(-tt / 0.05) + 0.2 * np.sin(2 * np.pi * f * 10 * tt) * np.exp(-tt / 0.02)
    return s * np.minimum(1, tt / 0.004) * np.exp(-tt / (dur * 0.35)) * g
def pad(f, dur, g=0.1):
    n = int(dur * sr); tt = np.arange(n) / sr; s = np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 2.003 * tt)
    return s * np.minimum(1, tt / 0.6) * np.clip((dur - tt) / 0.8, 0, 1) * g
BPM = 96; B = 60 / BPM
def mf(m): return 440.0 * 2 ** ((m - 69) / 12)
CH = [(57, [0, 3, 7]), (53, [0, 4, 7]), (60, [0, 4, 7]), (55, [0, 4, 7])]             # Am F C G
PENTA = [0, 2, 4, 7, 9, 12, 14, 16]
def level(x):
    for a, b, v in ((0, 5, 0.7), (5, 9, 0.6), (9, 20, 0.8), (20, 34, 0.7), (34, 47.5, 0.75), (47.5, 60.3, 0.45), (60.3, 75, 0.7), (75, 99, 0.8)):
        if a <= x < b: return v
    return 0.6
bar = 0
while bar * 4 * B < T:
    x0 = bar * 4 * B; root, iv = CH[bar % 4]; v = level(x0)
    for k, d in enumerate(iv): put(mus, x0, pad(mf(root + 12 + d), 4 * B + 0.5, 0.06 * v))
    put(mus, x0, pad(mf(root - 12), 4 * B + 0.3, 0.11 * v))
    for k in range(8):
        if k % 2 == 1 and v < 0.5: continue
        m = root + 24 + PENTA[(k * 3 + bar * 2) % 6] - (12 if PENTA[(k * 3 + bar * 2) % 6] > 9 else 0)
        put(mus, x0 + k * B / 2, pluck(mf(m), 0.55, 0.22 * v))
    bar += 1
mus *= np.clip(t / 0.3, 0, 1) * np.clip((T - t) / 1.2, 0, 1)
# ---------------------------------------------------------------- 3) sfx (waktu dari cues.json)
sfx = np.zeros(N)
def blip(t0, f0, f1=None, dur=0.12, g=0.3, kind='sin'):
    n = int(dur * sr); f = np.linspace(f0, f1 or f0, n); ph = np.cumsum(f) / sr; s = np.sin(2 * np.pi * ph) if kind == 'sin' else 4 * np.abs(ph % 1 - 0.5) - 1
    put(sfx, t0, s * np.minimum(1, np.arange(n) / (0.003 * sr)) * np.exp(-np.arange(n) / sr / (dur * 0.45)), g)
def thud(t0, g=0.4, f=140):
    n = int(0.16 * sr); fr = np.geomspace(f, f * 0.4, n); ph = np.cumsum(fr) / sr; put(sfx, t0, np.sin(2 * np.pi * ph) * np.exp(-np.arange(n) / sr / 0.05), g)
def tick(t0, g=0.2):
    n = int(0.03 * sr); x = rng.standard_normal(n); k = 6; x = x - np.convolve(x, np.ones(k) / k, mode='same'); put(sfx, t0, x * np.exp(-np.arange(n) / sr / 0.006), g)
def shimmer(t0, g=0.14, n_=5):
    for i in range(n_): blip(t0 + i * 0.045, 1568 * 2 ** (PENTA[i % 5] / 12), None, 0.22, g)
for tt in EV['plant']: blip(tt, 500, 220, 0.12, 0.3); thud(tt + 0.05, 0.22, 200)             # plop bahan masuk wadah
for tt in EV['pestle']: thud(tt, 0.5, 120); tick(tt, 0.12)                                  # tok alu
shimmer(EV['burst'], 0.2, 7)                                                                # senyawa terurai
for i, tt in enumerate(EV['absorb']): blip(tt + 0.1, 700 + 80 * i, 900 + 80 * i, 0.1, 0.18)  # blip penyerapan
blip(EV['liver'], 330, 440, 0.25, 0.16, 'tri'); blip(EV['liver'] + 0.12, 440, 520, 0.25, 0.14, 'tri'); shimmer(EV['bio'], 0.12, 4)
for i, tt in enumerate(EV['steps']): thud(tt, 0.4 + 0.05 * i, 160 + 25 * i); blip(tt + 0.08, 660 * 2 ** (i * 4 / 12), None, 0.25, 0.22); tick(tt - 0.2, 0.12)   # tangga bukti: tok + nada naik per tingkat
for tt in (29.7, 31.4, 33.0): blip(tt, 440, 330, 0.18, 0.14, 'tri')                         # klaim lain: nada netral turun lembut
for tt in EV['check']: blip(tt, 1319, None, 0.2, 0.2); blip(tt + 0.07, 1760, None, 0.25, 0.16)   # ting centang
blip(EV['tenaga'], 988, None, 0.2, 0.14); blip(EV['tenaga'] + 0.09, 1319, None, 0.25, 0.14)
blip(EV['close'], 392, 330, 0.14, 0.16, 'tri'); blip(EV['close'] + 0.1, 262, None, 0.2, 0.16, 'tri')
for tt in (0.0, 4.96, 9.06, 11.94, 19.9, 23.14, 34.06, 47.5, 54.48, 60.26, 65.74, 71.36): tick(tt, 0.16)   # pergantian adegan: tick halus saja
for tt in EV['web'][1:]: tick(tt, 0.3); blip(tt, 1100, None, 0.05, 0.14)                    # klik web
blip(EV['url'], 659, None, 0.3, 0.16); blip(EV['url'] + 0.15, 880, None, 0.4, 0.16); blip(EV['url'] + 0.3, 1175, None, 0.5, 0.16)
# ---------------------------------------------------------------- duck musik dan sfx di bawah suara; loudness akhir
e = np.convolve(np.abs(voice), np.ones(int(0.06 * sr)) / int(0.06 * sr), mode='same'); e = e / (np.percentile(e[e > 0], 95) + 1e-9); sp = np.clip(e * 2.0, 0, 1)
duck = 1 - 0.78 * np.convolve(sp, np.ones(int(0.25 * sr)) / int(0.25 * sr), mode='same'); sduck = 1 - 0.35 * np.convolve(sp, np.ones(int(0.2 * sr)) / int(0.2 * sr), mode='same')
def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2) + 1e-12)
mu = mus / (rms(mus) + 1e-9) * 0.07 * duck; fx = sfx / (np.abs(sfx).max() + 1e-9) * 0.22 * sduck
def wr(name, a):
    w = wave.open(os.path.join(HERE, name), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
wr('stem-suara.wav', voice); wr('stem-musik.wav', mu); wr('stem-sfx.wav', fx)
pre = voice + mu + fx; wr('premix.wav', pre); li = lufs(pre); gd = -14.0 - li
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(HERE, 'premix.wav'), '-af', f'volume={gd}dB,alimiter=limit=0.8:level=0', '-ar', str(sr), '-ac', '1', '-t', str(T), os.path.join(HERE, 'mix.wav')], check=True)
print('premix LUFS', round(li, 2), 'gain', round(gd, 2))
