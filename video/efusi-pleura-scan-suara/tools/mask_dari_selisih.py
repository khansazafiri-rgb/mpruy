"""Penanda cairan dari SELISIH PIKSEL rekaman asli (bukan digambar): klip 02 menampilkan skenario efusi (0-10,9 dtk) lalu tombol
'Bandingkan dengan normal' (klik 10,93 dtk) mengganti citra ke normal (11,67 dtk). Area CT yang berubah (hitam -> abu-abu) = cairan yang disimulasikan
aplikasi. Selisih bingkai skenario (t=10 dtk) vs normal (t=13 dtk) -> ambang -> penutupan morfologi -> isi lubang -> komponen terbesar.
Panel USG dan CT memakai geometri sama (huruf R/I/S/L dan skala cm bergeser tepat 425 px), jadi penanda USG = penanda CT digeser -425 px.
Keluaran: data/mask_ct.png dan data/mask_usg.png (RGBA, putih; alfa = area), kanvas = bingkai sumber 1920x1080 dipotong x1075-1920, y290-600.
Pemakaian: python3 tools/mask_dari_selisih.py rekam/frames/02 data   (butuh numpy, pillow, scipy)"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
fr, out = sys.argv[1], sys.argv[2]
ld = lambda t: np.asarray(Image.open(f'{fr}/f{int(round(t*30))+1:04d}.jpg').convert('L'), dtype=np.int16)
D = np.abs(ld(10.0) - ld(13.0)); sub = np.zeros_like(D, bool); sub[300:600, 1560:1920] = True
m = ndi.binary_fill_holes(ndi.binary_closing((D > 60) & sub, structure=np.ones((3, 3)), iterations=7))
lab, n = ndi.label(m); k = int(np.argmax(ndi.sum(m, lab, range(1, n + 1)))) + 1; m = ndi.binary_opening(lab == k, iterations=2)
X0, Y0, X1, Y1 = 1075, 290, 1920, 600
def save(msk, name):
    a = np.zeros((Y1 - Y0, X1 - X0, 4), np.uint8); a[..., :3] = 255; a[..., 3] = msk[Y0:Y1, X0:X1] * 255; Image.fromarray(a, 'RGBA').save(f'{out}/{name}')
save(m, 'mask_ct.png'); save(np.roll(m, -425, axis=1), 'mask_usg.png'); print('area px', int(m.sum()))
