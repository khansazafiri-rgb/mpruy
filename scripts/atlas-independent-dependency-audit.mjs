// Independent Atlas dependency evidence and browser-bundle provenance gate.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const allowed=new Set(['MIT','Apache-2.0','ISC','BSD-3-Clause','0BSD','MPL-2.0']);
export function inspectLock(pkg,lock){
 assert(lock.lockfileVersion===3&&lock.name===pkg.name&&lock.version===pkg.version,'Lock identity mismatch');
 const root=lock.packages?.[''];assert.deepEqual(root.dependencies,pkg.dependencies);assert.deepEqual(root.devDependencies,pkg.devDependencies);
 const rows=[];
 for(const [key,p] of Object.entries(lock.packages)){
  if(!key)continue;
  assert(/^node_modules\/(?:@[^/]+\/)?[^/]+(?:\/node_modules\/(?:@[^/]+\/)?[^/]+)*$/.test(key),'Unexpected package location');
  assert(typeof p.version==='string'&&/^https:\/\/registry\.npmjs\.org\//.test(p.resolved||'')&&/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(p.integrity||''),'Missing registry integrity: '+key);
  assert(allowed.has(p.license),'Unreviewed declared license: '+key);
  rows.push({path:key,version:p.version,license:p.license,integrity:p.integrity,scope:p.dev?'build':'runtime',optional:!!p.optional});
 }
 for(const [name,version] of Object.entries({...pkg.dependencies,...pkg.devDependencies}))assert.equal(lock.packages['node_modules/'+name]?.version,version);
 return rows;
}
export function inspectInstalled(app){
 const pkg=JSON.parse(fs.readFileSync(path.join(app,'package.json'),'utf8')),bytes=fs.readFileSync(path.join(app,'package-lock.json'));
 const rows=inspectLock(pkg,JSON.parse(bytes));
 for(const r of rows){
  const folder=path.join(app,r.path);
  if(!fs.existsSync(folder)){assert(r.optional,'Required package missing: '+r.path);r.installed=false;continue;}
  assert(fs.realpathSync(folder)===folder,'Unexpected package symlink: '+r.path);
  const p=JSON.parse(fs.readFileSync(path.join(folder,'package.json'),'utf8'));
  assert.equal(p.version,r.version,'Installed version mismatch: '+r.path);
  assert.equal(p.license,r.license,'Installed license declaration mismatch: '+r.path);
  r.installed=true;r.noticeFiles=fs.readdirSync(folder).filter(n=>/^(licen[cs]e|copying|notice)([._-].*)?$/i.test(n)).filter(n=>fs.statSync(path.join(folder,n)).isFile()).map(n=>({name:n,sha256:hash(fs.readFileSync(path.join(folder,n)))}));
 }
 return {lockSHA256:hash(bytes),packages:rows,publicRelease:'NO_GO',note:'Declared SPDX licenses and installed notice hashes; not a legal review of native binaries or all bundled code.'};
}
export function classifyModule(id,app){
 if(id==='\0vite/modulepreload-polyfill.js'||id==='\0vite/preload-helper.js')return 'vite';
 if(typeof id!=='string')return null;
 const clean=id.split('?')[0];
 if(clean===path.join(app,'index.html')||clean.startsWith(path.join(app,'src')+path.sep))return 'medcoel-independent';
 if(clean.startsWith(path.join(app,'node_modules/three')+path.sep))return 'three';
 return null;
}
export function publicationBundleGate(app,notices,record){
 return {name:'independent-atlas-license-boundary',generateBundle(_opts,bundle){
  const modules=[];
  for(const [file,chunk] of Object.entries(bundle)){
   if(chunk.type!=='chunk')continue;
   for(const id of Object.keys(chunk.modules)){
    const owner=classifyModule(id,app);assert(owner,'Unreviewed browser module: '+id);
    modules.push({file,id:id.startsWith(app+path.sep)?id.slice(app.length+1):id,owner});
   }
  }
  assert(modules.length>0,'No browser module evidence');
  record.modules=modules;
  this.emitFile({type:'asset',fileName:'THIRD-PARTY-NOTICES.txt',source:notices});
 }};
}
