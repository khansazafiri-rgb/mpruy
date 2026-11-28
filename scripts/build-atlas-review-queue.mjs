// Read-only review queue. Candidate data only; never marks a model or term approved.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {REFERENCE43_TOPIC_ROWS as catalog} from '../apps/atlas-independent/src/reference43-topic-catalog.js';
import {challengeLabel,hasChallengeGlossary} from '../apps/atlas-independent/src/reference-challenge-language.js';
import {SUPPLEMENTAL43_TOPIC_ROWS,EXPANSION43_TOPIC_ROWS} from '../apps/atlas-independent/src/reference43-topics.js';
import {BP43_SUITE,BP43_EXPANSION,BP43_MUSCLE,BP43_COMPONENTS} from './atlas-reference-suite-spec.mjs';
import {MUSCLE43_TOPIC_ROWS} from '../apps/atlas-independent/src/reference43-muscle-catalog.js';
import {COMPONENT43_TOPIC_ROWS} from '../apps/atlas-independent/src/reference43-component-catalog.js';
import {expectedPriorityMeshes} from './load-hra-priority-isolated.mjs';
const root=new URL('../',import.meta.url),dir='licensing/atlas-publication/';
const read=f=>JSON.parse(fs.readFileSync(new URL(dir+f,root),'utf8'));
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function buildReviewQueue(){
 const allCatalog=[...catalog,...SUPPLEMENTAL43_TOPIC_ROWS,...EXPANSION43_TOPIC_ROWS,...MUSCLE43_TOPIC_ROWS,...COMPONENT43_TOPIC_ROWS];
 const nomenclature=[];
 for(const fmaId of new Set(allCatalog.map(x=>x.fmaId))){
  const elements=allCatalog.filter(e=>e.fmaId===fmaId);assert(new Set(elements.map(e=>e.name)).size===1);const translated=elements.every(hasChallengeGlossary);assert(translated||elements.every(e=>EXPANSION43_TOPIC_ROWS.some(r=>r.fj===e.fj)));
  const e=elements[0],labels=translated?{en:challengeLabel(e,'en'),id:challengeLabel(e,'id'),latin:challengeLabel(e,'latin')}:{en:e.name,id:null,latin:null};
  const flags=translated?[]:['TRANSLATION_PENDING'];
  if(/\bleft\b|\bright\b/i.test(e.name))flags.push('LATERALITY');
  if(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\b|\d/i.test(e.name))flags.push('NUMERIC_LEVEL');
  if(/\b(trunk|proper|tree|part|wall|cavity|parenchyma|lobe|isthmus|cord)\b/i.test(e.name))flags.push('SOURCE_QUALIFIER');
  if(e.system==='nervous')flags.push('TNA_REVIEW');
  const identity={fmaId,sourceName:e.name,labels,elements:elements.map(x=>({fj:x.fj,bpId:x.bpId,rawSHA256:x.rawSHA256})),system:e.system};
  nomenclature.push({...identity,identitySHA256:sha(identity),flags,reference:'TA2/TNA',officialTermId:null,reviewer:null,reviewedAt:null,status:'PENDING_MEDICAL_REVIEW',clinicalValidation:false});
 }
 const rights=[];
 for(const [,file,count] of [...BP43_SUITE,['--bp3d43-hyoid-folder=','bp3d43-hyoid-2-dual-source-audit-20261126.json',2],...BP43_EXPANSION,BP43_MUSCLE,BP43_COMPONENTS]){
  const receipt=read(file);assert(receipt.publicRelease==='NO_GO'&&receipt.matches.length===count);
  for(const x of receipt.matches)rights.push({family:'BP3D43',id:x.fj,sourceIdentity:{bp:x.bp,fma:x.fma,rawSHA256:x.rawSHA256},derivedGLBSHA256:x.publisherGLBSHA256,sourceReceipt:file,workflowRun:receipt.workflowRun,manifestSHA256:receipt.publisher.manifestSHA256,sourceLicenseStatus:'VERSION_SPECIFIC_TERMS_UNRESOLVED',attributionCandidate:'BodyParts3D / Database Center for Life Science',adaptationObligations:null,rightsReviewer:null,status:'HOLD',approvedForDistribution:false});
 }
 for(const file of ['hra-female-five-pinned-audit-20261126.json','hra-cardiopulmonary-four-source-audit-20261126.json',...['urogenital-7','ureter-four','cns-four'].map(b=>'hra-'+b+'-pinned-audit-20261126.json'),...['digestive-six','knee-larynx-six','tonsil-four','pelvis-two'].map(b=>'hra-'+b+'-pinned-audit-20261127.json')]){
  const receipt=read(file);assert(receipt.publicRelease==='NO_GO');
  for(const x of receipt.rows){assert(x.approvedForDistribution===false);rights.push({family:'HRA',id:x.id,sourceIdentity:{version:x.version,assetURL:x.assetURL,doi:x.doi,sha256:x.sha256,metadataSHA256:x.metadataSHA256,crosswalkSHA256:x.crosswalkSHA256},sourceReceipt:file,workflowRun:receipt.workflowRun,sourceLicenseStatus:'PUBLISHER_STATES_CC_BY_4_0_RELEASE_REVIEW_PENDING',license:x.license,attributionCandidate:{creators:x.creators,doi:x.doi,assetURL:x.assetURL},adaptationObligations:null,rightsReviewer:null,status:'HOLD',approvedForDistribution:false});}
 }
 for(const e of expectedPriorityMeshes().values())rights.push({family:'HRA_DERIVED',id:e.id,sourceIdentity:{sourceId:e.sourceId,assetURL:e.source,sourceSHA256:e.sourceSHA256,originalNodeIndex:e.originalNodeIndex,ontologyId:e.ontologyId},derivedGLBSHA256:e.sha256,sourceReceipt:'hra-priority-isolation-roundtrip-audit-20261127.json',sourceLicenseStatus:'SOURCE_AND_DERIVED_COMPONENT_REVIEW_PENDING',license:e.license,attributionCandidate:{doi:e.doi,assetURL:e.source},rightsReviewer:null,status:'HOLD',approvedForDistribution:false});
 for(const r of rights){r.privacyReviewStatus='PENDING_SCOPE_REVIEW';r.privacyReviewer=null;r.distributionScope=null;}
 assert.equal(nomenclature.length,428);assert.equal(rights.length,493);assert.equal(new Set(rights.map(x=>x.family+':'+x.id)).size,493);
 return {schema:1,scope:'Review queue for exact source-qualified local assets and provisional terminology, not a clinical or legal approval. HRA organ files and BP3D elements are different units.',terminologyReferences:[{name:'IFAA FIPAT terminology standards',url:'https://ifaa.net/committees/anatomical-terminology-fipat/fipat-ifaa-terminologies/'},{name:'TA2 front matter',url:'https://cdn.dal.ca/content/dam/dalhousie/pdf/library/FIPAT/TA2/FIPAT-TA2-Front-Matter.pdf',note:'Publication CC BY-ND 4.0; publisher states individual terms public domain. No official terminology table copied into this queue.'},{name:'TA2Viewer',url:'https://ta2viewer.openanatomy.org/'}],nomenclature,rights,otherHolds:[{source:'Open3DModel lower limb',reason:'13 decoded candidates; exact asset rights unresolved; not served'},{source:'Z-Anatomy native lower limb',reason:'26 evaluated exact source objects; mixed archive rights unresolved; not served'},{source:'SIO',reason:'Source file and volume verification incomplete'},{source:'Lymphatic vessels',reason:'No approved whole-body network'},{source:'Legacy UI',reason:'NC licensing hold'}],clinicalValidation:false,registrationValidated:false,publicRelease:'NO_GO'};
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(buildReviewQueue(),null,2));
