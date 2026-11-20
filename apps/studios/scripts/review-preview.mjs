#!/usr/bin/env node
// PRIVATE REVIEWER PREVIEW for Clinical Studios (local/staging machine only). Deliberately OUTSIDE the release pipeline:
// it issues no receipt or attestation, touches no PocketBase, and is never reachable by students.
//   - binds 127.0.0.1 by default (use an SSH tunnel for a remote reviewer; never expose publicly)
//   - every request needs a random per-run access token (cookie set once via /?token=…; printed at start)
//   - serves ONLY private-review builds (dataset status PRIVATE_REVIEW) from apps/studios/<id>/dist
//   - never serves server/ (answer keys, terminology) — reviewers read keys in their review package instead
//   - injects a permanent "PRIVATE REVIEW — not cleared" banner into every studio page
//   - Challenge is not available here (it needs the secure launch); Explore and Guided are.
// Usage: node apps/studios/scripts/build-all.mjs --private --only <ids> && node apps/studios/scripts/review-preview.mjs [--port 4300]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const C = createRequire(import.meta.url)('../../../packages/studio-contract/clearance.cjs');
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BANNER = '<div role="note" data-testid="review-banner" style="position:sticky;top:0;z-index:99999;background:#7a1d1d;color:#fff;font:600 13px system-ui;padding:6px 12px;text-align:center">PRIVATE REVIEW — not cleared for students. Rights, privacy and medical review pending. Do not share or screenshot outside the review.</div>';

export function reviewableStudios(root = ROOT) {
  return fs.readdirSync(root).filter(id => {
    const ds = path.join(root, id, 'dist/data/dataset.json');
    if (!fs.existsSync(path.join(root, id, 'studio.config.json')) || !fs.existsSync(ds)) return false;
    try { return JSON.parse(fs.readFileSync(ds, 'utf8')).status === 'PRIVATE_REVIEW'; } catch { return false; }
  }).sort();
}

export function startReviewPreview({ port = 0, host = '127.0.0.1', root = ROOT, token = crypto.randomBytes(24).toString('base64url') } = {}) {
  const cookie = 'medcoel_review=' + token;
  const authed = req => String(req.headers.cookie || '').split(';').map(s => s.trim()).includes(cookie);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const head = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN' };
    if (url.pathname === '/' && url.searchParams.get('token')) {
      const ok = url.searchParams.get('token').length === token.length && crypto.timingSafeEqual(Buffer.from(url.searchParams.get('token')), Buffer.from(token));
      if (!ok) { res.writeHead(401, head); return res.end('invalid token'); }
      res.writeHead(303, { ...head, 'Set-Cookie': cookie + '; Path=/; HttpOnly; SameSite=Strict', Location: '/' }); return res.end();
    }
    if (!authed(req)) { res.writeHead(401, { ...head, 'Content-Type': 'text/plain' }); return res.end('reviewer token required'); }
    const studios = reviewableStudios(root);
    if (url.pathname === '/') {
      res.writeHead(200, { ...head, 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<!doctype html><meta charset="utf-8"><title>Clinical Studios — private review</title>' + BANNER +
        '<main style="font:15px system-ui;max-width:720px;margin:24px auto"><h1>Clinical Studios — private review</h1><ul>' +
        studios.map(id => `<li>${id}: <a href="/${id}/index.html">Explore</a> · <a href="/${id}/index.html?mode=guided">Guided</a></li>`).join('') +
        '</ul><p>Challenge needs the secure launch and is not available here. Answer keys are in your review package.</p></main>');
    }
    const [, id, ...rest] = url.pathname.split('/');
    const rel = C.safeAssetPath(decodeURIComponent(rest.join('/')) || 'index.html');
    if (!studios.includes(id) || !rel || /^server\//.test(rel)) { res.writeHead(404, head); return res.end('not found'); }
    const file = path.join(root, id, 'dist', rel);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) { res.writeHead(404, head); return res.end('not found'); }
    if (rel === 'index.html') {
      res.writeHead(200, { ...head, 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(file, 'utf8').replace(/<body([^>]*)>/i, m => m + BANNER));
    }
    res.writeHead(200, { ...head, 'Content-Type': C.contentTypeFor(rel) || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(port, host, () => resolve({ url: `http://${host}:${server.address().port}/`, token, close: () => server.close() })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.argv.includes('--port') ? Number(process.argv[process.argv.indexOf('--port') + 1]) : 4300;
  const s = await startReviewPreview({ port });
  console.log('Private review preview (local only):', s.url + '?token=' + s.token);
  console.log('Reviewable studios:', reviewableStudios().join(', ') || '(none: build with --private first)');
}
