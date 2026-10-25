import clsx from 'clsx';
import { ArrowLeft, BookMarked, Crosshair, FileQuestion, Flag, Inbox, LayoutDashboard, Megaphone, MessageCircle, Package, Settings, Stethoscope, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Logo from '@/components/Logo';
import LanguageSwitch from '@/components/LanguageSwitch';
import { Alert } from '@/components/ui';
import { api } from '@/lib/api';
import { migrationNumber, REQUIRED_MIGRATION, serverIsBehind } from '@/lib/serverVersion';

export const ADMIN_NAV = [
  { to: '/admin', end: true, label: 'Ringkasan', icon: LayoutDashboard },
  { to: '/admin/pesan', label: 'Pesan pengguna', icon: MessageCircle },
  { to: '/admin/pengajuan', label: 'Pengajuan soal', icon: Inbox },
  { to: '/admin/soal', label: 'Edit Soal', icon: FileQuestion },
  { to: '/admin/laporan', label: 'Laporan soal', icon: Flag },
  { to: '/admin/pengumuman', label: 'Pengumuman', icon: Megaphone },
  { to: '/admin/mata-kuliah', label: 'Mata kuliah & BAB', icon: BookMarked },
  { to: '/admin/paket', label: 'Paket simulasi', icon: Package },
  { to: '/admin/simulasi', label: 'Simulasi Dokter', icon: Stethoscope },
  { to: '/admin/drilling', label: 'Drilling', icon: Crosshair },
  { to: '/admin/pengguna', label: 'Pengguna', icon: Users },
  { to: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
];

// Angka penanda di menu: pengajuan yang baru masuk dan laporan soal baru.
function useNavBadges() {
  const [badges, setBadges] = useState({});
  const { pathname, search } = useLocation();
  useEffect(() => {
    let alive = true;
    const load = () => api('admin/summary').then((d) => alive && setBadges({ '/admin/pengajuan': d.waitingConfirm, '/admin/laporan': d.newReports })).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [pathname, search]);
  return badges;
}

// Peringatan bila PocketBase belum dijalankan ulang setelah pembaruan (fitur baru seperti Drilling lalu tampil
// "tidak ditemukan" dan data baru, mis. 50 kasus simulasi, belum ada).
function ServerBehind() {
  const [behind, setBehind] = useState(null); // { file } bila tertinggal
  useEffect(() => {
    let alive = true;
    api('admin/server-version')
      .then((d) => alive && setBehind(serverIsBehind(d.migration) ? { file: d.migration } : null))
      .catch((e) => alive && setBehind(e.status === 404 || /belum ada di server/.test(e.message) ? { file: '' } : null));
    return () => { alive = false; };
  }, []);
  if (!behind) return null;
  return (
    <Alert kind="warn" className="mb-5">
      <b>Server belum memuat pembaruan terbaru.</b> Web ini butuh migrasi {REQUIRED_MIGRATION}, server baru sampai {behind.file ? migrationNumber(behind.file) : 'versi lama'}.
      Jalankan ulang PocketBase di server (produksi memakai <code>--hooksWatch=false</code>, jadi hook dan migrasi baru baru terpasang setelah restart), lalu muat ulang halaman ini. Selama belum, fitur baru bisa tampil &quot;tidak ditemukan&quot; dan jumlah kasus Simulasi masih lama.
    </Alert>
  );
}

export default function AdminLayout() {
  const badges = useNavBadges();
  return (
    <div className="min-h-screen bg-page lg:flex">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Logo />
          <LanguageSwitch />
          <span className="chip bg-gold-soft text-[#6b4f00]">Admin</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible" aria-label="Menu admin">
          {ADMIN_NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => clsx('flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold', isActive ? 'bg-brand text-white' : 'text-ink-muted hover:bg-page hover:text-ink')}>
              <n.icon size={18} /> {n.label}
              {badges[n.to] > 0 && <span className="ml-auto min-w-[20px] rounded-full bg-coral px-1.5 text-center text-[11px] font-bold leading-5 text-white" aria-label={`${badges[n.to]} perlu dicek`}>{badges[n.to] > 99 ? '99+' : badges[n.to]}</span>}
            </NavLink>
          ))}
          <NavLink to="/beranda" className="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-ink-muted hover:bg-page lg:mt-4"><ArrowLeft size={18} /> Kembali ke web</NavLink>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
        <ServerBehind />
        <Outlet />
      </main>
    </div>
  );
}
