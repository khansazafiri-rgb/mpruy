// Axis-first probe/plane control: the learner chooses WHAT to change, then one gesture changes only that.
// Pure functions (no DOM, no three.js) so the geometry is unit-tested. Coordinates: patient LPS mm.

/** Movement modes shown in the mode bar. Each changes exactly one quantity. */
export const CONTROL_MODES = {
  place: { short: 'Tempatkan', label: 'Tempatkan', hint: 'Klik kulit untuk meletakkan probe; seret probe untuk menggesernya di permukaan.', key: 'P' },
  vertical: { short: 'Sup–Inf', label: 'Superior–Inferior', axis: [0, 0, 1], plus: 'Superior', minus: 'Inferior', hint: 'Seret searah panah biru (atau scroll) untuk menggeser ke kepala/kaki pasien.', key: '1' },
  horizontal: { short: 'Kanan–Kiri', label: 'Kanan–Kiri pasien', axis: [1, 0, 0], plus: 'Kiri pasien', minus: 'Kanan pasien', hint: 'Seret searah panah merah untuk menggeser ke kiri/kanan PASIEN (bukan layar).', key: '2' },
  depth: { short: 'Ant–Post', label: 'Anterior–Posterior', axis: [0, -1, 0], plus: 'Anterior', minus: 'Posterior', hint: 'Free 3D: menggeser bidang depan/belakang. Probe klinis: pilih sisi tubuh (tidak menembus tubuh).', key: '3' },
  rotate: { short: 'Putar', label: 'Putar bidang', hint: 'Pilih sudut yang ingin diubah, lalu seret mendatar (atau scroll). Titik kontak tidak berubah.', key: '4' },
  camera: { short: 'Kamera', label: 'Kamera', hint: 'Seret: putar kamera · Shift/klik kanan: geser · scroll: zoom. Kamera tidak pernah mengubah citra.', key: 'C' },
};

/** Angles editable in rotate mode. Clinical angles pivot on the skin contact; free angles rotate the plane. */
export const ANGLES = {
  clinical: { rotate: 'Rotasi (sumbu berkas)', heelToe: 'Tilt heel–toe (dalam bidang)', rock: 'Rock / fan (keluar bidang)' },
  free: { pitch: 'Pitch (sumbu kiri–kanan)', yaw: 'Yaw (sumbu kepala–kaki)', roll: 'Roll (sumbu depan–belakang)' },
};

/** One-click orientation presets (clinical: relative to the local patient frame at the contact). */
export const ORIENTATION_PRESETS = {
  clinical: {
    transverse: { label: 'Transversal', angles: { rotate: 0 } },
    longitudinal: { label: 'Longitudinal (sagital)', angles: { rotate: 90 } },
    obliqueR: { label: 'Oblik 45°', angles: { rotate: 45 } },
    obliqueL: { label: 'Oblik −45°', angles: { rotate: -45 } },
    custom: { label: 'Kustom' },
  },
  free: { axial: { label: 'Aksial / transversal' }, coronal: { label: 'Koronal / frontal' }, sagittal: { label: 'Sagital' }, oblique: { label: 'Oblik' }, custom: { label: 'Kustom' } },
};

/**
 * Convert a pointer drag (dx, dy in screen px) into an amount along a patient axis.
 * `screenAxis` = screen-space vector (px) of +1 unit (e.g. 1 mm) along the axis at the pivot.
 * The drag is projected on the on-screen axis direction, so dragging toward the arrow labelled
 * "Superior" always increases S, whatever the camera orientation. When the axis points almost
 * straight at the viewer (projected length < minPx per 50 units), vertical drag is used (up = +).
 */
export function dragToAmount(dx, dy, screenAxis, { minPx = 12 } = {}) {
  const len = Math.hypot(screenAxis[0], screenAxis[1]);
  if (len * 50 < minPx) return { amount: -dy * 0.5, degenerate: true };
  return { amount: (dx * screenAxis[0] + dy * screenAxis[1]) / (len * len), degenerate: false };
}

/** Horizontal drag -> degrees for rotate mode (fine when `fine`). */
export const dragToDegrees = (dx, fine = false) => dx * (fine ? 0.1 : 0.5);

/**
 * Slide the clinical contact along the skin surface by `mm` along `axis` (patient LPS unit vector).
 * `closest(p)` returns the closest point on the REFERENCE skin with its outward normal ({point, normal})
 * (three-mesh-bvh in the browser). The step is rejected instead of jumping to another body part:
 * the projected point must stay near the target and keep a similar surface orientation.
 * @returns {contact} or {error}
 */
export function slideOnSkin({ contact, axis, mm, closest, coverage = null }) {
  const target = contact.point.map((v, i) => v + axis[i] * mm);
  const hit = closest(target);
  if (!hit) return { error: 'Tidak ada permukaan kulit di arah ini.' };
  const off = Math.hypot(...hit.point.map((v, i) => v - target[i]));
  const turn = hit.normal[0] * contact.normal[0] + hit.normal[1] * contact.normal[1] + hit.normal[2] * contact.normal[2];
  if (off > Math.max(6, 0.6 * Math.abs(mm)) || turn < 0.3) return { error: 'Kulit berbelok tajam di sini (mis. ke lengan atau sisi lain tubuh). Pilih sisi tubuh dengan mode Anterior–Posterior atau klik kulit.' };
  if (coverage && hit.point.some((v, i) => v < coverage.lo[i] + 2 || v > coverage.hi[i] - 2)) return { error: 'Di luar cakupan CT: tidak ada data pencitraan di sana.' };
  return { contact: { point: hit.point, normal: hit.normal } };
}

/** Body sides for clinical side selection in depth mode (direction from the body axis toward the skin). */
export const SIDES = {
  anterior: { label: 'Depan (anterior)', dir: [0, -1, 0] },
  right: { label: 'Kanan pasien', dir: [-1, 0, 0] },
  left: { label: 'Kiri pasien', dir: [1, 0, 0] },
  posterior: { label: 'Belakang (posterior)', dir: [0, 1, 0] },
};

/** Step choices. */
export const STEPS_MM = [1, 2, 5, 10, 25], STEPS_DEG = [1, 5, 15];
