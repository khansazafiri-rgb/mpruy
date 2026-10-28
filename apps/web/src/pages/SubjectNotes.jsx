// "Pelajari materi": catatan satu BAB, dibaca seperti halaman buku catatan bergambar
// lalu dilanjutkan ke latihan soal BAB yang sama.
import { ArrowLeft, ArrowRight, BookOpen, Clock, Images, Layers, PlayCircle } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { NotesView, isNotesV2, parseNotes } from '@/components/ChapterNotes';
import Mascot from '@/components/Mascot';
import MascotTip, { useMascotsOn } from '@/components/MascotTip';
import RichContent from '@/components/RichContent';
import { ErrorState, PageLoader } from '@/components/ui';
import { fmtDateTime } from '@/lib/time';
import { toneClass } from '@/lib/tone';
import { useApi } from '@/lib/useApi';

// Tombol ke latihan soal BAB ini; bila BAB belum punya soal, hanya keterangan.
function PracticeLink({ to, ok, secondary = false }) {
  if (!ok) return <span className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white/70 px-4 text-sm font-semibold text-ink-muted"><PlayCircle size={18} aria-hidden /> Soal latihan BAB ini segera hadir</span>;
  return <Link className={secondary ? 'btn btn-secondary' : 'btn btn-primary btn-press px-5'} to={to}><PlayCircle size={18} aria-hidden /> Latihan soal BAB ini</Link>;
}

function Neighbours({ prev, next, to }) {
  if (!prev && !next) return null;
  return (
    <nav aria-label="BAB lain" className="grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
      {prev ? <Link to={to(prev)} className="card-link flex min-w-0 items-center gap-3 p-4"><ArrowLeft size={18} className="shrink-0 text-brand" aria-hidden /><span className="min-w-0"><span className="meta block">Materi sebelumnya</span><span className="block truncate font-semibold">{prev.title}</span></span></Link> : <span />}
      {next && <Link to={to(next)} className="card-link flex min-w-0 items-center justify-end gap-3 p-4 text-right"><span className="min-w-0"><span className="meta block">Materi berikutnya</span><span className="block truncate font-semibold">{next.title}</span></span><ArrowRight size={18} className="shrink-0 text-brand" aria-hidden /></Link>}
    </nav>
  );
}

