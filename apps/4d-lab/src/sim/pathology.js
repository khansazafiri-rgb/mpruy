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
export function buildEffusion(labels, volumeMl, { lungLabel = 7, band = 7 } = {}) {
  if (!(volumeMl > 0)) return null;
  const [nx, ny, nz] = labels.sizes, data = labels.data, m = labels.affine;
  const voxelMl = Math.abs(m[0] * (m[5] * m[10] - m[6] * m[9]) - m[1] * (m[4] * m[10] - m[6] * m[8]) + m[2] * (m[4] * m[9] - m[5] * m[8])) / 1000;
  const score = (x, y, z) => y + 0.55 * (diaphragmZ(x, y) - z);
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
  return { threshold, volumeMl: n * voxelMl, classify, lungMl: scores.length * voxelMl };
}

export function applyScenario(base, key) {
  const sc = SCENARIOS[key] || SCENARIOS.normal;
  return { ...base, ...sc.physiology };
}
