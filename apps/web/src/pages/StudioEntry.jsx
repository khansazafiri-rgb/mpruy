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
  const [state, setState] = useState({ loading: true, item: null, launch: null, error: '' });
  const [progress, setProgress] = useState(null);
  const refreshProgress = useCallback(() => {
    api('studios/' + encodeURIComponent(id) + '/progress').then(setProgress).catch(() => setProgress(null));
  }, [id]);
  useEffect(() => {
    let live = true;
    setState({ loading: true, item: null, launch: null, error: '' });
    api('studios').then(data => {
      const item = data.items?.find(row => row.id === id);
      if (!item) throw Error('Studio tidak ditemukan atau tidak dapat diakses.');
      if (!item.availability?.canLaunch) {
        if (live) setState({loading: false, item, launch: null, error: ''});
        return null;
      }
      // Each launch mints a fresh scoped session for the chosen mode (re-entry = launch again).
      return api('studios/' + encodeURIComponent(id) + '/launch', { query: { mode } }).then(launch => {
        if (live) setState({loading: false, item, launch, error: ''});
      }).catch(err => {
        if (live) setState({loading: false, item, launch: null, error: (err?.status === 409 ? modeErrorText('MODE_NOT_AVAILABLE') : '') || errorText(err)});
      });
    }).catch(err => { if (live) setState({loading: false, item: null, launch: null, error: errorText(err)}); });
    return () => { live = false; };
  }, [id, mode]);
  useEffect(() => { if (state.item?.availability?.canLaunch) refreshProgress(); }, [state.item, refreshProgress]);
  const lines = progressLines(progress);
  return <section className="min-w-0 space-y-5 pb-24 lg:pb-8">
    <Link to="/lab/studios" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
      <ArrowLeft size={16} aria-hidden /> Clinical Studios
    </Link>
    <div className="space-y-1">
      <p className="eyebrow">MEDCOEL Clinical Studios</p>
      <h1 className="section-title">{state.item?.titleId || state.item?.title || 'Studio'}</h1>
    </div>
    {state.item?.availability?.canLaunch &&
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
    {state.loading && <p role="status">Memeriksa akses studio…</p>}
    {state.error && <p role="alert">{state.error}</p>}
    {state.item && !state.item.availability?.canLaunch &&
      <p className="rounded-xl border border-line p-4 text-sm text-ink-muted">
        Studio belum dapat digunakan. Resource, hak distribusi, validasi medis, atau rilisnya masih perlu diselesaikan.
      </p>}
    {state.launch && <StudioHost key={mode} launch={state.launch} onProgress={refreshProgress} />}
  </section>;
}
