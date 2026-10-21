import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, EmptyState, PageLoader, Tabs } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { REPORT_REASON, REPORT_STATUS } from '@/lib/labels';
import pb from '@/lib/pb';
import { relative } from '@/lib/time';

const CLS = { baru: 'bg-coral-soft text-coral', ditangani: 'bg-gold-soft text-[#6b4f00]', selesai: 'bg-brand-soft text-brand-dark' };

export default function Reports() {
  const [status, setStatus] = useState('baru');
  const [items, setItems] = useState(null);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');
  const load = () => api('admin/reports', { query: { status } }).then((d) => setItems(d.items)).catch((e) => setError(e.message));
  useEffect(() => {
    setItems(null); load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  const update = async (r, st) => {
    try { await pb.collection('question_reports').update(r.id, { status: st, adminNote: notes[r.id] ?? r.adminNote }); load(); } catch (e) { setError(errorText(e)); }
  };
  return (
    <div className="space-y-5">
      <h1 className="page-title">Laporan soal</h1>
      <Tabs value={status} onChange={setStatus} tabs={[{ value: 'baru', label: 'Baru' }, { value: 'ditangani', label: 'Ditangani' }, { value: 'selesai', label: 'Selesai' }, { value: '', label: 'Semua' }]} />
      <Alert>{error}</Alert>
      {!items ? <PageLoader /> : !items.length ? <EmptyState title="Tidak ada laporan di sini" /> : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{REPORT_REASON[r.reason]}</p>
                  <p className="text-xs text-ink-muted">{r.reporter?.name} ({r.reporter?.loginId}) · {relative(r.created)}</p>
                </div>
                <Badge className={CLS[r.status]}>{REPORT_STATUS[r.status]}</Badge>
              </div>
              {r.note && <p className="mt-2 rounded-lg bg-page px-3 py-2 text-sm">{r.note}</p>}
              {r.question ? (
                <p className="mt-2 text-sm text-ink-muted">Soal: “{r.question.stemPlain}” <Link className="font-semibold text-academic hover:underline" to={`/admin/soal?id=${r.question.id}`}>Buka di Edit Soal</Link></p>
              ) : <p className="mt-2 text-sm text-ink-muted">Soal sudah dihapus.</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input className="input max-w-md flex-1 py-1.5 text-sm" placeholder="Catatan untuk pelapor (opsional)" value={notes[r.id] ?? r.adminNote} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} />
                {r.status !== 'ditangani' && <button type="button" className="btn-secondary btn-sm" onClick={() => update(r, 'ditangani')}>Tandai ditangani</button>}
                {r.status !== 'selesai' && <button type="button" className="btn-primary btn-sm" onClick={() => update(r, 'selesai')}>Selesai, beri tahu pelapor</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
