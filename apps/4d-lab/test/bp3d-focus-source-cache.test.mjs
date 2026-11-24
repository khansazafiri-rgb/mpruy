import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {checkCachedSourceReview} from '../tools/prepare-bp3d-focus-leads.mjs';
const h=s=>createHash('sha256').update(s).digest('hex');
const names=Buffer.from('concept id\trepresentation id\ten\nFMA1\tBP1\tmodel');
const elements=Buffer.from('concept id\tname\telement file id\nFMA1\tmodel\tFJ1');
const hash='a'.repeat(64);
const report={status:'PRIVATE_REVIEW_UNVALIDATED',errors:[],
  summary:{converted:584},sourceHashes:{namesSha256:h(names),elementsSha256:h(elements),archiveSha256:hash}};
const inventory={converted:Array.from({length:584},(_,i)=>({name:'model-'+i})),
  sourceHashes:{archiveSha256:hash},approvedForCommercialDistribution:false,
  geometryRegisteredToMEDCOEL:false};
const focus={reviewOnly:true,rows:[]};
const opts={report,focus,inventory,namesBytes:names,elementsBytes:elements};
test('quick source discovery only reuses an unchanged passing private full audit',()=>{
 assert.equal(checkCachedSourceReview(opts),true);
 assert.throws(()=>checkCachedSourceReview({...opts,
    report:{...report,status:'AUDIT_ERRORS'}}),/passing/);
 assert.throws(()=>checkCachedSourceReview({...opts,
    inventory:{...inventory,approvedForCommercialDistribution:true}}),/rights-blocked/);
 assert.throws(()=>checkCachedSourceReview({...opts,
    namesBytes:Buffer.from('tampered names')}),/changed after/);
 assert.throws(()=>checkCachedSourceReview({...opts,
    inventory:{...inventory,converted:[]}}),/passing/);
});
