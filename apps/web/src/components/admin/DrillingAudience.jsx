// Siapa yang bisa melihat soal Drilling satu mata kuliah. Admin memilih kampus mana yang boleh melihat
// (atau General untuk semua), dan tiap kampus punya dropdown berisi pengguna yang ikut melihatnya.
import { ChevronDown, ChevronUp, Globe2, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import CampusMulti from './CampusMulti';

const soalText = (g) => `${g.published} tayang${g.draft ? ` · ${g.draft} draf` : ''}`;

function CampusGroup({ g, busy, onChange, onGeneral }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [picked, setPicked] = useState([g.id]);
  return (
    <li className="rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span className="min-w-0">
            <span className="block font-semibold">{g.name}</span>
            <span className="block text-xs text-ink-muted">{soalText(g)} soal · {g.userCount} pengguna bisa melihat</span>
          </span>
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(!edit)} disabled={busy}>Ubah kampus</button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => onGeneral(g)} disabled={busy}>Jadikan General</button>
      </div>
      {edit && (
        <div className="space-y-2 border-t border-line p-3">
          <p className="text-sm text-ink-muted">Soal khusus {g.name} ini akan hanya terlihat oleh kampus yang dipilih di bawah.</p>
          <CampusMulti value={picked} onChange={setPicked} />
          <div className="flex gap-2">
            <button type="button" className="btn-primary btn-sm" disabled={busy || !picked.length} onClick={() => { onChange(g, picked); setEdit(false); }}>Simpan</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => { setEdit(false); setPicked([g.id]); }}>Batal</button>
          </div>
        </div>
      )}
      {open && (
        <div className="border-t border-line p-3">
          {g.users.length ? (
            <ul className="max-h-64 divide-y divide-line overflow-auto text-sm">
              {g.users.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="min-w-0 truncate font-medium">{x.name || x.loginId}</span>
                  <span className="shrink-0 text-xs text-ink-muted">{x.loginId}{x.semester ? ` · smt ${x.semester}` : ''}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-muted">Belum ada pengguna aktif dari kampus ini.</p>}
          {g.userCount > g.users.length && <p className="mt-2 text-xs text-ink-muted">Menampilkan {g.users.length} dari {g.userCount} pengguna. Daftar lengkap ada di Pengguna.</p>}
        </div>
      )}
    </li>
  );
}

export default function DrillingAudience({ subject, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState('all');
  const [campuses, setCampuses] = useState([]);
  const [only, setOnly] = useState('');
  const load = useCallback(() => api('admin/drilling/audience', { query: { subject: subject.id } }).then((d) => { setData(d); setError(''); }).catch((e) => setError(errorText(e))), [subject.id]);
  useEffect(() => { load(); }, [load]);

  const apply = async (body, done) => {
    setBusy(true); setError('');
    try {
      const r = await api('admin/drilling/bulk', { method: 'POST', body: { subject: subject.id, action: 'scope', ...body } });
      await load(); onChanged?.(`${done}: ${r.count} soal.`);
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const apps = () => {
    if (scope === 'campus' && !campuses.length) { setError('Pilih minimal satu kampus yang boleh melihat.'); return; }
    return apply({ scope, campuses: scope === 'campus' ? campuses : [], ...(only ? { only } : {}) }, scope === 'all' ? 'Dijadikan General' : 'Kampus yang boleh melihat diperbarui');
  };

  if (!data) return error ? <Alert>{error}</Alert> : <p className="text-sm text-ink-muted">Memuat…</p>;
  const ada = data.general.published + data.general.draft + data.campuses.length > 0;
  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-page p-3">
      <Alert>{error}</Alert>
      {!ada && <p className="text-sm text-ink-muted">Belum ada soal Drilling di mata kuliah ini. Impor soal dulu, lalu atur siapa yang melihatnya di sini.</p>}
      {ada && (
        <ul className="space-y-2">
          {(data.general.published + data.general.draft) > 0 && (
            <li className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3">
              <Globe2 size={18} className="text-brand" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">General</span>
                <span className="block text-xs text-ink-muted">{soalText(data.general)} soal · semua pengguna ({data.general.userCount} akun aktif) bisa melihat</span>
              </span>
              <Badge className="bg-mint-soft text-brand">Semua kampus</Badge>
            </li>
          )}
          {data.campuses.map((g) => (
            <CampusGroup key={g.id} g={g} busy={busy}
              onChange={(grp, ids) => apply({ only: grp.id, scope: 'campus', campuses: ids }, `Kampus ${grp.name} diperbarui`)}
              onGeneral={(grp) => window.confirm(`Jadikan soal khusus ${grp.name} menjadi General (semua pengguna bisa melihat)?`) && apply({ only: grp.id, scope: 'all' }, 'Dijadikan General')} />
          ))}
        </ul>
      )}
      {data.campuses.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-ink-muted"><Users size={14} /> {data.notSeeing} pengguna dari kampus lain tidak melihat soal khusus kampus di atas{(data.general.published + data.general.draft) > 0 ? ' (mereka tetap melihat soal General)' : ''}.</p>
      )}
      {ada && (
        <div className="space-y-2 border-t border-line pt-3">
          <p className="text-sm font-semibold">Atur ulang siapa yang boleh melihat</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-ink-muted">Soal yang diatur</span>
              <select className="input" value={only} onChange={(e) => setOnly(e.target.value)}>
                <option value="">Semua soal Drilling mata kuliah ini</option>
                {(data.general.published + data.general.draft) > 0 && <option value="all">Hanya soal General</option>}
                {data.campuses.map((g) => <option key={g.id} value={g.id}>Hanya soal khusus {g.name}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-ink-muted">Boleh dilihat oleh</span>
              <select className="input" value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="all">General (semua pengguna)</option>
                <option value="campus">Hanya kampus tertentu</option>
              </select>
            </label>
          </div>
          {scope === 'campus' && <CampusMulti value={campuses} onChange={setCampuses} />}
          <button type="button" className="btn-primary btn-sm" onClick={apps} disabled={busy}>Terapkan</button>
        </div>
      )}
    </div>
  );
}
