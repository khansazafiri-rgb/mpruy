import { Download, ExternalLink, Pencil, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import CampusPicker from '@/components/CampusPicker';
import { NO_CAMPUS, placeErrors, placePayload, placeState } from '@/lib/campus';
import ExtraFields, { extraDefaults, formatExtra } from '@/components/ExtraFields';
import { Alert, Badge, Field, Modal, PageLoader, Tabs } from '@/components/ui';
import { api } from '@/lib/api';
import pb from '@/lib/pb';
import { fmtDate, relative } from '@/lib/time';
import { waLink } from '@/lib/wa';

export default function Users() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [campusFor, setCampusFor] = useState(null);
  const [place, setPlace] = useState(placeState(null));
  const [placeErr, setPlaceErr] = useState({});
  const [editFor, setEditFor] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = () => api('admin/users', { query: { q, status, role, page } }).then(setData).catch((e) => setError(e.message));
  useEffect(() => {
    setData(null); load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, role, page]);

  const act = async (u, action, extra = {}) => {
    let reason = '';
    if (action === 'disable' || action === 'delete') {
      reason = window.prompt(action === 'delete' ? 'Alasan hapus akun (opsional)' : 'Alasan menonaktifkan, misalnya bukti palsu (opsional)') ?? null;
      if (reason === null) return;
    }
    setError('');
    try { await api(`admin/users/${u.id}`, { method: 'POST', body: { action, reason, ...extra } }); setCampusFor(null); load(); } catch (e) { setError(e.message); }
  };

  const exportCsv = async () => {
    setExporting(true); setError('');
    try {
      const qs = new URLSearchParams(Object.entries({ q, status }).filter(([, v]) => v)).toString();
      const res = await fetch(pb.buildURL(`/api/medcoel/admin/users/export${qs ? `?${qs}` : ''}`), { headers: { Authorization: pb.authStore.token } });
      if (!res.ok) throw new Error('Ekspor gagal. Coba lagi.');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a'); a.href = url; a.download = `pengguna-medcoel-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { setError(e.message); } finally { setExporting(false); }
  };
  const fields = data?.fields || [];
  const proofTitle = Object.fromEntries((data?.proofSteps || []).map((p) => [p.key, p.title]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="page-title flex-1">Pengguna</h1>
        <button type="button" className="btn-secondary btn-sm" onClick={exportCsv} disabled={exporting}><Download size={15} /> {exporting ? 'Menyiapkan...' : 'Ekspor CSV'}</button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }} className="relative w-full sm:w-80">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input className="input pl-9" placeholder="Nama, Login ID, email, WA, atau data tambahan" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari pengguna" />
        </form>
        <select className="input w-auto py-1.5" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} aria-label="Peran"><option value="">Semua peran</option><option value="user">Pengguna</option><option value="agent">Agen</option><option value="admin">Admin</option></select>
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
                  <p className="text-sm text-ink-muted">{u.campusName || 'kampus belum diisi'}{u.campusOther && u.campusOther !== NO_CAMPUS ? ' (Lainnya)' : ''} · daftar {fmtDate(u.created)} · aktif {u.lastActiveAt ? relative(u.lastActiveAt) : 'belum pernah'} · {u.attempts} percobaan</p>
                  {fields.some((f) => formatExtra(f, u.extra?.[f.key])) && (
                    <p className="mt-1 flex flex-wrap gap-1.5 text-sm">
                      {fields.filter((f) => formatExtra(f, u.extra?.[f.key])).map((f) => <span key={f.key} className="chip bg-page py-0.5 text-ink">{f.label}: <b className="font-semibold">{formatExtra(f, u.extra[f.key])}</b></span>)}
                    </p>
                  )}
                  {u.disabledReason && <p className="mt-1 text-sm text-coral">{u.disabledReason}</p>}
                </div>
                {u.deletedAt ? <Badge className="bg-page text-ink-muted">Dihapus</Badge> : u.disabled ? <Badge className="bg-coral-soft text-coral">Nonaktif</Badge> : <Badge className="bg-brand-soft text-brand-dark">Aktif</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {u.proofs.map((p) => (
                  <a key={p.key || p.kind} href={p.link} target="_blank" rel="noopener noreferrer" className="chip bg-page py-1 text-ink hover:text-brand">Bukti {proofTitle[p.key] || (p.kind === 'whatsapp' ? 'WhatsApp' : p.kind === 'instagram' ? 'Instagram' : p.key)} <ExternalLink size={11} /></a>
                ))}
                <span className="flex-1" />
                {!u.deletedAt && <button type="button" className="btn-secondary btn-sm" onClick={() => setEditFor(u)}><Pencil size={14} /> Ubah data</button>}
                {u.role === 'user' && !u.deletedAt && (u.disabled
                  ? <button type="button" className="btn-primary btn-sm" onClick={() => act(u, 'enable')}>Aktifkan</button>
                  : <button type="button" className="btn-secondary btn-sm" onClick={() => act(u, 'disable')}>Nonaktifkan</button>)}
                {u.role === 'user' && !u.deletedAt && <button type="button" className="btn-secondary btn-sm" onClick={() => { setCampusFor(u); setPlace(placeState(u)); setPlaceErr({}); }}>Ganti prodi dan kampus</button>}
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
      {editFor && <EditUser u={editFor} fields={fields} onClose={() => setEditFor(null)} onSaved={() => { setEditFor(null); load(); }} />}
      {campusFor && (
        <Modal open size="sm" title={`Ganti prodi dan kampus ${campusFor.name}`} onClose={() => setCampusFor(null)} footer={<>
          <button type="button" className="btn-ghost" onClick={() => setCampusFor(null)}>Batal</button>
          <button type="button" className="btn-primary" onClick={() => { const er = placeErrors(place); setPlaceErr(er); if (!Object.keys(er).length) act(campusFor, 'campus', placePayload(place)); }}>Simpan</button>
        </>}>
          <p className="mb-3 text-sm text-ink-muted">Admin tidak terkena batas ganti kampus. Perubahan dicatat di riwayat.</p>
          <CampusPicker value={place} onChange={setPlace} errors={placeErr} id="adm-campus" includeUnverified />
        </Modal>
      )}
    </div>
  );
}

