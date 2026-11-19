// Fit an axis-aligned model box from any camera direction in a perspective viewport.
export function fitDistance(size, direction, verticalFovDegrees, aspect, occupancy = 0.78) {
  if (!size.every(n => Number.isFinite(n) && n >= 0) ||
      !direction.every(Number.isFinite) || !Number.isFinite(aspect) || aspect <= 0 ||
      !Number.isFinite(verticalFovDegrees) || verticalFovDegrees <= 1 || verticalFovDegrees >= 170 ||
      occupancy <= 0 || occupancy >= 1) throw new RangeError('Invalid camera fit geometry');
  const length = Math.hypot(...direction);
  if (length < 1e-8) throw new RangeError('Camera direction is zero');
  const forward = direction.map(n => n / length);
  const upHint = Math.abs(forward[1]) > 0.9 ? [0, 0, -1] : [0, 1, 0];
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const right = cross(upHint, forward);
  const rightLength = Math.hypot(...right);
  for (let i = 0; i < 3; i++) right[i] /= rightLength;
  const up = cross(forward, right);
  const tangent = Math.tan(verticalFovDegrees * Math.PI / 360);
  let distance = 0;
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const corner = [x * size[0] / 2, y * size[1] / 2, z * size[2] / 2];
    const dot = axis => corner.reduce((sum, n, i) => sum + n * axis[i], 0);
    distance = Math.max(distance, dot(forward) + Math.abs(dot(up)) / (tangent * occupancy),
      dot(forward) + Math.abs(dot(right)) / (tangent * aspect * occupancy));
  }
  return Math.max(0.4, distance * 1.035);
}
