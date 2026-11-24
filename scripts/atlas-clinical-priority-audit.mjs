// Independent clinically important structure checklist: geometry availability only.
import fs from 'node:fs';
import path from 'node:path';
import {exactLabel,critical} from './atlas-vascular-coverage.mjs';
const item=(name,aliases=[],hra=[],fmaId=null)=>({name,aliases:[name,...aliases],hra,fmaId});
const paired=(names)=>names.flatMap(name=>['left','right'].map(side=>item(side+' '+name)));
export const priorities={
 respiratory:[
  item('right lung',[],['lung male','lung female']),item('left lung',[],['lung male','lung female']),
  item('superior lobe of right lung',['right superior lobe of lung'],['lung male','lung female']),
  item('middle lobe of right lung',['right middle lobe of lung'],['lung male','lung female']),
  item('inferior lobe of right lung',['right inferior lobe of lung'],['lung male','lung female']),
  item('superior lobe of left lung',['left superior lobe of lung'],['lung male','lung female']),
  item('inferior lobe of left lung',['left inferior lobe of lung'],['lung male','lung female']),
  item('trachea',[],['trachea male','trachea female']),item('larynx',[],['larynx male','larynx female']),
  item('right main bronchus',['right principal bronchus'],['main bronchus male','main bronchus female']),
  item('left main bronchus',['left principal bronchus'],['main bronchus male','main bronchus female']),
  ...paired(['pleura'])
 ],
 endocrine:[
  item('pituitary gland',['hypophysis'],[],'FMA13889'),item('adenohypophysis',['anterior lobe of pituitary gland']),
  item('neurohypophysis',['posterior lobe of pituitary gland']),item('pineal gland'),item('thyroid gland'),
  item('left superior parathyroid gland',['superior parathyroid gland.l']),item('right superior parathyroid gland',['superior parathyroid gland.r']),
  item('left inferior parathyroid gland',['inferior parathyroid gland.l']),item('right inferior parathyroid gland',['inferior parathyroid gland.r']),
  item('right adrenal gland',['right suprarenal gland'],[],'FMA15629'),item('left adrenal gland',['left suprarenal gland'],[],'FMA15630'),
  item('pancreas',[],['pancreas male','pancreas female'],'FMA7198')
 ],
 heart:[item('heart',[],['heart male','heart female']),...paired(['atrium','ventricle','coronary artery']),
  item('mitral valve',['bicuspid valve']),item('tricuspid valve'),item('aortic valve'),item('pulmonary valve')],
 nervous:[item('brain',[],['brain male','brain female']),item('cerebrum'),item('cerebellum'),item('midbrain'),item('pons'),item('medulla oblongata'),
  item('spinal cord',[],['spinal cord male','spinal cord female']),...paired(['optic nerve','vagus nerve','phrenic nerve','median nerve','ulnar nerve','radial nerve','sciatic nerve','femoral nerve','tibial nerve','brachial plexus'])],
 lymphatic:[item('thymus',[],['thymus male','thymus female']),item('spleen',[],['spleen male','spleen female']),
  item('thoracic duct'),item('right lymphatic duct'),item('lymph node',[],['lymph node male','lymph node female']),
  ...paired(['palatine tonsil','inguinal lymph node','axillary lymph node'])],
 digestive:[item('liver',[],['liver male','liver female']),item('gallbladder',['gall bladder']),item('stomach'),item('oesophagus',['esophagus']),
  item('small intestine',[],['small intestine male','small intestine female']),item('large intestine',[],['large intestine male','large intestine female']),
  item('duodenum'),item('jejunum'),item('ileum'),item('rectum'),item('pancreas',[],['pancreas male','pancreas female'])],
 urinary:[item('left kidney',[],['kidney male left','kidney female left']),item('right kidney',[],['kidney male right','kidney female right']),
  item('left ureter',[],['ureter male left','ureter female left']),item('right ureter',[],['ureter male right','ureter female right']),
  item('urinary bladder',[],['urinary bladder male','urinary bladder female']),item('urethra')],
 reproductive:[item('prostate',[],['prostate male']),...paired(['testis']),item('penis'),item('uterus',[],['uterus female']),
  item('left ovary',[],['ovary female left']),item('right ovary',[],['ovary female right']),
  item('left uterine tube',['left fallopian tube'],['fallopian tube female left']),item('right uterine tube',['right fallopian tube'],['fallopian tube female right'])],
 skeletal:[...paired(['femur','tibia','fibula','humerus','radius','ulna','scapula','clavicle']),item('sternum'),item('sacrum')],
 joints:[...paired(['hip joint','knee joint','elbow joint','shoulder joint','ankle joint'])],
 muscular:[...paired(['biceps brachii muscle','triceps brachii muscle','deltoid muscle','gluteus maximus muscle','rectus femoris muscle']),item('diaphragm')],
 vascular:Object.values(critical).flat().filter(n=>n!=='thoracic duct').map(n=>item(n))
};
const systemFor={respiratory:'visceral',endocrine:'visceral',heart:'cardiovascular',nervous:'nervous',lymphatic:'lymphatic',digestive:'visceral',urinary:'visceral',reproductive:'visceral',skeletal:'skeletal',joints:'joints',muscular:'muscular',vascular:'cardiovascular'};
export function clinicalPriorityAudit({inventory,hra}){
 const entries=inventory.converted;
 const refs=[...(hra?.assets?.values()||[])].map(x=>x.public);
 const groups={},summary={},materializedGroupCounts={};
 for(const e of entries){const k=e.group||e.system;materializedGroupCounts[k]=(materializedGroupCounts[k]||0)+1;}
 for(const [group,list] of Object.entries(priorities)){
  groups[group]=list.map(p=>{
   const labels=new Set(p.aliases.map(exactLabel));
   const matches=entries.filter(e=>e.system===systemFor[group]&&(labels.has(exactLabel(e.name))||(p.fmaId&&e.fmaId===p.fmaId)));
   const references=refs.filter(r=>p.hra.includes(r.name));
   const status=matches.length===1?'BODY_GEOMETRY_CANDIDATE':matches.length>1?'AMBIGUOUS_BODY_IDENTITY':references.length?'INDEPENDENT_HRA_REFERENCE_AVAILABLE':'NOT_MATERIALIZED';
   return {name:p.name,status,bodyCandidates:matches.map(e=>({name:e.name,id:e.id,fmaId:e.fmaId,group:e.group})),
    referenceObjects:references.map(r=>({id:r.id,name:r.name,version:r.version})),
    note:references.length?'Related reference organ is available; this does not verify that the named substructure is present in its GLB.':null};
  });
  summary[group]={};
  for(const row of groups[group])summary[group][row.status]=(summary[group][row.status]||0)+1;
 }
 return {scope:'Explicit priority checklist across all systems; not an exhaustive clinical catalogue or continuity test',
  bodyModelCount:entries.length,materializedGroupCounts,hraReferenceCount:refs.length,
  groups,summary,geometryAnatomyValidated:false,registrationValidated:false,publicRelease:'NO_GO'};
}
export function writeClinicalPriorityAudit(out,input){
 const report=clinicalPriorityAudit(input);
 fs.writeFileSync(path.join(out,'clinical-priority-audit.json'),JSON.stringify(report,null,2)+'\n');
 const lines=['group\tstructure\tstatus\tbody_ids\treference_names'];
 for(const [group,rows] of Object.entries(report.groups))for(const r of rows)lines.push([group,r.name,r.status,r.bodyCandidates.map(x=>x.id).join(','),r.referenceObjects.map(x=>x.name).join(',')].join('\t'));
 fs.writeFileSync(path.join(out,'clinical-priority-audit.tsv'),lines.join('\n')+'\n');
 console.log('CLINICAL PRIORITY COVERAGE',JSON.stringify(report.summary));
 return report;
}
