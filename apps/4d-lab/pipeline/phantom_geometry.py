"""MEDCOEL synthetic adult torso phantom: analytic anatomy definitions.

Everything here is ORIGINAL procedural geometry written for MEDCOEL. No third-party
anatomical model, segmentation or patient image is used. Dimensions are rounded
adult-male textbook magnitudes and are an educational approximation, not a
validated computational phantom.

Coordinate system: patient LPS millimetres (x = patient Left, y = Posterior,
z = Superior). z = 0 is roughly the xiphisternal level.
"""
import numpy as np

# ---------------------------------------------------------------- label table
# id: (key, English, Indonesian, CT HU, acoustic tissue class, system, rgb)
LABELS = {
    0: ('air', 'Air (outside body)', 'Udara', -1000, 'air', 'none', (0, 0, 0)),
    1: ('skin', 'Skin', 'Kulit', 40, 'skin', 'integument', (214, 160, 130)),
    2: ('fat', 'Fat (subcutaneous/visceral)', 'Lemak', -100, 'fat', 'integument', (240, 214, 120)),
    3: ('muscle', 'Skeletal muscle', 'Otot rangka', 50, 'muscle', 'musculoskeletal', (178, 70, 60)),
    4: ('bone', 'Cortical bone', 'Tulang kortikal', 900, 'bone', 'musculoskeletal', (236, 230, 210)),
    5: ('marrow', 'Cancellous bone / marrow', 'Tulang spons / sumsum', 260, 'bone', 'musculoskeletal', (220, 200, 170)),
    6: ('cartilage', 'Costal cartilage', 'Kartilago kosta', 120, 'cartilage', 'musculoskeletal', (190, 220, 230)),
    7: ('lung_r', 'Right lung (aerated)', 'Paru kanan', -850, 'lung', 'respiratory', (240, 150, 170)),
    8: ('lung_l', 'Left lung (aerated)', 'Paru kiri', -850, 'lung', 'respiratory', (240, 160, 180)),
    9: ('myocardium', 'Myocardium', 'Miokardium', 110, 'myocardium', 'cardiovascular', (190, 40, 50)),
    10: ('lv', 'Left ventricular cavity (blood)', 'Rongga ventrikel kiri', 200, 'blood', 'cardiovascular', (230, 60, 60)),
    11: ('rv', 'Right ventricular cavity (blood)', 'Rongga ventrikel kanan', 190, 'blood', 'cardiovascular', (90, 90, 220)),
    12: ('la', 'Left atrial cavity (blood)', 'Rongga atrium kiri', 200, 'blood', 'cardiovascular', (240, 90, 90)),
    13: ('ra', 'Right atrial cavity (blood)', 'Rongga atrium kanan', 185, 'blood', 'cardiovascular', (110, 110, 230)),
    14: ('aorta', 'Aorta (lumen)', 'Aorta', 220, 'blood', 'cardiovascular', (220, 40, 40)),
    15: ('vena_cava', 'Venae cavae / iliac veins (lumen)', 'Vena kava', 170, 'blood', 'cardiovascular', (60, 80, 200)),
    16: ('pulmonary_artery', 'Pulmonary trunk (lumen)', 'Trunkus pulmonalis', 200, 'blood', 'cardiovascular', (110, 80, 210)),
    17: ('liver', 'Liver', 'Hati', 105, 'liver', 'digestive', (150, 60, 45)),
    18: ('gallbladder', 'Gallbladder (bile)', 'Kandung empedu', 10, 'fluid', 'digestive', (80, 160, 70)),
    19: ('spleen', 'Spleen', 'Limpa', 115, 'spleen', 'lymphatic', (130, 50, 90)),
    20: ('kidney', 'Kidney (parenchyma)', 'Ginjal', 160, 'kidney', 'urinary', (170, 80, 70)),
    21: ('renal_sinus', 'Renal sinus fat', 'Lemak sinus renal', -80, 'sinus_fat', 'urinary', (250, 230, 150)),
    22: ('stomach_wall', 'Stomach wall', 'Dinding lambung', 70, 'gi_wall', 'digestive', (220, 130, 120)),
    23: ('stomach_content', 'Gastric fluid content', 'Isi cairan lambung', 12, 'gi_fluid', 'digestive', (120, 170, 200)),
    24: ('gas', 'Intraluminal gas', 'Gas lumen', -980, 'gas', 'digestive', (30, 30, 30)),
    25: ('bowel_wall', 'Small bowel / duodenal wall', 'Dinding usus halus', 70, 'gi_wall', 'digestive', (230, 160, 140)),
    26: ('bowel_content', 'Small bowel content', 'Isi usus halus', 20, 'gi_fluid', 'digestive', (150, 190, 200)),
    27: ('colon_wall', 'Colon wall', 'Dinding kolon', 60, 'gi_wall', 'digestive', (200, 140, 110)),
    28: ('colon_content', 'Colonic stool', 'Isi kolon (feses)', -20, 'stool', 'digestive', (140, 110, 80)),
    29: ('pancreas', 'Pancreas', 'Pankreas', 90, 'pancreas', 'digestive', (230, 190, 120)),
    30: ('bladder', 'Urinary bladder (urine)', 'Kandung kemih', 8, 'fluid', 'urinary', (230, 220, 90)),
    31: ('diaphragm', 'Diaphragm', 'Diafragma', 55, 'muscle', 'respiratory', (200, 90, 80)),
    32: ('brain', 'Brain', 'Otak', 35, 'brain', 'nervous', (230, 200, 200)),
    33: ('csf', 'Cerebrospinal fluid', 'Cairan serebrospinal', 6, 'fluid', 'nervous', (160, 200, 240)),
    34: ('eye', 'Globe (vitreous)', 'Bola mata', 10, 'fluid', 'nervous', (200, 220, 240)),
    35: ('cord', 'Spinal cord', 'Medula spinalis', 35, 'brain', 'nervous', (240, 230, 200)),
    36: ('disc', 'Intervertebral disc', 'Diskus intervertebralis', 85, 'cartilage', 'musculoskeletal', (160, 200, 220)),
    37: ('esophagus', 'Oesophagus', 'Esofagus', 55, 'gi_wall', 'digestive', (220, 140, 130)),
    38: ('table', 'CT table (not anatomy)', 'Meja CT (bukan anatomi)', 150, 'plastic', 'none', (90, 90, 90)),
    39: ('pleural_fluid', 'Pleural fluid (pathology layer)', 'Cairan pleura', 12, 'fluid', 'respiratory', (90, 170, 255)),
    40: ('airway', 'Trachea / main bronchi (air)', 'Trakea / bronkus', -990, 'gas', 'respiratory', (60, 60, 60)),
    41: ('atelectasis', 'Compressed (atelectatic) lung (pathology layer)', 'Paru kolaps', 40, 'atelectasis', 'respiratory', (200, 100, 120)),
}


