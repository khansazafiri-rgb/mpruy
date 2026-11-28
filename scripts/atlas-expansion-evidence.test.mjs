import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {EXPANSION43_TOPIC_ROWS as expansion,SUPPLEMENTAL43_TOPIC_ROWS as hyoid,referenceTopic} from '../apps/atlas-independent/src/reference43-topics.js';
import {REFERENCE43_TOPIC_ROWS as base} from '../apps/atlas-independent/src/reference43-topic-catalog.js';
import {reference43Entries} from '../apps/atlas-independent/src/reference-state.js';
import {BP43_EXPANSION} from './atlas-reference-suite-spec.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL('../licensing/atlas-publication/'+f,import.meta.url),'utf8'));
test('128 exact receipts and 376 nonduplicate source identities; no release claims',()=>{
 const rows=BP43_EXPANSION.flatMap(([,file,count])=>{const r=read(file);assert.equal(r.matches.length,count);assert.equal(r.held,0);assert.equal(r.publicRelease,'NO_GO');return r.matches;});
 assert.equal(rows.length,128);assert.equal(rows.reduce((n,r)=>n+r.triangles,0),338220);
 for(const r of expansion){const p=rows.find(x=>x.fj===r.fj);assert(p);assert.equal(p.rawSHA256,r.rawSHA256);assert.equal(p.publisherGLBSHA256,r.glbSHA256);assert.equal(p.name,r.name);assert.equal(p.fma,r.fmaId);assert.equal(p.bp,r.bpId);assert.equal(p.triangles,r.triangles);assert.notEqual(referenceTopic({...r,source:'BodyParts3D 4.3'}).system,'unknown');}
 const all=[...base,...hyoid,...expansion];for(const [k,n] of [['fj',376],['rawSHA256',376],['fmaId',368],['name',368]])assert.equal(new Set(all.map(x=>x[k])).size,n);
 const doc={schema:1,publicRelease:'NO_GO',clinicalValidation:false,registrationValidated:false,expansionProfile:'BP43_128_20261126',items:expansion.map(r=>({...r,id:'bp43-'+createHash('sha256').update(r.fj+':'+r.rawSHA256).digest('hex').slice(0,24),source:'BodyParts3D 4.3',scope:'SINGLE_SOURCE_ELEMENT',coordinateFrame:'native-4.3-not-registered',approvedForDistribution:false,clinicalValidation:false,registrationValidated:false}))};
 assert.equal(reference43Entries(doc).length,128);assert.throws(()=>reference43Entries({...doc,items:doc.items.map((r,i)=>i===0?{...r,rawSHA256:'0'.repeat(64)}:r)}));assert.throws(()=>reference43Entries({...doc,expansionProfile:'unknown'}));
});
test('native nerve and lymphatic evidence remains held',()=>{const r=read('checkpoint-evidence/z-anatomy-native-nerve-lymphatic-audit-20261126.json');assert.equal(r.nerveSummary.EVALUATED_SOURCE_SURFACE,26);assert.equal(r.nerveSummary.NO_EXACT_SOURCE_OBJECT,2);assert.equal(r.lymphaticSummary.NO_EXACT_SOURCE_OBJECT,57);assert.equal(r.geometryPublished,0);assert.equal(r.geometryExported,0);assert.equal(r.assetRightsReviewed,false);assert.equal(r.publicRelease,'NO_GO');});
