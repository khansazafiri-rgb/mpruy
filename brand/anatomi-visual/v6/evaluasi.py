# Evaluasi jantung v6 terhadap acuan: siluet/warna datar/akhir pada kanvas dan tinggi organ yang sama, overlay 50%, ukuran HP, dan angka selisih kontur.
# Pemakaian: python3 evaluasi.py acuan.jpg v4.png sil.png flat.png final.png keluaran_dir [--tanpa-acuan]
# v6 dibuat langsung dalam koordinat acuan (potongan kiri 572x1375; kanvas dievaluasi di y 200..1100), jadi overlay tanpa pergeseran.
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
ref_p, v4_p, sil_p, flat_p, fin_p, outd = sys.argv[1:7]
NOREF = '--tanpa-acuan' in sys.argv
X0, Y0, W, H = 0, 200, 572, 900
F = lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)

def mask_from_dark(im, thr, close=4):
    a = np.array(im.convert('RGB')).astype(int)
    m = a.max(axis=2) >= thr
    m = ndi.binary_closing(m, iterations=close)
    inv = ~m; lab, n = ndi.label(inv); sizes = ndi.sum(inv, lab, range(n + 1))
    border = set(lab[0].tolist()) | set(lab[-1].tolist()) | set(lab[:, 0].tolist()) | set(lab[:, -1].tolist())
    fill = np.zeros(n + 1, bool)
    for i in range(1, n + 1):
        if i not in border and sizes[i] < 5000: fill[i] = True
    m = m | fill[lab]
    lab, n = ndi.label(m); sizes = ndi.sum(m, lab, range(n + 1))
    big = np.zeros(n + 1, bool); big[1 + int(np.argmax(sizes[1:]))] = True
    return big[lab]

def bbox(m):
    ys, xs = np.where(m); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def fit_to(im, m, tgt):
    """Skala/geser gambar (dengan mask m) agar bbox-nya sama tinggi dan terpusat pada bbox tgt, hasil kanvas WxH."""
    x0, y0, x1, y1 = bbox(m); tx0, ty0, tx1, ty1 = tgt
    s = (ty1 - ty0) / (y1 - y0)
    r = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
    cx, cy = (x0 + x1) / 2 * s, (y0 + y1) / 2 * s
    canvas = Image.new('RGB', (W, H), (24, 24, 28))
    canvas.paste(r, (int((tx0 + tx1) / 2 - X0 - cx), int((ty0 + ty1) / 2 - Y0 - cy)))
    return canvas

