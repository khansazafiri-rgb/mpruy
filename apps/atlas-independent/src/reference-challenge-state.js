// Source-label recognition, not a clinical assessment or full-structure exam.
const canonical=s=>String(s).trim().toLowerCase().replace(/\s+/g,' ');
function shuffle(items,random){
 const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));if(!Number.isInteger(j)||j<0||j>i)throw Error('Invalid shuffle');[a[i],a[j]]=[a[j],a[i]];}return a;
}
export function buildReferenceQuestions(entries,random=Math.random){
 const byLabel=new Map(),ids=new Set();
 for(const e of entries){
  if(!/^bp43-[a-f0-9]{24}$/.test(e.id||'')||ids.has(e.id)||!/^FMA\d+$/.test(e.fmaId||'')||e.scope!=='SINGLE_SOURCE_ELEMENT'||e.approvedForDistribution!==false||e.clinicalValidation!==false||e.registrationValidated!==false||typeof e.name!=='string'||!e.name.trim())throw Error('Invalid private challenge source');
  ids.add(e.id);const key=canonical(e.name),a=byLabel.get(key)||[];a.push(e);byLabel.set(key,a);
 }
 // Do not make repeated radial/axillary mesh fragments into duplicate questions.
 // Exclude labels shared by different FMA concepts rather than guessing identity.
 const pool=[...byLabel.values()].filter(a=>new Set(a.map(e=>e.fmaId)).size===1).map(a=>shuffle(a,random)[0]);
 if(pool.length<4)return [];
 return shuffle(pool,random).map(entry=>({entry,options:shuffle([entry,...shuffle(pool.filter(e=>e.id!==entry.id),random).slice(0,3)],random).map(e=>({id:e.id,label:e.name}))}));
}
export function scoreReferenceAnswer(question,optionId){
 if(!question?.options.some(o=>o.id===optionId))throw Error('Unknown answer choice');
 return optionId===question.entry.id;
}

// Source-label recognition only; one unambiguous FMA concept per question.
// Keep the existing glossary-bound multilingual mode unchanged.
export function buildSourceLabelQuestions(entries,random=Math.random){
 buildReferenceQuestions(entries,()=>.5);
 const byFMA=new Map(),byLabel=new Map();
 for(const e of entries){const key=canonical(e.name);const names=byFMA.get(e.fmaId)||new Set();names.add(key);byFMA.set(e.fmaId,names);const concepts=byLabel.get(key)||new Set();concepts.add(e.fmaId);byLabel.set(key,concepts);}
 return buildReferenceQuestions(entries.filter(e=>byFMA.get(e.fmaId).size===1&&byLabel.get(canonical(e.name)).size===1),random);
}
