import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectLock,classifyModule,publicationBundleGate} from '../../../scripts/atlas-independent-dependency-audit.mjs';
const app=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const pkg=JSON.parse(fs.readFileSync(path.join(app,'package.json'))),lock=JSON.parse(fs.readFileSync(path.join(app,'package-lock.json')));
test('pinned independent lock graph has exact root versions, declared licenses and integrity',()=>{
 const rows=inspectLock(pkg,lock);
 assert.equal(rows.length,50);
 assert.deepEqual(rows.filter(r=>r.scope==='runtime').map(r=>r.path),['node_modules/three']);
 for(const change of [{license:'CC-BY-NC-4.0'},{integrity:'invalid'},{version:'0.0.0'}]){
  const bad=structuredClone(lock);Object.assign(bad.packages['node_modules/three'],change);
  assert.throws(()=>inspectLock(pkg,bad));
 }
});
test('only independently authored application and known browser dependency paths are admitted',()=>{
 assert.equal(classifyModule(path.join(app,'src/main.js'),app),'medcoel-independent');
 assert.equal(classifyModule(path.join(app,'node_modules/three/src/Three.js'),app),'three');
 assert.equal(classifyModule('\0vite/modulepreload-polyfill.js',app),'vite');
 assert.equal(classifyModule(path.resolve(app,'../anatomy/src/main.js'),app),null);
 assert.equal(classifyModule(path.join(app,'node_modules/other/index.js'),app),null);
 const record={},emitted=[],plugin=publicationBundleGate(app,'fixture notice',record);
 plugin.generateBundle.call({emitFile:x=>emitted.push(x)},null,{'fixture.js':{type:'chunk',modules:{[path.join(app,'src/main.js')]:{},[path.join(app,'node_modules/three/build/three.module.js')]:{}}}});
 assert.equal(record.modules.length,2);assert.equal(emitted[0].fileName,'THIRD-PARTY-NOTICES.txt');
 assert.throws(()=>plugin.generateBundle.call({emitFile(){}},null,{'fixture.js':{type:'chunk',modules:{[path.resolve(app,'../anatomy/src/main.js')]:{}}}}));
});
