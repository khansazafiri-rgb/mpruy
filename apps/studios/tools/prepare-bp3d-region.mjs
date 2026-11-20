#!/usr/bin/env node
// Anatomy 3D data from the OFFICIAL BodyParts3D 4.0 "is_a" OBJ archive (DBCLS). Never reads legacy MEDCOEL/Atlas
// models (nervous.glb and other quarantined files are not inputs). Output (local-data/, never committed):
//   data/model.glb        one node per FMA concept, OPAQUE node ids (no names in the geometry)
//   data/structures.json  opaque id -> FMA id, English name, side, group   (withheld during Challenge)
//   server/challenge.json identify / find / typed items keyed by opaque id   (never delivered)
//   data/NOTICE-BodyParts3D.txt, provenance.json
// Validation (fails closed): source digests, every concept resolves to element files, left/right concepts sit on the
// side their names claim (BodyParts3D frame: +X = patient left), bounds are finite.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const SRC = path.join(REPO, 'local-data/licensing-quarantine/bp3d-4.0');
const ARCHIVE = { file: 'isa_BP3D_4.0_obj_99.zip', url: 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip', sha256: '40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e' };
const TABLES = { 'isa_element_parts.txt': 'a3de74423f943b0d724ae8f59b3a817f87c423a544f8db98113b1980817cbeaf', 'isa_parts_list_e.txt': 'ab7796deedd49205e77f3609a1cb8c53e2bbee14ecb5c9a6ca05227469780513' };
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const ATTRIBUTION = 'BodyParts3D, (c) The Database Center for Life Science. Source OBJ headers state CC Attribution-Share Alike 2.1 Japan; the DBCLS website currently states CC BY 4.0. https://dbarchive.biosciencedbc.jp/en/bodyparts3d/';

/** Region recipes: FMA concept ids grouped for teaching. Only concepts that exist in the official tables are used. */
export const REGIONS = {
  'brain-anatomy': { title: 'Brain Anatomy', groups: {
    'Brainstem & cerebellum': ['FMA67944', 'FMA61993', 'FMA67943', 'FMA62004', 'FMA62394', 'FMA78469'],
    'Diencephalon': ['FMA258716', 'FMA258714', 'FMA62008', 'FMA74877', 'FMA62033', 'FMA62045', 'FMA78454'],
    'Basal nuclei & limbic': ['FMA72827', 'FMA72826', 'FMA72829', 'FMA72828', 'FMA72831', 'FMA72830', 'FMA72714', 'FMA72713', 'FMA72833', 'FMA72832', 'FMA72925', 'FMA72924', 'FMA61970'],
    'Ventricles & commissures': ['FMA78450', 'FMA78449', 'FMA86464'],
    'Cerebral cortex (left)': ['FMA72654', 'FMA72656', 'FMA72658', 'FMA72662', 'FMA72666', 'FMA72668', 'FMA72670', 'FMA72686', 'FMA72688', 'FMA72690', 'FMA72706', 'FMA72718', 'FMA72978', 'FMA72976', 'FMA72801', 'FMA72805'],
    'Cerebral cortex (right)': ['FMA72653', 'FMA72655', 'FMA72657', 'FMA72661', 'FMA72665', 'FMA72667', 'FMA72669', 'FMA72685', 'FMA72687', 'FMA72689', 'FMA72705', 'FMA72717', 'FMA72977', 'FMA72975', 'FMA72800', 'FMA72804'],
    'Cerebral white matter': ['FMA260794', 'FMA260791'],
  } },
};

/**
 * Keyword recipes for the region studios (official BodyParts3D concept names). Leaf concepts only, largest first per
 * group, kidney / renal pelvis / ossicles excluded while the MEDCOEL quarantine decision for them is open.
 * The BodyParts3D model is a single adult male: female pelvic organs do not exist in this source.
 */
export const AUTO = {
  'head-neck-anatomy': { title: 'Head & Neck Anatomy', cap: 18, groups: {
    'Cranium & face': /^(left |right )?(frontal bone|parietal bone|temporal bone|occipital bone|sphenoid bone|ethmoid|mandible|maxilla|zygomatic bone|nasal bone|vomer|palatine bone|lacrimal bone|hyoid bone)$/,
    'Larynx & pharynx': /(thyroid cartilage|cricoid cartilage|epiglottis|arytenoid cartilage|corniculate cartilage|pharynx|larynx)/,
    'Muscles': /^(left |right )?(sternocleidomastoid|masseter|temporal muscle|temporalis|digastric|mylohyoid|platysma|sternohyoid|omohyoid|trapezius)/,
    'Glands & vessels': /^(left |right )?(parotid gland|submandibular gland|thyroid gland|common carotid artery|internal jugular vein|external carotid artery|internal carotid artery)$/ } },
  'spine-anatomy': { title: 'Spine Anatomy', cap: 30, groups: {
    'Cervical vertebrae': /^(first|second|third|fourth|fifth|sixth|seventh) cervical vertebra$|^(atlas|axis)$/,
    'Thoracic vertebrae': /thoracic vertebra$/, 'Lumbar vertebrae': /lumbar vertebra$/,
    'Sacrum & coccyx': /^(sacrum|coccyx)$/, 'Discs & cord': /(intervertebral disc|spinal cord)/ } },
  'thorax-anatomy': { title: 'Thorax Anatomy', cap: 24, groups: {
    'Thoracic cage': /^(left |right )?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) rib$|^(sternum|manubrium of sternum|body of sternum|xiphoid process)$/,
    'Lungs & airway': /^(left lung|right lung|trachea|left main bronchus|right main bronchus|.*lobe of (left|right) lung)$/,
    'Mediastinum': /^(heart|esophagus|thymus|thoracic aorta|arch of aorta|superior vena cava)$/, 'Diaphragm': /^diaphragm$/ } },
  'heart-anatomy': { title: 'Heart Anatomy', cap: 12, groups: {
    'Chamber walls': /^wall of (left|right) (atrium|ventricle)$/, 'Chamber cavities': /^cavity of (left|right) (atrium|ventricle)$/,
    'Papillary muscles': /papillary muscle of (left|right) ventricle$/, 'Valves': /(mitral valve|tricuspid valve|aortic valve|pulmonary valve)$/,
    'Great vessels': /^(ascending aorta|arch of aorta|pulmonary trunk|superior vena cava|left pulmonary artery|right pulmonary artery)$/,
    'Coronary vessels': /^(left|right) coronary artery$|(anterior interventricular artery|circumflex branch of left coronary artery|coronary sinus)$/ } },
  'abdomen-anatomy': { title: 'Abdomen Anatomy', cap: 20, groups: {
    'Digestive organs': /^(liver|stomach|pancreas|gallbladder|duodenum|jejunum|ileum|cecum|appendix|ascending colon|transverse colon|descending colon|sigmoid colon|spleen)$/,
    'Vessels': /^(abdominal aorta|inferior vena cava|portal vein|celiac trunk|superior mesenteric artery|splenic artery|common hepatic artery)$/,
    'Wall': /^(left |right )?(rectus abdominis|external oblique|internal oblique|transversus abdominis)$/ } },
  'pelvis-anatomy': { title: 'Pelvis Anatomy (male model)', cap: 20, groups: {
    'Bones': /^(left |right )?(hip bone|ilium|ischium|pubis)$|^(sacrum|coccyx)$/, 'Organs (male)': /^(urinary bladder|rectum|prostate|left seminal vesicle|right seminal vesicle)$/,
    'Muscles': /^(left |right )?(levator ani|obturator internus|piriformis|gluteus maximus|iliacus|psoas major)$/,
    'Vessels': /^(left |right )?(common iliac artery|internal iliac artery|external iliac artery|common iliac vein)$/ } },
  'upper-limb-anatomy': { title: 'Upper Limb Anatomy', cap: 24, groups: {
    'Bones': /^(left |right )(clavicle|scapula|humerus|radius|ulna|scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate)$/,
    'Muscles': /^(left |right )(deltoid|biceps brachii|triceps brachii|brachialis|brachioradialis|pronator teres|supinator|coracobrachialis|supraspinatus|infraspinatus|teres major|teres minor|subscapularis)$/,
    'Vessels': /^(left |right )(axillary artery|brachial artery|radial artery|ulnar artery|cephalic vein|basilic vein)$/ } },
  'lower-limb-anatomy': { title: 'Lower Limb Anatomy', cap: 24, groups: {
    'Bones': /^(left |right )(femur|patella|tibia|fibula|calcaneus|talus|navicular bone|cuboid bone)$/,
    'Muscles': /^(left |right )(rectus femoris|vastus lateralis|vastus medialis|vastus intermedius|sartorius|gracilis|adductor longus|adductor magnus|biceps femoris|semitendinosus|semimembranosus|gastrocnemius|soleus|tibialis anterior|gluteus medius)$/,
    'Vessels': /^(left |right )(femoral artery|popliteal artery|anterior tibial artery|posterior tibial artery|great saphenous vein|femoral vein)$/ } },
};
const EXCLUDE = /(kidney|renal pelvis|malleus|incus|stapes|auditory ossicle)/i;

