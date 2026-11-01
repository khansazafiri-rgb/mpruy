import { useState } from 'react';
// Mount under the existing RequireAuth in App.jsx, outside AppShell.
// The atlas supplies a MEDCOEL study header and needs the full viewport.
export default function HumanAnatomy() {
  const [ready, setReady] = useState(false);
  return <main style={{height:'100dvh',background:'rgb(var(--paper))'}}>
    {!ready && <p role="status" style={{position:'absolute',padding:24}}>Memuat Human Anatomy…</p>}
    <iframe title="Human Anatomy — Interactive 3D Atlas" src="/anatomy/viewer/" onLoad={()=>setReady(true)} style={{width:'100%',height:'100%',border:0,display:'block'}} allow="clipboard-write" />
  </main>;
}
