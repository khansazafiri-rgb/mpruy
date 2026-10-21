import { ExternalLink, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import CampusPicker from '@/components/CampusPicker';
import { Alert, Badge, Modal, PageLoader, Tabs } from '@/components/ui';
import { api } from '@/lib/api';
import { fmtDate, relative } from '@/lib/time';
import { waLink } from '@/lib/wa';

export default function Users() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [campusFor, setCampusFor] = useState(null);
  const [campus, setCampus] = useState({ id: '', other: '' });

  const load = () => api('admin/users', { query: { q, status, page } }).then(setData).catch((e) => setError(e.message));
  useEffect(() => {
    setData(null); load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  const act = async (u, action, extra = {}) => {
    let reason = '';
    if (action === 'disable' || action === 'delete') {
      reason = window.prompt(action === 'delete' ? 'Alasan hapus akun (opsional)' : 'Alasan menonaktifkan, misalnya bukti palsu (opsional)') ?? null;
      if (reason === null) return;
    }
    setError('');
    try { await api(`admin/users/${u.id}`, { method: 'POST', body: { action, reason, ...extra } }); setCampusFor(null); load(); } catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-5">
      <h1 className="page-title">Pengguna</h1>
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }} className="relative w-full sm:w-80">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-9" placeholder="Nama, Login ID, email, atau WA" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari pengguna" />
        </form>
        <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1); }} tabs={[{ value: '', label: 'Semua' }, { value: 'active', label: 'Aktif' }, { value: 'disabled', label: 'Nonaktif' }, { value: 'deleted', label: 'Dihapus' }]} />
      </div>
      <Alert>{error}</Alert>
      {!data ? <PageLoader /> : (
        <div className="space-y-2">
          {data.items.map((u) => (
            <div key={u.id} className="card p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{u.name} <span className="font-normal text-ink-muted">@{u.loginId}</span> {u.role !== 'user' && <Badge className="bg-gold-soft text-[#6b4f00]">{u.role}</Badge>}</p>
                  <p className="text-sm text-ink-muted">{u.email} · <a className="text-academic hover:underline" href={waLink(u.whatsapp)} target="_blank" rel="noopener noreferrer">{u.whatsapp}</a> · semester {u.semester}</p>
                  <p className="text-sm text-ink-muted">{u.campusName || 'kampus belum diisi'}{u.campusOther ? ' (Lainnya)' : ''} · daftar {fmtDate(u.created)} · aktif {u.lastActiveAt ? relative(u.lastActiveAt) : 'belum pernah'} · {u.attempts} percobaan</p>
                  {u.disabledReason && <p className="mt-1 text-sm text-coral">{u.disabledReason}</p>}
                </div>
                {u.deletedAt ? <Badge className="bg-page text-ink-muted">Dihapus</Badge> : u.disabled ? <Badge className="bg-coral-soft text-coral">Nonaktif</Badge> : <Badge className="bg-brand-soft text-brand-dark">Aktif</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {u.proofs.map((p) => (
                  <a key={p.kind} href={p.link} target="_blank" rel="noopener noreferrer" className="chip bg-page py-1 text-ink hover:text-brand">Bukti {p.kind === 'whatsapp' ? 'WhatsApp' : 'Instagram'} <ExternalLink size={11} /></a>
                ))}
                <span className="flex-1" />
                {u.role === 'user' && !u.deletedAt && (u.disabled
                  ? <button type="button" className="btn-primary btn-sm" onClick={() => act(u, 'enable')}>Aktifkan</button>
                  : <button type="button" className="btn-secondary btn-sm" onClick={() => act(u, 'disable')}>Nonaktifkan</button>)}
                {u.role === 'user' && !u.deletedAt && <button type="button" className="btn-secondary btn-sm" onClick={() => { setCampusFor(u); setCampus({ id: u.campus, other: u.campusOther }); }}>Ganti kampus</button>}
                {u.role === 'user' && (u.deletedAt
                  ? <button type="button" className="btn-secondary btn-sm" onClick={() => act(u, 'restore')}>Pulihkan</button>
                  : <button type="button" className="btn-ghost btn-sm text-coral" onClick={() => act(u, 'delete')}>Hapus lunak</button>)}
              </div>
            </div>
          ))}
          {!data.items.length && <p className="text-ink-muted">Tidak ada pengguna yang cocok.</p>}
          <div className="flex items-center justify-between pt-2 text-sm">
            <span className="text-ink-muted">{data.totalItems} akun</span>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</button>
              <button type="button" className="btn-secondary btn-sm" disabled={page * 50 >= data.totalItems} onClick={() => setPage((p) => p + 1)}>Berikutnya</button>
            </div>
          </div>
        </div>
      )}
      {campusFor && (
        <Modal open size="sm" title={`Ganti kampus ${campusFor.name}`} onClose={() => setCampusFor(null)} footer={<>
          <button type="button" className="btn-ghost" onClick={() => setCampusFor(null)}>Batal</button>
          <button type="button" className="btn-primary" onClick={() => act(campusFor, 'campus', campus.id === '__other__' ? { campus: '', campusOther: campus.other } : { campus: campus.id })}>Simpan</button>
        </>}>
          <p className="mb-3 text-sm text-ink-muted">Admin tidak terkena batas ganti kampus. Perubahan dicatat di riwayat.</p>
          <CampusPicker value={campus.id} other={campus.other} onChange={(id, other) => setCampus({ id, other })} id="adm-campus" />
        </Modal>
      )}
    </div>
  );
}
