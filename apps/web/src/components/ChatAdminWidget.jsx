// Chat Admin yang selalu ada di pojok kanan bawah setiap halaman (setelah
// masuk), jadi pengguna tidak perlu pindah halaman. Halaman /chat-admin tetap
// ada untuk tampilan penuh.
//
// Panel tetap terpasang saat ditutup (hanya disembunyikan), supaya percakapan
// atau unggahan yang sedang berjalan tidak hilang ketika pengguna pindah
// halaman atau menutup panel sebentar.
import clsx from 'clsx';
import { Maximize2, MessageCircle, X } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Spinner } from './ui';

// Isi chat baru dimuat saat panel pertama kali dibuka.
const ChatAdminBody = lazy(() => import('@/pages/ChatAdmin').then((m) => ({ default: m.ChatAdminBody })));

export default function ChatAdminWidget() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panel = useRef(null);
  const button = useRef(null);
  const { pathname } = useLocation();
  const onPage = pathname.startsWith('/chat-admin');

  useEffect(() => { if (open) setMounted(true); }, [open]);
  useEffect(() => { if (onPage) setOpen(false); }, [onPage]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('keydown', onKey);
    setTimeout(() => panel.current?.querySelector('button, a, input')?.focus(), 30);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (onPage) return null;

  return (
    <>
      {mounted && (
        <section
          ref={panel}
          id="chat-admin-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Chat Admin"
          className={clsx(
            open ? 'flex' : 'hidden',
            'fixed z-50 flex-col overflow-hidden bg-page shadow-pop',
            // HP: layar penuh di atas navigasi bawah. Laptop: panel di pojok kanan bawah.
            'inset-x-0 bottom-0 top-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(640px,calc(100vh-8rem))] sm:w-[400px] sm:rounded-2xl sm:border sm:border-line',
          )}
        >
          <header className="flex items-center gap-2 bg-brand px-4 py-3 text-white">
            <MessageCircle size={20} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold leading-tight text-white">Chat Admin</p>
              <p className="text-xs text-white/80">Upload soal, cek pengajuan, atau hubungi admin</p>
            </div>
            <Link to="/chat-admin" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/15" aria-label="Buka Chat Admin di halaman penuh" title="Halaman penuh">
              <Maximize2 size={18} />
            </Link>
            <button type="button" onClick={() => { setOpen(false); button.current?.focus(); }} className="rounded-lg p-2 hover:bg-white/15" aria-label="Tutup Chat Admin">
              <X size={20} />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <Suspense fallback={<Spinner />}><ChatAdminBody compact /></Suspense>
          </div>
        </section>
      )}
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="chat-admin-panel"
        aria-label={open ? 'Tutup Chat Admin' : 'Buka Chat Admin'}
        className={clsx(
          'fixed right-4 z-50 flex items-center gap-2 rounded-full bg-brand px-4 py-3 font-semibold text-white shadow-pop transition hover:bg-brand-dark',
          // Di HP berada di atas navigasi bawah; saat panel layar penuh terbuka, tombolnya disembunyikan.
          'bottom-20 lg:bottom-6 sm:right-6',
          open && 'max-sm:hidden',
        )}
      >
        {open ? <X size={20} aria-hidden /> : <MessageCircle size={20} aria-hidden />}
        <span className="hidden sm:inline">{open ? 'Tutup' : 'Chat Admin'}</span>
      </button>
    </>
  );
}
