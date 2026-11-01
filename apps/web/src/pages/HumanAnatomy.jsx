import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { atlasFrameSrc, acceptsAtlasMessage } from '../features/anatomy/hostProtocol.mjs';

// A separate document keeps the existing Three.js and CSS lifecycles isolated.
export default function HumanAnatomy() {
  const iframe = useRef(null);
  const {hash} = useLocation();
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    document.title = 'Human Anatomy | MEDCOEL';
    const handleMessage = (event) => {
      if (!acceptsAtlasMessage(event, window.location.origin, iframe.current?.contentWindow)) return;
      setStatus(event.data.type === 'medcoel:anatomy-ready' ? 'ready' : 'error');
    };
    window.addEventListener('message', handleMessage);
    const timer = setTimeout(() => setStatus(s => s === 'loading' ? 'slow' : s), 45000);
    return () => { clearTimeout(timer); window.removeEventListener('message', handleMessage); };
  }, [attempt]);
  const retry = () => { setStatus('loading'); setAttempt(a => a + 1); };
  return <main aria-label="Human Anatomy" style={{height:'100dvh',position:'relative',background:'rgb(var(--paper))'}}>
    <iframe key={attempt} ref={iframe} title="Human Anatomy — Interactive 3D Atlas"
      src={atlasFrameSrc(hash)} allow="clipboard-write"
      onError={()=>setStatus('error')}
      style={{width:'100%',height:'100%',border:0,display:'block'}} />
    {status === 'loading' && <div role="status" style={{position:'absolute',inset:0,display:'grid',placeItems:'center',background:'rgb(var(--paper))'}}><Spinner label="Memuat Human Anatomy" /></div>}
    {(status === 'error' || status === 'slow') && <section role="alert" className="card p-5" style={{position:'absolute',top:16,left:16,right:16,maxWidth:540,margin:'auto'}}>
      <h1 className="card-title">{status === 'slow' ? 'Model masih dimuat' : 'Human Anatomy belum dapat dibuka'}</h1>
      <p className="meta mt-2">{status === 'slow' ? 'Model 3D dapat membutuhkan waktu lebih lama pada koneksi ini.' : 'Coba muat ulang atlas atau kembali ke MEDCOEL Lab.'}</p>
      <div className="mt-4 flex flex-wrap gap-2"><button className="btn-primary btn-sm" onClick={retry}>Coba lagi</button><Link className="btn-secondary btn-sm" to="/lab">Kembali ke Lab</Link></div>
    </section>}
  </main>;
}
