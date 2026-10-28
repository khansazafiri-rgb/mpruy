// Pembaca catatan materi satu BAB (format "materi:v2", lihat lib/notesMarkup.js).
// Dipakai halaman "Pelajari materi" siswa dan pratinjau penyunting admin, jadi
// yang terlihat admin sama dengan yang dibaca siswa.
//
// Catatan format lama (tanpa penanda) tetap ditampilkan lewat RichContent.
import clsx from 'clsx';
import {
  AlertTriangle, BookMarked, Check, ChevronDown, ExternalLink, ImageOff, Info, Lightbulb, ListChecks,
  ListTree, RotateCcw, Star, Stethoscope, Target, ZoomIn,
} from 'lucide-react';
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import MascotTip from '@/components/MascotTip';
import RichContent, { Html } from '@/components/RichContent';
import { Modal } from '@/components/ui';
import { driveToLh3 } from '@/lib/markup';
import { isNotesV2, parseNotes, tocOf } from '@/lib/notesMarkup';
import '@/styles/notes.css';

export { isNotesV2, parseNotes };

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// Centang "sudah hafal" / "sudah dikenali": tersimpan di peramban per BAB.
// ---------------------------------------------------------------------------
const CheckCtx = createContext(null);

function useChecks(key) {
  const storageKey = key ? `medcoel.materi.centang.${key}` : '';
  const [done, setDone] = useState({});
  useEffect(() => {
    if (!storageKey) { setDone({}); return; }
    try { setDone(JSON.parse(localStorage.getItem(storageKey) || '{}') || {}); } catch { setDone({}); }
  }, [storageKey]);
  const save = useCallback((next) => {
    setDone(next);
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* penyimpanan dimatikan: centang hanya berlaku di halaman ini */ }
  }, [storageKey]);
  const toggle = useCallback((id) => save({ ...done, [id]: !done[id] || undefined }), [done, save]);
  const clear = useCallback((prefix) => {
    const next = {};
    Object.keys(done).forEach((k) => { if (!k.startsWith(prefix)) next[k] = done[k]; });
    save(next);
  }, [done, save]);
  return { done, toggle, clear };
}

// ---------------------------------------------------------------------------
// Blok isi
// ---------------------------------------------------------------------------
function Inline({ text, as = 'span', className }) {
  return <Html as={as} text={text} marks className={className} />;
}

function Figure({ fig }) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const [ready, setReady] = useState(false);
  const src = driveToLh3(fig.url);
  const credit = fig.credit.replace(/^Sumber\s*:\s*/i, '');
  return (
    <figure className="notes-fig">
      <button type="button" className={clsx('notes-fig-frame', (ready || broken) && 'is-ready')} onClick={() => setOpen(true)} aria-label={`Perbesar gambar ${fig.n}`}>
        {broken ? (
          <span className="notes-fig-broken"><ImageOff size={22} aria-hidden /> Gambar belum bisa dimuat. Ketuk untuk mencoba membukanya.</span>
        ) : (
          <img src={src} alt={`Gambar ${fig.n}. ${fig.caption}`} loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={() => setReady(true)} onError={() => setBroken(true)} />
        )}
        {!broken && <span className="notes-fig-zoom"><ZoomIn size={15} aria-hidden /> Perbesar</span>}
      </button>
      <figcaption>
        <span className="notes-fig-n">Gambar {fig.n}</span>
        <Inline as="span" text={fig.caption} className="notes-fig-cap" />
        {credit && <span className="notes-fig-credit"><Info size={13} aria-hidden /> Sumber: {credit}</span>}
      </figcaption>
      {open && (
        <Modal open size="xl" title={`Gambar ${fig.n}`} onClose={() => setOpen(false)}
          footer={<a className="btn-secondary btn-sm" href={src} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} aria-hidden /> Buka ukuran penuh</a>}>
          <div className="notes-lightbox">
            {broken ? <p className="text-sm text-ink-muted">Gambar belum bisa dimuat.</p> : <img src={src} alt={`Gambar ${fig.n}. ${fig.caption}`} referrerPolicy="no-referrer" />}
            <p className="mt-3 text-[15px] leading-relaxed"><Inline text={fig.caption} /></p>
            {credit && <p className="meta mt-1">Sumber: {credit}</p>}
          </div>
        </Modal>
      )}
    </figure>
  );
}

