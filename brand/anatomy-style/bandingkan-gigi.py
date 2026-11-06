"""Perbandingan GIGI pada SKALA GIGI YANG SAMA: acuan gaya | v4 | revisi baru (v5), plus polos dan tampilan lebar 360 px.
Pemakaian: python3 brand/anatomy-style/bandingkan-gigi.py <gambar-acuan.jpg>
Skala disamakan lewat LEBAR MAHKOTA (email terlebar) di tiap gambar, lalu jendela dipotong dengan puncak mahkota di posisi yang sama.
Keluaran di render/: gigi-skala-sama.png (acuan tidak di-commit), gigi-polos-v4-v5.png, gigi-360.png (acuan tidak di-commit)."""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); out = os.path.join(here, 'render')
ref = Image.open(sys.argv[1]).convert('RGB'); w, h = ref.size
refT = ref.crop((w // 2 + 2, 0, w, h))
L = lambda n: Image.open(n).convert('RGB')
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24)
except Exception: font = ImageFont.load_default()

def crown(im):
    """(lebar mahkota, y puncak, x tengah) dari piksel email (terang, rendah saturasi) : baris dengan lintasan horizontal terpanjang."""
    a = np.asarray(im).astype(float) / 255; mx, mn = a.max(2), a.min(2)
    m = (a @ np.array([.3, .59, .11]) > 0.72) & ((mx - mn) < 0.32)
    best = (0, 0, 0); top = None
    for y in range(0, im.height, 2):
        row = m[y]; xs = np.flatnonzero(row)
        if xs.size < 40: continue
        # lintasan terpanjang dengan celah <= 4 px
        runs = np.split(xs, np.flatnonzero(np.diff(xs) > 4) + 1); lr = max(runs, key=len)
        if len(lr) > 60 and top is None: top = y
        if len(lr) > best[0]: best = (len(lr), y, int((lr[0] + lr[-1]) / 2))
    return best[0], top if top is not None else best[1], best[2]

# v4 dan v5 dirender dengan skala yang sama (lebar mahkota 484 px x K 1,1 = 532 px; puncak mahkota y=398 dan 411; tengah x=540); hanya acuan yang diukur dari gambarnya.
KNOWN = {'v4': (532.4, 398, 540), 'REVISI BARU (v5)': (532.4, 411, 540)}
def normalize(im, name, tw=300, win=(560, 900), top_off=90):
    cw, top, cx = KNOWN.get(name) or crown(im); s = tw / cw
    r = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    cx, top = cx * s, top * s
    canvas = Image.new('RGB', win, (14, 8, 24))
    canvas.paste(r, (int(win[0] / 2 - cx), int(top_off - top)))
    return canvas, cw

tiles = [('ACUAN GAYA', refT), ('v4', L(f'{out}/v4/gigi.png')), ('REVISI BARU (v5)', L(f'{out}/gigi.png'))]
norm = [(n, *normalize(im, n)) for n, im in tiles]
print('lebar mahkota (px asli; acuan terukur dari gambar):', [(n, round(cw)) for n, _, cw in norm])
pad, cap = 14, 40
W = sum(t[1].width for t in norm) + pad * 4; H = norm[0][1].height + cap + pad * 2
cv = Image.new('RGB', (W, H), (14, 8, 24)); d = ImageDraw.Draw(cv); x = pad
for n, im, _ in norm:
    d.text((x, 8), n, fill=(255, 255, 255), font=font); cv.paste(im, (x, cap + pad)); x += im.width + pad
cv.save(f'{out}/gigi-skala-sama.png'); print('ok', cv.size)

# polos v4 vs v5 pada skala yang sama (memakai skala hasil kronologi yang sama: keduanya 1080 x 1920 dengan K sama)
p4, p5 = L(f'{out}/v4/gigi-polos.png'), L(f'{out}/gigi-polos.png')
cv2 = Image.new('RGB', (1080 * 2 // 2 + 30, 960 + 50), (14, 8, 24)); d = ImageDraw.Draw(cv2)
for i, (n, im) in enumerate([('POLOS v4', p4), ('POLOS v5', p5)]):
    im = im.resize((540, 960), Image.LANCZOS); cv2.paste(im, (10 + i * 550, 40)); d.text((10 + i * 550, 8), n, fill=(255, 255, 255), font=font)
cv2.save(f'{out}/gigi-polos-v4-v5.png'); print('ok polos', cv2.size)

# tampilan lebar 360 px (layar HP): acuan | v4 | v5, tinggi proporsional (360 x 640)
tiles360 = [(tiles[0][0], refT.crop((0, 130, refT.width, 130 + round(refT.width * 16 / 9))))] + tiles[1:]   # acuan dipotong ke 9:16 di sekitar gigi
tw = [im.resize((360, round(im.height * 360 / im.width)), Image.LANCZOS) for _, im in tiles360]
sh = Image.new('RGB', (360 * 3 + 40, tw[0].height + 20), (14, 8, 24))
for i, im in enumerate(tw): sh.paste(im, (10 + i * 370, 10))
sh.save(f'{out}/gigi-360.png'); print('ok 360', sh.size)
