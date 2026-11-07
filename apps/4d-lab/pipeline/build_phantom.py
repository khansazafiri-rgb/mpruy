"""Build the MEDCOEL synthetic labelled CT phantom (original procedural data).

Outputs (default public/data/phantom):
  ct.nrrd        int16 HU, gzip, LPS, 2.5 mm isotropic
  labels.nrrd    uint8 tissue labels on exactly the same grid
  anatomy.json   label table, heart/GI/respiratory model parameters, landmarks
Then runs reconstruct.py to export skin/organ GLB meshes + registration.json.

Usage: python3 pipeline/build_phantom.py [--spacing 2.5] [--out public/data/phantom]
Requires numpy, scipy, vtk (and runs fully offline).
"""
from pathlib import Path
import argparse, json, time, sys
import numpy as np
from scipy import ndimage as ndi

sys.path.insert(0, str(Path(__file__).resolve().parent))
import phantom_geometry as G  # noqa: E402
from nrrd_io import write_nrrd  # noqa: E402

EXTENT = {'x': (-320.0, 320.0), 'y': (-150.0, 160.0), 'z': (-480.0, 500.0)}


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1 - h) + a * h - k * h * (1 - h)


class Grid:
    def __init__(self, spacing):
        self.s = spacing
        self.X = np.arange(EXTENT['x'][0], EXTENT['x'][1] + 1e-6, spacing, dtype=np.float32)
        self.Y = np.arange(EXTENT['y'][0], EXTENT['y'][1] + 1e-6, spacing, dtype=np.float32)
        self.Z = np.arange(EXTENT['z'][0], EXTENT['z'][1] + 1e-6, spacing, dtype=np.float32)
        self.shape = (len(self.Z), len(self.Y), len(self.X))  # k, j, i

    def box(self, lo, hi):
        """Return (slices, x, y, z broadcast coordinate arrays) for an LPS bounding box."""
        def rng(A, a, b):
            i0 = int(np.clip(np.searchsorted(A, a) - 1, 0, len(A)))
            i1 = int(np.clip(np.searchsorted(A, b) + 1, 0, len(A)))
            return slice(i0, i1)
        si, sj, sk = rng(self.X, lo[0], hi[0]), rng(self.Y, lo[1], hi[1]), rng(self.Z, lo[2], hi[2])
        x = self.X[si][None, None, :]
        y = self.Y[sj][None, :, None]
        z = self.Z[sk][:, None, None]
        return (sk, sj, si), x, y, z


# ------------------------------------------------------------ SDF primitives
def d_ellipsoid(x, y, z, c, r):
    q = np.sqrt(((x - c[0]) / r[0]) ** 2 + ((y - c[1]) / r[1]) ** 2 + ((z - c[2]) / r[2]) ** 2)
    return (q - 1.0) * min(r)


def d_capsule(x, y, z, a, b, ra, rb):
    a = np.asarray(a, float); b = np.asarray(b, float)
    ab = b - a
    L2 = ab @ ab
    t = np.clip(((x - a[0]) * ab[0] + (y - a[1]) * ab[1] + (z - a[2]) * ab[2]) / L2, 0, 1)
    px, py, pz = a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]
    return np.sqrt((x - px) ** 2 + (y - py) ** 2 + (z - pz) ** 2) - (ra + (rb - ra) * t)


def d_polyline(x, y, z, pts, radii):
    """Distance to a tapered tube along a polyline. Also returns arc-length parameter."""
    best = None; arc = None; total = 0.0
    for n in range(len(pts) - 1):
        a, b = pts[n], pts[n + 1]
        ab = b - a; L = float(np.linalg.norm(ab))
        t = np.clip(((x - a[0]) * ab[0] + (y - a[1]) * ab[1] + (z - a[2]) * ab[2]) / (L * L), 0, 1)
        d = np.sqrt((x - a[0] - t * ab[0]) ** 2 + (y - a[1] - t * ab[1]) ** 2 + (z - a[2] - t * ab[2]) ** 2) - (radii[n] + (radii[n + 1] - radii[n]) * t)
        s = total + t * L
        if best is None:
            best, arc = d, s
        else:
            m = d < best
            best = np.where(m, d, best); arc = np.where(m, s, arc)
        total += L
    return best, arc, total


def bbox_poly(pts, r):
    pts = np.asarray(pts); r = float(np.max(r)) + 6
    return pts.min(0) - r, pts.max(0) + r


def bbox_caps(a, b, r):
    a = np.asarray(a, float); b = np.asarray(b, float)
    return np.minimum(a, b) - r - 6, np.maximum(a, b) + r + 6


