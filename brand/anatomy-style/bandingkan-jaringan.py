"""Perbandingan jaringan sekitar akar: v6 | revisi baru (v7) | acuan gaya, pada LEBAR MAHKOTA SAMA (640 px) dan puncak mahkota y=235.
Pemakaian: python3 brand/anatomy-style/bandingkan-jaringan.py <gambar-acuan.jpg>
Keluaran di render/ (memuat gambar acuan -> tidak di-commit): jaringan-3-panel.png, jaringan-crop-akar.png, jaringan-360.png"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); out = os.path.join(here, 'render')
ref = Image.open(sys.argv[1]).convert('RGB'); w, h = ref.size; refT = ref.crop((w // 2 + 2, 0, w, h))
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 28)
except Exception: font = ImageFont.load_default()
s = 640 / 410            # lebar mahkota acuan terukur 410 px -> 640 px
acuan = Image.new('RGB', (1080, 1920), (14, 8, 24)); r2 = refT.resize((round(refT.width * s), round(refT.height * s)), Image.LANCZOS)
acuan.paste(r2, (round(540 - 288 * s), round(235 - 306 * s)))
v6, baru = Image.open(f'{out}/v6/gigi.png').convert('RGB'), Image.open(f'{out}/gigi.png').convert('RGB')
items = [('v6', v6), ('REVISI BARU', baru), ('ACUAN GAYA (lebar mahkota sama)', acuan)]
def strip(box, scale, path, gap=16, cap=44):
    ims = [(n, im.crop(box)) for n, im in items]; ims = [(n, im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)) for n, im in ims]
    W = sum(i.width for _, i in ims) + gap * 4; H = ims[0][1].height + cap + gap
    cv = Image.new('RGB', (W, H), (255, 255, 255)); d = ImageDraw.Draw(cv); x = gap
    for n, im in ims: d.text((x, 8), n, fill=(20, 20, 20), font=font); cv.paste(im, (x, cap)); x += im.width + gap
    cv.save(path); print('ok', os.path.basename(path), cv.size)
strip((0, 150, 1080, 1700), 0.6, f'{out}/jaringan-3-panel.png')
strip((150, 760, 930, 1540), 1.0, f'{out}/jaringan-crop-akar.png')
strip((0, 0, 1080, 1920), 1 / 3, f'{out}/jaringan-360.png', gap=10, cap=40)
baru.resize((360, 640), Image.LANCZOS).save(f'{out}/gigi-final-360.png')
