"""Merakit Reel POV "Masih di lab" 1080x1920 30 fps dari dua rekaman ponsel asli (Drive) menurut edl.json.
Pemakaian (dari akar repo):
  python3 video/live-4d-masih-di-lab/build.py <folder-rekaman>              -> medcoel-live-4d-masih-di-lab.mp4 (butuh audio/mix.wav dan overlay/*.png)
  python3 video/live-4d-masih-di-lab/build.py <folder-rekaman> --still 3.0  -> still/uji-3.00.png (satu bingkai uji, dengan teks)
  python3 video/live-4d-masih-di-lab/build.py <folder-rekaman> --cover      -> cover/cover.png (butuh cover/t-*.png dari: node overlay/render-overlay.cjs cover)
<folder-rekaman> berisi 20261111_231238.mp4 dan 20261111_231920.mp4 (unduhan Drive; lihat README). 20261111_231615.mp4 tidak dipakai.
Gambar = rekaman ponsel asli yang hanya di-crop 9:16, dihaluskan kedipannya (deflicker), diredam noisenya, dan sedikit diangkat bayangannya; tanpa kotak/panel. Teks = grafis tambahan (putih tebal bertepi hitam)."""
import json, os, subprocess, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); RAW = sys.argv[1]
EDL = json.load(open(os.path.join(HERE, 'edl.json'))); FPS = 30; W, H = 1080, 1920

def cmd(sh, t, frames):
    x, y, w, h = sh['crop']; vf = f"crop={w}:{h}:{x}:{y},scale={W}:{H}:flags=lanczos,{EDL['filter']},fps={FPS}"
    return ['ffmpeg', '-v', 'error', '-ss', f"{t:.4f}", '-i', os.path.join(RAW, EDL['sumber'][sh['src']]), '-vf', vf, '-frames:v', str(frames), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']

def frames_of(sh):
    """Generator bingkai satu potongan (dibaca berurutan dari ffmpeg, 4K HEVC -> 1080x1920)."""
    n = int(round(sh['dur'] * FPS)); p = subprocess.Popen(cmd(sh, sh['t'], n), stdout=subprocess.PIPE); sz = W * H * 3
    for _ in range(n):
        b = p.stdout.read(sz)
        if len(b) < sz: break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3).copy()
    p.stdout.close(); p.wait()

ov_cache = {}
def ov(path):
    if path not in ov_cache: ov_cache[path] = np.array(Image.open(path).convert('RGBA'), np.float32)
    return ov_cache[path]
def blend(img, path, a=1.0, dy=0):
    o = ov(path)
    if dy > 0: o = np.concatenate([np.zeros((dy,) + o.shape[1:], np.float32), o[:-dy]])
    al = o[..., 3:4] / 255 * a; img[:] = (img * (1 - al) + o[..., :3] * al).astype(np.uint8)
def ease(u): return min(1.0, max(0.0, u)) ** 2 * (3 - 2 * min(1.0, max(0.0, u)))

def add_text(img, T, d=''):
    for tx in EDL['teks']:
        a0 = (T - tx['at']) * FPS
        if a0 < 0: continue
        u = ease(a0 / 5); dy = int(round(14 * (1 - u)))
        if 'until' in tx:
            z = (T - tx['until']) * FPS
            if z >= 4: continue
            u *= 1 - ease(z / 4); dy = 0 if z > 0 else dy
        if u > 0.003: blend(img, os.path.join(HERE, d or 'overlay', tx['id'] + '.png'), u, dy)

def one_frame(T):
    sh = [s for s in EDL['shots'] if s['at'] <= T + 1e-6][-1]; k = int(round((T - sh['at']) * FPS))
    s2 = dict(sh); s2['dur'] = (k + 1) / FPS
    for i, f in enumerate(frames_of(s2)):
        if i == k: return f

def main():
    if len(sys.argv) > 2 and sys.argv[2] == '--still':
        T = float(sys.argv[3]); os.makedirs(os.path.join(HERE, 'still'), exist_ok=True); p = os.path.join(HERE, 'still', f'uji-{T:.2f}.png')
        f = one_frame(T); add_text(f, T); Image.fromarray(f).save(p); print(p); return
    if len(sys.argv) > 2 and sys.argv[2] == '--cover':
        f = one_frame(EDL['cover']['t'])
        for n in EDL['cover']['teks']: blend(f, os.path.join(HERE, 'cover', f't-{n}.png'))
        Image.fromarray(f).save(os.path.join(HERE, 'cover', 'cover.png')); print('cover'); return
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', os.path.join(HERE, 'audio', 'mix.wav'),
                            '-af', 'alimiter=limit=0.9:attack=2:release=40,loudnorm=I=-14:TP=-1.5:LRA=7', '-ar', '44100', '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-t', f"{EDL['total']}", '-movflags', '+faststart',
                            os.path.join(HERE, 'medcoel-live-4d-masih-di-lab.mp4')], stdin=subprocess.PIPE)
    n = int(round(EDL['total'] * FPS)); f0 = 0
    for sh in EDL['shots']:
        for i, f in enumerate(frames_of(sh)):
            T = (f0 + i) / FPS; add_text(f, T); enc.stdin.write(f.tobytes())
        f0 += int(round(sh['dur'] * FPS)); print('potongan', sh['src'], f0, flush=True)
    enc.stdin.close(); enc.wait(); print('ok')
main()