function ListBlock({ block, scope, checkable }) {
  const checks = useContext(CheckCtx);
  if (checkable && checks) {
    return (
      <ul className="notes-checklist">
        {block.items.map((it, i) => {
          const id = `${scope}.${i}`;
          const on = !!checks.done[id];
          return (
            <li key={id} className={clsx(on && 'is-done')}>
              <label>
                <input type="checkbox" checked={on} onChange={() => checks.toggle(id)} />
                <span className="notes-check-box" aria-hidden><Check size={14} strokeWidth={3} /></span>
                <Inline text={it} className="notes-check-text" />
              </label>
            </li>
          );
        })}
      </ul>
    );
  }
  const Tag = block.ordered ? 'ol' : 'ul';
  return <Tag className={block.ordered ? 'notes-ol' : 'notes-ul'}>{block.items.map((it, i) => <li key={i}><Inline text={it} /></li>)}</Tag>;
}

const CALLOUT = {
  klinis: { icon: Stethoscope, title: 'Korelasi klinis' },
  warning: { icon: AlertTriangle, title: 'Jebakan ujian' },
  highyield: { icon: Star, title: 'High-yield' },
  tip: { icon: Lightbulb, title: 'Tips mengingat' },
  info: { icon: Info, title: 'Catatan' },
};

function Callout({ block, scope }) {
  const c = CALLOUT[block.variant] || CALLOUT.info;
  const Icon = c.icon;
  return (
    <aside className={clsx('notes-callout', `is-${block.variant}`)}>
      <p className="notes-callout-head"><span className="notes-callout-ico"><Icon size={16} aria-hidden /></span>{block.title || c.title}</p>
      <div className="notes-callout-body">
        {block.blocks.map((b, i) => (b.type === 'list' ? <ListBlock key={i} block={b} scope={`${scope}.${i}`} /> : <Inline key={i} as="p" text={b.text} />))}
      </div>
    </aside>
  );
}

function Blocks({ blocks, scope, checkable }) {
  return blocks.map((b, i) => {
    switch (b.type) {
      case 'h3': return <h3 key={i} id={b.id} className="notes-h3"><Inline text={b.text} /></h3>;
      case 'p': return <Inline key={i} as="p" text={b.text} className={clsx(/:$/.test(b.text) && blocks[i + 1]?.type === 'list' && 'notes-lead')} />;
      case 'list': return <ListBlock key={i} block={b} scope={`${scope}.${i}`} checkable={checkable} />;
      case 'figure': return <Figure key={i} fig={b} />;
      case 'callout': return <Callout key={i} block={b} scope={`${scope}.${i}`} />;
      default: return null;
    }
  });
}

// ---------------------------------------------------------------------------
// Bagian
// ---------------------------------------------------------------------------
function countChecks(section) {
  let total = 0;
  section.blocks.forEach((b) => { if (b.type === 'list') total += b.items.length; });
  return total;
}

function CheckHeader({ section, noun }) {
  const checks = useContext(CheckCtx);
  const total = countChecks(section);
  const n = Object.keys(checks?.done || {}).filter((k) => k.startsWith(`${section.id}.`)).length;
  if (!total || !checks) return null;
  return (
    <div className="notes-check-meter">
      <div className="notes-check-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={n} aria-label={`${noun}: ${n} dari ${total}`}><span style={{ width: `${(n / total) * 100}%` }} /></div>
      <p><b>{n}</b>/{total} {noun}</p>
      {n > 0 && <button type="button" className="notes-reset" onClick={() => checks.clear(`${section.id}.`)}><RotateCcw size={13} aria-hidden /> Ulangi</button>}
    </div>
  );
}

// memo: gulir dan centang tidak perlu menyaring ulang ratusan paragraf.
const Section = memo(function Section({ s }) {
  if (s.kind === 'tujuan') {
    return (
      <section id={s.id} data-sec className="notes-goals">
        <h2 className="notes-goals-title"><span className="notes-badge"><Target size={18} aria-hidden /></span> {s.title}</h2>
        <GoalBlocks blocks={s.blocks} />
      </section>
    );
  }
  if (s.kind === 'highyield') {
    return (
      <section id={s.id} data-sec className="notes-hy">
        <header className="notes-hy-head">
          <h2><span className="notes-badge is-gold"><Star size={18} aria-hidden /></span> <Inline text={s.title} /></h2>
          <CheckHeader section={s} noun="sudah hafal" />
        </header>
        <Blocks blocks={s.blocks} scope={s.id} checkable />
      </section>
    );
  }
  if (s.kind === 'praktikum') {
    return (
      <section id={s.id} data-sec className="notes-lab">
        <header className="notes-hy-head">
          <h2><span className="notes-badge is-sky"><ListChecks size={18} aria-hidden /></span> <Inline text={s.title} /></h2>
          <CheckHeader section={s} noun="sudah dikenali" />
        </header>
        <Blocks blocks={s.blocks} scope={s.id} checkable />
      </section>
    );
  }
  if (s.kind === 'sumber') {
    return (
      <section id={s.id} data-sec className="notes-src-wrap">
        <details className="notes-src">
          <summary><span className="notes-badge is-quiet"><BookMarked size={16} aria-hidden /></span><span className="min-w-0 flex-1"><b>Sumber &amp; atribusi gambar</b><small>Buku rujukan dan lisensi tiap gambar</small></span><ChevronDown className="notes-src-chev" size={20} aria-hidden /></summary>
          <div className="notes-src-body"><Blocks blocks={s.blocks} scope={s.id} /></div>
        </details>
      </section>
    );
  }
  const klinis = s.kind === 'klinis';
  return (
    <section id={s.id} data-sec className={clsx('notes-sec', klinis && 'is-klinis')}>
      {s.title && (
        <header className="notes-sec-head">
          {klinis ? <span className="notes-num is-klinis" aria-hidden><Stethoscope size={19} /></span> : <span className="notes-num" aria-hidden>{String(s.number ?? '').padStart(2, '0')}</span>}
          <h2><Inline text={s.title} /></h2>
        </header>
      )}
      <div className="notes-sec-body"><Blocks blocks={s.blocks} scope={s.id} /></div>
    </section>
  );
});

