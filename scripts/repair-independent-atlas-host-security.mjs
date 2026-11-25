// Remediate compatible root-workspace security findings only. No deploy or auto commit.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {summarizeNpmAudit} from './diagnose-atlas-publication-audit.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const q=path.join(root,'local-data/licensing-quarantine');
assert(fs.realpathSync(q)===q);
const files=['package.json','apps/web/package.json','package-lock.json'];
const before=Object.fromEntries(files.map(n=>[n,fs.readFileSync(path.join(root,n))]));
const out=fs.mkdtempSync(path.join(q,'atlas-host-security-repair-'));fs.chmodSync(out,0o700);
const log=(name,content)=>fs.writeFileSync(path.join(out,name),content,{flag:'wx',mode:0o600});
const run=args=>{const p=spawnSync('npm',args,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,timeout:300000});if(p.error)throw p.error;return p;};
function audit(name){
 const p=run(['audit','--package-lock-only','--json']);log(name+'.json',p.stdout||'');log(name+'.stderr.log',p.stderr||'');
 assert([0,1].includes(p.status),'npm audit unavailable');
 const s=summarizeNpmAudit(JSON.parse(p.stdout));console.log('HOST SECURITY '+name.toUpperCase(),JSON.stringify(s));return s;
}
function manifestsUnchanged(){
 for(const n of files.slice(0,2))assert(fs.readFileSync(path.join(root,n)).equals(before[n]),'Unexpected manifest change: '+n);
 const old=JSON.parse(before['package-lock.json']),next=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json')));
 assert(next.lockfileVersion===old.lockfileVersion&&next.name===old.name,'Lock identity changed');
 for(const n of ['', 'apps/web']){
  for(const k of ['dependencies','devDependencies','workspaces'])assert.deepEqual(next.packages[n]?.[k],old.packages[n]?.[k],'Dependency declarations changed: '+n+'/'+k);
 }
 // Only allow registry integrity records and existing workspace links.
 for(const [n,p] of Object.entries(next.packages)){
  if(n===''||n==='apps/web')continue;
  if(p.link){assert.deepEqual(p,old.packages[n],'Unexpected workspace link');continue;}
  assert(/^https:\/\/registry\.npmjs\.org\//.test(p.resolved||'')&&typeof p.integrity==='string','Unexpected resolved source: '+n);
 }
 return {changedPackages:Object.entries(next.packages).filter(([n,p])=>p.version&&p.version!==old.packages[n]?.version).map(([n,p])=>({path:n,from:old.packages[n]?.version||null,to:p.version})),lockChanged:!fs.readFileSync(path.join(root,'package-lock.json')).equals(before['package-lock.json'])};
}
for(const n of files)log(n.replaceAll('/','_')+'.before',before[n]);
let committed=false;
try{
 const initial=audit('before');
 if(initial.counts.total){
  // npm chooses compatible resolutions using the live advisory database; no --force.
  const fix=run(['audit','fix','--package-lock-only','--ignore-scripts','--no-fund','--registry=https://registry.npmjs.org','--json']);
  log('fix.json',fix.stdout||'');log('fix.stderr.log',fix.stderr||'');
  assert([0,1].includes(fix.status),'npm compatible repair failed');
 }
 const changes=manifestsUnchanged(),after=audit('after');
 if(after.counts.total){throw Error('Compatible fixes did not resolve every advisory; review exact findings before changing direct dependency ranges');}
 committed=true;
 console.log('HOST SECURITY REPAIR',JSON.stringify({...changes,auditCounts:after.counts,publicRelease:'NO_GO',productionChanged:false,backup:out,localLockNeedsReview:changes.lockChanged}));
}catch(e){
 if(!committed)for(const n of files)fs.writeFileSync(path.join(root,n),before[n]);
 console.error('HOST SECURITY REPAIR HELD:',String(e.message),'· original package files preserved · logs:',out);process.exitCode=1;
}