# ------------------------------------------------------------- body surface
# Trunk cross-section key frames: z, half width, anterior depth, posterior depth, centre y, superellipse exponent
TRUNK = np.array([
    [-400, 140, 82, 100, 18, 2.3],
    [-345, 168, 96, 122, 14, 2.5],
    [-300, 172, 100, 120, 8, 2.6],
    [-245, 168, 104, 106, 4, 2.6],
    [-190, 158, 112, 94, 0, 2.5],
    [-140, 147, 117, 92, -2, 2.4],
    [-80, 148, 112, 94, -2, 2.5],
    [-10, 156, 108, 100, -2, 2.6],
    [70, 166, 110, 106, 0, 2.8],
    [140, 174, 102, 108, 4, 3.0],
    [180, 170, 84, 100, 12, 3.1],
    [205, 132, 64, 84, 18, 2.8],
    [228, 78, 52, 64, 16, 2.3],
    [245, 62, 50, 56, 14, 2.1],
], dtype=np.float64)


def trunk_profile(z):
    z = np.asarray(z, dtype=np.float64)
    cols = [np.interp(z, TRUNK[:, 0], TRUNK[:, c]) for c in range(1, 6)]
    return cols  # a, bf, bb, yc, n


# Spine: vertebral-body centre y as function of z (kyphosis / lordosis)
SPINE = np.array([[-330, 85], [-270, 70], [-200, 42], [-130, 32], [-60, 40], [20, 52], [100, 58], [180, 46], [240, 30], [300, 22]], dtype=np.float64)
SPINE_R = np.array([[-330, 20], [-200, 25], [-60, 23], [100, 18], [200, 15], [300, 13]], dtype=np.float64)


def spine_y(z):
    return np.interp(z, SPINE[:, 0], SPINE[:, 1])


def spine_r(z):
    return np.interp(z, SPINE_R[:, 0], SPINE_R[:, 1])


def diaphragm_z(x, y):
    """Diaphragm dome height (mm) at reference end-expiration. Right dome higher."""
    zr = 22 - 62 * ((x + 62) / 100) ** 2 - 40 * ((y - 5) / 105) ** 2
    zl = 2 - 62 * ((x - 62) / 100) ** 2 - 40 * ((y - 5) / 105) ** 2
    zc = -2 - 30 * (x / 70) ** 2 - 30 * ((y + 10) / 90) ** 2
    z = np.maximum(np.maximum(zr, zl), zc)
    # posterior costophrenic recesses lie lower than anterior ones
    return np.maximum(z, -95 + 0 * x) - 18 * np.clip(y / 110, 0, 1)


# ---------------------------------------------------------------- heart model
HEART = {
    'base': np.array([5.0, 18.0, 82.0]),
    'apex': np.array([88.0, -58.0, 22.0]),
    'lv_cavity': {'a': 46.0, 'b': 24.0},  # half-length, radius at end-diastole
    'lv_wall': 10.0,
    'rv_offset': np.array([-24.0, -30.0, 6.0]),
    'rv_cavity': {'a': 44.0, 'b': 22.0, 'c': 30.0},
    'la': {'c': np.array([16.0, 46.0, 92.0]), 'r': np.array([32.0, 20.0, 22.0])},
    'ra': {'c': np.array([-36.0, 10.0, 66.0]), 'r': np.array([26.0, 28.0, 34.0])},
}