// Tujuan belajar: kalimat pengantar + butir bercentang hiasan.
function GoalBlocks({ blocks }) {
  return blocks.map((b, i) => {
    if (b.type === 'list') return <ul key={i} className="notes-goal-list">{b.items.map((it, j) => <li key={j}><span className="notes-goal-check" aria-hidden><Check size={13} strokeWidth={3} /></span><Inline text={it} className="min-w-0" /></li>)}</ul>;
    if (b.type === 'p') return <Inline key={i} as="p" text={b.text} className="notes-goal-lead" />;
    return null;
  });
}

// ---------------------------------------------------------------------------
// Daftar isi, bagian aktif, dan progres baca
// ---------------------------------------------------------------------------
function useActive(ids) {
  const [active, setActive] = useState(ids[0] || '');
  useEffect(() => {
    if (!ids.length || typeof IntersectionObserver === 'undefined') return undefined;
    const visible = new Set();
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id)));
      const first = ids.find((id) => visible.has(id));
      if (first) setActive(first);
    }, { rootMargin: '-110px 0px -55% 0px' });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [ids]);
  return [active, setActive];
}

// Loncat ke bagian. Gambar yang dimuat setelah menggulir bisa menggeser letak bagian,
// jadi posisinya diperiksa lagi sebentar kemudian dan dibetulkan bila meleset.
function jumpTo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const far = Math.abs(el.getBoundingClientRect().top) > window.innerHeight * 1.5;
  el.scrollIntoView({ behavior: reduceMotion() || far ? 'auto' : 'smooth', block: 'start' });
  const fix = () => {
    const target = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    if (Math.abs(el.getBoundingClientRect().top - target) > 24) el.scrollIntoView({ behavior: 'auto', block: 'start' });
  };
  setTimeout(fix, 700);
  setTimeout(fix, 1500);
}

