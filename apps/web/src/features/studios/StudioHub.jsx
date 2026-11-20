import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowLeft } from 'lucide-react';
import { api, errorText } from '@/lib/api';

const LABELS = { planned: 'Direncanakan', building: 'Dalam pengembangan', review: 'Menunggu review', blocked: 'Belum tersedia', failed: 'Gangguan rilis', ready: 'Tersedia' };
export default function StudioHub() {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => {
    let mounted = true;
    api('studios').then(data => { if (mounted) setState({ loading: false, data, error: '' }); })
      .catch(err => { if (mounted) setState({ loading: false, data: null, error: errorText(err) }); });
    return () => { mounted = false; };
  }, []);
  return <section className="min-w-0 space-y-5 pb-24 lg:pb-8" aria-labelledby="studios-title">
    <Link to="/lab" className="inline-flex items-center gap-2 text-sm font-semibold text-brand"><ArrowLeft size={16} aria-hidden /> Kembali ke Lab</Link>
    <div className="space-y-1">
      <p className="eyebrow">MEDCOEL Lab Hub</p>
      <h1 className="section-title" id="studios-title">Clinical Studios</h1>
      <p className="text-sm text-ink-muted">Aplikasi medis berdasarkan region dan modalitas. Status berasal dari server; studio tanpa data, lisensi, atau review yang sah tidak dapat dibuka.</p>
    </div>
    {state.loading && <p role="status">Memuat katalog studio…</p>}
    {state.error && <p role="alert" className="text-sm text-ink-muted">{state.error}</p>}
    {state.data && <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {(state.data.items || []).map(s => <li key={s.id} className="card-link flex min-w-0 flex-col gap-2 p-4">
        <div className="flex items-center gap-2"><Layers size={17} aria-hidden className="text-brand" /><span className="meta">{s.region} · {s.modality}</span></div>
        <h2 className="font-semibold">{s.titleId || s.title}</h2>
        <p className="text-sm text-ink-muted" aria-label="Status studio">{LABELS[s.availability?.state] || 'Belum tersedia'}</p>
        {s.availability?.canLaunch ? <Link className="btn btn-primary btn-sm mt-auto" to={'/lab/studio/' + encodeURIComponent(s.id)}>Buka studio</Link> :
          <span className="mt-auto text-xs text-ink-muted">Belum dapat dibuka</span>}
      </li>)}
    </ul>}
  </section>;
}
