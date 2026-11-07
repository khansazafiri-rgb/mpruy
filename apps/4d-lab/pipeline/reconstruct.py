"""CT -> registered surface meshes (skin + optional labelled organs).

Reusable for the bundled synthetic phantom AND for a local CT such as CTACardio:

  python3 pipeline/reconstruct.py /path/ct.nrrd /path/outdir [--labels seg.nrrd] [--threshold -350]

Only numpy, scipy and VTK are required (all bundled with 3D Slicer). Nothing is uploaded.
Exports skin.glb, organs.glb (if labels are supplied), registration.json and qc.json.
The GLB coordinates are glTF metres (+X patient left, +Y superior, +Z anterior); the
exact inverse mapping to LPS millimetres is recorded in registration.json (glbToLPS)
so the browser never has to guess a scale, offset or axis convention.
"""
from pathlib import Path
import argparse, hashlib, json, struct, time, sys
import numpy as np
from scipy import ndimage as ndi

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nrrd_io import read_nrrd  # noqa: E402

GLB_TO_LPS = [1000, 0, 0, 0, 0, 0, -1000, 0, 0, 1000, 0, 0, 0, 0, 0, 1]

# key, labels, triangle budget, smoothing sigma (voxels), display system
ORGAN_GROUPS = [
    ('skeleton', [4, 5, 6, 36], 60000, 0.7, 'musculoskeletal'),
    ('heart', [9, 10, 11, 12, 13], 9000, 0.9, 'cardiovascular'),
    ('aorta', [14], 3500, 0.8, 'cardiovascular'),
    ('vena_cava', [15], 3000, 0.8, 'cardiovascular'),
    ('pulmonary_artery', [16], 1500, 0.8, 'cardiovascular'),
    ('lung_r', [7], 7000, 1.0, 'respiratory'),
    ('lung_l', [8], 7000, 1.0, 'respiratory'),
    ('airway', [40], 1500, 0.7, 'respiratory'),
    ('diaphragm', [31], 3000, 0.9, 'respiratory'),
    ('liver', [17], 6000, 1.0, 'digestive'),
    ('gallbladder', [18], 900, 0.8, 'digestive'),
    ('spleen', [19], 1800, 1.0, 'lymphatic'),
    ('kidneys', [20, 21], 3500, 0.9, 'urinary'),
    ('pancreas', [29], 1500, 0.9, 'digestive'),
    ('esophagus', [37], 900, 0.7, 'digestive'),
    ('stomach', [22, 23, 24], 5000, 0.9, 'digestive'),
    ('small_bowel', [25, 26], 9000, 0.7, 'digestive'),
    ('colon', [27, 28], 7000, 0.8, 'digestive'),
    ('bladder', [30], 1200, 0.9, 'urinary'),
    ('brain', [32], 2500, 1.0, 'nervous'),
]


def _vtk():
    import vtk
    from vtk.util.numpy_support import numpy_to_vtk, vtk_to_numpy
    return vtk, numpy_to_vtk, vtk_to_numpy