# v6 (diskala 1x dari render 2x)
down = lambda p: Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS)
sil6, flat6, fin6 = down(sil_p), down(flat_p), down(fin_p)
m6 = (np.array(sil6.convert('L')) < 128)
res = {}
if not NOREF:
    ref = Image.open(ref_p).convert('RGB'); ref = ref.crop((0, 0, ref.width // 2, ref.height))
    mr_full = mask_from_dark(ref, 120)
    mr = mr_full[Y0:Y0 + H, X0:X0 + W]
    refc = ref.crop((X0, Y0, X0 + W, Y0 + H))
    inter = (mr & m6).sum(); uni = (mr | m6).sum()
    res['IoU_total'] = round(float(inter / uni), 3)
    for name, a, b in [('badan_y>=540', 540 - Y0, H), ('pembuluh_y<540', 0, 540 - Y0)]:
        i = (mr[a:b] & m6[a:b]).sum(); u = (mr[a:b] | m6[a:b]).sum(); res['IoU_' + name] = round(float(i / u), 3)
    rows = []
    for y in range(240, 1080, 40):
        yy = y - Y0
        r1 = np.where(mr[yy])[0]; r2 = np.where(m6[yy])[0]
        if len(r1) and len(r2): rows.append((y, int(r1.min()), int(r2.min()), int(r1.max()), int(r2.max())))
    res['tepi_kiri_kanan_(y,acuan_kiri,v6_kiri,acuan_kanan,v6_kanan)'] = rows
    bx = bbox(mr_full); res['bbox_acuan'] = [int(v) for v in bx]; by = bbox(m6) ; res['bbox_v6_(koordinat_kanvas+offset)'] = [int(by[0]), int(by[1] + Y0), int(by[2]), int(by[3] + Y0)]
    # overlay 50%
    ov = Image.blend(fin6, refc, 0.5); ov.save(f'{outd}/overlay-acuan-50.png')
    # selisih siluet: hijau = hanya acuan, merah = hanya v6, putih = sama
    d = np.zeros((H, W, 3), np.uint8) + 30
    d[mr & m6] = (235, 235, 235); d[mr & ~m6] = (60, 200, 90); d[~mr & m6] = (230, 60, 60)
    Image.fromarray(d).save(f'{outd}/selisih-siluet.png')
    json.dump(res, open(f'{outd}/metrik.json', 'w'), indent=1)

# v4: sejajarkan tinggi & posisi dengan bbox organ acuan
v4 = Image.open(v4_p).convert('RGB'); m4 = mask_from_dark(v4, 110)
tgt = bbox(mr_full) if not NOREF else bbox(m6.copy() if False else np.pad(m6, ((Y0, 0), (0, 0))))
v4c = fit_to(v4, m4, tgt)
m4c = np.array(fit_to(Image.fromarray((m4 * 255).astype(np.uint8)).convert('RGB'), m4, tgt).convert('L')) > 128
def sil_img(m): a = np.full(m.shape + (3,), 255, np.uint8); a[m] = (20, 18, 26); return Image.fromarray(a)
def flat_img(im, m): a = np.tile(np.array([240, 240, 235], np.uint8), m.shape + (1,)); a[m] = np.array(im.convert('RGB'))[m]; return Image.fromarray(a)
cols = [('v4 (SVG pita)', sil_img(m4c), flat_img(v4c, m4c), v4c), ('v6 (vektor buatan tangan)', sil6, flat6, fin6)]
if not NOREF:
    cols.insert(0, ('Acuan (gaya saja)', sil_img(mr), flat_img(refc, mr), refc))
rows_t = ['a. Siluet polos', 'b. Warna datar (tanpa cahaya/latar)', 'c. Hasil akhir']
HEAD, LAB = 14, 38
sheet = Image.new('RGB', (W * len(cols), HEAD + (H + LAB) * 3), (24, 24, 28)); d = ImageDraw.Draw(sheet)
for r in range(3):
    y = HEAD + r * (H + LAB)
    d.text((10, y + 7), rows_t[r], fill=(240, 240, 240), font=F(20))
    for c, col in enumerate(cols):
        sheet.paste(col[1 + r], (c * W, y + LAB))
        if r == 0: d.text((c * W + W - 12 - d.textlength(col[0], font=F(17)), y + 9), col[0], fill=(200, 200, 210), font=F(17))
sheet.save(f'{outd}/tiga-pemeriksaan{"-tanpa-acuan" if NOREF else ""}.png')

# ukuran HP: tiap jantung selebar 195 px (setengah lebar layar 390) berdampingan, untuk menilai keterbacaan di layar kecil
ph_w = 195
items = [('v4', v4c), ('v6', fin6)]
if not NOREF: items.insert(0, ('acuan', refc))
pair = Image.new('RGB', (10 + (ph_w + 10) * len(items), int(H * ph_w / W) + 46), (18, 18, 22)); dd = ImageDraw.Draw(pair)
for i, (name, im) in enumerate(items):
    t = im.resize((ph_w, int(H * ph_w / W)), Image.LANCZOS)
    pair.paste(t, (10 + i * (ph_w + 10), 36)); dd.text((10 + i * (ph_w + 10), 10), name, fill=(235, 235, 235), font=F(16))
pair.save(f'{outd}/ukuran-hp{"-tanpa-acuan" if NOREF else ""}.png')
print(json.dumps(res, indent=1) if res else 'ok')
