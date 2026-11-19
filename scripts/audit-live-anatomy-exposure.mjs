// MEDCOEL: read-only public endpoint verification. No authentication,
// production writes, Caddy edits, deployment or commercial approval.
// Runs only against https://medcoel.com; compares live bytes with the
// quarantined source hashes and the tracked *candidate* model hashes.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const HOST = 'https://medcoel.com';
const LIMIT = 8 * 1024 * 1024;
const POLICY = path.join(ROOT, 'licensing/quarantine-policy.json');

function shaFile(p) {
  return createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}
function withdrawnByPath(policy) {
  return new Map((policy.quarantinedFiles || []).map(x => [x.path, x.sha256]));
}
export function classifyAsset({ kind, status, sha256, contentType, expectedCandidate, withdrawn }) {
  if (!Number.isInteger(status)) return { result: 'unreachable', severity: 'unknown' };
  if ([404, 410, 403].includes(status)) {
    return kind === 'forbidden' ? { result: 'not-served', severity: 'ok' }
      : { result: 'not-served', severity: 'investigate' };
  }
  if (status < 200 || status >= 300)
    return { result: 'unexpected-http-status', severity: 'unknown' };
  if (/text\/html/i.test(contentType || '')) return { result: 'spa-html-instead-of-asset', severity: 'investigate' };
  if (kind === 'forbidden') return { result: 'withheld-asset-publicly-served', severity: 'critical' };
  if (withdrawn && sha256 === withdrawn) return { result: 'withdrawn-bytes-publicly-served', severity: 'critical' };
  if (expectedCandidate && sha256 === expectedCandidate)
    return { result: 'matches-repository-candidate-not-commercially-cleared', severity: 'review' };
  return { result: 'unknown-live-release-bytes', severity: 'investigate' };
}
async function request(url, { method = 'GET', timeoutMs = 12000, maxBytes = LIMIT, fetcher = fetch } = {}) {
  const r = await fetcher(url, {
    method, redirect: 'manual',
    headers: { Accept: '*/*', 'Cache-Control': 'no-cache', 'User-Agent': 'MEDCOEL-ReadOnly-Rights-Audit/1.0' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const contentType = r.headers.get('content-type') || '';
  if (r.status >= 300 && r.status < 400) return { status: r.status, contentType, issue: 'Redirect not followed for release audit' };
  if (method === 'HEAD' || !r.ok) {
    await r.body?.cancel().catch(() => {});
    return { status: r.status, contentType, contentLength: r.headers.get('content-length') };
  }
  const declared = Number(r.headers.get('content-length') || 0);
  if (declared > maxBytes) {
    await r.body?.cancel().catch(() => {});
    return { status: r.status, contentType, issue: 'Response exceeds maximum audit bytes' };
  }
  if (!r.body) return { status: r.status, contentType, issue: 'Missing response stream' };
  const h = createHash('sha256'), reader = r.body.getReader();
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > maxBytes) throw new Error('Response exceeds audit size limit');
      h.update(next.value);
    }
  } finally { reader.releaseLock(); }
  return { status: r.status, contentType, bytes: size, sha256: h.digest('hex') };
}
export function makeTargets(root = ROOT) {
  const policy = JSON.parse(fs.readFileSync(path.join(root, 'licensing/quarantine-policy.json'), 'utf8'));
  const old = withdrawnByPath(policy);
  const all = [
    { id: 'nervous-glb', remote: '/anatomy/viewer/models/nervous.glb',
      local: 'apps/anatomy/public/models/nervous.glb', kind: 'forbidden' },
    { id: 'nervous-thumbnail', remote: '/anatomy/viewer/thumbnails/systems/nervous.webp',
      local: 'apps/anatomy/public/thumbnails/systems/nervous.webp', kind: 'forbidden' },
    { id: 'skeletal-glb', remote: '/anatomy/viewer/models/skeletal.glb',
      local: 'apps/anatomy/public/models/skeletal.glb', kind: 'candidate' },
    { id: 'visceral-glb', remote: '/anatomy/viewer/models/visceral.glb',
      local: 'apps/anatomy/public/models/visceral.glb', kind: 'candidate' },
  ];
  return all.map(a => ({
    ...a, withdrawn: old.get(a.local) || null,
    expectedCandidate: a.kind === 'candidate' && fs.existsSync(path.join(root, a.local))
      ? shaFile(path.join(root, a.local)) : null,
  }));
}
export async function auditPublicAssets({ base = HOST, root = ROOT, fetcher = fetch } = {}) {
  // Production-only fixed allowlist: no arbitrary URLs, network scans or tokens.
  if (base !== HOST) throw new Error('Only public https://medcoel.com read-only checks are supported.');
  const targets = makeTargets(root);
  const results = [];
  for (const target of targets) {
    let reply;
    try { reply = await request(new URL(target.remote, base), { fetcher }); }
    catch (e) { reply = { issue: e.message, status: null }; }
    const outcome = reply.issue
      ? { result: 'cannot-verify-live-bytes', severity: 'unknown' }
      : classifyAsset({ kind: target.kind, ...reply, expectedCandidate: target.expectedCandidate, withdrawn: target.withdrawn });
    results.push({ id: target.id, route: target.remote, httpStatus: reply.status,
      bytes: reply.bytes ?? null, contentType: reply.contentType ?? null,
      observedSha256: reply.sha256 ?? null, candidateSha256: target.expectedCandidate,
      withdrawnSha256: target.withdrawn, ...outcome,
      ...(reply.issue ? { issue: reply.issue } : {}) });
  }
  // Large CT volumes are probed via HEAD only: HTTP 200 may be SPA fallback.
  const ct = '/anatomy/4d-lab/data/atlas/ct.nrrd';
  try {
    const reply = await request(new URL(ct, base), { method: 'HEAD', fetcher });
    const html = /text\/html/i.test(reply.contentType || '');
    results.push({ id: 'atlas-ct-endpoint', route: ct, httpStatus: reply.status,
      contentType: reply.contentType, bytes: null, observedSha256: null,
      result: html ? 'spa-fallback-not-proof-of-ct-deployment'
        : reply.status === 404 ? 'not-served'
        : reply.status === 200 ? 'served-ct-identity-unverified' : 'unexpected-http-status',
      severity: 'unknown' });
  } catch (e) {
    results.push({ id: 'atlas-ct-endpoint', route: ct, result: 'unreachable',
      severity: 'unknown', issue: e.message });
  }
  return { schemaVersion: 1, auditedAt: new Date().toISOString(), publicHost: HOST,
    kind: 'live-distribution-observation-not-licence-clearance',
    warning: 'Public HTTP observations only: no private VPS topology, cached history, original authorship or commercial rights are established.',
    results, criticalFindings: results.filter(x => x.severity === 'critical').length,
    unverifiedFindings: results.filter(x => x.severity === 'unknown').length };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outputIndex = process.argv.indexOf('--out');
  if (outputIndex >= 0 && (!process.argv[outputIndex + 1] || outputIndex !== process.argv.length - 2)) {
    console.error('Usage: node scripts/audit-live-anatomy-exposure.mjs [--out output.json]');
    process.exitCode = 2;
  } else {
    const report = await auditPublicAssets();
    const out = JSON.stringify(report, null, 2) + '\n';
    if (outputIndex >= 0) {
      const file = path.resolve(process.argv[outputIndex + 1]);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, out);
    }
    console.log(out);
    if (report.criticalFindings) process.exitCode = 1;
    else if (report.unverifiedFindings) process.exitCode = 2;
  }
}
