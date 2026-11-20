// Pure 2D geometry for image studios (also mirrored on the server for region grading).
export function pointInPolygon([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** Length between two image points; millimetres only when a calibrated pixel spacing exists. */
export function measure(a, b, spacing) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  return spacing ? { value: Math.hypot(dx * spacing[0], dy * spacing[1]), unit: 'mm' } : { value: Math.hypot(dx, dy), unit: 'px' };
}
