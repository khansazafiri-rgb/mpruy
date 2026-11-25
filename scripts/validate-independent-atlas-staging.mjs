// Read-only integrity check of an assembled private distribution review.
// No production paths or symlinks are written. Exact-build approval is a separate gate.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {releaseDigest,assertCommercialReleaseReady} from '../licensing/tools/check-commercial-release.mjs';
import {validateInventory} from '../apps/atlas-independent/src/inventory.js';
const repo=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const privateRoot=path.join(repo,'local-data/licensing-quarantine');
const hash=b=>createHash('sha256').update(b).digest('hex');
const hex=/^[a-f0-9]{64}$/;
const text=x=>typeof x==='string'&&x.trim().length>0;
export function validateReviewManifest(inventory,attributions,review){
 const entries=validateInventory(inventory,'127.0.0.1');
 assert(inventory.sourceFrame==='z-anatomy-world-y-up-metres'&&entries.length>0,'Missing native frame or empty selection');
 assert(attributions.schema===1&&Array.isArray(attributions.entries)&&attributions.entries.length===entries.length,'Attribution coverage mismatch');
 assert(review.schema===1&&review.publicRelease==='NO_GO'&&review.approvedBuild===false&&review.selected===entries.length&&Number.isInteger(review.excluded)&&review.excluded>=0&&hex.test(review.selectionSHA256)&&hex.test(review.sourceArchiveSHA256),'Unexpected review record');
 const a=new Map(attributions.entries.map(x=>[x.id,x]));assert(a.size===entries.length,'Duplicate attribution');
 for(const e of entries){
  const r=a.get(e.id);assert(r&&r.name===e.name&&r.sha256===e.sha256&&hex.test(e.sha256),'Model attribution identity mismatch');
  assert(['CC-BY-4.0','CC-BY-SA-4.0','CC-BY-SA-2.1-JP','CC0-1.0','WRITTEN-GRANT'].includes(r.license)&&text(r.rightsHolder)&&text(r.attribution)&&text(r.shareAlike)&&text(r.changeDescription)&&/^https:\/\//.test(r.sourceURL||''),'Incomplete attribution');
 }
 return entries;
}
export function validatePrivateDistribution(folder){
 assert(/^atlas-distribution-review-[A-Za-z0-9_-]+$/.test(folder),'Explicit private distribution review folder required');
 assert(fs.realpathSync(privateRoot)===privateRoot);
 const dir=path.join(privateRoot,folder);assert(fs.realpathSync(dir)===dir);
 const expectedRoot=['MODEL-ATTRIBUTIONS.json','distribution-review.json','inventory.json','models'];
 assert.deepEqual(fs.readdirSync(dir).sort(),expectedRoot,'Unexpected root file in review');
 function read(rel){const p=path.join(dir,rel);assert(fs.realpathSync(p)===p&&fs.statSync(p).isFile(),'Unexpected nonregular file');return fs.readFileSync(p);}
 const readJson=rel=>JSON.parse(read(rel).toString('utf8'));
 const entries=validateReviewManifest(readJson('inventory.json'),readJson('MODEL-ATTRIBUTIONS.json'),readJson('distribution-review.json'));
 const modelDir=path.join(dir,'models');assert(fs.realpathSync(modelDir)===modelDir&&fs.statSync(modelDir).isDirectory());
 assert.deepEqual(fs.readdirSync(modelDir).sort(),entries.map(e=>e.id+'.glb').sort(),'Unlisted model or missing selected model');
 for(const e of entries){
  const b=read(e.path);
  assert(b.length>=20&&b.readUInt32LE(0)===0x46546c67&&b.readUInt32LE(4)===2&&b.readUInt32LE(8)===b.length&&hash(b)===e.sha256,'Selected model integrity mismatch');
 }
 let gate;
 try{assertCommercialReleaseReady('atlas-viewer',dir,undefined,{allowOwnerOverride:false});gate='REVIEW_ONLY_EVEN_IF_DIGEST_APPROVED';}
 catch(error){gate='BLOCKED: '+String(error.message);}
 return {privateReview:folder,selected:entries.length,exactDigest:releaseDigest(dir),gate,publicRelease:'NO_GO',productionChanged:false};
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(validatePrivateDistribution(process.argv[2]||''),null,2));
