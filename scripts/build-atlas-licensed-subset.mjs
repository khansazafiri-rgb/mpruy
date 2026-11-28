// Build only the byte-pinned, independently licensed educational body subset.
// Private inventories and the legacy commercial-release gate remain unchanged.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {SUBSET_PRODUCT,assetPinRows,verifySubsetInventory} from '../apps/atlas-independent/src/public-subset.js';
export const RIGHTS_LEDGER_SHA256='6a077ac1bc67d586cbe24cc9bd22c8cda0eca961f91752324ef6c0a51c751f8a';
const hash=b=>createHash('sha256').update(b).digest('hex');
const readJSON=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export function validateRightsLedger(bytes,inventory){
 assert.equal(hash(bytes),RIGHTS_LEDGER_SHA256,'Unreviewed rights ledger');
 const ledger=JSON.parse(bytes);assert.equal(ledger.product,SUBSET_PRODUCT);assert.equal(ledger.status,'PUBLIC_LICENSE_PERMISSION_VERIFIED');
 assert.equal(ledger.releaseAuthorized,false);assert.equal(ledger.clinicalValidation,false);assert.equal(ledger.registrationValidated,false);
 assert.equal(ledger.rows.length,1016);assert.equal(inventory.bodyModels.length,1016);
 const rows=new Map(ledger.rows.map(r=>[r.id,r]));assert.equal(rows.size,1016);
 for(const m of inventory.bodyModels){const r=rows.get(m.id);assert(r,'Missing licensed model');for(const k of ['path','sha256','fmaId','bpId','sourceTree'])assert.equal(r[k],m[k],'Rights identity mismatch '+k);assert.equal(r.licenseStatus,'PUBLIC_LICENSE_PERMISSION_VERIFIED');assert.equal(r.license,'CC-BY-4.0');assert.deepEqual(r.sourceHashes,m.sourceHashes);assert(Object.values(r.checks).every(v=>v===true));}
 return ledger;
}
function listFiles(root,rel=''){return fs.readdirSync(path.join(root,rel)).sort().flatMap(n=>{const r=path.join(rel,n),p=path.join(root,r);assert.equal(fs.realpathSync(p),p,'Symlink not permitted in package');return fs.statSync(p).isDirectory()?listFiles(root,r):[r.split(path.sep).join('/')];});}
export function verifyPackage(folder){
 folder=fs.realpathSync(folder);const receipt=readJSON(path.join(folder,'PACKAGE-RECEIPT.json'));
 assert.equal(receipt.product,SUBSET_PRODUCT);assert.equal(receipt.productionDeployed,false);assert.equal(receipt.operatorReleaseAuthorized,false);
 const names=listFiles(folder).filter(x=>x!=='PACKAGE-RECEIPT.json');assert.deepEqual(names,receipt.files.map(x=>x.path));
 for(const r of receipt.files){const b=fs.readFileSync(path.join(folder,r.path));assert.equal(b.length,r.bytes);assert.equal(hash(b),r.sha256,'Package changed: '+r.path);}
 assert.equal(hash(Buffer.from(JSON.stringify(receipt.files))),receipt.packageContentsSHA256);
 assert.equal(receipt.files.filter(x=>/^models\/bp-[a-f0-9]{24}\.glb$/.test(x.path)).length,1016);
 const rightsBytes=fs.readFileSync(path.join(folder,'RIGHTS-EVIDENCE.json'));assert.equal(hash(rightsBytes),RIGHTS_LEDGER_SHA256,'Unreviewed package rights ledger');
 const ledger=JSON.parse(rightsBytes),rights=new Map(ledger.rows.map(r=>[r.sha256,r])),inventory=readJSON(path.join(folder,'inventory.json'));
 assert.equal(inventory.product,SUBSET_PRODUCT);assert.equal(inventory.entries.length,1016);assert.equal(inventory.assetSetSHA256,receipt.assetSetSHA256);
 assert.equal(hash(JSON.stringify(assetPinRows(inventory.entries))),receipt.assetSetSHA256);
 const manifestFiles=new Map(receipt.files.map(f=>[f.path,f]));
 for(const e of inventory.entries){const r=rights.get(e.sha256),f=manifestFiles.get(e.path);assert(r&&f,'Unlicensed or absent package model');assert.equal(r.fmaId,e.fmaId);assert.equal(r.bpId,e.bpId);assert.equal(r.officialName,e.name);assert.equal(e.license,'CC-BY-4.0');assert.equal(e.sha256,f.sha256);assert.equal(e.bytes,f.bytes);}

 return receipt;
}
export async function buildLicensedSubset({root,packFolder,ledgerFile,out}){
 const [{loadIndependentReview},{attachIndependentShell},{inspectInstalled,publicationBundleGate}]=await Promise.all([import('./load-independent-source-review.mjs'),import('./independent-atlas-shell.mjs'),import('./atlas-independent-dependency-audit.mjs')]);
 root=fs.realpathSync(root);out=path.join(fs.realpathSync(path.dirname(path.resolve(out))),path.basename(out));assert(!fs.existsSync(out),'Output already exists');
 const pack=loadIndependentReview(fs.realpathSync(path.join(root,'local-data/licensing-quarantine')),packFolder);
 const ledgerBytes=fs.readFileSync(ledgerFile),ledger=validateRightsLedger(ledgerBytes,pack.inventory);
 const rows=new Map(ledger.rows.map(r=>[r.id,r]));
 const entries=pack.manifest.entries.map((e,i)=>{const m=pack.inventory.bodyModels[i],r=rows.get(m.id);return {...e,approvedForDistribution:true,license:r.license,sha256:r.sha256,bytes:r.bytes,attribution:r.attribution};});
 const pin=hash(JSON.stringify(assetPinRows(entries)));
 const manifest={schema:1,mode:'licensed-educational-subset',product:SUBSET_PRODUCT,publicRelease:'PUBLIC_LICENSE_EVIDENCE_VERIFIED',sourceKind:'independent-bp3d',sourceFrame:'native-official-OBJ',assetSetSHA256:pin,clinicalValidation:false,registrationValidated:false,entries};
 await verifySubsetInventory(manifest,'medcoel.com',pin,webcrypto.subtle);
 const app=path.join(root,'apps/atlas-independent'),req=createRequire(path.join(app,'package.json')),{build}=await import(pathToFileURL(req.resolve('vite')).href);
 const dependencyEvidence=inspectInstalled(app),bundleEvidence={};
 const notices=['three','vite'].map(n=>fs.readFileSync(path.join(root,'licensing/atlas-publication/source-notices',n+'.txt'),'utf8')).join('\n\n');
 fs.mkdirSync(out,{recursive:true});
 try{
 await build({root:app,configFile:false,publicDir:false,base:'/anatomy/viewer/',define:{'import.meta.env.VITE_MEDCOEL_SUBSET_PIN':JSON.stringify(pin)},plugins:[publicationBundleGate(app,notices,bundleEvidence)],build:{outDir:out,emptyOutDir:true,sourcemap:false}});
 const shell=attachIndependentShell(root,out);assert.equal(shell.legacyCodeIncluded,false);
 const write=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
 write('inventory.json',manifest);write('RIGHTS-EVIDENCE.json',ledger);
 write('MODEL-ATTRIBUTIONS.json',{product:SUBSET_PRODUCT,license:'CC-BY-4.0',attribution:ledger.rows[0].attribution,licenseBasis:ledger.licenseBasis,body:ledger.rows.map(({id,path,sha256,license,attribution,changes,sourceArchive,fmaId,bpId})=>({id,path,sha256,license,attribution,changes,sourceArchive,fmaId,bpId}))});
 write('SOFTWARE-EVIDENCE.json',{shell,dependencyEvidence,bundleEvidence});
 fs.mkdirSync(path.join(out,'models'));
 for(const e of entries){const original=pack.models.get('/anatomy/viewer/'+e.path),b=fs.readFileSync(original);assert.equal(hash(b),e.sha256);assert.equal(b.length,e.bytes);fs.writeFileSync(path.join(out,e.path),b,{flag:'wx'});}
 const index=path.join(out,'index.html');fs.writeFileSync(index,fs.readFileSync(index,'utf8').replace('MEDCOEL Atlas · Independent prototype','MEDCOEL Human Anatomy').replace('Pratinjau pengembangan','Subset pembelajaran berlisensi'));
 const files=listFiles(out).map(p=>{const b=fs.readFileSync(path.join(out,p));return {path:p,bytes:b.length,sha256:hash(b)};});
 const receipt={schema:1,product:SUBSET_PRODUCT,models:entries.length,assetSetSHA256:pin,rightsLedgerSHA256:RIGHTS_LEDGER_SHA256,packageContentsSHA256:hash(JSON.stringify(files)),files,clinicalValidation:false,registrationValidated:false,operatorReleaseAuthorized:false,productionDeployed:false,checks:{exactAssetRights:true,modelByteHashes:true,independentPresentation:true,privatePackNotModified:true},pending:['actual browser rendering of this build','desktop/mobile interaction replay','staging endpoint/performance audit','production backup and operator release approval']};
 write('PACKAGE-RECEIPT.json',receipt);verifyPackage(out);return receipt;
 }catch(e){fs.rmSync(out,{recursive:true,force:true});throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args[0]==='--verify'){const r=verifyPackage(args[1]);console.log(JSON.stringify({models:r.models,packageContentsSHA256:r.packageContentsSHA256,verified:true}));}
 else {assert.equal(args.length,3,'Usage: node scripts/build-atlas-licensed-subset.mjs PACK_FOLDER RIGHTS_LEDGER OUTPUT');const r=await buildLicensedSubset({root:fileURLToPath(new URL('../',import.meta.url)),packFolder:args[0],ledgerFile:args[1],out:args[2]});console.log(JSON.stringify({models:r.models,assetSetSHA256:r.assetSetSHA256,packageContentsSHA256:r.packageContentsSHA256,bytes:r.files.reduce((s,f)=>s+f.bytes,0),out:args[2]}));}
}