function autoGroups(studioId, elements, names, sizes) {
  const r = AUTO[studioId], used = new Set(), groups = {};
  for (const [group, re] of Object.entries(r.groups)) {
    const hits = [...elements.keys()].filter(c => re.test(names.get(c) || '') && !EXCLUDE.test(names.get(c) || '') && !used.has(c));
    // Leaf concepts only: drop a concept whose element set strictly contains another hit's set.
    const leaf = hits.filter(c => !hits.some(o => o !== c && [...elements.get(o)].every(f => elements.get(c).has(f)) && elements.get(o).size < elements.get(c).size));
    const weight = c => [...elements.get(c)].reduce((a, f) => a + (sizes.get(f) || 0), 0);
    const pick = leaf.sort((a, b) => weight(b) - weight(a)).slice(0, r.cap).sort((a, b) => names.get(a).localeCompare(names.get(b)));
    pick.forEach(c => used.add(c));
    if (pick.length) groups[group] = pick;
  }
  return { title: r.title, groups };
}

function readTable(file) {
  const text = fs.readFileSync(path.join(SRC, file));
  if (sha(text) !== TABLES[file]) throw Error('Table digest mismatch: ' + file);
  return text.toString('utf8').split(/\r?\n/).slice(1).filter(Boolean).map(l => l.split('\t'));
}