def surface_from_mask(mask, affine, target_faces, sigma=0.8, stride=1, iterations=15):
    """Binary mask [k,j,i] -> (points LPS mm, faces). Padding closes cropped faces."""
    vtk, numpy_to_vtk, vtk_to_numpy = _vtk()
    m = mask[::stride, ::stride, ::stride]
    nz = np.argwhere(m)
    if len(nz) == 0:
        raise ValueError('empty mask')
    lo = np.maximum(nz.min(0) - 2, 0); hi = np.minimum(nz.max(0) + 3, m.shape)
    crop = m[lo[0]:hi[0], lo[1]:hi[1], lo[2]:hi[2]]
    field = np.pad(crop.astype(np.float32), 2)
    if sigma > 0:
        field = ndi.gaussian_filter(field, sigma / max(1, stride) ** 0.5)
    img = vtk.vtkImageData(); img.SetDimensions(*field.shape[::-1])
    img.GetPointData().SetScalars(numpy_to_vtk(field.ravel(), deep=True, array_type=vtk.VTK_FLOAT))
    iso = vtk.vtkFlyingEdges3D(); iso.SetInputData(img); iso.SetValue(0, 0.5); iso.ComputeNormalsOff(); iso.Update()
    poly = iso.GetOutput()
    if poly.GetNumberOfPoints() < 4:
        raise ValueError('empty surface')
    clean = vtk.vtkCleanPolyData(); clean.SetInputData(poly); clean.Update()
    smooth = vtk.vtkWindowedSincPolyDataFilter(); smooth.SetInputConnection(clean.GetOutputPort())
    smooth.SetNumberOfIterations(iterations); smooth.SetPassBand(0.08); smooth.BoundarySmoothingOff()
    smooth.FeatureEdgeSmoothingOff(); smooth.NonManifoldSmoothingOn(); smooth.NormalizeCoordinatesOn(); smooth.Update()
    n = smooth.GetOutput().GetNumberOfCells()
    dec = vtk.vtkQuadricDecimation(); dec.SetInputConnection(smooth.GetOutputPort())
    dec.SetTargetReduction(float(max(0.0, 1 - target_faces / max(1, n)))); dec.VolumePreservationOn(); dec.Update()
    nrm = vtk.vtkPolyDataNormals(); nrm.SetInputConnection(dec.GetOutputPort()); nrm.ConsistencyOn(); nrm.AutoOrientNormalsOn()
    nrm.SplittingOff(); nrm.ComputePointNormalsOn(); nrm.Update()
    out = nrm.GetOutput()
    pts = vtk_to_numpy(out.GetPoints().GetData()).astype(np.float64)
    faces = vtk_to_numpy(out.GetPolys().GetData()).reshape(-1, 4)[:, 1:].astype(np.uint32)
    # padded crop index (x=i, y=j, z=k) -> original IJK -> LPS
    ijk = (pts - 2 + lo[::-1]) * stride
    lps = ijk @ affine[:3, :3].T + affine[:3, 3]
    edges = vtk.vtkFeatureEdges(); edges.SetInputData(out); edges.BoundaryEdgesOn(); edges.NonManifoldEdgesOn()
    edges.FeatureEdgesOff(); edges.ManifoldEdgesOff(); edges.Update()
    return lps, faces, int(edges.GetOutput().GetNumberOfCells())


def lps_to_glb(p):
    p = np.asarray(p, dtype=np.float64)
    return np.stack([p[:, 0] / 1000, p[:, 2] / 1000, -p[:, 1] / 1000], axis=1).astype('<f4')


def write_glb(path, meshes):
    """meshes: list of (name, points LPS mm, faces uint32, extras). One node per mesh, no node transforms."""
    payload = b''; views = []; accessors = []; gl_meshes = []; nodes = []
    for idx, (name, pts, faces, extras) in enumerate(meshes):
        g = lps_to_glb(pts); f = np.asarray(faces, '<u4')
        pb, fb = g.tobytes(), f.tobytes()
        views.append({'buffer': 0, 'byteOffset': len(payload), 'byteLength': len(pb), 'target': 34962}); payload += pb
        views.append({'buffer': 0, 'byteOffset': len(payload), 'byteLength': len(fb), 'target': 34963}); payload += fb
        accessors.append({'bufferView': 2 * idx, 'componentType': 5126, 'count': len(g), 'type': 'VEC3',
                          'min': g.min(0).tolist(), 'max': g.max(0).tolist()})
        accessors.append({'bufferView': 2 * idx + 1, 'componentType': 5125, 'count': int(f.size), 'type': 'SCALAR'})
        gl_meshes.append({'name': name, 'primitives': [{'attributes': {'POSITION': 2 * idx}, 'indices': 2 * idx + 1, 'mode': 4}], 'extras': extras})
        nodes.append({'name': name, 'mesh': idx})
    doc = {'asset': {'version': '2.0', 'generator': 'MEDCOEL 4D Lab reconstruct.py'}, 'scene': 0,
           'scenes': [{'nodes': list(range(len(nodes)))}], 'nodes': nodes, 'meshes': gl_meshes,
           'buffers': [{'byteLength': len(payload)}], 'bufferViews': views, 'accessors': accessors}
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * ((-len(js)) % 4); payload += b'\0' * ((-len(payload)) % 4)
    blob = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(payload))
    blob += struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(payload), 0x004E4942) + payload
    Path(path).write_bytes(blob)
    return hashlib.sha256(blob).hexdigest()


