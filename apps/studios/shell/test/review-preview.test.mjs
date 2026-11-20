import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startReviewPreview, reviewableStudios } from '../../scripts/review-preview.mjs';

test('review preview: token required, only PRIVATE_REVIEW builds, never server/, banner injected', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'review-preview-')); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [id, status] of [['priv-studio', 'PRIVATE_REVIEW'], ['fix-studio', 'TECHNICAL_FIXTURE']]) {
    fs.mkdirSync(path.join(root, id, 'dist/data'), { recursive: true }); fs.mkdirSync(path.join(root, id, 'dist/server'), { recursive: true });
    fs.writeFileSync(path.join(root, id, 'studio.config.json'), '{}');
    fs.writeFileSync(path.join(root, id, 'dist/data/dataset.json'), JSON.stringify({ status }));
    fs.writeFileSync(path.join(root, id, 'dist/index.html'), '<!doctype html><html><body><div id=app></div></body></html>');
    fs.writeFileSync(path.join(root, id, 'dist/server/challenge.json'), '{"answer":1}');
  }
  assert.deepEqual(reviewableStudios(root), ['priv-studio']);
  const s = await startReviewPreview({ root }); t.after(() => s.close());
  assert.ok(s.url.startsWith('http://127.0.0.1:'));
  assert.equal((await fetch(s.url + 'priv-studio/index.html')).status, 401, 'no token, no access');
  assert.equal((await fetch(s.url + '?token=wrong-token-of-another-length')).status, 401);
  const login = await fetch(s.url + '?token=' + s.token, { redirect: 'manual' });
  assert.equal(login.status, 303);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
  const get = p => fetch(s.url + p, { headers: { cookie } });
  const page = await get('priv-studio/index.html');
  assert.equal(page.status, 200); assert.match(await page.text(), /data-testid="review-banner"[\s\S]*PRIVATE REVIEW/);
  assert.equal(page.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal((await get('priv-studio/data/dataset.json')).status, 200);
  assert.equal((await get('priv-studio/server/challenge.json')).status, 404, 'answer keys never served');
  assert.equal((await get('fix-studio/index.html')).status, 404, 'fixture builds are not part of the review');
  assert.equal((await get('priv-studio/../fix-studio/index.html')).status, 404);
  assert.match(await (await get('')).text(), /priv-studio/);
});
