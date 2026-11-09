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
  const x0 = point[0], y0 = point[1], z0 = point[2], m = millimetres;
  const maxStep2 = (m * 3 + 5) ** 2;
  for (let j = 0; j < positions.length; j += 3) {
    const x = positions[j], y = positions[j + 1], z = positions[j + 2];
    if (z < capZ) continue;
    if (coverage && (x < coverage.lo[0] + 2 || x > coverage.hi[0] - 2 ||
      y < coverage.lo[1] + 2 || y > coverage.hi[1] - 2 ||
      z < coverage.lo[2] + 2 || z > coverage.hi[2] - 2)) continue;
    const a = normals[j], b = normals[j + 1], c = normals[j + 2];
    const il = 1 / (Math.hypot(a, b, c) || 1);
    const nx = a * il, ny = b * il, nz = c * il;
    let cost;
    if (switchingSide) {
      const facing = ny * d[1];
      if (facing < 0.35) continue;
      cost = 5 * (sq(x - x0) + sq(z - z0)) + 1200 * sq(1 - facing);
    } else {
      const match = nx * originalNormal[0] + ny * originalNormal[1] + nz * originalNormal[2];
      if (match < 0.25) continue;
      const movement2 = sq(x - x0) + sq(y - y0) + sq(z - z0);
      if (movement2 > maxStep2) continue;
      cost = sq(x - target[0]) + sq(y - target[1]) + sq(z - target[2]) + 40 * sq(1 - match);
    }
    if (cost < minCost) { minCost = cost; winner = j; }
  }
  if (winner < 0) return null;
  const normal = Array.from(normals.slice(winner, winner + 3));
  const length = Math.hypot(...normal) || 1;
  return { point: Array.from(positions.slice(winner, winner + 3)), normal: normal.map((v) => v / length) };
}
