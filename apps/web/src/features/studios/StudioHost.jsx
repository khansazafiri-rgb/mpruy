import { useEffect, useRef, useState } from 'react';

// Independently built first-party studio, isolated from the green Atlas CSS/runtime.
// This component does not perform licence clearance: the server must already have
// verified resource receipt AND immutable installation attestation for this release.
export default function StudioHost({ launch }) {
  const frame = useRef(null);
  const [manifest, setManifest] = useState(null);
  const [status, setStatus] = useState('Memeriksa manifest studio…');
  const { studioId: id, releaseId: release, runtime } = launch || {};
  const path = '/studio-assets/' + id + '/' + release + '/';
  const valid = /^[a-z][a-z0-9-]{2,40}$/.test(id || '') &&
    /^[a-z0-9-]{1,64}$/.test(release || '') && runtime?.type === 'iframe' &&
    runtime.entry === path + 'index.html';
  useEffect(() => {
    let live = true;
    if (!valid) { setStatus('Alamat rilis studio tidak valid.'); setManifest(null); return undefined; }
    const ac = new AbortController();
    fetch(path + 'studio-manifest.json', { cache: 'no-store', credentials: 'same-origin', signal: ac.signal })
      .then(async response => {
        if (!response.ok || !/application\/json/i.test(response.headers.get('content-type') || '')) throw Error('Manifest tidak tersedia');
        const data = await response.json();
        if (data?.schema !== 'medcoel.studio.v1' || data.id !== id || data.releaseId !== release || data.entry !== 'index.html' || !Array.isArray(data.files)) throw Error('Manifest tidak cocok');
        return data;
      }).then(data => { if (live) { setManifest(data); setStatus('Memuat studio…'); } })
      .catch(() => { if (live) { setManifest(null); setStatus('Studio belum terpasang atau manifest tidak cocok.'); } });
    return () => { live = false; ac.abort(); };
  }, [id, path, release, valid]);
  useEffect(() => {
    if (!manifest || !valid) return undefined;
    const target = frame.current;
    let port = null, sessionReady = false;
    const onMessage = event => {
      if (event.origin !== window.location.origin || event.source !== target?.contentWindow) return;
      if (event.data?.v !== 1 || event.data?.type !== 'studio.hello' || sessionReady) return;
      sessionReady = true;
      const channel = new MessageChannel();
      port = channel.port1;
      port.onmessage = message => {
        if (message.data?.v !== 1 || typeof message.data?.type !== 'string') return;
        if (message.data.type === 'studio.ready' && message.data.payload?.releaseId === release) setStatus('Studio siap digunakan.');
        if (message.data.type === 'studio.error') setStatus('Studio mengalami masalah. Kembali ke Lab jika perlu.');
      };
      target.contentWindow.postMessage({v: 1, type: 'host.launch', launch: launch.context}, window.location.origin, [channel.port2]);
    };
    window.addEventListener('message', onMessage);
    return () => { window.removeEventListener('message', onMessage); port?.close(); };
  }, [manifest, launch, release, valid]);
  return <div className="space-y-2">
    <p role="status" className="text-sm text-ink-muted">{status}</p>
    {manifest && valid && <iframe ref={frame} className="h-[min(72vh,850px)] w-full rounded-xl border border-line" title={id + ' Clinical Studio'} src={runtime.entry} referrerPolicy="same-origin" />}
  </div>;
}