function TocList({ toc, active, onPick }) {
  return (
    <ol className="notes-toc-list">
      {toc.map((t) => {
        if (t.type === 'part') return <li key={t.id} className="notes-toc-part">{t.label && <small>{t.label}</small>}{t.title}</li>;
        const on = t.id === active;
        const special = t.kind !== 'isi' && t.kind !== 'klinis';
        return (
          <li key={t.id}>
            <button type="button" onClick={() => onPick(t.id)} className={clsx('notes-toc-item', on && 'is-active', special && 'is-special')} aria-current={on ? 'true' : undefined}>
              <span className="notes-toc-n">{t.number ?? (t.kind === 'highyield' ? <Star size={12} aria-hidden /> : t.kind === 'tujuan' ? <Target size={12} aria-hidden /> : t.kind === 'praktikum' ? <ListChecks size={12} aria-hidden /> : t.kind === 'sumber' ? <BookMarked size={12} aria-hidden /> : '•')}</span>
              <span className="min-w-0">{t.kind === 'sumber' ? 'Sumber & atribusi' : stripTitle(t.title)}</span>
            </button>
            {on && t.subs.length > 1 && (
              <ul className="notes-toc-subs">{t.subs.map((s) => <li key={s.id}><button type="button" onClick={() => onPick(s.id)}>{stripTitle(s.title)}</button></li>)}</ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const stripTitle = (s) => String(s || '').replace(/\*\*|==|[*~^]/g, '');

// ---------------------------------------------------------------------------
// Pembaca utama
// ---------------------------------------------------------------------------
const MID = 'Sudah separuh jalan. Tarik napas sebentar, lalu lanjut. Mengulang pelan-pelan lebih awet daripada ngebut.';

export function NotesView({ doc, chapterKey, className }) {
  const shell = useRef(null);
  const checks = useChecks(chapterKey);
  const toc = useMemo(() => tocOf(doc), [doc]);
  const ids = useMemo(() => doc.sections.map((s) => s.id), [doc]);
  const [active, setActive] = useActive(ids);
  const [tocOpen, setTocOpen] = useState(false);
  const activeSec = doc.sections.find((s) => s.id === active) || doc.sections[0];

  // Daftar isi panjang (mis. 50 bagian): gulirkan daftar itu sendiri agar bagian aktif selalu terlihat.
  useEffect(() => {
    const box = shell.current?.querySelector('.notes-toc-scroll');
    const item = box?.querySelector('.notes-toc-item.is-active');
    if (!box || !item || box.offsetParent === null) return;
    const b = box.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    if (r.top < b.top + 8 || r.bottom > b.bottom - 8) box.scrollTop += r.top - b.top - b.height / 3;
  }, [active]);

  // Progres baca: lebar garis diatur lewat variabel CSS agar tidak merender ulang tiap gulir.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = shell.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight * 0.6;
      const p = span > 0 ? Math.min(1, Math.max(0, (-r.top + 80) / span)) : 1;
      el.style.setProperty('--notes-progress', p.toFixed(3));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [doc]);

  const pick = (id) => { setTocOpen(false); setActive(id); setTimeout(() => jumpTo(id), tocOpen ? 180 : 0); };

  // Tempat maskot menyapa di sela bacaan.
  const numbered = doc.sections.filter((s) => s.number != null);
  const midSec = numbered.length >= 8 ? numbered[Math.floor(numbered.length / 2) - 1] : null;
  const firstHy = doc.sections.find((s) => s.kind === 'highyield');
  const firstLab = doc.sections.find((s) => s.kind === 'praktikum');
  const after = (s) => {
    if (s.kind === 'tujuan') return <MascotTip mascot="kori" mood="wave" size={64} className="notes-mascot">Baca tujuan belajar ini dulu. Selesai membaca, kembali ke sini dan cek: apa kamu sudah bisa semuanya?</MascotTip>;
    if (midSec && s.id === midSec.id) return <MascotTip mascot="nilo" mood="idle" size={64} className="notes-mascot">{MID}</MascotTip>;
    return null;
  };
  const before = (s) => {
    if (firstHy && s.id === firstHy.id) return <MascotTip mascot="kila" mood="happy" size={64} className="notes-mascot">Nah, ini inti yang paling sering keluar di ujian. Centang poin yang sudah kamu hafal, sisanya diulang besok.</MascotTip>;
    if (firstLab && s.id === firstLab.id) return <MascotTip mascot="nilo" mood="think" size={64} className="notes-mascot">Waktunya uji diri. Sebut nama strukturnya dalam hati dulu, baru centang.</MascotTip>;
    return null;
  };

  return (
    <CheckCtx.Provider value={checks}>
      <div ref={shell} className={clsx('notes-shell', className)}>
        <aside className="notes-toc" aria-label="Daftar isi">
          <p className="notes-toc-title"><ListTree size={15} aria-hidden /> Daftar isi</p>
          <div className="notes-toc-scroll"><TocList toc={toc} active={active} onPick={pick} /></div>
          <div className="notes-progress-box" aria-hidden>
            <span>Dibaca</span><i><b /></i>
          </div>
        </aside>

        <div className="notes-flow">
          <div className="notes-jump">
            <button type="button" onClick={() => setTocOpen(true)} aria-haspopup="dialog">
              <ListTree size={16} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{activeSec?.number ? `${activeSec.number}. ` : ''}{stripTitle(activeSec?.kind === 'sumber' ? 'Sumber & atribusi' : activeSec?.title) || 'Daftar isi'}</span>
              <ChevronDown size={16} aria-hidden />
            </button>
            <i aria-hidden><b /></i>
          </div>

          {doc.items.map((it) => {
            if (it.type === 'part') {
              return (
                <div key={it.id} id={it.id} className="notes-part">
                  {it.label && <small>{it.label}</small>}
                  <h2>{it.title}</h2>
                </div>
              );
            }
            return (
              <div key={it.id} className="notes-item">
                {before(it)}
                <Section s={it} />
                {after(it)}
              </div>
            );
          })}
        </div>

        {tocOpen && (
          <Modal open size="md" title="Daftar isi" onClose={() => setTocOpen(false)}>
            <TocList toc={toc} active={active} onPick={pick} />
          </Modal>
        )}
      </div>
    </CheckCtx.Provider>
  );
}

/** Pratinjau/penampil dari teks mentah (format v2 atau lama). */
export default function ChapterNotes({ content, chapterKey, className }) {
  const doc = useMemo(() => (isNotesV2(content) ? parseNotes(content) : null), [content]);
  if (!doc) return <RichContent value={content} className="max-w-[70ch]" marks />;
  return <NotesView doc={doc} chapterKey={chapterKey} className={className} />;
}
