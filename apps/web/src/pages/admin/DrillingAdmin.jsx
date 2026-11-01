// Pengelolaan Drilling. Admin bebas: menyalakan menu, menyembunyikan per mata kuliah, menambah soal
// (impor massal atau satu per satu) langsung di sini, mengelola soal yang sudah ada, dan memakai aksi massal
// per mata kuliah. Semua mata kuliah tampil, juga yang belum punya soal Drilling.
import { Eye, EyeOff, FilePlus2, ListChecks, Plus, Send, Trash2, Undo2, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DrillingAudience from '@/components/admin/DrillingAudience';
import ImportPanel from '@/components/admin/ImportPanel';
import QuestionEditor from '@/components/admin/QuestionEditor';
import { useCatalog } from '@/components/admin/useCatalog';
import { Alert, Badge, Modal, PageLoader } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import pb from '@/lib/pb';

export default function DrillingAdmin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [onlyFilled, setOnlyFilled] = useState(false);
  const [adding, setAdding] = useState(null); // { kind: 'import' | 'one', subject }
  const [audience, setAudience] = useState(''); // id mata kuliah yang panel "siapa yang melihat"-nya terbuka
  const { chaptersOf, reload: reloadCatalog } = useCatalog();
  const load = useCallback(() => api('admin/drilling').then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, done = '') => {
    setBusy(true); setError(''); setNote('');
    try { await fn(); await load(); if (done) setNote(done); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const toggle = () => run(async () => {
    const rec = (await pb.collection('app_settings').getList(1, 1)).items[0];
    await pb.collection('app_settings').update(rec.id, { drillingEnabled: !data.enabled });
  });
  const hideSubject = (s) => run(() => pb.collection('chapters').update(s.chapter, { hidden: !s.hidden }));
  const bulk = (s, action, label, extra = {}) => {
    if (action === 'delete' && !window.confirm(`Hapus SEMUA soal Drilling ${s.name} (${s.published + s.draft} soal)? Riwayat jawaban untuk soal ini ikut terhapus dan tidak bisa dikembalikan.`)) return;
    return run(async () => {
      const r = await api('admin/drilling/bulk', { method: 'POST', body: { subject: s.id, action, ...extra } });
      setNote(`${label}: ${r.count} soal.`);
    });
  };
  const moveAll = (s) => {
    const babs = chaptersOf(s.id);
    if (!babs.length) { setError('Mata kuliah ini belum punya BAB biasa. Buat BAB dulu di Mata Kuliah.'); return; }
    const pick = window.prompt(`Pindahkan semua soal Drilling ${s.name} ke BAB nomor berapa?\n\n${babs.map((c, i) => `${i + 1}. ${c.title}`).join('\n')}`);
    const c = babs[Number(pick) - 1];
    if (c) bulk(s, 'move', `Dipindah ke ${c.title}`, { chapter: c.id });
  };

  const shown = useMemo(() => (data?.subjects || []).filter((s) => (!onlyFilled || s.published + s.draft > 0) && (!q || s.name.toLowerCase().includes(q.toLowerCase()))), [data, q, onlyFilled]);

  if (!data) return error ? <Alert>{error}</Alert> : <PageLoader />;
  const status = data.available ? { cls: 'bg-mint-soft text-brand', label: 'Tampil untuk pengguna' }
    : data.enabled ? { cls: 'bg-gold-soft text-[#6b4f00]', label: 'Menyala, tetapi tersembunyi: belum ada soal Drilling yang tayang' }
      : { cls: 'bg-page text-ink-muted', label: 'Tersembunyi untuk pengguna' };
  const withQuestions = data.subjects.filter((s) => s.published > 0).length;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Drilling</h1>
          <p className="mt-1 text-sm text-ink-muted">Soal per mata kuliah tanpa BAB: General (semua pengguna) atau khusus kampus tertentu. Menu Drilling di sebelah Simulasi tampil untuk pengguna bila sakelar menyala dan ada soal tayang yang bisa mereka lihat (General, atau soal kampusnya). Kamu, sebagai admin, selalu bisa membukanya untuk mencoba.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => setAdding({ kind: 'import', subject: '' })}><FilePlus2 size={18} /> Impor soal Drilling</button>
          <Link to="/drilling" className="btn-secondary">Coba sebagai pengguna</Link>
        </div>
      </div>
      <Alert>{error}</Alert>
      {note && <Alert kind="success">{note}</Alert>}
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
        <dl className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-page p-3"><dt className="text-xs text-ink-muted">Soal tayang</dt><dd className="font-display text-2xl font-bold">{data.published}</dd></div>
          <div className="rounded-xl bg-page p-3"><dt className="text-xs text-ink-muted">Draf</dt><dd className="font-display text-2xl font-bold">{data.drafts}</dd></div>
          <div className="rounded-xl bg-page p-3"><dt className="text-xs text-ink-muted">Mata kuliah berisi</dt><dd className="font-display text-2xl font-bold">{withQuestions}<span className="text-sm font-normal text-ink-muted"> / {data.subjects.length}</span></dd></div>
        </dl>
      </section>
      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-lg font-semibold">Per mata kuliah</h2>
          <input className="input ml-auto w-48 py-2" placeholder="Cari mata kuliah" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari mata kuliah" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand))]" checked={onlyFilled} onChange={(e) => setOnlyFilled(e.target.checked)} /> Hanya yang berisi</label>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {shown.map((s) => (
            <li key={s.id} className="py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[14rem] flex-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-ink-muted">{s.published} tayang{s.draft ? ` · ${s.draft} draf` : ''}{s.hidden ? ' · disembunyikan' : ''}{s.subjectHidden ? ' · mata kuliah disembunyikan' : ''}{s.campusOnly ? ` · ${s.campusOnly} soal khusus kampus (hanya tampil bagi kampus itu)` : ''}</p>
                </div>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setAdding({ kind: 'import', subject: s.id })}><FilePlus2 size={15} /> Impor</button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setAdding({ kind: 'one', subject: s.id })}><Plus size={15} /> Satu soal</button>
                <Link to={`/admin/soal?subject=${s.id}&chapter=${s.chapter}`} className="btn-ghost btn-sm"><ListChecks size={15} /> Kelola soal</Link>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setAudience(audience === s.id ? '' : s.id)} aria-expanded={audience === s.id}><Users size={15} /> Siapa yang melihat</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => hideSubject(s)} disabled={busy}>
                  {s.hidden ? <><Eye size={15} /> Tampilkan</> : <><EyeOff size={15} /> Sembunyikan</>}
                </button>
              </div>
              {audience === s.id && <DrillingAudience subject={s} onChanged={(msg) => { load(); setNote(msg); }} />}
              {(s.published + s.draft > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {s.draft > 0 && <button type="button" className="btn-ghost btn-sm" onClick={() => bulk(s, 'publish', 'Ditayangkan', { status: 'draft' })} disabled={busy}><Send size={14} /> Tayangkan {s.draft} draf</button>}
                  {s.published > 0 && <button type="button" className="btn-ghost btn-sm" onClick={() => bulk(s, 'draft', 'Dijadikan draf', { status: 'published' })} disabled={busy}><Undo2 size={14} /> Jadikan semua draf</button>}
                  <button type="button" className="btn-ghost btn-sm" onClick={() => moveAll(s)} disabled={busy}>Pindah ke BAB biasa</button>
                  <button type="button" className="btn-ghost btn-sm text-coral" onClick={() => bulk(s, 'delete', 'Dihapus')} disabled={busy}><Trash2 size={14} /> Hapus semua</button>
                </div>
              )}
            </li>
          ))}
          {!shown.length && <li className="py-6 text-center text-sm text-ink-muted">Tidak ada mata kuliah yang cocok.</li>}
        </ul>
      </section>

      {adding?.kind === 'import' && (
        <Modal open size="xl" title="Impor soal Drilling" onClose={() => setAdding(null)}>
          <ImportPanel presetSubject={adding.subject} drillingOnly onDone={() => { load(); reloadCatalog(); }} />
        </Modal>
      )}
      {adding?.kind === 'one' && (
        <QuestionEditor
          record={null}
          defaults={{ subject: adding.subject, chapter: data.subjects.find((s) => s.id === adding.subject)?.chapter || '' }}
          onClose={() => setAdding(null)}
          onSaved={() => { setAdding(null); load(); setNote('Soal tersimpan di Drilling.'); }}
        />
      )}
    </div>
  );
}
