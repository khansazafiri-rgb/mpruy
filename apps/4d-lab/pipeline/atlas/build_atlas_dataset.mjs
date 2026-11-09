// Build the MEDCOEL ATLAS-DERIVED synthetic dataset for the 4D Lab.
//
//   node pipeline/atlas/build_atlas_dataset.mjs [--out public/data/atlas]
//
// Input : the MEDCOEL Anatomy Atlas GLBs (apps/anatomy/public/models, BodyParts3D/Z-Anatomy derived).
// Output: ct.nrrd + labels.nrrd (synthetic CT voxelised FROM the atlas meshes), skin.glb (an
//         illustrative body shell derived from the atlas musculoskeletal envelope), anatomy.json
//         (physiology/landmark/auscultation/view parameters fitted to the atlas geometry) and
//         registration.json (CT <-> mesh registration in the existing medcoel.patient.v2 schema).
//
// Coordinate frames (all explicit, see ATLAS_INTEGRATION_AUDIT.md):
//   atlas  : glTF metres, +X patient left, +Y superior, +Z anterior (as shipped by the atlas)
//   LPS    : millimetres, +x left, +y posterior, +z superior; z = 0 at the xiphoid tip
//   ATLAS_TO_LPS = [[1000,0,0,0],[0,0,-1000,0],[0,1000,0,-1000*Y0],[0,0,0,1]]  (rigid + unit change)
// The CT is generated in LPS from the atlas meshes, so atlas <-> CT correspondence is exact by
// construction. It is NOT an acquired image and NOT registered to any real subject.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAtlasSystem, ATLAS_ROOT } from '../../tools/atlas-node.mjs';
import { Grid, voxelizeStructure, voxelizeSigned, edt, fillHoles, gaussian, trilinear, surfaceNets, edgeStats, meshVolumeMl } from './voxel.mjs';
import { writeNrrd, readNrrd, encodeGlb } from './io.mjs';
import { clinicalPose } from '../../src/core/probe.js';

// ------------------------------------------------------------------ licence quarantine (fail closed)
// licensing/quarantine-policy.json lists atlas systems and structures that are withheld from public
// builds. They must never contribute to this adaptation (CT, labels, skin, landmarks, views).
const POLICY = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../../../../licensing/quarantine-policy.json', import.meta.url)), 'utf8'));
const QUARANTINED_SYSTEMS = new Set(Object.keys(POLICY.quarantinedSystems));
const QUARANTINED_STRUCTURES = new Set(Object.values(POLICY.quarantinedStructures).flat());
const QUARANTINED_HASHES = new Set(POLICY.quarantinedFiles.map((f) => f.sha256));
const INPUT_SYSTEMS = ['skeletal', 'muscular', 'visceral', 'joints', 'lymphatic', 'cardiovascular'].filter((s) => !QUARANTINED_SYSTEMS.has(s));
// Label ids whose only source is withheld anatomy: kept in the table (ids are shared with the phantom)
// but marked unavailable, so the UI can say so instead of showing a substitute.
const UNAVAILABLE_LABELS = { 20: 'Ginjal (Kidney.l/.r) ditahan karena lisensi (CC BY-NC 4.0, lissiecowley).', 21: 'Pelvis renalis ditahan bersama ginjal.', 35: 'Medula spinalis berasal dari nervous.glb yang ditahan karena lisensi.' };

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, '../..');
const args = process.argv.slice(2);
const OUT = path.resolve(APP, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'public/data/atlas');
const S = 2.5; // voxel size mm
const FAT_MM = 8; // illustrative subcutaneous fat + skin thickness over the atlas muscle envelope (assumption)
const CLOSE_MM = 6; // morphological closing radius used to merge muscles/bones into one envelope
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

// ------------------------------------------------------------------ label table (ids shared with the phantom)
const LABELS = {
  0: ['air', 'Air (outside body)', 'Udara', -1000, 'air', 'none', [0, 0, 0]],
  1: ['skin', 'Skin (illustrative shell)', 'Kulit (cangkang ilustratif)', 40, 'skin', 'integument', [214, 160, 130]],
  2: ['fat', 'Fat / unlabelled soft tissue', 'Lemak / jaringan lunak tanpa label', -100, 'fat', 'integument', [240, 214, 120]],
  3: ['muscle', 'Skeletal muscle (atlas)', 'Otot rangka (atlas)', 50, 'muscle', 'musculoskeletal', [178, 70, 60]],
  4: ['bone', 'Cortical bone (atlas)', 'Tulang kortikal (atlas)', 900, 'bone', 'musculoskeletal', [236, 230, 210]],
  5: ['marrow', 'Cancellous bone / marrow', 'Tulang spons / sumsum', 260, 'bone', 'musculoskeletal', [220, 200, 170]],
  6: ['cartilage', 'Costal cartilage / symphysis', 'Kartilago kosta / simfisis', 120, 'cartilage', 'musculoskeletal', [190, 220, 230]],
  7: ['lung_r', 'Right lung (aerated)', 'Paru kanan', -850, 'lung', 'respiratory', [240, 150, 170]],
  8: ['lung_l', 'Left lung (aerated)', 'Paru kiri', -850, 'lung', 'respiratory', [240, 160, 180]],
  9: ['myocardium', 'Myocardium / valve leaflets', 'Miokardium / daun katup', 110, 'myocardium', 'cardiovascular', [190, 40, 50]],
  10: ['lv', 'Left ventricular cavity (blood)', 'Rongga ventrikel kiri', 200, 'blood', 'cardiovascular', [230, 60, 60]],
  11: ['rv', 'Right ventricular cavity (blood)', 'Rongga ventrikel kanan', 190, 'blood', 'cardiovascular', [90, 90, 220]],
  12: ['la', 'Left atrial cavity (blood)', 'Rongga atrium kiri', 200, 'blood', 'cardiovascular', [240, 90, 90]],
  13: ['ra', 'Right atrial cavity (blood)', 'Rongga atrium kanan', 185, 'blood', 'cardiovascular', [110, 110, 230]],
  14: ['aorta', 'Aorta / common iliac arteries (lumen)', 'Aorta / a. iliaka komunis', 220, 'blood', 'cardiovascular', [220, 40, 40]],
  15: ['vena_cava', 'Great veins: venae cavae, brachiocephalic, iliac, pulmonary veins', 'Vena besar: kava, brakiosefalika, iliaka, pulmonalis', 170, 'blood', 'cardiovascular', [60, 80, 200]],
  16: ['pulmonary_artery', 'Pulmonary trunk / arteries (lumen)', 'Trunkus / a. pulmonalis', 200, 'blood', 'cardiovascular', [110, 80, 210]],
  17: ['liver', 'Liver', 'Hati', 105, 'liver', 'digestive', [150, 60, 45]],
  18: ['gallbladder', 'Gallbladder (bile)', 'Kandung empedu', 10, 'fluid', 'digestive', [80, 160, 70]],
  19: ['spleen', 'Spleen', 'Limpa', 115, 'spleen', 'lymphatic', [130, 50, 90]],
  20: ['kidney', 'Kidney (parenchyma)', 'Ginjal', 160, 'kidney', 'urinary', [170, 80, 70]],
  21: ['renal_sinus', 'Renal pelvis / sinus', 'Pelvis / sinus renal', -80, 'sinus_fat', 'urinary', [250, 230, 150]],
  22: ['stomach_wall', 'Stomach wall', 'Dinding lambung', 70, 'gi_wall', 'digestive', [220, 130, 120]],
  23: ['stomach_content', 'Gastric fluid content (assumed)', 'Isi cairan lambung (asumsi)', 12, 'gi_fluid', 'digestive', [120, 170, 200]],
  24: ['gas', 'Intraluminal gas (assumed)', 'Gas lumen (asumsi)', -980, 'gas', 'digestive', [30, 30, 30]],
  25: ['bowel_wall', 'Duodenal / jejunal wall', 'Dinding duodenum / jejunum', 70, 'gi_wall', 'digestive', [230, 160, 140]],
  26: ['bowel_content', 'Small bowel content (assumed)', 'Isi usus halus (asumsi)', 20, 'gi_fluid', 'digestive', [150, 190, 200]],
  27: ['colon_wall', 'Colon wall', 'Dinding kolon', 60, 'gi_wall', 'digestive', [200, 140, 110]],
  28: ['colon_content', 'Colonic content (assumed)', 'Isi kolon (asumsi)', -20, 'stool', 'digestive', [140, 110, 80]],
  29: ['pancreas', 'Pancreas', 'Pankreas', 90, 'pancreas', 'digestive', [230, 190, 120]],
  30: ['bladder', 'Urinary bladder (urine)', 'Kandung kemih', 8, 'fluid', 'urinary', [230, 220, 90]],
  31: ['diaphragm', 'Diaphragm', 'Diafragma', 55, 'muscle', 'respiratory', [200, 90, 80]],
  35: ['cord', 'Spinal cord / cauda equina', 'Medula spinalis', 35, 'brain', 'nervous', [240, 230, 200]],
  36: ['disc', 'Intervertebral disc', 'Diskus intervertebralis', 85, 'cartilage', 'musculoskeletal', [160, 200, 220]],
  37: ['esophagus', 'Oesophagus', 'Esofagus', 55, 'gi_wall', 'digestive', [220, 140, 130]],
  39: ['pleural_fluid', 'Pleural fluid (pathology layer)', 'Cairan pleura', 12, 'fluid', 'respiratory', [90, 170, 255]],
  40: ['airway', 'Trachea / bronchi (air)', 'Trakea / bronkus', -990, 'gas', 'respiratory', [60, 60, 60]],
  41: ['atelectasis', 'Compressed (atelectatic) lung (pathology layer)', 'Paru kolaps', 40, 'atelectasis', 'respiratory', [200, 100, 120]],
  43: ['bladder_wall', 'Urinary bladder wall', 'Dinding kandung kemih', 45, 'gi_wall', 'urinary', [210, 190, 80]],
  42: ['gland', 'Glandular soft tissue (thyroid, adrenal, prostate)', 'Jaringan kelenjar (tiroid, adrenal, prostat)', 60, 'pancreas', 'endocrine', [200, 170, 120]],
};

