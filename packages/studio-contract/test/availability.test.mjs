import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const core = require('../availability.cjs');
const catalog = JSON.parse(fs.readFileSync(new URL('../../../shared/studios/catalog.v1.json', import.meta.url), 'utf8'));
const server = require('../../../apps/pocketbase/pb_hooks/lib/studio-contract.generated.js');
const user = { role: 'user', campus: '', active: true };
const admin = { role: 'admin', campus: '', active: true };
const clone = v => JSON.parse(JSON.stringify(v));

test('studio baseline remains 24 visible and non-launchable clinical applications', () => {
  const a = core.list(catalog, user);
  assert.equal(a.items.length, 24);
  assert.ok(a.items.every(x => x.availability.canLaunch === false && x.capabilities.length === 0));
  assert.ok(!a.items.some(x => x.id === 'foundation-fixture'));
});
test('admins see only the 25th internal fixture, still not launchable', () => {
  const a = core.list(catalog, admin);
  assert.equal(a.items.length, 25);
  assert.equal(a.items.find(x => x.id === 'foundation-fixture').availability.state, 'building');
  assert.ok(a.items.every(x => !x.availability.canLaunch));
});
test('generated server contract matches source and catalog by semantic projection', () => {
  assert.deepEqual(server.catalog, catalog);
  assert.deepEqual(server.list(catalog, user), core.list(catalog, user));
});
test('catalog metadata must not leak data provenance, reviewer information, secret or keys', () => {
  const s = JSON.stringify(core.list(catalog, admin));
  for (const name of ['dataset', 'reviewedBy', 'sourceRef', 'rightsEvidence', 'secret', 'answerKey']) assert.ok(!s.includes(name));
});
test('inactive, unsupported roles, and missing campus permission are invisible', () => {
  assert.equal(core.list(catalog, { role: 'agent', active: true }).items.length, 0);
  assert.equal(core.list(catalog, { role: 'user', active: false }).items.length, 0);
  const item = clone(catalog.studios.find(s => s.id === 'brain-mri'));
  item.access.campuses = ['campus-a'];
  assert.equal(core.resolve(item, user), null);
  assert.ok(core.resolve(item, { ...user, campus: 'campus-a' }));
});
test('unknown or hidden studio yields same 404, no existence leak', () => {
  assert.deepEqual(core.launch(catalog, 'does-not-exist', user), {status:404,code:'NOT_FOUND'});
  assert.deepEqual(core.launch(catalog, 'foundation-fixture', user), {status:404,code:'NOT_FOUND'});
});
test('planned and blocked studios are not launchable via any query', () => {
  for (const id of ['brain-mri', 'brain-anatomy', 'ecg']) {
    assert.equal(core.launch(catalog, id, user).status, 409);
    assert.equal(core.launch(catalog, id, admin).status, 409);
  }
});
test('unknown, duplicate and privilege-injection query parameters fail closed', () => {
  for (const q of [{force:'1'}, {approved:'true'}, {entry:'https://bad.example'}, {token:'x'}, {mode:['explore','guided']}, {caseId:'x'}, {language:'xx'}])
    assert.equal(core.launch(catalog, 'brain-mri', user, q).status, 400);
});
test('guided and challenge may not launch without an approved case registry', () => {
  assert.equal(core.launch(catalog, 'brain-mri', user, {mode:'guided'}).status, 409);
  assert.equal(core.launch(catalog, 'brain-mri', user, {mode:'challenge'}).status, 409);
});
test('source flags or injected trusted assertions cannot open an unpublished studio', () => {
  const t={ receipt:{verified:true,strict:true}, release:{},attestation:{verified:true},adapters:['mpr'] };
  assert.equal(core.resolve(catalog.studios.find(s=>s.id==='brain-mri'), user, t).canLaunch, false);
});
test('safe launch paths reject external or traversal redirects', () => {
  for (const x of ['https://example.com/index.html','//example.com/index.html','../index.html','%2e%2e/index.html','index.html?force=1']) assert.equal(core.safeEntry(x, 'brain-mri', 'rel'), false);
  assert.equal(core.safeEntry('index.html', 'brain-mri', 'rel'), true);
});
const fixture = () => {
  const f = clone(catalog.studios.find(s=>s.id==='brain-mri'));
  f.release.status='publishable';
  f.licensing={status:'verified', ref:'licensing/commercial-release.json#studio:brain-mri'};
  f.review={clinical:'approved',anatomical:'approved'};
  f.runtime={type:'iframe',entry:'index.html',releaseId:'rel'};
  f.capabilities=['slice-navigation'];
  f.datasets=[];
  const hash='a'.repeat(64), digest='b'.repeat(64);
  return {f, trusted:{release:{id:'rel',studioId:'brain-mri',entry:f.runtime.entry,resourceManifestSha256:hash,buildDigest:digest,capabilities:['slice-navigation']},receipt:{verified:true,strict:true,studioId:'brain-mri',releaseId:'rel',resourceManifestSha256:hash,buildDigest:digest},attestation:{verified:true,studioId:'brain-mri',releaseId:'rel',buildDigest:digest},adapters:['slice-navigation']}};
};
test('a synthetic complete trusted fixture alone can become ready',()=>{
  const {f,trusted}=fixture();
  assert.equal(core.resolve(f,user,trusted).state,'ready');
  const res=core.launch({schemaVersion:1,studios:[f]},f.id,user,{language:'en'},trusted);
  assert.equal(res.status,200);
  assert.equal(res.value.runtime.entry,'/api/medcoel/studio-assets/brain-mri/rel/index.html');
  assert.ok(!('user' in res.value.context));
});
test('missing signed receipt, installation attestation, or capability fails closed',()=>{
  const {f,trusted}=fixture();
  for(const key of ['receipt','attestation','adapters']){
    const bad=clone(trusted);delete bad[key];
    assert.notEqual(core.resolve(f,user,bad).state,'ready');
  }
  for(const field of ['verified','strict']){
    const bad=clone(trusted);bad.receipt[field]=false;
    assert.equal(core.resolve(f,user,bad).canLaunch,false);
  }
  const wrong=clone(trusted);wrong.release.buildDigest='c'.repeat(64);
  assert.equal(core.resolve(f,user,wrong).canLaunch,false);
});
