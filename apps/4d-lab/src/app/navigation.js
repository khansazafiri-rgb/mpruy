// Anatomical navigation helpers for the MEDCOEL 4D Lab.
// Coordinates are patient LPS in millimetres (L+, P+, S+).
// Clinical movement projects onto the original skin mesh. Free 3D is unconstrained.
export const AXIS = Object.freeze({
  left: [1, 0, 0], right: [-1, 0, 0],
  posterior: [0, 1, 0], anterior: [0, -1, 0],
  superior: [0, 0, 1], inferior: [0, 0, -1],
});

export function moveFree(position, direction, millimetres = 10) {
  const d = AXIS[direction];
  if (!d || !Number.isFinite(millimetres) || millimetres <= 0) return null;
  return position.map((v, i) => v + d[i] * millimetres);
}

const sq = (x) => x * x;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Move on a reconstructed skin surface while preserving the local normal.
 * AP buttons intentionally change the examined SIDE (front/back), not the beam direction.
 * Returning null means there is no suitable covered skin contact, rather than moving
 * the probe through tissue or manufacturing a contact.
 */
export function findSkinContact({ contact, positions, normals, direction, millimetres = 10, coverage, capZ = -Infinity }) {
  const d = AXIS[direction];
  if (!d || !contact || !positions || !normals || positions.length !== normals.length) return null;
  const switchingSide = direction === 'anterior' || direction === 'posterior';
  const point = contact.point, originalNormal = contact.normal;
  const target = point.map((v, i) => v + d[i] * millimetres);
  let winner = -1, minCost = Infinity;
  for (let j = 0; j < positions.length; j += 3) {
    const p = [positions[j], positions[j + 1], positions[j + 2]];
    if (p[2] < capZ) continue;
    if (coverage && p.some((v, i) => v < coverage.lo[i] + 2 || v > coverage.hi[i] - 2)) continue;
    const n = [normals[j], normals[j + 1], normals[j + 2]];
    const length = Math.hypot(...n) || 1;
    const nn = n.map((v) => v / length);
    let cost;
    if (switchingSide) {
      // Match horizontal and cranio-caudal position, prefer an accessible anterior/posterior face.
      const facing = nn[1] * d[1];
      if (facing < 0.35) continue;
      cost = 5 * (sq(p[0] - point[0]) + sq(p[2] - point[2])) + 1200 * sq(1 - facing);
    } else {
      const match = dot(nn, originalNormal);
      if (match < 0.25) continue; // Avoid abruptly jumping to the opposite body surface.
      cost = sq(p[0] - target[0]) + sq(p[1] - target[1]) + sq(p[2] - target[2]) + 40 * sq(1 - match);
      if (Math.hypot(p[0] - point[0], p[1] - point[1], p[2] - point[2]) > millimetres * 3 + 5) continue;
    }
    if (cost < minCost) { minCost = cost; winner = j; }
  }
  if (winner < 0) return null;
  const normal = Array.from(normals.slice(winner, winner + 3));
  const length = Math.hypot(...normal) || 1;
  return { point: Array.from(positions.slice(winner, winner + 3)), normal: normal.map((v) => v / length) };
}