function EditUser({ u, fields, onClose, onSaved }) {
  const [f, setF] = useState({
    name: u.name, loginId: u.loginId, email: u.email || '', whatsapp: u.whatsapp ? `0${String(u.whatsapp).replace(/^62/, '')}` : '',
    semester: u.semester || 0, role: u.role, leaderboardAnonymous: !!u.leaderboardAnonymous,
  });
  const [extra, setExtra] = useState(() => extraDefaults(fields, u.extra || {}));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const save = async () => {
    setBusy(true); setError(''); setErrors({});
    try {
      const body = { action: 'profile', ...f, semester: Number(f.semester) || 0, extra };
      if (u.role === 'admin') delete body.role;
      await api(`admin/users/${u.id}`, { method: 'POST', body });
      onSaved();
    } catch (e) { setError(e.message); setErrors(e.fields || {}); } finally { setBusy(false); }
  };
  return (
    <Modal open title={`Ubah data ${u.name}`} onClose={onClose} footer={<>
      <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
      <button type="button" className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
    </>}>
      <div className="space-y-3">
        <p className="text-sm text-ink-muted">Kolom wajib tidak ditegakkan untuk admin. Ganti kampus lewat tombol Ganti kampus supaya tercatat di riwayat.</p>
        <Alert>{error}</Alert>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama lengkap" htmlFor="eu-name" error={errors.name}><input id="eu-name" className="input" value={f.name} maxLength={100} onChange={set('name')} /></Field>
          <Field label="Login ID" htmlFor="eu-id" error={errors.loginId}><input id="eu-id" className="input" value={f.loginId} maxLength={30} onChange={set('loginId')} /></Field>
          <Field label="Email" htmlFor="eu-mail" error={errors.email}><input id="eu-mail" type="email" className="input" value={f.email} onChange={set('email')} /></Field>
          <Field label="WhatsApp" htmlFor="eu-wa" error={errors.whatsapp}><input id="eu-wa" type="tel" className="input" value={f.whatsapp} onChange={set('whatsapp')} /></Field>
          <Field label="Semester" htmlFor="eu-sem" error={errors.semester}>
            <select id="eu-sem" className="input" value={f.semester} onChange={set('semester')}>
              <option value={0}>Tidak diisi</option>
              {Array.from({ length: 14 }, (_, i) => <option key={i + 1} value={i + 1}>Semester {i + 1}</option>)}
            </select>
          </Field>
          {u.role !== 'admin' && (
            <Field label="Peran" htmlFor="eu-role" error={errors.role} hint="Agen dipakai untuk Hermes Agent.">
              <select id="eu-role" className="input" value={f.role} onChange={set('role')}><option value="user">Pengguna</option><option value="agent">Agen</option></select>
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.leaderboardAnonymous} onChange={set('leaderboardAnonymous')} /> Tampil anonim di leaderboard</label>
          <ExtraFields defs={fields} values={extra} onChange={setExtra} errors={errors} idPrefix="eu" />
        </div>
      </div>
    </Modal>
  );
}
