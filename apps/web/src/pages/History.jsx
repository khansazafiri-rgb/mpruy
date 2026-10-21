import { History as HistoryIcon, PlayCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, EmptyState, PageLoader, Tabs } from '@/components/ui';
import { errorText } from '@/lib/api';
import { KIND, scoreText } from '@/lib/labels';
import pb from '@/lib/pb';
import { duration, fmtDateTime } from '@/lib/time';

export default function History() {
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    pb.collection('attempts').getList(page, 20, { sort: '-created', filter: kind ? `kind = "${kind}"` : '', expand: 'subject' })
      .then(setData).catch((e) => setError(errorText(e)));
  }, [kind, page]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Riwayat</h1>
        <p className="mt-1 text-ink-muted">Buka lagi untuk review, atau ulangi dengan pengaturan yang sama.</p>
      </div>
      <Tabs value={kind} onChange={(v) => { setKind(v); setPage(1); }} tabs={[{ value: '', label: 'Semua' }, { value: 'simulation', label: 'Simulasi' }, { value: 'package', label: 'Paket' }, { value: 'practice', label: 'Latihan topik' }]} />
      <Alert>{error}</Alert>
      {!data ? <PageLoader /> : !data.items.length ? (
        <EmptyState icon={HistoryIcon} title="Belum ada riwayat">Mulai latihan dari halaman mata kuliah.</EmptyState>
      ) : (
        <div className="card divide-y divide-line">
          {data.items.map((a) => {
            const s = a.settings || {};
            const done = a.status === 'finished';
            return (
              <Link key={a.id} to={`/kerjakan/${a.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-page">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-xs text-ink-muted">
                    {KIND[a.kind]} · {a.mode === 'learning' ? 'Learning' : 'Ujian'} · {fmtDateTime(a.created)}
                    {a.kind === 'simulation' && s.chapters ? ` · ${s.chapters.length} BAB, ${(s.chapters || []).reduce((t, c) => t + c.easy + c.medium + c.hard, 0)} soal` : ''}
                    {done && a.durationSec ? ` · ${duration(a.durationSec)}` : ''}
                  </p>
                </div>
                {done ? (
                  <div className="text-right">
                    <p className="font-display text-xl font-bold text-brand">{scoreText(a.score)}</p>
                    <p className="text-xs text-ink-muted">{a.correctCount}/{a.scoredCount} benar{a.points ? ` · +${a.points} poin` : ''}</p>
                  </div>
                ) : <Badge className="bg-gold-soft text-[#6b4f00]"><PlayCircle size={13} /> Lanjutkan</Badge>}
              </Link>
            );
          })}
        </div>
      )}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button type="button" className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</button>
          <span className="self-center text-sm text-ink-muted">Halaman {page} dari {data.totalPages}</span>
          <button type="button" className="btn-secondary btn-sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya</button>
        </div>
      )}
    </div>
  );
}
