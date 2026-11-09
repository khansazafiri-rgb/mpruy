// Anatomical label rasters on the SAME pixel grid as the CT reslice and the US scan conversion,
// plus contour extraction. Pure functions: no DOM, no camera. Used by the imaging worker (rasters),
// the monitor (contours, hover) and tests.
//
// Pixel (c, r) of a cols x rows image of `plane` is the image-plane point
//   s = (c + 0.5) / cols * width - width / 2,   d = (r + 0.5) / rows * height
// exactly as in core/reslice.js (CT) and sim/ultrasound.js scanConvert (US), so one label raster
// serves both panels of a frame.
import { inFieldOfView, planePoint } from './probe.js';

/** LPS point of a (fractional) image pixel coordinate (pixel centres at +0.5). */
export function pixelToLPS(plane, cols, rows, px, py) {
  const s = (px / cols) * plane.width - plane.width / 2, d = (py / rows) * plane.height;
  return planePoint(plane, s, d);
}

/** Image pixel coordinate of an LPS point projected onto the plane (+ signed distance off-plane, mm). */
export function lpsToPixel(plane, cols, rows, p) {
  const q = [p[0] - plane.top[0], p[1] - plane.top[1], p[2] - plane.top[2]];
  const s = q[0] * plane.u[0] + q[1] * plane.u[1] + q[2] * plane.u[2];
  const d = q[0] * plane.v[0] + q[1] * plane.v[1] + q[2] * plane.v[2];
  const n = plane.n ? q[0] * plane.n[0] + q[1] * plane.n[1] + q[2] * plane.n[2] : 0;
  return { px: ((s + plane.width / 2) / plane.width) * cols, py: (d / plane.height) * rows, offPlaneMM: n };
}

/**
 * Label of every pixel: labelAt(x,y,z) is called with CURRENT-space LPS (the sampler applies the
 * physiology warp and pathology overrides, like the CT sampling). 255 = outside the field of view,
 * 254 = outside the labelled volume.
 */
export const OUTSIDE_FOV = 255, OUTSIDE_VOLUME = 254;
export function labelRaster(labelAt, plane, cols, rows, { clipToFov = true } = {}) {
  const out = new Uint8Array(cols * rows), { top, u, v, width, height } = plane;
  const ds = width / cols, dd = height / rows;
  for (let r = 0; r < rows; r++) {
    const d = (r + 0.5) * dd;
    const bx = top[0] + v[0] * d, by = top[1] + v[1] * d, bz = top[2] + v[2] * d;
    for (let c = 0; c < cols; c++) {
      const s = (c + 0.5) * ds - width / 2, i = r * cols + c;
      if (clipToFov && !inFieldOfView(plane, s, d)) { out[i] = OUTSIDE_FOV; continue; }
      const l = labelAt(bx + u[0] * s, by + u[1] * s, bz + u[2] * s);
      out[i] = l < 0 ? OUTSIDE_VOLUME : l;
    }
  }
  return out;
}

/** Map a label raster to group indices (0 = no group) with a lookup table label -> group. */
export function groupRaster(labels, lut) {
  const g = new Uint8Array(labels.length);
  for (let i = 0; i < labels.length; i++) g[i] = lut[labels[i]];
  return g;
}

/** Pixel count per group (index = group). */
export function groupAreas(groups, nGroups) {
  const a = new Uint32Array(nGroups + 1);
  for (let i = 0; i < groups.length; i++) a[groups[i]]++;
  return a;
}

/**
 * Marching squares on a group raster. For every group with at least `minArea` pixels, returns
 * boundary segments in IMAGE PIXEL coordinates with sub-pixel vertices at edge midpoints between
 * pixel centres (x0,y0,x1,y1, ...). Adjacent groups each get their own boundary (shared edges are
 * emitted for both), so selecting one structure never depends on its neighbours.
 * @returns Map<group, Float32Array>
 */
export function contourSegments(groups, cols, rows, { minArea = 6, only = null } = {}) {
  let maxG = 0; for (let i = 0; i < groups.length; i++) if (groups[i] > maxG) maxG = groups[i];
  const area = groupAreas(groups, maxG), out = new Map();
  for (let g = 1; g <= maxG; g++) {
    if (area[g] < minArea || (only && !only.has(g))) continue;
    const seg = [];
    // cells between pixel centres (c..c+1, r..r+1); corner order: a=TL b=TR c=BR d=BL
    for (let r = -1; r < rows; r++) for (let c = -1; c < cols; c++) {
      const at = (x, y) => (x >= 0 && y >= 0 && x < cols && y < rows && groups[y * cols + x] === g ? 1 : 0);
      const a = at(c, r), b = at(c + 1, r), cc = at(c + 1, r + 1), d = at(c, r + 1);
      const idx = (a << 3) | (b << 2) | (cc << 1) | d;
      if (idx === 0 || idx === 15) continue;
      // edge midpoints in pixel-centre coordinates (+0.5 to put them in image pixel space)
      const X = c + 0.5, Y = r + 0.5;
      const T = [X + 0.5, Y], R = [X + 1, Y + 0.5], B = [X + 0.5, Y + 1], L = [X, Y + 0.5];
      const add = (p, q) => seg.push(p[0], p[1], q[0], q[1]);
      switch (idx) {
        case 1: case 14: add(L, B); break;
        case 2: case 13: add(B, R); break;
        case 3: case 12: add(L, R); break;
        case 4: case 11: add(T, R); break;
        case 5: add(L, B); add(T, R); break; // saddles (TR+BL, TL+BR): keep diagonal corners separate
        case 6: case 9: add(T, B); break;
        case 7: case 8: add(L, T); break;
        case 10: add(L, T); add(B, R); break;
      }
    }
    out.set(g, Float32Array.from(seg));
  }
  return out;
}

/** Group under an image pixel coordinate (-1 outside the image). */
export function groupAt(groups, cols, rows, px, py) {
  const c = Math.floor(px), r = Math.floor(py);
  if (c < 0 || r < 0 || c >= cols || r >= rows) return -1;
  return groups[r * cols + c];
}
