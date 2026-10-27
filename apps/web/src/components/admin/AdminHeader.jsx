// Kepala halaman admin: judul, satu kalimat "apa ini dan apa yang perlu dilakukan", lalu tindakan utama.
export default function AdminHeader({ title, children, actions }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {children && <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-ink-muted">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
