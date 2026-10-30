// Pengaturan > Daftar kampus: program studi, kampus per prodi, verifikasi kampus buatan pengguna,
// tempel daftar massal, dan penggabungan. Satu kampus = satu penyelenggaraan (prodi + institusi).
import { Check, GitMerge, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { resetCampusCache } from '@/components/CampusPicker';
import { Alert } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import pb from '@/lib/pb';

const nameFor = (c, program, institution) => (/^FK\s/.test(c.name) && c.name === `FK ${c.institution}` ? `FK ${institution}` : `${program} ${institution}`);

export default function CampusSettings() {
  const [programs, setPrograms] = useState([]);
  const [list, setList] = useState([]);
  const [others, setOthers] = useState([]);
  const [programId, setProgramId] = useState('');
  const [view, setView] = useState('all');
  const [q, setQ] = useState('');
  const [add, setAdd] = useState({ program: '', institution: '', city: '' });
  const [bulk, setBulk] = useState({ program: '', text: '' });
  const [newProgram, setNewProgram] = useState('');
  const [merge, setMerge] = useState({ from: '', into: '' });
  const [pmerge, setPmerge] = useState({ from: '', into: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    pb.collection('programs').getFullList({ sort: 'order,name', requestKey: null }).then(setPrograms).catch((e) => setError(errorText(e)));
    pb.collection('campuses').getFullList({ sort: 'name', requestKey: null }).then(setList).catch((e) => setError(errorText(e)));
    api('admin/campuses/other').then((d) => setOthers(d.items)).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  const run = async (fn, ok) => { setError(''); setMsg(''); try { const r = await fn(); setMsg(typeof ok === 'function' ? ok(r) : ok); load(); resetCampusCache(); return r; } catch (e) { setError(e.message || errorText(e)); return null; } };

  const byProgram = useMemo(() => Object.fromEntries(programs.map((p) => [p.id, p])), [programs]);
  const counts = useMemo(() => { const m = {}; list.forEach((c) => { m[c.program] = (m[c.program] || 0) + 1; }); return m; }, [list]);
  const pending = list.filter((c) => c.unverified);
  const pendingPrograms = programs.filter((p) => p.unverified);
  const shown = list.filter((c) => (!programId || c.program === programId)
    && (view === 'all' || (view === 'pending' && c.unverified) || (view === 'off' && !c.active))
    && `${c.name} ${c.institution} ${c.city}`.toLowerCase().includes(q.toLowerCase()));
  const label = (c) => c.name;

  const addCampus = () => {
    const program = byProgram[add.program];
    const inst = add.institution.trim();
    if (!program || !inst) { setError('Pilih program studi dan tulis nama institusinya.'); return; }
    run(() => pb.collection('campuses').create({ name: `${program.name} ${inst}`, institution: inst, city: add.city.trim(), program: program.id, kind: 'lainnya', active: true, unverified: false, order: list.length + 1 }), `${program.name} ${inst} ditambahkan.`)
      .then((r) => { if (r) setAdd((a) => ({ ...a, institution: '', city: '' })); });
  };
  const rename = (c) => {
    const t = window.prompt('Nama institusi (tanpa nama prodi)', c.institution || c.name);
    if (!t || !t.trim()) return;
    const program = byProgram[c.program]?.name || '';
    run(() => pb.collection('campuses').update(c.id, { institution: t.trim(), name: nameFor(c, program, t.trim()) }), 'Nama diganti.');
  };
  const renameProgram = (p) => { const t = window.prompt('Nama program studi', p.name); if (t && t.trim()) run(() => pb.collection('programs').update(p.id, { name: t.trim() }), 'Nama prodi diganti. Nama kampus lama tidak berubah.'); };

  return (
    <div className="space-y-5">
      <Alert kind="info">
        Satu kampus di sini berarti satu penyelenggaraan: <b>prodi + institusi</b>, jadi &quot;Kedokteran X&quot; dan &quot;Keperawatan X&quot; tidak saling melihat soal khusus kampus. Daftar awal belum lengkap (kampus selain Kedokteran hanya contoh). Lengkapi dari data PDDikti lewat <b>Tempel daftar</b> di bawah.
      </Alert>
      <Alert kind="success">{msg}</Alert>
      <Alert>{error}</Alert>

      {(pending.length > 0 || pendingPrograms.length > 0) && (
        <section className="card space-y-3 border-gold p-4">
          <h3 className="font-display font-semibold">Menunggu pemeriksaan ({pending.length} kampus, {pendingPrograms.length} prodi)</h3>
          <p className="text-sm text-ink-muted">Ditulis sendiri oleh pengguna. Pengguna dengan nama yang sama sudah otomatis bergabung. Jadikan resmi bila benar, atau gabungkan ke yang sudah ada bila ejaannya beda.</p>
          <ul className="divide-y divide-line text-sm">
            {pendingPrograms.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="flex-1"><b>Prodi:</b> {p.name} <span className="text-ink-muted">({counts[p.id] || 0} kampus)</span></span>
                <button type="button" className="text-xs font-semibold text-brand hover:underline" onClick={() => run(() => pb.collection('programs').update(p.id, { unverified: false }), 'Prodi diverifikasi.')}>Jadikan resmi</button>
                <button type="button" className="text-xs font-semibold text-academic hover:underline" onClick={() => setPmerge({ from: p.id, into: '' })}>Gabungkan ke...</button>
              </li>
            ))}
            {pending.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="flex-1">{c.name}</span>
                <button type="button" className="text-xs font-semibold text-brand hover:underline" onClick={() => run(() => pb.collection('campuses').update(c.id, { unverified: false }), 'Kampus diverifikasi.')}>Jadikan resmi</button>
                <button type="button" className="text-xs font-semibold text-academic hover:underline" onClick={() => setMerge({ from: c.id, into: '' })}>Gabungkan ke...</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-3 p-4">
          <h3 className="font-display font-semibold">Kampus ({list.length})</h3>
          <div className="flex flex-wrap gap-2">
            <select className="input min-w-0 flex-1" value={programId} onChange={(e) => setProgramId(e.target.value)} aria-label="Filter program studi">
              <option value="">Semua program studi</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name} ({counts[p.id] || 0})</option>)}
            </select>
            <select className="input w-40" value={view} onChange={(e) => setView(e.target.value)} aria-label="Tampilkan">
              <option value="all">Semua</option><option value="pending">Belum diperiksa</option><option value="off">Nonaktif</option>
            </select>
          </div>
          <input className="input" placeholder="Cari kampus" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="max-h-[28rem] divide-y divide-line overflow-y-auto">
            {shown.slice(0, 300).map((c) => (
              <li key={c.id} className="flex items-center gap-2 py-2 text-sm">
                <span className={`flex-1 ${c.active ? '' : 'text-ink-faint line-through'}`}>
                  {c.name}{c.city ? <span className="text-ink-muted"> · {c.city}</span> : null}
                  {c.unverified && <span className="chip ml-2 bg-gold-soft text-[#6b4f00]">belum diperiksa</span>}
                </span>
                <button type="button" className="text-xs font-semibold text-academic hover:underline" onClick={() => rename(c)}>Ganti nama</button>
                <button type="button" className="text-xs font-semibold text-ink-muted hover:underline" onClick={() => run(() => pb.collection('campuses').update(c.id, { active: !c.active }), 'Tersimpan.')}>{c.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
              </li>
            ))}
            {!shown.length && <li className="py-3 text-sm text-ink-muted">Tidak ada yang cocok.</li>}
          </ul>
          {shown.length > 300 && <p className="text-xs text-ink-muted">Menampilkan 300 pertama. Persempit dengan filter atau pencarian.</p>}
        </section>

        <div className="space-y-4">
          <section className="card space-y-3 p-4">
            <h3 className="font-display font-semibold">Tambah kampus</h3>
            <select className="input" value={add.program} onChange={(e) => setAdd((a) => ({ ...a, program: e.target.value }))} aria-label="Program studi"><option value="">Pilih program studi</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <div className="flex gap-2">
              <input className="input" placeholder="Institusi, mis. Universitas Contoh" value={add.institution} onChange={(e) => setAdd((a) => ({ ...a, institution: e.target.value }))} />
              <input className="input w-36" placeholder="Kota" value={add.city} onChange={(e) => setAdd((a) => ({ ...a, city: e.target.value }))} />
            </div>
            <button type="button" className="btn-primary btn-sm" onClick={addCampus}><Plus size={15} /> Tambah</button>
          </section>

          <section className="card space-y-3 p-4">
            <h3 className="font-display font-semibold">Tempel daftar kampus</h3>
            <p className="text-sm text-ink-muted">Untuk satu program studi. Satu baris satu kampus: <code>Institusi | Kota | ptn/pts</code> (kota dan jenis boleh kosong). Yang sudah ada dilewati.</p>
            <select className="input" value={bulk.program} onChange={(e) => setBulk((b) => ({ ...b, program: e.target.value }))} aria-label="Program studi untuk daftar"><option value="">Pilih program studi</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <textarea className="input min-h-[8rem] font-mono text-[13px]" placeholder={'Universitas Contoh | Kota | ptn\nPoliteknik Kesehatan Contoh | Kota | pts'} value={bulk.text} onChange={(e) => setBulk((b) => ({ ...b, text: e.target.value }))} />
            <button type="button" className="btn-secondary btn-sm" disabled={!bulk.program || !bulk.text.trim()} onClick={() => run(() => api('admin/campuses/bulk', { method: 'POST', body: bulk }), (r) => `${r.added} kampus ditambahkan, ${r.skipped} sudah ada${r.invalid?.length ? `, ${r.invalid.length} baris dilewati (nama tidak valid)` : ''}.`).then((r) => { if (r) setBulk((b) => ({ ...b, text: '' })); })}>Tambahkan</button>
          </section>

          <section className="card space-y-3 p-4">
            <h3 className="flex items-center gap-2 font-display font-semibold"><GitMerge size={18} /> Gabungkan dua kampus</h3>
            <p className="text-sm text-ink-muted">Pengguna, pengajuan, soal, dan pengumuman kampus pertama dipindah ke kampus kedua, lalu kampus pertama dihapus. Hanya untuk prodi yang sama.</p>
            <select className="input" value={merge.from} onChange={(e) => setMerge((m) => ({ ...m, from: e.target.value }))} aria-label="Kampus yang digabung"><option value="">Kampus yang digabung (dihapus)</option>{list.map((c) => <option key={c.id} value={c.id}>{label(c)}</option>)}</select>
            <select className="input" value={merge.into} onChange={(e) => setMerge((m) => ({ ...m, into: e.target.value }))} aria-label="Kampus tujuan"><option value="">Kampus tujuan</option>{list.filter((c) => !merge.from || c.program === list.find((x) => x.id === merge.from)?.program).map((c) => <option key={c.id} value={c.id}>{label(c)}</option>)}</select>
            <button type="button" className="btn-secondary" disabled={!merge.from || !merge.into || merge.from === merge.into} onClick={() => { if (window.confirm('Gabungkan sekarang? Tidak bisa dibatalkan.')) run(() => api('admin/campuses/merge', { method: 'POST', body: merge }), 'Kampus digabungkan.').then(() => setMerge({ from: '', into: '' })); }}>Gabungkan</button>
          </section>

          <section className="card space-y-3 p-4">
            <h3 className="font-display font-semibold">Program studi ({programs.length})</h3>
            <form onSubmit={(e) => { e.preventDefault(); const n = newProgram.trim(); if (n) run(() => pb.collection('programs').create({ name: n, active: true, unverified: false, order: programs.length + 1 }), `${n} ditambahkan.`).then(() => setNewProgram('')); }} className="flex gap-2">
              <input className="input" placeholder="Nama program studi baru" value={newProgram} onChange={(e) => setNewProgram(e.target.value)} />
              <button type="submit" className="btn-primary btn-sm"><Plus size={15} /> Tambah</button>
            </form>
            <ul className="max-h-60 divide-y divide-line overflow-y-auto text-sm">
              {programs.map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-1.5">
                  <span className={`flex-1 ${p.active ? '' : 'text-ink-faint line-through'}`}>{p.name} <span className="text-ink-muted">({counts[p.id] || 0})</span>{p.unverified && <span className="chip ml-2 bg-gold-soft text-[#6b4f00]">belum diperiksa</span>}</span>
                  <button type="button" className="text-xs font-semibold text-academic hover:underline" onClick={() => renameProgram(p)}>Ganti nama</button>
                  <button type="button" className="text-xs font-semibold text-ink-muted hover:underline" onClick={() => run(() => pb.collection('programs').update(p.id, { active: !p.active }), 'Tersimpan.')}>{p.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-line pt-3">
              <p className="text-sm font-semibold">Gabungkan dua program studi</p>
              <p className="text-sm text-ink-muted">Kampus kembar di prodi tujuan ikut tergabung; sisanya dipindah.</p>
              <select className="input" value={pmerge.from} onChange={(e) => setPmerge((m) => ({ ...m, from: e.target.value }))} aria-label="Prodi yang digabung"><option value="">Prodi yang digabung (dihapus)</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <select className="input" value={pmerge.into} onChange={(e) => setPmerge((m) => ({ ...m, into: e.target.value }))} aria-label="Prodi tujuan"><option value="">Prodi tujuan</option>{programs.filter((p) => p.id !== pmerge.from).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <button type="button" className="btn-secondary btn-sm" disabled={!pmerge.from || !pmerge.into} onClick={() => { if (window.confirm('Gabungkan prodi sekarang? Tidak bisa dibatalkan.')) run(() => api('admin/programs/merge', { method: 'POST', body: pmerge }), (r) => `Digabung ke ${r.into}: ${r.movedCampuses} kampus dipindah, ${r.mergedCampuses} digabung.`).then(() => setPmerge({ from: '', into: '' })); }}><Check size={14} /> Gabungkan prodi</button>
            </div>
          </section>

          <section className="card space-y-2 p-4">
            <h3 className="font-display font-semibold">Akun lama dengan isian Lainnya</h3>
            <p className="text-sm text-ink-muted">Akun yang mendaftar sebelum ada pilihan prodi dan menulis kampusnya sendiri. Mereka bisa memilih ulang di Profil.</p>
            {!others.length ? <p className="text-sm text-ink-muted">Tidak ada.</p> : (
              <ul className="space-y-1 text-sm">
                {others.map((o) => <li key={o.name}>{o.name} <span className="text-ink-muted">({o.count})</span></li>)}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
