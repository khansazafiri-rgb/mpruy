#!/usr/bin/env node
// Clinical Studios human-review workflow (medical, privacy, terminology), bound to exact SHA-256 bytes.
//
// Nothing here can approve content by itself: a decision is only effective when
//   (1) the reviewer is listed in licensing/reviews/reviewers.v1.json for that review kind (added by the owner, with a
//       credential reference — the tool never creates reviewers), and
//   (2) the decision is HMAC-signed with a review key held outside the repository (MEDCOEL_REVIEW_KEYS="kid:secret,..."),
//   (3) it targets the exact current bytes (sha256) and has not been revoked.
// Changing the bytes (new pipeline output, edited terminology pack) silently invalidates the approval: the projection
// falls back to "pending". A rejection of a parent (official raw input) also blocks approvals of its derived assets.
//
// Commands
//   package <studioId>                     private review package in local-data/studio-resources/review-packages/<id>/
//   privacy-scan [studioId]                automated PHI/metadata checks on derived bytes (evidence, not a sign-off)
//   decide --target asset:<id>|terminology:<studioId> --kind medical|privacy|terminology --decision approved|rejected
//          --reviewer <id> --scope <use>[,<use>] --evidence <ref> --reason <text>
//   revoke --decision <decisionId> --reviewer <id> --reason <text>
//   apply                                  project effective decisions onto licensing/resources.v1.json review fields
//   verify [--structural]                  check log, reviewers and that the registry equals the projection
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const REG = path.join(REPO, 'licensing/resources.v1.json');
const LOG = path.join(REPO, 'licensing/reviews/decisions.v1.json');
const REVIEWERS = path.join(REPO, 'licensing/reviews/reviewers.v1.json');
const BUILD = path.join(REPO, 'local-data/studio-resources/build');
const PACKAGES = path.join(REPO, 'local-data/studio-resources/review-packages');
const KINDS = ['medical', 'privacy', 'terminology'];
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const canonical = v => Array.isArray(v) ? '[' + v.map(canonical).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}' : JSON.stringify(v);

export function parseReviewKeys(text = process.env.MEDCOEL_REVIEW_KEYS || '') {
  const keys = {};
  for (const part of String(text).split(',').map(s => s.trim()).filter(Boolean)) {
    const i = part.indexOf(':'); const kid = part.slice(0, i), secret = part.slice(i + 1);
    if (i > 0 && /^[a-z0-9-]{1,32}$/.test(kid) && secret.length >= 32) keys[kid] = secret;
  }
  return keys;
}
const signBody = d => { const { signature, ...body } = d; return 'medcoel.review-decision.v1\n' + canonical(body); };
export const signDecision = (d, secret) => crypto.createHmac('sha256', secret).update(signBody(d)).digest('hex');
function signatureOk(d, keys) {
  const secret = keys[d.kid]; if (!secret || typeof d.signature !== 'string' || !/^[a-f0-9]{64}$/.test(d.signature)) return false;
  return crypto.timingSafeEqual(Buffer.from(signDecision(d, secret), 'hex'), Buffer.from(d.signature, 'hex'));
}

export function emptyLog() { return { schema: 'medcoel.review-decisions.v1', note: 'Append-only. Entries are created only by licensing/tools/studio-review.mjs with an out-of-repo key.', decisions: [] }; }
export function emptyReviewers() { return { schema: 'medcoel.reviewers.v1', note: 'Added by the owner only. Each reviewer needs a real identity and a credential reference (e.g. STR/SIP number or institutional role) kept in the owner\'s records.', reviewers: [] }; }

/** Current bytes of a review target. Assets come from the registry; terminology packs from the private build. */
export function targetSha(target, { resources, buildRoot = BUILD }) {
  const [type, id] = String(target).split(/:(.*)/s);
  if (type === 'asset') { const a = resources.assets.find(x => x.id === id); return a ? a.sha256 : null; }
  if (type === 'terminology') { const f = path.join(buildRoot, id, 'review/terminology.draft.json'); return fs.existsSync(f) ? sha(fs.readFileSync(f)) : null; }
  return null;
}

