// Single local publication evidence pass; does not start a viewer or deploy.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {prepare} from './prepare-atlas-publication-review.mjs';
import {checkSourceNotices} from './audit-atlas-publication-rights.mjs';
import {prepareHraRightsReview} from './prepare-hra-publication-rights.mjs';
import {inspectInstalled} from './atlas-independent-dependency-audit.mjs';
import {planAlternatives} from './plan-atlas-publication-alternatives.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url)));
const q=path.join(root,'local-data/licensing-quarantine');
const [za,bp]=process.argv.slice(2);
assert(process.argv.length===4&&/^z-anatomy-native-preview-[A-Za-z0-9_-]+$/.test(za||'')&&(bp==='bp3d-all-systems'||/^bp3d-integrated-preview-[A-Za-z0-9_-]+$/.test(bp||'')),'Two explicit existing private folder names required');
assert(fs.realpathSync(q)===q,'Invalid quarantine root');
const out=fs.mkdtempSync(path.join(q,'atlas-publication-audit-'));fs.chmodSync(out,0o700);
const result={schema:1,scope:'Local source evidence and readiness only',steps:{},approvedModels:0,publicRelease:'NO_GO',productionChanged:false};
const write=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
async function step(name,fn){
 try{const d=await fn();write(name+'.json',d);result.steps[name]={status:'REPORT_GENERATED',file:name+'.json'};return d;}
 catch(error){result.steps[name]={status:'BLOCKED',reason:String(error.message||error)};return null;}
}
await step('source-notices',()=>checkSourceNotices());
const native=await step('z-anatomy-rights',()=>prepare(za));
const independent=await step('bp3d-geometry',async()=>{const {auditPack}=await import('./audit-bp3d-publication-geometry.mjs');return auditPack(bp);});
await step('hra-rights',()=>prepareHraRightsReview(q));
await step('software-dependencies',()=>inspectInstalled(path.join(root,'apps/atlas-independent')));
if(native&&independent)await step('source-alternatives',()=>planAlternatives(native,independent));
else result.steps['source-alternatives']={status:'BLOCKED',reason:'Required actual source reports unavailable'};
result.blockedSteps=Object.entries(result.steps).filter(([,s])=>s.status==='BLOCKED').map(([n])=>n);
result.next='Separate named rights review, exact selected model pack, browser build verification and release approval required.';
write('publication-audit-summary.json',result);
console.log('PUBLICATION AUDIT SUMMARY',path.join(out,'publication-audit-summary.json'),JSON.stringify(result));
if(result.blockedSteps.length)process.exitCode=1;
