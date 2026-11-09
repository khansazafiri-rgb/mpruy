// Applies axis-first movements to the workstation state. One call changes exactly ONE quantity:
//   vertical / horizontal : translate along a patient axis (clinical: slide on the skin; free: LPS translation)
//   depth                 : free: anterior/posterior translation; clinical: explicit body-side selection
//   rotate                : one angle (clinical pivots on the fixed skin contact; free rotates the plane)
// Camera state is never read or written here, so the anatomical meaning of a control cannot depend on it.
import { CONTROL_MODES, slideOnSkin, SIDES } from './axisControl.js';
import { CLINICAL_LIMITS, rotateFree } from '../core/probe.js';

const FREE_AXES = { pitch: [1, 0, 0], yaw: [0, 0, 1], roll: [0, 1, 0] };
const SUB_STEP_MM = 2.5;

/** Translate by `mm` along the axis of `mode`. Returns {ok, error?, moved (mm actually applied)} */
export function translate(S, mode, mm, { closestSkin, coverage }) {
  const axis = CONTROL_MODES[mode]?.axis; if (!axis) return { ok: false, error: 'Mode ini bukan translasi.' };
  if (S.mode === 'free') {
    S.free.position = S.free.position.map((v, i) => v + axis[i] * mm);
    return { ok: true, moved: mm };
  }
  if (mode === 'depth') return { ok: false, error: 'Probe klinis tidak menembus tubuh: pilih sisi tubuh (depan/belakang/kanan/kiri).' };
  if (!S.contact) return { ok: false, error: 'Tempatkan probe dulu (klik kulit).' };
  // slide in small sub-steps so the contact follows the skin curvature instead of jumping
  const n = Math.max(1, Math.ceil(Math.abs(mm) / SUB_STEP_MM)), step = mm / n;
  let contact = S.contact, moved = 0, error = null;
  for (let k = 0; k < n; k++) {
    const r = slideOnSkin({ contact, axis, mm: step, closest: closestSkin, coverage });
    if (r.error) { error = r.error; break; }
    contact = r.contact; moved += step;
  }
  if (moved !== 0) S.contact = contact;
  return { ok: !error, moved, error };
}

/** Clinical side selection: put the contact on the chosen body side at the same height (ray from inside). */
export function selectSide(S, side, { raySkin, bodyCentre, coverage }) {
  const sd = SIDES[side]; if (!sd) return { ok: false, error: 'Sisi tidak dikenal.' };
  const z = S.contact ? S.contact.point[2] : bodyCentre[2];
  const origin = [bodyCentre[0], bodyCentre[1], z];
  const hit = raySkin(origin, sd.dir);
  if (!hit) return { ok: false, error: `Tidak ada permukaan kulit ${sd.label.toLowerCase()} pada ketinggian ini.` };
  if (coverage && hit.point.some((v, i) => v < coverage.lo[i] + 2 || v > coverage.hi[i] - 2)) return { ok: false, error: 'Sisi itu di luar cakupan CT pada ketinggian ini.' };
  S.contact = hit;
  return { ok: true };
}

/** Rotate one angle by `deg`. Clinical angles never move the contact point (pivot = skin contact). */
export function rotate(S, deg) {
  if (S.mode === 'free') {
    const k = S.ctl.angleFree; S.free.q = rotateFree(S.free.q, FREE_AXES[k], deg);
    return { ok: true };
  }
  const k = S.ctl.angleClinical, lim = CLINICAL_LIMITS[k] || 1e9;
  if (k === 'rotate') S.angles.rotate = ((S.angles.rotate + deg + 540) % 360) - 180;
  else {
    const v = S.angles[k] + deg, c = Math.max(-lim, Math.min(lim, v));
    S.angles[k] = c;
    if (c !== v) return { ok: false, error: `Batas ${k === 'heelToe' ? 'heel–toe' : 'rock'} ±${lim}° tercapai.` };
  }
  return { ok: true };
}