/** Indexed OBJ parse with smooth vertex normals (BodyParts3D OBJ: v + f lines). */
export function parseObj(text) {
  const v = [], idx = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('v ')) { const p = line.trim().split(/\s+/).slice(1, 4).map(Number); if (p.some(n => !Number.isFinite(n))) throw Error('Nonfinite vertex'); v.push(p); }
    else if (line.startsWith('f ')) {
      const t = line.trim().split(/\s+/).slice(1).map(s => { const n = Number(s.split('/')[0]); return n > 0 ? n - 1 : v.length + n; });
      if (t.some(i => !Number.isInteger(i) || i < 0 || i >= v.length)) throw Error('Bad face index');
      for (let i = 1; i < t.length - 1; i++) idx.push(t[0], t[i], t[i + 1]);
    }
  }
  if (!idx.length) throw Error('OBJ without faces');
  return { v, idx };
}

function mergeAndNormal(parts) {
  const positions = [], indices = [];
  for (const p of parts) { const base = positions.length / 3; for (const q of p.v) positions.push(...q); for (const i of p.idx) indices.push(base + i); }
  const P = new Float32Array(positions), N = new Float32Array(P.length);
  for (let t = 0; t < indices.length; t += 3) {
    const [a, b, c] = [indices[t] * 3, indices[t + 1] * 3, indices[t + 2] * 3];
    const u = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], w = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    for (const k of [a, b, c]) { N[k] += n[0]; N[k + 1] += n[1]; N[k + 2] += n[2]; }
  }
  for (let i = 0; i < N.length; i += 3) { const m = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= m; N[i + 1] /= m; N[i + 2] /= m; }
  return { P, N, I: new Uint32Array(indices) };
}

