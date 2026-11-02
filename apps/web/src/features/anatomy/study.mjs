import {SYSTEMS,REGIONS} from './registry.mjs';
export const STUDY_MODES=[['identify','Identify highlighted structure','Kenali struktur yang disorot di atlas.'],['find','Find requested structure in 3D','Pilih struktur yang diminta langsung pada model.'],['system','Guess system','Hubungkan struktur dengan sistemnya.'],['region','Guess region','Tentukan regio dari struktur yang disorot.']].map(([id,name,description])=>({id,name,description}));
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
  const tier=r=>r.system===target.system&&r.regions.some(v=>target.regions.includes(v))?0:r.system===target.system?1:r.regions.some(v=>target.regions.includes(v))?2:3;
  const ordered=shuffled(candidates,rng).sort((a,b)=>tier(a)-tier(b)),seen=new Set([target.base]),distractors=[];
  for(const row of ordered){if(!seen.has(row.base)){seen.add(row.base);distractors.push(row);}if(distractors.length===3)break;}
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
