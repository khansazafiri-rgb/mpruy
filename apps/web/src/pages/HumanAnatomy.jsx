import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {Spinner} from '@/components/ui';
import {atlasFrameSrc,acceptsAtlasMessage,withBackLink,nextAtlasStatus,checkViewerAsset} from '../features/anatomy/hostProtocol.mjs';
const AnatomyLandmarkStudy=lazy(()=>import('../features/anatomy/AnatomyLandmarkStudy'));
export default function HumanAnatomy({back=null}){const {search}=useLocation();if(new URLSearchParams(search).get('landmarks')==='Humerus.r')return <Suspense fallback={<Spinner label="Memuat landmark"/>}><AnatomyLandmarkStudy/></Suspense>;return <Atlas back={back}/>;}
function Atlas({back}){
 const iframe=useRef(null),probe=useRef(null),{hash}=useLocation();
 const [attempt,setAttempt]=useState(0),[status,setStatus]=useState('loading'),[message,setMessage]=useState('Menyiapkan atlas…');
 useEffect(()=>{
  document.title='Human Anatomy | MEDCOEL';
  const handler=event=>{if(!acceptsAtlasMessage(event,window.location.origin,iframe.current?.contentWindow))return;
   setStatus(current=>nextAtlasStatus(current,event.data.type));if(event.data.message)setMessage(event.data.message);
  };
  window.addEventListener('message',handler);
  const timer=setTimeout(()=>setStatus(s=>s==='loading'?'slow':s),45000);
  return()=>{clearTimeout(timer);probe.current?.abort();window.removeEventListener('message',handler);};
 },[attempt]);
 const loaded=()=>{
  iframe.current?.contentWindow?.postMessage({type:'medcoel:anatomy-ping',version:1},location.origin);
  probe.current?.abort();const controller=new AbortController();probe.current=controller;
  checkViewerAsset(fetch,controller.signal).catch(error=>{if(!controller.signal.aborted){setMessage(error.message);setStatus(current=>['interactive','ready'].includes(current)?current:'error');}});
 };
 const retry=()=>{setStatus('loading');setMessage('Menyiapkan atlas…');setAttempt(x=>x+1);};
 return <main aria-label="Human Anatomy" style={{height:'100dvh',position:'relative',background:'rgb(var(--paper))'}}>
  <iframe key={attempt} ref={iframe} title="Atlas Anatomi 3D MEDCOEL" src={withBackLink(atlasFrameSrc(hash),back)} allow="clipboard-write" onLoad={loaded} onError={()=>{setMessage('Viewer belum tersedia.');setStatus('error');}} style={{width:'100%',height:'100%',border:0,display:'block'}}/>
  {!['interactive','ready'].includes(status)&&<section role={status==='error'?'alert':'status'} className="card p-4" style={{position:'absolute',bottom:16,left:16,right:16,maxWidth:480,margin:'auto',zIndex:20}}>
   <p className="text-sm font-semibold">{status==='error'?'Human Anatomy belum dapat dibuka':status==='slow'?'Viewer masih memuat; tampilan tetap dapat dilihat.':message}</p>
   {status==='error'&&<p className="meta mt-2">{message}</p>}
   {['error','slow'].includes(status)&&<div className="mt-3 flex flex-wrap gap-2"><button className="btn-primary btn-sm" onClick={retry}>Coba lagi</button><Link className="btn-secondary btn-sm" to="/lab">Kembali ke Lab</Link></div>}
  </section>}
 </main>;
}
