import { Link } from 'react-router-dom';
import { Alert, PageLoader, Stat } from '@/components/ui';
import { useApi } from '@/lib/useApi';

export default function Summary() {
  const { data, error, loading } = useApi('admin/summary');
  if (loading) return <PageLoader />;
  if (error) return <Alert>{error.message}</Alert>;
  const warn = [];
  if (data.storageMode !== 'drive') warn.push('Google Drive belum tersambung: PDF dan foto bukti tersimpan sementara di server. Isi variabel GDRIVE_* (lihat docs/GOOGLE_DRIVE.md).');
  if (!data.smtp) warn.push('Email (SMTP) belum diatur: kode verifikasi, reset password, dan pengingat tidak terkirim. Atur di dashboard PocketBase /_/ > Settings > Mail.');
  if (!data.turnstile) warn.push('Captcha Turnstile belum diatur: pendaftaran belum dilindungi captcha. Isi TURNSTILE_SITE_KEY dan TURNSTILE_SECRET.');
  return (
    <div className="space-y-6">
      <h1 className="page-title">Ringkasan</h1>
      {warn.length > 0 && (
        <div className="space-y-2">{warn.map((w) => <Alert key={w} kind="warn">{w}</Alert>)}</div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Pengguna" value={data.users} sub={`${data.disabledUsers} nonaktif`} />
        <Stat label="Pendaftar baru 7 hari" value={data.newUsers7d} accent="text-academic" />
        <Stat label="Pengguna aktif 7 hari" value={data.activeUsers7d} accent="text-progress" />
        <Stat label="Percobaan 7 hari" value={data.attempts7d} accent="text-ink" />
        <Stat label="Soal tayang" value={data.questions} sub={`${data.draftQuestions} draf`} />
        <Link to="/admin/pengajuan?status=antre"><Stat label="Pengajuan antre" value={data.queue} sub={`${data.processing} diproses`} accent="text-academic" /></Link>
        <Link to="/admin/pengajuan?status=menunggu_konfirmasi"><Stat label="Menunggu konfirmasi" value={data.waitingConfirm} accent="text-[#8a6500]" /></Link>
        <Link to="/admin/laporan"><Stat label="Laporan soal baru" value={data.newReports} accent="text-coral" /></Link>
      </div>
    </div>
  );
}
