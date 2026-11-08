import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LIVE_LAB_PATH, checkLiveLab } from '../features/anatomy/liveLab.mjs';

// Anatomy Live 4D Lab host page (/anatomy/live). The simulator is a separate static build
// served at /anatomy/4d-lab/ (see apps/4d-lab/INTEGRATION.md); this page only frames it.
export default function LiveLab() {
  const [state, setState] = useState({ status: 'checking', message: '' });
  const [attempt, setAttempt] = useState(0);
  const frame = useRef(null);
  useEffect(() => {
    document.title = 'Anatomy Live 4D Lab | MEDCOEL';
    const controller = new AbortController();
    setState({ status: 'checking', message: '' });
    checkLiveLab(fetch, controller.signal)
      .then(() => setState({ status: 'ready', message: '' }))
      .catch((error) => { if (!controller.signal.aborted) setState({ status: 'error', message: error.message }); });
    return () => controller.abort();
  }, [attempt]);
  return (
    <main aria-label="Anatomy Live 4D Lab" style={{ height: '100dvh', position: 'relative', background: 'rgb(var(--paper))' }}>
      {state.status === 'ready' && (
        <iframe key={attempt} ref={frame} title="MEDCOEL Anatomy Live 4D Lab" src={LIVE_LAB_PATH} allow="fullscreen; autoplay" allowFullScreen
          style={{ width: '100%', height: '100%', border: 0, display: 'block' }} />
      )}
      {state.status !== 'ready' && (
        <section role={state.status === 'error' ? 'alert' : 'status'} className="card p-4" style={{ position: 'absolute', inset: 0, margin: 'auto', maxWidth: 520, height: 'fit-content' }}>
          <h1 className="card-title">Anatomy Live 4D Lab</h1>
          <p className="meta mt-2">Simulator pendidikan CT dan USG dengan pasien virtual. Bukan alat diagnosis.</p>
          {state.status === 'checking' && <p className="mt-3 text-sm">Memeriksa simulator…</p>}
          {state.status === 'error' && <>
            <p className="mt-3 text-sm font-semibold">Simulator belum dapat dibuka.</p>
            <p className="meta mt-1">{state.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-primary btn-sm" onClick={() => setAttempt((x) => x + 1)}>Coba lagi</button>
              <Link className="btn-secondary btn-sm" to="/anatomy">Kembali ke Anatomi</Link>
            </div>
          </>}
        </section>
      )}
    </main>
  );
}
