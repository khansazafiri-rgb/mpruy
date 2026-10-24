"""Narasi iklan dengan Pocket TTS Indonesian (anak10thn/pocket-tts-indonesian, CC-BY-4.0).
Contoh suara (prompt) memakai Common Voice 22.0 Indonesia yang berlisensi CC0.
  python pockettts.py --voice voices/xxx.mp3 --out dir --lines '{"01":"teks", ...}' [--eos -6.0]
Tiap baris disintesis ke dir/sNN.wav (24 kHz mono); voice.mjs --use dir menempatkannya di timeline.
"""
import argparse, json, os, sys, time
import numpy as np, scipy.io.wavfile as wavfile
from pocket_tts import TTSModel

CONFIG = "hf://anak10thn/pocket-tts-indonesian/indonesian_6l.yaml@17257664e384561c957b02ac92edd1a24807f0e5"
ap = argparse.ArgumentParser()
ap.add_argument("--voice", required=True); ap.add_argument("--out", required=True)
ap.add_argument("--lines", required=True, help="JSON {id: teks} atau @berkas.json")
ap.add_argument("--eos", type=float, default=-6.0); ap.add_argument("--temp", type=float, default=None)
ap.add_argument("--nbest", type=int, default=1, help="buat N kandidat per baris, pilih yang paling terbaca (butuh faster-whisper)")
ap.add_argument("--min-sec-per-char", type=float, default=0.05, help="buang kandidat yang terpotong (terlalu pendek untuk teksnya)")
a = ap.parse_args()
lines = json.load(open(a.lines[1:])) if a.lines.startswith("@") else json.loads(a.lines)
os.makedirs(a.out, exist_ok=True)
kw = {"config": CONFIG, "eos_threshold": a.eos}
if a.temp is not None: kw["temp"] = a.temp
model = TTSModel.load_model(**kw)
state = model.get_state_for_audio_prompt(a.voice)
import difflib, re, subprocess, torch
asr = None
if a.nbest > 1:
    from faster_whisper import WhisperModel
    asr = WhisperModel("small", device="cpu", compute_type="int8")
norm = lambda t: re.sub(r"[^a-z ]", "", t.lower().replace("-", " "))
def read_back(x):
    segs, _ = asr.transcribe(x.astype(np.float32), language="id", beam_size=5)
    return " ".join(s.text for s in segs)
def resample16(x, sr):
    return np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(sr), "-ac", "1", "-i", "-", "-ar", "16000", "-f", "f32le", "-"], input=x.tobytes(), capture_output=True).stdout, dtype=np.float32)
report = {}
for k, text in lines.items():
    t0 = time.time(); best = None
    for n in range(a.nbest):
        torch.manual_seed(1000 + n)
        audio = model.generate_audio(state, text)
        x = audio.detach().cpu().numpy().astype(np.float32).reshape(-1)
        sec = len(x) / model.sample_rate
        if asr is None:
            best = (1.0, x, "", sec); break
        heard = read_back(resample16(x, model.sample_rate))
        score = difflib.SequenceMatcher(None, norm(text), norm(heard)).ratio()
        if sec < a.min_sec_per_char * len(text): score -= 1
        if best is None or score > best[0]: best = (score, x, heard, sec)
    score, x, heard, sec = best
    wavfile.write(os.path.join(a.out, f"s{k}.wav"), model.sample_rate, (np.clip(x, -1, 1) * 32767).astype(np.int16))
    report[k] = {"teks": text, "terdengar": heard, "skor": round(score, 3), "detik": round(sec, 2)}
    print(f"s{k}: {sec:.2f} dtk, skor {score:.2f}, {time.time() - t0:.0f} dtk proses :: {text} => {heard}", flush=True)
json.dump(report, open(os.path.join(a.out, "laporan.json"), "w"), ensure_ascii=False, indent=1)
