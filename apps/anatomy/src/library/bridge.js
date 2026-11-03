import {getCatalog,reveal,viewGroup,chooseRegion} from '../atlas/engine.js';
import {state,subscribe} from '../state/store.js';
import {LIBRARY_RESULT,LIBRARY_PICK,acceptsLibraryCommand} from './protocol.js';
import './study.css';
import {executeLibrarySelection} from './selection.js';
export function installLibraryBridge(viewer) {
 let active=null,busy=false,queue=Promise.resolve();
 const send=payload=>window.parent.postMessage({version:1,...payload},location.origin);
 subscribe('selectedPart',part=>{
  if(!busy&&active?.mode==='find'&&part&&state.viewer===viewer)send({type:LIBRARY_PICK,requestId:active.requestId,structureId:part.id});
 });
 window.addEventListener('message',event=>{
  if(!acceptsLibraryCommand(event,location.origin,window.parent,window))return;
  // The annotator is a separate opt-in channel; library commands cannot modify its session.
  if(new URLSearchParams(location.search).get('annotator')==='1')return;
  const command=structuredClone(event.data);
  queue=queue.then(async()=>{
   busy=true;active=command;
   document.body.classList.toggle('anatomy-study-active',command.mode!=='explore');
   try {await executeLibrarySelection(command,{catalog:getCatalog,reveal,viewGroup,chooseRegion});send({type:LIBRARY_RESULT,requestId:command.requestId,ok:true,structureId:command.structureId});}
   catch(e){active=null;send({type:LIBRARY_RESULT,requestId:command.requestId,ok:false,message:String(e.message).slice(0,300)});}
   finally {busy=false;viewer.render();}
  });
 });
}
