"""Merakit video "NEW FEATURE: Live 4D Lab" 1080x1920 30 fps dari rekaman layar asli (Drive) menurut edl.json.
Pemakaian (dari akar repo):
  python3 video/live-4d-fitur-baru/build.py <folder-rekaman>              -> medcoel-live-4d-fitur-baru.mp4 (butuh audio/mix.wav dan overlay/*.png)
  python3 video/live-4d-fitur-baru/build.py <folder-rekaman> --still 1.0   -> still/uji-1.00.png (satu bingkai, untuk memeriksa tata letak)
<folder-rekaman> berisi rec_23.55.23.mov, rec_23.58.43.mov, rec_23.59.44.mov (unduhan Drive; lihat README).
Gambar produk = rekaman asli yang hanya di-crop, diperbesar, dan disusun; ikon gembok, kilatan, garis emas, dan teks adalah grafis tambahan."""
import json, math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); RAW = sys.argv[1]
EDL = json.load(open(os.path.join(HERE, 'edl.json'))); FPS = 30; W, H = 1080, 1920
SRC = {k: os.path.join(RAW, v) for k, v in EDL['sumber'].items()}
BG = np.array([6, 28, 36], np.uint8); GOLD = (248, 192, 56)

# ---- crop pada piksel sumber (2816 x 1582) dan ukuran keluaran
STRIP = (1680, 16, 680, 60); STRIP_SZ = (1080, 95)               # bilah "Skenario" (nama skenario asli di UI)
SEC = {'N': ('live', (2174, 508, 642, 422)), 'E': ('aus', (1805, 410, 800, 526)), 'F': ('mode', (1805, 410, 800, 526))}; SEC_SZ = (1080, 710)
D3 = (40, 690, 1100, 360); D3_SZ = (1080, 353)                   # pasien 3D + probe
ZN = (2246, 562, 514, 385); Z_SZ = (1080, 810)                   # zoom jantung Normal
USG = (1650, 420, 500, 648); CT = (2262, 420, 500, 648)           # panel USG dan CT berdampingan (500 x 648 -> 540 x 700)
Y0 = 296

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
    img = np.empty((H, W, 3), np.uint8); yy = np.linspace(0, 1, H)[:, None, None]
    img[:] = (BG * (1 - 0.35 * np.abs(yy - 0.5) * 2) + np.array([8, 44, 52]) * 0.12).astype(np.uint8); return img
def ease(u): u = min(1, max(0, u)); return u * u * (3 - 2 * u)

def sweep(img, d, y0, y1):
    """Kilatan peralihan: garis emas menyapu panel dari atas ke bawah (8 bingkai) + kilat putih halus (d = bingkai sejak potongan)."""
    if 0 <= d < 8:
        y = int(y0 + (y1 - y0) * d / 7); img[max(y0, y - 3):min(y1, y + 5)] = (np.array(GOLD) * 0.95).astype(np.uint8)
        f = max(0, 1 - d / 5) * 0.25; img[y0:y1] = (img[y0:y1] * (1 - f) + 255 * f).astype(np.uint8)

