import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {Buffer} from 'node:buffer';
import {historicalISA,currentISA,verifyPublisherReceipt,validatePublisherRevisionProof} from './bp3d-publisher-revisions.mjs';
test('exact retained receipts remain exact; known revision preserves both identities',()=>{
 assert.equal(verifyPublisherReceipt(historicalISA,historicalISA).status,'HISTORICAL_EXACT_BYTES');
 const r=verifyPublisherReceipt(currentISA,historicalISA);
 assert.equal(r.status,'VERIFIED_LICENSE_COMMENT_REVISION');assert.equal(r.exactComparedOBJ,2234);
 assert.deepEqual(r.historical,historicalISA);assert.deepEqual(r.observed,currentISA);
 assert.equal(r.approvedForDistribution,false);assert.equal(r.clinicalValidation,false);
});
test('unknown archive digest, byte count, tree, URL and changed label table are rejected',()=>{
 for(const patch of [{sha256:'f'.repeat(64)},{bytes:currentISA.bytes+1},{tree:'partof'},{url:currentISA.url+'?x=1'},{kind:'names'}]) assert.throws(()=>verifyPublisherReceipt({...currentISA,...patch},historicalISA),/review required/);
 assert.throws(()=>verifyPublisherReceipt({...currentISA,kind:'names'},{...historicalISA,kind:'names'}),/review required/);
});
test('tampered full-member evidence cannot qualify a revision',()=>{
 const b=fs.readFileSync(new URL('../licensing/atlas-publication/checkpoint-evidence/bp3d40-isa-license-comment-member-proof-20261127.json',import.meta.url));
 assert.equal(validatePublisherRevisionProof(b).rows.length,2234);
 assert.throws(()=>validatePublisherRevisionProof(Buffer.concat([b,Buffer.from(' ')])),/proof identity mismatch/);
});
