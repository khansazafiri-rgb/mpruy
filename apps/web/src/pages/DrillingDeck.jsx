// Pembaca materi Drilling: satu slide (gambar lh3) dengan penjelasannya di sampingnya (di bawahnya pada layar sempit).
// Panah kiri/kanan berpindah slide; slide terakhir dibuka diingat per berkas di peramban.
import { ArrowLeft, ArrowRight, BookOpenText, ChevronLeft, ChevronRight, ExternalLink, ImageOff, ZoomIn } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import MascotTip from '@/components/MascotTip';
import SlideBlocks from '@/components/SlideBlocks';
import { Alert, EmptyState, Modal, PageLoader } from '@/components/ui';
import { useApi } from '@/lib/useApi';
import '@/styles/deck.css';

const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const keyOf = (id) => `medcoel-deck-${id}`;
const readLast = (id) => { try { return parseInt(localStorage.getItem(keyOf(id)), 10) || 0; } catch { return 0; } };
const saveLast = (id, n) => { try { localStorage.setItem(keyOf(id), String(n)); } catch { /* penyimpanan perangkat tidak tersedia */ } };

// lh3 mengenal ukuran di akhir tautan (=w480); dipakai untuk gambar kecil supaya deretan slide tetap ringan.
export const thumb = (url, w = 480) => (/^https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]+$/.test(url || '') ? `${url}=w${w}` : url);

function Frame({ src, alt, onOpen }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  if (broken) return <div className="deck-frame" style={{ cursor: 'default' }}><span className="deck-broken"><ImageOff size={24} aria-hidden /> Gambar belum bisa dimuat. <a className="font-semibold text-brand underline" href={src} target="_blank" rel="noopener noreferrer">Buka langsung</a></span></div>;
  return (
    <button type="button" className="deck-frame" onClick={onOpen} aria-label={`Perbesar ${alt}`}>
      <img src={thumb(src, 1400)} alt={alt} referrerPolicy="no-referrer" decoding="async" onError={() => setBroken(true)} />
      <span className="deck-zoom"><ZoomIn size={14} aria-hidden /> Perbesar</span>
    </button>
  );
}

