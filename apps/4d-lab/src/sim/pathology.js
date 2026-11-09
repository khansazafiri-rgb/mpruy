// Educational pathology scenarios. Each is a MODEL PARAMETER CHANGE or an explicit label
// override layered on the normal phantom; none is derived from patient data and none
// implies diagnostic validity. Text is for teaching and has references (MEDICAL_REFERENCES.md).
import { diaphragmZ } from './physiology.js';

export const SCENARIOS = {
  normal: {
    key: 'normal', system: 'all', title: 'Normal reference', titleId: 'Normal (pembanding)',
    physiology: {}, auscultation: {}, effusionMl: 0,
    summary: 'Normal phantom: LV ejection fraction about 58%, quiet breathing, gastric antral contractions about 3 per minute.',
    findings: [], references: [],
  },
  hfref: {
    key: 'hfref', system: 'cardiovascular', title: 'Reduced LV systolic function (HFrEF pattern)', titleId: 'Fungsi sistolik LV menurun (pola HFrEF)',
    physiology: { lvRadial: 0.11, lvLongitudinal: 0.06, lvDilation: 1.18, rvRadial: 0.16, heartRate: 92 },
    auscultation: { s3: true },
    effusionMl: 0,
    summary: 'The left ventricle is dilated and contracts poorly. Model LVEF about 25% compared with about 58% in the normal model. Heart rate is set to 92/min. A third heart sound (S3) in early diastole is included because it commonly accompanies a dilated, volume-loaded LV.',
    findings: [
      'Apical / parasternal views: larger LV cavity at end-diastole and little change in size during systole.',
      'Reduced AV-plane (base) descent toward the apex, the basis of MAPSE.',
      'Auscultation at the apex: low-pitched S3 about 140 ms after S2. Use the bell and listen in early diastole.',
      'The CT reformat shows the same dilated LV. A static CT cannot show function; motion here is simulated.',
    ],
    teaching: 'EF is defined as (EDV − ESV) / EDV. The model computes it from the same deformation that moves the mesh and the images. HFrEF is a clinical syndrome diagnosed from symptoms, signs and LVEF ≤ 40% (ESC 2021 / AHA-ACC-HFSA 2022). This simulation only shows the imaging pattern.',
    references: ['R1', 'R2', 'R3', 'R4'],
  },
  effusion: {
    key: 'effusion', system: 'respiratory', title: 'Right pleural effusion (moderate, free-flowing)', titleId: 'Efusi pleura kanan (sedang, bebas)',
    physiology: {}, auscultation: { reducedBreathRight: true }, effusionMl: 650,
    summary: 'About 650 mL of free fluid lies in the dependent (posterior and basal, because the patient is supine) right pleural space. It compresses the adjacent lung, which becomes atelectatic.',
    findings: [
      'Right flank / posterior-axillary view above the diaphragm: anechoic fluid between the chest wall and the diaphragm, with collapsed tissue-like lung floating in it.',
      'The fluid moves with respiration while staying above the bright diaphragm. Mirror artefact is lost, and the spine is visible above the diaphragm (spine sign).',
      'CT: dependent water-density (about 10 HU) crescent in the right posterior hemithorax.',
      'Auscultation: reduced breath sounds over the right base compared with the left. Dullness to percussion is described in the text only and is not simulated.',
    ],
    teaching: 'Lung ultrasound is more sensitive than a supine chest radiograph for effusion. Volume estimates from US are approximate. Thoracentesis decisions need clinical context (BTS 2023 guideline).',
    references: ['R5', 'R6', 'R7'],
  },
  pericardial: {
    key: 'pericardial', system: 'cardiovascular', title: 'Pericardial effusion (moderate, circumferential)', titleId: 'Efusi perikardial (sedang)',
    physiology: { heartRate: 104 }, auscultation: {}, effusionMl: 0, layer: { kind: 'pericardial', mm: 9 },
    summary: 'A circumferential layer of fluid (about 9 mm) surrounds the heart in the pericardial space. Heart rate is set to 104/min. Haemodynamic effects (tamponade physiology) are NOT modelled.',
    findings: [
      'Subxiphoid view: an anechoic band between the bright pericardium/liver interface and the myocardium, all around the heart.',
      'CT: a water-density rim around the heart.',
      'Muffled heart sounds and pulsus paradoxus are described in the text only; the synthesised heart sounds are unchanged.',
    ],
    teaching: 'Echocardiography is the first-line test for pericardial effusion; size is graded by the end-diastolic echo-free space (ESC 2015). Tamponade is a clinical diagnosis supported by echo signs (chamber collapse, IVC plethora) that this simulator does not reproduce.',
    references: ['R11', 'R3'],
  },
  ascites: {
    key: 'ascites', system: 'digestive', title: 'Free intraperitoneal fluid around the liver', titleId: 'Cairan bebas perihepatik (asites)',
    physiology: {}, auscultation: {}, effusionMl: 0, layer: { kind: 'perihepatic', mm: 10 },
    summary: 'Free fluid (about 10 mm) lies against the lower, posterior and lateral surfaces of the liver, in the dependent upper abdomen of a supine patient. The kidney is withheld in the atlas dataset, so the hepatorenal (Morison) recess itself cannot be shown.',
    findings: [
      'RUQ window: an anechoic stripe between the liver and the surrounding tissue, outlining the liver edge.',
      'CT: water-density fluid around the inferior liver.',
      'Pelvic and left-upper-quadrant fluid, septations and debris are NOT simulated.',
    ],
    teaching: 'In trauma, free fluid is first looked for in the hepatorenal recess (FAST). In liver disease, ascites is confirmed by imaging and characterised by diagnostic paracentesis (AASLD 2021).',
    references: ['R12', 'T4'],
  },
  retention: {
    key: 'retention', system: 'urinary', title: 'Distended bladder (urinary retention)', titleId: 'Kandung kemih penuh (retensi urin)',
    physiology: {}, auscultation: {}, effusionMl: 0, layer: { kind: 'bladder', mm: 30 },
    summary: 'The urinary bladder lumen is enlarged by about 30 mm in every direction (displacing surrounding soft tissue), representing a full or retained bladder. The atlas bladder is otherwise nearly empty.',
    findings: [
      'Suprapubic transverse and sagittal windows: a large anechoic bladder with posterior acoustic enhancement.',
      'CT: a large water-density bladder.',
      'Bladder volume can be estimated from three diameters (ellipsoid formula); wall thickness and trabeculation are NOT simulated.',
    ],
    teaching: 'Retention is suspected clinically and confirmed by a bladder scan or catheter volume; post-void residual and causes (obstruction, drugs, neurogenic) need assessment (Selius & Subedi 2008).',
    references: ['R13', 'T4'],
  },
  gastroparesis: {
    key: 'gastroparesis', system: 'digestive', title: 'Reduced gastric antral motility (gastroparesis pattern)', titleId: 'Motilitas antrum menurun (pola gastroparesis)',
    physiology: { antralFrequency: 1.2, antralAmplitude: 0.22, antralSpeed: 1.8 },
    auscultation: {}, effusionMl: 0,
    summary: 'Antral contractions are less frequent (about 1.2/min instead of about 3/min) and shallower (about 22% instead of about 60% radial occlusion), so the antral motility index drops.',
    findings: [
      'Epigastric sagittal / oblique view of the antrum: count the contractions over 2–3 minutes and estimate how deep each one is.',
      'Motility index (frequency × amplitude) is displayed for comparison with normal.',
      'Bowel sounds are NOT used to diagnose gastroparesis. Auscultation is unchanged in this scenario on purpose.',
    ],
    teaching: 'Clinical diagnosis of gastroparesis needs symptoms plus delayed gastric emptying on a validated test (e.g. 4-h scintigraphy), after excluding obstruction (ACG 2022). Antral ultrasound is a research and teaching tool, not the reference standard.',
    references: ['R8', 'R9', 'R10'],
  },
};

