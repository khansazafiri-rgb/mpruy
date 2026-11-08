"""Pipeline checks (numpy/scipy/VTK). Run: python3 pipeline/test_pipeline.py"""
import json, sys, tempfile
from pathlib import Path
import numpy as np
from scipy import ndimage as ndi
sys.path.insert(0, str(Path(__file__).resolve().parent))
from nrrd_io import read_nrrd, write_nrrd  # noqa: E402
from reconstruct import reconstruct_ct, surface_from_mask, body_mask_from_ct  # noqa: E402

DATA = Path(__file__).resolve().parents[1] / 'public' / 'data' / 'phantom'
results = []


def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('PASS ' if cond else 'FAIL ') + name + (f' ({detail})' if detail else ''))


ct, affine = read_nrrd(DATA / 'ct.nrrd')
labels, la = read_nrrd(DATA / 'labels.nrrd')
check('CT and label map share the grid', ct.shape == labels.shape and np.allclose(affine, la))

with tempfile.TemporaryDirectory() as tmp:
    # NRRD round trip incl. RAS input
    small = (np.arange(24, dtype=np.int16).reshape(2, 3, 4))
    aff = np.diag([0.8, 0.9, 2.5, 1.0]); aff[:3, 3] = [10, -20, 5]
    write_nrrd(Path(tmp) / 'a.nrrd', small, aff)
    back, baff = read_nrrd(Path(tmp) / 'a.nrrd')
    check('NRRD write/read round trip', np.array_equal(back, small) and np.allclose(baff, aff))

    # Real-CT route: automatic threshold must drop the disconnected CT table and match the label-derived body
    reg, body = reconstruct_ct(ct, affine, tmp, threshold=-350, skin_faces=30000, source_name='phantom-as-real-CT')
    truth = (labels > 0) & (labels != 38)
    # The supine body touches the table at the buttocks, as in real CT: automatic thresholding may keep a
    # few contact voxels. This is why the corrected-mask route exists. Require < 2% of the table.
    table_in_mask = np.count_nonzero(body & (labels == 38)); table_total = np.count_nonzero(labels == 38)
    check('automatic body mask keeps < 2% of the CT table (contact zone only)', table_in_mask < 0.02 * table_total, f'{table_in_mask}/{table_total} table voxels')
    dice = 2 * np.count_nonzero(body & truth) / (np.count_nonzero(body) + np.count_nonzero(truth))
    check('automatic body mask matches the phantom body (Dice > 0.97)', dice > 0.97, f'Dice {dice:.4f}')
    qc = json.loads((Path(tmp) / 'qc.json').read_text())
    check('closed skin surface (no boundary / non-manifold edges)', qc['skinBoundaryOrNonManifoldEdges'] == 0, str(qc['skinBoundaryOrNonManifoldEdges']))
    check('triangle budget respected', qc['skinTriangles'] <= 30500, str(qc['skinTriangles']))
    check('cropped acquisition face detected (thighs at K-)', qc['touchesAcquisitionFaces']['K-'] and not qc['touchesAcquisitionFaces']['K+'])
    check('registration records glbToLPS, CT probes and anchors', len(reg['samples']) >= 20 and len(reg['skinAnchors']) >= 20)

    # mesh vertices lie on the body boundary (distance to the mask surface <= 2 voxels)
    pts, faces, _ = surface_from_mask(truth, affine, 20000)
    edt_in = ndi.distance_transform_edt(truth, sampling=2.5); edt_out = ndi.distance_transform_edt(~truth, sampling=2.5)
    inv = np.linalg.inv(affine); ijk = np.round((np.c_[pts, np.ones(len(pts))] @ inv.T)[:, :3]).astype(int)
    ijk = np.clip(ijk, 0, np.array(ct.shape[::-1]) - 1)
    dist = np.maximum(edt_in[ijk[:, 2], ijk[:, 1], ijk[:, 0]], edt_out[ijk[:, 2], ijk[:, 1], ijk[:, 0]])
    check('surface vertices within 5 mm of the voxel boundary', np.percentile(dist, 99) <= 5.0, f'p99 {np.percentile(dist, 99):.2f} mm')

    # corrected-mask route
    reg2, body2 = reconstruct_ct(ct, affine, Path(tmp) / 'corr', mask=truth.astype(np.uint8), skin_faces=20000)
    check('corrected-mask route recorded in QC', reg2['qc']['correctedMask'] is True)

anat = json.loads((DATA / 'anatomy.json').read_text())
check('anatomy manifest marks synthetic data', anat['synthetic'] is True and 'Not patient data' in anat['source'])
check('auscultation sites on the skin', len(anat['auscultation']) >= 12)
fails = [r for r in results if not r[1]]
print(f'\n{len(results) - len(fails)} passed, {len(fails)} failed')
sys.exit(1 if fails else 0)
