import {getCatalog,reveal,prepareStudy,restoreScene,hideSelected,frame} from '../atlas/engine.js';
import {state,subscribe} from '../state/store.js';
import {showPart} from '../viewer/visibility.js';
import {getMeshRegistry,ownMeshesOf} from '../viewer/loadModel.js';
import * as THREE from 'three';
import {LIBRARY_RESULT,acceptsLibraryCommand} from './protocol.js';
import './study.css';
import {executeLibrarySelection} from './selection.js';
import {createStudySession} from './session.js';
export function installLibraryBridge(viewer) {
 let active=null,busy=false,queue=Promise.resolve();
 const send=payload=>window.parent.postMessage({version:1,...payload},location.origin);
 const session=createStudySession({send,hide:hideSelected,show:showPart,restore:restoreScene,render:()=>viewer.render(),visible:id=>!!getMeshRegistry().has(id)&&state.partStates.get(id)?.visible!==false,focus:id=>{const box=new THREE.Box3();ownMeshesOf(id).forEach(mesh=>box.expandByObject(mesh));frame(box);}});
 const panel=document.createElement('section');panel.className='study-context';panel.setAttribute('aria-label','Kontrol eksplorasi kuis');panel.hidden=true;
 const selected=document.createElement('strong');selected.className='study-selected';selected.textContent='Tap struktur untuk memilih';
 const actions=document.createElement('div');actions.className='study-context-actions';
 const button=(label,fn)=>{const el=document.createElement('button');el.type='button';el.textContent=label;el.addEventListener('click',()=>{fn();update();});actions.append(el);return el;};
 const submit=button('Pilih sebagai jawaban',()=>session.answer());submit.className='study-submit';
 const hide=button('Sembunyikan',()=>session.hide());
 const focus=button('Fokus pilihan',()=>session.focus());
 button('Tampilkan semua',()=>session.reset());
 const undoSelect=document.createElement('select');undoSelect.setAttribute('aria-label','Tampilkan kembali struktur tersembunyi');undoSelect.addEventListener('change',()=>{session.unhide(undoSelect.value);update();});
 panel.append(selected,actions,undoSelect);document.body.append(panel);
 // Reserve the sheet's actual height so it cannot cover the hands or other meshes.
 new ResizeObserver(()=>document.documentElement.style.setProperty('--study-controls-height',panel.hidden?'0px':(panel.getBoundingClientRect().height+20)+'px')).observe(panel);
 function update(){
  panel.hidden=active?.mode!=='find';
  const part=session.selected();selected.textContent=part?.displayName||'Tap struktur → sembunyikan atau pilih sebagai jawaban';
  submit.disabled=hide.disabled=focus.disabled=busy||!part;
  undoSelect.replaceChildren(new Option('Tampilkan kembali…',''));
  for(const [id,name]of session.hidden())undoSelect.append(new Option(name,id));
  undoSelect.hidden=!session.hidden().length;
  panel.classList.toggle('has-selection',!!part);
 }
 subscribe('selectedPart',part=>{if(!busy&&active?.mode==='find'&&state.viewer===viewer){session.select(part);update();}});
 window.addEventListener('message',event=>{
  if(!acceptsLibraryCommand(event,location.origin,window.parent,window))return;
  if(new URLSearchParams(location.search).get('annotator')==='1')return;
  const command=structuredClone(event.data);
  queue=queue.then(async()=>{
   busy=true;active=command;session.begin(command);
   document.body.classList.toggle('anatomy-study-active',command.mode!=='explore');
   document.body.dataset.studyMode=command.mode;update();
   try {await executeLibrarySelection(command,{catalog:getCatalog,reveal,prepareStudy,restoreScene});send({type:LIBRARY_RESULT,requestId:command.requestId,ok:true,structureId:command.structureId});}
   catch(e){active=null;send({type:LIBRARY_RESULT,requestId:command.requestId,ok:false,message:String(e.message).slice(0,300)});}
   finally {busy=false;update();viewer.render();}
  });
 });
}
