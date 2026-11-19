// Full-body EDUCATIONAL probe positioning vs actually available imaging volume.
// Regions derive from existing atlas anatomical landmarks (LPS mm); no manual
// landmarks, no fabricated voxels, and no claims of full-body CT or ultrasound.
export const REGION_NAMES = Object.freeze({
  head: 'Kepala',
  neck: 'Leher',
  upperLimb: 'Lengan',
  thorax: 'Toraks',
  abdomen: 'Abdomen',
  pelvis: 'Pelvis',
  lowerLimb: 'Tungkai',
});
const DEFAULTS = Object.freeze({
  headZ: 255, neckZ: 185, armX: 205,
  thighZ: -360, thoraxZ: -5, pelvisZ: -270,
});
const ACQUIRED = new Set(['thorax', 'abdomen', 'pelvis']);

export function regionAtLPS(point, landmarks = {}) {
  if (!Array.isArray(point) || point.length !== 3 || !point.every(Number.isFinite)) return null;
  const r = { ...DEFAULTS, ...landmarks }, [x, , z] = point;
  if (z > r.headZ) return 'head';
  if (z > r.neckZ) return 'neck';
  if (z < r.thighZ) return 'lowerLimb';
  if (Math.abs(x) > r.armX) return 'upperLimb';
  if (z > r.thoraxZ) return 'thorax';
  if (z < r.pelvisZ) return 'pelvis';
  return 'abdomen';
}

export function insideAcquisition(point, bounds, marginMM = 2) {
  if (!point || !bounds || !Array.isArray(bounds.lo) || !Array.isArray(bounds.hi)) return false;
  return point.every((n, i) => Number.isFinite(n) &&
    n >= bounds.lo[i] + marginMM && n <= bounds.hi[i] - marginMM);
}

/** Return what can TRUTHFULLY be shown, using shipped atlas CT coverage.
 * 'available' means only that a synthetic acquisition volume is present,
 * not that every organ in the region is complete or clinically validated.
 */
export function imagingAvailability({ point, bounds, landmarks = {}, dataset = 'atlas' }) {
  const region = regionAtLPS(point, landmarks);
  if (!region) return { region: null, regionLabel: 'Region belum diketahui', available: false,
    message: 'Tempatkan probe pada kulit pasien untuk menentukan region.' };
  const regionLabel = REGION_NAMES[region];
  const withinBounds = insideAcquisition(point, bounds);
  const available = withinBounds && (dataset !== 'atlas' || ACQUIRED.has(region));
  let message;
  if (available) message = `${regionLabel}: CT sintetis edukatif tersedia (bukan citra pasien).`;
  else if (dataset === 'atlas' && !ACQUIRED.has(region))
    message = `${regionLabel}: data CT/USG simulasi belum tersedia. Probe dapat diposisikan, tetapi tidak ada citra yang ditampilkan.`;
  else
    message = `${regionLabel}: di luar batas akuisisi CT saat ini. Tidak ada data pencitraan di lokasi ini.`;
  return { region, regionLabel, withinBounds, available, message };
}
