"""Merakit Reel POV "Masih di lab" 1080x1920 30 fps dari rekaman layar asli (Drive) menurut edl.json.
Pemakaian (dari akar repo):
  python3 video/live-4d-masih-di-lab/build.py <folder-rekaman>              -> medcoel-live-4d-masih-di-lab.mp4 (butuh audio/mix.wav dan overlay/*.png)
  python3 video/live-4d-masih-di-lab/build.py <folder-rekaman> --still 3.0  -> still/uji-3.00.png (satu bingkai uji, dengan teks)
  python3 video/live-4d-masih-di-lab/build.py <folder-rekaman> --cover      -> cover/cover.png (butuh cover/t-*.png dari render-overlay.cjs cover)
<folder-rekaman> berisi rec_23.55.23.mov, rec_23.58.43.mov, rec_23.59.44.mov (unduhan Drive; lihat README).
Gambar produk = rekaman asli yang hanya di-crop, diperbesar, dan disusun. Teks = grafis tambahan (putih tebal bertepi hitam, tanpa kotak)."""
import json, os, subprocess, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); RAW = sys.argv[1]
EDL = json.load(open(os.path.join(HERE, 'edl.json'))); FPS = 30; W, H = 1080, 1920
SRC = {k: os.path.join(RAW, v) for k, v in EDL['sumber'].items()}
BG = np.array([6, 28, 36], np.uint8)

# ---- crop pada piksel sumber (2816 x 1582) dan ukuran keluaran
USG = (1650, 420, 500, 648); CT = (2262, 420, 500, 648); PAN_SZ = (540, 700)         # panel USG dan CT berdampingan
SEC = {'E': ('aus', (1805, 410, 800, 526)), 'F': ('mode', (1805, 410, 800, 526))}; SEC_SZ = (1080, 710)   # sektor CT (dipotong 5 px atas-bawah -> 700)
D3 = (40, 690, 1100, 360); D3_SZ = (1080, 353)                                          # pasien 3D + probe (rekaman live)
UI_HEAD = (0, 0, 1500, 90); UI_HEAD_SZ = (1080, 65)                                      # judul aplikasi "Anatomy Live 4D Lab" + menu
UI_MAIN = (1576, 20, 1240, 960); UI_MAIN_SZ = (1080, 836)                               # tab USG/CT, CT, label
Y_PAN = 320; Y_3D = 1030; Y_UI = 300

