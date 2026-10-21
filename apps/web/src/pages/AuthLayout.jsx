import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';

export default function AuthLayout({ title, subtitle, children, wide = false }) {
  return (
    <div className="min-h-screen bg-page">
      <header className="mx-auto flex max-w-6xl items-center px-4 py-4">
        <Link to="/" aria-label="Kembali ke halaman utama"><Logo /></Link>
      </header>
      <main className={`mx-auto px-4 pb-16 pt-4 ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <h1 className="font-display text-[28px] font-bold leading-tight md:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-ink-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
