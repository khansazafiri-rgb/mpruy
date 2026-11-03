import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {URL} from 'node:url';
import {buildRegistry,filterStructures,relatedStructures,structureHref,exploreHref,SYSTEMS,REGIONS} from './registry.mjs';
import {STUDY_MODES,makeQuestion,checkAnswer} from './study.mjs';
import {emptyProgress,recordAnswer,setProgressStatus,parseProgress,progressKey,createLocalProgressRepository} from './libraryProgress.mjs';
import {LIBRARY_COMMAND,LIBRARY_RESULT,LIBRARY_PICK,acceptsLibraryCommand,acceptsLibraryEvent} from './libraryProtocol.mjs';
const input={systems:Object.fromEntries(SYSTEMS.map(s=>[s.id,[]])),catalog:{},lexicon:{Humerus:{la:'Humerus'},Ulna:{la:'Ulna'}},definitions:{Humerus:'Arm bone. https://en.wikipedia.org/wiki/Humerus'},synonyms:{humerus:['omero']},reference:{synonyms:{id:{humerus:['tulang lengan atas'],ulna:['tulang hasta']}}}};
for(const [i,id] of ['Humerus.r','Humerus.l','Ulna.r','Radius.r','Scapula.r','Femur.r','Tibia.r'].entries()){input.systems.skeletal.push(id);input.catalog[id]={source:'skeletal',group:'skeletal',regions:[i>4?'lowerLimb':'upperLimb'],box:[0,0,0,1,1,1]};}
for(const [i,s] of SYSTEMS.entries()){if(s.id==='skeletal')continue;for(let n=0;n<4;n++){const id=`Structure ${s.id} ${n}`;input.systems[s.id].push(id);input.catalog[id]={source:s.id,group:s.id,regions:n%2?['thorax','abdomen']:[REGIONS[i].id],box:[0,0,0,1,1,1]};}}
const registry=buildRegistry(input);
test('structure registry joins mesh IDs, Latin names, definitions and provenance without inventing rows',()=>{
 assert.equal(registry.rows.length,Object.values(input.systems).flat().length);const r=registry.byId.get('Humerus.r');assert.equal(r.name,'Humerus (right)');assert.equal(r.latin,'Humerus');assert.equal(r.definition,'Arm bone.');assert.deepEqual(r.sources,['https://en.wikipedia.org/wiki/Humerus']);assert.equal(r.available,true);assert.ok(r.aliases.includes('omero'));assert.equal(relatedStructures(registry,r)[0].id,'Humerus.l');
 const missing=globalThis.structuredClone(input);delete missing.catalog['Ulna.r'];assert.equal(buildRegistry(missing).byId.get('Ulna.r').available,false);
 const duplicate=globalThis.structuredClone(input);duplicate.systems.muscular.push('Ulna.r');assert.throws(()=>buildRegistry(duplicate));
});
test('search matches English, Latin, existing multilingual synonyms and exact IDs',()=>{
 for(const q of ['humerus','HUMERUS','omero','tulang lengan atas'])assert.ok(filterStructures(registry,{query:q}).some(r=>r.id==='Humerus.r'));
 assert.equal(filterStructures(registry,{query:'Humerus.r'})[0].id,'Humerus.r');assert.equal(filterStructures(registry,{query:'tulang hasta'})[0].id,'Ulna.r');assert.equal(filterStructures(registry,{query:'zz-no-match'}).length,0);
 const latin=globalThis.structuredClone(input);latin.lexicon.Humerus.la='Os brachii';assert.equal(filterStructures(buildRegistry(latin),{query:'os brachii'}).length,2);
});
test('source systems and region filters are exact, composable, and whole body contains all rows',()=>{
 assert.equal(filterStructures(registry,{region:'whole'}).length,registry.rows.length);assert.ok(filterStructures(registry,{system:'skeletal',region:'upperLimb'}).every(r=>r.system==='skeletal'&&r.regions.includes('upperLimb')));assert.deepEqual(filterStructures(registry,{system:'invalid'}),[]);assert.deepEqual(filterStructures(registry,{region:'invalid'}),[]);
 assert.equal(filterStructures(registry,{region:'lowerLimb',query:'humerus'}).length,0);
});
test('structure and explorer routing preserves punctuation, side, spaces and slashes safely',()=>{
 for(const id of ['Humerus.r','(Muscle variant).l','Part / branch.r','Part % name']){assert.equal(decodeURIComponent(structureHref(id).slice('/anatomy/structure/'.length)),id);assert.equal(new URL(exploreHref(id),'https://medcoel.example').searchParams.get('structure'),id);}
 assert.equal(registry.byId.get('does-not-exist'),undefined);
 const app=readFileSync(new URL('../../App.jsx',import.meta.url),'utf8');assert.match(app,/path="\/anatomy\/\*" element={<RequireAuth>/);
 const ui=readFileSync(new URL('../../pages/AnatomyLibrary.jsx',import.meta.url),'utf8');for(const path of ['library','structure/:id','region/:regionId','system/:systemId','study'])assert.ok(ui.includes(`path="${path}"`));assert.ok(ui.includes('legacy'));assert.ok(ui.includes('HumanAnatomy'));
});
test('question generation is deterministic, excludes opposite-side equivalents, and prefers same context',()=>{
 const rng=()=>.1,q=makeQuestion(registry,{mode:'identify',system:'skeletal',region:'upperLimb',rng});assert.equal(q.options.length,4);assert.equal(q.options.filter(o=>o.id===q.answerId).length,1);assert.equal(new Set(q.options.map(o=>registry.byId.get(o.id).base)).size,4);assert.ok(q.options.every(o=>registry.byId.get(o.id).system==='skeletal'));assert.equal(checkAnswer(q,q.answerId),true);assert.equal(checkAnswer(q,'other'),false);
 assert.deepEqual(makeQuestion(registry,{mode:'identify',system:'skeletal',region:'upperLimb',rng}),q);
 assert.notEqual(makeQuestion(registry,{system:'skeletal',excludeId:q.targetId,rng}).targetId,q.targetId);
});
test('all study modes use real structures, valid source systems and non-ambiguous region distractors',()=>{
 for(const mode of ['identify','find'])for(let i=0;i<20;i++){
  const q=makeQuestion(registry,{mode,rng:()=>i/21});assert.ok(registry.byId.has(q.targetId));
  if(mode==='find'){assert.equal(q.options.length,0);assert.equal(q.answerId,q.targetId);}
  if(mode==='system')assert.equal(q.answerId,registry.byId.get(q.targetId).system);
  if(mode==='region'){const actual=registry.byId.get(q.targetId).regions;assert.ok(actual.includes(q.answerId));assert.ok(q.options.every(o=>o.id===q.answerId||!actual.includes(o.id)));assert.ok(!q.options.some(o=>o.id==='whole'));}
 }
 assert.throws(()=>makeQuestion(registry,{mode:'landmarks'}));assert.throws(()=>makeQuestion(registry,{system:'unknown'}));assert.throws(()=>makeQuestion({...registry,rows:[]}));
});
test('library protocol accepts only exact origin/source, known modes, version and current request IDs',()=>{
 const parent={},self={},origin='https://medcoel.example',requestId='request-test-123',event={origin,source:parent,data:{type:LIBRARY_COMMAND,version:1,requestId,structureId:'Humerus.r',mode:'explore'}};
 assert.equal(acceptsLibraryCommand(event,origin,parent,self),true);
 for(const bad of [{...event,origin:'https://other.example'},{...event,source:{}},{...event,data:{...event.data,version:2}},{...event,data:{...event.data,mode:'execute'}},{...event,data:{...event.data,structureId:''}},{...event,data:{...event.data,structureId:'a\u0000b'}},{...event,data:{...event.data,requestId:'x'}}])assert.equal(acceptsLibraryCommand(bad,origin,parent,self),false);
 assert.equal(acceptsLibraryCommand(event,origin,parent,parent),false);
 for(const type of [LIBRARY_RESULT,LIBRARY_PICK]){const response={origin,source:parent,data:{type,version:1,requestId,intent:'answer',ok:true,structureId:'Ulna.r'}};assert.equal(acceptsLibraryEvent(response,origin,parent,requestId),true);assert.equal(acceptsLibraryEvent(response,origin,parent,'stale-request'),false);assert.equal(acceptsLibraryEvent({...response,source:{}},origin,parent,requestId),false);}
});
test('local-first progress isolates accounts and source, advances mastery after three successes and recovers from a miss',()=>{
 const values=new Map(),adapter=createLocalProgressRepository({getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},'admin');let p=adapter.load();assert.deepEqual(p,emptyProgress());
 p=recordAnswer(p,'Humerus.r',true);assert.equal(p.structures['Humerus.r'].status,'LEARNING');p=recordAnswer(recordAnswer(p,'Humerus.r',true),'Humerus.r',true);assert.equal(p.structures['Humerus.r'].status,'MASTERED');p=recordAnswer(p,'Humerus.r',false);assert.equal(p.structures['Humerus.r'].status,'LEARNING');assert.equal(p.structures['Humerus.r'].correct,3);adapter.save(p);assert.deepEqual(adapter.load(),p);
 assert.notEqual(progressKey('admin'),progressKey('student'));assert.throws(()=>parseProgress('{}'));assert.throws(()=>parseProgress('{bad'));assert.throws(()=>setProgressStatus(p,'Humerus.r','VERIFIED'));assert.equal(setProgressStatus(p,'Humerus.r','NOT_STUDIED').structures['Humerus.r'].status,'NOT_STUDIED');
 assert.throws(()=>createLocalProgressRepository({setItem(){throw Error('quota');}},'u').save(p));
});
test('unlabelled source meshes stay addressable but are excluded from quiz targets and distractors',()=>{
 const data=globalThis.structuredClone(input);for(const id of ['?x.r','????????']){data.systems.cardiovascular.push(id);data.catalog[id]={source:'cardiovascular',group:'arterial',regions:['thorax'],box:[0,0,0,1,1,1]};}
 const r=buildRegistry(data);assert.equal(r.byId.get('?x.r').name,'Unlabelled structure (right)');assert.equal(r.byId.get('?x.r').available,true);assert.equal(r.byId.get('?x.r').nameKnown,false);assert.equal(filterStructures(r,{query:'?x.r'})[0].id,'?x.r');
 for(const mode of ['identify','find'])for(const random of [0,.5,.999]){const q=makeQuestion(r,{mode,rng:()=>random});assert.equal(r.byId.get(q.targetId).nameKnown,true);if(mode==='identify')assert.ok(q.options.every(o=>r.byId.get(o.id).nameKnown));}
});

test('local mesh previews reject external paths and traversal, and browsing places parent overview structures first',async()=>{
 const {previewPath,browseStructures}=await import('./registry.mjs');
 assert.equal(previewPath('thumbnails/structures/123456789012345678901234.webp'),'thumbnails/structures/123456789012345678901234.webp');
 for(const bad of ['https://foreign.example/image.webp','thumbnails/../private.webp','thumbnails/structures/../../secret.webp'])assert.equal(previewPath(bad),null);
 const rows=[{id:'tiny',name:'A tiny part',nameKnown:true,parentId:'large',bounds:[0,0,0,.01,.01,.01]},{id:'large',name:'Z overview',nameKnown:true,parentId:null,bounds:[0,0,0,1,1,1]},{id:'small',name:'B smaller bone',nameKnown:true,parentId:null,bounds:[0,0,0,.2,.2,.2]}];
 assert.deepEqual(browseStructures(rows).map(r=>r.id),['large','small','tiny']);assert.equal(rows[0].id,'tiny');
});

test('guided quiz requires an explicit region and system choice before a valid session can start',async()=>{
 const {studyScope}=await import('./study.mjs'),registry=buildRegistry(input);
 assert.equal(studyScope(registry).ready,false);
 assert.equal(studyScope(registry,{region:'upperLimb',system:'skeletal'}).ready,false);
 assert.equal(studyScope(registry,{region:'upperLimb',system:'skeletal',systemChosen:true}).ready,true);
 assert.equal(studyScope(registry,{region:'whole',system:'',systemChosen:true}).ready,true);
 for(const invalid of [{region:'unknown',systemChosen:true},{region:'whole',system:'unknown',systemChosen:true},{region:'whole',mode:'unknown',systemChosen:true}])assert.equal(studyScope(registry,invalid).ready,false);
 for(const mode of ['identify','find']){const question=makeQuestion(registry,{region:'upperLimb',system:'skeletal',mode,rng:()=>.4});assert.ok(registry.byId.has(question.targetId));if(mode==='identify')assert.ok(question.options.every(o=>registry.byId.has(o.id)));}
});

test('only two public modes exist; hidden and invalid modes are rejected by scope and generator',async()=>{
 const {studyScope}=await import('./study.mjs');assert.deepEqual(STUDY_MODES.map(m=>m.id),['identify','find']);
 for(const mode of ['system','region','unknown']){assert.throws(()=>makeQuestion(registry,{mode}));assert.equal(studyScope(registry,{mode,region:'whole',systemChosen:true}).ready,false);}
 for(const mode of ['identify','find'])assert.equal(studyScope(registry,{mode,region:'whole',systemChosen:true}).ready,true);
});
test('answers require explicit intent, current frame and request; visibility events cannot answer',()=>{
 const viewer={},origin='https://medcoel.example',requestId='intent-test-123';const event={source:viewer,origin,data:{type:LIBRARY_PICK,version:1,requestId,structureId:'Ulna.r'}};
 for(const intent of [undefined,'select','hide','unhide','show-all','focus','fade'])assert.equal(acceptsLibraryEvent({...event,data:{...event.data,intent}},origin,viewer,requestId),false);
 assert.equal(acceptsLibraryEvent({...event,data:{...event.data,intent:'answer'}},origin,viewer,requestId),true);
 for(const mode of ['system','region'])assert.equal(acceptsLibraryCommand({...event,data:{...event.data,type:LIBRARY_COMMAND,mode}},origin,viewer,{}),false);
});
test('find attempts permit retry without revealing or advancing; identify locks after one answer',async()=>{
 const {evaluateStudyAttempt}=await import('./study.mjs');const q=makeQuestion(registry,{mode:'find',rng:()=>0});
 assert.deepEqual(evaluateStudyAttempt(q,q.targetId),{id:q.targetId,correct:true,locked:true});
 assert.deepEqual(evaluateStudyAttempt(q,'wrong'),{id:'wrong',correct:false,locked:false});
 for(const state of [{ready:false},{locked:true}])assert.equal(evaluateStudyAttempt(q,q.targetId,state),null);
 assert.equal(evaluateStudyAttempt({...q,mode:'identify'},'wrong').locked,true);
 assert.equal(evaluateStudyAttempt(q,''),null);
});
