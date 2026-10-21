// Kepala halaman: label kecil, judul, keterangan, catatan tulisan tangan, tombol.
export default function PageHead({ eyebrow, title, children, note, actions }) {
  return (
    <header className="page-head flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {children && <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-ink-muted">{children}</p>}
        {note && <p className="hand page-head-note" aria-hidden>{note}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