/** Minimal glTF 2.0 binary writer: one mesh/node per structure, node name = opaque id, positions in millimetres. */
export function writeGlb(meshes) {
  const chunks = [], bufferViews = [], accessors = [], gltfMeshes = [], nodes = [];
  let offset = 0;
  const push = (arr, target) => { const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength); const pad = (4 - (b.length % 4)) % 4; chunks.push(b, Buffer.alloc(pad)); bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: b.length, target }); offset += b.length + pad; return bufferViews.length - 1; };
  for (const m of meshes) {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < m.P.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], m.P[i + k]); max[k] = Math.max(max[k], m.P[i + k]); }
    const pa = accessors.push({ bufferView: push(m.P, 34962), componentType: 5126, count: m.P.length / 3, type: 'VEC3', min, max }) - 1;
    const na = accessors.push({ bufferView: push(m.N, 34962), componentType: 5126, count: m.N.length / 3, type: 'VEC3' }) - 1;
    const ia = accessors.push({ bufferView: push(m.I, 34963), componentType: 5125, count: m.I.length, type: 'SCALAR' }) - 1;
    gltfMeshes.push({ primitives: [{ attributes: { POSITION: pa, NORMAL: na }, indices: ia }] });
    nodes.push({ name: m.id, mesh: gltfMeshes.length - 1 });
  }
  const bin = Buffer.concat(chunks);
  const json = Buffer.from(JSON.stringify({ asset: { version: '2.0', generator: 'MEDCOEL prepare-bp3d-region' }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes: gltfMeshes, accessors, bufferViews, buffers: [{ byteLength: bin.length }] }));
  const jsonPad = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonPad.length + 8 + bin.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(jsonPad.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jh, jsonPad, bh, bin]);
}

