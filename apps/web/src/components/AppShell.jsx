import clsx from 'clsx';
import {
  Bell, BookOpen, CalendarDays, ChevronDown, History, Home, LayoutDashboard, LogOut, Menu, MessageCircle, Trophy, TrendingUp, User, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AnnouncementPopup from './AnnouncementPopup';
import Logo from './Logo';

const NAV = [
  { to: '/beranda', label: 'Beranda', short: 'Beranda', icon: Home },
  { to: '/mata-kuliah', label: 'Mata kuliah', short: 'Matkul', icon: BookOpen },
  { to: '/progres', label: 'Progres', short: 'Progres', icon: TrendingUp },
  { to: '/leaderboard', label: 'Leaderboard', short: 'Peringkat', icon: Trophy },
  { to: '/jadwal', label: 'Jadwal ujian', icon: CalendarDays },
  { to: '/chat-admin', label: 'Chat Admin', short: 'Chat', icon: MessageCircle },
];

export default function AppShell() {
  const { me, logout, isAdmin, refresh } = useAuth();
  const [menu, setMenu] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => { setMenu(false); setDrawer(false); }, [loc.pathname]);
  // Hitungan notifikasi diperbarui saat pindah halaman.
  useEffect(() => { refresh(); }, [loc.pathname, refresh]);

  const unread = me?.unreadNotifications || 0;
  const doLogout = () => { logout(); nav('/masuk'); };

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <a href="#isi" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">Lewati ke isi</a>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <button type="button" className="rounded-lg p-2 text-ink-muted hover:bg-page lg:hidden" onClick={() => setDrawer(true)} aria-label="Buka menu">
            <Menu size={22} />
          </button>
          <Link to="/beranda" aria-label="MEDCOEL beranda"><Logo /></Link>
          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => clsx('rounded-lg px-3 py-2 text-[15px] font-semibold transition-colors', isActive ? 'bg-brand-soft text-brand-dark' : 'text-ink-muted hover:text-ink')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Link to="/notifikasi" className="relative rounded-lg p-2 text-ink-muted hover:bg-page hover:text-ink" aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`}>
              <Bell size={22} />
              {unread > 0 && (
                <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-coral px-1 text-center text-[11px] font-bold leading-[18px] text-white">{unread > 99 ? '99+' : unread}</span>
              )}
            </Link>
            <div className="relative">
              <button type="button" onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-page" aria-expanded={menu} aria-haspopup="menu">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{(me?.name || '?').charAt(0).toUpperCase()}</span>
                <span className="hidden max-w-[10rem] truncate text-sm font-semibold sm:block">{me?.name}</span>
                <ChevronDown size={16} className="text-ink-muted" />
              </button>
              {menu && (
                <div role="menu" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop">
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
          <div className="h-full w-72 bg-surface p-4 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <Logo />
              <button type="button" onClick={() => setDrawer(false)} className="rounded-lg p-2 hover:bg-page" aria-label="Tutup menu"><X size={20} /></button>
            </div>
            <nav className="space-y-1" aria-label="Navigasi">
              {[...NAV, { to: '/riwayat', label: 'Riwayat', icon: History }, { to: '/profil', label: 'Profil', icon: User }, ...(isAdmin ? [{ to: '/admin', label: 'Dashboard admin', icon: LayoutDashboard }] : [])].map((n) => (
                <NavLink key={n.to} to={n.to} className={({ isActive }) => clsx('flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold', isActive ? 'bg-brand-soft text-brand-dark' : 'text-ink-muted hover:bg-page')}>
                  <n.icon size={20} /> {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main id="isi" className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface lg:hidden" aria-label="Navigasi bawah">
        {NAV.filter((n) => n.to !== '/jadwal').map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => clsx('flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', isActive ? 'text-brand' : 'text-ink-muted')}>
            <n.icon size={21} aria-hidden /> <span className="truncate">{n.short || n.label}</span>
          </NavLink>
        ))}
      </nav>
      <AnnouncementPopup />
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