/** Motility index as used in antral ultrasound teaching: contractions/min x fractional amplitude. */
export const motilityIndex = (p) => +(p.antralFrequency * p.antralAmplitude).toFixed(2);

/**
 * Build a dependent right pleural effusion by ranking right-lung voxels by a gravity-dependency
 * score (posterior + basal in the supine patient) and taking the target volume.
 * Returns a classifier on REFERENCE coordinates: 0 none, 39 pleural fluid, 41 compressed lung.
 */
export function buildEffusion(labels, volumeMl, { lungLabel = 7, band = 7, diaphragm = diaphragmZ } = {}) {
  if (!(volumeMl > 0)) return null;
  const [nx, ny, nz] = labels.sizes, data = labels.data, m = labels.affine;
  const voxelMl = Math.abs(m[0] * (m[5] * m[10] - m[6] * m[9]) - m[1] * (m[4] * m[10] - m[6] * m[8]) + m[2] * (m[4] * m[9] - m[5] * m[8])) / 1000;
  const score = (x, y, z) => y + 0.55 * (diaphragm(x, y) - z);
  const scores = [];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (data[(k * ny + j) * nx + i] !== lungLabel) continue;
    const x = m[0] * i + m[1] * j + m[2] * k + m[3], y = m[4] * i + m[5] * j + m[6] * k + m[7], z = m[8] * i + m[9] * j + m[10] * k + m[11];
    scores.push(score(x, y, z));
  }
  scores.sort((a, b) => b - a);
  const n = Math.min(scores.length - 1, Math.round(volumeMl / voxelMl));
  const threshold = scores[n];
  const classify = (x, y, z, label) => {
    if (label !== lungLabel) return 0;
    const s = score(x, y, z);
    return s > threshold ? 39 : s > threshold - band ? 41 : 0;
  };
  return { kind: 'pleural', from: new Set([lungLabel]), threshold, volumeMl: n * voxelMl, classify, lungMl: scores.length * voxelMl, meshLabel: 39 };
}

