// Operator-side immutable staging and atomic activation. Never invokes SSH.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {verifyPackage} from '../scripts/build-atlas-licensed-subset.mjs';
export function stageSubset(bundle,releases){
 const receipt=verifyPackage(bundle),digest=receipt.packageContentsSHA256;
 fs.mkdirSync(releases,{recursive:true});releases=fs.realpathSync(releases);
 const release=path.join(releases,digest);assert(!fs.existsSync(release),'Immutable release already exists');
 const temp=fs.mkdtempSync(path.join(releases,'.stage-'));
 try{const copy=path.join(temp,'bundle');fs.cpSync(fs.realpathSync(bundle),copy,{recursive:true,errorOnExist:true,force:false});verifyPackage(copy);fs.renameSync(copy,release);fs.rmdirSync(temp);}catch(e){fs.rmSync(temp,{recursive:true,force:true});throw e;}
 return {release,digest,productionDeployed:false};
}
export function activateSubset(release,active,approval){
 release=fs.realpathSync(release);const r=verifyPackage(release);
 assert.equal(approval.packageContentsSHA256,r.packageContentsSHA256,'Approval must pin these exact bytes');
 assert.equal(approval.authorized,true,'Explicit release authorization missing');
 for(const flag of ['actualBuildBrowserPassed','securityPassed','licensePassed','validationAccepted','productionBackupVerified','stagingHealthPassed','rollbackRehearsed'])assert.equal(approval[flag],true,'Missing release prerequisite: '+flag);
 assert.equal(typeof approval.operator,'string');assert(approval.operator.trim(),'Operator identity required');
 assert.equal(typeof approval.backupReceiptSHA256,'string');assert(/^[a-f0-9]{64}$/.test(approval.backupReceiptSHA256),'Verified backup receipt hash required');
 const parent=fs.realpathSync(path.dirname(active));active=path.join(parent,path.basename(active));
 let previous=null;try{assert(fs.lstatSync(active).isSymbolicLink(),'Active path must be a symlink; preserve existing directory manually');previous=fs.realpathSync(active);}catch(e){if(e.code!=='ENOENT')throw e;}
 assert(previous!==release,'Already active');
 const tmp=active+'.'+process.pid+'.next';assert(!fs.existsSync(tmp));fs.symlinkSync(release,tmp);try{fs.renameSync(tmp,active);}catch(e){fs.unlinkSync(tmp);throw e;}
 return {active,release,previous,packageContentsSHA256:r.packageContentsSHA256};
}
export function rollbackSubset(active,previous,expectedCurrentDigest){
 active=path.join(fs.realpathSync(path.dirname(active)),path.basename(active));assert(fs.lstatSync(active).isSymbolicLink());
 assert.equal(verifyPackage(fs.realpathSync(active)).packageContentsSHA256,expectedCurrentDigest,'Active release changed; refuse rollback');
 previous=fs.realpathSync(previous);assert(fs.statSync(previous).isDirectory(),'Previous release missing');
 const tmp=active+'.'+process.pid+'.rollback';assert(!fs.existsSync(tmp));fs.symlinkSync(previous,tmp);fs.renameSync(tmp,active);return {active,restored:previous};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [command,a,b,c]=process.argv.slice(2);
 if(command==='stage')console.log(JSON.stringify(stageSubset(a,b)));
 else if(command==='activate'){assert(c,'Approval JSON path required');console.log(JSON.stringify(activateSubset(a,b,JSON.parse(fs.readFileSync(c,'utf8')))));}
 else if(command==='rollback')console.log(JSON.stringify(rollbackSubset(a,b,c)));
 else throw Error('Usage: stage BUNDLE RELEASES | activate RELEASE ACTIVE APPROVAL_JSON | rollback ACTIVE PREVIOUS EXPECTED_CURRENT_DIGEST');
}