def unlock_fx(img, t):
    """Momen 'unlock' di detik pertama: gembok emas yang terbuka (bahu gembok terangkat) di kiri pil teks, cincin cahaya, kilau menyapu pil."""
    im = Image.fromarray(img).convert('RGBA'); sc = 3
    big = Image.new('RGBA', (im.width * sc, 420 * sc), (0, 0, 0, 0)); d = ImageDraw.Draw(big)
    cx, cy = 196, 240 - 100  # pusat gembok pada koordinat potongan (y relatif 100)
    u = ease(t / 0.28); lift = 14 * u; rot = -22 * u
    # cincin cahaya
    for i, rr in enumerate((46, 82, 118)):
        a = max(0, 1 - max(0, t - 0.05 * i) / 0.45) * (0.8 - 0.2 * i)
        if t > 0.05 * i and a > 0: d.ellipse(((cx - rr * (0.4 + t * 1.6)) * sc, (cy + 22 - rr * (0.4 + t * 1.6)) * sc, (cx + rr * (0.4 + t * 1.6)) * sc, (cy + 22 + rr * (0.4 + t * 1.6)) * sc), outline=GOLD + (int(255 * a),), width=4 * sc)
    # bahu gembok (terangkat dan miring)
    sx, sy = cx + 3 * u, cy - 4 - lift
    d.arc(((sx - 17) * sc, (sy - 20) * sc, (sx + 17) * sc, (sy + 18) * sc), 180 + rot * 0.3, 360 + rot * 0.3, fill=(23, 43, 56, 255), width=11 * sc)
    d.arc(((sx - 17) * sc, (sy - 20) * sc, (sx + 17) * sc, (sy + 18) * sc), 180 + rot * 0.3, 360 + rot * 0.3, fill=(248, 247, 243, 255), width=6 * sc)
    if lift > 1: d.line(((sx - 17) * sc, (sy - 1) * sc, (sx - 17) * sc, (cy - 4) * sc), fill=(248, 247, 243, 255), width=6 * sc)
    d.rounded_rectangle(((cx - 27) * sc, (cy - 4) * sc, (cx + 27) * sc, (cy + 40) * sc), radius=9 * sc, fill=(23, 43, 56, 255))
    d.rounded_rectangle(((cx - 23) * sc, (cy - 0) * sc, (cx + 23) * sc, (cy + 36) * sc), radius=7 * sc, fill=(248, 247, 243, 255))
    d.ellipse(((cx - 5) * sc, (cy + 11) * sc, (cx + 5) * sc, (cy + 21) * sc), fill=(23, 43, 56, 255)); d.rectangle(((cx - 2) * sc, (cy + 18) * sc, (cx + 2) * sc, (cy + 29) * sc), fill=(23, 43, 56, 255))
    sm = big.resize((im.width, 420), Image.LANCZOS); im.alpha_composite(sm, (0, 100)); img[:] = np.array(im.convert('RGB'))
    # kilau menyapu pil (0,10 - 0,55 dtk)
    if 0.10 <= t <= 0.55:
        u2 = (t - 0.10) / 0.45; x = int(120 + 840 * u2); a = np.zeros((100, 1080), np.float32)
        yy, xx = np.mgrid[0:100, 0:1080]; band = np.clip(1 - np.abs((xx - x) - (yy - 50) * 0.7) / 28, 0, 1)
        reg = img[188:288].astype(np.float32); m = (np.array(Image.open(os.path.join(HERE, 'overlay', 'unlock.png')).convert('RGBA'))[188:288, :, 3:4] / 255.0)
        img[188:288] = np.clip(reg + 120 * band[..., None] * m, 0, 255).astype(np.uint8)

