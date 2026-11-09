// Applies licensing/quarantine-policy.json to the public Atlas metadata and derived images.
// Idempotent. Never touches anything outside the repository's public asset folders and never
// copies quarantined content anywhere public. Run from the repository root:
//   node licensing/tools/apply-quarantine.mjs [--check]
// --check only reports what would change and exits 1 if the tree is not compliant.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ATLAS = path.join(ROOT, 'apps/anatomy/public');
const policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'licensing/quarantine-policy.json'), 'utf8'));
const check = process.argv.includes('--check');
const changes = [];
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, v, indent = 0) => { if (!check) fs.writeFileSync(p, JSON.stringify(v, null, indent) + (indent ? '\n' : '')); };
const rm = (p) => { if (fs.existsSync(p)) { changes.push('remove ' + path.relative(ROOT, p)); if (!check) fs.rmSync(p); } };

/** The full set of quarantined structure names for the Atlas, derived from the policy. */
export function quarantinedStructureSet(systems) {
  const out = new Set();
  for (const sys of Object.keys(policy.quarantinedSystems)) for (const id of systems[sys] || []) out.add(id);
  for (const list of Object.values(policy.quarantinedStructures)) for (const id of list) out.add(id);
  return out;
}

function main() {
  const systemsPath = path.join(ATLAS, 'data/systems.json');
  const catalogPath = path.join(ATLAS, 'data/atlas-catalog.json');
  const thumbsPath = path.join(ATLAS, 'data/structure-thumbnails.json');
  const quarantinePath = path.join(ATLAS, 'data/quarantine.json');
  const systems = readJson(systemsPath);
  const prior = fs.existsSync(quarantinePath) ? readJson(quarantinePath) : null;
  // Names of already-removed structures are kept in data/quarantine.json, so re-runs stay stable.
  const removed = quarantinedStructureSet(systems);
  for (const s of prior?.structures || []) removed.add(s.id);
  const bySystem = {};
  for (const [sys, ids] of Object.entries(systems)) for (const id of ids) if (removed.has(id)) (bySystem[id] = sys);
  for (const s of prior?.structures || []) bySystem[s.id] ||= s.system;
  for (const [sys, ids] of Object.entries(policy.quarantinedStructures)) for (const id of ids) bySystem[id] ||= sys;

  // systems.json: keep every system key (consumers require it), drop quarantined members.
  let n = 0;
  for (const sys of Object.keys(systems)) { const before = systems[sys].length; systems[sys] = systems[sys].filter((id) => !removed.has(id)); n += before - systems[sys].length; }
  if (n) { changes.push(`systems.json: drop ${n} quarantined structure ids`); writeJson(systemsPath, systems, 1); }

  const catalog = readJson(catalogPath); let c = 0;
  for (const id of Object.keys(catalog)) if (removed.has(id)) { delete catalog[id]; c++; }
  if (c) { changes.push(`atlas-catalog.json: drop ${c} entries`); writeJson(catalogPath, catalog); }

  const thumbs = readJson(thumbsPath); let t = 0;
  for (const id of Object.keys(thumbs.structures)) if (removed.has(id)) { rm(path.join(ATLAS, thumbs.structures[id].url)); delete thumbs.structures[id]; t++; }
  for (const sys of ['nervous', 'visceral']) if (thumbs.systems?.[sys]) { rm(path.join(ATLAS, thumbs.systems[sys].url || `thumbnails/systems/${sys}.webp`)); delete thumbs.systems[sys]; t++; }
  for (const sys of Object.keys(policy.quarantinedSystems)) if (thumbs.models?.[sys]) { delete thumbs.models[sys]; t++; }
  // Pruned GLBs: retained structures are byte-identical (see glb-prune.mjs), so their previews stay
  // valid; record the hash of the file now served.
  for (const f of policy.quarantinedFiles) if (f.action === 'replaced-by-pruned-derivative') {
    const sys = path.basename(f.path, '.glb'), file = path.join(ROOT, f.path);
    const hash = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (hash === f.sha256) throw new Error(f.path + ' is still the unpruned original');
    if (thumbs.models?.[sys] && thumbs.models[sys] !== hash) { thumbs.models[sys] = hash; t++; }
  }
  if (t) { changes.push(`structure-thumbnails.json: drop ${t} entries`); writeJson(thumbsPath, thumbs, 2); }
  for (const f of policy.quarantinedFiles) if (f.action === 'withheld-entirely') rm(path.join(ROOT, f.path));

  // Public, name-only list so the UI can say "unavailable" instead of silently omitting or
  // fabricating anatomy. Names are not geometry; no quarantined content is exposed.
  const q = {
    schemaVersion: 1,
    policy: 'licensing/quarantine-policy.json',
    decided: policy.decided,
    message: policy.unavailableMessage,
    systems: Object.keys(policy.quarantinedSystems),
    structures: [...removed].sort().map((id) => ({ id, system: bySystem[id] || null })),
  };
  if (JSON.stringify(prior) !== JSON.stringify(q)) { changes.push('write data/quarantine.json'); writeJson(quarantinePath, q, 1); }

  // 4D Lab evidence images rendered from quarantined inputs.
  const ev = path.join(ROOT, 'apps/4d-lab/evidence');
  if (fs.existsSync(ev)) for (const f of fs.readdirSync(ev)) {
    if (/^atlas-.*\.(jpg|png)$/.test(f) || f === '11-medcoel-anatomy-live.jpg' || f === 'staging-preview-anatomy-live.jpg') {
      // Regenerated evidence is stamped by the e2e scripts; only stale files are removed here.
      const stampPath = path.join(ev, 'CLEARED_EVIDENCE.json');
      const cleared = fs.existsSync(stampPath) ? readJson(stampPath).files || [] : [];
      if (!cleared.includes(f)) rm(path.join(ev, f));
    }
  }
  console.log(changes.length ? changes.join('\n') : 'quarantine policy already applied');
  if (check && changes.length) process.exit(1);
}
if (import.meta.url === `file://${process.argv[1]}`) main();
