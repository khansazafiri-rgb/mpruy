import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import StudioHost from '@/features/studios/StudioHost';

export default function StudioEntry() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, item: null, launch: null, error: '' });
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
      return api('studios/' + encodeURIComponent(id) + '/launch').then(launch => {
        if (live) setState({loading: false, item, launch, error: ''});
      });
    }).catch(err => { if (live) setState({loading: false, item: null, launch: null, error: errorText(err)}); });
    return () => { live = false; };
  }, [id]);
  return <section className="min-w-0 space-y-5 pb-24 lg:pb-8">
    <Link to="/lab/studios" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
      <ArrowLeft size={16} aria-hidden /> Clinical Studios
    </Link>
    <div className="space-y-1">
      <p className="eyebrow">MEDCOEL Clinical Studios</p>
      <h1 className="section-title">{state.item?.titleId || state.item?.title || 'Studio'}</h1>
    </div>
    {state.loading && <p role="status">Memeriksa akses studio…</p>}
    {state.error && <p role="alert">{state.error}</p>}
    {state.item && !state.item.availability?.canLaunch &&
      <p className="rounded-xl border border-line p-4 text-sm text-ink-muted">
        Studio belum dapat digunakan. Resource, hak distribusi, validasi medis, atau rilisnya masih perlu diselesaikan.
      </p>}
    {state.launch && <StudioHost launch={state.launch} />}
  </section>;
}
