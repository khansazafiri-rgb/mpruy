import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {BP43_MUSCLE} from './atlas-reference-suite-spec.mjs';
import {retainedReceipt,readRetainedReports,replayPlan,replayReceiptChild} from './replay-audited-bp3d43-suite.mjs';
import {select43Acquisition,load43Elements,combine43Registries} from './load-bp3d43-private-elements.mjs';
export function muscleBatchState(q){
 const {evidence,count}=retainedReceipt(BP43_MUSCLE[1]);assert.equal(count,24);replayPlan(evidence,count);
 const reports=readRetainedReports(q),ids=evidence.matches.map(e=>e.fj).sort(),same=reports.filter(r=>Array.isArray(r.report.results)&&JSON.stringify(r.report.results.map(e=>e.fj).sort())===JSON.stringify(ids));
 if(!same.length)return null;const folder=select43Acquisition(same,evidence);return load43Elements(q,folder,evidence,count);
}
export async function prepareMuscleBatch(q,acquire){
 let batch=muscleBatchState(q);if(batch||!acquire)return batch;
 const lock=path.join(q,'.atlas-private-workstation-prepare-lock');fs.mkdirSync(lock,{mode:0o700});
 try{batch=muscleBatchState(q);if(!batch){await replayReceiptChild(BP43_MUSCLE[1]);batch=muscleBatchState(q);}assert.equal(batch?.assets.size,24);return batch;}finally{fs.rmdirSync(lock);}
}
export function appendMuscleBatch(base,batch){
 assert(base.inventory.expansionProfile==='BP43_128_20261126'&&base.assets.size===376&&batch.assets.size===24);
 const r=combine43Registries([base,batch]);assert.equal(r.assets.size,400);r.inventory.expansionProfile='BP43_152_20261126';return r;
}
