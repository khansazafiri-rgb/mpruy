"""Merakit video "Live 4D Lab: Normal atau ada perubahan?" 1080x1920 30 fps dari rekaman layar asli (Drive) menurut edl.json.
Pemakaian (dari akar repo):
  python3 video/live-4d-bandingkan/build.py <folder-rekaman>              -> medcoel-live-4d-bandingkan.mp4 (butuh audio/mix.wav dan overlay/*.png)
  python3 video/live-4d-bandingkan/build.py <folder-rekaman> --still 1.5   -> still/uji-1.50.png (satu bingkai, untuk memeriksa tata letak)
<folder-rekaman> berisi rec_23.55.23.mov, rec_23.58.43.mov, rec_23.59.44.mov (unduhan Drive; lihat README).
Semua gambar produk adalah rekaman asli yang hanya di-crop, diperbesar, dan disusun; sorotan emas, penggeser, dan teks adalah grafis tambahan.
Komposit dilakukan per bingkai dengan numpy; bingkai dikirim ke ffmpeg lewat pipa."""
import json, math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); RAW = sys.argv[1]
EDL = json.load(open(os.path.join(HERE, 'edl.json'))); FPS = 30; W, H = 1080, 1920
SRC = {k: os.path.join(RAW, v) for k, v in EDL['sumber'].items()}
BG = np.array([6, 28, 36], np.uint8); GOLD = (248, 192, 56)

# ---- crop pada piksel sumber (2816 x 1582) dan ukuran keluaran
STRIP = (1680, 16, 680, 60); STRIP_SZ = (1080, 95)               # bilah "Skenario" (nama skenario asli di UI)
SEC_N = (2174, 508, 642, 422); SEC_E = (1805, 410, 800, 526); SEC_SZ = (1080, 710)   # sektor CT (skala Normal dibesarkan 1,246x agar sama dengan Efusi)
D3 = (40, 690, 1100, 360); D3_SZ = (1080, 353)                   # pasien 3D + probe
ZN = (2246, 562, 514, 385); ZE = (1955, 516, 640, 480); Z_SZ = (1080, 810)   # zoom jantung (N dan E, skala sama)
Z3 = (240, 710, 480, 360)                                        # zoom model 3D (area dada)
Y0 = 296                                                          # awal area tumpukan di layar

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
def ov(name):
    if name not in ov_cache: ov_cache[name] = np.array(Image.open(os.path.join(HERE, 'overlay', name + '.png')).convert('RGBA'), np.float32)
    return ov_cache[name]
def blend(img, name, a=1.0):
    o = ov(name); al = o[..., 3:4] / 255 * a
    img[:] = (img * (1 - al) + o[..., :3] * al).astype(np.uint8)
def put(img, arr, x, y): img[y:y + arr.shape[0], x:x + arr.shape[1]] = arr
def line(img, y, h=4, a=0.9): img[y:y + h] = (img[y:y + h] * (1 - a) + np.array(GOLD) * a).astype(np.uint8)
def base():
    img = np.empty((H, W, 3), np.uint8); img[:] = BG
    yy = np.linspace(0, 1, H)[:, None, None]; img[:] = (BG * (1 - 0.35 * np.abs(yy - 0.5) * 2) + np.array([8, 44, 52]) * (0.12)).astype(np.uint8)
    return img
def ease(u): u = min(1, max(0, u)); return u * u * (3 - 2 * u)

# ---------------- keadaan (N/E) ----------------
class Stack:
    """Tumpukan: bilah skenario + citra sektor CT + model 3D. kind 'N' (Normal) atau 'E' (Efusi perikardial)."""
    def __init__(s, kind, p):
        s.kind = kind
        if kind == 'N': t = p['N']['live']; s.l = [lay('live', t, STRIP, STRIP_SZ), lay('live', t, SEC_N, SEC_SZ), lay('live', t, D3, D3_SZ)]
        else: s.l = [lay('aus', p['E']['aus'], STRIP, STRIP_SZ), lay('aus', p['E']['aus'], SEC_E, SEC_SZ), lay('live', p['E']['live3d'], D3, D3_SZ)]
    def draw(s, img, k):
        put(img, s.l[0].get(k), 0, Y0); sec = s.l[1].get(k)
        if s.kind == 'N': sec = sec.copy(); sec[:, :22] = (6, 10, 16)     # buang sisa skala pane USG di tepi kiri crop
        put(img, sec, 0, Y0 + 100); put(img, s.l[2].get(k), 0, 1212)
        line(img, Y0 + 96, 4); line(img, 1106, 4); line(img, 1208, 4)

