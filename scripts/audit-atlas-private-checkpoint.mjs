// Deterministic consolidated evidence audit. This is NOT a release authorization.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {REFERENCE43_TOPIC_ROWS as catalog} from '../apps/atlas-independent/src/reference43-topic-catalog.js';
import {hasChallengeGlossary} from '../apps/atlas-independent/src/reference-challenge-language.js';
const root=new URL('../',import.meta.url),dir='licensing/atlas-publication/';
const read=name=>JSON.parse(fs.readFileSync(new URL(dir+name,root),'utf8'));
const receipts=['bp3d43-dual-source-audit-20261125.json','bp3d43-gap-batch-dual-source-audit-20261125.json','bp3d43-nerves32-dual-source-audit-20261125.json','bp3d43-discs-23-dual-source-audit-20261125.json','bp3d43-costal-20-dual-source-audit-20261125.json','bp3d43-head-neck-cartilage-14-dual-source-audit-20261125.json','bp3d43-visceral-18-dual-source-audit-20261126.json','bp3d43-cns-30-dual-source-audit-20261126.json','bp3d43-pelvic-digestive-15-dual-source-audit-20261126.json','bp3d43-cardiopulmonary-32-dual-source-audit-20261126.json','bp3d43-bronchial-thymus-22-dual-source-audit-20261126.json'];
const count=(a,key)=>new Set(a.map(x=>x[key])).size;
export function privateCheckpoint(){
 const batches=receipts.map(read),elements=batches.flatMap(x=>x.matches);
 assert.equal(batches.length,11);assert.equal(elements.length,246);
 assert.equal(count(elements,'fj'),246);assert.equal(count(elements,'rawSHA256'),246);assert.equal(count(elements,'fma'),239);
 assert(elements.every(x=>/^[a-f0-9]{64}$/.test(x.rawSHA256)&&/^[a-f0-9]{64}$/.test(x.publisherGLBSHA256)&&Number.isInteger(x.triangles)&&x.triangles>0));
 assert.equal(catalog.length,246);assert.equal(count(catalog,'fj'),246);
 for(const e of catalog){const x=elements.find(x=>x.fj===e.fj);assert(x&&x.fma===e.fmaId&&x.bp===e.bpId&&x.rawSHA256===e.rawSHA256&&x.name===e.name);}
 const supplemental=read('bp3d43-hyoid-2-dual-source-audit-20261126.json');
 assert(supplemental.publicRelease==='NO_GO'&&supplemental.geometryPublished===0&&supplemental.clinicalValidation===false&&supplemental.registrationValidated===false&&supplemental.matched===2&&supplemental.held===0);
 assert.equal(supplemental.matches.length,2);assert.equal(count([...elements,...supplemental.matches],'fj'),248);assert.equal(count([...elements,...supplemental.matches],'rawSHA256'),248);assert.equal(count([...elements,...supplemental.matches],'fma'),240);
 const bp=read('bp3d43-eleven-batch-summary-20261126.json');
 assert.equal(elements.reduce((n,x)=>n+x.triangles,0),bp.triangles);assert.equal(bp.triangles,667805);assert.equal(bp.browserReplay.conclusion,'success');assert.equal(bp.browserReplay.renderedActualPublisherGLBs,246);assert.equal(bp.browserReplay.sourceLabelConceptsCompleted,239);
 const glossaryConcepts=count(catalog.filter(hasChallengeGlossary),'fmaId');assert.equal(glossaryConcepts,239);
 const systems={};for(const e of catalog){const g=systems[e.system]??={elements:0,conceptIds:new Set()};g.elements++;g.conceptIds.add(e.fmaId);}
 const female=read('hra-female-five-pinned-audit-20261126.json'),cardio=read('hra-cardiopulmonary-four-source-audit-20261126.json'),groups=read('hra-source-group-hierarchy-audit-20261126.json'),hra=[...female.rows,...cardio.rows];
 assert.equal(hra.length,9);assert.equal(count(hra,'assetURL'),9);assert(hra.every(x=>x.approvedForDistribution===false&&x.registrationValidated===false&&x.clinicalValidation===false));
 const direct=hra.flatMap(x=>x.labels).filter(x=>x.status==='EXACT_NAMED_MESH_NODE');assert.equal(direct.length,160);
 const labels=hra.flatMap(x=>x.labels);assert.equal(labels.length,198);assert.equal(groups.exactSourceGroups,37);assert.equal(groups.remainingHeld,1);
 for(const p of groups.rows){const a=hra.find(x=>x.id===p.id);assert(a&&a.sha256===p.sha256&&a.assetURL===p.assetURL);}
 assert.equal(groups.browserReplay.exactNativeDescendantSetsIsolatedAndRestored,37);assert.equal(groups.browserReplay.renderedOriginalGLBs,9);assert.equal(groups.browserReplay.heldGroupLabelsExposed,0);
 const cross=read('atlas-cross-version-sample-comparison-20261126.json');assert.equal(cross.referenceElements,246);assert.equal(cross.overlappingFMAConcepts,70);assert.equal(cross.referenceConceptsNotFoundInSample,169);assert.equal(cross.fullBodyInventoryCompared,false);
 const nerve=read('checkpoint-evidence/open3dmodel-lower-limb-private-draco-audit-20261126.json'),sio=read('checkpoint-evidence/sio-publisher-html-metadata-review-20261126.json');
 assert.equal(nerve.decoded,13);assert.equal(nerve.triangles,86204);assert.equal(nerve.geometryExported,0);assert.equal(nerve.assetRightsReviewed,false);assert(nerve.rows.every(x=>x.side==='right'&&x.approvedForDistribution===false));
 assert.equal(sio.priorityLabelsPresentCount,23);assert.equal(sio.sourceFileBytesVerified,false);assert.equal(sio.geometryParsed,false);
 for(const x of [bp,female,cardio,groups,cross,nerve,sio])assert.equal(x.publicRelease,'NO_GO');
 return {schema:1,scope:'Private evidence checkpoint only; references not registered together. Counts in different source families must not be summed as unique anatomy.',bp3d:{elements:246,fmaConcepts:239,triangles:bp.triangles,rendered:bp.browserReplay.renderedActualPublisherGLBs,sourceLabelChallenge:bp.browserReplay.sourceLabelConceptsCompleted,glossaryCodeCoverage:glossaryConcepts,lastVerifiedMultilingualBrowser:bp.browserReplay.multilingualTypedConcepts,systems:Object.fromEntries(Object.entries(systems).map(([k,v])=>[k,{elements:v.elements,concepts:v.conceptIds.size}]))},supplementalBP3D:{elements:2,fmaConcepts:1,triangles:2392,baselineCombinedBrowserReplay:false,publicRelease:'NO_GO'},hra:{originalFiles:9,sourceRows:198,directMapped:160,groupMapped:37,held:1,rendered:groups.browserReplay.renderedOriginalGLBs,groupsBrowserVerified:groups.browserReplay.exactNativeDescendantSetsIsolatedAndRestored},lowerLimb:{rightDecoded:13,bilateralTargets:28,triangles:86204,served:false},sio:{publisherTextTargets:23,numericLabelMappingVerified:false,fileBytesVerified:false,geometryVerified:false},crossVersion:{sampleRows:cross.officialSampleRows,overlapFMA:70,absentFromSample:169,fullBodyInventoryCompared:false},releaseGates:{assetRights:'HOLD',clinicalReview:'HOLD',spatialRegistration:'HOLD',fullBodyInventory:'HOLD',lymphaticVesselContinuity:'HOLD',legacyCommercialCode:'HOLD',finalIntegratedHostQC:'HOLD',ownerApproval:'HOLD'},publicRelease:'NO_GO'};
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log('ATLAS PRIVATE EVIDENCE CHECKPOINT '+JSON.stringify(privateCheckpoint()));