/** Validity of every decision (signature, reviewer authority, structure), then effective state per target+kind. */
export function project({ log, reviewers, resources, keys = {}, structural = false, buildRoot = BUILD }) {
  const problems = [], revoked = new Map();
  const byId = new Map(log.decisions.map(d => [d.id, d]));
  const reviewerOk = (rid, kind, at) => reviewers.reviewers.some(r => r.id === rid && Array.isArray(r.kinds) && r.kinds.includes(kind) && typeof r.credentialRef === 'string' && r.credentialRef.trim().length >= 3 && (!r.revokedAt || r.revokedAt > at));
  const valid = d => {
    if (!d || typeof d.id !== 'string') return 'malformed';
    if (!structural && !signatureOk(d, keys)) return 'signature';
    if (d.type === 'revocation') return byId.get(d.revokes) ? null : 'unknown-revoked-decision';
    if (d.type !== 'decision' || !KINDS.includes(d.kind) || !['approved', 'rejected'].includes(d.decision)) return 'malformed';
    if (!/^[a-f0-9]{64}$/.test(d.sha256 || '') || !Array.isArray(d.scope) || !d.scope.length || !String(d.evidenceRef || '').trim()) return 'malformed';
    if (!reviewerOk(d.reviewerId, d.kind, d.decidedAt)) return 'reviewer-not-authorised';
    return null;
  };
  for (const d of log.decisions) { const p = valid(d); if (p) problems.push({ id: d && d.id, problem: p }); else if (d.type === 'revocation') revoked.set(d.revokes, d); }
  const effective = new Map(); // key target|kind -> decision
  for (const d of log.decisions) {
    if (d.type !== 'decision' || valid(d) || revoked.has(d.id)) continue;
    if (targetSha(d.target, { resources, buildRoot }) !== d.sha256) continue; // bytes changed: decision no longer applies
    effective.set(d.target + '|' + d.kind, d); // later decisions supersede earlier ones
  }
  // Parent rejection cascades to derived assets.
  const state = (target, kind) => {
    const d = effective.get(target + '|' + kind);
    if (!d) return { status: 'pending' };
    if (d.decision === 'rejected') return { status: 'pending', rejectedBy: d.id };
    if (target.startsWith('asset:')) {
      const a = resources.assets.find(x => 'asset:' + x.id === target);
      for (const dep of a ? a.dependsOn : []) { const p = effective.get('asset:' + dep.assetId + '|' + kind); if (p && p.decision === 'rejected') return { status: 'pending', rejectedBy: p.id }; }
    }
    return { status: 'approved', decision: d };
  };
  return { problems, revoked: [...revoked.keys()], state };
}

// Same text the registrar writes, so an unreviewed registry is exactly the projection of an empty log.
export const PENDING_REASON = 'Awaiting human review of the exact bytes and intended educational use.';
const PENDING = { status: 'pending', reviewer: '', reviewedAt: null, reviewedSha256: null, scope: [], reason: PENDING_REASON };
export function applyProjection(resources, proj) {
  const out = structuredClone(resources);
  for (const a of out.assets) for (const kind of ['medical', 'privacy']) {
    const s = proj.state('asset:' + a.id, kind);
    a[kind + 'Review'] = s.status === 'approved'
      ? { status: 'approved', reviewer: s.decision.reviewerId, reviewedAt: s.decision.decidedAt, reviewedSha256: s.decision.sha256, scope: s.decision.scope, reason: 'decision ' + s.decision.id }
      : { ...PENDING, reason: s.rejectedBy ? 'Rejected by decision ' + s.rejectedBy + '; ' + PENDING_REASON : PENDING_REASON };
  }
  return out;
}

