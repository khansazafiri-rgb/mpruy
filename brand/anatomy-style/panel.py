"""Panel dan pemeriksaan lintas organ (jantung | gigi | kulit).
Pemakaian:  python3 brand/anatomy-style/panel.py            (setelah render.cjs dan frames.cjs --klip)
Keluaran di render/: panel-3-organ.png (bersih), panel-3-organ-label.png, cek-ponsel-360.png, cek-ponsel-390.png, lembar-frame-<organ>.png (kontak 8 frame klip), panel-3-organ-gerak.png (frame yang sama 3 organ)."""
import os, sys
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__)); out = os.path.join(here, 'render')
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 30); fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
except Exception: font = fs = ImageFont.load_default()
ORG = [('jantung', 'JANTUNG'), ('gigi', 'GIGI'), ('kulit', 'KULIT')]
def strip(files, width, path, caps=None, gap=14, cap=44):
    ims = [Image.open(f).convert('RGB') for f in files]; ims = [im.resize((width, round(im.height * width / im.width)), Image.LANCZOS) for im in ims]
    W = sum(i.width for i in ims) + gap * (len(ims) + 1); H = ims[0].height + (cap if caps else 0) + gap * 2
    cv = Image.new('RGB', (W, H), (255, 255, 255)); d = ImageDraw.Draw(cv); x = gap
    for i, im in enumerate(ims):
        if caps: d.text((x, 8), caps[i], fill=(20, 20, 20), font=font)
        cv.paste(im, (x, gap + (cap if caps else 0))); x += im.width + gap
    cv.save(path); print('ok', os.path.basename(path), cv.size)
strip([f'{out}/{o}.png' for o, _ in ORG], 560, f'{out}/panel-3-organ.png', [c for _, c in ORG])
strip([f'{out}/{o}-label.png' for o, _ in ORG], 560, f'{out}/panel-3-organ-label.png', [c + ' + label' for _, c in ORG])
for w in (360, 390): strip([f'{out}/{o}-label.png' for o, _ in ORG], w, f'{out}/cek-ponsel-{w}.png', None, gap=10)
# lembar kontak frame klip + panel frame sama
T = [0.4, 1.0, 1.7, 2.4, 3.1, 3.8, 4.4, 4.9]; fr = lambda o, t: f'{out}/frames/{o}/f{int(round(t * 30)) + 1:04d}.png'
for o, c in ORG:
    if not os.path.exists(fr(o, 1.0)): print('lewati', o); continue
    ims = [Image.open(fr(o, t)).convert('RGB').resize((270, 480), Image.LANCZOS) for t in T]
    sh = Image.new('RGB', (270 * 4 + 50, 480 * 2 + 90), (255, 255, 255)); d = ImageDraw.Draw(sh)
    for i, (im, t) in enumerate(zip(ims, T)): x, y = 10 + (i % 4) * 280, 10 + (i // 4) * 530; sh.paste(im, (x, y + 28)); d.text((x, y), f'{c} t={t:.1f} dtk', fill=(20, 20, 20), font=fs)
    sh.save(f'{out}/lembar-frame-{o}.png'); print('ok lembar', o)
rows = []
for t in (0.5, 1.5, 2.5, 3.5, 4.5):
    if all(os.path.exists(fr(o, t)) for o, _ in ORG): rows.append((t, [Image.open(fr(o, t)).convert('RGB').resize((270, 480), Image.LANCZOS) for o, _ in ORG]))
if rows:
    sh = Image.new('RGB', (3 * 280 + 80, len(rows) * 510 + 20), (255, 255, 255)); d = ImageDraw.Draw(sh)
    for r, (t, ims) in enumerate(rows):
        d.text((10, 10 + r * 510 + 200), f't={t:.1f}', fill=(20, 20, 20), font=font)
        for c, im in enumerate(ims): sh.paste(im, (80 + c * 280, 10 + r * 510))
    sh.save(f'{out}/panel-3-organ-gerak.png'); print('ok panel gerak')

# awal-tengah-akhir lebar 360 px: bingkai pertama, tengah, terakhir (apa adanya, termasuk fade) + versi "isi" (t=0,5 / 2,5 / 4,5)
def tiga(name, files, w=360):
    ims = [Image.open(f).convert('RGB') for f in files]; ims = [im.resize((w, round(im.height * w / im.width)), Image.LANCZOS) for im in ims]
    cv = Image.new('RGB', (w * len(ims) + 10 * (len(ims) + 1), ims[0].height + 20), (255, 255, 255))
    for i, im in enumerate(ims): cv.paste(im, (10 + i * (w + 10), 10))
    cv.save(f'{out}/{name}.png'); print('ok', name, cv.size)
fn = lambda o, i: f'{out}/frames/{o}/f{i:04d}.png'
for o, _ in ORG:
    if not os.path.exists(fn(o, 150)): continue
    tiga(f'awal-tengah-akhir-{o}-360', [fn(o, 1), fn(o, 76), fn(o, 150)])
    tiga(f'awal-tengah-akhir-isi-{o}-360', [fn(o, 16), fn(o, 76), fn(o, 136)])
