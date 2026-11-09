// Multiplanar reconstruction (CT MPR) planes in PATIENT coordinates (LPS mm). Pure functions.
// These are CT reformat planes — they are not the acquisition geometry of a clinical ultrasound probe.
//
// Display conventions (radiological):
//   axial    : viewed from the feet — patient LEFT on screen right, ANTERIOR at top   (u = +L, v = +P)
//   coronal  : viewed from the front — patient LEFT on screen right, SUPERIOR at top  (u = +L, v = −S)
//   sagittal : viewed from the patient's left — ANTERIOR on screen left, SUPERIOR at top (u = +P, v = −S)
// A plane object matches core/probe.js imagingPlane(): image pixel (c, r) of cols x rows is
//   top + u * ((c + .5)/cols * width − width/2) + v * ((r + .5)/rows * height).

export const MPR = {
  ax: { name: 'Aksial', u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], dims: [0, 1] },
  co: { name: 'Koronal', u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], dims: [0, 2] },
  sa: { name: 'Sagital', u: [0, 1, 0], v: [0, 0, -1], n: [1, 0, 0], dims: [1, 2] },
};

/** Square MPR plane through `point`, sized to cover the CT bounds in that plane (plus a margin). */
export function mprPlane(key, point, bounds, margin = 10) {
  const d = MPR[key], ext = d.dims.map((i) => bounds.hi[i] - bounds.lo[i]);
  const size = Math.max(...ext) + 2 * margin;
  // centre of the image = the point projected onto the CT centre along the in-plane axes (whole slice visible)
  const centre = [...point];
  for (const i of d.dims) centre[i] = (bounds.lo[i] + bounds.hi[i]) / 2;
  const top = centre.map((c, i) => c - d.v[i] * size / 2);
  return { mode: 'mpr', key, top, u: [...d.u], v: [...d.v], n: [...d.n], width: size, height: size, depth: size, centre };
}

/** The three linked planes through one patient-space point. */
export function triPlanes(point, bounds) {
  return { ax: mprPlane('ax', point, bounds), co: mprPlane('co', point, bounds), sa: mprPlane('sa', point, bounds) };
}

/** Clamp a point into the CT bounds. */
export const clampToBounds = (p, b) => p.map((v, i) => Math.min(b.hi[i], Math.max(b.lo[i], v)));

/** Move the crosshair through-plane by `mm` for the plane `key` (scroll = next slice). */
export function stepSlice(point, key, mm, bounds) {
  const n = MPR[key].n;
  return clampToBounds(point.map((v, i) => v + n[i] * mm), bounds);
}

/** Slice position readout (mm along the plane normal, in patient terms). */
export function sliceLabel(key, point) {
  if (key === 'ax') return `z ${point[2].toFixed(1)} mm (${point[2] >= 0 ? 'superior' : 'inferior'} ujung xifoid)`;
  if (key === 'co') return `y ${point[1].toFixed(1)} mm (${point[1] >= 0 ? 'posterior' : 'anterior'})`;
  return `x ${point[0].toFixed(1)} mm (${point[0] >= 0 ? 'kiri' : 'kanan'} pasien)`;
}
