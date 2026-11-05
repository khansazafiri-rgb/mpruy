"""Preview perbandingan: acuan (potongan kiri = jantung, kanan = gigi) di samping hasil render kode, lalu jantung dan gigi berdampingan.
Pemakaian: python3 brand/anatomy-style/bandingkan.py <gambar-acuan.jpg>   -> render/perbandingan.png
Gambar acuan hanya dipakai untuk perbandingan visual, tidak disertakan sebagai bagian hasil."""
import sys, os
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); out = os.path.join(here, 'render')
ref = Image.open(sys.argv[1]).convert('RGB'); w, h = ref.size
refH, refT = ref.crop((0, 0, w // 2 - 2, h)), ref.crop((w // 2 + 2, 0, w, h))
heart, tooth = Image.open(f'{out}/jantung.png').convert('RGB'), Image.open(f'{out}/gigi.png').convert('RGB')
H = 1000
def fit(im): return im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
tiles = [[('ACUAN: jantung', fit(refH)), ('HASIL KODE: jantung', fit(heart))], [('ACUAN: gigi', fit(refT)), ('HASIL KODE: gigi', fit(tooth))], [('HASIL KODE: jantung', fit(heart)), ('HASIL KODE: gigi', fit(tooth))]]
pad, cap = 14, 44
rowW = [sum(t[1].width for t in r) + pad * (len(r) + 1) for r in tiles]
W = max(rowW); Hh = len(tiles) * (H + cap + pad) + pad
canvas = Image.new('RGB', (W, Hh), (14, 8, 24)); d = ImageDraw.Draw(canvas)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 28)
except Exception: font = ImageFont.load_default()
y = pad
for r in tiles:
    x = pad
    for name, im in r:
        d.text((x, y + 6), name, fill=(255, 255, 255), font=font); canvas.paste(im, (x, y + cap)); x += im.width + pad
    y += H + cap + pad
canvas.save(f'{out}/perbandingan.png'); print('ok', canvas.size)
