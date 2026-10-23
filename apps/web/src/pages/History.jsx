import { CheckCircle2, History as HistoryIcon, PlayCircle, Stethoscope, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Badge, EmptyState, PageLoader, Tabs } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { KIND, scoreText } from '@/lib/labels';
import pb from '@/lib/pb';
import { duration, fmtDateTime } from '@/lib/time';
import PageHead from '@/components/PageHead';

function DoctorSims() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setData(null);
    api('doctor-sim/results', { query: { page, perPage: 20 } }).then(setData).catch((e) => setError(errorText(e)));
  }, [page]);
  if (error) return <Alert>{error}</Alert>;
  if (!data) return <PageLoader />;
  if (!data.items.length) {
    return (
      <EmptyState icon={Stethoscope} title="Belum ada simulasi dokter">
        Hasil setiap konsultasi di <Link to="/simulasi-dokter" className="font-semibold text-brand underline">Simulasi dokter</Link> akan tercatat di sini.
      </EmptyState>
    );
  }
  return (
    <>
      <div className="card divide-y divide-line">
        {data.items.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${r.dxOk ? 'bg-brand-soft text-brand' : 'bg-gold-soft text-[#6b4f00]'}`}>
              {r.dxOk ? <CheckCircle2 size={20} aria-label="Diagnosis tepat" /> : <XCircle size={20} aria-label="Diagnosis belum tepat" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{r.caseTitle}</p>
              <p className="text-xs text-ink-muted">
                Simulasi dokter · {r.mode === 'timer' ? 'Berwaktu' : 'Santai'}{r.timeout ? ' (waktu habis)' : ''} · {fmtDateTime(r.created)}
                {r.durationSec ? ` · ${duration(r.durationSec)}` : ''} · {r.dxOk ? 'diagnosis tepat' : 'diagnosis belum tepat'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-xl font-bold text-brand">{r.score}</p>
              <p className="text-xs text-ink-muted">{r.keyDone}/{r.keyTotal} hal penting</p>
            </div>
          </div>
        ))}
      </div>
      {data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button type="button" className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</button>
          <span className="self-center text-sm text-ink-muted">Halaman {page} dari {data.totalPages}</span>
          <button type="button" className="btn-secondary btn-sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya</button>
        </div>
      )}
      <div className="text-center"><Link to="/simulasi-dokter" className="btn-primary btn-press"><Stethoscope size={17} /> Pasien berikutnya</Link></div>
    </>
  );
}

export default function History() {
  const [params, setParams] = useSearchParams();
  const [kind, setKindState] = useState(params.get('tab') === 'dokter' ? 'dokter' : '');
  const setKind = (v) => { setKindState(v); setParams(v === 'dokter' ? { tab: 'dokter' } : {}, { replace: true }); };
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (kind === 'dokter') return;
    setData(null);
    pb.collection('attempts').getList(page, 20, { sort: '-created', filter: kind ? `kind = "${kind}"` : '', expand: 'subject' })
      .then(setData).catch((e) => setError(errorText(e)));
  }, [kind, page]);

  return (
    <div className="space-y-7">
      <PageHead eyebrow="Catatan belajarmu" title="Riwayat">Buka lagi untuk review, atau ulangi dengan pengaturan yang sama.</PageHead>
      <Tabs value={kind} onChange={(v) => { setKind(v); setPage(1); }} tabs={[{ value: '', label: 'Semua' }, { value: 'simulation', label: 'Simulasi' }, { value: 'package', label: 'Paket' }, { value: 'practice', label: 'Latihan topik' }, { value: 'dokter', label: 'Simulasi dokter' }]} />
      {kind === 'dokter' ? <DoctorSims /> : (<>
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
      </>)}
    </div>
  );
}
