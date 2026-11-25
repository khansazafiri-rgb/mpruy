// Coverage is a review checklist, never a clinical completeness metric.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {groups} from '../apps/atlas-independent/src/inventory.js';
import {loadIndependentReview} from './load-independent-source-review.mjs';
import {loadVerifiedPublisherSources,formattingKey,planCoverage,planAliasReview} from './plan-independent-atlas-coverage.mjs';
const root=fs.realpathSync(fileURLToPath(new URL('../',import.meta.url))),q=path.join(root,'local-data/licensing-quarantine');
const hash=b=>createHash('sha256').update(b).digest('hex');
// Teaching checkpoints, not an exhaustive ontology or validated crosswalk.
// Every string is a literal lookup; absence means "not found by this check".
export const checkpoints={
 skeletal:[['Mandible','mandible'],['Sternum','sternum'],['Left femur','left femur','femur of left lower limb'],['Right femur','right femur','femur of right lower limb'],['Sacrum','sacrum']],
 muscular:[['Diaphragm','diaphragm'],['Left biceps brachii','left biceps brachii muscle','biceps brachii muscle of left arm'],['Right biceps brachii','right biceps brachii muscle','biceps brachii muscle of right arm'],['Left gluteus maximus','left gluteus maximus muscle'],['Right gluteus maximus','right gluteus maximus muscle']],
 joints:[['Left hip joint','left hip joint'],['Right hip joint','right hip joint'],['Left knee joint','left knee joint'],['Right knee joint','right knee joint'],['Intervertebral disc','intervertebral disc']],
 arterial:[['Aorta','aorta'],['Left common carotid','left common carotid artery'],['Right common carotid','right common carotid artery'],['Left femoral artery','left femoral artery'],['Right femoral artery','right femoral artery']],
 venous:[['Superior vena cava','superior vena cava'],['Inferior vena cava','inferior vena cava'],['Portal vein','portal vein','hepatic portal vein'],['Left femoral vein','left femoral vein'],['Right femoral vein','right femoral vein']],
 heart:[['Heart','heart'],['Left atrium','left atrium','left atrium of heart'],['Right atrium','right atrium','right atrium of heart'],['Left ventricle','left ventricle','left ventricle of heart'],['Right ventricle','right ventricle','right ventricle of heart']],
 nervous:[['Brain','brain'],['Spinal cord','spinal cord'],['Cerebellum','cerebellum'],['Left sciatic nerve','left sciatic nerve'],['Right sciatic nerve','right sciatic nerve']],
 lymphatic:[['Spleen','spleen'],['Thymus','thymus'],['Thoracic duct','thoracic duct'],['Right lymphatic duct','right lymphatic duct'],['Cisterna chyli','cisterna chyli']],
 respiratory:[['Trachea','trachea'],['Left lung','left lung'],['Right lung','right lung'],['Left main bronchus','left main bronchus','left principal bronchus'],['Right main bronchus','right main bronchus','right principal bronchus']],
 digestive:[['Esophagus','esophagus','oesophagus'],['Stomach','stomach'],['Liver','liver'],['Pancreas','pancreas'],['Duodenum','duodenum'],['Rectum','rectum']],
 urinary:[['Left kidney','left kidney'],['Right kidney','right kidney'],['Left ureter','left ureter'],['Right ureter','right ureter'],['Urinary bladder','urinary bladder']],
 reproductive:[['Uterus','uterus'],['Left ovary','left ovary'],['Right ovary','right ovary'],['Prostate','prostate','prostate gland'],['Left testis','left testis'],['Right testis','right testis']],
 endocrine:[['Pituitary','pituitary gland','hypophysis'],['Thyroid','thyroid gland'],['Left adrenal','left adrenal gland','left suprarenal gland'],['Right adrenal','right adrenal gland','right suprarenal gland'],['Pineal gland','pineal gland']]
};
const clean=n=>String(n).trim().toLowerCase().replace(/\s+/g,' ');
function lookupCheckpoint(spec,body,group){
 const [label,...names]=spec,keys=new Set(names.map(clean));
 const exact=body.filter(m=>keys.has(clean(m.name)));
 const same=exact.filter(m=>m.group===group);
 const fma=new Set(same.map(m=>m.fmaId));
 const status=fma.size===1&&exact.length===same.length?'PUBLISHER_LABEL_FOUND':fma.size>1||exact.length?'IDENTITY_OR_GROUP_REVIEW':'NOT_FOUND_BY_CHECK';
 return {label,status,matchingModels:exact.map(m=>({id:m.id,name:m.name,group:m.group,fmaId:m.fmaId})),clinicalValidation:false};
}
export function systemCoverage(body,refs,targetRows,aliasRows,expansionPlan=[],exportResults=[]){
 const out={};
 const aliases=new Map(aliasRows.map(r=>[r.targetId,r]));
 for(const group of Object.keys(groups)){
  const models=body.filter(m=>m.group===group),targets=targetRows.filter(r=>r.group===group);
  const counts={};for(const r of targets)counts[r.status]=(counts[r.status]||0)+1;
  const aliasCounts={};for(const r of aliases.values())if(r.group===group)aliasCounts[r.status]=(aliasCounts[r.status]||0)+1;
  const plan=expansionPlan.filter(r=>r.group===group||r.claims?.some(c=>c.group===group));
  const expansionCounts={};for(const r of plan)expansionCounts[r.status]=(expansionCounts[r.status]||0)+1;
  const ids=new Set(plan.map(r=>r.fmaId)),results=exportResults.filter(r=>ids.has(r.fmaId));
  const checks=checkpoints[group].map(s=>lookupCheckpoint(s,body,group));
  out[group]={bodyModels:models.length,distinctFma:new Set(models.map(m=>m.fmaId)).size,
   uniqueSourceElementIds:new Set(models.flatMap(m=>m.sourceElements.map(e=>e.id))).size,
   targetLabels:targets.length,exactNameCounts:counts,aliasReviewCounts:aliasCounts,expansionPlanCounts:expansionCounts,
   exportedAdditional:results.filter(r=>r.status==='EXPORTED').length,exportHeld:results.filter(r=>r.status!=='EXPORTED').length,
   checkpoints:checks,checkpointsFound:checks.filter(r=>r.status==='PUBLISHER_LABEL_FOUND').length,
   status:models.length?'MODELS_AVAILABLE_REVIEW_REQUIRED':'NO_BODY_MODELS_IN_GROUP',clinicalValidation:false};
 }
 // Lymph nodes are not evidence of an entire vascular network.
 const lymph=body.filter(m=>m.group==='lymphatic');
 out.lymphatic.sourceLabelTypes={
  nodes:lymph.filter(m=>/\blymph nodes?\b/i.test(m.name)).length,
  vesselOrTrunk:lymph.filter(m=>/\blymphatic (?:vessel|trunk|duct)s?\b|^thoracic duct$|^cisterna chyli$/i.test(m.name)).length
 };
 out.lymphatic.networkContinuity='NOT_VERIFIED';
 return {schema:1,systems:out,bodyModels:body.length,hraReferences:refs.length,
  distinctBodyFma:new Set(body.map(m=>m.fmaId)).size,systemsWithBodyModels:Object.values(out).filter(s=>s.bodyModels>0).length,
  emptySystems:Object.keys(out).filter(g=>!out[g].bodyModels),clinicalValidation:false,publicRelease:'NO_GO',
  scope:'Publisher-label and source-element inventory only. Checkpoints are nonexhaustive; source system classification provisional. HRA references are separate, not body coverage.'};
}
export function run(packName,targetName){
 assert(/^z-anatomy-native-preview-[A-Za-z0-9_-]+$/.test(targetName)&&fs.realpathSync(q)===q);
 const pack=loadIndependentReview(q,packName),target=path.join(q,targetName);assert(fs.realpathSync(target)===target);
 const read=(dir,rel)=>{const p=path.join(dir,rel);assert(fs.realpathSync(p)===p&&fs.statSync(p).isFile());return JSON.parse(fs.readFileSync(p,'utf8'));};
 const original=read(target,'pack/inventory.json');assert(original.kind==='z-anatomy-original-source-private'&&original.approvedForCommercialDistribution===false);
 const source=loadVerifiedPublisherSources(pack.folder),inv=pack.inventory;
 const exact=planCoverage(original.converted,inv.bodyModels,source),aliases=planAliasReview(original.converted,inv.bodyModels,source,exact.rows);
 const plan=inv.expansion?read(pack.folder,'evidence/expansion-plan.json'):null,exp=inv.expansion?read(pack.folder,'evidence/expansion.json'):null;
 const report=systemCoverage(inv.bodyModels,inv.independentReferences,exact.rows,aliases.rows,plan?.rows||[],exp?.results||[]);
 report.sourcePack=packName;report.sourceInventorySHA256=hash(fs.readFileSync(path.join(pack.folder,'inventory.json')));
 report.sourceCatalog={};for(const s of source){
  const ids=new Set(s.names.map(n=>n.fmaId)),complete=new Set(s.names.filter(n=>{const e=[...(s.elements.get(n.fmaId)||[])];return e.length&&e.every(id=>s.archiveIndex.has(id));}).map(n=>n.fmaId));
  report.sourceCatalog[s.tree]={concepts:ids.size,completeElementSets:complete.size,missingOrIncompleteElementSets:ids.size-complete.size,archiveMembers:s.archiveIndex.size};
 }
 const p=path.join(pack.folder,'system-coverage-'+randomUUID()+'.json');fs.writeFileSync(p,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('SYSTEM COVERAGE QC',JSON.stringify({...report,systems:Object.fromEntries(Object.entries(report.systems).map(([g,s])=>[g,{...s,checkpoints:undefined}])),file:p}));return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url))run(process.argv[2]||'',process.argv[3]||'');
