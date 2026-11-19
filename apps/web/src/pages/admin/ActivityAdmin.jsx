import clsx from 'clsx';
import { Activity } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminHeader from '@/components/admin/AdminHeader';
import { Alert, EmptyState, ErrorState, PageLoader, SectionHeader, Stat } from '@/components/ui';
import { useApi } from '@/lib/useApi';

const RANGES = [[1, 'Hari ini'], [7, '7 hari'], [30, '30 hari'], [90, '90 hari']];
const nf = new Intl.NumberFormat('id-ID');
/** 135 -> "2 j 15 mnt"; 40 -> "40 mnt". */
export const fmtMinutes = (m) => (m >= 60 ? `${Math.floor(m / 60)} j${m % 60 ? ` ${m % 60} mnt` : ''}` : `${m} mnt`);
const shortDay = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

// Bagian web mana yang paling sering dibuka siswa, dari catatan harian per halaman (tanpa isi, tanpa nama siswa).
export default function ActivityAdmin() {
  const [days, setDays] = useState(7);
  const { data, error, loading, reload } = useApi(`admin/activity?days=${days}`);
  if (error) return <ErrorState onRetry={reload}>{error.message}</ErrorState>;
  const empty = data && data.totals.views === 0;
  const maxViews = data ? Math.max(1, ...data.sections.map((s) => s.views)) : 1;
  const maxDay = data ? Math.max(1, ...data.daily.map((d) => d.views)) : 1;
  return (
    <div className="space-y-8">
      <AdminHeader
        title="Aktivitas siswa"
        actions={(
          <div className="flex flex-wrap gap-2" role="group" aria-label="Rentang waktu">
            {RANGES.map(([n, label]) => (
              <button key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)} className={clsx('btn', days === n ? 'btn-primary' : 'btn-secondary')}>{label}</button>
            ))}
          </div>
        )}
      >
        Bagian web yang paling sering dibuka siswa dan berapa lama mereka aktif di sana. Yang dihitung hanya jenis halamannya, tanpa isi jawaban dan tanpa nama siswa.
      </AdminHeader>

      {loading && !data && <PageLoader />}
      {data && empty && (
        <EmptyState icon={Activity} title="Belum ada aktivitas di rentang ini" mascot="nilo">
          Pencatatan baru berjalan setelah pembaruan ini terpasang dan siswa membuka web. Coba rentang yang lebih panjang, atau tunggu beberapa hari.
        </EmptyState>
      )}
      {data && !empty && (
        <>
          <section className="space-y-3" aria-label="Ringkasan">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat accent="text-ink" label="Kali halaman dibuka" value={nf.format(data.totals.views)} sub={`${shortDay(data.from)} – ${shortDay(data.to)}`} />
              <Stat accent="text-ink" label="Siswa aktif" value={nf.format(data.totals.students)} />
              <Stat accent="text-ink" label="Waktu aktif total" value={fmtMinutes(data.totals.minutes)} sub="tab terlihat dan sedang disentuh" />
            </div>
            {data.trackingStartedOn && <p className="meta">Data tercatat sejak {data.trackingStartedOn}. Rentang yang lebih panjang daripada itu baru terisi sebagian.</p>}
          </section>

          <section className="space-y-3" aria-label="Bagian yang paling sering dibuka">
            <SectionHeader title="Bagian yang paling sering dibuka">Diurutkan menurut berapa kali dibuka. Siswa dihitung sekali per bagian.</SectionHeader>
            <ol className="card divide-y divide-line p-0">
              {data.sections.map((s) => (
                <li key={s.section} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,14rem)_1fr_auto] sm:items-center sm:gap-4" data-testid={`section-${s.section}`}>
                  <span className="font-semibold text-ink">{s.label}</span>
                  <span className="h-3 overflow-hidden rounded-full bg-page" aria-hidden><span className="block h-full rounded-full bg-brand" style={{ width: `${Math.max(2, (s.views / maxViews) * 100)}%` }} /></span>
                  <span className="meta tabular-nums sm:text-right"><b className="text-ink">{nf.format(s.views)}</b> dibuka ({s.share}%) · {nf.format(s.students)} siswa · {fmtMinutes(s.minutes)}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-3" aria-label="Halaman terpopuler">
            <SectionHeader title="Halaman terpopuler">20 halaman teratas. "Siswa" adalah jumlah siswa berbeda yang membukanya.</SectionHeader>
            <div className="card overflow-x-auto p-0">
              <table className="w-full min-w-[340px] text-left text-sm">
                <thead className="meta border-b border-line"><tr><th className="px-4 py-2 font-semibold">Halaman</th><th className="hidden px-4 py-2 font-semibold sm:table-cell">Bagian</th><th className="px-4 py-2 text-right font-semibold">Dibuka</th><th className="px-4 py-2 text-right font-semibold">Siswa</th><th className="px-4 py-2 text-right font-semibold">Waktu aktif</th></tr></thead>
                <tbody className="divide-y divide-line tabular-nums">
                  {data.pages.map((p) => (
                    <tr key={p.key}><td className="px-4 py-2 font-medium text-ink">{p.label}</td><td className="hidden px-4 py-2 text-ink-muted sm:table-cell">{p.sectionLabel}</td><td className="px-4 py-2 text-right">{nf.format(p.views)}</td><td className="px-4 py-2 text-right">{nf.format(p.students)}</td><td className="px-4 py-2 text-right">{fmtMinutes(p.minutes)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {data.days > 1 && (
            <section className="space-y-3" aria-label="Per hari">
              <SectionHeader title="Per hari">Berapa kali halaman dibuka setiap hari (WIB).</SectionHeader>
              <div className="card p-4">
                <div className="flex h-28 items-end gap-[2px]" role="img" aria-label={`Grafik kunjungan per hari, ${shortDay(data.from)} sampai ${shortDay(data.to)}`}>
                  {data.daily.map((d) => (
                    <span key={d.day} title={`${d.day}: ${nf.format(d.views)} dibuka, ${nf.format(d.students)} siswa`} className="min-w-0 flex-1 rounded-t bg-brand/80" style={{ height: `${Math.max(d.views ? 4 : 1, (d.views / maxDay) * 100)}%`, opacity: d.views ? 1 : 0.25 }} />
                  ))}
                </div>
                <p className="meta mt-2 flex justify-between"><span>{shortDay(data.from)}</span><span>{shortDay(data.to)}</span></p>
              </div>
            </section>
          )}
        </>
      )}

      <Alert kind="info">
        Siswa perlu tahu hal ini: pastikan <Link to="/admin/pengaturan" className="font-semibold underline">Kebijakan privasi</Link> menyebut pencatatan bagian web yang dibuka. Teks bawaan sudah memuatnya; bila kamu pernah mengisi teks sendiri, tambahkan satu kalimatnya. Catatan dihapus otomatis setelah 180 hari atau saat akun siswa dihapus.
      </Alert>
    </div>
  );
}
