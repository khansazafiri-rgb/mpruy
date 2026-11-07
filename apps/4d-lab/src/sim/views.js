// Standard teaching windows (probe presets) for the phantom. Positions are approximate skin
// targets in reference LPS mm; the app snaps them to the registered skin mesh before use.
export const VIEWS = [
  { key: 'ruq', label: 'RUQ / Morison pouch (liver-kidney)', labelId: 'RUQ / kantong Morison', probe: 'convex', target: [-100, -10, -95], dir: [-0.85, -0.53, 0], angles: { rotate: 90, heelToe: 0, rock: -8 }, depth: 160 },
  { key: 'subxiphoid', label: 'Subxiphoid four-chamber', labelId: 'Subxifoid 4 ruang', probe: 'phased', target: [10, -60, -28], dir: [0, -1, 0], angles: { rotate: 0, heelToe: 0, rock: -58 }, depth: 200 },
  { key: 'parasternal', label: 'Parasternal long axis', labelId: 'Parasternal sumbu panjang', probe: 'phased', target: [36, -60, 76], dir: [0, -1, 0], angles: { rotate: 125, heelToe: 0, rock: 0 }, depth: 180 },
  { key: 'apical', label: 'Apical four-chamber', labelId: 'Apikal 4 ruang', probe: 'phased', target: [70, -50, 30], dir: [0.4, -0.9, 0], angles: { rotate: 0, heelToe: -20, rock: -40 }, depth: 200 },
  { key: 'right_flank', label: 'Right posterolateral base (effusion window)', labelId: 'Basal kanan posterolateral (jendela efusi)', probe: 'convex', target: [-100, 40, -60], dir: [-0.85, 0.5, 0], angles: { rotate: 95, heelToe: -20, rock: 0 }, depth: 170 },
  { key: 'epigastric', label: 'Epigastric antrum (sagittal)', labelId: 'Antrum epigastrik (sagital)', probe: 'convex', target: [10, -60, -110], dir: [0, -1, 0], angles: { rotate: 90, heelToe: 0, rock: 0 }, depth: 140 },
  { key: 'lung_anterior', label: 'Anterior lung (pleural line, A-lines)', labelId: 'Paru anterior (garis pleura)', probe: 'linear', target: [-62, -60, 125], dir: [0, -1, 0], angles: { rotate: 90, heelToe: 0, rock: 0 }, depth: 60 },
  { key: 'bladder', label: 'Suprapubic bladder (transverse)', labelId: 'Kandung kemih suprapubik', probe: 'convex', target: [0, -40, -300], dir: [0, -1, 0], angles: { rotate: 0, heelToe: 0, rock: 0 }, depth: 140 },
];

/**
 * Start INSIDE the body at `target` and walk outward along `dir` to the first air sample:
 * the last body point is the skin contact (walking outward avoids landing on an arm beside the trunk).
 */
export function snapToSkin(labelAt, target, dir, maxMM = 300) {
  const n = Math.hypot(...dir), d = dir.map((v) => v / n);
  const inside = (t) => { const l = labelAt(target[0] + d[0] * t, target[1] + d[1] * t, target[2] + d[2] * t); return l > 0 && l !== 38; };
  if (!inside(0)) return null;
  let t = 0;
  while (t < maxMM && inside(t + 0.5)) t += 0.5;
  return { point: [target[0] + d[0] * t, target[1] + d[1] * t, target[2] + d[2] * t], normal: d };
}
