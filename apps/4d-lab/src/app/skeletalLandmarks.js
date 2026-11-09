// Read-only skeletal landmark audit for the 4D Lab. This is NOT an annotation renderer.
// Existing pilot data is NOT_MAPPED and uses a pre-quarantine skeletal model SHA.
// Never derive marker coordinates from a bone bounding box, name, or stale surface index.
export const PILOT_PART = 'Humerus.r';
export const LEGACY_WITHHELD_SKELETAL_SHA = 'c2b70b31ddec4062cbc5ba969fc24ecfed61d00397a0bca795e2701d997200f8';
const STATUS = new Set(['NOT_MAPPED', 'DRAFT', 'ANNOTATED', 'REVIEWED', 'VERIFIED']);
const SHA256 = /^[a-f0-9]{64}$/;

export function summarizeSkeletalPilot(registry, document) {
  if (registry?.schemaVersion !== 1 || !Array.isArray(registry.entries) ||
      !registry.entries.some(e => e.partId === PILOT_PART && e.system === 'skeletal' && e.url === 'skeletal/humerus.r.json')) {
    throw new Error('Registry anotasi humerus tidak cocok dengan pilot.');
  }
  const src = document?.spatialSource;
  if (document?.schemaVersion !== 1 || src?.provider !== 'Z-Anatomy' ||
      src.partId !== PILOT_PART || src.system !== 'skeletal' ||
      !SHA256.test(src.modelSha256) || !Array.isArray(document.landmarks) ||
      document.landmarks.length !== 6) {
    throw new Error('Dokumen landmark humerus tidak sesuai skema pilot.');
  }
  const seen = new Set();
  const landmarks = document.landmarks.map(l => {
    if (!l || typeof l.id !== 'string' || seen.has(l.id) ||
        l.parentPart !== PILOT_PART || !STATUS.has(l.status) ||
        typeof l.name_en !== 'string' || !l.name_en.trim() ||
        typeof l.name_la !== 'string' || !l.name_la.trim()) {
      throw new Error('Entri landmark tidak valid.');
    }
    seen.add(l.id);
    // This screen is an AUDIT, not a spatial annotation renderer. No geometry
    // should be passed to the patient scene without remapping and reviewing it.
    return Object.freeze({
      id: l.id, name: l.name_en, latin: l.name_la, status: l.status,
      hasGeometry: l.geometry !== null && l.geometry !== undefined,
    });
  });
  const staleSource = src.modelSha256 === LEGACY_WITHHELD_SKELETAL_SHA;
  const unmapped = landmarks.filter(l => l.status === 'NOT_MAPPED').length;
  // A draft status alone does not imply a mapped anatomical surface.
  const mapped = landmarks.filter(l => l.status !== 'NOT_MAPPED' && l.hasGeometry).length;
  return Object.freeze({
    partId: PILOT_PART, total: landmarks.length, unmapped,
    mapped, staleSource,
    sourceStatus: staleSource ? 'Model skeletal lama (sebelum karantina lisensi)' : 'Belum diverifikasi terhadap SHA model aktif',
    renderableMarkers: 0, // explicitly no pin renderer until source+surface validation
    landmarks: Object.freeze(landmarks),
  });
}

/** Load only the explicitly allowlisted annotation file from the shared Atlas origin.
 * Failure leaves the main CT/USG and 3D scene untouched.
 */
export async function loadSkeletalPilot(base, fetcher = fetch) {
  const dir = (base.endsWith('/') ? base : base + '/') + 'data/annotations/';
  const read = async (path) => {
    const response = await fetcher(dir + path);
    if (!response?.ok) throw new Error('Anotasi tidak dapat dimuat (HTTP ' + (response?.status ?? '?') + ').');
    return response.json();
  };
  const registry = await read('registry.json');
  // Fixed allowlisted path; never turn a registry URL into an arbitrary fetch.
  const document = await read('skeletal/humerus.r.json');
  return summarizeSkeletalPilot(registry, document);
}