// Structure -> label rules. Order = painting order (later wins).
const RULES = [
  { label: 3, sys: 'muscular', test: (n) => !/fascia|aponeuros|sheath|retinacul|tendon|ligament|membrane|septum|Diaphragm/i.test(n), mode: 'solid' },
  { label: 31, sys: 'muscular', test: (n) => n === 'Diaphragm', mode: 'solid' },
  { label: 'bone', sys: 'skeletal', test: (n) => !/Costal cartilage/.test(n), mode: 'solid' },
  { label: 6, sys: 'skeletal', test: (n) => /Costal cartilage/.test(n), mode: 'solid' },
  { label: 36, sys: 'joints', test: (n) => /^Intervertebral disc/.test(n), mode: 'solid' },
  { label: 6, sys: 'joints', test: (n) => /^(Pubic symphysis|Interpubic disc)$/.test(n), mode: 'solid' },
  { label: 7, sys: 'visceral', test: (n) => /lobe of right lung$/.test(n), mode: 'solid' },
  { label: 8, sys: 'visceral', test: (n) => /lobe of left lung$/.test(n), mode: 'solid' },
  { label: 40, sys: 'visceral', test: (n) => /^Trachea$|bronch/i.test(n), mode: 'solid' },
  { label: 17, sys: 'visceral', test: (n) => /^Liver$|segment of liver/.test(n), mode: 'solid' },
  { label: 18, sys: 'visceral', test: (n) => n === 'Gallbladder', mode: 'solid' },
  { label: 19, sys: 'lymphatic', test: (n) => n === 'Spleen', mode: 'solid' },
  { label: 42, sys: 'visceral', test: (n) => /^(Suprarenal gland|Thyroid gland|Prostate|Seminal gland)/.test(n), mode: 'solid' },
  { label: 29, sys: 'visceral', test: (n) => n === 'Pancreas', mode: 'solid' },
  { label: 'bladder', sys: 'visceral', test: (n) => n === 'Urinary bladder', mode: 'solid' },
  { label: 'stomach', sys: 'visceral', test: (n) => n === 'Stomach', mode: 'solid' },
  { label: 37, sys: 'visceral', test: (n) => n === 'Oesophagus', mode: 'solid' },
  { label: 'bowel', sys: 'visceral', test: (n) => /^(Duodenum|Jejunum)$/.test(n), mode: 'solid' },
  { label: 'colon', sys: 'visceral', test: (n) => /colon$|^Vermiform appendix$/.test(n), mode: 'solid' },
  { label: 14, sys: 'cardiovascular', test: (n) => /^(Ascending aorta|Aortic arch|Thoracic aorta|Abdominal aorta|Common iliac artery\.[lr])$/.test(n), mode: 'solid' },
  { label: 15, sys: 'cardiovascular', test: (n) => /^(Superior vena cava|Inferior vena cava.*|Left brachiocephalic vein|Right brachiocephalic vein|Common iliac vein\.[lr]|(Left|Right) (superior|inferior) pulmonary vein|Coronary sinus)$/.test(n), mode: 'solid' },
  { label: 16, sys: 'cardiovascular', test: (n) => /^(Pulmonary trunk|Bifurcation of pulmonary trunk|Left pulmonary artery|Right pulmonary artery)$/.test(n), mode: 'solid' },
  { label: 'heart', sys: 'cardiovascular', test: (n) => /^(Left|Right) (ventricle|atrium)$/.test(n), mode: 'heart' },
  { label: 9, sys: 'cardiovascular', test: (n) => /papillary muscle/.test(n), mode: 'solid' },
  { label: 9, sys: 'cardiovascular', test: (n) => /leaflet/.test(n), mode: 'band' },
];
// Atlas convention found by inspection (see ATLAS_INTEGRATION_AUDIT.md): every chamber mesh is a WALL shell
// (endocardial + epicardial surface) with open valve/vessel orifices. Walls: parity restricted to a realistic
// thickness band from the surface. Blood: closed heart envelope (vessel lumens plug the orifices) minus walls.
const CHAMBER = { 'Left ventricle': { blood: 10, maxT: 13 }, 'Right ventricle': { blood: 11, maxT: 5 }, 'Left atrium': { blood: 12, maxT: 4 }, 'Right atrium': { blood: 13, maxT: 4 } };
function components(P, I) { // split a triangle mesh into connected components (vertices welded by position)
  const key = new Map(), id = new Int32Array(P.length / 3);
  for (let i = 0; i < id.length; i++) { const k = P[3 * i].toFixed(3) + ',' + P[3 * i + 1].toFixed(3) + ',' + P[3 * i + 2].toFixed(3); if (!key.has(k)) key.set(k, i); id[i] = key.get(k); }
  const par = Int32Array.from({ length: id.length }, (_, i) => i), f = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < I.length; t += 3) { const a = f(id[I[t]]), b = f(id[I[t + 1]]), c = f(id[I[t + 2]]); par[b] = a; par[f(c)] = a; }
  const comp = new Map(); for (let t = 0; t < I.length; t += 3) { const c = f(id[I[t]]); if (!comp.has(c)) comp.set(c, []); comp.get(c).push(I[t], I[t + 1], I[t + 2]); }
  return [...comp.values()].map((ix) => Uint32Array.from(ix));
}
const ENVELOPE_SYSTEMS = ['skeletal', 'muscular', 'visceral', 'joints'];

// ------------------------------------------------------------------ load atlas
log('reading atlas GLBs from', ATLAS_ROOT);
const atlas = {};
const SOURCE_HASHES = {};
for (const sys of INPUT_SYSTEMS) {
  const file = path.join(ATLAS_ROOT, 'models', sys + '.glb');
  SOURCE_HASHES[sys + '.glb'] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (QUARANTINED_HASHES.has(SOURCE_HASHES[sys + '.glb'])) throw new Error(`${sys}.glb is a quarantined original (licensing/quarantine-policy.json); use the cleared public file`);
  const need = sys === 'cardiovascular' || sys === 'lymphatic' ? (n) => RULES.some((r) => r.sys === sys && r.test(n)) : null;
  atlas[sys] = await readAtlasSystem(sys, { geometry: true, filter: need });
  const leaked = [...atlas[sys].structures.keys()].filter((n) => QUARANTINED_STRUCTURES.has(n));
  if (leaked.length) throw new Error(`quarantined structures present in ${sys}.glb: ${leaked.join(', ')}`);
  log(` ${sys}: ${atlas[sys].structures.size} structures`);
}
const S_ = (sys, name) => atlas[sys].structures.get(name);

// Y0: xiphoid tip (lowest point of the Xiphoid process) defines LPS z = 0, as in the phantom.
const xiphoid = S_('skeletal', 'Xiphoid process');
let Y0 = Infinity; for (let i = 1; i < xiphoid.positions.length; i += 3) Y0 = Math.min(Y0, xiphoid.positions[i]);
Y0 = Math.round(Y0 * 1e4) / 1e4;
const ATLAS_TO_LPS = [1000, 0, 0, 0, 0, 0, -1000, 0, 0, 1000, 0, -1000 * Y0, 0, 0, 0, 1];
const toLPS = (P) => { const o = new Float32Array(P.length); for (let i = 0; i < P.length; i += 3) { o[i] = 1000 * P[i]; o[i + 1] = -1000 * P[i + 2]; o[i + 2] = 1000 * (P[i + 1] - Y0); } return o; };
const lpsToAtlas = (p) => [p[0] / 1000, p[2] / 1000 + Y0, -p[1] / 1000];
for (const sys of Object.values(atlas)) for (const s of sys.structures.values()) if (s.positions) s.lps = toLPS(s.positions);
log(`Y0 (xiphoid tip) = ${Y0} m`);

// ------------------------------------------------------------------ full-body envelope
let bmin = [Infinity, Infinity, Infinity], bmax = [-Infinity, -Infinity, -Infinity];
for (const sys of ENVELOPE_SYSTEMS) for (const s of atlas[sys].structures.values()) if (s.lps) for (let i = 0; i < s.lps.length; i += 3) for (let d = 0; d < 3; d++) { bmin[d] = Math.min(bmin[d], s.lps[i + d]); bmax[d] = Math.max(bmax[d], s.lps[i + d]); }
const margin = FAT_MM + CLOSE_MM + 3 * S;
// lattice anchored at LPS multiples of S so the CT grid is an exact sub-lattice
const G1 = new Grid(bmin.map((v) => Math.floor((v - margin) / S) * S), bmax.map((v) => Math.ceil((v + margin) / S) * S), S);
log('envelope grid', G1.n.join('x'), (G1.size / 1e6).toFixed(1) + 'M voxels');
// Two envelopes: upper limbs and everything else. Built separately so the closing/fat offset never fuses the
// arms (anatomical position, hanging at the sides) to the lateral chest wall; united only as signed distances.
const CATALOG = JSON.parse(fs.readFileSync(path.join(ATLAS_ROOT, 'data/atlas-catalog.json'), 'utf8'));
const isArm = (name) => { const r = CATALOG[name]?.regions || []; return r.includes('upperLimb') && !r.includes('thorax') && !r.includes('back') && !r.includes('headNeck'); };
const U = new Uint8Array(G1.size), UA = new Uint8Array(G1.size);
const methods = {};
function paint(grid, vol, sub, val, guard) {
  if (!sub) return 0; const { mask, i0, n } = sub; let c = 0;
  for (let z = 0; z < n[2]; z++) for (let y = 0; y < n[1]; y++) {
    let p = (z * n[1] + y) * n[0], g = grid.idx(i0[0], i0[1] + y, i0[2] + z);
    for (let x = 0; x < n[0]; x++, p++, g++) if (mask[p] && (!guard || guard(vol[g], g))) { vol[g] = val; c++; }
  }
  return c;
}
let armStructures = 0;
for (const sys of ENVELOPE_SYSTEMS) for (const s of atlas[sys].structures.values()) {
  if (!s.lps?.length) continue;
  const thin = /fascia|aponeuros|sheath|retinacul|membrane|ligament|Pleura|omentum|Meso/i.test(s.name);
  const sub = voxelizeStructure(G1, s.lps, s.indices, thin ? 'band' : 'solid');
  if (!thin) methods[sub.method] = (methods[sub.method] || 0) + 1;
  const arm = isArm(s.name); if (arm) armStructures++;
  paint(G1, arm ? UA : U, sub, 1);
}
log('envelope painted', methods, 'upper-limb structures', armStructures);
/** closed + filled envelope -> smoothed signed distance (mm, + outside) offset by `offset` mm */
function envelopeSDF(mask, offset) {
  let Dd = edt(mask, ...G1.n); const r = CLOSE_MM / S;
  const notDil = new Uint8Array(G1.size); for (let p = 0; p < notDil.length; p++) notDil[p] = Dd[p] <= r ? 0 : 1;
  Dd = edt(notDil, ...G1.n);
  const closed = new Uint8Array(G1.size); for (let p = 0; p < closed.length; p++) closed[p] = Dd[p] > r ? 1 : 0;
  const core = fillHoles(closed, ...G1.n);
  const dOut = edt(core, ...G1.n), inv = new Uint8Array(G1.size); for (let p = 0; p < inv.length; p++) inv[p] = core[p] ? 0 : 1;
  const dIn = edt(inv, ...G1.n), F = new Float32Array(G1.size);
  for (let p = 0; p < F.length; p++) F[p] = (core[p] ? -(dIn[p] - 0.5) : dOut[p] - 0.5) * S - offset;
  return gaussian(F, ...G1.n, 1.1);
}
const ARM_FAT_MM = 5;
const SDF = envelopeSDF(U, FAT_MM);
{ const SA = envelopeSDF(UA, ARM_FAT_MM); for (let p = 0; p < SDF.length; p++) if (SA[p] < SDF[p]) SDF[p] = SA[p]; }