/** Automated privacy / metadata scan of derived bytes. Findings are evidence for a human privacy reviewer, never a sign-off. */
const IDENTITY_KEY = /^(patient.*|.*birth.*|dob|age|sex|gender|mrn|accession.*|institution.*|.*physician.*|operator.*|(study|series|acquisition|content)(date|time)|.*serial.*|address|phone|email)$/i;
export function privacyScan(studio, buildRoot = BUILD) {
  const dir = path.join(buildRoot, studio), findings = [];
  const add = (file, severity, check, detail) => findings.push({ file, severity, check, detail });
  const walkJson = (file, v, p = '') => {
    if (Array.isArray(v)) return v.forEach((x, i) => walkJson(file, x, p + '[' + i + ']'));
    if (v && typeof v === 'object') return Object.entries(v).forEach(([k, x]) => { if (IDENTITY_KEY.test(k)) add(file, 'high', 'identity-key', p + '.' + k); walkJson(file, x, p + '.' + k); });
    if (typeof v === 'string') {
      if (/\b(19|20)\d{2}-\d{2}-\d{2}\b|\b(19|20)\d{6}\b/.test(v)) add(file, 'review', 'date-like-value', p + ' = ' + v.slice(0, 60));
      if (/\b1\.2\.840\.\d+|\b1\.3\.6\.1\.4\.1\.\d+/.test(v)) add(file, 'review', 'dicom-uid', p);
      if (/@[a-z0-9-]+\.[a-z]{2,}/i.test(v)) add(file, 'high', 'email-like-value', p);
    }
  };
  const files = [];
  const walk = (d, pre = '') => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const rel = pre + e.name; if (e.isDirectory()) walk(path.join(d, e.name), rel + '/'); else files.push(rel); } };
  walk(dir);
  for (const rel of files.filter(f => f !== 'provenance.json' && !f.startsWith('review/'))) {
    const b = fs.readFileSync(path.join(dir, rel));
    if (rel.endsWith('.gz')) {
      if (b[3] & 0x08) add(rel, 'high', 'gzip-original-filename', 'FNAME flag set');
      if (b.readUInt32LE(4) !== 0) add(rel, 'review', 'gzip-mtime', 'non-zero modification time');
      const n = zlib.gunzipSync(b);
      if (rel.endsWith('.nii.gz')) {
        const text = (o, l) => n.slice(o, o + l).toString('latin1').replace(/\0+$/, '').trim();
        if (text(4, 10) || text(14, 18)) add(rel, 'review', 'nifti-legacy-text', 'db_name/data_type not empty');
        if (text(148, 80)) add(rel, 'high', 'nifti-descrip', text(148, 80));
        if (text(228, 24)) add(rel, 'high', 'nifti-aux-file', text(228, 24));
        if (n.length > 352 && n[348] !== 0) add(rel, 'high', 'nifti-extension', 'header extension present');
      }
    } else if (rel.endsWith('.json')) walkJson(rel, JSON.parse(b.toString('utf8')));
    else if (rel.endsWith('.glb')) {
      const len = b.readUInt32LE(12), gltf = JSON.parse(b.slice(20, 20 + len).toString('utf8'));
      walkJson(rel + '#json', { asset: gltf.asset, extras: gltf.extras || null, scenes: gltf.scenes });
      if ((gltf.nodes || []).some(nd => nd.name && !/^s\d{3}$/.test(nd.name))) add(rel, 'review', 'glb-node-names', 'node names are not opaque ids');
    } else if (/\.(csv|tsv)$/i.test(rel)) add(rel, 'high', 'tabular-metadata-shipped', 'tabular file in delivered data');
    else if (/\.(dcm|ima)$/i.test(rel) || (b.length > 132 && b.slice(128, 132).toString('latin1') === 'DICM')) add(rel, 'high', 'dicom-shipped', 'DICOM file in delivered data');
  }
  return { schema: 'medcoel.privacy-scan.v1', studio, scannedAt: new Date().toISOString(), files: files.length, findings,
    automated: true, note: 'Automated checks only. A privacy reviewer must still confirm de-identification, burned-in text and re-identification risk.' };
}

/** Terminology draft (proposed): source names + FMA + laterality; Indonesian/Latin left empty for the reviewer. */
export function terminologyDraft(studio, buildRoot = BUILD) {
  const dir = path.join(buildRoot, studio, 'data');
  const table = fs.existsSync(path.join(dir, 'structures.json')) ? readJson(path.join(dir, 'structures.json')) : fs.existsSync(path.join(dir, 'labels.json')) ? readJson(path.join(dir, 'labels.json')) : null;
  if (!table || !Array.isArray(table.structures)) return null;
  const concepts = {};
  for (const s of table.structures) {
    const id = s.fma || studio + ':' + s.id, side = ['left', 'right'].includes(s.side) ? s.side : undefined;
    concepts[id] = { structureId: s.id, side: s.side || null, canonical: { en: s.nameEn, id: null, la: null },
      forms: [{ language: 'en', value: s.nameEn, side }], needs: ['nameId', 'nameLatin', 'synonyms', 'laterality-check'] };
  }
  return { schema: 'medcoel.terminology.v1', status: 'proposed', studio, source: table.source, version: 0,
    note: 'Draft generated from source names. Not usable for grading until a terminology reviewer completes ID/Latin forms and the exact bytes are approved.', concepts };
}

