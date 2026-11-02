import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {ANATOMY_VIEWER_PATH,acceptsAtlasMessage} from './hostProtocol.mjs';
import {PREFIX,acceptsAnnotationEvent} from './annotatorProtocol.mjs';
import {parseDocument} from './annotationSchema.mjs';
// Optional study mode consumes published JSON only. Admin browser drafts are never read here.
export default function AnatomyLandmarkStudy() {
 const iframe=useRef(null),session=useRef(crypto.randomUUID()),documentRef=useRef(null);
 const [documentData,setDocumentData]=useState(null),[status,setStatus]=useState('loading'),[error,setError]=useState('');
 const send=(type,payload={})=>iframe.current?.contentWindow?.postMessage({type:PREFIX+type,version:1,session:session.current,...payload},location.origin);
 useEffect(()=>{
  document.title='Human Anatomy Landmarks | MEDCOEL';
  let alive=true,viewerReady=false;
  const enter=()=>{if(viewerReady&&documentRef.current)send('enter',{document:documentRef.current});};
  const listener=e=>{
   if(acceptsAtlasMessage(e,location.origin,iframe.current?.contentWindow)) {
    if(e.data.type==='medcoel:anatomy-error'){setError('Viewer belum dapat dibuka.');setStatus('error');return;}
    viewerReady=true;enter();return;
   }
   if(!acceptsAnnotationEvent(e,location.origin,iframe.current?.contentWindow,session.current))return;
   if(e.data.type==='medcoel:anatomy-annotation-error'){setError(e.data.message);return;}
   if(e.data.type==='medcoel:anatomy-annotation-change'){
    if(e.data.reason==='enter')send('preview',{document:documentRef.current,student:true});
    setStatus('ready');
   }
  };
  window.addEventListener('message',listener);
  fetch(ANATOMY_VIEWER_PATH+'data/annotations/skeletal/humerus.r.json').then(r=>{if(!r.ok)throw Error('Annotation JSON belum tersedia');return r.text();}).then(text=>{const d=parseDocument(text);if(alive){documentRef.current=d;setDocumentData(d);enter();}}).catch(e=>{if(alive){setError(e.message);setStatus('error');}});
  const timeout=setTimeout(()=>{if(alive)setStatus(s=>s==='loading'?'slow':s);},60000);
  return()=>{alive=false;window.removeEventListener('message',listener);clearTimeout(timeout);};
 },[]);
 return <main style={{height:'100dvh',display:'flex',flexDirection:'column',background:'rgb(var(--paper))'}}>
  <header className="border-b border-line bg-surface p-3"><div className="flex flex-wrap items-center gap-3"><Link className="btn-secondary btn-sm" to="/anatomy">← Atlas</Link><h1 className="font-bold">Right humerus · Landmarks</h1><span className="meta">Published annotations · read-only</span></div>
   <nav aria-label="Humerus landmarks" className="mt-3 flex gap-2 overflow-x-auto">{documentData?.landmarks.map(l=><button key={l.id} className="btn-secondary btn-sm shrink-0" disabled={status!=='ready'||!l.geometry} onClick={()=>send('select-landmark',{landmarkId:l.id})}>{l.name_en}{!l.geometry?' · belum dipetakan':l.status==='VERIFIED'?'':' · '+l.status}</button>)}</nav>
   {documentData?.landmarks.every(l=>!l.geometry)&&<p className="meta mt-2">Landmark pilot belum dipetakan. Admin perlu menandai dan mereview mesh sebelum menerbitkan JSON.</p>}
   {status!=='ready'&&<p role="status" className="meta mt-2">{status==='slow'?'Model masih dimuat…':status==='error'?'Anotasi belum dapat dibuka.':'Memuat mesh dan anotasi…'}</p>}{error&&<p role="alert">{error}</p>}
  </header>
  <iframe ref={iframe} title="Human Anatomy — published humerus landmarks" src={ANATOMY_VIEWER_PATH+'?annotator=1'} style={{width:'100%',flex:1,minHeight:0,border:0}}/>
 </main>;
}
