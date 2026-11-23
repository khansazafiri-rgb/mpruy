// Pure DOM/Canvas test harness. This is NOT a native browser or a clinical fixture.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto,{webcrypto} from 'node:crypto';
import {createPrivateMprPack,addPrivateMprOrgan,encodePrivateMprPack} from './private-totalseg-mpr.mjs';

export function privateMprFixture(){
  const dims=[8,7,6],n=8*7*6,affine=[1,0,0,0,0,1,0,0,0,0,1,0];
  const base={dims,n,scale:1,intercept:0,affine,spatialUnits:'mm'};
  const ct={...base,kind:'ct',read:i=>-120+7*(i%8)+11*(Math.floor(i/8)%7)+19*Math.floor(i/56)};
  const organ=(id,label,rgb,inside)=>({volume:{...base,kind:'mask',read:i=>inside(i%8,Math.floor(i/8)%7,Math.floor(i/56))?1:0},metadata:{id,label,rgb}});
  const pack=createPrivateMprPack(ct,{maxDim:32});
  for(const o of [organ('liver','Engineering fixture A (NOT anatomy)',[240,166,61],(x,y,z)=>x>=2&&x<=3&&y>=2&&y<=3&&z>=2&&z<=3),
    organ('heart','Engineering fixture B (NOT anatomy)',[250,111,155],(x,y,z)=>x>=4&&x<=5&&y===3&&z===2)])addPrivateMprOrgan(pack,o.volume,o.metadata);
  const pin=crypto.createHash('sha256').update('SYNTHETIC ENGINEERING FIXTURE; NO PATIENT OR MEDICAL APPROVAL').digest('hex');
  return {...encodePrivateMprPack(pack,{sourceSubject:'s0000',archiveSha256:pin,sourceCtSha256:pin}),fixture:true};
}

export async function runPrivateMprDom(payload,{studio='abdomen-ct'}={}){
  class Element{
    constructor(tag,id='',attributes={}){this.tagName=tag.toUpperCase();this.id=id;this.children=[];this.listeners={};this.style={};this.dataset={};this.textContent='';Object.assign(this,attributes);}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=[...nodes];}
    addEventListener(name,fn){(this.listeners[name]||=[]).push(fn);}
    dispatch(name,extra={}){for(const fn of this.listeners[name]||[])fn({target:this,preventDefault(){},...extra});}
    getContext(kind){
      if(kind!=='2d')return null;
      return {createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}),
        putImageData:image=>{this.frame={...image,data:new Uint8ClampedArray(image.data)};},clearRect:()=>{this.frame=null;}};
    }
  }
  const elements=new Map(),body=new Element('body');body.dataset.studio=studio;
  const template=fs.readFileSync(new URL('./private-totalseg-mpr-template.html',import.meta.url),'utf8');
  for(const match of template.matchAll(/<(\w+)([^>]*\bid="([^"]+)"[^>]*)>/g)){
    const attrs={};for(const pair of match[2].matchAll(/(\w+)="([^"]*)"/g))attrs[pair[1]]=pair[2];
    elements.set(match[3],new Element(match[1],match[3],attrs));
  }
  const document={body,getElementById:id=>elements.get(id)||null,
    createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),
    querySelectorAll:()=>[...elements.values(),...elements.get('organs').children.flatMap(n=>n.children)].filter(n=>['INPUT','SELECT','BUTTON'].includes(n.tagName))};
  const context=vm.createContext({document,MEDCOEL_CT_PRIVATE:payload,crypto:webcrypto,DecompressionStream,Blob,Response,atob,
    TextEncoder,Uint8Array,Uint8ClampedArray,DataView,requestAnimationFrame:fn=>queueMicrotask(fn),console});
  context.window=context;
  vm.runInContext(fs.readFileSync(new URL('./private-totalseg-mpr-geometry.cjs',import.meta.url),'utf8'),context);
  await vm.runInContext(fs.readFileSync(new URL('./private-totalseg-mpr-browser.js',import.meta.url),'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  return {document,elements,flush,
    set:async(id,value,event='input')=>{const e=elements.get(id);e.value=String(value);e.dispatch(event);await flush();},
    pixel:(axis,u,v)=>Array.from(elements.get('view-'+axis).frame.data.slice((u+elements.get('view-'+axis).width*v)*4,(u+elements.get('view-'+axis).width*v)*4+4))};
}