class Layer:
    """Aliran bingkai dari rekaman: crop + skala; dibaca per potongan 20 bingkai."""
    def __init__(s, src, t0, crop, size): s.src, s.t0, s.crop, s.size, s.c = src, t0, crop, size, {}
    def get(s, k):
        ch = k // 20
        if ch not in s.c:
            x, y, w, h = s.crop; ow, oh = s.size
            cmd = ['ffmpeg', '-v', 'error', '-ss', f'{s.t0 + ch * 20 / FPS:.4f}', '-i', SRC[s.src], '-vf', f'fps={FPS},crop={w}:{h}:{x}:{y},scale={ow}:{oh}:flags=lanczos', '-frames:v', '20', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
            raw = subprocess.run(cmd, capture_output=True).stdout; n = len(raw) // (ow * oh * 3)
            s.c[ch] = np.frombuffer(raw, np.uint8).reshape(n, oh, ow, 3)
        a = s.c[ch]; return a[min(k % 20, len(a) - 1)]
def lay(src, t, crop, size): return Layer(src, t, crop, size)

ov_cache = {}
def ov(path):
    if path not in ov_cache: ov_cache[path] = np.array(Image.open(path).convert('RGBA'), np.float32)
    return ov_cache[path]
def blend(img, path, a=1.0, dy=0):
    o = ov(path)
    if dy > 0: o = np.concatenate([np.zeros((dy,) + o.shape[1:], np.float32), o[:-dy]])
    al = o[..., 3:4] / 255 * a; img[:] = (img * (1 - al) + o[..., :3] * al).astype(np.uint8)
def put(img, arr, x, y): img[y:y + arr.shape[0], x:x + arr.shape[1]] = arr
def base():
    img = np.empty((H, W, 3), np.uint8); yy = np.linspace(0, 1, H)[:, None, None]
    img[:] = (BG * (1 - 0.35 * np.abs(yy - 0.5) * 2) + np.array([8, 44, 52]) * 0.12).astype(np.uint8); return img
def ease(u): u = min(1, max(0, u)); return u * u * (3 - 2 * u)
def flash(img, d):
    """Kilat putih halus 4 bingkai pada setiap potongan (d = bingkai sejak potongan)."""
    if 0 <= d < 4: f = 0.22 * (1 - d / 4); img[:] = (img * (1 - f) + 255 * f).astype(np.uint8)

class Shot:
    def __init__(s, sh):
        s.s, s.k = sh, sh['kind']; kd = s.k; t = sh['t']
        if kd == 'usgct':
            src = sh['src']; s.l = {'usg': lay(src, t, USG, PAN_SZ), 'ct': lay(src, t, CT, PAN_SZ), 'd3': lay(src, t, D3, D3_SZ)}
        elif kd == 'sector':
            src, crop = SEC[sh['sec']]; s.l = {'sec': lay(src, t, crop, SEC_SZ), 'd3': lay('live', sh['t3'], D3, D3_SZ)}
        elif kd == 'ui':
            s.l = {'head': lay(sh['src'], t, UI_HEAD, UI_HEAD_SZ), 'main': lay(sh['src'], t, UI_MAIN, UI_MAIN_SZ)}
    def draw(s, img, k):
        l = s.l
        if s.k == 'usgct':
            put(img, l['usg'].get(k), 0, Y_PAN); put(img, l['ct'].get(k), 540, Y_PAN); img[Y_PAN:Y_PAN + 700, 538:542] = (248, 248, 244)
            put(img, l['d3'].get(k), 0, Y_3D)
        elif s.k == 'sector':
            put(img, l['sec'].get(k)[5:705], 0, Y_PAN); put(img, l['d3'].get(k), 0, Y_3D)
        else:
            put(img, l['head'].get(k), 0, Y_UI); put(img, l['main'].get(k), 0, Y_UI + UI_HEAD_SZ[1])

def frame(shots, T, only_text=True, texts=True):
    sh = [x for x in shots if x['at'] <= T + 1e-6][-1]; k = int(round((T - sh['at']) * FPS)); o = shots.index(sh)
    return sh, k, o

def compose(clips, T, with_text=True):
    sh = [x for x in EDL['shots'] if x['at'] <= T + 1e-6][-1]; i = EDL['shots'].index(sh); k = int(round((T - sh['at']) * FPS))
    img = base(); clips[i].draw(img, k)
    if i > 0: flash(img, k)
    if with_text:
        for tx in EDL['teks']:
            d = (T - tx['at']) * FPS
            if d >= 0:
                u = ease(d / 5); blend(img, os.path.join(HERE, 'overlay', tx['id'] + '.png'), u, int(round(14 * (1 - u))))
    return img

def main():
    mk = lambda: [Shot(s) for s in EDL['shots']]
    if len(sys.argv) > 2 and sys.argv[2] == '--still':
        T = float(sys.argv[3]); os.makedirs(os.path.join(HERE, 'still'), exist_ok=True); p = os.path.join(HERE, 'still', f'uji-{T:.2f}.png')
        Image.fromarray(compose(mk(), T)).save(p); print(p); return
    if len(sys.argv) > 2 and sys.argv[2] == '--cover':
        T = 3.0; img = compose(mk(), T, with_text=False)
        for n in ('q', 'a', 'p1', 'p2', 'p3'): blend(img, os.path.join(HERE, 'cover', f't-{n}.png'))
        Image.fromarray(img).save(os.path.join(HERE, 'cover', 'cover.png')); print('cover'); return
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', os.path.join(HERE, 'audio', 'mix.wav'),
                            '-af', 'alimiter=limit=0.9:attack=2:release=40,loudnorm=I=-14:TP=-1.5:LRA=7', '-ar', '44100', '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-t', f"{EDL['total']}", '-movflags', '+faststart',
                            os.path.join(HERE, 'medcoel-live-4d-masih-di-lab.mp4')], stdin=subprocess.PIPE)
    clips = mk(); n = int(round(EDL['total'] * FPS))
    for f in range(n):
        enc.stdin.write(compose(clips, f / FPS).tobytes())
        if f % 60 == 0: print('bingkai', f, flush=True)
    enc.stdin.close(); enc.wait(); print('ok')
main()