export function prepareRegion(studioId) {
  const zip = path.join(SRC, ARCHIVE.file);
  if (sha(fs.readFileSync(zip)) !== ARCHIVE.sha256) throw Error('Archive digest mismatch');
  const elements = new Map(), names = new Map();
  for (const [c, n, f] of readTable('isa_element_parts.txt')) { if (!elements.has(c)) elements.set(c, new Set()); elements.get(c).add(f); names.set(c, n); }
  for (const [c, , n] of readTable('isa_parts_list_e.txt')) if (!names.has(c)) names.set(c, n);
  const sizes = new Map(execFileSync('unzip', ['-l', zip], { maxBuffer: 64 * 1024 * 1024 }).toString().split('\n').map(l => l.match(/^\s*(\d+)\s.*\/(FJ\d+)\.obj$/)).filter(Boolean).map(m => [m[2], Number(m[1])]));
  const region = REGIONS[studioId] || (AUTO[studioId] && autoGroups(studioId, elements, names, sizes));
  if (!region || !Object.keys(region.groups).length) throw Error('No BodyParts3D recipe for ' + studioId);
  const meshes = [], structures = [], members = {};
  let n = 0;
  for (const [group, ids] of Object.entries(region.groups)) for (const fma of ids) {
    const files = [...(elements.get(fma) || [])].sort();
    if (!files.length) throw Error('Concept without element files: ' + fma);
    const parts = files.map(f => { const member = 'isa_BP3D_4.0_obj_99/' + f + '.obj'; const b = execFileSync('unzip', ['-p', zip, member], { maxBuffer: 64 * 1024 * 1024 }); members[member] = sha(b); return parseObj(b.toString('latin1')); });
    const id = 's' + String(++n).padStart(3, '0');
    const m = mergeAndNormal(parts); m.id = id;
    const nameEn = names.get(fma);
    // Side = the patient's side for paired structures. Heart chambers ("left ventricle") name an organ part, not a body side.
    const chamber = /^(left|right) (atrium|ventricle|auricle|coronary artery|pulmonary artery|main bronchus|lung)$/.test(nameEn) || / of (left|right) (lung|atrium|ventricle)$/.test(nameEn) || /(cusp|leaflet) of .*valve$/.test(nameEn);
    const side = /^left /.test(nameEn) || / of left /.test(nameEn) ? 'left' : /^right /.test(nameEn) || / of right /.test(nameEn) ? 'right' : 'midline';
    let cx = 0; for (let i = 0; i < m.P.length; i += 3) cx += m.P[i];
    structures.push({ id, fma, nameEn, side, chamber, group, elementFiles: files, centroidX: cx / (m.P.length / 3), triangles: m.I.length / 3 });
    meshes.push(m);
  }
  // Laterality: in the BodyParts3D frame +X is the patient's left. Compare each left/right pair and the midline split.
  // Paired structures must lie on their side of the body midline; each left/right pair must be ordered (+X = left).
  const lateral = structures.filter(s => s.side !== 'midline');
  const pairs = lateral.filter(s => s.side === 'left').map(l => [l, lateral.find(r => r.side === 'right' && r.nameEn === l.nameEn.replace(/^left /, 'right ').replace(/ of left /, ' of right '))]).filter(p => p[1]);
  const midX = pairs.length ? pairs.reduce((a, [l, r]) => a + (l.centroidX + r.centroidX) / 2, 0) / pairs.length
    : structures.filter(s => s.side === 'midline').reduce((a, s) => a + s.centroidX, 0) / Math.max(1, structures.filter(s => s.side === 'midline').length);
  const wrong = [...pairs.filter(([l, r]) => !(l.centroidX > r.centroidX)).map(([l]) => l.nameEn + ' / pair order'),
    ...lateral.filter(s => !s.chamber && (s.side === 'left') !== (s.centroidX > midX)).map(s => s.nameEn)];
  if (wrong.length) throw Error('Laterality mismatch (expected +X = patient left): ' + wrong.join(', '));
  const out = path.join(REPO, 'local-data/studio-resources/build', studioId);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'data'), { recursive: true }); fs.mkdirSync(path.join(out, 'server'), { recursive: true });
  const glb = writeGlb(meshes);
  const table = { schema: 'medcoel.structures.v1', source: 'BodyParts3D 4.0 (FMA is_a)', frame: 'BodyParts3D millimetres; +X patient left, +Z superior', terminologyReview: 'pending',
    groups: Object.keys(region.groups), structures: structures.map(({ id, fma, nameEn, side, group }) => ({ id, fma, nameEn, side, group })) };
  const outputs = {
    'data/model.glb': glb,
    'data/structures.json': Buffer.from(JSON.stringify(table, null, 1)),
    'data/dataset.json': Buffer.from(JSON.stringify({ schema: 'medcoel.dataset.v1', status: 'PRIVATE_REVIEW', source: 'BodyParts3D 4.0 (DBCLS)', model: 'data/model.glb', structures: 'data/structures.json',
      notice: 'Data: BodyParts3D 4.0 © DBCLS (lisensi: header arsip CC BY-SA 2.1 JP vs situs CC BY 4.0, belum diselaraskan). Satu model pria dewasa, bukan pasien. Review anatomi dan terminologi belum selesai: hanya review privat.',
      guidedTargets: studioId === 'brain-anatomy' ? { select: structures.find(s => s.fma === 'FMA67944').id, isolate: structures.find(s => s.fma === 'FMA67943').id }
        : { select: structures[0].id, isolate: structures[Math.min(1, structures.length - 1)].id } }, null, 1)),
    'data/NOTICE-BodyParts3D.txt': Buffer.from(ATTRIBUTION + '\n\nChanges by MEDCOEL: selected FMA concepts merged per concept from their official element OBJ files, smooth normals computed, converted to glTF binary; coordinates unchanged (millimetres). Adapted geometry shared under the same licence terms as the source.\n'),
    'server/challenge.json': Buffer.from(JSON.stringify(challenge(structures), null, 1)),
  };
  for (const [rel, b] of Object.entries(outputs)) fs.writeFileSync(path.join(out, rel), b);
  const provenance = { schema: 'medcoel.provenance.v1', studio: studioId, generatedAt: new Date().toISOString(), tool: 'apps/studios/tools/prepare-bp3d-region.mjs',
    source: ARCHIVE, tables: TABLES, members, outputs: Object.fromEntries(Object.entries(outputs).map(([k, b]) => [k, { bytes: b.length, sha256: sha(b) }])),
    validation: { structures: structures.length, lateralChecked: lateral.length, lateralityErrors: 0, midlineX: +midX.toFixed(1), triangles: structures.reduce((a, s) => a + s.triangles, 0) },
    licence: { archiveHeader: 'CC-BY-SA-2.1-JP', website: 'CC-BY-4.0 (2025-02-27)', status: 'discrepancy unresolved' }, medicalReview: 'pending', privacyReview: 'not applicable (no patient data; to be confirmed)' };
  fs.writeFileSync(path.join(out, 'provenance.json'), JSON.stringify(provenance, null, 2));
  return provenance;
}

