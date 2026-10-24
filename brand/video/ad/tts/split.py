"""Memotong SATU rekaman narasi utuh (mis. WAV dari ElevenLabs) menjadi satu berkas per kalimat: sNN-K.wav.
Suara tidak diubah (tanpa EQ, nada, atau percepatan): hanya dipotong, dengan sisa hening di ujung dibuang dan
fade 8 ms di tepi potongan supaya tidak berderak. Letak kalimat dicari dengan mengenali kata (Whisper, kata demi kata)
lalu mencocokkannya dengan narasi-final.json; titik potong diambil di bagian paling sepi di antara dua kalimat.
  python split.py --wav narasi.wav --out narasi [--model small]
Hasil: <out>/sNN-K.wav (44,1 kHz mono 16-bit) dan <out>/laporan.json (waktu, lama, dan seberapa yakin tiap kalimat cocok).
"""
import argparse, difflib, json, os, re, subprocess, sys
import numpy as np
from scipy.io import wavfile

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 44100
ap = argparse.ArgumentParser()
ap.add_argument("--wav", required=True); ap.add_argument("--out", required=True)
ap.add_argument("--script", default=os.path.join(HERE, "narasi-final.json"))
ap.add_argument("--model", default="small")
a = ap.parse_args()

def decode(sr):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", a.wav, "-ac", "1", "-ar", str(sr), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16)

pcm = decode(SR)                       # untuk dipotong (sama dengan yang dipakai voice-swap.mjs)
x16 = decode(16000).astype(np.float32) / 32768   # untuk dikenali
print(f"rekaman {len(pcm) / SR:.1f} dtk", flush=True)

norm = lambda t: re.sub(r"[^a-z ]", "", t.lower().replace("-", " ")).split()
shots = json.load(open(a.script))["shot"]
sent = []                              # (shot, k, teks, token)
for sid in sorted(shots):
    for k, t in enumerate(shots[sid]["teks"]): sent.append((sid, k + 1, t, norm(t)))

from faster_whisper import WhisperModel
model = WhisperModel(a.model, device="cpu", compute_type="int8")
segs, _ = model.transcribe(x16, language="id", beam_size=5, word_timestamps=True, condition_on_previous_text=False)
W = [(w.word, w.start, w.end) for s in segs for w in s.words]
asr = [(norm(w[0]) or [""])[0] for w in W]
script_tokens = [t for s in sent for t in s[3]]
sm = difflib.SequenceMatcher(None, script_tokens, asr, autojunk=False)
match = {}                             # indeks token naskah -> indeks kata hasil kenal
for b in sm.get_matching_blocks():
    for i in range(b.size): match[b.a + i] = b.b + i

# batas tiap kalimat di dalam daftar kata
spans, pos = [], 0
for s in sent:
    idx = [match[j] for j in range(pos, pos + len(s[3])) if j in match]
    spans.append((idx, len(idx) / max(1, len(s[3]))))
    pos += len(s[3])
bad = [f"{s[0]}-{s[1]}" for s, (idx, c) in zip(sent, spans) if not idx]
if bad:
    sys.exit(f"Kalimat tidak ditemukan di rekaman: {', '.join(bad)}. Periksa apakah teks yang diucapkan sama dengan naskah-elevenlabs.txt.")

first = [W[idx[0]][1] for idx, _ in spans]; last = [W[idx[-1]][2] for idx, _ in spans]
hop = int(0.01 * SR)
rms = np.array([np.sqrt(np.mean(pcm[i:i + hop].astype(np.float64) ** 2)) for i in range(0, len(pcm) - hop, hop)])

def quietest(t0, t1):                  # titik paling sepi antara dua waktu (detik)
    i0, i1 = int(max(0, t0) * 100), int(min(len(rms) - 1, t1 * 100)) + 1
    return (i0 + int(np.argmin(rms[i0:i1]))) / 100 if i1 > i0 else (t0 + t1) / 2

cuts = [0.0] + [quietest(last[i] - 0.05, first[i + 1] + 0.05) for i in range(len(sent) - 1)] + [len(pcm) / SR]
os.makedirs(a.out, exist_ok=True)
report = {}
fade = int(0.008 * SR)
for i, (sid, k, teks, _) in enumerate(sent):
    seg = pcm[int(cuts[i] * SR):int(cuts[i + 1] * SR)].astype(np.float64)
    env = np.array([np.sqrt(np.mean(seg[j:j + hop] ** 2)) for j in range(0, max(1, len(seg) - hop), hop)])
    thr = max(env) * 10 ** (-42 / 20)
    live = np.where(env > thr)[0]
    s0 = max(0, (live[0] - 6) * hop); s1 = min(len(seg), (live[-1] + 13) * hop)   # sisakan 60 ms depan, 120 ms belakang
    out = seg[s0:s1].copy()
    out[:fade] *= np.linspace(0, 1, fade); out[-fade:] *= np.linspace(1, 0, fade)
    wavfile.write(os.path.join(a.out, f"s{sid}-{k}.wav"), SR, np.clip(out, -32768, 32767).astype(np.int16))
    report[f"{sid}-{k}"] = {"teks": teks, "mulai": round(cuts[i] + s0 / SR, 2), "detik": round(len(out) / SR, 2), "kecocokan": round(spans[i][1], 2)}
    print(f"s{sid}-{k}: {len(out) / SR:.2f} dtk  cocok {spans[i][1]:.0%}  :: {teks}")
json.dump(report, open(os.path.join(a.out, "laporan.json"), "w"), ensure_ascii=False, indent=1)
low = [k for k, v in report.items() if v["kecocokan"] < 0.6]
if low: print("PERHATIAN: kecocokan rendah di", ", ".join(low), "- dengarkan potongan itu.")