def body_mask_from_ct(ct, threshold=-350):
    """Automatic exterior estimate for a real CT. Requires human QC (table, bedding, cropped arms)."""
    mask = ct > threshold
    mask = ndi.binary_opening(mask, iterations=1)
    lab, n = ndi.label(mask)
    if n == 0:
        raise ValueError('No body component; adjust threshold or supply a corrected mask')
    counts = np.bincount(lab.ravel()); counts[0] = 0
    mask = lab == counts.argmax()
    for k in range(mask.shape[0]):
        mask[k] = ndi.binary_fill_holes(mask[k])
    return mask, int(n)


def skin_point(mask, affine, x, z, approach, y_mid=0.0):
    """Cast a ray in voxel space toward the body from a given side; return LPS skin point + outward normal."""
    inv = np.linalg.inv(affine)
    nk, nj, ni = mask.shape
    sp = np.abs(np.diag(affine)[:3])
    if approach == 'anterior':
        i, k = (inv @ [x, 0, z, 1])[[0, 2]]
        col = mask[int(round(k)), :, int(round(i))]
        js = np.nonzero(col)[0]
        if not len(js):
            return None
        idx = np.array([i, js[0], k])
    elif approach == 'posterior':
        i, k = (inv @ [x, 0, z, 1])[[0, 2]]
        col = mask[int(round(k)), :, int(round(i))]
        js = np.nonzero(col)[0]
        if not len(js):
            return None
        idx = np.array([i, js[-1], k])
    else:  # lateral: approach from patient right (-x) or left (+x)
        j, k = (inv @ [0, y_mid, z, 1])[[1, 2]]
        row = mask[int(round(k)), int(round(j)), :]
        i_mid = int(round((inv @ [0, y_mid, z, 1])[0]))
        if not row[i_mid]:
            return None
        step = -1 if approach == 'right' else 1  # walk outward from the midline: skips arms beside the trunk
        i = i_mid
        while 0 <= i + step < len(row) and row[i + step]:
            i += step
        idx = np.array([i, j, k])
    p = (affine @ np.r_[idx, 1])[:3]
    # outward normal from smoothed mask gradient
    k0, j0, i0 = [int(round(c)) for c in idx[::-1]]
    sub = mask[max(k0 - 4, 0):k0 + 5, max(j0 - 4, 0):j0 + 5, max(i0 - 4, 0):i0 + 5].astype(np.float32)
    sm = ndi.gaussian_filter(sub, 1.5)
    gk, gj, gi = np.gradient(sm)
    c = tuple(min(4, v) for v in (k0, j0, i0))
    gvec = -np.array([gi[c], gj[c], gk[c]]) / sp
    n = affine[:3, :3] @ gvec
    n = n / (np.linalg.norm(n) + 1e-9)
    return p, n


