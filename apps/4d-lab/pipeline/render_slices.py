"""QC figure: labelled phantom slices (axial/coronal/sagittal) + CT windows. Offline evidence only."""
import sys, json
from pathlib import Path
import numpy as np
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
sys.path.insert(0, str(Path(__file__).resolve().parent))
from nrrd_io import read_nrrd
d = Path(sys.argv[1]); out = Path(sys.argv[2])
L, A = read_nrrd(d / 'labels.nrrd'); ct, _ = read_nrrd(d / 'ct.nrrd')
meta = json.loads((d / 'anatomy.json').read_text())
cmap = np.zeros((256, 3)); [cmap.__setitem__(l['id'], np.array(l['color']) / 255) for l in meta['labels']]
inv = np.linalg.inv(A)
def k_of(z): return int(round((inv @ [0, 0, z, 1])[2]))
def j_of(y): return int(round((inv @ [0, y, 0, 1])[1]))
def i_of(x): return int(round((inv @ [x, 0, 0, 1])[0]))
fig, ax = plt.subplots(3, 4, figsize=(20, 15), facecolor='k')
for n, z in enumerate([150, 60, -40, -130]):
    ax[0, n].imshow(cmap[L[k_of(z)]], origin='upper'); ax[0, n].set_title(f'axial z={z}', color='w')
for n, (x, title) in enumerate([(0, 'sagittal x=0'), (-60, 'sagittal x=-60 (R)'), (70, 'sagittal x=70 (L)')]):
    ax[1, n].imshow(cmap[L[::-1, :, i_of(x)]], aspect=1); ax[1, n].set_title(title, color='w')
ax[1, 3].imshow(np.clip((ct[::-1, j_of(20), :] + 160) / 400, 0, 1), cmap='gray'); ax[1, 3].set_title('CT coronal y=20 (W400 L40)', color='w')
for n, y in enumerate([-60, -20, 20, 60]):
    ax[2, n].imshow(cmap[L[::-1, j_of(y), :]]); ax[2, n].set_title(f'coronal y={y}', color='w')
for a in ax.ravel(): a.axis('off')
plt.tight_layout(); plt.savefig(out, dpi=60, facecolor='k')
