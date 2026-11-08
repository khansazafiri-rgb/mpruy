// CT multiplanar reslicing along the imaging plane. Camera state never enters here.
import { inFieldOfView } from './probe.js';

/**
 * Sample a volume over an imaging plane.
 * @param volume   from makeVolume
 * @param plane    from imagingPlane
 * @param cols,rows raster size; pixels are square in mm when cols/rows = width/height
 * @param warp     optional (x,y,z,out) => writes reference-anatomy coordinates (physiological motion)
 * @returns {values Float32Array (NaN = outside CT), fov Uint8Array, outsideFraction, mmPerPixel}
 */
export function reslice(volume, plane, cols, rows, { warp = null, clipToFov = true } = {}) {
  const n = cols * rows;
  const values = new Float32Array(n), fov = new Uint8Array(n);
  const { top, u, v, width, height } = plane;
  const ds = width / cols, dd = height / rows;
  const q = [0, 0, 0];
  let outside = 0, inFov = 0;
  for (let r = 0; r < rows; r++) {
    const d = (r + 0.5) * dd;
    const bx = top[0] + v[0] * d, by = top[1] + v[1] * d, bz = top[2] + v[2] * d;
    for (let c = 0; c < cols; c++) {
      const s = (c + 0.5) * ds - width / 2;
      const idx = r * cols + c;
      if (clipToFov && !inFieldOfView(plane, s, d)) { values[idx] = NaN; continue; }
      fov[idx] = 1; inFov++;
      let x = bx + u[0] * s, y = by + u[1] * s, z = bz + u[2] * s;
      if (warp) { warp(x, y, z, q); x = q[0]; y = q[1]; z = q[2]; }
      const val = volume.sample(x, y, z);
      values[idx] = val;
      if (val !== val) outside++;
    }
  }
  return { values, fov, cols, rows, outsideFraction: inFov ? outside / inFov : 1, mmPerPixel: [ds, dd] };
}

/** Window/level mapping into an RGBA buffer. Outside-CT pixels get a diagonal hatch. */
export function windowLevel(result, window, level, rgba = new Uint8ClampedArray(result.cols * result.rows * 4)) {
  const { values, fov, cols } = result;
  const lo = level - window / 2, k = 255 / Math.max(1, window);
  for (let i = 0; i < values.length; i++) {
    const v = values[i], o = i * 4;
    if (!fov[i]) { rgba[o] = rgba[o + 1] = rgba[o + 2] = 0; rgba[o + 3] = 255; continue; }
    if (v !== v) {
      const x = i % cols, y = (i / cols) | 0;
      const h = ((x + y) & 15) < 2;
      rgba[o] = h ? 120 : 34; rgba[o + 1] = h ? 40 : 10; rgba[o + 2] = h ? 40 : 14; rgba[o + 3] = 255;
      continue;
    }
    const g = (v - lo) * k;
    rgba[o] = rgba[o + 1] = rgba[o + 2] = g < 0 ? 0 : g > 255 ? 255 : g;
    rgba[o + 3] = 255;
  }
  return rgba;
}

export const CT_PRESETS = {
  softTissue: { window: 400, level: 40, label: 'Soft tissue' },
  lung: { window: 1500, level: -600, label: 'Lung' },
  bone: { window: 1800, level: 400, label: 'Bone' },
  liver: { window: 160, level: 70, label: 'Liver' },
  mediastinum: { window: 350, level: 50, label: 'Mediastinum' },
};

/** Cheap FNV-1a hash of a raster: used by tests to prove camera changes do not change imaging. */
export function rasterHash(arr) {
  let h = 2166136261 >>> 0;
  const bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16);
}