const sdfAt = (x, y, z) => trilinear(SDF, ...G1.n, (x - G1.lo[0]) / S, (y - G1.lo[1]) / S, (z - G1.lo[2]) / S);
log('body SDF ready');

// skin surface (illustrative shell) by surface nets on the smoothed SDF
const SKIN_H = 5;
const net = surfaceNets(sdfAt, G1.lo.map((v) => v + S), G1.lo.map((v, d) => v + (G1.n[d] - 2) * S), SKIN_H);
// light Laplacian relaxation keeps vertices on the iso-surface (re-projected along the SDF gradient)
{
  const P = net.positions, I = net.indices, nv = P.length / 3, nb = Array.from({ length: nv }, () => []);
  for (let t = 0; t < I.length; t += 3) for (let a = 0; a < 3; a++) { nb[I[t + a]].push(I[t + (a + 1) % 3]); }
  for (let it = 0; it < 3; it++) {
    const Q = Float32Array.from(P);
    for (let v = 0; v < nv; v++) { let sx = 0, sy = 0, sz = 0; for (const w of nb[v]) { sx += P[3 * w]; sy += P[3 * w + 1]; sz += P[3 * w + 2]; } const c = nb[v].length || 1; Q[3 * v] = 0.5 * P[3 * v] + 0.5 * sx / c; Q[3 * v + 1] = 0.5 * P[3 * v + 1] + 0.5 * sy / c; Q[3 * v + 2] = 0.5 * P[3 * v + 2] + 0.5 * sz / c; }
    for (let v = 0; v < nv; v++) {
      const x = Q[3 * v], y = Q[3 * v + 1], z = Q[3 * v + 2], h = 0.6, f0 = sdfAt(x, y, z);
      const g = [sdfAt(x + h, y, z) - sdfAt(x - h, y, z), sdfAt(x, y + h, z) - sdfAt(x, y - h, z), sdfAt(x, y, z + h) - sdfAt(x, y, z - h)].map((c) => c / (2 * h));
      const gg = g[0] ** 2 + g[1] ** 2 + g[2] ** 2 || 1;
      P[3 * v] = x - f0 * g[0] / gg; P[3 * v + 1] = y - f0 * g[1] / gg; P[3 * v + 2] = z - f0 * g[2] / gg;
    }
  }
}
const skinStats = edgeStats(net.indices);
log(`skin shell: ${net.positions.length / 3} vertices, ${net.indices.length / 3} triangles, boundary ${skinStats.boundary}, non-manifold ${skinStats.nonManifold}, volume ${meshVolumeMl(net.positions, net.indices).toFixed(0)} mL`);

// ------------------------------------------------------------------ landmarks from the atlas skeleton
const vertsOf = (sys, name) => S_(sys, name)?.lps;
function extreme(P, fn, filter = () => true) { let best = null, bv = -Infinity; for (let i = 0; i < P.length; i += 3) { const p = [P[i], P[i + 1], P[i + 2]]; if (!filter(p)) continue; const v = fn(p); if (v > bv) { bv = v; best = p; } } return best; }
const centroidOf = (P) => { const c = [0, 0, 0]; for (let i = 0; i < P.length; i += 3) { c[0] += P[i]; c[1] += P[i + 1]; c[2] += P[i + 2]; } return c.map((v) => v / (P.length / 3)); };
const manub = vertsOf('skeletal', 'Manubrium of sternum'), sternum = vertsOf('skeletal', 'Body of sternum');
const symph = vertsOf('joints', 'Pubic symphysis') || vertsOf('joints', 'Interpubic disc');
const disc34 = vertsOf('joints', 'Intervertebral disc L3-L4');
const LM = {
  sternal_notch: { z: extreme(manub, (p) => p[2], (p) => Math.abs(p[0]) < 8)[2], how: 'highest midline point of the atlas manubrium' },
  sternal_angle: { z: extreme(manub, (p) => -p[2], (p) => Math.abs(p[0]) < 8)[2], how: 'manubriosternal junction (lowest midline manubrium point)' },
  xiphoid: { z: 0, how: 'xiphoid process tip (defines z = 0)' },
  umbilicus: { z: centroidOf(disc34)[2], how: 'APPROXIMATE: L3-L4 disc level (surface-anatomy rule); the atlas has no umbilicus', approximate: true },
  pubic_symphysis: { z: extreme(symph, (p) => p[2])[2], how: 'upper border of the atlas pubic symphysis' },
};
log('landmarks z (mm):', Object.fromEntries(Object.entries(LM).map(([k, v]) => [k, +v.z.toFixed(1)])));

