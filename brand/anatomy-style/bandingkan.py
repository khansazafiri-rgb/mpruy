"""Preview perbandingan: acuan | hasil sebelumnya (v1) | hasil revisi (v2), untuk jantung (baris 1) dan gigi (baris 2).
Pemakaian: python3 brand/anatomy-style/bandingkan.py <gambar-acuan.jpg>   -> render/perbandingan.png
Acuan = satu gambar berisi jantung (kiri) dan gigi (kanan); hanya dipakai untuk perbandingan visual, tidak menjadi bagian hasil."""
import sys, os
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); out = os.path.join(here, 'render')
ref = Image.open(sys.argv[1]).convert('RGB'); w, h = ref.size
refH, refT = ref.crop((0, 0, w // 2 - 2, h)), ref.crop((w // 2 + 2, 0, w, h))
L = lambda n: Image.open(n).convert('RGB')
H = 900
def fit(im): return im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
rows = [[('ACUAN (jantung)', fit(refH)), ('HASIL SEBELUMNYA (v1)', fit(L(f'{out}/v1/jantung.png'))), ('HASIL REVISI (v2)', fit(L(f'{out}/jantung.png')))],
        [('ACUAN (gigi)', fit(refT)), ('HASIL SEBELUMNYA (v1)', fit(L(f'{out}/v1/gigi.png'))), ('HASIL REVISI (v2)', fit(L(f'{out}/gigi.png')))]]
pad, cap = 14, 44
W = max(sum(t[1].width for t in r) + pad * (len(r) + 1) for r in rows); Hh = len(rows) * (H + cap + pad) + pad
canvas = Image.new('RGB', (W, Hh), (14, 8, 24)); d = ImageDraw.Draw(canvas)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
except Exception: font = ImageFont.load_default()
y = pad
for r in rows:
    x = pad
    for name, im in r:
        d.text((x, y + 8), name, fill=(255, 255, 255), font=font); canvas.paste(im, (x, y + cap)); x += im.width + pad
    y += H + cap + pad
canvas.save(f'{out}/perbandingan.png'); print('ok', canvas.size)