def avoid_ribs(labels, affine, mask, site, max_shift=16):
    """Shift an auscultation site cranio-caudally to the nearest intercostal space (no bone within 40 mm)."""
    inv = np.linalg.inv(affine)

    def bone_on_path(p, n):
        for d in np.arange(2, 42, 1.5):
            q = p - n * d
            i, j, k = np.round((inv @ np.r_[q, 1])[:3]).astype(int)
            if 0 <= k < labels.shape[0] and 0 <= j < labels.shape[1] and 0 <= i < labels.shape[2]:
                if labels[k, j, i] in (4, 5, 6):
                    return True
        return False
    for dz in sorted(np.arange(-max_shift, max_shift + 0.1, 2.0), key=abs):
        r = skin_point(mask, affine, site['x'], site['z'] + dz, site['approach'], 0.0)
        if r and not bone_on_path(*r):
            return r, dz
    return skin_point(mask, affine, site['x'], site['z'], site['approach'], 0.0), None


def registration(ct, affine, out, meshes_info, skin_pts, qc, source_name, synthetic):
    shp = ct.shape[::-1]
    idx = [[int((n - 1) * f) for n, f in zip(shp, fr)] for fr in [(a, b, c) for a in (.2, .5, .8) for b in (.3, .5, .7) for c in (.25, .5, .75)]]
    samples = [{'ijk': p, 'value': float(ct[p[2], p[1], p[0]])} for p in idx]
    inv = np.linalg.inv(affine)
    anchors = []
    for index in np.linspace(0, len(skin_pts) - 1, 24, dtype=int):
        q = skin_pts[index]
        anchors.append({'vertex': int(index), 'ijk': (inv @ np.r_[q, 1])[:3].round(4).tolist(), 'lpsMM': np.round(q, 4).tolist()})
    reg = {'schema': 'medcoel.patient.v2', 'source': source_name, 'synthetic': synthetic, 'units': 'glTF metres',
           'glbToLPS': GLB_TO_LPS, 'ijkToLPS': affine.ravel().tolist(), 'sizes': list(shp), 'samples': samples,
           'meshes': meshes_info, 'skinAnchors': anchors, 'qc': qc,
           'limitations': ['Automatic thresholds can include table/bedding: inspect and correct the segmentation.',
                           'Padded acquisition ends are artificial caps, not anatomical skin; excluded from probe contact.',
                           'Only the acquired CT coverage is represented. No anatomy is invented outside it.']}
    (Path(out) / 'registration.json').write_text(json.dumps(reg, indent=1))
    return reg


def touched_faces(mask):
    return {name: bool(np.any(np.take(mask, i, axis=ax))) for name, ax, i in
            [('I-', 2, 0), ('I+', 2, -1), ('J-', 1, 0), ('J+', 1, -1), ('K-', 0, 0), ('K+', 0, -1)]}