export function buildPackage(studio, { resources = readJson(REG), buildRoot = BUILD, outRoot = PACKAGES } = {}) {
  const assets = resources.assets.filter(a => a.id.startsWith(studio + '.'));
  if (!assets.length) throw Error('No registered derived assets for ' + studio);
  const out = path.join(outRoot, studio); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const parents = [...new Set(assets.flatMap(a => a.dependsOn.map(d => d.assetId)))].map(id => resources.assets.find(a => a.id === id));
  const files = {};
  const put = (name, data) => { const b = Buffer.isBuffer(data) ? data : Buffer.from(typeof data === 'string' ? data : JSON.stringify(data, null, 2)); fs.writeFileSync(path.join(out, name), b); files[name] = sha(b); };
  put('assets.json', { studio, derived: assets.map(({ id, path: p, sha256, bytes, kind, format, dependsOn, derivation }) => ({ id, path: p, sha256, bytes, kind, format, dependsOn, derivation })),
    parents: parents.map(({ id, sha256, sourceFile, rightsEvidenceRef }) => ({ id, sha256, sourceFile, rightsEvidenceRef })) });
  const scan = privacyScan(studio, buildRoot); put('privacy-scan.json', scan);
  const key = path.join(buildRoot, studio, 'server/challenge.json'); if (fs.existsSync(key)) put('challenge-key.json', fs.readFileSync(key));
  const draft = terminologyDraft(studio, buildRoot);
  if (draft) {
    const reviewDir = path.join(buildRoot, studio, 'review'); fs.mkdirSync(reviewDir, { recursive: true });
    const existing = path.join(reviewDir, 'terminology.draft.json');
    if (!fs.existsSync(existing)) fs.writeFileSync(existing, JSON.stringify(draft, null, 2)); // never overwrite reviewer work
    put('terminology.draft.json', fs.readFileSync(existing));
  }
  const high = scan.findings.filter(f => f.severity === 'high').length, rev = scan.findings.length - high;
  put('README.md', `# Paket review — ${studio}

Status: **belum direview**. Paket ini privat (local-data, tidak di-commit). Semua keputusan harus terikat SHA-256 di bawah.

## Yang direview
| Aset | Jenis | SHA-256 |
|---|---|---|
${assets.map(a => `| \`${a.path}\` | ${a.kind} | \`${a.sha256}\` |`).join('\n')}

Induk resmi: ${parents.map(p => '`' + p.id + '`').join(', ')}.

## Checklist medis/anatomis
- [ ] Label/struktur benar dan sesuai sumber; lateralitas kiri/kanan benar pada viewer.
- [ ] Kunci Challenge (\`challenge-key.json\`) benar; penjelasan tidak menyesatkan; tidak ada nama yang dikarang.
- [ ] Langkah Guided sesuai tujuan pembelajaran; batasan data (mis. satu kasus, model pria saja) disebut jelas.

## Checklist privasi
- [ ] Hasil scan otomatis: ${high} temuan tinggi, ${rev} perlu ditinjau (\`privacy-scan.json\`).
- [ ] Tidak ada identitas pasien, tanggal, institusi, atau teks terbakar di citra.
- [ ] Risiko re-identifikasi dapat diterima untuk penggunaan yang dimaksud.

## Checklist terminologi (jika ada \`terminology.draft.json\`)
- [ ] Lengkapi bentuk Indonesia (\`id\`) dan Latin (\`la\`), sinonim, dan sisi; kemudian pack direview sebagai byte yang tepat.

## Cara mencatat keputusan (oleh reviewer terdaftar, dengan kunci review di luar repo)
\`\`\`
node licensing/tools/studio-review.mjs decide --target asset:<id> --kind medical --decision approved \\
  --reviewer <reviewer-id> --scope private-review --evidence <ref-dokumen-review> --reason "<ringkasan>"
\`\`\`
Perubahan byte apa pun membatalkan persetujuan secara otomatis.
`);
  put('package-manifest.json', { schema: 'medcoel.review-package.v1', studio, createdAt: new Date().toISOString(), files });
  return { out, files, findings: scan.findings.length, high };
}

