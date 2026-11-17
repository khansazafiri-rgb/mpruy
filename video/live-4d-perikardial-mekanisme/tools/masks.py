import numpy as np
from PIL import Image
from scipy import ndimage as ndi
def fluid_mask(path):
    a = np.array(Image.open(path).convert('L')).astype(np.int16)
    sector = np.zeros(a.shape, bool); sector[200:760, 150:860] = True
    cand = (a >= 84) & (a <= 108) & sector
    heart = ndi.binary_closing(a > 140, structure=np.ones((5, 5)), iterations=2)
    hl, hn = ndi.label(heart); hs = ndi.sum(heart, hl, range(1, hn + 1))
    # jantung = komponen terang terbesar yang bukan hati (hati abu 160 seragam di kiri, jantung berisi >200)
    bright = ndi.binary_closing(a > 190, structure=np.ones((5, 5)), iterations=3)
    bl, bn = ndi.label(bright); bs = ndi.sum(bright, bl, range(1, bn + 1))
    cents = ndi.center_of_mass(bright, bl, range(1, bn + 1))
    ok = [i for i in range(bn) if bs[i] > 4000 and cents[i][0] > 380 and 430 < cents[i][1] < 760]
    if not ok: return np.zeros(a.shape, bool)
    core = bl == (1 + max(ok, key=lambda i: bs[i]))
    near = ndi.binary_dilation(core, structure=np.ones((3, 3)), iterations=40)
    dens = ndi.uniform_filter(cand.astype(float), size=9)
    cand = (dens > 0.30) & near & ~ndi.binary_erosion(core, iterations=2) & ~(a > 140)
    cand = ndi.binary_opening(cand, structure=np.ones((3, 3)), iterations=2)
    lab, n = ndi.label(cand)
    if n == 0: return cand
    sizes = ndi.sum(cand, lab, range(1, n + 1)); m = np.isin(lab, [i + 1 for i, z in enumerate(sizes) if z > 350])
    m = ndi.binary_dilation(m, structure=np.ones((3, 3)), iterations=2)
    m = ndi.binary_closing(m, structure=np.ones((3, 3)), iterations=3)
    return m
if __name__ == '__main__':
    """Buat topeng 'lapisan cairan' (abu-abu ±95 di sekitar jantung pada citra CT sintetis) untuk tiap bingkai klip 04.
    Dipakai: python3 tools/masks.py <folder bingkai klip 04 (f####.jpg)> <keluaran data/masks>. Topeng = PNG putih beralpha, dipotong ke jendela (150,150)-(860,760)."""
    import sys, os, glob
    src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
    for p in sorted(glob.glob(os.path.join(src, 'f*.jpg'))):
        m = fluid_mask(p)[150:760, 150:860]
        rgba = np.zeros(m.shape + (4,), np.uint8); rgba[..., :3] = 255; rgba[..., 3] = m * 255
        Image.fromarray(rgba).save(os.path.join(out, os.path.basename(p)[:-4] + '.png'), optimize=True)
    print('ok', len(glob.glob(os.path.join(out, '*.png'))))
