# Pasca-proses tiga pemeriksaan jantung SDF: garis tinta dari peta kedalaman untuk versi warna datar.
# Pemakaian: python3 post-views.py kedalaman.png warna_datar.png siluet.png keluaran.png
import sys
import numpy as np
from PIL import Image
def dil(a, n=1):
    for _ in range(n):
        b = a.copy(); b[1:] |= a[:-1]; b[:-1] |= a[1:]; b[:, 1:] |= a[:, :-1]; b[:, :-1] |= a[:, 1:]; a = b
    return a
dep, flat, sil, out = sys.argv[1:5]
d = np.array(Image.open(dep).convert('RGB')).astype(float)
z = (d[..., 0] + d[..., 1] / 255.0) / 255.0 * 1500.0
m = np.array(Image.open(sil).convert('L')) < 128
gx = np.abs(np.diff(z, axis=1, append=z[:, -1:]))
gy = np.abs(np.diff(z, axis=0, append=z[-1:, :]))
edge = ((gx > 14) | (gy > 14)) & dil(m, 1)
edge = dil(edge, 1)
im = np.array(Image.open(flat).convert('RGB')).astype(float)
ink = np.array([46, 14, 36], float)
im[edge] = ink
Image.fromarray(im.astype(np.uint8)).save(out)
