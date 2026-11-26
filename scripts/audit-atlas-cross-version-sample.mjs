// Repeat the limited 4.0 audited-sample vs 4.3 concept comparison.
// Deliberately does not count sample absences as net-new structures.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {REFERENCE43_TOPIC_ROWS} from '../apps/atlas-independent/src/reference43-topic-catalog.js';
const root=new URL('../',import.meta.url);
export function compareSample(refs,samples){
 const byFma=new Map(),seen=new Set();
 for(const s of samples){if(s.status!=='EXACT_SOURCE_GEOMETRY_MATCH')continue;assert(/^FMA\d+$/.test(s.fmaId)&&/^BP\d+$/.test(s.bpId)&&Number.isInteger(s.triangles)&&s.triangles>0);const a=byFma.get(s.fmaId)||[];a.push({bpId:s.bpId,tree:s.tree,triangles:s.triangles,name:s.name});byFma.set(s.fmaId,a);}
 const overlaps=[];
 for(const e of refs){assert(/^FJ\d+[A-Za-z]?$/.test(e.fj)&&!seen.has(e.fj)&&/^FMA\d+$/.test(e.fmaId)&&/^BP\d+$/.test(e.bpId));seen.add(e.fj);if(byFma.has(e.fmaId))overlaps.push({fj:e.fj,fmaId:e.fmaId,bpId:e.bpId,name:e.name,officialSample:byFma.get(e.fmaId)});}
 const concepts=new Set(refs.map(e=>e.fmaId)).size,matched=new Set(overlaps.map(e=>e.fmaId)).size;
 return {referenceElements:refs.length,referenceConcepts:concepts,officialSampleRows:[...byFma.values()].reduce((n,a)=>n+a.length,0),officialSampleConcepts:byFma.size,overlappingReferenceElements:overlaps.length,overlappingFMAConcepts:matched,referenceConceptsNotFoundInSample:concepts-matched,exactCrossVersionRawBytesVerified:false,fullBodyInventoryCompared:false,clinicalValidation:false,registrationValidated:false,publicRelease:'NO_GO',overlaps};
}
export function verifyCommittedSampleComparison(){
 const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
 const samples=read('licensing/atlas-publication/dbcls-full-geometry-audit-20261125.json').report.samples;
 const expected=read('licensing/atlas-publication/atlas-cross-version-sample-comparison-20261126.json');
 const current=compareSample(REFERENCE43_TOPIC_ROWS,samples);
 for(const k of Object.keys(current))assert.deepEqual(current[k],expected[k],'Sample comparison differs: '+k);
 return current;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const r=verifyCommittedSampleComparison();console.log('ATLAS LIMITED SAMPLE COMPARISON PASS',JSON.stringify({...r,overlaps:undefined}));}
