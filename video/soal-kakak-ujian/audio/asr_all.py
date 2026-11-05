"""Pengenalan suara per ucapan (Whisper kecil via sherpa-onnx) pada narator, untuk menyusun naskah dan waktu. python3 -I asr_all.py narator.mp3 MODEL_DIR"""
import sys, subprocess, numpy as np, sherpa_onnx
src, mdir = sys.argv[1:3]
x16 = np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',src,'-f','f32le','-ac','1','-ar','16000','-'],capture_output=True).stdout, dtype=np.float32)
win = 160; n = len(x16) // win
db = 20 * np.log10(np.sqrt((x16[:n*win].reshape(n, win) ** 2).mean(1)) + 1e-9)
on = db > -41
segs = []; i = 0
while i < n:
    if on[i]:
        j = i
        while j < n and (on[j] or (on[j:j+25].any())): j += 1   # jeda < 0,25 dtk dianggap satu ucapan
        segs.append((i / 100, j / 100)); i = j
    else: i += 1
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f'{mdir}/small-encoder.int8.onnx', decoder=f'{mdir}/small-decoder.int8.onnx', tokens=f'{mdir}/small-tokens.txt', language='id', task='transcribe', num_threads=4)
for a, b in segs:
    if b - a < 0.15: continue
    s = rec.create_stream(); s.accept_waveform(16000, x16[int(max(0, a - 0.1) * 16000):int((b + 0.1) * 16000)]); rec.decode_stream(s)
    print(f'{a:6.2f} {b:6.2f}  {s.result.text.strip()}')