function args(list) { const o = {}; for (let i = 0; i < list.length; i++) if (list[i].startsWith('--')) o[list[i].slice(2)] = list[i + 1] && !list[i + 1].startsWith('--') ? list[++i] : true; return o; }
const loadLog = () => fs.existsSync(LOG) ? readJson(LOG) : emptyLog();
const loadReviewers = () => fs.existsSync(REVIEWERS) ? readJson(REVIEWERS) : emptyReviewers();

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2), a = args(rest), resources = readJson(REG), keys = parseReviewKeys();
  const die = m => { console.error(m); process.exit(1); };
  if (cmd === 'package') { const r = buildPackage(rest[0]); console.log(JSON.stringify(r, null, 1)); }
  else if (cmd === 'privacy-scan') {
    const studios = rest[0] && !rest[0].startsWith('--') ? [rest[0]] : [...new Set(resources.assets.filter(x => !x.sourceFile).map(x => x.id.split('.')[0]))];
    const all = studios.map(s => privacyScan(s));
    console.log(JSON.stringify(all.map(r => ({ studio: r.studio, files: r.files, high: r.findings.filter(f => f.severity === 'high').length, review: r.findings.filter(f => f.severity !== 'high').length, checks: [...new Set(r.findings.map(f => f.check))] })), null, 1));
  } else if (cmd === 'decide' || cmd === 'revoke') {
    const kid = process.env.MEDCOEL_REVIEW_KID || Object.keys(keys)[0];
    if (!kid || !keys[kid]) die('MEDCOEL_REVIEW_KEYS (kid:secret, secret >= 32 chars) is required; keys never live in the repository.');
    const log = loadLog(), reviewers = loadReviewers(), now = new Date().toISOString();
    if (!a.reviewer || !reviewers.reviewers.some(r => r.id === a.reviewer)) die('Reviewer ' + a.reviewer + ' is not in licensing/reviews/reviewers.v1.json (only the owner adds reviewers).');
    let d;
    if (cmd === 'decide') {
      const s = targetSha(a.target, { resources }); if (!s) die('Unknown target ' + a.target);
      if (!KINDS.includes(a.kind) || !['approved', 'rejected'].includes(a.decision) || !a.scope || !a.evidence || !a.reason) die('Missing --kind/--decision/--scope/--evidence/--reason');
      d = { type: 'decision', target: a.target, sha256: s, kind: a.kind, decision: a.decision, reviewerId: a.reviewer, decidedAt: now, scope: String(a.scope).split(','), evidenceRef: String(a.evidence), reason: String(a.reason), kid };
    } else {
      if (!log.decisions.some(x => x.id === a.decision)) die('Unknown decision ' + a.decision);
      if (!a.reason) die('--reason required');
      d = { type: 'revocation', revokes: a.decision, reviewerId: a.reviewer, decidedAt: now, reason: String(a.reason), kid };
    }
    d.id = 'rd-' + sha(canonical(d)).slice(0, 16); d.signature = signDecision(d, keys[kid]);
    log.decisions.push(d); fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.writeFileSync(LOG, JSON.stringify(log, null, 2) + '\n');
    console.log('recorded', d.id, '(run "apply" to update the registry)');
  } else if (cmd === 'apply' || cmd === 'verify') {
    const structural = !!a.structural;
    if (!structural && !Object.keys(keys).length && loadLog().decisions.length) die('Signature verification needs MEDCOEL_REVIEW_KEYS; use --structural for a key-less check.');
    const proj = project({ log: loadLog(), reviewers: loadReviewers(), resources, keys, structural });
    const next = applyProjection(resources, proj);
    if (cmd === 'apply') { fs.writeFileSync(REG, JSON.stringify(next, null, 2) + '\n'); console.log(JSON.stringify({ problems: proj.problems, revoked: proj.revoked.length })); }
    else {
      const drift = resources.assets.filter((x, i) => canonical(x.medicalReview) !== canonical(next.assets[i].medicalReview) || canonical(x.privacyReview) !== canonical(next.assets[i].privacyReview)).map(x => x.id);
      const approved = next.assets.filter(x => x.medicalReview.status === 'approved' || x.privacyReview.status === 'approved').length;
      console.log(JSON.stringify({ ok: !drift.length && !proj.problems.length, decisions: loadLog().decisions.length, reviewers: loadReviewers().reviewers.length, approvedAssets: approved, drift, problems: proj.problems }, null, 1));
      process.exit(!drift.length && !proj.problems.length ? 0 : 1);
    }
  } else die('usage: studio-review.mjs package|privacy-scan|decide|revoke|apply|verify');
}