// ------------------------------------------------------------------ CT grid (chest-abdomen-pelvis coverage)
const zLo = Math.floor((LM.pubic_symphysis.z - 140) / S) * S, zHi = Math.ceil((LM.sternal_notch.z + 115) / S) * S;
const G2 = new Grid([-262.5, Math.floor((bmin[1] - FAT_MM - 15) / S) * S, zLo], [262.5, Math.ceil((bmax[1] + FAT_MM + 15) / S) * S, zHi], S);
const g1Index = (i, j, k) => G1.idx(i + Math.round((G2.lo[0] - G1.lo[0]) / S), j + Math.round((G2.lo[1] - G1.lo[1]) / S), k + Math.round((G2.lo[2] - G1.lo[2]) / S));
log('CT grid', G2.n.join('x'), 'lo', G2.lo, (G2.size / 1e6).toFixed(1) + 'M voxels');
const L = new Uint8Array(G2.size), body = new Uint8Array(G2.size), sdf2 = new Float32Array(G2.size);
for (let k = 0; k < G2.n[2]; k++) for (let j = 0; j < G2.n[1]; j++) for (let i = 0; i < G2.n[0]; i++) {
  const p = G2.idx(i, j, k), v = SDF[g1Index(i, j, k)]; sdf2[p] = v;
  if (v < 0) { body[p] = 1; L[p] = v > -2 ? 1 : 2; }
}
const inBody = (cur, g) => body[g] === 1;
const structLabels = {}, heartWalls = {}, heartThin = {};
const boneMask = new Uint8Array(G2.size);
for (const rule of RULES) {
  for (const s of atlas[rule.sys].structures.values()) {
    if (!s.lps?.length || !rule.test(s.name)) continue;
    // skip structures fully outside the CT grid
    let any = false; for (let i = 2; i < s.lps.length; i += 3) if (s.lps[i] > G2.lo[2] && s.lps[i] < zHi) { any = true; break; }
    if (!any) continue;
    const ch = CHAMBER[s.name];
    if (rule.mode === 'heart') {
      const sub = voxelizeStructure(G2, s.lps, s.indices, 'wall', ch.maxT), m = new Uint8Array(G2.size);
      paint(G2, m, sub, 1); heartWalls[s.name] = m; paint(G2, L, sub, 9, inBody);
      { const t = new Uint8Array(G2.size); paint(G2, t, { ...sub, mask: sub.thin }, 1); heartThin[s.name] = t; }
      continue;
    }
    const sub = voxelizeStructure(G2, s.lps, s.indices, rule.mode);
    if (!sub) continue;
    if (rule.label === 'bone') { paint(G2, boneMask, sub, 1); paint(G2, L, sub, 4, inBody); }
    else if (typeof rule.label === 'number') paint(G2, L, sub, rule.label, inBody);
    else { const m = new Uint8Array(G2.size); paint(G2, m, sub, 1); structLabels[rule.label] = structLabels[rule.label] ? orMask(structLabels[rule.label], m) : m; }
  }
}
function orMask(a, b) { for (let p = 0; p < a.length; p++) a[p] |= b[p]; return a; }
log('structures painted');
// bone: cortex 2.5 mm, marrow deeper
{ const inv2 = new Uint8Array(G2.size); for (let p = 0; p < inv2.length; p++) inv2[p] = boneMask[p] ? 0 : 1; const Dn = edt(inv2, ...G2.n); for (let p = 0; p < L.length; p++) if (L[p] === 4 && Dn[p] > 1.5) L[p] = 5; }
// hollow viscera: wall + content (+ dependent/non-dependent assumptions, labelled as such)
function hollow(mask, wallLab, contentLab, wallMM, gasLab = null, gasFrac = 0, gasTopMM = Infinity) {
  const inv3 = new Uint8Array(G2.size); for (let p = 0; p < inv3.length; p++) inv3[p] = mask[p] ? 0 : 1;
  const Dn = edt(inv3, ...G2.n); let ymin = Infinity, ymax = -Infinity, ztop = -Infinity;
  for (let k = 0; k < G2.n[2]; k++) for (let j = 0; j < G2.n[1]; j++) for (let i = 0; i < G2.n[0]; i++) { const p = G2.idx(i, j, k); if (mask[p] && body[p]) { const y = G2.lo[1] + j * S; ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); ztop = Math.max(ztop, G2.lo[2] + k * S); } }
  for (let k = 0; k < G2.n[2]; k++) for (let j = 0; j < G2.n[1]; j++) for (let i = 0; i < G2.n[0]; i++) {
    const p = G2.idx(i, j, k); if (!mask[p] || !body[p]) continue;
    const y = G2.lo[1] + j * S;
    const z = G2.lo[2] + k * S;
    L[p] = Dn[p] * S <= wallMM ? wallLab : gasLab && y < ymin + gasFrac * (ymax - ymin) && z > ztop - gasTopMM ? gasLab : contentLab;
  }
  return Dn;
}
// ASSUMPTION (labelled 'assumed' in the label table): fluid-filled stomach as after a drink of water (the usual
// antral ultrasound protocol), with a gas cap only in the fundus/upper body (non-dependent, anterior in supine).
const stomachDT = hollow(structLabels.stomach, 22, 23, 4.5, 24, 0.4, 45);
// the atlas bladder is a wall shell (outer + inner surface): fill its lumen (closing seals the urethral opening)
{
  const W = structLabels.bladder, Dd = edt(W, ...G2.n), R = 4 / S + 0.01, dl = new Uint8Array(G2.size);
  for (let p = 0; p < dl.length; p++) dl[p] = Dd[p] <= R ? 0 : 1;
  const D2 = edt(dl, ...G2.n), cl = new Uint8Array(G2.size); for (let p = 0; p < cl.length; p++) cl[p] = D2[p] > R ? 1 : 0;
  const filled = fillHoles(cl, ...G2.n); let urine = 0;
  for (let p = 0; p < L.length; p++) { if (!body[p]) continue; if (W[p]) L[p] = 43; else if (filled[p] && [2, 3].includes(L[p])) { L[p] = 30; urine++; } }
  log('bladder lumen', (urine * S ** 3 / 1000).toFixed(0), 'mL');
}
hollow(structLabels.bowel, 25, 26, 3.0);
hollow(structLabels.colon, 27, 28, 3.0, 24, 0.15);
// heart blood pools: union of chamber walls, leaflets and great-vessel lumens (the lumens plug the
// orifices) closed by 4 mm and flood-filled inside the heart box; blood = enclosed voxels that are not
// wall/leaflet/vessel, assigned to the nearest chamber wall.
const bloodVol = {};
{
  const names = Object.keys(heartWalls), anyWall = new Uint8Array(G2.size);
  for (const nm of names) orMask(anyWall, heartWalls[nm]);
  const lo = [Infinity, Infinity, Infinity], hi = [-1, -1, -1];
  for (let k = 0; k < G2.n[2]; k++) for (let j = 0; j < G2.n[1]; j++) for (let i = 0; i < G2.n[0]; i++) if (anyWall[G2.idx(i, j, k)]) { lo[0] = Math.min(lo[0], i); lo[1] = Math.min(lo[1], j); lo[2] = Math.min(lo[2], k); hi[0] = Math.max(hi[0], i); hi[1] = Math.max(hi[1], j); hi[2] = Math.max(hi[2], k); }
  const a0 = lo.map((v) => Math.max(0, v - 6)), a1 = hi.map((v, d) => Math.min(G2.n[d] - 1, v + 6)), n = a1.map((v, d) => v - a0[d] + 1);
  const gi = (i, j, k) => G2.idx(i + a0[0], j + a0[1], k + a0[2]), sub = new Uint8Array(n[0] * n[1] * n[2]);
  for (let k = 0; k < n[2]; k++) for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++) { const p = gi(i, j, k); sub[(k * n[1] + j) * n[0] + i] = anyWall[p] || [9, 14, 15, 16].includes(L[p]) ? 1 : 0; }
  const R = 4 / S + 0.01;
  let Dd = edt(sub, ...n); const dl = new Uint8Array(sub.length); for (let p = 0; p < sub.length; p++) dl[p] = Dd[p] <= R ? 0 : 1;
  Dd = edt(dl, ...n); const cl = new Uint8Array(sub.length); for (let p = 0; p < sub.length; p++) cl[p] = Dd[p] > R ? 1 : 0;
  const filled = fillHoles(cl, ...n), dist = names.map((nm) => edt(heartWalls[nm], ...G2.n));
  for (let k = 0; k < n[2]; k++) for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++) {
    const p = gi(i, j, k); if (!filled[(k * n[1] + j) * n[0] + i] || anyWall[p] || !body[p] || [4, 5, 6, 9, 14, 15, 16, 40].includes(L[p])) continue;
    let bi = 0; for (let q = 1; q < names.length; q++) if (dist[q][p] < dist[bi][p]) bi = q;
    const b = CHAMBER[names[bi]].blood; L[p] = b; bloodVol[b] = (bloodVol[b] || 0) + S ** 3 / 1000;
  }
  // thin-walled chambers: blood reclaims the inner band voxels (thick seal minus thin wall) next to it
  for (let pass = 0; pass < 1; pass++) {
    const grow = [];
    for (const [nm, thin] of Object.entries(heartThin)) {
      const W = heartWalls[nm], b = CHAMBER[nm].blood;
      for (let p = 0; p < L.length; p++) {
        if (!W[p] || thin[p] || L[p] !== 9) continue;
        const nb = [p - 1, p + 1, p - G2.n[0], p + G2.n[0], p - G2.n[0] * G2.n[1], p + G2.n[0] * G2.n[1]];
        if (nb.some((q) => L[q] === b)) grow.push([p, b]);
      }
    }
    for (const [p, b] of grow) { L[p] = b; bloodVol[b] += S ** 3 / 1000; }
  }
  const wallMl = {}; names.forEach((nm) => { let c = 0; for (let p = 0; p < L.length; p++) if (heartWalls[nm][p]) c++; wallMl[nm] = Math.round(c * S ** 3 / 1000); });
  log('heart walls (mL):', JSON.stringify(wallMl), 'blood pools (mL):', JSON.stringify(Object.fromEntries(Object.entries(bloodVol).map(([k, v]) => [LABELS[k][0], Math.round(v)]))));
}
// keep airway/lung boundaries consistent: anything labelled lung outside the body stays air
for (let p = 0; p < L.length; p++) if (!body[p]) L[p] = 0;

// ------------------------------------------------------------------ CT intensities
const hu = new Float32Array(256).fill(-1000); for (const [k, row] of Object.entries(LABELS)) hu[k] = row[3];
let CTf = new Float32Array(G2.size); for (let p = 0; p < L.length; p++) CTf[p] = hu[L[p]];
CTf = gaussian(CTf, ...G2.n, 0.55);
const CT = new Int16Array(G2.size); for (let p = 0; p < CT.length; p++) CT[p] = Math.max(-1024, Math.min(3071, Math.round(CTf[p])));
log('CT synthesised');

// ------------------------------------------------------------------ helpers on the label grid
const labelAt = (x, y, z) => { const i = Math.round((x - G2.lo[0]) / S), j = Math.round((y - G2.lo[1]) / S), k = Math.round((z - G2.lo[2]) / S); return i < 0 || j < 0 || k < 0 || i >= G2.n[0] || j >= G2.n[1] || k >= G2.n[2] ? 0 : L[G2.idx(i, j, k)]; };
function voxelsOf(labs) { const pts = []; const set = new Set(labs); for (let k = 0; k < G2.n[2]; k++) for (let j = 0; j < G2.n[1]; j++) for (let i = 0; i < G2.n[0]; i++) if (set.has(L[G2.idx(i, j, k)])) pts.push(G2.pos(i, j, k)); return pts; }
const mean = (pts) => [0, 1, 2].map((d) => pts.reduce((a, p) => a + p[d], 0) / pts.length);
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], nrm = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function pcaAxis(pts, c) { // power iteration on the covariance
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of pts) { const d = sub3(p, c); for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) C[a][b] += d[a] * d[b]; }
  let v = [1, 0.3, 0.2]; for (let it = 0; it < 60; it++) v = nrm([0, 1, 2].map((a) => C[a][0] * v[0] + C[a][1] * v[1] + C[a][2] * v[2]));
  return v;
}
/** skin point + outward normal by walking from an inside point along dir until the SDF turns positive */
function skinAlong(from, dir, maxMM = 400) {
  const d = nrm(dir); let t = 0;
  if (sdfAt(...from) > 0) return null;
  while (t < maxMM && sdfAt(from[0] + d[0] * t, from[1] + d[1] * t, from[2] + d[2] * t) < 0) t += 0.5;
  let a = t - 0.5, b = t; for (let it = 0; it < 20; it++) { const m = (a + b) / 2; if (sdfAt(from[0] + d[0] * m, from[1] + d[1] * m, from[2] + d[2] * m) < 0) a = m; else b = m; }
  const p = [0, 1, 2].map((i) => from[i] + d[i] * a);
  return { point: p.map((v) => +v.toFixed(2)), normal: skinNormal(p) };
}
function skinNormal(p) { const h = 1; const g = [sdfAt(p[0] + h, p[1], p[2]) - sdfAt(p[0] - h, p[1], p[2]), sdfAt(p[0], p[1] + h, p[2]) - sdfAt(p[0], p[1] - h, p[2]), sdfAt(p[0], p[1], p[2] + h) - sdfAt(p[0], p[1], p[2] - h)]; return nrm(g).map((v) => +v.toFixed(4)); }
/** anterior/posterior skin point at (x, z): inside start at the body's AP centre */
function skinAP(x, z, side) {
  let lo = Infinity, hi = -Infinity; for (let y = -200; y <= 200; y += 1) if (sdfAt(x, y, z) < 0) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
  if (!isFinite(lo)) return null;
  return skinAlong([x, (lo + hi) / 2, z], side === 'anterior' ? [0, -1, 0] : [0, 1, 0]);
}
function skinLateral(z, side, y = 0) { return skinAlong([0, y, z], side === 'right' ? [-1, 0, 0] : [1, 0, 0]); }
const boneAlong = (p, n) => { for (let d = 2; d < 42; d += 1.5) { const l = labelAt(p[0] - n[0] * d, p[1] - n[1] * d, p[2] - n[2] * d); if (l === 4 || l === 5 || l === 6) return true; } return false; };

