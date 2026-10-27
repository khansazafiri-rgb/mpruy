import { ArrowRight, BookMarked, FileQuestion, FlaskConical, Megaphone, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminHeader from '@/components/admin/AdminHeader';
import { Alert, ErrorState, PageLoader, SectionHeader, Stat } from '@/components/ui';
import { useApi } from '@/lib/useApi';

// Pintu cepat ke bagian yang paling sering dikelola, dengan satu kalimat tentang isinya.
const DOORS = [
  { to: '/admin/lab', icon: FlaskConical, title: 'MEDCOEL Lab', text: 'Tambah modul lewat JSON, periksa, lalu terbitkan ke siswa.' },
  { to: '/admin/soal', icon: FileQuestion, title: 'Edit Soal', text: 'Tulis, ubah, atau impor soal per mata kuliah dan BAB.' },
  { to: '/admin/mata-kuliah', icon: BookMarked, title: 'Mata kuliah & BAB', text: 'Atur daftar mata kuliah dan BAB yang dilihat siswa.' },
  { to: '/admin/pengumuman', icon: Megaphone, title: 'Pengumuman', text: 'Tulis pengumuman yang muncul saat siswa membuka web.' },
  { to: '/admin/pengguna', icon: Users, title: 'Pengguna', text: 'Cari akun, ubah peran, atau nonaktifkan akun.' },
];

// Kartu "perlu ditangani": hanya menonjol bila ada yang menunggu, supaya angka nol tidak berteriak.
function Todo({ to, label, value, sub }) {
  const waiting = value > 0;
  return (
    <Link to={to} className={`group flex min-w-0 items-center justify-between gap-3 p-4 ${waiting ? 'card-practice' : 'card-link'}`}>
      <span className="min-w-0">
        <span className="meta block font-semibold">{label}</span>
        <span className={`mt-0.5 block font-display text-[28px] font-bold leading-none tabular-nums ${waiting ? 'text-ink' : 'text-ink-faint'}`}>{value}</span>
        {sub && <span className="meta mt-1 block">{sub}</span>}
      </span>
      <ArrowRight size={18} className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
    </Link>
  );
}

export default function Summary() {
  const { data, error, loading, reload } = useApi('admin/summary');
  if (loading) return <PageLoader />;
  if (error) return <ErrorState onRetry={reload}>{error.message}</ErrorState>;
  const warn = [];
  if (data.storageMode !== 'drive') warn.push('Google Drive belum tersambung: PDF dan foto bukti tersimpan sementara di server. Isi variabel GDRIVE_* (lihat docs/GOOGLE_DRIVE.md).');
  if (!data.smtp) warn.push('Email (SMTP) belum diatur: kode verifikasi, reset password, dan pengingat tidak terkirim. Atur di dashboard PocketBase /_/ > Settings > Mail.');
  if (!data.turnstile) warn.push('Captcha Turnstile belum diatur: pendaftaran belum dilindungi captcha. Isi TURNSTILE_SITE_KEY dan TURNSTILE_SECRET.');
  return (
    <div className="space-y-8">
      <AdminHeader title="Ringkasan">Mulai dari yang perlu ditangani, lihat aktivitas seminggu terakhir, lalu masuk ke bagian yang ingin dikelola.</AdminHeader>
      {warn.length > 0 && <div className="space-y-2">{warn.map((w) => <Alert key={w} kind="warn">{w}</Alert>)}</div>}

      <section className="space-y-3" aria-label="Perlu ditangani">
        <SectionHeader title="Perlu ditangani" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Todo to="/admin/pengajuan?status=antre" label="Pengajuan antre" value={data.queue} sub={`${data.processing} sedang diproses`} />
          <Todo to="/admin/pengajuan?status=menunggu_konfirmasi" label="Menunggu konfirmasi" value={data.waitingConfirm} />
          <Todo to="/admin/laporan" label="Laporan soal baru" value={data.newReports} />
        </div>
      </section>

      <section className="space-y-3" aria-label="Aktivitas">
        <SectionHeader title="Aktivitas 7 hari terakhir" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat accent="text-ink" label="Pengguna" value={data.users} sub={`${data.disabledUsers} nonaktif`} />
          <Stat accent="text-ink" label="Pendaftar baru" value={data.newUsers7d} />
          <Stat accent="text-ink" label="Pengguna aktif" value={data.activeUsers7d} />
          <Stat accent="text-ink" label="Percobaan soal" value={data.attempts7d} sub={`${data.questions} soal tayang · ${data.draftQuestions} draf`} />
        </div>
      </section>

      <section className="space-y-3" aria-label="Kelola">
        <SectionHeader title="Kelola" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DOORS.map((d) => (
            <Link key={d.to} to={d.to} className="card-link group flex gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><d.icon size={20} aria-hidden /></span>
              <span className="min-w-0"><span className="card-title block">{d.title}</span><span className="mt-0.5 block text-sm leading-relaxed text-ink-muted">{d.text}</span></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