# --------------------------------------------------------------- the builder
def build(spacing=2.5):
    t0 = time.perf_counter()
    g = Grid(spacing)
    nk, nj, ni = g.shape
    print(f'grid {ni}x{nj}x{nk} = {ni*nj*nk/1e6:.1f} M voxels at {spacing} mm')
    BIG = np.float32(1e4)

    # -------- trunk (superellipse sections) ------------------------------
    trunk = np.full(g.shape, BIG, np.float32)
    sl, x, y, z = g.box((-200, -150, -420), (200, 160, 255))
    a, bf, bb, yc, n = G.trunk_profile(z)
    yy = y - yc
    b = np.where(yy < 0, bf, bb)
    F = (np.abs(x) / a) ** n + (np.abs(yy) / b) ** n
    d = (F ** (1.0 / n) - 1.0) * np.minimum(a, b)
    d = np.where(z > 250, BIG, d)
    trunk[sl] = d.astype(np.float32)

    body = trunk.copy()

    def union(d_fn, lo, hi, k):
        sl, x, y, z = g.box(lo, hi)
        body[sl] = smin(body[sl], d_fn(x, y, z).astype(np.float32), k)

    def subtract(d_fn, lo, hi, k=2.0):
        sl, x, y, z = g.box(lo, hi)
        body[sl] = -smin(-body[sl], d_fn(x, y, z).astype(np.float32), k)

    # chest/back/buttock relief
    for sx in (-1, 1):
        union(lambda x, y, z: d_ellipsoid(x, y, z, (sx * 72, -96, 100), (78, 26, 56)), (sx * 72 - 90, -130, 30), (sx * 72 + 90, -60, 170), 22)
        union(lambda x, y, z: d_ellipsoid(x, y, z, (sx * 94, -116, 70), (6, 5, 6)), (sx * 94 - 12, -128, 60), (sx * 94 + 12, -104, 82), 3)  # nipple
        union(lambda x, y, z: d_ellipsoid(x, y, z, (sx * 88, 98, 118), (62, 24, 78)), (sx * 88 - 80, 60, 30), (sx * 88 + 80, 135, 210), 20)  # scapular
        union(lambda x, y, z: d_ellipsoid(x, y, z, (sx * 78, 108, -318), (84, 48, 78)), (sx * 78 - 100, 50, -410), (sx * 78 + 100, 160, -230), 26)  # gluteal
        union(lambda x, y, z: d_ellipsoid(x, y, z, (sx * 70, 0, 222), (62, 40, 22)), (sx * 70 - 80, -50, 195), (sx * 70 + 80, 50, 250), 20)  # trapezius slope
        # shoulders, arms, hands (slight abduction, palms down on table)
        sh, el, wr, ha = (sx * 188, 18, 172), (sx * 252, 34, -100), (sx * 262, 36, -350), (sx * 262, 36, -425)
        union(lambda x, y, z: d_ellipsoid(x, y, z, (sx * 176, 14, 168), (58, 54, 50)), (sx * 176 - 70, -50, 110), (sx * 176 + 70, 80, 230), 24)
        union(lambda x, y, z: d_capsule(x, y, z, sh, el, 48, 38), *bbox_caps(sh, el, 50), 16)
        union(lambda x, y, z: d_capsule(x, y, z, el, wr, 39, 26), *bbox_caps(el, wr, 40), 12)
        union(lambda x, y, z: d_ellipsoid(x, y, z, ha, (22, 16, 62)), (ha[0] - 30, 0, -500), (ha[0] + 30, 70, -340), 10)
        union(lambda x, y, z: d_ellipsoid(x, y, z, (ha[0] - sx * 18, 30, -385), (10, 12, 26)), (ha[0] - sx * 18 - 15, 10, -420), (ha[0] - sx * 18 + 15, 50, -350), 8)  # thumb
        # thighs
        union(lambda x, y, z: d_capsule(x, y, z, (sx * 92, 12, -330), (sx * 104, 18, -520), 94, 74), (sx * 92 - 110, -100, -530), (sx * 92 + 110, 120, -300), 30)
        # ear
        union(lambda x, y, z: d_ellipsoid(x, y, z, (sx * 78, 18, 382), (9, 17, 30)), (sx * 78 - 14, -5, 345), (sx * 78 + 14, 40, 420), 6)
    # neck, head, face
    union(lambda x, y, z: d_capsule(x, y, z, (0, 16, 215), (0, 12, 322), 57, 54), (-70, -50, 200), (70, 80, 340), 20)
    union(lambda x, y, z: d_ellipsoid(x, y, z, (0, 6, 398), (76, 97, 108)), (-85, -100, 285), (85, 110, 500), 12)
    union(lambda x, y, z: d_ellipsoid(x, y, z, (0, -40, 330), (52, 50, 38)), (-60, -95, 285), (60, 20, 375), 22)  # jaw
    union(lambda x, y, z: d_ellipsoid(x, y, z, (0, -74, 312), (22, 16, 15)), (-30, -95, 295), (30, -55, 330), 8)  # chin
    union(lambda x, y, z: d_ellipsoid(x, y, z, (0, -98, 376), (10, 14, 22)), (-15, -115, 350), (15, -80, 402), 5)  # nose
    union(lambda x, y, z: d_ellipsoid(x, y, z, (0, -82, 414), (52, 18, 16)), (-60, -105, 395), (60, -60, 435), 8)  # brow
    union(lambda x, y, z: d_ellipsoid(x, y, z, (0, -82, 345), (20, 9, 6)), (-25, -95, 336), (25, -70, 354), 3)  # lips
    for sx in (-1, 1):
        subtract(lambda x, y, z: d_ellipsoid(x, y, z, (sx * 32, -96, 396), (15, 10, 9)), (sx * 32 - 20, -110, 385), (sx * 32 + 20, -80, 408), 4)  # orbit hollow
        union(lambda x, y, z: d_ellipsoid(x, y, z, (sx * 46, -62, 366), (24, 20, 26)), (sx * 46 - 30, -90, 335), (sx * 46 + 30, -35, 395), 10)  # cheek
    subtract(lambda x, y, z: d_ellipsoid(x, y, z, (0, -122, -150), (8, 9, 8)), (-12, -135, -160), (12, -105, -140), 3)  # umbilicus
    print(f'  surface field {time.perf_counter()-t0:.1f}s')

    inside = body < 0
    # keep the largest component only (removes tiny numeric islands)
    lab, nlab = ndi.label(inside)
    if nlab > 1:
        counts = np.bincount(lab.ravel()); counts[0] = 0
        inside = lab == counts.argmax()
    del lab
    depth = ndi.distance_transform_edt(inside, sampling=spacing).astype(np.float32)
    trunk_in = (trunk < 0) & inside
    trunk_depth = ndi.distance_transform_edt(trunk_in, sampling=spacing).astype(np.float32)
    print(f'  distance transforms {time.perf_counter()-t0:.1f}s')

    L = np.zeros(g.shape, np.uint8)
    X = g.X[None, None, :]; Y = g.Y[None, :, None]; Z = g.Z[:, None, None]

    # subcutaneous fat thickness: thicker on anterior abdomen and buttocks, thin on head/limbs
    ant = np.clip(-Y / 110.0, 0, 1)
    fat_t = 11 + 15 * np.exp(-((Z + 170) / 95) ** 2) * ant + 10 * np.exp(-((Z + 310) / 60) ** 2) * np.clip(Y / 100, 0, 1)
    fat_t = np.where(Z > 255, 4.0, fat_t)
    fat_t = np.where(np.abs(X) > 185, 7.0, fat_t)
    L[inside] = 3
    L[inside & (depth <= fat_t + spacing)] = 2
    L[inside & (depth <= spacing * 1.01)] = 1

    # ----------------------------------------------- cavities ------------------
    ysp = G.spine_y(Z)
    axs = np.abs(X)
    post_lim = ysp + 42 * np.clip((axs - 22) / 30, 0, 1) - 18 * (1 - np.clip((axs - 22) / 30, 0, 1))
    wall = 2.5 + fat_t + np.where(Z > 0, 20.0, 13.0)
    cavity = trunk_in & (trunk_depth > wall) & (Y < post_lim) & (Z > -330) & (Z < 205)
    zd = G.diaphragm_z(X, Y).astype(np.float32)
    thorax = cavity & (Z > zd)
    abdomen = cavity & (Z <= zd - 6)
    L[cavity] = 2  # mediastinal / visceral fat by default
    L[cavity & (Z <= zd) & (Z > zd - 6)] = 31  # diaphragm sheet

    # ----------------------------------------------- heart & vessels -----------
    centre, e, u, v = G.heart_frame()
    H = G.HEART
    def heart_coords(x, y, z):
        dx, dy, dz = x - centre[0], y - centre[1], z - centre[2]
        s = dx * e[0] + dy * e[1] + dz * e[2]
        p = dx * u[0] + dy * u[1] + dz * u[2]
        q = dx * v[0] + dy * v[1] + dz * v[2]
        return s, p, q
    sl, x, y, z = g.box(centre - 110, centre + 110)
    s, p, q = heart_coords(x, y, z)
    ac, bc, wt = H['lv_cavity']['a'], H['lv_cavity']['b'], H['lv_wall']
    lv_cav = (s / ac) ** 2 + (p / bc) ** 2 + (q / bc) ** 2 < 1
    lv_out = (s / (ac + wt + 2)) ** 2 + (p / (bc + wt)) ** 2 + (q / (bc + wt)) ** 2 < 1
    base_cut = s > -ac * 0.95  # truncate at mitral/aortic annulus plane
    lv_cav &= base_cut; lv_out &= (s > -ac * 0.95 - 4)
    ro = H['rv_offset']
    rs, rp, rq = heart_coords(x - ro[0], y - ro[1], z - ro[2])
    rv_cav = ((rs / H['rv_cavity']['a']) ** 2 + (rp / H['rv_cavity']['c']) ** 2 + (rq / H['rv_cavity']['b']) ** 2 < 1) & ~lv_out
    rv_out = ((rs / (H['rv_cavity']['a'] + 4)) ** 2 + (rp / (H['rv_cavity']['c'] + 4)) ** 2 + (rq / (H['rv_cavity']['b'] + 4)) ** 2 < 1)
    la_c, la_r = H['la']['c'], H['la']['r']
    la_cav = d_ellipsoid(x, y, z, la_c, la_r) < 0
    la_out = d_ellipsoid(x, y, z, la_c, la_r + 3) < 0
    ra_c, ra_r = H['ra']['c'], H['ra']['r']
    ra_cav = d_ellipsoid(x, y, z, ra_c, ra_r) < 0
    ra_out = d_ellipsoid(x, y, z, ra_c, ra_r + 3) < 0
    heart_out = lv_out | rv_out | la_out | ra_out
    sub = L[sl]
    sub[heart_out] = 9
    sub[ra_cav & ~lv_out] = 13
    sub[la_cav & ~lv_out] = 12
    sub[rv_cav] = 11
    sub[lv_cav] = 10
    heart_mask_box = heart_out.copy()
    L[sl] = sub

    vessels = [
        # aorta: root -> ascending -> arch -> descending -> bifurcation
        (14, [[8, 4, 86], [0, -8, 120], [-2, -4, 150], [8, 18, 170], [24, 40, 162], [26, 50, 130], [24, 52, 40], [18, 44, -60], [12, 36, -175]], [14, 15, 15, 14, 13, 12, 11, 10, 9]),
        (14, [[12, 36, -175], [52, 40, -250], [80, 22, -320]], [7, 6, 6]),
        (14, [[12, 36, -175], [-30, 40, -250], [-74, 22, -320]], [7, 6, 6]),
        (16, [[18, -36, 92], [22, -18, 126], [26, 6, 140]], [14, 14, 12]),
        (16, [[26, 6, 140], [-35, 22, 138]], [9, 8]),
        (16, [[26, 6, 140], [70, 26, 132]], [9, 8]),
        (15, [[-30, 8, 170], [-32, 8, 92]], [10, 10]),  # SVC
        (15, [[-32, 18, 40], [-30, 26, -40], [-26, 30, -120], [-18, 38, -190], [-50, 48, -255], [-82, 28, -320]], [12, 13, 12, 11, 8, 7]),  # IVC
        (15, [[-18, 38, -190], [44, 48, -255], [86, 28, -320]], [8, 8, 7]),
    ]
    for lab_id, pts, rr in vessels:
        pts = np.array(pts, float)
        sl, x, y, z = g.box(*bbox_poly(pts, rr))
        dd, _, _ = d_polyline(x, y, z, pts, rr)
        sub = L[sl]; sub[(dd < 0) & (sub != 0) & (sub != 1)] = lab_id; L[sl] = sub

    # ----------------------------------------------- airway, oesophagus -------
    for lab_id, pts, rr in [
        (40, [[0, -34, 300], [0, -20, 240], [0, 0, 180], [0, 14, 132]], [9, 9, 9, 8]),
        (40, [[0, 14, 132], [-46, 22, 112]], [7, 6]), (40, [[0, 14, 132], [44, 24, 108]], [7, 6]),
        (37, [[0, -12, 300], [2, 20, 200], [10, 34, 80], [26, 36, 10], [48, 30, -18]], [8, 8, 8, 8, 8]),
    ]:
        pts = np.array(pts, float)
        sl, x, y, z = g.box(*bbox_poly(pts, rr))
        dd, _, _ = d_polyline(x, y, z, pts, rr)
        sub = L[sl]; sub[(dd < 0) & (sub >= 2)] = lab_id; L[sl] = sub

    # ----------------------------------------------- lungs ---------------------
    medi = np.zeros(g.shape, bool)
    sl, x, y, z = g.box((-60, -150, 60), (60, 160, 210))
    medi[sl] = (np.abs(x - 4) < 26 + 0 * y) & (z > 92 + 0 * y) & (y < 70)
    sl2, x, y, z = g.box(centre - 120, centre + 120)
    big_heart = np.zeros(L[sl2].shape, bool)
    s, p, q = heart_coords(x, y, z)
    big_heart |= (s / (ac + wt + 10)) ** 2 + (p / (bc + wt + 8)) ** 2 + (q / (bc + wt + 8)) ** 2 < 1
    for c, r in [(la_c, la_r + 8), (ra_c, ra_r + 7)]:
        big_heart |= d_ellipsoid(x, y, z, c, r) < 0
    rs, rp, rq = heart_coords(x - ro[0], y - ro[1], z - ro[2])
    big_heart |= (rs / (H['rv_cavity']['a'] + 10)) ** 2 + (rp / (H['rv_cavity']['c'] + 9)) ** 2 + (rq / (H['rv_cavity']['b'] + 9)) ** 2 < 1
    medi[sl2] |= big_heart
    lung_space = thorax & ~medi & (L == 2)
    L[lung_space & (X < 0)] = 7
    L[lung_space & (X >= 0)] = 8

    # ----------------------------------------------- skeleton ------------------
    # ribs: in the deepest band of the chest wall
    rad = np.sqrt(X ** 2 + (Y + 0.0) ** 2) + 1e-3
    pp = Y / rad
    srib = Z - 34 * pp
    band = ((srib + 400) % 27.0) < 10.5
    rib_shell = trunk_in & (trunk_depth > wall - 13) & (trunk_depth <= wall - 1) & (Y < post_lim + 22)
    rib_range = (srib > -78) & (srib < 182)
    costal = (pp < -0.15) & (Z < -0.78 * axs + 18)
    floating = (srib < -30) & (pp < 0.15)
    ribs = rib_shell & band & rib_range & ~costal & ~floating & (L != 7) & (L != 8)
    cart = ribs & (pp < -0.72) & (axs < 78)
    L[ribs] = 4
    L[cart] = 6
    # sternum
    sl, x, y, z = g.box((-30, -150, 0), (30, -40, 196))
    stern = (np.abs(x) < np.where(z > 142, 26, 15)) & (z > 2) & (z < 192)
    td = trunk_depth[sl]
    ww = np.broadcast_to(wall, L.shape)[sl]
    stern = stern & (td > ww - 14) & (td <= ww - 1) & (y < -40)
    sub = L[sl]; sub[stern] = 5; L[sl] = sub

    # spine: vertebral bodies, discs, canal, cord, posterior elements
    sl, x, y, z = g.box((-80, -20, -340), (80, 160, 330))
    yb, rb = G.spine_y(z), G.spine_r(z)
    pitch = np.where(z > 220, 18.0, np.where(z > -40, 24.0, 32.0))
    disc = ((z + 1000) % pitch) < 4.5
    body_v = (x ** 2 + ((y - yb) * 1.12) ** 2 < rb ** 2) & (z < 315) & (z > -300)
    canal_y = yb + rb + 9
    canal = x ** 2 + (y - canal_y) ** 2 < 10.5 ** 2
    cord = x ** 2 + (y - canal_y) ** 2 < 6.0 ** 2
    seg = ((z + 1000) % pitch) > pitch * 0.35
    lamina = (x ** 2 + (y - canal_y) ** 2 < 15 ** 2) & ~canal & seg
    spinous = (np.abs(x) < 4.5) & (y > canal_y + 10) & (y < canal_y + 38) & seg
    transverse = (np.abs(x) < rb + 22) & (np.abs(y - (yb + rb + 4)) < 5) & seg & (z > -230) & (z < 210)
    sub = L[sl]
    m = sub > 0
    sub[(lamina | spinous | transverse) & m & (sub != 7) & (sub != 8)] = 4
    sub[body_v & m] = 5
    sub[body_v & m & disc] = 36
    sub[canal & m & (z < 315) & (z > -300)] = 33
    sub[cord & m & (z < 315) & (z > -150)] = 35
    L[sl] = sub

    # pelvis, sacrum, femurs
    for sx in (-1, 1):
        sl, x, y, z = g.box((sx * 70 - 80, -60, -360), (sx * 70 + 80, 120, -170))
        d_in = d_ellipsoid(x, y, z, (sx * 62, 40, -236), (58, 52, 62))
        wing = (d_in > -8) & (d_in < 0) & (sx * x > 48) & (y > -10) & (y < 78) & (z > -292)
        sub = L[sl]; sub[wing & (sub >= 2)] = 4; L[sl] = sub
        for pts, rr, lab in [
            ([[sx * 96, 0, -334], [sx * 96, 0, -334]], [26, 26], 5),          # femoral head
            ([[sx * 96, 0, -334], [sx * 132, 10, -352]], [15, 18], 5),         # neck
            ([[sx * 128, 12, -352], [sx * 112, 18, -520]], [15, 13], 4),       # shaft
            ([[sx * 96, -4, -320], [sx * 14, -60, -346]], [9, 8], 4),          # superior pubic ramus
            ([[sx * 90, 20, -340], [sx * 60, 30, -380], [sx * 16, -40, -360]], [11, 10, 8], 4),  # ischium / inferior ramus
        ]:
            pts = np.array(pts, float); pts[1] += 1e-3
            sl, x, y, z = g.box(*bbox_poly(pts, rr))
            dd, _, _ = d_polyline(x, y, z, pts, rr)
            sub = L[sl]; sub[(dd < 0) & (sub >= 2)] = lab
            if lab == 4 and rr[0] >= 15:
                sub[(dd < -6) & (sub == 4)] = 5
            L[sl] = sub
    sl, x, y, z = g.box((-60, 40, -340), (60, 130, -220))
    sac = (np.abs(x) < 48 - 0.35 * (-230 - z)) & (np.abs(y - (78 + 0.35 * (-230 - z))) < 14) & (z < -225)
    sub = L[sl]; sub[sac & (sub >= 2)] = 5; L[sl] = sub

    # shoulder girdle & upper limbs
    for sx in (-1, 1):
        for pts, rr, lab in [
            ([[sx * 22, -86, 188], [sx * 80, -84, 196], [sx * 160, -20, 196]], [8, 7, 7], 4),  # clavicle
            ([[sx * 180, 16, 170], [sx * 180, 16, 170.01]], [24, 24], 5),                      # humeral head
            ([[sx * 186, 20, 160], [sx * 250, 34, -96]], [12, 10], 4),                         # humerus
            ([[sx * 250, 30, -104], [sx * 252, 24, -345]], [8, 7], 4),                         # radius
            ([[sx * 256, 46, -104], [sx * 270, 46, -345]], [8, 6], 4),                         # ulna
        ]:
            pts = np.array(pts, float)
            sl, x, y, z = g.box(*bbox_poly(pts, rr))
            dd, _, _ = d_polyline(x, y, z, pts, rr)
            sub = L[sl]; sub[(dd < 0) & (sub >= 2) & (sub != 7) & (sub != 8)] = lab
            if rr[0] >= 10:
                sub[(dd < -5) & (sub == 4)] = 5
            L[sl] = sub
        sl, x, y, z = g.box((sx * 95 - 70, 70, 30), (sx * 95 + 70, 140, 210))
        scap = (np.abs(d_ellipsoid(x, y, z, (sx * 96, 100, 128), (56, 9, 76))) < 4) & (np.abs(y - (100 + 0.0 * x)) < 6)
        scap &= (z < 128 + 76 - np.abs(x - sx * 96) * 0.6)
        sub = L[sl]; sub[scap & (sub >= 2) & (sub != 7) & (sub != 8)] = 4; L[sl] = sub

    # skull, brain, eyes
    sl, x, y, z = g.box((-90, -110, 300), (90, 115, 500))
    head_o = d_ellipsoid(x, y, z, (0, 10, 400), (70, 90, 100))
    skull = (head_o < 0) & (head_o > -7) & (z > 330)
    brain = (head_o <= -9) & (z > 335)
    csf = (head_o <= -7) & (head_o > -9) & (z > 333)
    sub = L[sl]
    sub[skull & (sub >= 2)] = 4
    sub[csf & (sub >= 2)] = 33
    sub[brain & (sub >= 2)] = 32
    for sx in (-1, 1):
        eye = d_ellipsoid(x, y, z, (sx * 32, -80, 396), (12, 12, 12)) < 0
        sub[eye & (sub >= 2)] = 34
    L[sl] = sub

    # ----------------------------------------------- abdominal organs ---------
    def paint(d_fn, lo, hi, lab, allow=(2, 3, 31)):
        sl, x, y, z = g.box(lo, hi)
        sub = L[sl]
        dd = d_fn(x, y, z)
        m = (dd < 0) & np.isin(sub, allow)
        sub[m] = lab; L[sl] = sub
        return sl, dd

    ab = abdomen

    # liver: large right lobe + left lobe, under the right dome, inferior edge sloping
    def liver_d(x, y, z):
        d1 = d_ellipsoid(x, y, z, (-62, -2, -42), (98, 92, 80))
        d2 = d_ellipsoid(x, y, z, (18, -52, -40), (60, 34, 32))
        d = smin(d1, d2, 18)
        lower = z - (-150 + 0.55 * (x + 120))  # inferior edge rises toward the left
        return np.maximum(d, -lower)
    sl, x, y, z = g.box((-170, -120, -170), (90, 110, 30))
    sub = L[sl]; m = (liver_d(x, y, z) < 0) & ab[sl] & np.isin(sub, (2,))
    sub[m] = 17; L[sl] = sub
    # gallbladder in the inferior hepatic surface
    paint(lambda x, y, z: d_capsule(x, y, z, (-48, -58, -118), (-60, -36, -78), 17, 12), (-90, -90, -145), (-20, -10, -60), 18, allow=(2, 17))
    # spleen
    paint(lambda x, y, z: d_ellipsoid(x, y, z, (112, 66, -58), (30, 46, 56)), (70, 10, -120), (150, 120, 5), 19, allow=(2, 31))
    # kidneys (with sinus fat)
    for sx, zc in ((-1, -132), (1, -112)):
        c = (sx * 76, 72, zc)
        paint(lambda x, y, z: d_ellipsoid(x, y, z, c, (28, 22, 56)), (sx * 76 - 40, 40, zc - 70), (sx * 76 + 40, 105, zc + 70), 20, allow=(2, 3, 31))
        cs = (sx * 66, 66, zc)
        paint(lambda x, y, z: d_ellipsoid(x, y, z, cs, (11, 9, 30)), (sx * 66 - 20, 50, zc - 40), (sx * 66 + 20, 85, zc + 40), 21, allow=(20,))
    # pancreas
    pts = np.array([[-40, 2, -136], [0, 8, -120], [40, 18, -104], [86, 44, -88]], float)
    paint(lambda x, y, z: d_polyline(x, y, z, pts, [16, 13, 11, 10])[0], *bbox_poly(pts, 16), 29, allow=(2,))
    # psoas muscles
    for sx in (-1, 1):
        pts = np.array([[sx * 30, 52, -90], [sx * 46, 44, -200], [sx * 68, 26, -300]], float)
        paint(lambda x, y, z: d_polyline(x, y, z, pts, [14, 22, 20])[0], *bbox_poly(pts, 22), 3, allow=(2,))

    # GI tubes: wall + content (+ dependent/non-dependent gas)
    def tube(pts, radii, wall_lab, content_lab, wall_t, allow=(2, 31)):
        lo, hi = bbox_poly(pts, radii)
        sl, x, y, z = g.box(lo, hi)
        dd, arc, total = d_polyline(x, y, z, pts, radii)
        sub = L[sl]
        ok = np.isin(sub, allow)
        sub[(dd < 0) & ok] = wall_lab
        lumen = (dd < -wall_t) & ok
        sub[lumen] = content_lab
        L[sl] = sub
        return sl, dd, arc, total

    sb = G.small_bowel_path()
    tube(sb, np.full(len(sb), 13.0), 25, 26, 3.0)
    tube(G.COLON, G.COLON_R, 27, 28, 3.0)
    tube(G.DUODENUM, np.array([12, 13, 13, 13, 12, 12, 11.0]), 25, 26, 3.0, allow=(2, 31, 27, 28))
    sl, dd, arc, total = tube(G.STOMACH, G.STOMACH_R, 22, 23, 5.0, allow=(2, 31, 25, 26, 27, 28))
    # gastric gas bubble: anterior-most part of the fundus/body lumen (supine)
    sub = L[sl]
    sl_b, xb, yb_, zb = g.box(*bbox_poly(G.STOMACH, G.STOMACH_R))
    gas = (sub == 23) & (arc < total * 0.45) & (yb_ < np.interp(arc, [0, total * 0.45], [-6, -36]))
    sub[gas] = 24
    L[sl] = sub
    # colonic gas pockets (anterior parts of transverse colon)
    sl, x, y, z = g.box((-90, -110, -200), (90, -30, -120))
    sub = L[sl]; sub[(sub == 28) & (y < -76)] = 24; L[sl] = sub
    # urinary bladder
    paint(lambda x, y, z: d_ellipsoid(x, y, z, (0, -34, -312), (48, 38, 36)), (-60, -80, -355), (60, 10, -270), 3, allow=(2, 25, 26, 27, 28))
    paint(lambda x, y, z: d_ellipsoid(x, y, z, (0, -34, -312), (44, 34, 32)), (-60, -80, -355), (60, 10, -270), 30, allow=(3,))
    # rectus abdominis already in muscle layer; restore diaphragm under the heart
    print(f'  labels {time.perf_counter()-t0:.1f}s')

    # ----------------------------------------------- CT table (not anatomy) ---
    sl, x, y, z = g.box((-240, 128, -480), (240, 160, 500))
    shell = (np.abs(x) < 230) & (y > 140) & (y < 156)
    shell_core = (np.abs(x) < 226) & (y > 143) & (y < 153)
    sub = L[sl]
    sub[shell & ~shell_core & (sub == 0)] = 38
    L[sl] = sub

    # ----------------------------------------------- HU volume ---------------
    hu_table = np.zeros(256, np.float32) - 1000
    for k, row in G.LABELS.items():
        hu_table[k] = row[3]
    ct = hu_table[L]
    # table foam core
    sl, x, y, z = g.box((-240, 128, -480), (240, 160, 500))
    core = np.broadcast_to((np.abs(x) < 226) & (y > 143) & (y < 153), ct[sl].shape)
    sub = ct[sl]; sub[core] = -900; ct[sl] = sub
    # partial-volume smoothing (CT point spread), then quantise
    ct = ndi.gaussian_filter(ct, 0.55).round().clip(-1024, 3071).astype(np.int16)
    print(f'  ct {time.perf_counter()-t0:.1f}s')
    return g, L, ct, (centre, e, u, v)


