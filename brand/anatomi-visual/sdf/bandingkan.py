# Lembar perbandingan tiga pemeriksaan (siluet, warna tanpa efek, akhir) untuk acuan, v4, dan SDF baru, dengan tinggi organ disamakan.
# Pemakaian: python3 bandingkan.py acuan.jpg v4.png sdf_akhir.png sdf_warna.png sdf_siluet.png keluaran.png
# Siluet acuan dan v4 diturunkan dari gambar (latar gelap dibuang, komponen kecil seperti partikel dan teks dibuang).
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
ref_p, v4_p, fin_p, flat_p, sil_p, out_p = sys.argv[1:7]
TANPA_ACUAN = ref_p == '-'   # tanpa gambar acuan: hanya v4 dan SDF (aman untuk di-commit)
PW, PH, ORG = 600, 820, 680
BG = np.array([240, 240, 235], np.uint8)

def font(s):
    try: return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', s)
    except Exception: return ImageFont.load_default()

def organ_mask(im, thr):
    a = np.array(im.convert('RGB')).astype(int)
    m = a.max(axis=2) >= thr
    m = ndi.binary_closing(m, iterations=4)
    inv = ~m
    lab, n = ndi.label(inv)
    sizes = ndi.sum(inv, lab, range(n + 1))
    border = set(lab[0].tolist()) | set(lab[-1].tolist()) | set(lab[:, 0].tolist()) | set(lab[:, -1].tolist())
    fill = np.zeros(n + 1, bool)
    for i in range(1, n + 1):
        if i not in border and sizes[i] < 5000: fill[i] = True
    m = m | fill[lab]
    lab, n = ndi.label(m)
    sizes = ndi.sum(m, lab, range(n + 1))
    big = np.zeros(n + 1, bool)
    if n: big[1 + int(np.argmax(sizes[1:]))] = True
    return big[lab]

def sil_mask_from_sdf(p):
    return np.array(Image.open(p).convert('L')) < 128

def bbox(m):
    ys, xs = np.where(m); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def place(im_arr, m, fill_bg):
    """im_arr RGB uint8; m mask. Skala agar tinggi organ = ORG, taruh di tengah panel PWxPH."""
    x0, y0, x1, y1 = bbox(m); s = ORG / (y1 - y0)
    im = Image.fromarray(im_arr).resize((int(im_arr.shape[1] * s), int(im_arr.shape[0] * s)), Image.LANCZOS)
    cx, cy = int((x0 + x1) / 2 * s), int((y0 + y1) / 2 * s)
    panel = Image.new('RGB', (PW, PH), tuple(int(v) for v in fill_bg))
    panel.paste(im, (PW // 2 - cx, PH // 2 - cy))
    return panel

def make_sil(m):
    arr = np.full(m.shape + (3,), 255, np.uint8); arr[m] = (20, 18, 26); return arr

def make_flat(arr, m):
    out = np.tile(BG, m.shape + (1,)).astype(np.uint8); out[m] = arr[m]; return out

if not TANPA_ACUAN:
    ref = Image.open(ref_p).convert('RGB'); ref = ref.crop((0, 0, ref.width // 2, ref.height))
v4 = Image.open(v4_p).convert('RGB'); fin = Image.open(fin_p).convert('RGB')
flat = np.array(Image.open(flat_p).convert('RGB'))
m4, ms = organ_mask(v4, 110), sil_mask_from_sdf(sil_p)
mr = organ_mask(ref, 120) if not TANPA_ACUAN else None
v4a, fa = np.array(v4), np.array(fin)
cols = [('v4 (SVG pita)', v4a, m4), ('SDF + pembuluh (baru)', fa, ms)]
if not TANPA_ACUAN: cols.insert(0, ('Acuan (gaya saja)', np.array(ref), mr))
rows = ['1. Siluet polos', '2. Warna tanpa efek (tanpa cahaya, partikel, latar)', '3. Versi akhir']
HEAD, LAB = 24, 44
sheet = Image.new('RGB', (PW * len(cols), HEAD + (PH + LAB) * 3), (24, 24, 28)); d = ImageDraw.Draw(sheet)
for r in range(3):
    y = HEAD + r * (PH + LAB)
    d.text((12, y + 8), rows[r], fill=(240, 240, 240), font=font(22))
    for c, (name, arr, m) in enumerate(cols):
        if r == 0: panel = place(make_sil(m), m, (255, 255, 255))
        elif r == 1: panel = place(flat if c == len(cols) - 1 else make_flat(arr, m), m, BG)
        else: panel = place(arr, m, (24, 24, 28))
        sheet.paste(panel, (c * PW, y + LAB))
        if r == 0: d.text((c * PW + PW - 8 - d.textlength(name, font=font(18)), y + 10), name, fill=(200, 200, 210), font=font(18))
sheet.save(out_p)
print('ok', sheet.size)