// ------------------------------------------------------------------ intercostal spaces from the atlas ribs
const ORD = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
const ORDl = ORD.map((o) => o.toLowerCase());
function ribZ(n, side, x, yMax) { // mean z of rib n (cartilage + bone) vertices near |x| on the anterior chest
  const pts = []; for (const name of [`Costal cartilage of ${ORDl[n - 1]} rib.${side}`, `${ORD[n - 1]} rib.${side}`]) { const P = vertsOf('skeletal', name); if (!P) continue; for (let i = 0; i < P.length; i += 3) if (Math.abs(P[i] - x) < 7 && P[i + 1] < yMax) pts.push(P[i + 2]); }
  if (!pts.length) return null; pts.sort((a, b) => a - b); return pts[Math.floor(pts.length / 2)];
}
const sternumHalf = Math.max(...(() => { const a = []; for (let i = 0; i < sternum.length; i += 3) a.push(Math.abs(sternum[i])); return a; })()) ;
const clav = vertsOf('skeletal', 'Clavicle.l'); let cx0 = Infinity, cx1 = -Infinity; for (let i = 0; i < clav.length; i += 3) { cx0 = Math.min(cx0, clav[i]); cx1 = Math.max(cx1, clav[i]); }
const LINES = { parasternal: sternumHalf + 12, mcl: (cx0 + cx1) / 2 };
function icsZ(n, side, x) { const a = ribZ(n, side, side === 'r' ? -x : x, 20), b = ribZ(n + 1, side, side === 'r' ? -x : x, 20); return a != null && b != null ? (a + b) / 2 : null; }
const ICS = {};
for (const side of ['r', 'l']) for (const [line, x] of Object.entries(LINES)) ICS[`${side}_${line}`] = Array.from({ length: 8 }, (_, i) => { const z = icsZ(i + 1, side, x); return z == null ? null : +z.toFixed(1); });
log('ICS z (left parasternal):', ICS.l_parasternal.join(', '));

// ------------------------------------------------------------------ physiology parameters fitted to the atlas
const lvPts = voxelsOf([10]), rvPts = voxelsOf([11]), laPts = voxelsOf([12]), raPts = voxelsOf([13]);
const lvC = mean(lvPts);
// long axis: PCA of the LV cavity, oriented base -> apex (toward patient left/anterior/inferior)
let e = pcaAxis(lvPts, lvC); if (dot3(e, [1, -1, -1]) < 0) e = e.map((v) => -v);
const sv = lvPts.map((p) => dot3(sub3(p, lvC), e)), rv2 = lvPts.map((p, i) => { const d = sub3(p, lvC); return dot3(d, d) - sv[i] ** 2; });
const aCav = Math.sqrt(5 * sv.reduce((s, v) => s + v * v, 0) / sv.length), bCav = Math.sqrt(2.5 * rv2.reduce((s, v) => s + v, 0) / rv2.length);
const u0 = nrm(cross3(e, [0, 0, 1])), v0 = cross3(e, u0);
// wall thickness: 90th percentile distance of LV-adjacent myocardium to the LV cavity
const lvMask = new Uint8Array(G2.size); for (let p = 0; p < L.length; p++) lvMask[p] = L[p] === 10 ? 1 : 0;
const Dlv = edt(lvMask, ...G2.n), wallD = [];
for (let p = 0; p < L.length; p++) if (L[p] === 9 && heartWalls['Left ventricle']?.[p] && Dlv[p] * S < 25) wallD.push(Dlv[p] * S);
wallD.sort((a, b) => a - b);
const lvWall = Math.max(7, Math.min(14, wallD[Math.floor(wallD.length * 0.9)] || 10));
const rvC = mean(rvPts), rvR = Math.sqrt(2.5 * rvPts.reduce((s, p) => { const d = sub3(p, rvC), t = dot3(d, e); return s + dot3(d, d) - t * t; }, 0) / rvPts.length);
const ell = (pts) => { const c = mean(pts); return { c: c.map((v) => +v.toFixed(1)), r: [0, 1, 2].map((d) => +Math.sqrt(5 * pts.reduce((s, p) => s + (p[d] - c[d]) ** 2, 0) / pts.length).toFixed(1)) }; };
const vox = S ** 3 / 1000;
const heart = {
  base: lvC.map((v, i) => +(v - aCav * e[i]).toFixed(2)), apex: lvC.map((v, i) => +(v + aCav * e[i]).toFixed(2)), lvCentre: lvC.map((v) => +v.toFixed(2)),
  axis: e.map((v) => +v.toFixed(5)), u: u0.map((v) => +v.toFixed(5)), v: v0.map((v) => +v.toFixed(5)),
  lvCavity: { a: +aCav.toFixed(1), b: +bCav.toFixed(1) }, lvWall: +lvWall.toFixed(1),
  rvCentre: rvC.map((v) => +v.toFixed(2)), rvCavity: { a: +aCav.toFixed(1), b: +rvR.toFixed(1), c: +rvR.toFixed(1) },
  la: ell(laPts), ra: ell(raPts), lvEdvMl: +(lvPts.length * vox).toFixed(1),
  fittedFrom: 'atlas Left/Right ventricle and atrium meshes (moments of the voxelised blood pools)',
};
log('heart fit', { lvC: heart.lvCentre, axis: heart.axis, a: heart.lvCavity.a, b: heart.lvCavity.b, wall: heart.lvWall, edv: heart.lvEdvMl });

// diaphragm height map: top of the atlas diaphragm per (x,y) column, else lung base; holes relaxed
const DM = { x0: -200, y0: -140, dx: 10, dy: 10, nx: 41, ny: 29 };
const zmap = new Float32Array(DM.nx * DM.ny).fill(NaN);
for (let b = 0; b < DM.ny; b++) for (let a = 0; a < DM.nx; a++) {
  const x = DM.x0 + a * DM.dx, y = DM.y0 + b * DM.dy; let top = -Infinity, lung = Infinity;
  for (let z = LM.sternal_notch.z; z > LM.pubic_symphysis.z + 100; z -= 2.5) { const l = labelAt(x, y, z); if (l === 31 && z > top) top = z; if ((l === 7 || l === 8) && z < lung) lung = z; }
  // the dome is defined where lung rests on it: lung base (or the diaphragm top just below it); medial columns
  // without lung (heart, mediastinum) are left empty and filled by relaxation, never from stray diaphragm voxels
  // ... and only where diaphragm or upper-abdominal organs (not the heart) lie just below the lung base
  let below = false; if (isFinite(lung)) for (let dz = 3; dz <= 18; dz += 3) if ([31, 17, 18, 19, 20, 22, 23, 24, 29].includes(labelAt(x, y, lung - dz))) below = true;
  const zz = isFinite(lung) && below ? (isFinite(top) && top < lung + 15 && top > lung - 25 ? top : lung) : NaN;
  zmap[b * DM.nx + a] = zz;
}
const measured = Uint8Array.from(zmap, (v) => (Number.isNaN(v) ? 0 : 1));
for (let it = 0; it < 400; it++) { // fill NaNs by neighbour averaging (Laplace), keep measured values
  let changed = false; const prev = Float32Array.from(zmap);
  for (let b = 0; b < DM.ny; b++) for (let a = 0; a < DM.nx; a++) {
    const p = b * DM.nx + a; if (!Number.isNaN(prev[p]) && it === 0) continue;
    let s = 0, c = 0; for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = (b + db) * DM.nx + a + da; if (a + da < 0 || b + db < 0 || a + da >= DM.nx || b + db >= DM.ny) continue; if (!Number.isNaN(prev[q])) { s += prev[q]; c++; } }
    if (Number.isNaN(zmap[p]) && c) { zmap[p] = s / c; changed = true; }
  }
  if (!changed) break;
}
let domeR = [0, 0, -Infinity], domeL = [0, 0, -Infinity];
for (let b = 0; b < DM.ny; b++) for (let a = 0; a < DM.nx; a++) { const x = DM.x0 + a * DM.dx, y = DM.y0 + b * DM.dy, z = zmap[b * DM.nx + a]; if (!measured[b * DM.nx + a]) continue; if (x < -20 && z > domeR[2]) domeR = [x, y, z]; if (x > 20 && z > domeL[2]) domeL = [x, y, z]; }
const lungPts = voxelsOf([7, 8]); const lungApexZ = lungPts.reduce((m, p) => Math.max(m, p[2]), -Infinity);
// rib cage and trunk dimensions at the xiphoid level for the respiration envelope
let ribHalf = 0, yFront = Infinity, yBack = -Infinity;
for (let n = 1; n <= 12; n++) for (const sd of ['l', 'r']) { const P = vertsOf('skeletal', `${['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth'][n - 1]} rib.${sd}`); if (!P) continue; for (let i = 0; i < P.length; i += 3) ribHalf = Math.max(ribHalf, Math.abs(P[i])); }
for (let y = -200; y <= 200; y++) if (sdfAt(0, y, 0) < 0) { yFront = Math.min(yFront, y); yBack = Math.max(yBack, y); }
const cavY = [Infinity, -Infinity]; for (const p of lungPts) { cavY[0] = Math.min(cavY[0], p[1]); cavY[1] = Math.max(cavY[1], p[1]); }
const X = LM.xiphoid.z, N = LM.sternal_notch.z, P0 = LM.pubic_symphysis.z;
const respiration = {
  domeRight: domeR.map((v) => +v.toFixed(1)), domeLeft: domeL.map((v) => +v.toFixed(1)), lungApexZ: +lungApexZ.toFixed(1),
  thoraxZ: [+Math.min(domeR[2], domeL[2]).toFixed(1) - 120, +N.toFixed(1)], abdomenFloorZ: +(P0 + 10).toFixed(1),
  diaphragmMap: { ...DM, z: Array.from(zmap, (v) => +v.toFixed(1)), source: 'lung base (or the atlas Diaphragm top within 15 mm below it) per 10 mm column; columns without lung filled by neighbour averaging' },
  // envelope of the procedural respiratory field, expressed in this dataset's coordinates
  model: {
    halfWidth: +(ribHalf + 45).toFixed(0), zRange: [+(P0 - 0).toFixed(0), +(N + 50).toFixed(0)],
    cavity: { cy: +((cavY[0] + cavY[1]) / 2).toFixed(1), rx: +(ribHalf * 0.93).toFixed(1), ry: +((cavY[1] - cavY[0]) / 2 + 8).toFixed(1) },
    floorZ: +(P0 + 20).toFixed(1), chest: [X - 94, X - 34, N + 5, N + 45], abdomen: [P0 + 60, P0 + 140, X - 64, X + 6],
    wallY: [+yFront.toFixed(1), +yBack.toFixed(1)], ribHalf: +ribHalf.toFixed(1), trunk: [+(ribHalf + 20).toFixed(0), +(ribHalf + 40).toFixed(0)], slide: [X - 204, X - 24],
  },
};
log('respiration', { domeR: respiration.domeRight, domeL: respiration.domeLeft, apex: respiration.lungApexZ, model: respiration.model });

