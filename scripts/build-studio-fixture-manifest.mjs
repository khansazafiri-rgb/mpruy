// Build-only fixture metadata, never a commercial clearance or publication record.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../apps/studios/foundation-fixture/dist/', import.meta.url));
const files = [];
function visit(dir, prefix='') {
  for (const name of fs.readdirSync(dir).sort()) {
    const p=path.join(dir,name),rel=(prefix?prefix+'/':'')+name,s=fs.lstatSync(p);
    if (s.isSymbolicLink()) throw Error('Fixture build may not contain symlinks');
    if (s.isDirectory()) visit(p,rel);
    else if (s.isFile() && rel!=='studio-manifest.json') files.push({path:rel,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')});
  }
}
if (!fs.existsSync(root)) throw Error('Build fixture before generating manifest');
visit(root);
if (!files.some(f=>f.path==='index.html')) throw Error('Fixture index missing');
let builtFrom;
try { builtFrom=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(); }
catch { throw Error('Git source commit is required even for the engineering fixture'); }
if (!/^[a-f0-9]{40}$/.test(builtFrom)) throw Error('Invalid commit for technical manifest');
fs.writeFileSync(path.join(root,'studio-manifest.json'),JSON.stringify({
  schema:'medcoel.studio.v1',id:'foundation-fixture',releaseId:'fixture-release',
  entry:'index.html',builtFrom,files,assetRefs:[],
  note:'Engineering-only build: NOT a commercial/medical clearance or authorized release.'
},null,2)+'\n');
console.log('Fixture manifest generated (not released):',files.length,'files');