def heart_frame():
    b, a = HEART['base'], HEART['apex']
    e = (a - b) / np.linalg.norm(a - b)
    ref = np.array([0.0, 0.0, 1.0])
    u = ref - e * (ref @ e)
    u /= np.linalg.norm(u)
    v = np.cross(e, u)
    centre = b + e * (HEART['lv_cavity']['a'] * 0.95)
    return centre, e, u, v


# ---------------------------------------------------------------- GI tracts
STOMACH = np.array([[52, 32, -18], [70, 8, -45], [70, -22, -78], [52, -50, -105], [22, -66, -122], [-6, -60, -118], [-28, -44, -104]], dtype=float)
STOMACH_R = np.array([44, 44, 40, 34, 26, 18, 11], dtype=float)
DUODENUM = np.array([[-28, -44, -104], [-48, -26, -110], [-56, 4, -140], [-44, 16, -170], [-8, 14, -176], [22, 6, -160], [34, -4, -146]], dtype=float)
COLON = np.array([[-92, -18, -285], [-100, 10, -230], [-102, 20, -170], [-92, -12, -132], [-60, -56, -150], [0, -72, -172], [62, -58, -150], [98, 4, -120], [104, 26, -170], [100, 22, -240], [86, 0, -296], [40, -18, -318], [8, 40, -320], [0, 66, -350], [0, 70, -392]], dtype=float)
COLON_R = np.full(len(COLON), 22.0)
COLON_R[:3] = 27


def small_bowel_path():
    pts = []
    zs = [-190, -214, -238, -262, -284]
    for row, z in enumerate(zs):
        xs = np.linspace(-62, 62, 9)
        if row % 2:
            xs = xs[::-1]
        for n, x in enumerate(xs):
            y = -38 + 22 * np.sin(n * 1.3 + row)
            pts.append([x, y, z + 6 * np.cos(n * 1.7)])
    return np.array(pts, dtype=float)


# ---------------------------------------------------------- auscultation sites
# (key, English, Indonesian, x, z, approach direction, sound focus)
AUSCULTATION = [
    ('aortic', 'Aortic area (2nd right ICS, parasternal)', 'Area aorta (SIC II kanan parasternal)', -30, 134, 'anterior', 'heart'),
    ('pulmonic', 'Pulmonic area (2nd left ICS, parasternal)', 'Area pulmonal (SIC II kiri parasternal)', 30, 134, 'anterior', 'heart'),
    ('erb', "Erb's point (3rd left ICS)", 'Titik Erb (SIC III kiri)', 32, 108, 'anterior', 'heart'),
    ('tricuspid', 'Tricuspid area (4th-5th left ICS, LLSB)', 'Area trikuspid (SIC IV-V kiri parasternal)', 26, 72, 'anterior', 'heart'),
    ('mitral', 'Mitral area / apex (5th left ICS, MCL)', 'Area mitral / apeks (SIC V kiri, LMC)', 86, 40, 'anterior', 'heart'),
    ('lung_ant_r', 'Right anterior upper lung field', 'Lapang paru kanan atas depan', -62, 150, 'anterior', 'lung'),
    ('lung_ant_l', 'Left anterior upper lung field', 'Lapang paru kiri atas depan', 62, 150, 'anterior', 'lung'),
    ('lung_lat_r', 'Right lateral base (mid-axillary line)', 'Basal paru kanan lateral (LMA)', -1, -10, 'right', 'lung'),
    ('lung_lat_l', 'Left lateral base (mid-axillary line)', 'Basal paru kiri lateral (LMA)', 1, -25, 'left', 'lung'),
    ('lung_post_r', 'Right posterior base', 'Basal paru kanan belakang', -70, -20, 'posterior', 'lung'),
    ('lung_post_l', 'Left posterior base', 'Basal paru kiri belakang', 70, -35, 'posterior', 'lung'),
    ('abd_ruq', 'Right upper quadrant', 'Kuadran kanan atas', -70, -75, 'anterior', 'bowel'),
    ('abd_luq', 'Left upper quadrant', 'Kuadran kiri atas', 70, -75, 'anterior', 'bowel'),
    ('abd_rlq', 'Right lower quadrant', 'Kuadran kanan bawah', -70, -225, 'anterior', 'bowel'),
    ('abd_llq', 'Left lower quadrant', 'Kuadran kiri bawah', 70, -225, 'anterior', 'bowel'),
]

LANDMARKS = {
    'sternal_notch': (0, 190), 'sternal_angle': (0, 148), 'xiphoid': (0, 4), 'umbilicus': (0, -150),
    'pubic_symphysis': (0, -340),
}