export default function SubjectNotes() {
  const { slug, chapterId } = useParams();
  const { data, error, loading, reload } = useApi(`chapters/${encodeURIComponent(chapterId)}/notes`);
  const mascots = useMascotsOn();
  const doc = useMemo(() => (data && isNotesV2(data.content) ? parseNotes(data.content) : null), [data]);
  const back = `/mata-kuliah/${data?.subject?.slug || slug}`;
  useEffect(() => { window.scrollTo({ top: 0 }); }, [chapterId]);

  if (loading) return <PageLoader />;
  if (error) return <div className="mx-auto max-w-3xl space-y-4"><Link to={back} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand"><ArrowLeft size={16} aria-hidden /> Kembali ke daftar BAB</Link><ErrorState onRetry={error.status === 404 ? undefined : reload}>{error.message}</ErrorState></div>;

  const { subject, chapter, content, updated, prev, next, position, total } = data;
  // Server yang belum dimulai ulang belum mengirim `practice`: anggap latihan tersedia.
  const hasPractice = data.practice ? data.practice.total > 0 : true;
  const to = (c) => `/mata-kuliah/${subject.slug}/materi/${c.id}`;
  const practice = `/mata-kuliah/${subject.slug}?bab=${chapter.id}`;
  const cardsTo = `/mata-kuliah/${subject.slug}/flashcard/${chapter.id}`;
  const cards = doc ? doc.cards.length : 0;
  const sections = doc ? doc.sections.filter((s) => s.kind === 'isi' || s.kind === 'klinis').length : 0;

  const backLink = <Link to={back} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand hover:underline"><ArrowLeft size={16} aria-hidden /> {subject.name}</Link>;

  // Catatan lama (tanpa penanda materi:v2): tampilan sederhana seperti sebelumnya.
  if (!doc) {
    return (
      <article className="mx-auto max-w-3xl space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-10">
        {backLink}
        <header className="space-y-2">
          <p className="eyebrow">Pelajari materi{total > 0 ? ` · ${position} dari ${total}` : ''}</p>
          <h1 className="page-title">{chapter.title}</h1>
          {updated && <p className="meta">Diperbarui {fmtDateTime(updated)}</p>}
        </header>
        <div className="card p-5 sm:p-8"><RichContent value={content} className="max-w-[70ch]" marks /></div>
        <MascotTip mascot="kila" mood="happy" size={56}>Sudah selesai membaca? Uji pemahamanmu dengan latihan soal BAB ini, pembahasannya muncul per soal.</MascotTip>
        <div className="flex flex-wrap gap-2">
          <PracticeLink to={practice} ok={hasPractice} />
        </div>
        <Neighbours prev={prev} next={next} to={to} />
      </article>
    );
  }

  return (
    <article className={`${toneClass(subject.slug)} mx-auto max-w-6xl space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-12`}>
      {backLink}

      <header className="notes-hero tone-surface card-chunky">
        <div className="notes-hero-grid">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tag-label sd-tag"><BookOpen size={14} aria-hidden /> Pelajari materi</span>
              {total > 0 && <span className="tag-label bg-white/70 text-ink-muted">Materi {position} dari {total}</span>}
            </div>
            <h1>{chapter.title}</h1>
            <p className="notes-hero-chips" aria-label="Ringkasan materi">
              <span><Clock size={15} aria-hidden /> ±{doc.minutes} menit baca</span>
              <span><Layers size={15} aria-hidden /> {sections} bagian</span>
              {doc.figures > 0 && <span><Images size={15} aria-hidden /> {doc.figures} gambar</span>}
            </p>
            <div className="notes-hero-cta">
              <a href="#mulai" className="btn btn-primary btn-press px-5"><BookOpen size={18} aria-hidden /> Mulai membaca</a>
              {cards > 0 && <Link className="btn btn-secondary" to={cardsTo}><Layers size={18} aria-hidden /> Flashcard</Link>}
              <PracticeLink to={practice} ok={hasPractice} secondary />
            </div>
            {updated && <p className="meta mt-3">Diperbarui {fmtDateTime(updated)}</p>}
          </div>
          {mascots && (
            <div className="notes-hero-art" aria-hidden>
              <Mascot name="kori" mood="wave" size={132} label="" />
              <p className="hand">baca pelan-pelan,<br />nanti kita uji ya!</p>
            </div>
          )}
        </div>
      </header>

      <div id="mulai" className="scroll-mt-24" />
      <NotesView doc={doc} chapterKey={chapter.id} />

      <section aria-label="Selesai membaca" className="notes-end card-chunky tone-surface">
        <MascotTip mascot="kila" mood="cheer" size={72}>{cards > 0
          ? 'Selesai membaca? Hebat! Langkah berikutnya: hafalkan lewat flashcard, lalu uji pemahamanmu dengan latihan soal.'
          : hasPractice ? 'Selesai membaca? Hebat! Sekarang uji pemahamanmu dengan latihan soal BAB ini. Pembahasannya muncul per soal.' : 'Selesai membaca? Hebat! Soal latihan untuk BAB ini sedang disiapkan. Sementara itu, lanjut ke materi berikutnya atau ulangi poin high-yield.'}</MascotTip>
        <div className="flex flex-wrap gap-2">
          {cards > 0 && <Link className="btn btn-primary btn-press px-5" to={cardsTo}><Layers size={18} aria-hidden /> Flashcard ({cards} kartu)</Link>}
          <PracticeLink to={practice} ok={hasPractice} secondary={cards > 0} />
          <a className="btn btn-secondary" href="#mulai" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Baca ulang dari awal</a>
        </div>
      </section>

      <Neighbours prev={prev} next={next} to={to} />
    </article>
  );
}
