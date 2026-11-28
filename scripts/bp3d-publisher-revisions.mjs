// Accept one complete, independently audited publisher archive revision.
// Historical receipts and GLB source hashes remain unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {URL} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

const publisherURL = 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip';
export const historicalISA = Object.freeze({tree:'isa', kind:'archive', url:publisherURL, bytes:142903898, sha256:'40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e'});
export const currentISA = Object.freeze({tree:'isa', kind:'archive', url:publisherURL, bytes:142717267, sha256:'ac7d9ab0b3d75b4c75445f0f39e3782f309bbb321d2191f449773107ae504793'});
const proofFile = new URL('../licensing/atlas-publication/checkpoint-evidence/bp3d40-isa-license-comment-member-proof-20261127.json',import.meta.url);
const proofHash = '2939dc23c514802c79c302f78cad4324abf9d3e2451dfee00c87ca4d89c947d2';

export function validatePublisherRevisionProof(bytes){
 assert.equal(createHash('sha256').update(bytes).digest('hex'),proofHash,'Publisher revision proof identity mismatch');
 const p=JSON.parse(bytes);
 assert.equal(p.oldArchive.sha256,historicalISA.sha256);
 assert.equal(p.oldArchive.bytes,historicalISA.bytes);
 assert.equal(p.newArchive.sha256,currentISA.sha256);
 assert.equal(p.newArchive.bytes,currentISA.bytes);
 for(const k of ['objMembers','unchangedMemberPaths','exactAllowedCommentReplacementOnly','geometryCommandsAndNormalsUnchanged','sourceIdentityHeadersUnchanged']) assert.equal(p[k],2234);
 assert.equal(p.rows.length,2234);
 assert.equal(new Set(p.rows.map(r=>r.fj)).size,2234);
 assert(p.rows.every(r=>/^FJ\d+[A-Za-z]?$/.test(r.fj)&&/^[a-f0-9]{64}$/.test(r.oldRawSHA256)&&/^[a-f0-9]{64}$/.test(r.newRawSHA256)&&r.allBytesExceptExactLicenseCommentBlockIdentical===true));
 assert.equal(p.newStructures,0);assert.equal(p.removedStructures,0);
 return p;
}

export function verifyPublisherReceipt(observed, historical){
 if(isDeepStrictEqual(observed,historical)) return {status:'HISTORICAL_EXACT_BYTES',observed,historical};
 assert(isDeepStrictEqual(historical,historicalISA)&&isDeepStrictEqual(observed,currentISA),'Publisher bytes changed beyond the verified license-comment revision; source review required');
 validatePublisherRevisionProof(fs.readFileSync(proofFile));
 return {status:'VERIFIED_LICENSE_COMMENT_REVISION',observed,historical,
  fullMemberProofSHA256:proofHash,exactComparedOBJ:2234,
  sourceIdentityAndGeometryCommandsUnchanged:true,
  publisherClarification:'https://dbarchive.biosciencedbc.jp/update_histories/181',
  historicalSourcePinPreserved:true,clinicalValidation:false,registrationValidated:false,approvedForDistribution:false};
}