def sweep(img, k0, k, y0, y1):
    """Kilatan peralihan: garis emas menyapu panel dari atas ke bawah (6 bingkai) + kilat putih halus; tanpa piksel kasar."""
    d = k - k0
    if 0 <= d < 8:
        y = int(y0 + (y1 - y0) * d / 7); img[max(y0, y - 3):min(y1, y + 5)] = (np.array(GOLD) * 0.95).astype(np.uint8)
        f = max(0, 1 - d / 5) * 0.28; img[y0:y1] = (img[y0:y1] * (1 - f) + 255 * f).astype(np.uint8)

def ring(img, cx, cy, r, k, a=1.0, w=7):
    im = Image.fromarray(img); sc = 3
    big = Image.new('RGBA', (im.width * sc, im.height * sc), (0, 0, 0, 0)); d = ImageDraw.Draw(big)
    n = 36; off = (k * 2.2) % (360 / n * 2)
    for i in range(n):
        if i % 2: continue
        a0 = off + i * 360 / n; d.arc((cx * sc - r * sc, cy * sc - r * sc, cx * sc + r * sc, cy * sc + r * sc), a0, a0 + 360 / n * 0.62, fill=GOLD + (int(255 * a),), width=w * sc)
    d.ellipse((cx * sc - r * sc * 0.97, cy * sc - r * sc * 0.97, cx * sc + r * sc * 0.97, cy * sc + r * sc * 0.97), outline=GOLD + (int(70 * a),), width=3 * sc)
    sm = big.resize(im.size, Image.LANCZOS); im.paste(sm, (0, 0), sm); img[:] = np.array(im.convert('RGB'))

def texts(img, shot, t):
    for name, a, z in shot.get('teks', []):
        if a <= t < z:
            f = (min(1, (t - a) / 0.12) if a > 0.001 else 1.0) * (min(1, (z - t) / 0.1) if z < shot['dur'] - 0.001 else 1.0); blend(img, name, max(0.0, f))

def render_shot(shot, only=None):
    typ = shot['type']; n = int(round(shot['dur'] * FPS)); out = []
    if typ in ('stack_cut', 'stack_wipe', 'stack_flicker'):
        SN, SE = Stack('N', shot), Stack('E', shot)
    if typ == 'zoom_sector':
        zl = {'N': lay('live', shot['N']['live'], ZN, Z_SZ), 'E': lay('aus', shot['E']['aus'], ZE, Z_SZ)}
        lw = {'N': lay('live', shot['lower']['N']['live'], D3, D3_SZ), 'E': lay('live', shot['lower']['E']['live3d'], D3, D3_SZ)}
    if typ == 'zoom_3d':
        zn = lay('live', shot['N']['live'], (Z3[0], Z3[1], Z3[2], Z3[3]), Z_SZ); ze = lay('live', shot['E']['live3d'], (Z3[0], Z3[1], Z3[2], Z3[3]), Z_SZ)
        sn = lay('live', shot['lower']['N']['live'], (2262, 482, 560, 450), (441, 353)); se = lay('aus', shot['lower']['E']['aus'], (1925, 440, 560, 450), (441, 353))
    if typ == 'usg_ct':
        lu = lay('live', shot['N']['live'], (1650, 420, 500, 648), (540, 700)); lc = lay('live', shot['N']['live'], (2262, 420, 500, 648), (540, 700)); l3 = lay('live', shot['N']['live'], D3, D3_SZ)
    if typ == 'ui_crop':
        c = shot['crop']; lu = lay(shot['src'], shot['t'], tuple(c), (1080, int(1080 * c[3] / c[2])))
    for k in ([only] if only is not None else range(n)):
        t = k / FPS; img = base()
        if typ == 'stack_cut':
            (SN if t < shot['cut'] else SE).draw(img, k if t < shot['cut'] else k - int(round(shot['cut'] * FPS)))
            sweep(img, int(round(shot['cut'] * FPS)), k, Y0, 1566)
        elif typ == 'stack_wipe':
            xs = [p[0] for p in shot['pos']]; ys = [p[1] for p in shot['pos']]
            # interpolasi mulus antar kunci
            seg = max(i for i in range(len(xs)) if xs[i] <= t) if t < xs[-1] else len(xs) - 2
            u = ease((t - xs[seg]) / (xs[seg + 1] - xs[seg])); dv = int(ys[seg] + (ys[seg + 1] - ys[seg]) * u)
            a = np.empty((H, W, 3), np.uint8); a[:] = img; SN.draw(a, k); SE.draw(img, k)
            img[:, :dv] = a[:, :dv]
            img[Y0 - 2:1566, max(0, dv - 4):dv + 4] = np.array(GOLD, np.uint8)
            im = Image.fromarray(img); d = ImageDraw.Draw(im); cy = 750
            d.ellipse((dv - 38, cy - 38, dv + 38, cy + 38), fill=GOLD, outline=(23, 43, 56), width=5)
            d.polygon([(dv - 22, cy), (dv - 8, cy - 12), (dv - 8, cy + 12)], fill=(23, 43, 56)); d.polygon([(dv + 22, cy), (dv + 8, cy - 12), (dv + 8, cy + 12)], fill=(23, 43, 56))
            img[:] = np.array(im)
        elif typ == 'stack_flicker':
            ph = int(t / shot['step']) % 2; (SN if ph == 0 else SE).draw(img, k)
            sweep(img, int(round(int(t / shot['step']) * shot['step'] * FPS)), k, Y0, 1566) if int(t / shot['step']) > 0 else None
        elif typ == 'zoom_sector':
            kk = int(round(shot['cut'] * FPS)); isE = t >= shot['cut']; j = k - kk if isE else k
            put(img, (zl['E'] if isE else zl['N']).get(j), 0, Y0); line(img, Y0 - 4, 4); line(img, Y0 + 810, 4)
            put(img, (lw['E'] if isE else lw['N']).get(j), 0, 1212); line(img, 1208, 4)
            sweep(img, kk, k, Y0, Y0 + 810)
            a = ease((t - (0.35 if not isE else shot['cut'] + 0.35)) / 0.25)
            if a > 0.01: ring(img, 540, Y0 + 405 + (0 if not isE else 0), 292 if isE else 262, k, a * (1 if isE else 0.9))
        elif typ == 'zoom_3d':
            kk = int(round(shot['cut'] * FPS)); isE = t >= shot['cut']; j = k - kk if isE else k
            put(img, (ze if isE else zn).get(j), 0, Y0); line(img, Y0 - 4, 4); line(img, Y0 + 810, 4)
            put(img, (se if isE else sn).get(j), 319, 1212); line(img, 1208, 4)
            sweep(img, kk, k, Y0, Y0 + 810)
            a = ease((t - (0.35 if not isE else shot['cut'] + 0.35)) / 0.25)
            if a > 0.01: ring(img, 480, Y0 + 392, 165, k, a)
        elif typ == 'usg_ct':
            put(img, lu.get(k), 0, Y0 + 100); put(img, lc.get(k), 540, Y0 + 100); img[Y0 + 100:Y0 + 800, 538:542] = np.array(GOLD, np.uint8)
            line(img, Y0 + 96, 4); line(img, Y0 + 800, 4); put(img, l3.get(k), 0, 1212); line(img, 1208, 4)
        elif typ == 'ui_crop':
            a = lu.get(k); hh = a.shape[0]; yy = Y0 + 40; put(img, a, 0, yy); line(img, yy - 4, 4); line(img, yy + hh, 4)
        texts(img, shot, t); blend(img, 'klinis'); out.append(img)
    return out

