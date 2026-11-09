// Builds licensing/atlas-structure-provenance.json: one record per structure of the ORIGINAL seven
// Atlas GLBs (pre-quarantine, commit b931e1b), with the attributed upstream source, the confidence
// of that attribution, the licence, the evidence used, and the distribution status after the
// quarantine. Dependency-free (reads glTF JSON chunks only). Originals are read from the private
// folder local-data/licensing-quarantine/originals/ when present, otherwise from Git history.
//   node licensing/tools/build-provenance.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readGlb } from './glb-prune.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BASE = 'b931e1b';
const SYSTEMS = ['skeletal', 'muscular', 'joints', 'cardiovascular', 'lymphatic', 'visceral', 'nervous'];
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'licensing/quarantine-policy.json'), 'utf8'));
const original = (sys) => {
  const priv = path.join(ROOT, 'local-data/licensing-quarantine/originals', sys + '.glb');
  if (fs.existsSync(priv)) return fs.readFileSync(priv);
  return execFileSync('git', ['-C', ROOT, 'show', `${BASE}:apps/anatomy/public/models/${sys}.glb`], { maxBuffer: 64 << 20 });
};

const SRC = {
  bp3d: { source: 'BodyParts3D (DBCLS) as reworked by Z-Anatomy', licence: 'CC BY-SA 2.1 JP + CC BY-SA 4.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  brainder: { source: '"Brainder" (University of Washington, per upstream notice)', licence: 'NONE STATED upstream', licenceUrl: null },
  wm: { source: '"White matter" (University of Washington, per upstream notice)', licence: 'NONE STATED upstream', licenceUrl: null },
  ear: { source: '"Anatomy of the Inner Ear" (University of Dundee School of Medicine; derivative of McGill "3D Ear")', licence: 'CC BY-NC-SA 4.0 (upstream model: CC BY-NC-SA 1.0)', licenceUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' },
  cn: { source: '"Cranial Nerves and Foramina" (University of Dundee, CAHID; itself based on BodyParts3D)', licence: 'CC BY 4.0 per upstream notice (not verifiable on the publisher page on 2026-11-09)', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' },
  kidney: { source: '"Kidney" by lissiecowley', licence: 'CC BY-NC 4.0 per upstream notice (publisher page not found on 2026-11-09)', licenceUrl: 'https://creativecommons.org/licenses/by-nc/4.0/' },
};
const CORTEX = /gyr|sulc|Lat_Fis|lobule|pole|cuneus|insula|operc|frontomarginal|Jensen|precuneus/i;
const CEREBELLUM = /vermis|lobule|flocculus|tonsil of cerebellum|culmen|declive|lingula of cerebellum|central lobule|semilunar|biventral|gracile lobule|quadrangular|cerebellar/i;
const CRANIAL_NERVE = /\((I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\)/;

function classify(sys, name, parentChain) {
  const chain = [name, ...parentChain];
  if (sys === 'visceral' && /^(Kidney|Renal pelvis)\.[lr]$/.test(name)) return ['kidney', 'high', 'Structure name matches the upstream-listed "Kidney" model; renal pelvis removed with it as part of the same organ model (precaution).'];
  if (sys === 'skeletal' && /^(Malleus|Incus|Stapes)\.[lr]$/.test(name)) return ['ear', 'possible', 'The upstream inner-ear model states it includes the ossicles; origin of these meshes cannot be verified (precaution).'];
  if (sys !== 'nervous') return ['bp3d', 'presumed', 'Upstream notice: every file is a derivative of BodyParts3D by Z-Anatomy; no other included model is listed for this system.'];
  if (chain.some((n) => /^White matter of telencephalon/.test(n))) return ['wm', 'likely', 'Name/hierarchy matches the upstream-listed "White matter" model.'];
  if (/^(Cochlea|Vestibule|Tympanic membrane)\.[lr]$/.test(name)) return ['ear', 'likely', 'Inner/middle-ear structure; the upstream inner-ear model lists tympanic membrane and vestibular system.'];
  if (CORTEX.test(name) && !CEREBELLUM.test(name)) return ['brainder', 'likely', 'Cortical parcellation named after the FreeSurfer Destrieux atlas (e.g. "Lat_Fis-ant-Horizont", "Sulcus interm_prim-Jensen"), which Brainder distributes as meshes.'];
  if (chain.some((n) => CRANIAL_NERVE.test(n)) || /^(Chorda tympani|Cochlear nerve|Vestibular nerve)/.test(name)) return ['cn', 'likely', 'Cranial nerve (I-XII) or branch; upstream lists the Dundee cranial nerves model.'];
  return ['bp3d', 'not-separable', 'Presumed BodyParts3D/Z-Anatomy, but nervous.glb mixes several upstream models and this mesh cannot be attributed with confidence.'];
}

const withheldStructures = new Set(Object.values(policy.quarantinedStructures).flat());
const records = [];
for (const sys of SYSTEMS) {
  const { json } = readGlb(original(sys));
  const parent = new Map();
  json.nodes.forEach((n, i) => (n.children || []).forEach((c) => parent.set(c, i)));
  const zaAncestors = (i) => { const out = []; let p = parent.get(i); while (p !== undefined) { const z = json.nodes[p].extras?.za_name; if (z) out.push(z); p = parent.get(p); } return out; };
  json.nodes.forEach((n, i) => {
    const za = n.extras?.za_name; if (!za) return;
    const prims = n.mesh !== undefined ? json.meshes[n.mesh].primitives : [];
    const triangles = prims.reduce((t, p) => t + (p.indices !== undefined ? json.accessors[p.indices].count / 3 : 0), 0);
    const [key, confidence, evidence] = classify(sys, za, zaAncestors(i));
    const withheld = sys in policy.quarantinedSystems || withheldStructures.has(za);
    records.push({ id: za, system: sys, file: `apps/anatomy/public/models/${sys}.glb`, parent: zaAncestors(i)[0] || null, triangles,
      ...SRC[key], attributionConfidence: confidence, evidence,
      status: withheld ? 'quarantined' : 'cleared',
      statusReason: withheld ? (sys in policy.quarantinedSystems ? `whole ${sys}.glb withheld (${policy.quarantinedSystems[sys]})` : 'structure removed from the published file') : 'Published under CC BY-SA 4.0 with BodyParts3D and Z-Anatomy attribution.' });
  });
}
const summary = {};
for (const r of records) { const k = `${r.status} | ${r.source}`; summary[k] = (summary[k] || 0) + 1; }
const out = { schemaVersion: 1, generatedFrom: `original Atlas GLBs at commit ${BASE}`, policy: 'licensing/quarantine-policy.json', disclaimer: 'Attribution is inferred from upstream notices, structure names and mesh characteristics; it is not proof of provenance and not legal advice.', totals: { structures: records.length, cleared: records.filter((r) => r.status !== 'quarantined').length, quarantined: records.filter((r) => r.status === 'quarantined').length }, summary, records };
fs.writeFileSync(path.join(ROOT, 'licensing/atlas-structure-provenance.json'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out.totals), '\n' + Object.entries(summary).map(([k, v]) => `${v}\t${k}`).join('\n'));
