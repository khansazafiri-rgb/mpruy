// Tissue acoustic properties for the EDUCATIONAL ultrasound approximation.
// c: speed of sound (m/s), rho: density (kg/m^3), alpha: attenuation (dB/cm/MHz, linear-in-f model),
// scatter: relative backscatter intensity (dimensionless echogenicity scale, liver = 0.45).
// c / rho / alpha are representative literature values (see MEDICAL_REFERENCES.md, refs T1-T4);
// real tissue varies with temperature, frequency, age and disease. "scatter" is a teaching
// parameter chosen to reproduce textbook relative echogenicity, not a measured coefficient.

export const TISSUES = [
  { key: 'gel', name: 'Coupling gel / water', c: 1540, rho: 1000, alpha: 0.0022, scatter: 0, range: 'water 0.0022' },
  { key: 'air', name: 'Air / gas', c: 343, rho: 1.2, alpha: 40, scatter: 0, range: 'Z ~ 0.0004 MRayl' },
  { key: 'lung', name: 'Aerated lung', c: 650, rho: 400, alpha: 40, scatter: 0, range: 'alpha ~40 dB/cm/MHz' },
  { key: 'fat', name: 'Fat', c: 1450, rho: 950, alpha: 0.48, scatter: 0.05, range: 'alpha 0.48-0.6' },
  { key: 'skin', name: 'Skin', c: 1615, rho: 1090, alpha: 1.1, scatter: 1.2, range: 'alpha ~0.8-2.1' },
  { key: 'muscle', name: 'Skeletal muscle', c: 1580, rho: 1065, alpha: 1.09, scatter: 0.11, range: 'alpha 0.57-1.3' },
  { key: 'myocardium', name: 'Myocardium', c: 1576, rho: 1060, alpha: 0.52, scatter: 0.16, range: 'alpha ~0.5-1.0' },
  { key: 'blood', name: 'Blood', c: 1584, rho: 1060, alpha: 0.18, scatter: 0.0012, range: 'alpha 0.15-0.2' },
  { key: 'liver', name: 'Liver', c: 1595, rho: 1060, alpha: 0.5, scatter: 0.45, range: 'alpha 0.4-0.94' },
  { key: 'spleen', name: 'Spleen', c: 1566, rho: 1054, alpha: 0.4, scatter: 0.5, range: 'alpha ~0.4-0.5' },
  { key: 'kidney', name: 'Renal parenchyma', c: 1560, rho: 1050, alpha: 1.0, scatter: 0.17, range: 'alpha ~1.0' },
  { key: 'sinus_fat', name: 'Renal sinus (fibro-fatty)', c: 1460, rho: 960, alpha: 0.6, scatter: 1.5, range: 'echogenic interfaces' },
  { key: 'pancreas', name: 'Pancreas', c: 1580, rho: 1045, alpha: 0.6, scatter: 0.7, range: 'iso- to hyperechoic vs liver' },
  { key: 'gi_wall', name: 'GI wall', c: 1560, rho: 1050, alpha: 0.8, scatter: 0.6, range: 'layered wall (simplified)' },
  { key: 'gi_fluid', name: 'GI fluid content', c: 1530, rho: 1010, alpha: 0.05, scatter: 0.012, range: 'near-anechoic with debris' },
  { key: 'fluid', name: 'Simple fluid (bile, urine, CSF, effusion)', c: 1510, rho: 1005, alpha: 0.003, scatter: 0, range: 'alpha ~0.002-0.01' },
  { key: 'stool', name: 'Stool / mixed content', c: 1540, rho: 1050, alpha: 3.0, scatter: 0.8, range: 'heterogeneous, gas-containing' },
  { key: 'bone', name: 'Cortical bone', c: 3500, rho: 1900, alpha: 20, scatter: 0.5, range: 'Z 6-8 MRayl, alpha 10-22' },
  { key: 'cartilage', name: 'Hyaline / costal cartilage', c: 1660, rho: 1100, alpha: 1.0, scatter: 0.04, range: 'hypoechoic' },
  { key: 'brain', name: 'Brain / spinal cord', c: 1560, rho: 1040, alpha: 0.6, scatter: 0.12, range: 'alpha ~0.6' },
  { key: 'atelectasis', name: 'Collapsed (atelectatic) lung', c: 1560, rho: 1050, alpha: 0.8, scatter: 0.5, range: 'tissue-like "hepatisation"' },
  { key: 'plastic', name: 'Table / plastic', c: 2400, rho: 1200, alpha: 3, scatter: 0.1, range: 'not anatomy' },
];

export const TISSUE_INDEX = Object.fromEntries(TISSUES.map((t, i) => [t.key, i]));
export const impedance = (t) => (t.rho * t.c) / 1e6; // MRayl

export function cloneTissues() {
  return TISSUES.map((t) => ({ ...t }));
}

/** Label id -> tissue class index, from the anatomy label table (acoustic field). */
export function labelToTissueMap(anatomy) {
  const map = new Uint8Array(256).fill(TISSUE_INDEX.muscle);
  map[0] = TISSUE_INDEX.air;
  for (const l of anatomy.labels) map[l.id] = TISSUE_INDEX[l.acoustic] ?? TISSUE_INDEX.muscle;
  return map;
}

/**
 * Fallback for CT volumes without a label map (e.g. a local CTACardio NRRD): classify HU.
 * Contrast-enhanced blood overlaps bone/soft tissue ranges, so this is coarse by design.
 */
export function classifyHU(hu) {
  if (hu !== hu) return TISSUE_INDEX.air;
  if (hu < -950) return TISSUE_INDEX.air;
  if (hu < -500) return TISSUE_INDEX.lung;
  if (hu < -30) return TISSUE_INDEX.fat;
  if (hu < 20) return TISSUE_INDEX.fluid;
  if (hu < 90) return TISSUE_INDEX.muscle;
  if (hu < 140) return TISSUE_INDEX.liver;
  if (hu < 450) return TISSUE_INDEX.blood; // contrast-enhanced lumen in CTA
  return TISSUE_INDEX.bone;
}
