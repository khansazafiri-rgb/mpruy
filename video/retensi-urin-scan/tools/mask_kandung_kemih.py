"""Penanda kandung kemih dari PIKSEL rekaman asli (bukan digambar): pada CT sintetis (panel kanan) lumen kandung kemih bernilai abu-abu seragam (107 +-1 dari 255)
yang berbeda dari jaringan sekitar. Bingkai skenario "Kandung kemih penuh (retensi urin)" (klip 02, t=3 dtk) dan bingkai tampilan normal setelah tombol
"Bandingkan dengan normal" (t=11,5 dtk) disegmentasi: ambang nilai -> komponen terhubung yang menyentuh titik tengah -> isi lubang -> penutupan ringan.
Panel USG dan CT memakai geometri sama (huruf A/P/R/L dan skala cm bergeser tepat 425 px), jadi penanda USG = penanda CT digeser -425 px.
Keluaran: data/mask_{scen,norm}_{ct,usg}.png (RGBA putih, alfa = area; kanvas = bingkai sumber 1920x1080 dipotong x1075-1920, y290-600) dan data/ukuran.json (luas piksel).
Pemakaian: python3 tools/mask_kandung_kemih.py rekam/frames/02 data   (butuh numpy, pillow, scipy)"""
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
fr, out = sys.argv[1], sys.argv[2]
ld = lambda t: np.asarray(Image.open(f'{fr}/f{int(round(t*30))+1:04d}.jpg').convert('L'), dtype=np.int16)
X0, Y0, X1, Y1 = 1075, 290, 1920, 600
def seg(A, seed):
    sub = np.zeros(A.shape, bool); sub[330:600, 1545:1900] = True
    m = (np.abs(A - 107) <= 1) & sub; m = ndi.binary_closing(m, iterations=2)
    lab, n = ndi.label(m); k = lab[seed[1], seed[0]]; assert k > 0, 'titik awal bukan lumen'
    m = ndi.binary_fill_holes(lab == k); return ndi.binary_opening(m, iterations=2)
def save(msk, name):
    a = np.zeros((Y1 - Y0, X1 - X0, 4), np.uint8); a[..., :3] = 255; a[..., 3] = msk[Y0:Y1, X0:X1] * 255; Image.fromarray(a, 'RGBA').save(f'{out}/{name}')
res = {}
for key, t, seed in (('scen', 3.0, (1707, 505)), ('norm', 11.5, (1709, 512))):
    m = seg(ld(t), seed); ys, xs = np.nonzero(m); res[key] = {'luas_px': int(m.sum()), 'lebar_px': int(xs.max() - xs.min()), 'tinggi_px': int(ys.max() - ys.min()), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]}
    save(m, f'mask_{key}_ct.png'); save(np.roll(m, -425, axis=1), f'mask_{key}_usg.png')
res['rasio_luas'] = round(res['scen']['luas_px'] / res['norm']['luas_px'], 2)
json.dump(res, open(f'{out}/ukuran.json', 'w'), indent=1); print(json.dumps(res))