// stomach centre-line: maximal-distance path from the fundus top to the pylorus (Dijkstra in the mask)
function stomachCentreline() {
  const stomachVox = [], id = new Map();
  for (let k = 0; k < G2.n[2]; k++) for (let j = 0; j < G2.n[1]; j++) for (let i = 0; i < G2.n[0]; i++) { const p = G2.idx(i, j, k); if (structLabels.stomach[p] && body[p]) { id.set(p, stomachVox.length); stomachVox.push(p); } }
  const pos = (p) => { const i = p % G2.n[0], j = ((p / G2.n[0]) | 0) % G2.n[1], k = (p / (G2.n[0] * G2.n[1])) | 0; return G2.pos(i, j, k); };
  const duo = centroidOf(S_('visceral', 'Duodenum').lps);
  let start = stomachVox[0], end = stomachVox[0], zt = -Infinity, dd = Infinity;
  for (const p of stomachVox) { const q = pos(p); if (q[2] + 0.2 * q[0] > zt) { zt = q[2] + 0.2 * q[0]; start = p; } const d = Math.hypot(...sub3(q, duo)); if (d < dd) { dd = d; end = p; } }
  const dist = new Float64Array(stomachVox.length).fill(Infinity), prev = new Int32Array(stomachVox.length).fill(-1), done = new Uint8Array(stomachVox.length);
  // binary heap
  const heap = []; const push = (d, v) => { heap.push([d, v]); let c = heap.length - 1; while (c) { const pp = (c - 1) >> 1; if (heap[pp][0] <= heap[c][0]) break; [heap[pp], heap[c]] = [heap[c], heap[pp]]; c = pp; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r2 = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r2 < heap.length && heap[r2][0] < heap[m][0]) m = r2; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
  const si = id.get(start); dist[si] = 0; push(0, si);
  const st = [1, G2.n[0], G2.n[0] * G2.n[1]];
  while (heap.length) {
    const [d, v] = pop(); if (done[v]) continue; done[v] = 1; const p = stomachVox[v];
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy && !dz) continue; const q = p + dx * st[0] + dy * st[1] + dz * st[2], w = id.get(q); if (w === undefined || done[w]) continue;
      const len = Math.hypot(dx, dy, dz), r0 = stomachDT[q] + 0.5, nd = d + len / (r0 * r0);
      if (nd < dist[w]) { dist[w] = nd; prev[w] = v; push(nd, w); }
    }
  }
  const pathIdx = []; for (let v = id.get(end); v >= 0; v = prev[v]) pathIdx.push(v); pathIdx.reverse();
  let pts = pathIdx.map((v) => pos(stomachVox[v]));
  for (let it = 0; it < 8; it++) pts = pts.map((p, i) => i === 0 || i === pts.length - 1 ? p : [0, 1, 2].map((d) => (pts[i - 1][d] + 2 * p[d] + pts[i + 1][d]) / 4));
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(...sub3(pts[i], pts[i - 1])));
  const out = [], radii = [];
  for (let q = 0; q < 7; q++) {
    const sTarget = cum.at(-1) * q / 6; let i = cum.findIndex((c) => c >= sTarget); if (i <= 0) i = 1;
    const t = (sTarget - cum[i - 1]) / (cum[i] - cum[i - 1] || 1), p = [0, 1, 2].map((d) => pts[i - 1][d] + t * (pts[i][d] - pts[i - 1][d]));
    out.push(p.map((v) => +v.toFixed(1)));
    // radius: max inner distance in a small neighbourhood (DT in voxels -> mm)
    let best = 0; const ci = [0, 1, 2].map((d) => Math.round((p[d] - G2.lo[d]) / S));
    for (let dz = -2; dz <= 2; dz++) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const pp = G2.idx(ci[0] + dx, ci[1] + dy, ci[2] + dz); if (structLabels.stomach[pp]) best = Math.max(best, stomachDT[pp]); }
    radii.push(+Math.max(8, best * S).toFixed(1));
  }
  return { centerline: out, radii, lengthMM: +cum.at(-1).toFixed(1), source: 'geodesic centre-line of the voxelised atlas Stomach, fundus -> pylorus' };
}
const stomach = stomachCentreline();
log('stomach centre-line', stomach.lengthMM, 'mm, radii', stomach.radii.join(','));

// ------------------------------------------------------------------ landmarks, auscultation sites, views on the skin
const landmarks = {};
for (const [k, v] of Object.entries(LM)) { const r2 = skinAP(0, v.z, 'anterior'); if (r2) landmarks[k] = { ...r2, how: v.how, ...(v.approximate ? { approximate: true } : {}) }; }
const SITES = [
  ['aortic', 'Aortic area (2nd right ICS, parasternal)', 'Area aorta (SIC II kanan parasternal)', 'r_parasternal', 2, 'anterior', 'heart'],
  ['pulmonic', 'Pulmonic area (2nd left ICS, parasternal)', 'Area pulmonal (SIC II kiri parasternal)', 'l_parasternal', 2, 'anterior', 'heart'],
  ['erb', "Erb's point (3rd left ICS)", 'Titik Erb (SIC III kiri)', 'l_parasternal', 3, 'anterior', 'heart'],
  ['tricuspid', 'Tricuspid area (4th-5th left ICS, LLSB)', 'Area trikuspid (SIC IV-V kiri parasternal)', 'l_parasternal', 4, 'anterior', 'heart'],
  ['mitral', 'Mitral area / apex (5th left ICS, MCL)', 'Area mitral / apeks (SIC V kiri, LMC)', 'l_mcl', 5, 'anterior', 'heart'],
  ['lung_ant_r', 'Right anterior upper lung field', 'Lapang paru kanan atas depan', 'r_mcl', 2, 'anterior', 'lung'],
  ['lung_ant_l', 'Left anterior upper lung field', 'Lapang paru kiri atas depan', 'l_mcl', 2, 'anterior', 'lung'],
];
const auscultation = [];
for (const [key, name, nameId, line, n, approach, focus] of SITES) {
  const x = (line.startsWith('r') ? -1 : 1) * LINES[line.slice(2)], z = ICS[line][n - 1];
  if (z == null) continue;
  const r2 = skinAP(x, z, 'anterior'); if (!r2) continue;
  auscultation.push({ key, name, nameId, focus, approach, point: r2.point, normal: r2.normal, intercostalShiftMM: 0, rule: `ICS ${n} at the ${line.replace('_', ' ')} line from the atlas ribs/costal cartilages` });
}
const extra = [
  ['lung_lat_r', 'Right lateral base (mid-axillary line)', 'Basal paru kanan lateral (LMA)', 'right', X + 15, 'lung'],
  ['lung_lat_l', 'Left lateral base (mid-axillary line)', 'Basal paru kiri lateral (LMA)', 'left', X + 5, 'lung'],
];
// The atlas arms are adducted (anatomical position) and rest on the lateral chest wall down to the costal
// margin, so the pure mid-axillary point lies on the arm. Rotate the approach posteriorly (then anteriorly)
// until the contact is on the trunk: the nearest reachable axillary line. Recorded in the site's rule.
const trunkX = ribHalf + 45;
for (const [key, name, nameId, side, z, focus] of extra) {
  let r2 = null, dz0 = 0, used = 0;
  search: for (const deg of [0, 15, 25, 35, 45, 55, -15, -25, -35, -45]) for (const dz of [0, 4, -4, 8, -8, 12, -12, 16, -16]) {
    const a2 = deg * Math.PI / 180, sx = side === 'right' ? -1 : 1, c = skinAlong([0, 10, z + dz], [sx * Math.cos(a2), Math.sin(a2), 0]);
    if (c && Math.abs(c.point[0]) <= trunkX && !boneAlong(c.point, c.normal)) { r2 = c; dz0 = dz; used = deg; break search; }
  }
  if (r2) auscultation.push({ key, name, nameId, focus, approach: side, point: r2.point, normal: r2.normal, intercostalShiftMM: dz0, rule: used === 0 ? 'mid-axillary line, lower chest; nearest intercostal space' : `lower lateral chest ${used > 0 ? 'behind' : 'in front of'} the adducted atlas arm (${Math.abs(used)} deg from the mid-axillary direction); nearest intercostal space` });
}
for (const [key, name, nameId, x, z] of [['lung_post_r', 'Right posterior base', 'Basal paru kanan belakang', -70, X - 5], ['lung_post_l', 'Left posterior base', 'Basal paru kiri belakang', 70, X - 15]]) {
  let r2 = null, dz0 = 0; for (const dz of [0, 4, -4, 8, -8, 12, -12, 16, -16]) { const c = skinAP(x, z + dz, 'posterior'); if (c && !boneAlong(c.point, c.normal)) { r2 = c; dz0 = dz; break; } }
  r2 ||= skinAP(x, z, 'posterior'); if (r2) auscultation.push({ key, name, nameId, focus: 'lung', approach: 'posterior', point: r2.point, normal: r2.normal, intercostalShiftMM: dz0, rule: 'posterior chest base, nearest intercostal space' });
}
const U0 = LM.umbilicus.z;
for (const [key, name, nameId, x, z] of [['abd_ruq', 'Right upper quadrant', 'Kuadran kanan atas', -70, U0 + 75], ['abd_luq', 'Left upper quadrant', 'Kuadran kiri atas', 70, U0 + 75], ['abd_rlq', 'Right lower quadrant', 'Kuadran kanan bawah', -70, U0 - 75], ['abd_llq', 'Left lower quadrant', 'Kuadran kiri bawah', 70, U0 - 75]]) {
  const r2 = skinAP(x, z, 'anterior'); if (r2) auscultation.push({ key, name, nameId, focus: 'bowel', approach: 'anterior', point: r2.point, normal: r2.normal, intercostalShiftMM: 0, rule: 'abdominal quadrant relative to the approximate umbilical level' });
}
log('auscultation sites', auscultation.length);

