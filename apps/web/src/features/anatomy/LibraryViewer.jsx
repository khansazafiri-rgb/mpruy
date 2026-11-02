import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ANATOMY_VIEWER_PATH,acceptsAtlasMessage} from './hostProtocol.mjs';
import {LIBRARY_COMMAND,LIBRARY_RESULT,LIBRARY_PICK,acceptsLibraryEvent} from './libraryProtocol.mjs';
export default function LibraryViewer({structureId,mode='explore',requestKey='',onPick,onReady}) {
 const iframe=useRef(null),[status,setStatus]=useState('loading'),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[frameReady,setFrameReady]=useState(false);
 const current=useRef(null),callbacks=useRef({onPick,onReady});callbacks.current={onPick,onReady};
 useEffect(()=>{
  const handler=event=>{
   if(acceptsAtlasMessage(event,location.origin,iframe.current?.contentWindow)) {
    if(event.data.type==='medcoel:anatomy-ready')setFrameReady(true);
    else {setStatus('error');setError('Viewer tidak dapat dimuat.');callbacks.current.onReady?.(false);}
    return;
   }
   if(!acceptsLibraryEvent(event,location.origin,iframe.current?.contentWindow,current.current))return;
   const d=event.data;
   if(d.type===LIBRARY_RESULT){setStatus(d.ok?'ready':'error');setError(d.ok?'':d.message);callbacks.current.onReady?.(d.ok);}
   if(d.type===LIBRARY_PICK)callbacks.current.onPick?.(d.structureId);
  };
  window.addEventListener('message',handler);
  const initialTimeout=setTimeout(()=>setStatus(s=>s==='ready'||s==='error'?s:'slow'),45000);
  return()=>{window.removeEventListener('message',handler);clearTimeout(initialTimeout);};
 },[attempt]);
 useEffect(()=>{
  callbacks.current.onReady?.(false);setError('');setStatus('loading');
  if(!frameReady)return;
  const requestId=crypto.randomUUID();current.current=requestId;
  iframe.current?.contentWindow?.postMessage({type:LIBRARY_COMMAND,version:1,requestId,structureId,mode},location.origin);
  const timeout=setTimeout(()=>{if(current.current===requestId){setStatus(s=>s==='ready'?s:'slow');}},45000);
  return()=>{clearTimeout(timeout);current.current=null;};
 },[frameReady,structureId,mode,attempt,requestKey]);
 const retry=()=>{current.current=null;setFrameReady(false);setStatus('loading');setAttempt(x=>x+1);};
 return <section className={'library-viewer '+(mode==='explore'?'':'is-study')} aria-label="Interactive Anatomy viewer">
  <iframe key={attempt} ref={iframe} title={mode==='explore'?'Human Anatomy 3D':'Anatomy study model'} src={ANATOMY_VIEWER_PATH} onError={()=>{setStatus('error');setError('Viewer belum tersedia.');callbacks.current.onReady?.(false);}} allow="clipboard-write"/>
  {status!=='ready'&&<div className="library-viewer-state" role="status"><strong>{status==='slow'?'Model masih dimuat…':status==='error'?'Struktur belum dapat dibuka':'Menyiapkan model 3D…'}</strong>{error&&<p>{error}</p>}{['error','slow'].includes(status)&&<><button className="btn-primary btn-sm" onClick={retry}>Coba lagi</button><Link className="btn-secondary btn-sm" to="/anatomy/library">Kembali ke library</Link></>}</div>}
 </section>;
}
