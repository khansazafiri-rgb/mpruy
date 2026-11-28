// Read-only staging/live checks against the exact locally reviewed package.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {verifyPackage} from './build-atlas-licensed-subset.mjs';
import {verifySubsetInventory} from '../apps/atlas-independent/src/public-subset.js';
const [address,bundle,output]=process.argv.slice(2);assert(address&&bundle&&output,'Usage: node scripts/check-atlas-subset-health.mjs ORIGIN PACKAGE RECEIPT');
const origin=new URL(address);assert.equal(origin.pathname,'/');assert(!origin.username&&!origin.password&&!origin.search&&!origin.hash);
assert(origin.protocol==='https:'&&['medcoel.com','www.medcoel.com'].includes(origin.hostname)||origin.protocol==='http:'&&origin.hostname==='127.0.0.1','Use the existing approved production origin or isolated loopback staging');
const receipt=verifyPackage(bundle),checks=[],sha=b=>createHash('sha256').update(b).digest('hex');
const request=async(p,options={})=>{const r=await fetch(new URL(p,origin),{redirect:'error',signal:AbortSignal.timeout(15000),...options});return r;};
const page=await request('/anatomy/viewer/');assert.equal(page.status,200);assert((page.headers.get('content-type')||'').includes('text/html'));checks.push('viewer-html');
const inv=await request('/anatomy/viewer/inventory.json');assert.equal(inv.status,200);assert((inv.headers.get('content-type')||'').includes('json'));
const doc=await inv.json();await verifySubsetInventory(doc,origin.hostname,receipt.assetSetSHA256,webcrypto.subtle);assert.equal(doc.entries.length,1016);checks.push('exact-inventory-pin');
for(const e of [doc.entries[0],doc.entries[Math.floor(doc.entries.length/2)],doc.entries.at(-1)]){
 const p='/anatomy/viewer/'+e.path,r=await request(p);assert.equal(r.status,200);assert.equal(sha(Buffer.from(await r.arrayBuffer())),e.sha256);const h=await request(p,{method:'HEAD'});assert.equal(h.status,200);assert.equal(+h.headers.get('content-length'),e.bytes);checks.push('sample-model-'+e.id);
}
const denied=['models/skeletal.glb','models/visceral.glb','models/bp-000000000000000000000000.glb','bp3d/private.glb','priority-recovery/private.glb','private-thumbnails/private.png','../4d-lab/data/atlas/private.nii.gz'];
for(const name of denied)for(const options of [{},{method:'HEAD'},{headers:{Range:'bytes=0-15'}}]){const r=await request('/anatomy/viewer/'+name,options);assert.equal(r.status,404,'Private/unlisted path exposed: '+name);checks.push('denied-'+name+'-'+(options.method||options.headers?.Range||'GET'));}
const result={schema:1,origin:origin.origin,packageContentsSHA256:receipt.packageContentsSHA256,assetSetSHA256:receipt.assetSetSHA256,passed:checks.length,failed:0,checks,readOnly:true,productionDeployedByThisCheck:false,productionBackupExecuted:false};fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