def anatomy_json(g, L, frame):
    centre, e, u, v = frame
    H = G.HEART
    counts = np.bincount(L.ravel(), minlength=256)
    vox_ml = (g.s ** 3) / 1000.0
    labels = []
    for k, (key, en, idn, hu, ac, system, rgb) in G.LABELS.items():
        labels.append({'id': k, 'key': key, 'name': en, 'nameId': idn, 'hu': hu, 'acoustic': ac, 'system': system,
                       'color': list(rgb), 'volumeMl': round(float(counts[k] * vox_ml), 1)})
    sb = G.small_bowel_path()
    return {
        'schema': 'medcoel.anatomy.v1',
        'synthetic': True,
        'source': 'MEDCOEL original procedural phantom (pipeline/build_phantom.py). Not patient data. Not a validated anatomical model.',
        'coordinateSystem': 'LPS millimetres (x=patient left, y=posterior, z=superior)',
        'labels': labels,
        'heart': {
            'base': H['base'].tolist(), 'apex': H['apex'].tolist(), 'lvCentre': centre.tolist(),
            'axis': e.tolist(), 'u': u.tolist(), 'v': v.tolist(),
            'lvCavity': H['lv_cavity'], 'lvWall': H['lv_wall'],
            'rvCentre': (centre + H['rv_offset']).tolist(), 'rvCavity': H['rv_cavity'],
            'la': {'c': H['la']['c'].tolist(), 'r': H['la']['r'].tolist()},
            'ra': {'c': H['ra']['c'].tolist(), 'r': H['ra']['r'].tolist()},
            'lvEdvMl': round(float(counts[10] * vox_ml), 1),
        },
        'respiration': {
            'domeRight': [-62, 5, 22], 'domeLeft': [62, 5, 2], 'lungApexZ': 200,
            'thoraxZ': [-110, 205], 'abdomenFloorZ': -330,
        },
        'gi': {
            'stomach': {'centerline': G.STOMACH.tolist(), 'radii': G.STOMACH_R.tolist()},
            'duodenum': {'centerline': G.DUODENUM.tolist()},
            'smallBowel': {'centerline': sb.tolist()},
            'colon': {'centerline': G.COLON.tolist()},
        },
        'pleura': {'right': {'labels': [7]}, 'left': {'labels': [8]}},
        'landmarks2d': {k: {'x': v[0], 'z': v[1]} for k, v in G.LANDMARKS.items()},
        'auscultation2d': [{'key': a[0], 'name': a[1], 'nameId': a[2], 'x': a[3], 'z': a[4], 'approach': a[5], 'focus': a[6]} for a in G.AUSCULTATION],
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--spacing', type=float, default=2.5)
    ap.add_argument('--out', default=str(Path(__file__).resolve().parents[1] / 'public' / 'data' / 'phantom'))
    ap.add_argument('--no-mesh', action='store_true')
    args = ap.parse_args()
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    g, L, ct, frame = build(args.spacing)
    affine = np.diag([g.s, g.s, g.s, 1.0]); affine[:3, 3] = [g.X[0], g.Y[0], g.Z[0]]
    write_nrrd(out / 'ct.nrrd', ct, affine, comment='MEDCOEL synthetic phantom CT (original procedural data, not a patient)')
    write_nrrd(out / 'labels.nrrd', L, affine, comment='MEDCOEL synthetic phantom tissue labels; see anatomy.json')
    meta = anatomy_json(g, L, frame)
    if not args.no_mesh:
        from reconstruct import reconstruct_all
        meta = reconstruct_all(ct, L, affine, out, meta)
    (out / 'anatomy.json').write_text(json.dumps(meta, indent=1))
    print('done', out)


if __name__ == '__main__':
    main()
