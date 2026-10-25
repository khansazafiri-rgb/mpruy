// Chat Admin yang selalu ada di pojok kanan bawah setiap halaman (setelah
// masuk), jadi pengguna tidak perlu pindah halaman. Halaman /chat-admin tetap
// ada untuk tampilan penuh.
//
// Panel tetap terpasang saat ditutup (hanya disembunyikan). Keadaan percakapan
// dan unggahan ada di lib/chatStore, jadi tetap lanjut ketika panel diperbesar
// ke halaman /chat-admin (panel dilepas di sana supaya tidak ada dua salinan
// yang bekerja bersamaan) dan saat pengguna kembali.
import '@/styles/chat.css';
import clsx from 'clsx';
import { Maximize2, MessageCircle, X } from 'lucide-react';
import Mascot from '@/components/Mascot';
import { useMascotsOn } from '@/components/MascotTip';
import logoMark from '@/assets/logo-mark.webp';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Spinner } from './ui';

// Isi chat baru dimuat saat panel pertama kali dibuka.
const ChatAdminBody = lazy(() => import('@/pages/ChatAdmin').then((m) => ({ default: m.ChatAdminBody })));

export default function ChatAdminWidget() {
  const [open, setOpen] = useState(false);
  const mascots = useMascotsOn();
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


  return (
    <>
      {mounted && !onPage && (
        <section
          ref={panel}
          id="chat-admin-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Chat Admin"
          className={clsx(
            open ? 'flex' : 'hidden',
            'chat-widget fixed z-50 flex-col overflow-hidden bg-paper shadow-pop',
            // HP: layar penuh di atas navigasi bawah. Laptop: panel di pojok kanan bawah.
            'inset-x-0 bottom-0 top-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(640px,calc(100vh-8rem))] sm:w-[400px] sm:rounded-[22px] sm:border sm:border-paper-2',
          )}
        >
          <header className="chat-widget-head surface-forest">
            <span className="chat-widget-mark">{mascots ? <Mascot name="kori" mood="idle" size={36} label="" /> : <img src={logoMark} alt="" />}</span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[16px] font-bold leading-tight text-white">Chat Admin</p>
              <p className="text-[12px] text-white/75">Admin MEDCOEL membalas saat tersedia</p>
            </div>
            <Link to="/chat-admin" onClick={() => setOpen(false)} className="rounded-lg p-2 text-white/90 hover:bg-white/15" aria-label="Buka Chat Admin di halaman penuh" title="Halaman penuh">
              <Maximize2 size={18} />
            </Link>
            <button type="button" onClick={() => { setOpen(false); button.current?.focus(); }} className="rounded-lg p-2 text-white/90 hover:bg-white/15" aria-label="Tutup Chat Admin">
              <X size={20} />
            </button>
          </header>
          <div className="flex min-h-0 flex-1 flex-col">
            <Suspense fallback={<div className="grid flex-1 place-items-center"><Spinner /></div>}><ChatAdminBody compact /></Suspense>
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
          'chat-fab fixed right-4 z-50 flex items-center gap-2 rounded-full px-4 py-3 font-semibold text-white transition',
          // Di HP berada di atas navigasi bawah; saat panel layar penuh terbuka, tombolnya disembunyikan.
          'sm:right-6',
          open && 'max-sm:hidden',
          onPage && '!hidden',
        )}
      >
        {open ? <X size={20} aria-hidden /> : mascots ? <span className="chat-fab-kori" aria-hidden><Mascot name="kori" mood="wave" size={34} label="" /></span> : <MessageCircle size={20} aria-hidden />}
        <span className="hidden sm:inline">{open ? 'Tutup' : 'Chat Admin'}</span>
      </button>
    </>
  );
}