export function applyScenario(base, key) {
  const sc = SCENARIOS[key] || SCENARIOS.normal;
  return { ...base, ...sc.physiology };
}

/** Pathology layer labels that are not part of a dataset's own label table (MEDCOEL model layers). */
export const LAYER_LABELS = { 44: { key: 'pericardial_fluid', hu: 8 }, 45: { key: 'free_fluid', hu: 10 } };

/**
 * Model fluid layers for the structured cases. Each grows a fluid region by breadth-first search (6-neighbour)
 * from seed labels through allowed tissue labels, up to `mm`, and writes an override label per voxel.
 * Returns {from: Set(labels that may be overridden), classify(x, y, z, label) -> override or 0, volumeMl, box}.
 *   pericardial : seed myocardium (9); through fat/lungs -> 44 (pericardial fluid)
 *   perihepatic : seed liver (17); through fat only, inferior half of the liver -> 45 (free fluid)
 *   bladder     : seed bladder lumen (30); through fat/bowel/bladder wall -> 30 (urine), new wall 43 at the rim
 */
export function buildLayer(labels, { kind, mm }) {
  const SPEC = {
    pericardial: { seed: [9], through: [2, 7, 8], out: 44 },
    perihepatic: { seed: [17], through: [2], out: 45 },
    bladder: { seed: [30], through: [2, 25, 26, 27, 28, 43], out: 30, rim: 43 },
  }[kind];
  if (!SPEC || !labels) return null;
  const [nx, ny, nz] = labels.sizes, data = labels.data, m = labels.affine, inv = labels.inverse;
  const vox = Math.min(...labels.spacing), steps = Math.max(1, Math.round(mm / vox));
  const seed = new Set(SPEC.seed), through = new Set(SPEC.through);
  const out = new Uint8Array(data.length), dist = new Uint8Array(data.length).fill(255);
  let queue = [];
  let zCut = Infinity;
  if (kind === 'perihepatic') { // only the inferior half of the liver (dependent upper abdomen)
    let zs = []; for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (data[(k * ny + j) * nx + i] === 17) zs.push(k);
    zs.sort((a, b) => a - b); zCut = zs[Math.floor(zs.length * 0.55)] ?? Infinity;
  }
  for (let idx = 0; idx < data.length; idx++) if (seed.has(data[idx])) { dist[idx] = 0; queue.push(idx); }
  const lo = [nx, ny, nz], hi = [0, 0, 0];
  for (let d = 1; d <= steps + (SPEC.rim ? 1 : 0); d++) {
    const next = [];
    for (const idx of queue) {
      const i = idx % nx, j = ((idx / nx) | 0) % ny, k = (idx / (nx * ny)) | 0;
      for (const [di, dj, dk] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const a = i + di, b = j + dj, c = k + dk;
        if (a < 0 || b < 0 || c < 0 || a >= nx || b >= ny || c >= nz) continue;
        const n = (c * ny + b) * nx + a;
        if (dist[n] !== 255 || !through.has(data[n]) || c > zCut) continue;
        dist[n] = d;
        out[n] = d > steps ? SPEC.rim : SPEC.out;
        if (d <= steps) next.push(n);
        if (a < lo[0]) lo[0] = a; if (b < lo[1]) lo[1] = b; if (c < lo[2]) lo[2] = c; if (a > hi[0]) hi[0] = a; if (b > hi[1]) hi[1] = b; if (c > hi[2]) hi[2] = c;
      }
    }
    queue = next;
  }
  let n = 0; for (let x = 0; x < out.length; x++) if (out[x] === SPEC.out && data[x] !== SPEC.out) n++;
  const voxelMl = Math.abs(m[0] * (m[5] * m[10] - m[6] * m[9]) - m[1] * (m[4] * m[10] - m[6] * m[8]) + m[2] * (m[4] * m[9] - m[5] * m[8])) / 1000;
  const toLPS = (i, j, k) => [m[0] * i + m[1] * j + m[2] * k + m[3], m[4] * i + m[5] * j + m[6] * k + m[7], m[8] * i + m[9] * j + m[10] * k + m[11]];
  const a0 = toLPS(...lo), a1 = toLPS(...hi);
  const box = { lo: a0.map((v, i) => Math.min(v, a1[i]) - 6), hi: a0.map((v, i) => Math.max(v, a1[i]) + 6) };
  const classify = (x, y, z) => {
    const i = Math.round(inv[0] * x + inv[1] * y + inv[2] * z + inv[3]), j = Math.round(inv[4] * x + inv[5] * y + inv[6] * z + inv[7]), k = Math.round(inv[8] * x + inv[9] * y + inv[10] * z + inv[11]);
    if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) return 0;
    return out[(k * ny + j) * nx + i];
  };
  return { kind, from: through, classify, volumeMl: +(n * voxelMl).toFixed(0), box, meshLabel: SPEC.out };
}
