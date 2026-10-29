"""Potong dua audio ElevenLabs menjadi giliran N01..N10 dan O01..O04 lalu hitung rentang ucapan nyata.
Titik potong = tengah jeda antarkalimat yang terdeteksi (tidak ada kata terpotong, audio tidak diubah kecepatannya)."""
import subprocess, json, sys, numpy as np
src_n, src_o, out = sys.argv[1], sys.argv[2], sys.argv[3]
CUTS = {
  'N': (src_n, [0, 3.88, 9.08, 13.84, 22.20, 31.75, 36.34, 40.21, 50.36, 64.57, None]),
  'O': (src_o, [0, 4.085, 6.81, 10.59, None]),
}
SR = 44100
def pcm(path, a, b):
    cmd = ['ffmpeg', '-v', 'error', '-i', path, '-ss', str(a)]
    if b is not None: cmd += ['-to', str(b)]
    cmd += ['-f', 's16le', '-ac', '1', '-ar', str(SR), '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.int16)
meta = {}
for k, (path, cuts) in CUTS.items():
    for i in range(len(cuts) - 1):
        a, b = cuts[i], cuts[i + 1]
        x = pcm(path, a, b)
        name = f'{k}{i+1:02d}'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', f'{out}/{name}.wav'], input=x.tobytes(), check=True)
        f = x.astype(np.float32) / 32768
        win = int(SR * 0.01); n = len(f) // win
        rms = np.sqrt((f[:n * win].reshape(n, win) ** 2).mean(1)) + 1e-9
        db = 20 * np.log10(rms)
        on = np.where(db > -42)[0]
        s, e = on[0] * 0.01, (on[-1] + 1) * 0.01
        meta[name] = dict(dur=len(x) / SR, s=round(s, 3), e=round(e, 3), peak=float(np.abs(f).max()),
                          env=[round(float(v), 4) for v in rms])
json.dump(meta, open(f'{out}/clips.json', 'w'))
for n, m in meta.items(): print(n, f"dur={m['dur']:.2f} speech={m['s']:.2f}-{m['e']:.2f} peak={m['peak']:.2f}")
