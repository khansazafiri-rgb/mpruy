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
  if (mode === 'depth') return aroundBody(S, mm, { closestSkin, coverage });
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

/**
 * Clinical anterior (+) / posterior (−): walk the contact AROUND the body surface toward the front or back at
 * (about) the same height — the probe never goes through the body. Each sub-step slides along the skin tangent
 * that points toward the wanted side; it stops when the probe already faces that side.
 */
export function aroundBody(S, mm, { closestSkin, coverage }) {
  if (!S.contact) return { ok: false, error: 'Tempatkan probe dulu (klik kulit).' };
  const want = [0, mm > 0 ? -1 : 1, 0]; // anterior = −y (LPS)
  const n = Math.max(1, Math.ceil(Math.abs(mm) / SUB_STEP_MM));
  let contact = S.contact, moved = 0, error = null;
  for (let k = 0; k < n; k++) {
    const nr = contact.normal, along = want[0] * nr[0] + want[1] * nr[1] + want[2] * nr[2];
    if (along > 0.97) { error = mm > 0 ? 'Probe sudah di permukaan depan (anterior).' : 'Probe sudah di permukaan belakang (posterior).'; break; }
    // walk along the body's horizontal cross-section (tangent perpendicular to the skin normal). The rotational
    // sense around the body is chosen ONCE (toward the wanted side; on the exact opposite side: the nearer flank)
    // and kept while the same direction is repeated, so the probe never oscillates around the midline.
    const h = [-nr[1], nr[0]], L = Math.hypot(h[0], h[1]) || 1;
    if (!S._walk || S._walk.want !== want[1] || S._walk.from !== S.contact) {
      const toward = (h[0] * want[0] + h[1] * want[1]) / L;
      S._walk = { want: want[1], sense: Math.abs(toward) >= 0.1 ? Math.sign(toward) : (contact.point[0] >= 0 ? 1 : -1) * Math.sign(h[0] || 1) };
    }
    const t = [S._walk.sense * h[0] / L, S._walk.sense * h[1] / L, 0];
    const r = slideOnSkin({ contact, axis: t, mm: SUB_STEP_MM, closest: closestSkin, coverage });
    if (r.error) { error = r.error; break; }
    contact = r.contact; moved += SUB_STEP_MM;
  }
  if (moved) S.contact = contact;
  if (S._walk) S._walk.from = S.contact; // a probe placed any other way resets the walking direction
  return { ok: !error || moved > 0, moved: Math.sign(mm) * moved, error: moved ? null : error, note: moved && error ? error : null };
}