/** Identify (4 options), Find (click the named structure) and Typed items. Typed items need an APPROVED terminology pack. */
function challenge(structures) {
  const items = [];
  structures.forEach((s, n) => {
    const pool = structures.filter(o => o.id !== s.id && o.group === s.group && o.side === s.side);
    const sameSide = structures.filter(o => o.id !== s.id && o.side === s.side);
    const other = pool.length >= 3 ? pool : sameSide.length >= 3 ? sameSide : structures.filter(o => o.id !== s.id);
    const distract = [0, 1, 2].map(k => other[(n * 5 + k * 7) % other.length]).filter((v, i, a) => v && a.indexOf(v) === i);
    for (const o of other) { if (distract.length >= 3) break; if (!distract.includes(o)) distract.push(o); }
    const options = [s, ...distract], rot = n % 4, ordered = options.slice(rot).concat(options.slice(0, rot));
    items.push({ id: 'identify-' + s.id, prompt: { kind: 'identify', highlight: s.id, text: 'Struktur yang disorot adalah…' }, options: ordered.map(o => o.nameEn), answer: { index: ordered.indexOf(s) }, canonical: s.nameEn,
      explanation: s.nameEn + ' (' + s.fma + ', BodyParts3D 4.0). Terminologi Indonesia/Latin menunggu review.' });
    items.push({ id: 'find-' + s.id, prompt: { kind: 'find', text: 'Klik struktur: ' + s.nameEn }, options: [], answer: { structureId: s.id }, canonical: s.nameEn, explanation: s.nameEn + ' (' + s.fma + ').' });
  });
  return { schema: 'medcoel.challenge.v1', source: 'BodyParts3D 4.0', medicalReview: 'pending', count: 10, items };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const p = prepareRegion(process.argv[2] || 'brain-anatomy');
  console.log(Object.entries(JSON.parse(fs.readFileSync(path.join(REPO, 'local-data/studio-resources/build', process.argv[2] || 'brain-anatomy', 'data/structures.json'), 'utf8')).structures.reduce((a, s) => { a[s.group] = (a[s.group] || 0) + 1; return a; }, {})));
  console.log(JSON.stringify({ outputs: p.outputs, validation: p.validation }, null, 1));
}
