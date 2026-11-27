import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import StudioHost from '@/features/studios/StudioHost';
import { MODES, modeFrom, modeErrorText, progressLines } from '@/features/studios/studioProgress.mjs';

export default function StudioEntry() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const mode = modeFrom(location.search);
  const requestKey = id + ':' + mode;
  const [state, setState] = useState({ requestKey: null, loading: true, item: null, launch: null, error: '' });
  // A URL change must never mount the previous mode's launch before effects run.
  const current = state.requestKey === requestKey ? state : { loading: true, item: null, launch: null, error: '' };
  const [progress, setProgress] = useState(null);
  const refreshProgress = useCallback(() => {
    api('studios/' + encodeURIComponent(id) + '/progress').then(setProgress).catch(() => setProgress(null));
  }, [id]);
  useEffect(() => {
    let live = true;
    const ac = new AbortController();
    setState({ requestKey, loading: true, item: null, launch: null, error: '' });
    api('studios', { signal: ac.signal }).then(data => {
      if (!live) return null;
      const item = data.items?.find(row => row.id === id);
      if (!item) throw Error('Studio tidak ditemukan atau tidak dapat diakses.');
      if (!item.availability?.canLaunch) {
        if (live) setState({requestKey, loading: false, item, launch: null, error: ''});
        return null;
      }
      // Each launch mints a fresh scoped session for the chosen mode (re-entry = launch again).
      return api('studios/' + encodeURIComponent(id) + '/launch', { query: { mode }, signal: ac.signal }).then(launch => {
        if (live) setState({requestKey, loading: false, item, launch, error: ''});
      }).catch(err => {
        if (live) setState({requestKey, loading: false, item, launch: null, error: (err?.status === 409 ? modeErrorText('MODE_NOT_AVAILABLE') : '') || errorText(err)});
      });
    }).catch(err => { if (live) setState({requestKey, loading: false, item: null, launch: null, error: errorText(err)}); });
    return () => { live = false; ac.abort(); };
  }, [id, mode, requestKey]);
  useEffect(() => { if (current.item?.availability?.canLaunch) refreshProgress(); }, [current.item, refreshProgress]);
  const lines = progressLines(progress);
  return <section className="min-w-0 space-y-5 pb-24 lg:pb-8">
    <Link to="/lab/studios" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
      <ArrowLeft size={16} aria-hidden /> Clinical Studios
    </Link>
    <div className="space-y-1">
      <p className="eyebrow">MEDCOEL Clinical Studios</p>
      <h1 className="section-title">{current.item?.titleId || current.item?.title || 'Studio'}</h1>
    </div>
    {current.item?.availability?.canLaunch &&
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Mode belajar">
        {MODES.map(m => <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} data-testid={'studio-mode-' + m.id}
          className={'rounded-full border px-3 py-1 text-sm font-semibold ' + (mode === m.id ? 'border-brand bg-brand text-white' : 'border-line text-ink')}
          onClick={() => navigate({ search: m.id === 'explore' ? '' : '?mode=' + m.id })}>{m.label}</button>)}
      </div>}
    {lines.length > 0 &&
      <div className="rounded-xl border border-line p-3 text-sm" data-testid="studio-progress">
        <p className="font-semibold">Progres Anda</p>
        <ul className="list-disc pl-5 text-ink-muted">{lines.map(l => <li key={l}>{l}</li>)}</ul>
      </div>}
    {current.loading && <p role="status">Memeriksa akses studio…</p>}
    {current.error && <p role="alert">{current.error}</p>}
    {current.item && !current.item.availability?.canLaunch &&
      <p className="rounded-xl border border-line p-4 text-sm text-ink-muted">
        Studio belum dapat digunakan. Resource, hak distribusi, validasi medis, atau rilisnya masih perlu diselesaikan.
      </p>}
    {current.launch && <StudioHost key={requestKey} launch={current.launch} onProgress={refreshProgress} />}
  </section>;
}
