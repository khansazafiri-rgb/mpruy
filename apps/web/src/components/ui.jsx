// Komponen tampilan dasar.
import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

export function Spinner({ className = '', label = 'Memuat' }) {
  return (
    <span role="status" className={clsx('inline-flex items-center gap-2 text-ink-muted', className)}>
      <Loader2 className="animate-spin" size={18} aria-hidden />
      <span className="text-sm">{label}...</span>
    </span>
  );
}

export function PageLoader() {
  return <div className="flex min-h-[40vh] items-center justify-center"><Spinner /></div>;
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

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      {Icon && <div className="mb-3 rounded-2xl bg-brand-soft p-3 text-brand"><Icon size={28} aria-hidden /></div>}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-ink-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, max = 100, color = 'bg-brand', className = '', label }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={clsx('h-2 w-full overflow-hidden rounded-full bg-line/70', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Modal. dismissable=false: hanya bisa ditutup lewat tombol silang
// (dipakai pengumuman pop-up: tidak tertutup klik di luar atau Escape).
export function Modal({ open, onClose, title, children, footer, size = 'md', dismissable = true, labelledBy }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape' && dismissable) onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector('button, [href], input, select, textarea')?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, dismissable, onClose]);
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  const titleId = labelledBy || 'modal-title';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (dismissable && e.target === e.currentTarget) onClose?.(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={clsx('flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-surface shadow-pop sm:rounded-2xl', widths[size])}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <h2 id={titleId} className="font-display text-lg font-semibold">{title}</h2>
          {onClose && (
            <button type="button" onClick={onClose} className="-m-1 rounded-lg p-1 text-ink-muted hover:bg-page hover:text-ink" aria-label="Tutup">
              <X size={20} />
            </button>
          )}
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div role="tablist" className={clsx('flex gap-1 overflow-x-auto rounded-xl bg-page p-1', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={clsx('whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
            value === t.value ? 'bg-surface text-brand shadow-card' : 'text-ink-muted hover:text-ink')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub, accent = 'text-brand' }) {
  return (
    <div className="card p-4">
      <p className="text-[13px] font-semibold text-ink-muted">{label}</p>
      <p className={clsx('mt-1 font-display text-2xl font-bold', accent)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}
