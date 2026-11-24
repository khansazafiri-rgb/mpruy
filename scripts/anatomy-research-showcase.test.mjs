import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const page=fs.readFileSync(path.join(root,'apps/web/public/medcoel-research-preview.html'),'utf8');

test('professor showcase is an original self-contained public document; no private anatomy assets or patient data',()=>{
 assert.match(page,/<title>MEDCOEL — Clinical Learning Research Preview<\/title>/);
 assert.match(page,/<html lang="id">/);
 assert.match(page,/<meta name="robots" content="noindex, nofollow">/);
 assert.match(page,/702/);
 assert.match(page,/31,38%/);
 assert.match(page,/2\.237/);
 assert.match(page,/belum tervalidasi klinis|belum memiliki izin distribusi|belum selesai/i);
 assert.match(page,/data-concept="atlas"/);
 assert.match(page,/data-concept="guided"/);
 assert.match(page,/data-concept="imaging"/);
 assert.match(page,/data-concept="challenge"/);
 for(const re of [/<img\b/i,/<iframe\b/i,/<script[^>]+src=/i,
   /<link[^>]+href=/i,/\/bp3d\//i,/\/models\//i,/\/data\/atlas\//i,/\bfetch\s*\(/i])
   assert.doesNotMatch(page,re);
});
test('web-only deployment script parses and does not restart/reload Caddy, PocketBase or publish model data',()=>{
 const deploy=path.join(root,'deploy/research-showcase-web-only.sh');
 execFileSync('bash',['-n',deploy],{timeout:5000});
 const content=fs.readFileSync(deploy,'utf8');
 assert.match(content,/APPROVED_SHA/);
 assert.match(content,/merge-base --is-ancestor/);
 assert.match(content,/git -C "\$REPO" show/);
 assert.match(content,/CADDY=/);
 assert.match(content,/sudo install -m 0644/);
 assert.doesNotMatch(content,/systemctl (restart|reload|stop)|git (pull|reset --hard)|stage:anatomy|stage:4d-lab/);
 assert.doesNotMatch(content,/\bcp\b.*(?:pb_data|\.glb)/);
});
