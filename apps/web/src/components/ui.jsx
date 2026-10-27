// Komponen tampilan dasar.
import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Mascot from './Mascot';
import { useMascotsOn } from './MascotTip';

export function Spinner({ className = '', label = 'Memuat' }) {
  return (
    <span role="status" className={clsx('inline-flex items-center gap-2 text-ink-muted', className)}>
      <Loader2 className="animate-spin" size={18} aria-hidden />
      <span className="text-sm">{label}...</span>
    </span>
  );
}

export function PageLoader() {
  const mascots = useMascotsOn();
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2">
      {mascots && <Mascot name="kori" mood="think" size={64} label="" />}
      <Spinner />
    </div>
  );
}

export function Alert({ kind = 'error', children, className = '' }) {
  if (!children) return null;
  const styles = {
    error: 'bg-coral-soft text-coral border-coral/30',
    success: 'bg-brand-soft text-brand-dark border-brand/30',
    info: 'bg-academic-soft text-academic border-academic/30',
    warn: 'bg-gold-soft text-[#6b4f00] border-gold/50',
  };
  const Icon = kind === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={clsx('flex gap-2 rounded-xl border px-3.5 py-3 text-sm', styles[kind], className)}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Field({ label, htmlFor, hint, error, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label htmlFor={htmlFor} className="label">{label}</label>}
      {children}
      {error ? <p className="mt-1 text-[13px] font-medium text-coral">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function Badge({ className = '', children }) {
  return <span className={clsx('chip', className)}>{children}</span>;
}

// Keadaan kosong: penjelasan singkat + langkah berikutnya. Maskot opsional (mascot={false} untuk ikon saja).
export function EmptyState({ icon: Icon, title, children, action, mascot = 'kori', mood = 'think' }) {
  const mascots = useMascotsOn() && mascot;
  return (
    <div className="empty-state card flex flex-col items-center px-6 py-8 text-center">
      {mascots ? <Mascot name={mascot} mood={mood} size={80} className="mb-2" label="" /> : Icon && <div className="empty-icon tone-sun mb-3"><Icon size={26} aria-hidden /></div>}
      <h3 className="card-title">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm leading-relaxed text-ink-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Galat yang bisa dipulihkan: pesan manusiawi + tombol coba lagi.
export function ErrorState({ children, onRetry, retryLabel = 'Coba lagi', className = '' }) {
  return (
    <div className={clsx('space-y-3', className)}>
      <Alert kind="error">{children}</Alert>
      {onRetry && <button type="button" className="btn btn-secondary" onClick={onRetry}>{retryLabel}</button>}
    </div>
  );
}

// Penanda tempat saat memuat: tinggi tetap supaya halaman tidak melompat.
export function Skeleton({ className = '' }) {
  return <div aria-hidden className={clsx('animate-pulse rounded-xl bg-line/70', className)} />;
}
export function CardSkeleton({ rows = 3, className = '' }) {
  return (
    <div role="status" aria-label="Memuat" className={clsx('card space-y-3 p-4', className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-5 w-3/4" />
      {Array.from({ length: rows - 2 > 0 ? rows - 2 : 1 }, (_, i) => <Skeleton key={i} className="h-3 w-full" />)}
    </div>
  );
}

// Kepala bagian: judul + keterangan singkat + tindakan di kanan. Dipakai di mana pun ada bagian bertajuk.
export function SectionHeader({ title, children, action, level = 2, className = '' }) {
  const H = `h${level}`;
  return (
    <div className={clsx('flex flex-wrap items-end justify-between gap-x-4 gap-y-1', className)}>
      <div className="min-w-0">
        <H className="section-title">{title}</H>
        {children && <p className="meta mt-0.5 max-w-prose">{children}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// Pilihan mode berdampingan (Explore/Guided, Belajar/Latihan). Satu pola untuk semua.
export function Segmented({ items, value, onChange, label, className = '' }) {
  return (
    <div role="tablist" aria-label={label} className={clsx('segmented', className)}>
      {items.map((it) => (
        <button key={it.value} type="button" role="tab" aria-selected={value === it.value} className="segmented-item" onClick={() => onChange(it.value)}>{it.label}</button>
      ))}
    </div>
  );
}

export function ProgressBar({ value, max = 100, color = 'bg-brand', className = '', label }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={clsx('progress-track h-1.5 w-full overflow-hidden rounded-full bg-line/70', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Modal. dismissable=false: hanya bisa ditutup lewat tombol silang
// (dipakai pengumuman pop-up: tidak tertutup klik di luar atau Escape).
export function Modal({ open, onClose, title, children, footer, size = 'md', dismissable = true, labelledBy }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [present, setPresent] = useState(open);
  const [closing, setClosing] = useState(false);
  const id = useId();
  const titleId = labelledBy || `modal-${id}`;

  useEffect(() => {
    if (open) { setPresent(true); setClosing(false); return undefined; }
    setClosing(true);
    const timer = setTimeout(() => setPresent(false), 160);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!present) return undefined;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const app = document.getElementById('root');
    const wasInert = app?.inert;
    document.body.style.overflow = 'hidden';
    if (app) app.inert = true;
    const focusable = () => [...(ref.current?.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || [])].filter((el) => el.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => (focusable()[0] || ref.current)?.focus());
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); if (dismissable) closeRef.current?.(); }
      if (e.key !== 'Tab') return;
      const nodes = focusable();
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first) { e.preventDefault(); ref.current?.focus(); }
      else if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (app) app.inert = wasInert;
      if (previous?.isConnected) previous.focus?.();
    };
  }, [present, dismissable]);

  if (!present) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return createPortal(
    <div className={clsx('modal-overlay fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-5', closing && 'is-closing')} onMouseDown={(e) => { if (dismissable && e.target === e.currentTarget) closeRef.current?.(); }}>
      <div ref={ref} role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby={titleId} className={clsx('modal-panel flex max-h-[90dvh] w-full flex-col bg-surface outline-none', widths[size])}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <h2 id={titleId} className="section-title">{title}</h2>
          {onClose && <button type="button" onClick={onClose} className="btn-icon -mr-2 -mt-1 rounded-full" aria-label="Tutup"><X size={18} /></button>}
        </div>
        <div className="modal-body overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="modal-footer flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>, document.body,
  );
}

export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div role="tablist" className={clsx('ui-tabs flex gap-1 overflow-x-auto rounded-xl bg-page p-1', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={clsx('ui-tab whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
            value === t.value ? 'bg-surface text-brand shadow-card' : 'text-ink-muted hover:text-ink')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// tone (opsional): mint, sky, lilac, peach, sun, rose — kartu berwarna "tebal".
export function Stat({ label, value, sub, accent = 'text-brand', tone, icon: Icon }) {
  if (tone) {
    return (
      <div className={clsx('stat-tone card-chunky tone-surface p-4', `tone-${tone}`)}>
        <p className="flex items-center gap-2 text-[13px] font-bold text-[rgb(var(--tone-fg))]">{Icon && <span className="stat-tone-icon"><Icon size={16} aria-hidden /></span>}{label}</p>
        <p className="mt-2 font-display text-[30px] font-extrabold leading-none tracking-tight text-ink">{value}</p>
        {sub && <p className="mt-1.5 text-[13px] font-medium text-[rgb(var(--tone-fg))]">{sub}</p>}
      </div>
    );
  }
  return (
    <div className="card p-4">
      <p className="text-[13px] font-semibold text-ink-muted">{label}</p>
      <p className={clsx('mt-1 font-display text-2xl font-bold', accent)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}
