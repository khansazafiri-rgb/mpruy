// Pengelolaan Drilling: sakelar menu untuk pengguna, dan tampil/sembunyi per mata kuliah.
// Soal masuk lewat impor (pilih "Drilling" di Impor soal) atau Hermes Agent (drilling: true).
import { Eye, EyeOff, Upload } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, EmptyState, PageLoader } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import pb from '@/lib/pb';

export default function DrillingAdmin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api('admin/drilling').then(setData).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); await load(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const toggle = () => run(async () => {
    const rec = (await pb.collection('app_settings').getList(1, 1)).items[0];
    await pb.collection('app_settings').update(rec.id, { drillingEnabled: !data.enabled });
  });
  const hideSubject = (s) => run(() => pb.collection('chapters').update(s.chapter, { hidden: !s.hidden }));

  if (!data) return error ? <Alert>{error}</Alert> : <PageLoader />;
  const status = data.available ? { cls: 'bg-mint-soft text-brand', label: 'Tampil untuk pengguna' }
    : data.enabled ? { cls: 'bg-gold-soft text-[#6b4f00]', label: 'Menyala, tetapi tersembunyi: belum ada soal yang tayang' }
      : { cls: 'bg-page text-ink-muted', label: 'Tersembunyi untuk pengguna' };
  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Drilling</h1>
        <p className="mt-1 text-sm text-ink-muted">Soal General per mata kuliah tanpa BAB. Menu Drilling di sebelah Simulasi hanya tampil bila sakelar menyala dan sudah ada soal yang tayang.</p>
      </div>
      <Alert>{error}</Alert>
      <section className="card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Menu Drilling untuk pengguna</p>
            <Badge className={status.cls}>{status.label}</Badge>
          </div>
          <button type="button" className={data.enabled ? 'btn-secondary' : 'btn-primary'} onClick={toggle} disabled={busy}>
            {data.enabled ? <><EyeOff size={17} /> Sembunyikan Drilling</> : <><Eye size={17} /> Tampilkan Drilling</>}
          </button>
        </div>
        <p className="text-sm text-ink-muted">{data.total} soal Drilling tayang di {data.subjects.filter((s) => s.published > 0).length} mata kuliah. Mata kuliah tanpa soal Drilling tidak muncul bagi pengguna.</p>
      </section>
      <section className="card p-5">
        <h2 className="font-display text-lg font-semibold">Per mata kuliah</h2>
        {!data.subjects.length ? (
          <EmptyState icon={Upload} title="Belum ada soal Drilling">Masukkan soal lewat Edit Soal &gt; Impor dengan memilih BAB &quot;Drilling&quot;, atau lewat Hermes Agent dengan <code>drilling: true</code>.<Link to="/admin/soal" className="btn-secondary mt-4 inline-flex">Buka Edit Soal</Link></EmptyState>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {data.subjects.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-ink-muted">{s.published} tayang{s.draft ? ` · ${s.draft} draf` : ''}{s.hidden ? ' · disembunyikan' : ''}</p>
                </div>
                <button type="button" className="btn-secondary btn-sm" onClick={() => hideSubject(s)} disabled={busy}>
                  {s.hidden ? <><Eye size={15} /> Tampilkan</> : <><EyeOff size={15} /> Sembunyikan</>}
                </button>
                <Link to={`/admin/soal?subject=${s.id}`} className="btn-ghost btn-sm">Lihat soal</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
