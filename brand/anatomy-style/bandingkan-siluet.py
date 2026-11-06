"""Perbandingan SILUET (gigi + gusi + massa tulang) dengan LEBAR MAHKOTA SAMA (640 px) dan POSISI PUNCAK MAHKOTA SAMA (y=235).
Panel mentah dibuat oleh siluet-banding.cjs (render/siluet-{ref,v5,baru}.png). Skrip ini menyusunnya:
  render/siluet-1-acuan-vs-baru.png   acuan (ditelusuri tangan dari gambar AI) | hasil baru
  render/siluet-2-v5-vs-baru.png      v5 | hasil baru
Garis: puncak mahkota (abu), leher/CEJ (merah), kubah furkasi (hijau), ujung akar (biru) = garis tiap gambar sendiri; garis oranye titik-titik = leher, furkasi, ujung akar ACUAN sebagai pembanding."""
import os
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); out = os.path.join(here, 'render')
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 30)
except Exception: font = ImageFont.load_default()
def panel(names, title, path):
    ims = [Image.open(f'{out}/siluet-{n}.png').convert('RGB').crop((0, 130, 1080, 1800)) for n, _ in names]
    W = sum(i.width for i in ims) + 20 * (len(ims) + 1); H = ims[0].height + 70
    cv = Image.new('RGB', (W, H), (255, 255, 255)); d = ImageDraw.Draw(cv); x = 20
    for (n, cap), im in zip(names, ims):
        d.text((x, 16), cap, fill=(20, 20, 20), font=font); cv.paste(im, (x, 62)); d.rectangle([x, 62, x + im.width - 1, 62 + im.height - 1], outline=(180, 180, 180)); x += im.width + 20
    cv.save(path); print('ok', os.path.basename(path), cv.size)
panel([('ref', 'ACUAN (siluet ditelusuri dari gambar AI)'), ('baru', 'HASIL BARU')], '', f'{out}/siluet-1-acuan-vs-baru.png')
panel([('v5', 'v5'), ('baru', 'HASIL BARU')], '', f'{out}/siluet-2-v5-vs-baru.png')
