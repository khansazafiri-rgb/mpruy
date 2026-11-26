// Read-only local body-pack QC. Never copies geometry, starts a server or approves release.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {auditCrossVersionOverlap} from './audit-atlas-cross-version-overlap.mjs';
import {REFERENCE43_TOPIC_ROWS} from '../apps/atlas-independent/src/reference43-topic-catalog.js';
import {SUPPLEMENTAL43_TOPIC_ROWS,EXPANSION43_TOPIC_ROWS} from '../apps/atlas-independent/src/reference43-topics.js';
const root=new URL('../',import.meta.url);
const hash=b=>createHash('sha256').update(b).digest('hex');
export function summarizeVerifiedBody(body,display,refs,samples){
 assert(Array.isArray(body)&&body.length>0&&Array.isArray(display)&&display.length===body.length);
 const seen=new Set(),systems={};
 for(const m of body){
  assert(typeof m.id==='string'&&!seen.has(m.id)&&m.frame==='native-official-OBJ'&&m.approvedForDistribution===false&&typeof m.group==='string');seen.add(m.id);
  const g=systems[m.group]??={models:0,fma:new Set()};g.models++;g.fma.add(m.fmaId);
 }
 const overlap=auditCrossVersionOverlap(body,refs,samples);
 // Byte identity alone is not anatomical identity. A raw match can have several local labels.
 const identityEvidence={
  exactRawSameFMA:overlap.rows.filter(r=>r.localExactRawByteMatches.some(m=>m.fmaId===r.fmaId)).length,
  exactRawSameFMAAndFJ:overlap.rows.filter(r=>r.localExactRawByteMatches.some(m=>m.fmaId===r.fmaId&&m.fj===r.fj)).length,
  exactRawDifferentFMA:overlap.rows.filter(r=>r.localExactRawByteMatches.some(m=>m.fmaId!==r.fmaId)).length,
  exactRawDifferentFMAOnly:overlap.rows.filter(r=>r.localExactRawByteMatches.length>0&&r.localExactRawByteMatches.every(m=>m.fmaId!==r.fmaId)).length,
  reusedFJDifferentFMA:overlap.rows.filter(r=>r.localElementIdMatches.some(m=>m.fmaId!==r.fmaId)).length,
  referenceConceptsNotInBodyIndex:new Set(overlap.rows.filter(r=>!r.localConceptMatches.length).map(r=>r.fmaId)).size,
  referenceElementsWithoutAnyMatch:overlap.rows.filter(r=>r.status==='NO_MATCH_IN_LOCAL_INDEX').length,
  referenceElementsUnresolvedRawIndex:overlap.rows.filter(r=>r.status==='INCOMPLETE_LOCAL_RAW_DIGEST_INDEX').length,
  scope:'Counts can overlap. Identity conflicts require review; missing local index entries do not establish net-new geometry or anatomical absence.'
 };
 const regions=display.filter(e=>Array.isArray(e.regions)&&e.regions.some(r=>r!=='whole')).length;
 const layers=display.filter(e=>Number.isInteger(e.layer)&&e.layer>=0).length;
 return {schema:1,scope:'Verified local BP3D 4.0 review pack only. Reference FMA, FJ and raw OBJ hash overlaps do not imply geometry registration or whole-human completeness.',bodyModels:body.length,bodyFMA:new Set(body.map(m=>m.fmaId)).size,systems:Object.fromEntries(Object.entries(systems).map(([k,v])=>[k,{models:v.models,fma:v.fma.size}])),bodySourceElementOccurrences:overlap.sourceElementOccurrences,bodyRawDigestOccurrences:overlap.rawDigestOccurrences,referenceElements:overlap.referenceElements,overlapCounts:overlap.counts,identityEvidence,localReferenceConceptMatches:new Set(overlap.rows.filter(r=>r.localConceptMatches.length).map(r=>r.fmaId)).size,localRawDigestIndexComplete:overlap.sourceElementOccurrences>0&&overlap.sourceElementOccurrences===overlap.rawDigestOccurrences,displayMetadata:{nonWholeRegionAssigned:regions,integerLayerAssigned:layers,wholeOnly:display.filter(e=>Array.isArray(e.regions)&&e.regions.length===1&&e.regions[0]==='whole').length,withoutLayer:display.filter(e=>e.layer===undefined).length,scope:'Assignments only; not validation of anatomical regions or layers.'},clinicalValidation:false,registrationValidated:false,fullHumanCompletenessClaim:false,publicRelease:'NO_GO'};
}
export function workstationProfile(flags=[]){assert(Array.isArray(flags)&&new Set(flags).size===flags.length&&flags.every(f=>['--include-hyoid','--include-expansion'].includes(f)),'Unknown or repeated profile flag');const includeExpansion=flags.includes('--include-expansion'),includeHyoid=includeExpansion||flags.includes('--include-hyoid');const catalog=[...REFERENCE43_TOPIC_ROWS,...(includeHyoid?SUPPLEMENTAL43_TOPIC_ROWS:[]),...(includeExpansion?EXPANSION43_TOPIC_ROWS:[])];return {includeHyoid,includeExpansion,expectedElements:catalog.length,expectedConcepts:new Set(catalog.map(x=>x.fmaId)).size};}
export async function auditWorkstation(folder,flags=[]){
 const profile=workstationProfile(flags);
 assert(/^independent-source-review-[A-Za-z0-9_-]+$/.test(folder),'Explicit existing private body pack required');
 const q=fileURLToPath(new URL('local-data/licensing-quarantine',root));
 assert(fs.realpathSync(q)===q,'Quarantine must be a real local directory');
 const {loadIndependentReview}=await import('./load-independent-source-review.mjs');
 const {loadAuditedReferenceSuite}=await import('./atlas-audited-reference-suite.mjs');
 const pack=loadIndependentReview(q,folder),suite=loadAuditedReferenceSuite(q,profile);
 assert(pack.inventory.publicRelease==='NO_GO'&&suite.publicRelease==='NO_GO'&&suite.bp.inventory.items.length===profile.expectedElements);
 const samples=JSON.parse(fs.readFileSync(new URL('licensing/atlas-publication/dbcls-full-geometry-audit-20261125.json',root),'utf8')).report.samples;
 const result=summarizeVerifiedBody(pack.inventory.bodyModels,pack.manifest.entries,suite.bp.inventory.items,samples);
 const {auditPackNativeOverlap}=await import('./audit-atlas-native-overlap.mjs');const nativeElementOverlap=auditPackNativeOverlap(pack,suite);
 const inv=path.join(pack.folder,'inventory.json');assert(fs.realpathSync(inv)===inv&&fs.statSync(inv).isFile());
 return {...result,nativeElementOverlap,bodyInventorySHA256:hash(fs.readFileSync(inv)),verifiedBodyPack:true,verifiedReferenceSuite:true,hraReferenceFiles:suite.hra.assets.size,expectedReferenceConcepts:profile.expectedConcepts,referenceProfile:profile};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){assert(process.argv.length>=3&&process.argv.length<=5,'One explicit private folder and optional profile flags required');console.log('ATLAS WORKSTATION PACK AUDIT '+JSON.stringify(await auditWorkstation(process.argv[2],process.argv.slice(3))));}