def render_outro(o):
    n = int(round(o['dur'] * FPS)); l = Layer('live', EDL['shots'][0]['N']['live'], (1580, 120, 1236, 1100), (1080, 960)); out = []
    for k in range(n):
        t = k / FPS; img = base(); a = np.array(Image.fromarray(l.get(k % 40)).filter(ImageFilter.GaussianBlur(16)))
        img[480:1440] = (a * 0.22 + img[480:1440] * 0.78).astype(np.uint8)
        blend(img, 'outro', ease(t / 0.3)); out.append(img)
    return out

def main():
    shots = EDL['shots']
    if len(sys.argv) > 3 and sys.argv[2] == '--still':
        T = float(sys.argv[3]); os.makedirs(os.path.join(HERE, 'still'), exist_ok=True)
        if T >= EDL['outro']['at']: fr = render_outro(EDL['outro'])[int((T - EDL['outro']['at']) * FPS)]
        else:
            s = [x for x in shots if x['at'] <= T][-1]; fr = render_shot(s, only=int(round((T - s['at']) * FPS)))[0]
        p = os.path.join(HERE, 'still', f'uji-{T:.2f}.png'); Image.fromarray(fr).save(p); print(p); return
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', os.path.join(HERE, 'audio', 'mix.wav'),
                            '-af', 'loudnorm=I=-14:TP=-1.5:LRA=7', '-ar', '44100', '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-t', f"{EDL['total']}", '-movflags', '+faststart',
                            os.path.join(HERE, 'medcoel-live-4d-bandingkan.mp4')], stdin=subprocess.PIPE)
    for s in shots + [{'type': 'outro', **EDL['outro']}]:
        fr = render_outro(EDL['outro']) if s['type'] == 'outro' else render_shot(s)
        for f in fr: enc.stdin.write(f.tobytes())
        print('shot', s['type'], len(fr), flush=True)
    enc.stdin.close(); enc.wait(); print('ok')
main()
