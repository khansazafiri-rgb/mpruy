#!/usr/bin/env python3
"""QA audio: (1) suara di mix identik dengan berkas sumber (hanya penguatan skalar), (2) master outro sama persis (SHA-256 + korelasi),
(3) rasio suara/musik+efek di pita speaker ponsel (300 - 3400 Hz) saat suara aktif. Pemakaian: python3 cek_audio.py"""
import hashlib, os, wave, json
import numpy as np
from scipy import signal
H = os.path.dirname(os.path.abspath(__file__)); SR = 48000
def rd(p, n=None):
    w = wave.open(os.path.join(H, p)); ch = w.getnchannels(); x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768
    return (x.reshape(-1, ch)[:, 0] if ch > 1 else x), w.getframerate()
ev = json.load(open(os.path.join(H, 'events.json'))); OFF = ev['offset_narasi']; MA = ev['master_mulai']
mix, _ = rd('mix.wav'); nar, _ = rd('narasi-edukasi.wav'); mas, _ = rd('medcoel-outro-master.wav')
nar2 = signal.resample_poly(nar[:int(ev['narasi_dipotong_di'] * 24000)], 2, 1); mas2 = signal.resample_poly(mas, 2, 1)
def fit(ref, t0):
    i = int(round(t0 * SR)); seg = mix[i:i + len(ref)]; g = np.dot(seg, ref) / np.dot(ref, ref); res = seg - g * ref
    return g, 10 * np.log10(np.dot(g * ref, g * ref) / np.dot(res, res)), float(np.corrcoef(seg, ref)[0, 1])
for nm, ref, t0 in (('narasi', nar2, OFF), ('master outro', mas2, MA)):
    g, snr, c = fit(ref, t0); print(f'{nm}: gain {g:.3f}  rasio suara/sisa {snr:.1f} dB  korelasi {c:.4f}')
sos = signal.butter(4, [300, 3400], 'band', fs=SR, output='sos')
for nm, ref, t0 in (('narasi', nar2, OFF), ('master outro', mas2, MA)):
    i = int(round(t0 * SR)); seg = signal.sosfilt(sos, mix[i:i + len(ref)]); v = signal.sosfilt(sos, ref * 1.0)
    g = np.dot(seg, v) / np.dot(v, v); res = seg - g * v
    # hanya jendela 200 ms tempat suara aktif
    w = int(0.2 * SR); act = [k for k in range(0, len(v) - w, w) if np.sqrt(np.mean((g * v[k:k + w]) ** 2)) > 0.02]
    r = [10 * np.log10(np.mean((g * v[k:k + w]) ** 2) / (np.mean(res[k:k + w] ** 2) + 1e-12)) for k in act]
    print(f'{nm} (pita ponsel 300-3400 Hz): median {np.median(r):.1f} dB, minimum {np.min(r):.1f} dB pada {len(act)} jendela 200 ms')
for f in ('narasi-edukasi.wav', 'medcoel-outro-master.wav'): print(f, hashlib.sha256(open(os.path.join(H, f), 'rb').read()).hexdigest())