// standard windows: contact on the skin + aim point; heel-toe/rock solved so the beam centre hits the aim
function aimAngles(contact, aim, rotate) {
  const want = nrm(sub3(aim, contact.point)); let best = { heelToe: 0, rock: 0, cos: -2 };
  const tryA = (ht, rk) => { const pose = clinicalPose(contact, { rotate, heelToe: ht, rock: rk }); const c = dot3(pose.b, want); if (c > best.cos) best = { heelToe: ht, rock: rk, cos: c }; };
  for (let ht = -60; ht <= 60; ht += 5) for (let rk = -60; rk <= 60; rk += 5) tryA(ht, rk);
  for (let step = 2; step >= 0.25; step /= 2) { const b0 = { ...best }; for (const dh of [-step, 0, step]) for (const dr of [-step, 0, step]) tryA(b0.heelToe + dh, b0.rock + dr); }
  return { rotate, heelToe: +best.heelToe.toFixed(1), rock: +best.rock.toFixed(1), aimErrorDeg: +(Math.acos(Math.min(1, best.cos)) * 180 / Math.PI).toFixed(2) };
}
const heartC = mean([...lvPts, ...rvPts]);
const labelCentroid = (labs) => mean(voxelsOf(labs));
// RUQ / hepatorenal window. The kidney is withheld (licence quarantine), so the aim point is the
// posterior-inferior surface region of the right liver lobe where the hepatorenal recess lies; the
// view is labelled accordingly and the kidney is reported as unavailable, never substituted.
const liverR = voxelsOf([17]).filter((p) => p[0] < 0);
const hepatorenalScore = (p) => p[1] - p[2]; // posterior (+y) and inferior (-z)
const liverCut = liverR.map(hepatorenalScore).sort((a, b) => b - a)[Math.floor(liverR.length * 0.12)];
const kidR = mean(liverR.filter((p) => hepatorenalScore(p) >= liverCut)), bladder = labelCentroid([30]);
const antrum = stomach.centerline[5];
const rLungPts = voxelsOf([7]); const rBase = rLungPts.reduce((b, p) => (p[1] - 0.6 * p[2] > b[1] - 0.6 * b[2] ? p : b));
// Acoustic window search: among candidate skin contacts, take the one whose straight path to the target
// crosses the fewest bone / aerated lung / gas / airway samples (what a sonographer does by sliding the probe).
const BAD = new Set([4, 5, 7, 8, 24, 40]); // bone, aerated lung, gas, airway (costal cartilage transmits sound)
function pathCost(c, target, spread = 0) {
  // a fan of rays toward the target and +-spread mm around it (the image is a sector, not a line)
  const tg = [target]; if (spread) for (const ax of [heart.u, heart.v]) for (const sg of [-1, 1]) tg.push(target.map((v, i) => v + sg * spread * ax[i]));
  let bad = 0, len = 0;
  for (const t0 of tg) { const d = sub3(t0, c.point), Lp = Math.hypot(...d); len += Lp; for (let t = 3; t < Lp - 6; t += 2) if (BAD.has(labelAt(...c.point.map((v, i) => v + d[i] * t / Lp)))) bad++; }
  return { cost: bad * 2 + len * 0.02 / tg.length, bad };
}
function searchWindow(cands, target, spread = 0) {
  let best = null;
  for (const c of cands) { if (!c) continue; const r2 = pathCost(c, target, spread); if (!best || r2.cost < best.cost) best = { ...r2, c }; }
  return best;
}
const grid2 = (xs, zs, fn) => xs.flatMap((x) => zs.map((z) => fn(x, z)));
const range = (a, b, st) => { const o = []; for (let v = a; v <= b + 1e-9; v += st) o.push(v); return o; };
const views = [];
const mkView = (key, found, aim, rotate) => {
  const contact = found?.c || found; if (!contact) return;
  const a = aim ? aimAngles(contact, aim, rotate) : { rotate, heelToe: 0, rock: 0, aimErrorDeg: null };
  views.push({ key, contact, angles: { rotate: a.rotate, heelToe: a.heelToe, rock: a.rock }, aim: aim?.map((v) => +v.toFixed(1)) || null, aimErrorDeg: a.aimErrorDeg, ...(found?.bad != null ? { windowObstructionSamples: found.bad } : {}) });
};
const icsL = ICS.l_parasternal.filter((v) => v != null);
mkView('subxiphoid', searchWindow(grid2(range(-10, 45, 5), range(X - 60, X - 5, 5), (x, z) => skinAP(x, z, 'anterior')), heartC, 25), heartC, -45);
mkView('parasternal', searchWindow(grid2(range(LINES.parasternal - 10, LINES.parasternal + 24, 4), icsL.slice(1, 5).flatMap((z) => [z - 4, z, z + 4]), (x, z) => skinAP(x, z, 'anterior')), lvC, 25), lvC, -15);
{ // apical: contacts around the LV apex (anterolateral chest wall); beam from the apex toward the base
  const ap = heart.apex, cands = [];
  for (let az = -30; az <= 120; az += 6) for (let el = -0.9; el <= 0.5001; el += 0.1) cands.push(skinAlong(ap, [Math.cos(az * Math.PI / 180), -Math.sin(az * Math.PI / 180), el]));
  // true apical region only: lateral to the mid-clavicular line, at or below the 4th intercostal space
  const apicalCands = cands.filter((c) => c && c.point[0] >= LINES.mcl - 10 && c.point[2] <= (ICS.l_mcl[3] ?? 60) + 5);
  mkView('apical', searchWindow(apicalCands, lvC, 20), heart.base, -45);
}
mkView('ruq', searchWindow(range(kidR[2] - 40, kidR[2] + 50, 5).flatMap((z) => [-40, -25, -10, 5, 20].map((y) => skinLateral(z, 'right', y))), kidR, 20), kidR, 90);
{ const c = skinAlong([rBase[0], rBase[1] - 10, rBase[2] + 25], [-0.85, 0.5, 0]); mkView('right_flank', c, rBase, 95); }
mkView('epigastric', searchWindow(grid2(range(antrum[0] - 30, antrum[0] + 30, 5), range(antrum[2] - 25, antrum[2] + 25, 5), (x, z) => skinAP(x, z, 'anterior')), antrum, 15), antrum, 90);
mkView('lung_anterior', skinAP(-LINES.mcl, ICS.r_mcl[1] ?? X + 120, 'anterior'), null, 90);
mkView('bladder', searchWindow(grid2(range(-20, 20, 5), range(LM.pubic_symphysis.z + 15, LM.pubic_symphysis.z + 80, 5), (x, z) => skinAP(x, z, 'anterior')), bladder, 15), bladder, 0);
// cardiac teaching window for the HFrEF scenario: the least obstructed of the three cardiac windows in THIS body
const cardiac = views.filter((v) => ['subxiphoid', 'parasternal', 'apical'].includes(v.key)).sort((a, b) => a.windowObstructionSamples - b.windowObstructionSamples);
const suggestedViews = { hfref: cardiac[0]?.key || 'subxiphoid', effusion: 'right_flank', gastroparesis: 'epigastric', normal: 'subxiphoid' };
log('views', views.map((v) => `${v.key}:${v.aimErrorDeg}° obstr ${v.windowObstructionSamples ?? '-'} @${v.contact.point.map((x) => x.toFixed(0))}`).join(' | '));

