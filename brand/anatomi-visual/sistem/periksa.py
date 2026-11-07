# Alat pemeriksa Atlas MEDCOEL.
#   python3 periksa.py panel jantung.png gigi.png kulit.png keluaran.png   -> tiga still berdampingan pada ukuran ponsel (390 px lebar, 9:16)
#   python3 periksa.py kontak direktori_bingkai keluaran.png [lebar=360]   -> bingkai awal/tengah/akhir + angka lompatan antar-bingkai
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
F = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)
cmd = sys.argv[1]
if cmd == 'panel':
    ps, out = sys.argv[2:5], sys.argv[5]
    w, h, gap = 390, 693, 24
    S = Image.new('RGB', (w * 3 + gap * 4, h + 70), (18, 18, 22)); d = ImageDraw.Draw(S)
    for i, (p, n) in enumerate(zip(ps, ['Jantung', 'Gigi molar', 'Kulit'])):
        S.paste(Image.open(p).convert('RGB').resize((w, h), Image.LANCZOS), (gap + i * (w + gap), 50)); d.text((gap + i * (w + gap), 14), n, fill=(240, 240, 240), font=F(20))
    S.save(out)
else:
    import glob
    d, out = sys.argv[2], sys.argv[3]
    W = int(sys.argv[4]) if len(sys.argv) > 4 else 360
    fs = sorted(glob.glob(d + '/f*.png')); n = len(fs)
    idx = [0, n // 2, n - 1]
    ims = [Image.open(fs[i]).convert('RGB') for i in idx]
    h = int(ims[0].height * W / ims[0].width)
    S = Image.new('RGB', (W * 3 + 16, h + 36), (18, 18, 22)); dr = ImageDraw.Draw(S)
    for k, (i, im) in enumerate(zip(idx, ims)):
        S.paste(im.resize((W, h), Image.LANCZOS), (k * (W + 8), 36)); dr.text((k * (W + 8) + 4, 8), f'bingkai {i} ({i / 30:.2f} s)', fill=(240, 240, 240), font=F(16))
    S.save(out)
    prev, m = None, []
    for f in fs:
        a = np.array(Image.open(f).convert('L').resize((270, 480))).astype(float)
        if prev is not None: m.append(np.abs(a - prev).mean())
        prev = a
    m = np.array(m); print(f'selisih rata-rata antar-bingkai: median {np.median(m):.2f}, maks {m.max():.2f} pada bingkai {m.argmax() + 1}, rasio maks/median {m.max() / max(np.median(m), 1e-6):.1f}')
