import clsx from 'clsx';
import {
  Bell, BookOpen, CalendarDays, ChevronDown, Crosshair, History, Home, LayoutDashboard, LogOut, Menu, MessageCircle, Stethoscope, Trophy, TrendingUp, User, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { serverIsBehind } from '@/lib/serverVersion';
import AnnouncementPopup from './AnnouncementPopup';
import ChatAdminWidget from './ChatAdminWidget';
import TutorialGate from '@/features/onboarding/TutorialGate';
import Logo from './Logo';
import LanguageSwitch from './LanguageSwitch';
import ScrollableNav from './ScrollableNav';

const ALL_NAV = [
  { to: '/beranda', label: 'Beranda', short: 'Beranda', icon: Home },
  { to: '/mata-kuliah', label: 'Mata kuliah', short: 'Matkul', icon: BookOpen },
  { to: '/simulasi-dokter', label: 'Simulasi dokter', desk: 'Simulasi', icon: Stethoscope, noBottom: true },
  { to: '/drilling', label: 'Drilling', icon: Crosshair, noBottom: true, drilling: true },
  { to: '/progres', label: 'Progres', short: 'Progres', icon: TrendingUp },
  { to: '/leaderboard', label: 'Leaderboard', short: 'Peringkat', icon: Trophy },
  { to: '/jadwal', label: 'Jadwal ujian', short: 'Jadwal', icon: CalendarDays },
  { to: '/chat-admin', label: 'Chat Admin', short: 'Chat', icon: MessageCircle },
];

export default function AppShell() {
  const { me, logout, isAdmin, refresh } = useAuth();
  // Menu Drilling hanya tampil bila admin menyalakannya dan sudah ada soalnya.
  const NAV = ALL_NAV.filter((n) => !n.drilling || me?.drillingAvailable);
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => { setMenu(false); setDrawer(false); }, [loc.pathname]);
  // Hitungan notifikasi diperbarui saat pindah halaman.
  useEffect(() => { refresh(); }, [loc.pathname, refresh]);

  // Hanya untuk admin: peringatan bila PocketBase di server belum dijalankan ulang setelah pembaruan
  // (mis. Simulasi masih 1 kasus per poli, Drilling "tidak ditemukan").
  const [behind, setBehind] = useState(false);
  useEffect(() => {
    if (!isAdmin) return undefined;
    let alive = true;
    api('admin/server-version').then((d) => alive && setBehind(serverIsBehind(d.migration))).catch((e) => alive && setBehind(e.status === 404));
    return () => { alive = false; };
  }, [isAdmin]);

  const unread = me?.unreadNotifications || 0;
  const doLogout = () => { logout(); nav('/masuk'); };

  return (
    <div className="app-frame min-h-screen pb-20 lg:pb-0">
      <a href="#isi" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">Lewati ke isi</a>
      <header className="app-header sticky top-0 z-40 border-b border-line">
        <div className="app-header-inner mx-auto flex h-[76px] min-w-0 max-w-6xl items-center gap-3 px-4">
          <button type="button" className="rounded-lg p-2 text-ink-muted hover:bg-page lg:hidden" onClick={() => setDrawer(true)} aria-label="Buka menu">
            <Menu size={22} />
          </button>
          <Link to="/beranda" className="app-brand shrink-0" aria-label="MEDCOEL beranda"><Logo className="hidden sm:block" /><Logo variant="mark" className="sm:hidden" /></Link>
          <ScrollableNav items={NAV} />
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <LanguageSwitch />
            <Link to="/notifikasi" className="relative rounded-lg p-2 text-ink-muted hover:bg-page hover:text-ink" aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`}>
              <Bell size={22} />
              {unread > 0 && (
                <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-coral px-1 text-center text-[11px] font-bold leading-[18px] text-white">{unread > 99 ? '99+' : unread}</span>
              )}
            </Link>
            <div className="relative">
              <button type="button" onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-page" aria-expanded={menu} aria-haspopup="menu">
                <span className="app-avatar flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white">{(me?.name || '?').charAt(0).toUpperCase()}</span>
                <span className="hidden max-w-[10rem] truncate text-sm font-semibold sm:block">{me?.name}</span>
                <ChevronDown size={16} className="text-ink-muted" />
              </button>
              {menu && (
                <div role="menu" className="profile-menu absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-paper-2 bg-[#fffdf7] py-1 shadow-pop">
                  <MenuLink to="/profil" icon={User}>Profil</MenuLink>
                  <MenuLink to="/riwayat" icon={History}>Riwayat</MenuLink>
                  {isAdmin && <MenuLink to="/admin" icon={LayoutDashboard}>Dashboard admin</MenuLink>}
                  <button type="button" role="menuitem" onClick={doLogout} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-coral hover:bg-page">
                    <LogOut size={16} /> Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {drawer && (
        <div className="fixed inset-0 z-50 bg-ink/40 lg:hidden" onClick={() => setDrawer(false)}>
          <div className="mobile-drawer h-full w-72 bg-surface p-4 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <Logo />
              <button type="button" onClick={() => setDrawer(false)} className="rounded-lg p-2 hover:bg-page" aria-label="Tutup menu"><X size={20} /></button>
            </div>
            <nav className="space-y-1" aria-label="Navigasi">
              {[...NAV, { to: '/riwayat', label: 'Riwayat', icon: History }, { to: '/profil', label: 'Profil', icon: User }, ...(isAdmin ? [{ to: '/admin', label: 'Dashboard admin', icon: LayoutDashboard }] : [])].map((n) => (
                <NavLink key={n.to} to={n.to} className={({ isActive }) => clsx('flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold', isActive ? 'bg-brand-soft text-brand-dark' : 'text-ink-muted hover:bg-paper-2/60')}>
                  <n.icon size={20} /> {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      {behind && (
        <div role="status" className="border-b border-gold/60 bg-gold-soft px-4 py-2.5 text-center text-sm text-[#6b4f00]">
          <b>Server belum memuat pembaruan terbaru.</b> Simulasi masih menampilkan kasus lama dan Drilling belum jalan sampai PocketBase dijalankan ulang di server. <Link to="/admin" className="font-semibold underline">Lihat caranya</Link>
        </div>
      )}
      <main id="isi" className="app-content mx-auto max-w-6xl px-4 py-6 md:py-10">
        <Outlet />
      </main>

      <nav className="bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface lg:hidden" aria-label="Navigasi bawah">
        {NAV.filter((n) => !n.noBottom && n.to !== '/chat-admin').map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => clsx('flex flex-col items-center gap-0.5 py-2 text-[12px] font-semibold', isActive ? 'is-active text-brand' : 'text-ink-muted')}>
            <n.icon size={21} aria-hidden /> <span className="truncate">{n.short || n.label}</span>
          </NavLink>
        ))}
      </nav>
      <ChatAdminWidget />
      <AnnouncementPopup />
      <TutorialGate />
    </div>
  );
}

function MenuLink({ to, icon: Icon, children }) {
  return (
    <Link to={to} role="menuitem" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-page">
      <Icon size={16} className="text-ink-muted" /> {children}
    </Link>
  );
}
