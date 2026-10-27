import { useEffect, useState } from 'react';
import { api, errorText } from '@/lib/api';

const STAGES = { download: 'Unduh sumber', checksum: 'Verifikasi checksum', select: 'Pilih sampel', export: 'Siapkan gambar', register_media: 'Daftarkan aset', generate_authoring: 'Buat JSON modul', validate: 'Validasi' };
const STATUS = { queued: 'MENUNGGU', running: 'BERJALAN', waiting_retry: 'MENUNGGU ULANG', completed: 'SIAP DITINJAU', failed: 'GAGAL', cancelled: 'DIBATALKAN' };

export default function LabJobsPanel({ onOpenBundle }) {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    try { setJobs((await api('admin/lab-jobs')).items || []); setError(''); }
    catch (e) { setError(errorText(e)); }
  }
  useEffect(() => { refresh(); const timer = setInterval(refresh, 7000); return () => clearInterval(timer); }, []);
  async function action(path, body = {}) {
    setBusy(true); setError('');
    try { await api(path, { method: 'POST', body }); await refresh(); }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  return <section className="card space-y-3 p-5" aria-label="Pekerjaan latar belakang">
    <div><h2 className="text-lg font-semibold">Pekerjaan latar belakang</h2><p className="text-sm text-ink-muted">Akuisisi berlangsung di server. Halaman dan SSH boleh ditutup; status tetap tersimpan.</p></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {!jobs.length && <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => action('admin/lab-jobs', { type: 'dataset_acquisition', dataset: 'octmnist' })}>Mulai akuisisi OCT Retina</button>}
    {jobs.map((job) => <div key={job.key} className="rounded-xl border border-line p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><strong>OCT Retina Asset Acquisition</strong><span className="font-semibold">{STATUS[job.status] || job.status}</span></div>
      <p className="mt-2">Tahap: {STAGES[job.stage] || job.stage || 'Menunggu'} · {job.completedItems} / {job.totalItems} aset · {job.progress}%</p>
      <progress className="mt-2 w-full" value={job.progress} max="100" aria-label="Kemajuan akuisisi OCT" />
      {job.currentItem && <p className="text-ink-muted">Item: {job.currentItem}</p>}
      {job.startedAt && <p className="text-xs text-ink-muted">Dimulai: {new Date(job.startedAt).toLocaleString('id-ID')}</p>}
      {job.status === 'completed' && job.result?.readyForReview && <div className="mt-3 space-y-2"><p>✓ checksum terverifikasi · 20 contoh belajar · 12 soal latihan · 32 aset terdaftar · overlap 0 · JSON tervalidasi</p><p className="text-ink-muted">Lisensi dan isi belum diverifikasi manusia; belum ada yang diterbitkan.</p><button className="btn btn-primary btn-sm" onClick={() => onOpenBundle(job.result.authoringJson)}>Buka JSON di editor</button></div>}
      {job.status === 'failed' && <div className="mt-3"><p role="alert" className="text-red-700">Gagal pada {STAGES[job.stage] || job.stage}: {job.error || 'Lihat log worker.'}</p><button className="btn btn-secondary btn-sm mt-2" disabled={busy} onClick={() => action(`admin/lab-jobs/${job.key}/retry`)}>Coba lagi</button></div>}
      {job.status === 'cancelled' && <button className="btn btn-secondary btn-sm mt-2" disabled={busy} onClick={() => action('admin/lab-jobs', { type: 'dataset_acquisition', dataset: 'octmnist' })}>Mulai lagi</button>}
      {['queued', 'waiting_retry', 'running'].includes(job.status) && <button className="btn btn-ghost btn-sm mt-2" disabled={busy || job.cancelRequested} onClick={() => action(`admin/lab-jobs/${job.key}/cancel`)}>{job.cancelRequested ? 'Pembatalan diminta' : 'Batalkan'}</button>}
    </div>)}
  </section>;
}
