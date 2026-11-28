import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSubsetLearning} from '../src/public-learning.js';
// Small DOM double: tests cancellation and score rules, not browser rendering.
class Element{
 constructor(tag,text=''){this.tagName=tag;this.textContent=text;this.children=[];this.hidden=false;this.disabled=false;this.value='';this.classList={add(){},remove(){},toggle(){}};}
 append(...xs){this.children.push(...xs);if(this.tagName==='select'&&!this.value)this.value=xs[0]?.value||'';}
 replaceChildren(...xs){this.children=xs;}
 setAttribute(){} focus(){} click(){if(!this.disabled)return this.onclick?.();}
 querySelectorAll(tag){return this.children.flatMap(x=>[...(x.tagName===tag?[x]:[]),...x.querySelectorAll(tag)]);}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('closing a pending Challenge cancels answer UI, preserves score and restores prior scene',async()=>{
 const originalDocument=globalThis.document,originalOption=globalThis.Option;
 const body=new Element('body');globalThis.document={body,createElement:tag=>new Element(tag)};globalThis.Option=class extends Element{constructor(text,value){super('option',text);this.value=value;}};
 try{
  const entries=Array.from({length:5},(_,i)=>({id:String(i),name:'Source '+i,fmaId:'FMA'+i,group:i<2?'small':'large',bpId:'BP'+i}));let resolveLoad,restores=0;
  const learning=mountSubsetLearning({groups:{small:'Small',large:'Large'},entries:()=>entries,choose:async()=>true,quizChoose:()=>new Promise(r=>{resolveLoad=r;}),snapshot:()=>({value:1}),restore:()=>{restores++;},ready:async()=>{}});
  const opening=learning.challenge();await tick();const panel=body.children[0],buttons=panel.querySelectorAll('button'),close=buttons.find(x=>x.textContent==='Tutup');
  close.click();resolveLoad(true);await opening;assert(panel.hidden);assert.equal(restores,1);assert.equal(buttons.filter(x=>x.textContent.startsWith('Source')).length,0);
  const reopen=learning.challenge();await tick();resolveLoad(true);await reopen;
  const answers=panel.querySelectorAll('button').filter(x=>x.textContent.startsWith('Source'));assert.equal(answers.length,4);assert.equal(new Set(answers.map(x=>x.textContent)).size,4);
  answers.find(x=>x.textContent==='Source 0').click();assert(panel.children.some(x=>x.textContent.startsWith('Benar.')));
  const [group]=panel.children.filter(x=>x.tagName==='select');group.value='small';await group.onchange();assert.equal(group.disabled,false);assert(panel.children.some(x=>x.textContent.includes('Minimal empat')));
 }finally{globalThis.document=originalDocument;globalThis.Option=originalOption;}
});
