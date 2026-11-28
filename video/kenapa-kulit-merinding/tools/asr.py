"""ASR kata-demi-kata dari audio/narasi-edukasi.wav -> audio/asr.json (faster-whisper). Pemakaian: python3 tools/asr.py"""
import json, os, subprocess, numpy as np
from faster_whisper import WhisperModel
H = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
wav = os.path.join(H, 'audio', 'narasi-edukasi.wav')
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', wav, '-ar', '16000', '-ac', '1', '-f', 'f32le', '-'], capture_output=True).stdout
a = np.frombuffer(raw, dtype=np.float32)
m = WhisperModel('small', device='cpu', compute_type='int8')
segs, _ = m.transcribe(a, language='id', word_timestamps=True, vad_filter=False)
out = [{'start': s.start, 'end': s.end, 'text': s.text, 'words': [{'w': w.word, 's': round(w.start, 2), 'e': round(w.end, 2)} for w in s.words]} for s in segs]
json.dump(out, open(os.path.join(H, 'audio', 'asr.json'), 'w'), ensure_ascii=False, indent=1)
for s in out: print(f"[{s['start']:.2f}-{s['end']:.2f}] {s['text']}")
print('durasi', round(len(a) / 16000, 2))
