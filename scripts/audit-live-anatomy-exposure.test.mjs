import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAsset, makeTargets, auditPublicAssets } from './audit-live-anatomy-exposure.mjs';

test('pinned withdrawn hashes and tracked candidate GLBs', () => {
  const targets = makeTargets();
  assert.deepEqual(targets.map(x=>x.id), ['nervous-glb','nervous-thumbnail','skeletal-glb','visceral-glb']);
  assert.ok(targets.slice(0,2).every(x=>x.kind==='forbidden' && /^[a-f0-9]{64}$/.test(x.withdrawn)));
  assert.ok(targets.slice(2).every(x=>x.kind==='candidate' && /^[a-f0-9]{64}$/.test(x.withdrawn) &&
    /^[a-f0-9]{64}$/.test(x.expectedCandidate)));
});

test('withheld public bytes remain critical; explicit 404 is safe only for withheld assets', () => {
  assert.deepEqual(classifyAsset({kind:'forbidden',status:200,contentType:'model/gltf-binary',sha256:'x'}),
    {result:'withheld-asset-publicly-served',severity:'critical'});
  assert.deepEqual(classifyAsset({kind:'forbidden',status:404}),
    {result:'not-served',severity:'ok'});
  assert.deepEqual(classifyAsset({kind:'forbidden',status:200,contentType:'text/html'}),
    {result:'spa-html-instead-of-asset',severity:'investigate'});
  assert.deepEqual(classifyAsset({kind:'candidate',status:404}),
    {result:'not-served',severity:'investigate'});
});

test('differentiate withdrawn model, current candidate, and unknown byte identity', () => {
  const opts={kind:'candidate',status:200,contentType:'model/gltf-binary',
    withdrawn:'old',expectedCandidate:'new'};
  assert.deepEqual(classifyAsset({...opts,sha256:'old'}),
    {result:'withdrawn-bytes-publicly-served',severity:'critical'});
  assert.deepEqual(classifyAsset({...opts,sha256:'new'}),
    {result:'matches-repository-candidate-not-commercially-cleared',severity:'review'});
  assert.deepEqual(classifyAsset({...opts,sha256:'another'}),
    {result:'unknown-live-release-bytes',severity:'investigate'});
});

test('read-only public audit handles SPA fallback instead of assuming deployed CT', async () => {
  const calls=[];
  const fetcher=async (url,opts) => {
    calls.push({url:String(url),method:opts.method});
    if (opts.method==='HEAD') return new Response(null,{status:200,headers:{'content-type':'text/html'}});
    return new Response(null,{status:404});
  };
  const r=await auditPublicAssets({fetcher});
  assert.equal(r.criticalFindings,0);
  assert.equal(r.results.length,5);
  assert.equal(r.results[4].result,'spa-fallback-not-proof-of-ct-deployment');
  assert.ok(calls.every(x=>x.url.startsWith('https://medcoel.com/')));
  assert.equal(calls.filter(x=>x.method==='GET').length,4);
  assert.equal(calls.filter(x=>x.method==='HEAD').length,1);
  await assert.rejects(auditPublicAssets({base:'https://evil.example',fetcher}),/Only public/);
});

test('detect actual stream of a forbidden GLB without saving or distributing its bytes', async () => {
  const fetcher=async (url,opts) => {
    if (opts.method==='HEAD') return new Response(null,{status:404});
    return String(url).endsWith('/models/nervous.glb')
      ? new Response(new Uint8Array([1,2,3,4]),{status:200,headers:{'content-type':'model/gltf-binary'}})
      : new Response(null,{status:404});
  };
  const r=await auditPublicAssets({fetcher});
  assert.equal(r.criticalFindings,1);
  assert.equal(r.results[0].result,'withheld-asset-publicly-served');
  assert.match(r.results[0].observedSha256,/^[a-f0-9]{64}$/);
});
