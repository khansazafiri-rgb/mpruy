import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepare4dLabCaddy} from './prepare-4d-lab-caddy.mjs';
const snippet=fs.readFileSync(new URL('../deploy/4d-lab.caddy.snippet',import.meta.url),'utf8');
const canonical=fs.readFileSync(new URL('../deploy/Caddyfile',import.meta.url),'utf8');
const site=[
  'api.medcoel.com { respond "untouched" }',
  'medcoel.com {',
  '  header X-Frame-Options DENY',
  '  handle /api/* { reverse_proxy 127.0.0.1:8090 }',
  '  handle_path /anatomy/viewer/* { root * /var/lib/medcoel/anatomy-viewer',
  '    file_server',
  '  }',
  '  handle /anatomy/4d-lab/data/atlas/* { respond "Not Found" 404 }',
  '  handle_path /anatomy/4d-lab/* { root * /old/lab',
  '    file_server',
  '  }',
  '  handle { root * /opt/medcoel/apps/web/dist',
  '    try_files {path} /index.html',
  '    file_server',
  '  }',
  '}'
].join('\n');
const count=(s,re)=>(s.match(re)||[]).length;
test('production Caddyfile retains exact security quarantine; original Lab route is separately reviewed only',()=>{
 for(const required of [
  'handle /anatomy/4d-lab/data/atlas/* {',
  'handle /anatomy/viewer/bp3d/* {',
  'handle_path /anatomy/viewer/* {',
  'handle /api/* {','root * /opt/medcoel/apps/web/dist'
 ])assert.ok(canonical.includes(required),'production security missing '+required);
 assert.equal(count(canonical,/handle_path \/anatomy\/4d-lab\/\*/g),0,
  'Do not activate the actual Lab while source rights remain blocked');
 for(const required of [
  'handle /anatomy/4d-lab/data/atlas/* {',
  'handle /anatomy/4d-lab {',
  'handle_path /anatomy/4d-lab/* {',
  'root * /var/lib/medcoel/4d-lab'
 ])assert.ok(snippet.includes(required),'review snippet missing '+required);
 const bp3d=canonical.indexOf('handle /anatomy/viewer/bp3d/* {'),
  files=canonical.indexOf('handle_path /anatomy/viewer/* {');
 assert.ok(bp3d>=0&&bp3d<files,'private BP3D 404 must precede viewer route');
});

test('review-only Caddy candidate replaces ONLY its 4D routes, preserving unrelated services, viewer, and site',()=>{
  const next=prepare4dLabCaddy(site,snippet);
  assert.equal(count(next,/handle_path \/anatomy\/4d-lab\/\*/g),1);
  assert.equal(count(next,/handle \/anatomy\/4d-lab\/data\/atlas\/\*/g),1);
  assert.ok(next.includes('root * /var/lib/medcoel/4d-lab'));
  assert.ok(!next.includes('/old/lab'));
  assert.ok(next.includes('api.medcoel.com { respond "untouched" }'));
  assert.ok(next.includes('reverse_proxy 127.0.0.1:8090'));
  assert.ok(next.includes('root * /var/lib/medcoel/anatomy-viewer'));
  assert.ok(next.includes('root * /opt/medcoel/apps/web/dist'));
  const last=prepare4dLabCaddy(next,snippet);
  assert.equal(count(last,/handle_path \/anatomy\/4d-lab\/\*/g),1);
  assert.equal(count(last,/handle \/anatomy\/4d-lab\/data\/atlas\/\*/g),1);
  assert.ok(last.includes('reverse_proxy 127.0.0.1:8090'),
    'replaying must preserve existing backend and exactly one Lab mount');
});
test('missing site or unrecognised 4D rewrite fails closed, and no release policy can be bypassed',()=>{
  assert.throws(()=>prepare4dLabCaddy('import site-config/*.caddy',snippet),/explicit medcoel.com/);
  assert.throws(()=>prepare4dLabCaddy(site.replace('\nmedcoel.com {','\nmedcoel.com {\n rewrite /anatomy/4d-lab/* /unsafe'),snippet),/Unrecognised/);
  assert.throws(()=>prepare4dLabCaddy(site,'handle_path /anatomy/4d-lab/* {}'),/lacks essential/);
  const release=fs.readFileSync(new URL('./stage-4d-lab.mjs',import.meta.url),'utf8');
  assert.match(release,/assertCommercialReleaseReady\('4d-lab'/);
  assert.match(release,/verifyAtlasPack/);
  const rights=JSON.parse(fs.readFileSync(new URL('../licensing/commercial-release.json',import.meta.url),'utf8'));
  assert.equal(rights.products['4d-lab'].status,'blocked');
  assert.equal(rights.products['4d-lab'].ownerOverride?.enabled,false);
});
