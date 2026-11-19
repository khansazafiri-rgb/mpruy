// Pintu masuk Lab: All-in-One Lab, belajar per sistem tubuh, per keterampilan klinis, dan "lanjutkan jalur".
// Disiplin (Guided Learning / Explore di bawahnya) tetap peta utama; jalur di sini hanya cara masuk tambahan.
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Box, FlaskConical, Layers, ScanLine } from 'lucide-react';
import { ProgressBar } from '@/components/ui';
import { TRACK_GROUPS, TRACKS, nextStep, resolveSteps, trackHref, trackSummary } from './labTracks';
import { TRACK_ICON, statusChip, useTrackData } from './trackUi';

export default function LabHub() {
  const data = useTrackData();
  const rows = useMemo(() => TRACKS.map((t) => {
    const steps = resolveSteps(t, data);
    return { t, steps, sum: trackSummary(steps, data.progress[t.key]), progress: data.progress[t.key] };
  }), [data]);
  // most recently touched unfinished track (progress list is ordered by last update)
  const resume = Object.values(data.progress).map((p) => rows.find((r) => r.t.key === p.track)).find((r) => r && r.sum.status === 'active');
  const next = resume && nextStep(resume.steps, resume.progress);
  return (
    <section aria-labelledby="lab-hub-h" className="space-y-5">
      <h2 id="lab-hub-h" className="sr-only">Cara belajar di Lab</h2>
      {resume && next && <div className="card-resume flex flex-wrap items-center justify-between gap-3 p-4" aria-label="Lanjutkan jalur">
        <div className="min-w-0 flex-[1_1_14rem] space-y-1.5"><p className="eyebrow">Lanjutkan jalur</p><p className="card-title truncate">{resume.t.title}</p>
          <ProgressBar value={resume.sum.done} max={resume.sum.available} label="Progres jalur" className="!h-2" /><p className="meta">Berikutnya: {next.title}</p></div>
        <Link className="btn btn-primary shrink-0" to={trackHref(resume.t)}>Lanjutkan <ArrowRight size={16} aria-hidden /></Link>
      </div>}
      <div className="surface-forest rounded-2xl p-5">
        <p className="text-[13px] font-bold uppercase tracking-wide text-white/75">All-in-One Lab</p>
        <p className="font-display text-xl font-bold text-white">Semua alat belajar dalam satu tempat</p>
        <p className="mt-1 max-w-2xl text-sm text-white/85">Atlas 3D untuk anatomi, pasien virtual Live 4D untuk USG dan auskultasi, dan seluruh materi Lab per bidang.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="btn btn-paper btn-sm" to="/anatomy/explore"><Box size={16} aria-hidden /> Atlas 3D</Link>
          <Link className="btn btn-paper btn-sm" to="/anatomy/live"><ScanLine size={16} aria-hidden /> Live 4D Lab</Link>
          <a className="btn btn-paper btn-sm" href="#lab-index"><Layers size={16} aria-hidden /> Semua materi Lab</a>
        </div>
      </div>
      {TRACK_GROUPS.map((g) => <div key={g.key} className="space-y-2">
        <h2 className="section-title !text-lg">{g.title}</h2>
        <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">{rows.filter((r) => r.t.group === g.key).map(({ t, sum }) => {
          const Icon = TRACK_ICON[t.icon] || FlaskConical; const [label, chip] = statusChip(sum);
          return <li key={t.key}><Link to={trackHref(t)} className="card-link flex h-full min-w-0 items-start gap-3 p-3" data-track={t.key}>
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Icon size={18} /></span>
            <span className="min-w-0 space-y-0.5"><span className="block font-semibold leading-snug">{t.title}</span>
              <span className="meta block">{data.ready ? `${sum.available}/${sum.total} langkah tersedia` : 'Memuat…'}</span>
              {data.ready && sum.status !== 'new' && <span className={`${chip} mt-1`}>{label}{sum.status === 'active' ? ` · ${sum.done}/${sum.available}` : ''}</span>}</span>
          </Link></li>;
        })}</ul>
      </div>)}
    </section>
  );
}
