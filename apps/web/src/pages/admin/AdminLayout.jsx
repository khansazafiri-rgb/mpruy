import clsx from 'clsx';
import { ArrowLeft, BookMarked, FileQuestion, Flag, Inbox, LayoutDashboard, Megaphone, MessageCircle, Package, Settings, Users } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import Logo from '@/components/Logo';

export const ADMIN_NAV = [
  { to: '/admin', end: true, label: 'Ringkasan', icon: LayoutDashboard },
  { to: '/admin/pesan', label: 'Pesan pengguna', icon: MessageCircle },
  { to: '/admin/pengajuan', label: 'Pengajuan soal', icon: Inbox },
  { to: '/admin/soal', label: 'Edit Soal', icon: FileQuestion },
  { to: '/admin/laporan', label: 'Laporan soal', icon: Flag },
  { to: '/admin/pengumuman', label: 'Pengumuman', icon: Megaphone },
  { to: '/admin/mata-kuliah', label: 'Mata kuliah & BAB', icon: BookMarked },
  { to: '/admin/paket', label: 'Paket simulasi', icon: Package },
  { to: '/admin/pengguna', label: 'Pengguna', icon: Users },
  { to: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-page lg:flex">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4">
          <Logo />
          <span className="chip bg-gold-soft text-[#6b4f00]">Admin</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible" aria-label="Menu admin">
          {ADMIN_NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => clsx('flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold', isActive ? 'bg-brand text-white' : 'text-ink-muted hover:bg-page hover:text-ink')}>
              <n.icon size={18} /> {n.label}
            </NavLink>
          ))}
          <NavLink to="/beranda" className="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-ink-muted hover:bg-page lg:mt-4"><ArrowLeft size={18} /> Kembali ke web</NavLink>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
