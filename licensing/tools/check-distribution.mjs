// Distribution guard for the MEDCOEL licence quarantine (licensing/quarantine-policy.json).
//
// Scans a directory that is about to be published (a Vite dist/, a staged release, or a public/
// folder) and rejects it if it contains, under ANY file name:
//   * a file whose SHA-256 matches a withdrawn file (licensing/quarantined-hashes.json),
//   * a path the policy withholds (e.g. models/nervous.glb, thumbnails/systems/nervous.webp),
//   * a GLB with a structure node (extras.za_name) that is quarantined, or any node of a
//     quarantined system (za_system),
//   * an Atlas catalogue / systems / thumbnail manifest that still lists a quarantined structure,
//   * a 4D Lab atlas dataset built from a quarantined original or carrying voxels for a withheld label.
// Dependency-free so it can run in CI, in stage scripts and inside Vite's closeBundle hook.
//
//   node licensing/tools/check-distribution.mjs <dir> [<dir> ...]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POLICY_PATH = path.join(HERE, '..', 'quarantine-policy.json');
const HASHES_PATH = path.join(HERE, '..', 'quarantined-hashes.json');

export function loadPolicy() {
  const policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
  const hashes = JSON.parse(fs.readFileSync(HASHES_PATH, 'utf8')).hashes;
  for (const f of policy.quarantinedFiles) if (f.blockHash !== false) hashes[f.sha256] ||= f.path;
  return {
    policy,
    hashes: new Map(Object.entries(hashes)),
    systems: new Set(Object.keys(policy.quarantinedSystems)),
    structures: new Set(Object.values(policy.quarantinedStructures).flat()),
  };
}

// Paths (relative to the scanned root, any depth) that must never be published.
const FORBIDDEN_PATHS = [
  /(^|\/)models\/nervous\.glb$/i,
  /(^|\/)thumbnails\/systems\/(nervous|visceral)\.webp$/i,
  /(^|\/)local-data\//i,
];

function glbStructures(buf) {
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) return null;
  const len = buf.readUInt32LE(12), type = buf.readUInt32LE(16);
  if (type !== 0x4e4f534a) return null;
  const json = JSON.parse(buf.subarray(20, 20 + len).toString('utf8'));
  return (json.nodes || []).map((n) => ({ name: n.extras?.za_name || null, system: n.extras?.za_system || null }));
}

function* walk(dir, base = dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) { const st = fs.statSync(p); if (st.isDirectory()) yield* walk(p, base); else yield p; continue; }
    if (e.isDirectory()) { if (e.name === 'node_modules' || e.name === '.git') continue; yield* walk(p, base); }
    else if (e.isFile()) yield p;
  }
}

/** Returns a list of human-readable violations (empty = compliant). */
export function scanDistribution(root, ctx = loadPolicy()) {
  const problems = [];
  if (!fs.existsSync(root)) return problems;
  for (const file of walk(root)) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    if (FORBIDDEN_PATHS.some((re) => re.test(rel))) problems.push(`${rel}: path is withheld by the licence quarantine`);
    const buf = fs.readFileSync(file);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    if (ctx.hashes.has(hash)) problems.push(`${rel}: identical to withdrawn file ${ctx.hashes.get(hash)}`);
    if (/\.glb$/i.test(rel)) {
      let nodes = null; try { nodes = glbStructures(buf); } catch (e) { problems.push(`${rel}: unreadable GLB (${e.message})`); }
      for (const n of nodes || []) {
        if (n.name && ctx.structures.has(n.name)) problems.push(`${rel}: contains quarantined structure "${n.name}"`);
        else if (n.system && ctx.systems.has(n.system)) { problems.push(`${rel}: contains nodes of quarantined system "${n.system}" (e.g. "${n.name}")`); break; }
      }
    }
    const base = path.basename(rel);
    if (base === 'atlas-catalog.json' || base === 'systems.json' || base === 'structure-thumbnails.json') {
      const data = JSON.parse(buf.toString('utf8'));
      const quarantinedNervous = new Set();
      const ids = base === 'systems.json' ? Object.entries(data).flatMap(([sys, list]) => { if (ctx.systems.has(sys) && list.length) quarantinedNervous.add(sys); return list; })
        : base === 'structure-thumbnails.json' ? Object.keys(data.structures || {}) : Object.keys(data);
      for (const sys of quarantinedNervous) problems.push(`${rel}: quarantined system "${sys}" still lists structures`);
      const bad = ids.filter((id) => ctx.structures.has(id));
      if (bad.length) problems.push(`${rel}: lists quarantined structures ${bad.slice(0, 5).join(', ')}${bad.length > 5 ? '…' : ''}`);
      if (base === 'atlas-catalog.json') { const sysBad = Object.entries(data).filter(([, m]) => ctx.systems.has(m?.source)); if (sysBad.length) problems.push(`${rel}: ${sysBad.length} entries from quarantined systems`); }
      if (base === 'structure-thumbnails.json') for (const sys of ctx.systems) if (data.systems?.[sys] || data.models?.[sys]) problems.push(`${rel}: preview of quarantined system "${sys}"`);
    }
    if (base === 'anatomy.json' && /(^|\/)data\/atlas\//.test(rel)) {
      const a = JSON.parse(buf.toString('utf8'));
      for (const [f, h] of Object.entries(a.build?.sourceModels || {})) {
        if (ctx.hashes.has(h)) problems.push(`${rel}: built from withdrawn input ${f}`);
        if (ctx.systems.has(f.replace(/\.glb$/, ''))) problems.push(`${rel}: built from quarantined system ${f}`);
      }
      for (const l of a.labels || []) if (l.available === false && l.volumeMl > 0) problems.push(`${rel}: withheld label ${l.id} has voxels`);
    }
  }
  return problems;
}

export function assertDistributionClean(roots, label = 'distribution') {
  const ctx = loadPolicy();
  const problems = [].concat(...[roots].flat().map((r) => scanDistribution(r, ctx).map((p) => `${r}: ${p}`)));
  if (problems.length) {
    const err = new Error(`Licence quarantine: ${label} contains withheld content (${problems.length}):\n  ` + problems.slice(0, 40).join('\n  '));
    err.problems = problems; throw err;
  }
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const roots = process.argv.slice(2);
  if (!roots.length) { console.error('usage: check-distribution.mjs <dir> [...]'); process.exit(2); }
  try { assertDistributionClean(roots); console.log(`licence quarantine: ${roots.join(', ')} clean`); }
  catch (e) { console.error(e.message); process.exit(1); }
}
