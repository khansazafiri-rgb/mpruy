import {SYSTEMS,REGIONS} from './registry.mjs';
import {structureKind} from './kind.mjs';
export const STUDY_MODES=[['identify','Kenali Struktur','Struktur disorot pada model. Pilih nama yang benar.'],['find','Temukan di 3D','Nama struktur diberikan. Cari dan pilih langsung pada model 3D.'],['system','Tebak Sistem','Struktur disorot pada model. Pilih sistem anatominya.'],['region','Tebak Regio','Struktur disorot pada model. Pilih regio tempatnya berada.']].map(([id,name,description])=>({id,name,description}));
const shuffled=(items,rng)=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function makeQuestion(registry,{mode='identify',system='',region='',excludeId='',rng=Math.random}={}) {
 if(!STUDY_MODES.some(m=>m.id===mode))throw Error('Unknown study mode');
 let pool=registry.rows.filter(r=>r.available&&r.nameKnown&&(!system||r.system===system)&&(!region||region==='whole'||r.regions.includes(region))&&(mode!=='region'||r.regions.length));
 if(mode==='find')pool=pool.filter(row=>registry.rows.filter(r=>r.available&&r.nameKnown&&r.group===row.group&&r.regions.some(v=>row.regions.includes(v))).length>=2);
 const withoutPrevious=pool.filter(r=>r.id!==excludeId);if(withoutPrevious.length)pool=withoutPrevious;
 if(!pool.length)throw Error('Tidak ada struktur untuk kombinasi mode dan filter ini.');
 const target=pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];
 let answerId=target.id,options=[],prompt='Apa nama struktur yang disorot?';
 if(mode==='identify') {
  const candidates=registry.rows.filter(r=>r.available&&r.nameKnown&&r.base!==target.base);
  // Distractors of the same kind first (tooth -> other teeth, rib -> other ribs), near the target first,
  // then the same catalogue group, then the same system. Same side preferred so "(left)" gives nothing away.
  const kind=structureKind(target),near=r=>r.regions.some(v=>target.regions.includes(v));
  const tier=r=>{const k=structureKind(r)===kind;return k&&near(r)?0:k?1:r.group===target.group&&near(r)?2:r.group===target.group?3:r.system===target.system&&near(r)?4:r.system===target.system?5:near(r)?6:7;};
  const rank=r=>tier(r)*2+(r.side===target.side?0:1);
  const ordered=shuffled(candidates,rng).sort((a,b)=>rank(a)-rank(b)),seen=new Set([target.base]),names=new Set([target.nameKey]),distractors=[];
  for(const row of ordered){if(!seen.has(row.base)&&!names.has(row.nameKey)){seen.add(row.base);names.add(row.nameKey);distractors.push(row);}if(distractors.length===3)break;}
  options=shuffled([target,...distractors].map(r=>({id:r.id,label:r.name})),rng);
 } else if(mode==='system') {
  answerId=target.system;prompt='Struktur yang disorot termasuk sistem apa?';
  options=shuffled([SYSTEMS.find(s=>s.id===answerId),...shuffled(SYSTEMS.filter(s=>s.id!==answerId),rng).slice(0,3)],rng).map(s=>({id:s.id,label:s.name}));
 } else if(mode==='region') {
  answerId=target.regions[Math.floor(rng()*target.regions.length)];prompt='Di regio mana struktur yang disorot ditemukan?';
  options=shuffled([REGIONS.find(r=>r.id===answerId),...shuffled(REGIONS.filter(r=>r.id!=='whole'&&!target.regions.includes(r.id)),rng).slice(0,3)],rng).map(r=>({id:r.id,label:r.name}));
 } else prompt=`Temukan ${target.name} pada model 3D.`;
 return {mode,targetId:target.id,answerId,prompt,options,regions:target.regions,system:target.system};
}
export function checkAnswer(question,id){return typeof id==='string'&&id===question.answerId;}

export function studyScope(registry,{region='',system='',systemChosen=false,mode='identify'}={}) {
 const regionChosen=REGIONS.some(r=>r.id===region),validSystem=!system||SYSTEMS.some(s=>s.id===system),validMode=STUDY_MODES.some(m=>m.id===mode);
 const eligibleCount=regionChosen&&validSystem?registry.rows.filter(r=>r.available&&r.nameKnown&&(!system||r.system===system)&&(region==='whole'||r.regions.includes(region))).length:0;
 return {regionChosen,eligibleCount,ready:regionChosen&&systemChosen&&validSystem&&validMode&&eligibleCount>=4};
}

// Every intentional answer ends the question; exploration is never an attempt.
export function evaluateStudyAttempt(question,id,{ready=true,locked=false}={}) {
 if(!question||!ready||locked||typeof id!=='string'||!id)return null;
 const correct=checkAnswer(question,id);
 return {id,correct,locked:true};
}
