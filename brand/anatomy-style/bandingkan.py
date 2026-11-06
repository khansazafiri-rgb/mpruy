"""Preview perbandingan (revisi 4).
Pemakaian: python3 brand/anatomy-style/bandingkan.py <gambar-acuan.jpg>
Keluaran di render/:
  perbandingan.png               acuan | v3 | v4 (terbaru), jantung baris 1 dan gigi baris 2, TINGGI KANVAS SAMA
  perbandingan-ukuran-organ.png  sama, tetapi organ utama dipotong pada kotak pembatasnya dan diskalakan ke tinggi sama (bentuk mudah dibandingkan)
  polos-vs-final.png             versi polos (cek geometri) di sebelah versi final, jantung dan gigi (tanpa acuan)
  ukuran-hp.png                  pemeriksaan ukuran layar HP (acuan + terbaru)
Acuan = satu gambar berisi jantung (kiri) dan gigi (kanan); hanya dipakai untuk perbandingan visual dan tidak disimpan di repo."""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); out = os.path.join(here, 'render')
ref = Image.open(sys.argv[1]).convert('RGB'); w, h = ref.size
refH, refT = ref.crop((0, 0, w // 2 - 2, h)), ref.crop((w // 2 + 2, 0, w, h))
L = lambda n: Image.open(n).convert('RGB')
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
except Exception: font = ImageFont.load_default()
pad, cap = 14, 44

def sheet(rows, H, path):
    rows = [[(n, im.resize((round(im.width * H / im.height), H), Image.LANCZOS)) for n, im in r] for r in rows]
    W = max(sum(t[1].width for t in r) + pad * (len(r) + 1) for r in rows); Hh = len(rows) * (H + cap + pad) + pad
    cv = Image.new('RGB', (W, Hh), (14, 8, 24)); d = ImageDraw.Draw(cv); y = pad
    for r in rows:
        x = pad
        for name, im in r:
            d.text((x, y + 8), name, fill=(255, 255, 255), font=font); cv.paste(im, (x, y + cap)); x += im.width + pad
        y += H + cap + pad
    cv.save(path); print('ok', os.path.basename(path), cv.size)

def organ_box(im, margin=0.05):
    """Kotak pembatas organ: piksel yang jelas lebih terang/jenuh dari latar ungu gelap (persentil 0,5-99,5 agar bintik tidak ikut)."""
    a = np.asarray(im).astype(float) / 255; mx, mn = a.max(2), a.min(2)
    sat = (mx - mn) / (mx + 1e-6); lum = a @ np.array([.3, .59, .11])
    m = ((lum > 0.30) & (sat > 0.18)) | (lum > 0.62)
    ys, xs = np.nonzero(m); x0, x1 = np.percentile(xs, [0.5, 99.5]); y0, y1 = np.percentile(ys, [0.5, 99.5])
    mx_, my_ = (x1 - x0) * margin, (y1 - y0) * margin
    return (int(max(0, x0 - mx_)), int(max(0, y0 - my_)), int(min(im.width, x1 + mx_)), int(min(im.height, y1 + my_)))
def crop_organ(im): return im.crop(organ_box(im))

J, G = L(f'{out}/jantung.png'), L(f'{out}/gigi.png'); J3, G3 = L(f'{out}/v3/jantung.png'), L(f'{out}/v3/gigi.png')
sheet([[('ACUAN (jantung)', refH), ('v3', J3), ('v4 (terbaru)', J)], [('ACUAN (gigi)', refT), ('v3', G3), ('v4 (terbaru)', G)]], 900, f'{out}/perbandingan.png')
sheet([[('ACUAN (jantung)', crop_organ(refH)), ('v3', crop_organ(J3)), ('v4', crop_organ(J))], [('ACUAN (gigi)', crop_organ(refT)), ('v3', crop_organ(G3)), ('v4', crop_organ(G))]], 760, f'{out}/perbandingan-ukuran-organ.png')
sheet([[('JANTUNG polos (cek geometri)', L(f'{out}/jantung-polos.png')), ('JANTUNG final', J), ('GIGI polos (cek geometri)', L(f'{out}/gigi-polos.png')), ('GIGI final', G)]], 900, f'{out}/polos-vs-final.png')

ph = 640
fitp = lambda im: im.resize((round(im.width * ph / im.height), ph), Image.LANCZOS)
tiles = [fitp(refH), fitp(J), fitp(refT), fitp(G)]
sh = Image.new('RGB', (sum(t.width for t in tiles) + 10 * (len(tiles) + 1), ph + 20), (14, 8, 24)); x = 10
for t in tiles: sh.paste(t, (x, 10)); x += t.width + 10
sh.save(f'{out}/ukuran-hp.png'); print('hp', sh.size)