def reconstruct_all(ct, labels, affine, out, meta, skin_faces=70000, source_name='MEDCOEL synthetic phantom', synthetic=True):
    t0 = time.perf_counter(); out = Path(out)
    body = (labels > 0) & (labels != 38)
    skin_pts, skin_tris, bad = surface_from_mask(body, affine, skin_faces, sigma=0.9)
    print(f'  skin {len(skin_tris)} tris, {bad} boundary/non-manifold edges ({time.perf_counter()-t0:.1f}s)')
    skin_sha = write_glb(out / 'skin.glb', [('skin', skin_pts, skin_tris, {'labels': 'body', 'system': 'integument'})])
    organs = []
    for key, labs, budget, sigma, system in ORGAN_GROUPS:
        m = np.isin(labels, labs)
        if m.sum() < 30:
            continue
        p, f, _ = surface_from_mask(m, affine, budget, sigma=sigma, iterations=12)
        organs.append((key, p, f, {'labels': labs, 'system': system}))
        print(f'  {key}: {len(f)} tris')
    organ_sha = write_glb(out / 'organs.glb', organs)
    qc = {'reviewRequired': True, 'validatedAnatomy': False, 'synthetic': synthetic, 'skinTriangles': int(len(skin_tris)),
          'skinBoundaryOrNonManifoldEdges': bad, 'touchesAcquisitionFaces': touched_faces(body),
          'organTriangles': {k: int(len(f)) for k, _, f, _ in organs}, 'elapsedSeconds': round(time.perf_counter() - t0, 2)}
    info = [{'file': 'skin.glb', 'sha256': skin_sha, 'meshes': ['skin']},
            {'file': 'organs.glb', 'sha256': organ_sha, 'meshes': [o[0] for o in organs]}]
    registration(ct, affine, out, info, skin_pts, qc, source_name, synthetic)
    # project auscultation sites and landmarks to the skin
    sites = []
    for s in meta.get('auscultation2d', []):
        x = s['x'] if s['approach'] not in ('right', 'left') else 0
        r, dz = avoid_ribs(labels, affine, body, {**s, 'x': x}) if s['focus'] in ('heart', 'lung') else (skin_point(body, affine, s['x'], s['z'], s['approach']), 0)
        if r is None:
            continue
        sites.append({**{k: s[k] for k in ('key', 'name', 'nameId', 'focus', 'approach')}, 'point': np.round(r[0], 2).tolist(),
                      'normal': np.round(r[1], 4).tolist(), 'intercostalShiftMM': dz})
    meta['auscultation'] = sites
    lms = {}
    for k, v in meta.get('landmarks2d', {}).items():
        r = skin_point(body, affine, v['x'], v['z'], 'anterior')
        if r:
            lms[k] = {'point': np.round(r[0], 2).tolist(), 'normal': np.round(r[1], 4).tolist()}
    meta['landmarks'] = lms
    meta['meshes'] = {'skin': 'skin.glb', 'organs': 'organs.glb', 'registration': 'registration.json'}
    return meta


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('ct'); ap.add_argument('outdir')
    ap.add_argument('--labels', help='optional label map NRRD in the same geometry (e.g. a locally produced segmentation)')
    ap.add_argument('--mask', help='optional corrected binary body mask NRRD in the same geometry')
    ap.add_argument('--threshold', type=float, default=-350)
    ap.add_argument('--skin-faces', type=int, default=60000)
    args = ap.parse_args()
    ct, affine = read_nrrd(args.ct)
    out = Path(args.outdir); out.mkdir(parents=True, exist_ok=True)
    if args.mask:
        mask, ma = read_nrrd(args.mask)
        if not np.allclose(ma, affine, atol=1e-3):
            raise SystemExit('mask affine differs from CT')
        body = mask > 0; comps = None
    else:
        body, comps = body_mask_from_ct(ct, args.threshold)
    pts, tris, bad = surface_from_mask(body, affine, args.skin_faces)
    skin_sha = write_glb(out / 'skin.glb', [('skin', pts, tris, {'labels': 'body', 'system': 'integument'})])
    info = [{'file': 'skin.glb', 'sha256': skin_sha, 'meshes': ['skin']}]
    if args.labels:
        labels, la = read_nrrd(args.labels)
        if not np.allclose(la, affine, atol=1e-3) or labels.shape != ct.shape:
            raise SystemExit('label map geometry differs from CT')
        organs = []
        for lab in [int(v) for v in np.unique(labels) if v]:
            p, f, _ = surface_from_mask(labels == lab, affine, 4000)
            organs.append((f'label_{lab}', p, f, {'labels': [lab]}))
        info.append({'file': 'organs.glb', 'sha256': write_glb(out / 'organs.glb', organs), 'meshes': [o[0] for o in organs]})
    qc = {'reviewRequired': True, 'validatedAnatomy': False, 'synthetic': False, 'thresholdHU': args.threshold,
          'correctedMask': bool(args.mask), 'initialComponents': comps, 'skinTriangles': int(len(tris)),
          'skinBoundaryOrNonManifoldEdges': bad, 'touchesAcquisitionFaces': touched_faces(body)}
    reg = registration(ct, affine, out, info, pts, qc, Path(args.ct).name, False)
    print(json.dumps(reg['qc'], indent=1))


if __name__ == '__main__':
    main()
