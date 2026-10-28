// "Flashcard": kartu hafalan satu BAB, dibaca dari bagian {kartu} pada catatan materi.
// Urutan belajar yang disarankan: materi -> flashcard -> latihan soal.
import { ArrowLeft, BookOpen, Layers, PlayCircle, RotateCcw } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import FlashcardDeck from '@/components/FlashcardDeck';
import Mascot from '@/components/Mascot';
import MascotTip, { useMascotsOn } from '@/components/MascotTip';
import { EmptyState, ErrorState, PageLoader } from '@/components/ui';
import { isNotesV2, parseNotes } from '@/lib/notesMarkup';
import { toneClass } from '@/lib/tone';
import { useApi } from '@/lib/useApi';
import '@/styles/cards.css';

export default function SubjectCards() {
  const { slug, chapterId } = useParams();
  const { data, error, loading, reload } = useApi(`chapters/${encodeURIComponent(chapterId)}/notes`);
  const mascots = useMascotsOn();
  const cards = useMemo(() => (data && isNotesV2(data.content) ? parseNotes(data.content).cards : []), [data]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [chapterId]);
  const back = `/mata-kuliah/${data?.subject?.slug || slug}`;

  if (loading) return <PageLoader />;
  if (error) return <div className="mx-auto max-w-3xl space-y-4"><Link to={back} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand"><ArrowLeft size={16} aria-hidden /> Kembali ke daftar BAB</Link><ErrorState onRetry={error.status === 404 ? undefined : reload}>{error.message}</ErrorState></div>;

  const { subject, chapter } = data;
  const notes = `/mata-kuliah/${subject.slug}/materi/${chapter.id}`;
  const practice = `/mata-kuliah/${subject.slug}?bab=${chapter.id}`;
  const hasPractice = data.practice ? data.practice.total > 0 : true;

  return (
    <div className={`${toneClass(subject.slug)} mx-auto max-w-3xl space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-12`}>
      <Link to={back} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-brand hover:underline"><ArrowLeft size={16} aria-hidden /> {subject.name}</Link>

      <header className="fc-head tone-surface card-chunky">
        <div className="min-w-0">
          <span className="tag-label sd-tag"><Layers size={14} aria-hidden /> Flashcard</span>
          <h1>{chapter.title}</h1>
          <p className="meta mt-2">{cards.length} kartu. Coba jawab dalam hati dulu, baru balik kartunya.</p>
        </div>
        {mascots && <Mascot name="kori" mood="think" size={84} label="" className="fc-head-mascot" />}
      </header>

      {cards.length === 0 ? (
        <EmptyState icon={Layers} title="Flashcard BAB ini segera hadir" action={<Link className="btn btn-primary" to={notes}><BookOpen size={17} aria-hidden /> Baca materinya dulu</Link>}>
          Admin sedang menyiapkan kartunya. Sementara itu, baca materinya atau langsung latihan soal.
        </EmptyState>
      ) : (
        <FlashcardDeck
          cards={cards}
          chapterKey={chapter.id}
          finish={({ restart }) => (
            <section className="fc-done card-chunky tone-surface" aria-live="polite">
              <MascotTip mascot="kila" mood="cheer" size={84} className="max-w-xl">Mantap! Semua {cards.length} kartu sudah kamu hafal. Sekarang uji dengan latihan soal supaya ingatannya makin kuat.</MascotTip>
              <div className="flex flex-wrap gap-2">
                {hasPractice
                  ? <Link className="btn btn-primary btn-press px-5" to={practice}><PlayCircle size={18} aria-hidden /> Latihan soal BAB ini</Link>
                  : <span className="inline-flex min-h-[44px] items-center rounded-xl bg-white/70 px-4 text-sm font-semibold text-ink-muted">Soal latihan BAB ini segera hadir</span>}
                <button type="button" className="btn btn-secondary" onClick={restart}><RotateCcw size={17} aria-hidden /> Ulangi semua kartu</button>
                <Link className="btn btn-secondary" to={notes}><BookOpen size={17} aria-hidden /> Kembali ke materi</Link>
              </div>
            </section>
          )}
        />
      )}

      {cards.length > 0 && (
        <nav aria-label="Langkah belajar" className="fc-steps">
          <Link to={notes}><BookOpen size={16} aria-hidden /> Materi</Link>
          <span aria-current="step"><Layers size={16} aria-hidden /> Flashcard</span>
          {hasPractice ? <Link to={practice}><PlayCircle size={16} aria-hidden /> Latihan soal</Link> : <span className="is-off"><PlayCircle size={16} aria-hidden /> Latihan soal</span>}
        </nav>
      )}
    </div>
  );
}
