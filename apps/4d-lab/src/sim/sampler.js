// Joint CT / tissue sampler: physiology warp + pathology label overrides on top of the static data.
// Inputs are CURRENT-space LPS points; lookups happen in REFERENCE anatomy space.
import { makeWarp } from './physiology.js';
import { labelToTissueMap, classifyHU, TISSUE_INDEX } from './tissues.js';

export function createSampler({ ct, labels = null, anatomy = null }) {
  const tissueMap = labels && anatomy ? labelToTissueMap(anatomy) : null;
  const huOf = new Float32Array(256).fill(NaN);
  if (anatomy) for (const l of anatomy.labels) huOf[l.id] = l.hu;
  let warp = null, effusion = null;
  const q = [0, 0, 0];

  function toRef(x, y, z, out) {
    if (warp) return warp(x, y, z, out);
    out[0] = x; out[1] = y; out[2] = z; return out;
  }
  function labelRef(x, y, z) {
    if (!labels) return -1;
    let lab = labels.nearest(x, y, z);
    if (effusion && lab === 7) { const o = effusion.classify(x, y, z, lab); if (o) lab = o; }
    return lab;
  }
  return {
    hasLabels: !!labels,
    setFrame(frame) { warp = frame ? makeWarp(frame) : null; },
    setEffusion(e) { effusion = e; },
    get effusion() { return effusion; },
    toRef,
    /** HU at a current-space point (NaN outside CT). */
    ct(x, y, z) {
      toRef(x, y, z, q);
      const v = ct.sample(q[0], q[1], q[2]);
      if (effusion && v === v) {
        const lab = labels.nearest(q[0], q[1], q[2]);
        if (lab === 7) { const o = effusion.classify(q[0], q[1], q[2], lab); if (o) return huOf[o]; }
      }
      return v;
    },
    /** Label at a REFERENCE point (with pathology overrides). */
    labelRef,
    /** Tissue class at a REFERENCE point. */
    tissueRef(x, y, z) {
      if (tissueMap) { const lab = labelRef(x, y, z); return lab < 0 ? TISSUE_INDEX.air : tissueMap[lab]; }
      return classifyHU(ct.sample(x, y, z));
    },
    /** HU and label at a CURRENT-space point from ONE warp (consistent CT pixel and overlay label). */
    both(x, y, z, out) {
      toRef(x, y, z, q);
      const lab = labelRef(q[0], q[1], q[2]);
      let v = ct.sample(q[0], q[1], q[2]);
      if (v === v && (lab === 39 || lab === 41)) v = huOf[lab]; // same pathology override as ct()
      out[0] = v; out[1] = lab; return out;
    },
    /** Label at a CURRENT-space point. */
    label(x, y, z) { toRef(x, y, z, q); return labelRef(q[0], q[1], q[2]); },
  };
}
