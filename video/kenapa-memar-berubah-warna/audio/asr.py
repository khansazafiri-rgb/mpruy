"""ASR (faster-whisper) untuk waktu kata. Pemakaian: python3 asr.py sumber-asli.wav asr.json"""
import json, subprocess, sys, numpy as np
from faster_whisper import WhisperModel
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", sys.argv[1], "-f", "f32le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
a = np.frombuffer(raw, dtype=np.float32)
m = WhisperModel("small", device="cpu", compute_type="int8")
segs, _ = m.transcribe(a, language="id", beam_size=5, word_timestamps=True, condition_on_previous_text=False)
out = [{"start": s.start, "end": s.end, "text": s.text.strip(), "words": [{"w": w.word.strip(), "s": w.start, "e": w.end} for w in s.words]} for s in segs]
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
for s in out: print(f"{s['start']:.2f}-{s['end']:.2f} {s['text']}")
