// JALUR LAB per sistem tubuh (/lab/sistem/:track) dan per keterampilan klinis (/lab/keterampilan/:track).
// Satu jalur = urutan konten yang sudah ada (Atlas 3D, kuis Atlas, Live 4D Lab, modul Lab). Langkah yang belum
// tersedia ditampilkan apa adanya dan tidak dihitung dalam progres. Tanda selesai adalah catatan siswa sendiri.
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, FlaskConical } from 'lucide-react';
import { TRACK_ICON, statusChip, useTrackData } from '@/features/lab/trackUi';
import PageHead from '@/components/PageHead';
import { Alert, EmptyState, ErrorState, PageLoader, ProgressBar } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { KIND_LABEL, TRACKS, findTrack, groupOf, nextStep, resolveSteps, trackHref, trackSummary } from '@/features/lab/labTracks';

const PAGE = 'min-w-0 space-y-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-8';

export default function LabTrack({ group }) {
  const { track: key } = useParams();
  const track = findTrack(group, key);
  const data = useTrackData();
  const [error, setError] = useState('');
  const steps = useMemo(() => (track ? resolveSteps(track, data) : []), [track, data]);
  if (!track) return <div className={PAGE}><EmptyState icon={FlaskConical} title="Jalur tidak ditemukan" action={<Link className="btn btn-primary" to="/lab">Kembali ke Lab</Link>}>Alamat jalur ini tidak dikenal.</EmptyState></div>;
  if (data.error && !data.catalog) return <ErrorState onRetry={data.retry}>{data.error}</ErrorState>;
  if (!data.ready) return <PageLoader />;
  const progress = data.progress[track.key];
  const sum = trackSummary(steps, progress);
  const next = nextStep(steps, progress);
  const [label, chip] = statusChip(sum);
  const Icon = TRACK_ICON[track.icon] || FlaskConical;
  const done = new Set(progress?.completed || []);
  async function mark(step, payload) {
    setError('');
    try { data.setProgress(await api(`lab/tracks/${track.key}`, { method: 'POST', body: { step: step.key, ...payload } })); } catch (e) { setError(errorText(e)); }
  }
  const others = TRACKS.filter((t) => t.group === group && t.key !== track.key);
  return (
    <div className={PAGE}>
      <Link to="/lab" className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft size={16} aria-hidden /> MEDCOEL Lab</Link>
      <PageHead eyebrow={<span className="inline-flex items-center gap-1.5"><Icon size={15} aria-hidden /> {groupOf(group).title}</span>} title={track.title}>{track.summary}</PageHead>
      <section className="card space-y-2 p-4" aria-label="Ringkasan jalur">
        <p className="flex flex-wrap items-center justify-between gap-2"><span className={chip}>{label}</span><span className="meta">{sum.available} dari {sum.total} langkah tersedia{sum.available ? ` · ${sum.done} selesai` : ''}</span></p>
        {sum.available > 0 && <ProgressBar value={sum.done} max={sum.available} label="Progres jalur" className="!h-2" />}
        {sum.partial && <p className="meta">Langkah bertanda “belum tersedia” tidak dihitung. Jalur ini dianggap selesai bila semua langkah yang tersedia sudah kamu tandai.</p>}
        {next && <Link className="btn btn-primary btn-sm" to={next.href} onClick={() => mark(next, {})}>{sum.status === 'new' ? 'Mulai' : 'Lanjutkan'}: {next.title} <ArrowRight size={16} aria-hidden /></Link>}
      </section>
      <Alert>{error}</Alert>
      <ol className="space-y-2" aria-label="Langkah jalur">
        {steps.map((s, i) => {
          const isDone = s.available && done.has(s.key);
          return <li key={s.key} className={`card flex flex-wrap items-center gap-3 p-4 ${s.available ? '' : 'opacity-75'}`} data-step={s.key} data-available={s.available ? '1' : '0'}>
            <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${isDone ? 'bg-brand text-white' : 'bg-paper-2 text-ink-muted'}`}>{isDone ? <Check size={16} /> : i + 1}</span>
            <div className="min-w-0 flex-[1_1_14rem] space-y-0.5">
              <p className="meta font-semibold">{s.available ? KIND_LABEL[s.kind] : s.kind === "planned" ? KIND_LABEL.planned : `${KIND_LABEL[s.kind]} · belum tersedia`}</p>
              <p className="font-semibold">{s.title}</p>
              {s.summary && <p className="text-sm text-ink-muted">{s.summary}</p>}
              {!s.available && <p className="text-sm text-ink-muted">{s.reason}</p>}
            </div>
            {s.available && <div className="flex flex-wrap items-center gap-2">
              <Link className="btn btn-secondary btn-sm" to={s.href} onClick={() => mark(s, {})}>Buka <ArrowRight size={15} aria-hidden /></Link>
              <button type="button" className={`btn btn-sm ${isDone ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={isDone} onClick={() => mark(s, { done: !isDone })}>{isDone ? <><Check size={15} aria-hidden /> Selesai</> : 'Tandai selesai'}</button>
            </div>}
          </li>;
        })}
      </ol>
      <p className="meta">Tanda selesai adalah catatanmu sendiri. Simulasi Live 4D Lab dan pola skematik adalah alat belajar, bukan alat diagnosis.</p>
      {others.length > 0 && <nav aria-label="Jalur lain" className="space-y-2"><h2 className="section-title !text-lg">Jalur lain</h2>
        <div className="flex flex-wrap gap-2">{others.map((t) => <Link key={t.key} to={trackHref(t)} className="chip chip-brand min-h-9 px-3 text-[13px] hover:bg-brand hover:text-white">{t.title}</Link>)}</div>
      </nav>}
    </div>
  );
}
