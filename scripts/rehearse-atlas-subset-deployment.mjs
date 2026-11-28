// Exercises the real immutable package on a disposable local filesystem only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {verifyPackage} from './build-atlas-licensed-subset.mjs';
import {stageSubset,activateSubset,rollbackSubset} from '../deploy/atlas-subset-release.mjs';
const [bundle,output]=process.argv.slice(2);
assert(bundle&&output,'Usage: node scripts/rehearse-atlas-subset-deployment.mjs PACKAGE RECEIPT');
const receipt=verifyPackage(bundle),temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'medcoel-subset-rehearsal-')));
try{
 const previous=path.join(temp,'previous'),active=path.join(temp,'active');fs.mkdirSync(previous);fs.writeFileSync(path.join(previous,'sentinel.txt'),'previous release retained');fs.symlinkSync(previous,active);
 const staged=stageSubset(bundle,path.join(temp,'releases'));assert.equal(staged.digest,receipt.packageContentsSHA256);
 assert.throws(()=>activateSubset(staged.release,active,{}));assert.equal(fs.realpathSync(active),previous);
 // Deliberately synthetic engineering authorization, never usable as a production receipt.
 const approval={authorized:true,packageContentsSHA256:staged.digest,operator:'ENGINEERING FIXTURE ONLY',backupReceiptSHA256:'0'.repeat(64),actualBuildBrowserPassed:true,securityPassed:true,licensePassed:true,validationAccepted:true,productionBackupVerified:true,stagingHealthPassed:true,rollbackRehearsed:true};
 const activated=activateSubset(staged.release,active,approval);assert.equal(activated.previous,previous);assert.equal(fs.realpathSync(active),staged.release);
 assert.throws(()=>rollbackSubset(active,previous,'f'.repeat(64)));assert.equal(fs.realpathSync(active),staged.release);
 rollbackSubset(active,previous,staged.digest);assert.equal(fs.realpathSync(active),previous);assert.equal(fs.readFileSync(path.join(active,'sentinel.txt'),'utf8'),'previous release retained');
 const result={schema:1,scope:'Disposable local filesystem; authorization and backup hash are engineering fixtures only',packageContentsSHA256:staged.digest,tests:5,passed:5,failed:0,stageVerified:true,unauthorizedActivationRejected:true,atomicActivationPassed:true,wrongDigestRollbackRejected:true,previousTargetRestored:true,productionBackupExecuted:false,productionDeployed:false};
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{fs.rmSync(temp,{recursive:true,force:true});}
