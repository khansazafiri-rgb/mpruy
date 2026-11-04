// KAMPUSMU (dulu "Drilling"): file milik kampus pengguna per mata kuliah, yaitu materi (slide PPT dengan penjelasan) dan
// soal tanpa BAB yang khusus kampusnya. Konten General tidak tampil di sini. Memilih mata kuliah membuka halamannya
// (materi + latihan soal). Menu ini hanya muncul bila admin menyalakannya dan kampus pengguna sudah punya materi atau soal.
import clsx from 'clsx';
import { BookOpenText, Crosshair, Layers, School, Star, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import Illustration from '@/components/Illustration';
import MascotTip from '@/components/MascotTip';
import { Alert, EmptyState, PageLoader, ProgressBar } from '@/components/ui';
import { toneClass } from '@/lib/tone';
import { useApi } from '@/lib/useApi';

export default function Drilling() {
  const { data, error, loading } = useApi('drilling');
  const items = data?.subjects || [];
  return (
    <div className="space-y-8">
      <header className="page-head flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="eyebrow mb-3">Milik kampusmu</p>
          <h1 className="page-title">Kampusmu</h1>
          <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-ink-muted">Materi PPT dan soal per mata kuliah yang dikirim teman sekampusmu. Pilih mata kuliah untuk membaca materinya atau langsung berlatih.</p>
        </div>
      </header>
      <Alert>{error?.message}</Alert>
      {data?.preview && <Alert kind="info">Pratinjau admin: menu Kampusmu belum tampil untuk pengguna. Nyalakan sakelarnya dan tayangkan materi atau soal di Admin &gt; Drilling. Admin melihat semua kampus; pengguna hanya melihat milik kampusnya.</Alert>}
      {loading ? <PageLoader /> : !items.length ? (
        <EmptyState icon={Crosshair} title="Belum ada file untuk kampusmu">Materi dan soal dari kampusmu akan muncul di sini setelah dikirim dan ditayangkan. Pastikan kampusmu sudah terisi di Profil.<Link to="/mata-kuliah" className="btn-secondary mt-4 inline-flex">Latihan per BAB</Link></EmptyState>
      ) : (
        <>
          <MascotTip mascot="kori" mood="wave" title="Punya PPT kuliah?">Kirim lewat Chat Admin &gt; Upload soal, pilih “PPT materi”, dan teman sekampusmu bisa ikut belajar dari slide itu.</MascotTip>
          <div className="subject-wall">
            {items.map((s) => {
              const own = (s.campusQuestionCount || 0) + (s.campusDeckCount || 0);
              return (
                <Link key={s.id} to={`/drilling/${s.slug}`} className={clsx('subject-tile card-chunky tone-surface group text-left', toneClass(s.illustrationKey || s.slug))}>
                  {s.studying && <span className="subj-flag"><Star size={12} aria-hidden /> Dipelajari</span>}
                  <span className="sticker-tone subject-tile-art"><Illustration subject={s} className="h-full w-full" /></span>
                  <span className="mt-3.5 flex items-start justify-between gap-2">
                    <span className="font-display text-[18px] font-bold leading-snug text-ink">{s.name}</span>
                    <span className="subject-go" aria-hidden><Zap size={16} /></span>
                  </span>
                  <span className="mt-3 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[rgb(var(--tone-fg))]">
                    <span className="subject-meta"><School size={12} aria-hidden /> {own || data?.kampusOnly ? 'Kampusmu' : 'Semua kampus'}</span>
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-semibold text-ink-muted">
                    {s.deckCount > 0 && <span className="inline-flex items-center gap-1"><BookOpenText size={14} aria-hidden /> <b className="text-ink">{s.deckCount}</b> materi · {s.slideCount} slide</span>}
                    {s.questionCount > 0 && <span className="inline-flex items-center gap-1"><Layers size={14} aria-hidden /> <b className="text-ink">{s.answeredCount || 0}</b>/{s.questionCount} soal</span>}
                  </span>
                  {s.questionCount > 0 && <ProgressBar value={s.answeredCount} max={s.questionCount || 1} className="tone-track mt-2.5 !h-2" color="tone-fill" label={`Progres drilling ${s.name}`} />}
                  <span className="mt-3 text-[13px] font-bold text-brand">Buka</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
