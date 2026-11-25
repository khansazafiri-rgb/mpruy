// Preview-only substitute for the production AnatomyLibrary route. Never bundled
// by the normal production Vite configuration. No legacy Z-Anatomy catalogue.
import {useEffect,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {PING,validStatus} from '../../../atlas-independent/src/host-protocol.js';
import './IndependentAtlasPreview.css';
const initial={state:'loading',message:'Menyiapkan Atlas independen…'};
function loopback(){return location.hostname==='127.0.0.1';}
function AtlasFrame(){
 const frame=useRef(null),[attempt,setAttempt]=useState(0),[status,setStatus]=useState(initial);
 useEffect(()=>{
  const handle=e=>{if(validStatus(e,location.origin,frame.current?.contentWindow))setStatus({state:e.data.state,message:e.data.message});};
  window.addEventListener('message',handle);
  const timer=setTimeout(()=>setStatus(s=>s.state==='loading'?{state:'loading',message:'Model masih dimuat. Jika perlu, coba ulang.'}:s),45000);
  return()=>{window.removeEventListener('message',handle);clearTimeout(timer);};
 },[attempt]);
 const retry=()=>{setStatus(initial);setAttempt(n=>n+1);};
 return <main className="independent-atlas-host">
  <header><Link to="/anatomy">← Anatomi MEDCOEL</Link><span>Review privat · tidak untuk publikasi</span><a href="/anatomy/viewer/" target="_blank" rel="noopener">Buka viewer terpisah</a></header>
  <p role="status" className="independent-atlas-status">{status.message}{status.state==='error'||status.state==='loading'?<button onClick={retry}>Coba ulang</button>:null}</p>
  <iframe key={attempt} ref={frame} title="Atlas 3D independen MEDCOEL" src="/anatomy/viewer/" allow="fullscreen" allowFullScreen onLoad={()=>frame.current?.contentWindow?.postMessage({type:PING,version:1},location.origin)} onError={()=>setStatus({state:'error',message:'Viewer tidak dapat dibuka.'})}/>
 </main>;
}
function Landing(){
 const [summary,setSummary]=useState(null),[error,setError]=useState('');
 useEffect(()=>{const c=new AbortController();fetch('/anatomy/viewer/inventory.json',{cache:'no-store',signal:c.signal}).then(r=>{if(!r.ok)throw Error('Inventaris tidak tersedia');return r.json();}).then(d=>{
  if(d.publicRelease!=='NO_GO'||d.sourceKind!=='independent-bp3d'||!Array.isArray(d.entries)||d.entries.some(e=>e.approvedForDistribution!==false))throw Error('Inventaris bukan paket independen privat');
  setSummary({models:d.entries.length,systems:new Set(d.entries.map(e=>e.group)).size});
 }).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
 return <main className="independent-atlas-landing"><header><strong>MEDCOEL</strong><span>Review privat · NO_GO</span></header>
 <section><p>ANATOMI MANUSIA</p><h1>Atlas 3D independen</h1><p>Eksplorasi geometri resmi BodyParts3D dan referensi organ HRA dalam koordinat sumber terpisah.</p>
 {summary?<p>{summary.models} model tubuh · {summary.systems}/13 kelompok tersedia. Bukan ukuran kelengkapan klinis.</p>:<p role="status">{error||'Memeriksa inventaris…'}</p>}
 <Link className="independent-atlas-link" to="/anatomy/explore">Buka Atlas 3D</Link>
 <p>Regio, lapisan, orientasi klinis, kuis, pustaka lama dan Live 4D Lab belum dipindahkan ke paket ini.</p><a href="/anatomy/viewer/MODEL-ATTRIBUTIONS.json">Atribusi model</a></section></main>;
}
export default function IndependentAtlasPreview(){
 const {pathname,search,hash}=useLocation();
 if(!loopback())return <p role="alert">Preview ini hanya tersedia pada loopback.</p>;
 const p=pathname.replace(/\/$/,'');
 // Deep links to legacy identity, quiz or landmark data cannot silently select a different model.
 if(p==='/anatomy/explore'&&!search&&!hash)return <AtlasFrame/>;
 if(p==='/anatomy'&&!search&&!hash)return <Landing/>;
 return <main className="independent-atlas-landing"><section><h1>Fitur belum tersedia di paket independen</h1><p>Identitas struktur dan kuis dari katalog lama belum dipetakan. Tidak ada fallback ke model lama.</p><Link to="/anatomy/explore">Buka Atlas independen</Link></section></main>;
}