// ------------------------------------------------------------------ atlas vs procedural phantom (NOT registered: measured mismatch)
function phantomComparison() {
  const pdir = path.join(APP, 'public/data/phantom');
  if (!fs.existsSync(path.join(pdir, 'labels.nrrd'))) return null;
  const ph = readNrrd(path.join(pdir, 'labels.nrrd'));
  const cent = (vol, sizes, aff, labs) => { const set = new Set(labs); let c = [0, 0, 0], n = 0; for (let k = 0; k < sizes[2]; k++) for (let j = 0; j < sizes[1]; j++) for (let i = 0; i < sizes[0]; i++) if (set.has(vol[(k * sizes[1] + j) * sizes[0] + i])) { c[0] += aff[0] * i + aff[3]; c[1] += aff[5] * j + aff[7]; c[2] += aff[10] * k + aff[11]; n++; } return n ? c.map((v) => v / n) : null; };
  const pairs = [['LV cavity', [10]], ['right lung', [7]], ['left lung', [8]], ['liver', [17]], ['spleen', [19]], ['kidneys', [20]], ['stomach', [22, 23, 24]], ['bladder', [30]]];
  const A = [], B = [], names = [];
  for (const [nm, labs] of pairs) { const a = cent(L, G2.n, G2.affine(), labs), b = cent(ph.data, ph.sizes, ph.affine, labs); if (a && b) { A.push(a); B.push(b); names.push(nm); } }
  // best rigid fit (Kabsch) atlas -> phantom, residuals per landmark
  const ca = mean(A), cb = mean(B), H = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  A.forEach((a, i) => { const p = sub3(a, ca), q = sub3(B[i], cb); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) H[r][c] += p[r] * q[c]; });
  // polar decomposition by iteration: R = H^T (H H^T)^-1/2 via Newton on Q
  let Q = [[H[0][0], H[1][0], H[2][0]], [H[0][1], H[1][1], H[2][1]], [H[0][2], H[1][2], H[2][2]]];
  const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const invT = (m) => { const d = det3(m); return [[(m[1][1] * m[2][2] - m[1][2] * m[2][1]) / d, (m[1][2] * m[2][0] - m[1][0] * m[2][2]) / d, (m[1][0] * m[2][1] - m[1][1] * m[2][0]) / d], [(m[0][2] * m[2][1] - m[0][1] * m[2][2]) / d, (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / d, (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / d], [(m[0][1] * m[1][2] - m[0][2] * m[1][1]) / d, (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / d, (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / d]]; };
  for (let it = 0; it < 50; it++) { const T = invT(Q); Q = Q.map((row, r) => row.map((v, c) => 0.5 * (v + T[r][c]))); }
  const R = Q; // rotation (rows) mapping atlas offsets to phantom offsets
  const apply = (p) => { const d = sub3(p, ca); return [0, 1, 2].map((r) => R[r][0] * d[0] + R[r][1] * d[1] + R[r][2] * d[2] + cb[r]); };
  const residual = A.map((a, i) => ({ structure: names[i], atlasLPS: a.map((v) => +v.toFixed(1)), phantomLPS: B[i].map((v) => +v.toFixed(1)), identityDistanceMM: +Math.hypot(...sub3(a, B[i])).toFixed(1), rigidFitResidualMM: +Math.hypot(...sub3(apply(a), B[i])).toFixed(1) }));
  const rms = Math.sqrt(residual.reduce((s, r) => s + r.rigidFitResidualMM ** 2, 0) / residual.length);
  return { method: 'centroids of matching labels; best rigid (rotation + translation) least-squares fit', rmsMM: +rms.toFixed(1), maxMM: Math.max(...residual.map((r) => r.rigidFitResidualMM)), residual, conclusion: 'The procedural phantom and the atlas describe different bodies. A rigid fit leaves residuals far larger than a CT voxel, so the atlas is NOT overlaid on the phantom CT.' };
}
const comparison = phantomComparison();
if (comparison) log('atlas vs phantom rigid-fit residual RMS', comparison.rmsMM, 'mm, max', comparison.maxMM);

// ------------------------------------------------------------------ write outputs
fs.mkdirSync(OUT, { recursive: true });
const aff = G2.affine();
writeNrrd(path.join(OUT, 'ct.nrrd'), CT, G2.n, aff, 'MEDCOEL atlas-derived SYNTHETIC CT: voxelised from the MEDCOEL Anatomy Atlas meshes (BodyParts3D/Z-Anatomy derived). Not an acquired image.');
writeNrrd(path.join(OUT, 'labels.nrrd'), L, G2.n, aff, 'MEDCOEL atlas-derived tissue labels; see anatomy.json');
const skinAtlas = new Float32Array(net.positions.length);
for (let i = 0; i < net.positions.length; i += 3) { const a = lpsToAtlas([net.positions[i], net.positions[i + 1], net.positions[i + 2]]); skinAtlas.set(a, i); }
const skinGlb = encodeGlb([{ name: 'skin', positions: skinAtlas, indices: net.indices, extras: { labels: 'body', system: 'integument', illustrative: true, frame: 'atlas (glTF metres, +X left, +Y superior, +Z anterior)' } }], 'MEDCOEL 4D Lab build_atlas_dataset.mjs');
fs.writeFileSync(path.join(OUT, 'skin.glb'), skinGlb.buffer);
const counts = new Float64Array(256); for (let p = 0; p < L.length; p++) counts[L[p]]++;
const labels = Object.entries(LABELS).map(([k, [key, name, nameId, h, acoustic, system, color]]) => ({ id: +k, key, name, nameId, hu: h, acoustic, system, color, volumeMl: +(counts[k] * vox).toFixed(1), ...(UNAVAILABLE_LABELS[k] ? { available: false, unavailableReason: UNAVAILABLE_LABELS[k] } : {}) }));
for (const id of Object.keys(UNAVAILABLE_LABELS)) if (counts[id]) throw new Error('withheld label ' + id + ' has voxels');
// registration in the existing schema (skin <-> CT grid), with the atlas frame made explicit
const samples = []; for (const fi of [0.2, 0.5, 0.8]) for (const fj of [0.3, 0.5, 0.7]) for (const fk of [0.25, 0.5, 0.75]) { const ijk = [Math.floor((G2.n[0] - 1) * fi), Math.floor((G2.n[1] - 1) * fj), Math.floor((G2.n[2] - 1) * fk)]; samples.push({ ijk, value: CT[G2.idx(...ijk)] }); }
const nv = net.positions.length / 3, anchors = [];
for (let q = 0; q < 24; q++) { const v = Math.floor((nv - 1) * q / 23); const p = [net.positions[3 * v], net.positions[3 * v + 1], net.positions[3 * v + 2]]; const lps = [skinAtlas[3 * v] * 1000, -skinAtlas[3 * v + 2] * 1000, (skinAtlas[3 * v + 1] - Y0) * 1000]; anchors.push({ vertex: v, ijk: [0, 1, 2].map((d) => +((lps[d] - G2.lo[d]) / S).toFixed(4)), lpsMM: p.map((x) => +x.toFixed(4)) }); }
// skin <-> label agreement (same check as the phantom tests): air outside and tissue inside at +-5 mm
let agree = 0, tested = 0;
for (let v = 0; v < nv; v += 7) { const p = [net.positions[3 * v], net.positions[3 * v + 1], net.positions[3 * v + 2]]; if (p[2] < G2.lo[2] + 10 || p[2] > zHi - 10 || Math.abs(p[0]) > 255) continue; const n = skinNormal(p); tested++; if (labelAt(p[0] + 5 * n[0], p[1] + 5 * n[1], p[2] + 5 * n[2]) === 0 && labelAt(p[0] - 5 * n[0], p[1] - 5 * n[1], p[2] - 5 * n[2]) > 0) agree++; }
const atlasFrame = {
  atlasToLPS: ATLAS_TO_LPS, y0Metres: Y0, units: { atlas: 'metres', lps: 'millimetres' },
  axes: { atlas: '+X patient left, +Y superior, +Z anterior (verified on the atlas: left lung/spleen at +X, testes/glans at +Z, vertex at +Y)', lps: '+x left, +y posterior, +z superior' },
  origin: 'LPS z = 0 at the xiphoid process tip of the atlas; x = 0 atlas mid-sagittal plane; y = 0 atlas coronal plane Z = 0',
  relation: 'exact (rigid + unit change). The CT/labels were generated from the atlas meshes in this frame; no fitting.',
};
const reg = {
  schema: 'medcoel.patient.v2', source: 'MEDCOEL atlas-derived synthetic dataset', synthetic: true, units: 'glTF metres (atlas frame)',
  glbToLPS: ATLAS_TO_LPS, ijkToLPS: aff, sizes: G2.n, samples,
  meshes: [{ file: 'skin.glb', sha256: skinGlb.sha256, meshes: ['skin'] }], skinAnchors: anchors, atlasFrame,
  qc: { reviewRequired: true, validatedAnatomy: false, synthetic: true, skinTriangles: net.indices.length / 3, skinBoundaryOrNonManifoldEdges: skinStats.boundary + skinStats.nonManifold, skinLabelAgreement: +(agree / tested).toFixed(4), skinVerticesTested: tested, voxelisationMethods: methods },
  limitations: ['The skin is an ILLUSTRATIVE shell: the atlas muscle/bone envelope closed by ' + CLOSE_MM + ' mm and offset by an assumed ' + FAT_MM + ' mm (trunk, head, legs) / ' + ARM_FAT_MM + ' mm (arms) of fat and skin; arms and trunk are enveloped separately. It is not a scanned or validated body surface.',
    'The CT is SYNTHETIC: atlas meshes voxelised at ' + S + ' mm with textbook HU values. Gastric/colonic gas and content distributions are assumptions.',
    'CT coverage is chest-abdomen-pelvis; the shell outside the CT box is display-only and cannot be imaged.'],
};
fs.writeFileSync(path.join(OUT, 'registration.json'), JSON.stringify(reg, null, 1));
const anatomy = {
  schema: 'medcoel.anatomy.v1', synthetic: true, dataset: 'atlas',
  source: 'MEDCOEL atlas-derived synthetic dataset (pipeline/atlas/build_atlas_dataset.mjs) from the MEDCOEL Anatomy Atlas meshes (BodyParts3D, Z-Anatomy; see ASSET_LICENSE_REGISTRY.md). Not patient data. Not a validated anatomical model.',
  coordinateSystem: 'LPS millimetres (x=patient left, y=posterior, z=superior); z = 0 at the atlas xiphoid tip',
  attribution: ['BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan', 'Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0'],
  licence: 'CC BY-SA 4.0 (adaptation of BodyParts3D/Z-Anatomy geometry by MEDCOEL: voxelised to a synthetic CT, label map and illustrative skin shell)',
  licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  adaptationNotice: 'Changes: meshes voxelised at 2.5 mm, assigned textbook HU values, closed and offset into an illustrative skin shell; landmarks and probe windows fitted. Built only from inputs cleared by licensing/quarantine-policy.json.',
  unavailableAnatomy: Object.entries(UNAVAILABLE_LABELS).map(([id, reason]) => ({ label: +id, reason })),
  atlasFrame, labels, heart, respiration,
  gi: { stomach: { centerline: stomach.centerline, radii: stomach.radii, source: stomach.source } },
  pleura: { right: { labels: [7] }, left: { labels: [8] } },
  landmarks, auscultation, views, suggestedViews, ics: { lines: LINES, z: ICS },
  windowNote: 'Windows are searched on the atlas body: the skin contact whose sector toward the target crosses the least bone/aerated lung/gas. In this atlas body the anterior lung margins and lingula cover much of the heart, so the apical window is partly obstructed (as in many real patients in the supine position).',
  regions: { headZ: +(N + 120).toFixed(0), neckZ: +(N - 5).toFixed(0), armX: +(ribHalf + 55).toFixed(0), thighZ: +(P0 - 30).toFixed(0), thoraxZ: -5, pelvisZ: +(P0 + 70).toFixed(0), epigastricZ: +(U0 + 25).toFixed(0), umbilicalZ: +(U0 - 40).toFixed(0), quadrantSplitZ: +U0.toFixed(0), icsParasternal: ICS.l_parasternal },
  meshes: { skin: 'skin.glb', registration: 'registration.json', atlasLayer: { systems: ['visceral', 'skeletal', 'cardiovascular', 'lymphatic', 'muscular', 'joints'], unavailableSystems: [...QUARANTINED_SYSTEMS], url: 'shared MEDCOEL Anatomy Atlas models (/anatomy/viewer/models/)' } },
  comparisonWithProceduralPhantom: comparison,
  build: { sourceModels: SOURCE_HASHES, quarantinePolicy: { decided: POLICY.decided, excludedSystems: [...QUARANTINED_SYSTEMS], excludedStructures: [...QUARANTINED_STRUCTURES].sort() }, voxelMM: S, fatAndSkinMM: FAT_MM, armFatAndSkinMM: ARM_FAT_MM, closingMM: CLOSE_MM, skinNetMM: SKIN_H, seconds: Math.round((Date.now() - t0) / 1000) },
};
fs.writeFileSync(path.join(OUT, 'anatomy.json'), JSON.stringify(anatomy, null, 1));
log(`wrote ${OUT}: skin/label agreement ${(100 * agree / tested).toFixed(1)}% of ${tested} vertices`);
for (const f of fs.readdirSync(OUT)) log('  ', f, (fs.statSync(path.join(OUT, f)).size / 1e6).toFixed(2), 'MB');
