// Explicit, scoped local security migration. Never deploys, publishes or commits.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {summarizeNpmAudit} from './diagnose-atlas-publication-audit.mjs';

const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const q=path.join(root,'local-data/licensing-quarantine');
assert(fs.realpathSync(q)===q,'Missing or unsafe quarantine directory');
assert(Number(process.versions.node.split('.')[0])>=20,'React Router 7 requires Node >=20; use supported Node 22 or 24 LTS');
const files=['package.json','apps/web/package.json','package-lock.json'];
const git=spawnSync('git',['status','--porcelain','--',...files],{cwd:root,encoding:'utf8'});
assert(git.status===0&&!git.stdout.trim(),'Package files have local changes; review them before migration');
const before=Object.fromEntries(files.map(n=>[n,fs.readFileSync(path.join(root,n))]));
const oldWeb=JSON.parse(before['apps/web/package.json']);
assert.equal(oldWeb.dependencies['react-router-dom'],'^6.30.6','Unexpected router baseline; review manually');
assert.equal(oldWeb.devDependencies.vite,'^6.4.4','Unexpected Vite baseline; review manually');
const out=fs.mkdtempSync(path.join(q,'atlas-host-security-migration-'));fs.chmodSync(out,0o700);
const log=(name,data)=>fs.writeFileSync(path.join(out,name),data,{flag:'wx',mode:0o600});
for(const n of files)log(n.replaceAll('/','_')+'.before',before[n]);
console.log('HOST MIGRATION LOGS',out);
function run(name,args,allowed=[0]){
 console.log('HOST MIGRATION STEP',name);
 const p=spawnSync('npm',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,timeout:900000});
 log(name+'.stdout.log',p.stdout||'');log(name+'.stderr.log',p.stderr||'');
 if(p.error||!allowed.includes(p.status)){
  const tail=[p.stdout||'',p.stderr||''].join('\n').trim().split('\n').slice(-20).join('\n').slice(-4000);
  throw Error(name+' failed (exit '+p.status+'): '+(p.error||tail));
 }
 return p;
}
function audit(name,lockOnly){
 const p=run(name,['audit',...(lockOnly?['--package-lock-only']:[]),'--json','--registry=https://registry.npmjs.org'],[0,1]);
 const s=summarizeNpmAudit(JSON.parse(p.stdout));
 console.log('HOST AUDIT',name,JSON.stringify(s));
 return {s,code:p.status};
}
function verify(){
 assert(fs.readFileSync(path.join(root,'package.json')).equals(before['package.json']),'Unexpected root manifest change');
 const expected=structuredClone(oldWeb);
 expected.dependencies['react-router-dom']='7.18.7';
 expected.devDependencies.vite='6.4.5';
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'apps/web/package.json'))),expected,'Unexpected workspace manifest changes');
 const old=JSON.parse(before['package-lock.json']),next=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json')));
 assert(next.lockfileVersion===old.lockfileVersion&&next.name===old.name,'Lock identity changed');
 for(const key of ['dependencies','devDependencies','workspaces']){
  assert.deepEqual(next.packages['']?.[key],old.packages['']?.[key]);
  assert.deepEqual(next.packages['apps/web']?.[key],expected[key]);
 }
 for(const [n,p] of Object.entries(next.packages)){
  if(n===''||n==='apps/web')continue;
  if(p.link){assert.deepEqual(p,old.packages[n],'Unexpected workspace link');continue;}
  assert(/^https:\/\/registry\.npmjs\.org\//.test(p.resolved||'')&&typeof p.integrity==='string','Unexpected package source: '+n);
 }
 const router=next.packages['node_modules/react-router-dom']||next.packages['apps/web/node_modules/react-router-dom'];
 const vite=next.packages['node_modules/vite']||next.packages['apps/web/node_modules/vite'];
 assert.equal(router?.version,'7.18.7');assert.equal(vite?.version,'6.4.5');
}
let success=false;
try{
 audit('before',true);
 // Explicit versions selected from the local audit recommendation and the Vite advisory.
 // Keep all other direct dependency declarations unchanged; never use audit fix --force.
 const opts=['--workspace','apps/web','--package-lock-only','--ignore-scripts','--no-audit','--no-fund','--save-exact','--registry=https://registry.npmjs.org'];
 run('router-lock',['install','react-router-dom@7.18.7',...opts]);
 run('vite-lock',['install','--save-dev','vite@6.4.5',...opts]);
 verify();
 const lock=audit('candidate-lock',true);
 assert(lock.code===0&&lock.s.status==='NO_REPORTED_VULNERABILITIES'&&lock.s.counts.total===0,'Candidate lock still has audit findings');
 const candidate=Object.fromEntries(files.map(n=>[n,fs.readFileSync(path.join(root,n))]));
 run('install',['ci','--ignore-scripts','--no-audit','--no-fund']);
 const installed=audit('installed',false);
 assert(installed.code===0&&installed.s.status==='NO_REPORTED_VULNERABILITIES'&&installed.s.counts.total===0,'Installed dependency audit failed');
 run('web-test',['run','test','--workspace','apps/web']);
 run('web-lint',['run','lint','--workspace','apps/web']);
 run('web-build',['run','build','--workspace','apps/web']);
 for(const n of files)assert(fs.readFileSync(path.join(root,n)).equals(candidate[n]),'Unexpected package change during verification: '+n);
 verify();
 log('summary.json',JSON.stringify({status:'PASS',router:'7.18.7',vite:'6.4.5',audit:installed.s.counts,webTests:'PASS',webLint:'PASS',webBuild:'PASS',browserRuntime:'PENDING',publicRelease:'NO_GO',productionChanged:false},null,2)+'\n');
 success=true;
 console.log('HOST SECURITY MIGRATION PASS: zero reported vulnerabilities; web tests, lint and build passed; local manifest/lock require review. Browser routing still pending. No production deployment.');
}catch(e){
 if(!success)for(const n of files)fs.writeFileSync(path.join(root,n),before[n]);
 console.error('HOST SECURITY MIGRATION HELD:',String(e.message),'· original package files restored · node_modules may need npm ci before other work · logs:',out);
 process.exitCode=1;
}
