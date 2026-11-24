import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const configs=['deploy/Caddyfile','deploy/anatomy.caddy.snippet'];
const denied=[
 '/anatomy/viewer/models/skeletal.glb',
 '/anatomy/viewer/models/visceral.glb',
 '/anatomy/viewer/bp3d/*',
 '/anatomy/4d-lab/data/atlas/*'
];
function assertExactGuards(file){
 const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
 for(const target of denied){
  // Explicit single-path handle has precedence over broad handle_path.
  const start='handle '+target+' {';
  assert.equal(source.split(start).length,2,'missing or duplicate quarantine '+target+' in '+file);
  const after=source.slice(source.indexOf(start)+start.length);
  const block=after.slice(0,after.indexOf('}'));
  assert.match(block,/\brespond\s+"Not Found"\s+404/);
  assert.match(block,/\bheader\s+Cache-Control\s+"private, no-store, max-age=0"/);
 }
 // Compare actual directive lines, not earlier comments explaining handle_path.
 // The old substring search found a comment at the top of the snippet and
 // falsely failed despite the deny preceding the real file-server route.
 const guard=/^\s*handle\s+\/anatomy\/viewer\/models\/skeletal\.glb\s*\{/m.exec(source);
 const fileserver=/^\s*handle_path\s+\/anatomy\/viewer\/\*\s*\{/m.exec(source);
 assert.ok(guard&&fileserver&&guard.index<fileserver.index,
   'specific GLB deny must precede real file-server directive');
 const bp3d=/^\s*handle\s+\/anatomy\/viewer\/bp3d\/\*\s*\{/m.exec(source);
 assert.ok(bp3d&&fileserver&&bp3d.index<fileserver.index,'private BodyParts3D deny must precede real Atlas route');
 const atlas=/^\s*handle\s+\/anatomy\/4d-lab\/data\/atlas\/\*\s*\{/m.exec(source);
 const fallback=/^\s*handle\s*\{\s*$/m.exec(source);
 if(fallback)assert.ok(atlas&&atlas.index<fallback.index,
   'Atlas denial must precede real SPA catch-all');
 return source;
}
test('PUBLIC-GATE-001: production Caddy and modular snippet deny unverified GLBs and Atlas subtree',()=>{
 for(const f of configs)assertExactGuards(f);
});
test('PUBLIC-GATE-002: contain assets but retain unrelated Anatomy paths and PocketBase backend routing',()=>{
 const c=assertExactGuards(configs[0]);
 assert.match(c,/handle\s+\/api\/\*/);
 assert.match(c,/handle_path\s+\/anatomy\/viewer\/\*/);
 assert.match(c,/root \* \/var\/lib\/medcoel\/anatomy-viewer/);
 assert.match(c,/reverse_proxy 127\.0\.0\.1:8090/);
 assert.match(c,/root \* \/opt\/medcoel\/apps\/web\/dist/);
 assert.doesNotMatch(c,/respond\s+@(?:anatomy|all)\s+404/);
});
test('PUBLIC-GATE-003: real local Caddy smoke exercises HEAD, GET, Range and unrelated GLB',()=>{
 const smoke=fs.readFileSync(new URL('./anatomy-caddy-smoke.mjs',import.meta.url),'utf8');
 for(const target of [
   '/anatomy/viewer/models/skeletal.glb','/anatomy/viewer/models/visceral.glb',
   '/anatomy/viewer/bp3d/inventory.json','/anatomy/viewer/bp3d/structures/unreviewed/model.glb',
   '/anatomy/4d-lab/data/atlas/ct.nrrd','/anatomy/4d-lab/data/atlas/labels.nrrd'
 ])assert.ok(smoke.includes(target),'missing smoke path '+target);
 assert.match(smoke,/assert\.equal\(response\.status,404/);
 assert.match(smoke,/response\.headers\.get\('cache-control'\)/);
 assert.match(smoke,/Range:'bytes=0-11'/);
 assert.match(smoke,/models\/muscular\.glb/);
});