# ---- komposisi per jenis potongan ----
class Clip:
    def __init__(s, c, shot):
        s.c, s.k = c, c['kind']; kd = s.k
        if kd == 'usgct':
            src, t = c['src'], c['t']; s.l = {'strip': lay(src, t, STRIP, STRIP_SZ), 'usg': lay(src, t, USG, (540, 700)), 'ct': lay(src, t, CT, (540, 700)), 'd3': lay(src, t, D3, D3_SZ)}
        elif kd == 'zoom':
            s.l = {'z': lay('live', c['t'], ZN, Z_SZ), 'd3': lay('live', c['t3'], D3, D3_SZ)}
        elif kd == 'sector':
            src, crop = SEC[c['sec']]; t = c[src]
            s.l = {'strip': lay(src, t, STRIP, STRIP_SZ), 'sec': lay(src, t, crop, SEC_SZ), 'd3': lay('live', c['t3'], D3, D3_SZ)}
        elif kd == 'ui':
            x, y, w, h = c['crop']; s.l = {'ui': lay(c['src'], c['t'], tuple(c['crop']), (1080, int(1080 * h / w)))}
        elif kd == 'uifull':
            s.l = {'ui': lay(c['src'], c['t'], (0, 0, 2816, 1582), (1620, 911))}
        s.klinis = kd not in ('uifull',)
    def draw(s, img, k, dur):
        kd = s.k; l = s.l
        if kd == 'usgct':
            put(img, l['strip'].get(k), 0, Y0); line(img, Y0 + 96, 4)
            a = l['usg'].get(k); b = l['ct'].get(k); put(img, a, 0, Y0 + 100); put(img, b, 540, Y0 + 100); img[Y0 + 100:Y0 + 800, 538:542] = np.array(GOLD, np.uint8)
            line(img, Y0 + 800, 4); put(img, l['d3'].get(k), 0, 1212); line(img, 1208, 4)
        elif kd == 'zoom':
            put(img, l['z'].get(k), 0, Y0); line(img, Y0 - 4, 4); line(img, Y0 + 810, 4); put(img, l['d3'].get(k), 0, 1212); line(img, 1208, 4)
        elif kd == 'sector':
            put(img, l['strip'].get(k), 0, Y0); line(img, Y0 + 96, 4); sec = l['sec'].get(k)
            if s.c['sec'] == 'N': sec = sec.copy(); sec[:, :22] = (6, 10, 16)
            put(img, sec, 0, Y0 + 100); line(img, 1106, 4); put(img, l['d3'].get(k), 0, 1212); line(img, 1208, 4)
        elif kd == 'ui':
            a = l['ui'].get(k); hh = a.shape[0]; yy = Y0 + 40; put(img, a, 0, yy); line(img, yy - 4, 4); line(img, yy + hh, 4)
        elif kd == 'uifull':
            u = ease(k / (dur * FPS)); z = 1.0 + 0.30 * u; fr = l['ui'].get(k)
            im = Image.fromarray(fr); cw = int(1620 / z); ch = int(911 / z); ox = int((1620 - cw) * (0.30 + 0.45 * u)); oy = int((911 - ch) * 0.2)
            panel = np.array(im.crop((ox, oy, ox + cw, oy + ch)).resize((1080, 607), Image.LANCZOS)); put(img, panel, 0, Y0 + 180); line(img, Y0 + 176, 4); line(img, Y0 + 180 + 607, 4)

def texts(img, shot_label, t):
    for lab, a, z in [(x[0], x[1], x[2]) for x in EDL['teks']]:
        if lab == shot_label and a <= t < z: blend(img, lab, 1.0)

def render_shot(shot, only=None):
    clips = [Clip(c, shot) for c in shot['clips']]; starts = []; acc = 0.0
    for c in shot['clips']: starts.append(acc); acc += c['dur']
    n = int(round(shot['dur'] * FPS)); out = []
    for k in ([only] if only is not None else range(n)):
        t = k / FPS; i = max(j for j in range(len(starts)) if starts[j] <= t + 1e-6); cl = clips[i]; kk = k - int(round(starts[i] * FPS))
        img = base(); cl.draw(img, kk, shot['clips'][i]['dur'])
        if i > 0 or shot['at'] > 0: sweep(img, kk, Y0, 1566)
        texts(img, shot['label'], shot['at'] + t)
        if cl.klinis: blend(img, 'klinis')
        if shot['label'] == 'unlock': unlock_fx(img, t)
        out.append(img)
    return out

def render_outro(o):
    n = int(round(o['dur'] * FPS)); l = Layer('live', 4.4, (1580, 120, 1236, 1100), (1080, 960)); out = []
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
                            '-af', 'alimiter=limit=0.9:attack=2:release=40,loudnorm=I=-14:TP=-1.5:LRA=7', '-ar', '44100', '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-t', f"{EDL['total']}", '-movflags', '+faststart',
                            os.path.join(HERE, 'medcoel-live-4d-fitur-baru.mp4')], stdin=subprocess.PIPE)
    for s in shots + [{'label': 'outro', **EDL['outro']}]:
        fr = render_outro(EDL['outro']) if s['label'] == 'outro' else render_shot(s)
        for f in fr: enc.stdin.write(f.tobytes())
        print('shot', s['label'], len(fr), flush=True)
    enc.stdin.close(); enc.wait(); print('ok')
main()
