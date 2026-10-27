// "Pelajari materi": catatan satu BAB, dibaca seperti buku catatan lalu
// dilanjutkan ke latihan soal BAB yang sama.
import { ArrowLeft, ArrowRight, PlayCircle } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import MascotTip from '@/components/MascotTip';
import RichContent from '@/components/RichContent';
import { ErrorState, PageLoader } from '@/components/ui';
import { fmtDateTime } from '@/lib/time';
import { useApi } from '@/lib/useApi';

export default function SubjectNotes() {
  const { slug, chapterId } = useParams();
  const { data, error, loading, reload } = useApi(`chapters/${encodeURIComponent(chapterId)}/notes`);
  const back = `/mata-kuliah/${data?.subject?.slug || slug}?tab=materi`;
  if (loading) return <PageLoader />;
  if (error) return <div className="mx-auto max-w-3xl space-y-4"><Link to={back} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand"><ArrowLeft size={16} aria-hidden /> Kembali ke materi</Link><ErrorState onRetry={error.status === 404 ? undefined : reload}>{error.message}</ErrorState></div>;
  const { subject, chapter, content, updated, prev, next, position, total } = data;
  const to = (c) => `/mata-kuliah/${subject.slug}/materi/${c.id}`;
  return (
    <article className="mx-auto max-w-3xl space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-10">
      <Link to={back} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand hover:underline"><ArrowLeft size={16} aria-hidden /> {subject.name} · Materi</Link>
      <header className="space-y-2">
        <p className="eyebrow">Pelajari materi{total > 0 ? ` · ${position} dari ${total}` : ''}</p>
        <h1 className="page-title">{chapter.title}</h1>
        {updated && <p className="meta">Diperbarui {fmtDateTime(updated)}</p>}
      </header>
      <div className="card p-5 sm:p-8"><RichContent value={content} className="max-w-[70ch]" marks /></div>
      <MascotTip mascot="kila" mood="happy" size={56}>Sudah selesai membaca? Uji pemahamanmu dengan latihan soal BAB ini, pembahasannya muncul per soal.</MascotTip>
      <div className="flex flex-wrap gap-2">
        <Link className="btn btn-primary" to={`/mata-kuliah/${subject.slug}?tab=latihan&bab=${chapter.id}`}><PlayCircle size={18} aria-hidden /> Latihan soal BAB ini</Link>
      </div>
      {(prev || next) && (
        <nav aria-label="BAB lain" className="grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
          {prev ? <Link to={to(prev)} className="card-link flex min-w-0 items-center gap-3 p-4"><ArrowLeft size={18} className="shrink-0 text-brand" aria-hidden /><span className="min-w-0"><span className="meta block">Sebelumnya</span><span className="block truncate font-semibold">{prev.title}</span></span></Link> : <span />}
          {next && <Link to={to(next)} className="card-link flex min-w-0 items-center justify-end gap-3 p-4 text-right"><span className="min-w-0"><span className="meta block">Berikutnya</span><span className="block truncate font-semibold">{next.title}</span></span><ArrowRight size={18} className="shrink-0 text-brand" aria-hidden /></Link>}
        </nav>
      )}
    </article>
  );
}