export default function DrillingDeck() {
  const { id } = useParams();
  const { hash } = useLocation();
  const { data: deck, error, loading } = useApi(`drilling/deck/${id}`);
  const [index, setIndex] = useState(0);
  const [img, setImg] = useState(0);
  const [zoom, setZoom] = useState(false);
  const total = deck?.slides?.length || 0;

  // Posisi awal: #nomor di alamat, lalu slide terakhir yang dibuka.
  useEffect(() => {
    if (!total) return;
    const fromHash = parseInt(hash.slice(1), 10);
    const start = fromHash >= 1 && fromHash <= total ? fromHash - 1 : Math.min(readLast(id), total - 1);
    setIndex(Math.max(0, start));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, id]);
  useEffect(() => { setImg(0); if (total) saveLast(id, index); }, [index, id, total]);
  useEffect(() => { if (deck) document.title = `${deck.title} | Materi Kampusmu`; }, [deck]);

  const go = useCallback((d) => setIndex((i) => Math.min(total - 1, Math.max(0, i + d))), [total]);
  useEffect(() => {
    const onKey = (e) => {
      if (zoom || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, zoom]);
  // Menggulung deretan slide saja (bukan halaman): slide aktif ke tengah deretan.
  useEffect(() => {
    const strip = document.querySelector('.deck-strip');
    const cur = strip?.querySelector('[aria-current="true"]');
    if (strip && cur) strip.scrollTo({ left: cur.offsetLeft - (strip.clientWidth - cur.clientWidth) / 2, behavior: reduceMotion() ? 'auto' : 'smooth' });
  }, [index, total]);

  const slide = deck?.slides?.[index];
  const back = deck ? `/drilling/${deck.subjectSlug}` : '/drilling';
  const images = slide?.images || [];
  const alt = useMemo(() => `${deck?.title || 'Materi'}, slide ${index + 1} dari ${total}${slide?.title ? `: ${slide.title}` : ''}`, [deck, index, total, slide]);

  if (loading) return <PageLoader />;
  if (error) return <div className="space-y-4"><Alert>{error.status === 404 ? 'Materi ini tidak ditemukan atau bukan milik kampusmu.' : error.message}</Alert><Link to="/drilling" className="btn-secondary inline-flex"><ArrowLeft size={16} aria-hidden /> Kembali ke Kampusmu</Link></div>;
  if (!deck || !total) return <EmptyState icon={BookOpenText} title="Materi ini belum punya slide"><Link to={back} className="btn-secondary mt-4 inline-flex">Kembali</Link></EmptyState>;

  const last = index === total - 1;
  return (
    <div className="space-y-5">
      <header className="page-head flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link to={back} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand"><ArrowLeft size={15} aria-hidden /> {deck.subjectName}</Link>
          <h1 className="page-title mt-2 !text-[28px] sm:!text-[34px]">{deck.title}</h1>
          {deck.description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{deck.description}</p>}
        </div>
        <p className="rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-bold text-brand-dark" aria-live="polite">Slide {index + 1} / {total}</p>
      </header>

      <div className="deck-nav" role="group" aria-label="Navigasi slide">
        <button type="button" className="btn-secondary btn-sm" onClick={() => go(-1)} disabled={index === 0} aria-label="Slide sebelumnya"><ChevronLeft size={16} aria-hidden /> <span className="hidden sm:inline">Sebelumnya</span></button>
        <div className="deck-progress" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1} aria-label="Posisi slide"><span style={{ width: `${((index + 1) / total) * 100}%` }} /></div>
        <button type="button" className="btn-primary btn-sm" onClick={() => go(1)} disabled={last} aria-label="Slide berikutnya"><span className="hidden sm:inline">Berikutnya</span> <ChevronRight size={16} aria-hidden /></button>
      </div>

      <div className="deck-stage">
        <div className="deck-visual">
          {images.length ? (
            <>
              <Frame src={images[img] || images[0]} alt={alt} onOpen={() => setZoom(true)} />
              {images.length > 1 && (
                <div className="deck-extra" role="group" aria-label="Gambar pada slide ini">
                  {images.map((src, i) => <button key={src} type="button" aria-current={i === img} aria-label={`Gambar ${i + 1} dari ${images.length}`} onClick={() => setImg(i)}><img src={thumb(src, 320)} alt="" loading="lazy" referrerPolicy="no-referrer" /></button>)}
                </div>
              )}
            </>
          ) : <div className="deck-explain"><p className="deck-empty-note">Slide ini hanya berisi penjelasan.</p></div>}
        </div>
        <section className="deck-explain" aria-label="Penjelasan slide">
          <p className="deck-explain-head"><BookOpenText size={16} aria-hidden /> {slide.title || 'Penjelasan'}</p>
          {slide.blocks?.length ? <SlideBlocks blocks={slide.blocks} /> : <p className="deck-empty-note">Slide ini belum punya penjelasan.</p>}
        </section>
      </div>

      <div className="deck-strip" role="group" aria-label="Semua slide">
        {deck.slides.map((s, i) => (
          <button key={i} type="button" aria-current={i === index} aria-label={`Slide ${i + 1}${s.title ? `: ${s.title}` : ''}`} onClick={() => setIndex(i)}>
            {s.images?.[0] ? <img src={thumb(s.images[0], 240)} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <span className="deck-thumb-blank">{i + 1}</span>}
            <small>{i + 1}{s.title ? ` · ${s.title.slice(0, 18)}` : ''}</small>
          </button>
        ))}
      </div>

      {last && (
        <MascotTip mascot="kila" mood="cheer" pop title="Materi ini selesai dibaca!">
          Lanjutkan dengan latihan soal mata kuliah ini, atau buka materi lainnya.
          <span className="mt-3 flex flex-wrap gap-2"><Link to={back} className="btn-primary btn-sm">Kembali ke {deck.subjectName} <ArrowRight size={15} aria-hidden /></Link><button type="button" className="btn-secondary btn-sm" onClick={() => setIndex(0)}>Mulai dari awal</button></span>
        </MascotTip>
      )}

      {zoom && images.length > 0 && (
        <Modal open size="xl" title={`Slide ${index + 1} dari ${total}`} onClose={() => setZoom(false)}
          footer={<>
            <button type="button" className="btn-secondary btn-sm" onClick={() => go(-1)} disabled={index === 0}><ChevronLeft size={15} aria-hidden /> Sebelumnya</button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => go(1)} disabled={last}>Berikutnya <ChevronRight size={15} aria-hidden /></button>
            <a className="btn-secondary btn-sm" href={images[img] || images[0]} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} aria-hidden /> Ukuran penuh</a>
          </>}>
          <div className="notes-lightbox"><img src={images[img] || images[0]} alt={alt} referrerPolicy="no-referrer" /></div>
        </Modal>
      )}
    </div>
  );
}
