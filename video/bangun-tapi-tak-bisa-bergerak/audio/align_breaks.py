"""Menentukan titik potong takarir di dalam kalimat panjang: untuk tiap kandidat jeda, awalan audio dikenali (Whisper via sherpa-onnx)
dan dibandingkan dengan teks frasa pertama. Pemakaian: python3 -I align_breaks.py narator.mp3 MODEL_DIR out.json"""
import sys, json, difflib, re, subprocess, numpy as np, sherpa_onnx
src, mdir, out = sys.argv[1:4]
txt = open(__file__.replace('align_breaks.py', 'gen_data.py')).read()
CAPS = eval('[' + txt.split('CAPS = [')[1].split('\n]\n')[0] + ']')
x16 = np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',src,'-f','f32le','-ac','1','-ar','16000','-'],capture_output=True).stdout, dtype=np.float32)
x44 = np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',src,'-f','f32le','-ac','1','-ar','44100','-'],capture_output=True).stdout, dtype=np.float32)
win = 441; n = len(x44) // win
db = 20 * np.log10(np.sqrt((x44[:n * win].reshape(n, win) ** 2).mean(1)) + 1e-9)
pre = 'small' if 'small' in mdir else 'medium'
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f'{mdir}/{pre}-encoder.int8.onnx', decoder=f'{mdir}/{pre}-decoder.int8.onnx', tokens=f'{mdir}/{pre}-tokens.txt', language='id', task='transcribe', num_threads=4)
norm = lambda s: re.sub(r'[^a-z0-9 ]', '', s.lower().replace('rem', 'rem'))
def asr(a, b):
    s = rec.create_stream(); s.accept_waveform(16000, x16[int(a * 16000):int(b * 16000)]); rec.decode_stream(s); return norm(s.result.text)
res = {}
for s, e, ph in CAPS:
    if len(ph) < 2: continue
    a = max(0, int((s - 0.2) * 100)); b = min(n - 1, int((e + 0.2) * 100))
    on = [i for i in range(a, b) if db[i] > -41]; s2, e2 = on[0] * 0.01, (on[-1] + 1) * 0.01
    edges = []; last = s2
    for k in range(len(ph) - 1):
        target = norm(' '.join(ph[:k + 1]))
        # kandidat: tengah tiap celah energi rendah (>= 40 ms di bawah -31 dB)
        cands = []; i = int(last * 100) + 20
        while i < int(e2 * 100) - 20:
            if db[i] < -31:
                j = i
                while j < int(e2 * 100) and db[j] < -31: j += 1
                if j - i >= 4: cands.append(((i + j) / 2) * 0.01)
                i = j
            else: i += 1
        best = None
        for c in cands:
            text = asr(s2, c)
            sc = difflib.SequenceMatcher(None, text, target).ratio()
            if best is None or sc > best[1]: best = (c, sc, text)
        edges.append(best[0]); print(f'{s2:6.2f} break{k} -> {best[0]:.2f} score={best[1]:.2f} "{best[2]}" vs "{target}"', flush=True)
        last = best[0]
    res[f'{s}'] = dict(s=s2, e=e2, edges=edges)
json.dump(res, open(out, 'w'), indent=1)
