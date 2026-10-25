import { Languages, Pencil, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CampusMulti from '@/components/admin/CampusMulti';
import ImportPanel from '@/components/admin/ImportPanel';
import QuestionEditor from '@/components/admin/QuestionEditor';
import EnglishExplanationEditor from '@/components/admin/EnglishExplanationEditor';
import EnglishSourceExport from '@/components/admin/EnglishSourceExport';
import { useCatalog } from '@/components/admin/useCatalog';
import { Alert, Badge, Modal, PageLoader, Tabs } from '@/components/ui';
import { api } from '@/lib/api';
import { DIFF, DIFF_CLASS, QTYPE } from '@/lib/labels';

export default function Questions() {
  const [params, setParams] = useSearchParams();
  const { subjects, chapterChoicesOf } = useCatalog();
  const [tab, setTab] = useState('list');
  const [f, setF] = useState({ subject: params.get('subject') || '', chapter: params.get('chapter') || '', difficulty: '', qtype: '', status: '', scope: '', q: '', id: params.get('id') || '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [sel, setSel] = useState(new Set());
  const [edit, setEdit] = useState(null); // 'new' | record
  const [english, setEnglish] = useState(null);
  const [bulk, setBulk] = useState(null); // aksi massal yang butuh pilihan
  const [bulkVal, setBulkVal] = useState({ chapter: '', difficulty: 'medium', scope: 'all', campuses: [] });

  const load = async () => {
    setError('');
    try {
      const d = await api('admin/questions', { query: { ...f, page, perPage: 30 } });
      setData(d);
      if (f.id && d.items[0]) { setEdit(d.items[0]); setF((x) => ({ ...x, id: '' })); setParams({}); }
    } catch (e) { setError(e.message); }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.subject, f.chapter, f.difficulty, f.qtype, f.status, f.scope, page]);

  const set = (k, v) => { setF((x) => ({ ...x, [k]: v, ...(k === 'subject' ? { chapter: '' } : {}) })); setPage(1); setSel(new Set()); };
  const toggle = (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const doBulk = async (action, extra = {}) => {
    if (action === 'delete' && !window.confirm(`Hapus ${sel.size} soal? Riwayat jawaban untuk soal ini ikut terhapus.`)) return;
    try {
      await api('admin/questions/bulk', { method: 'POST', body: { ids: [...sel], action, ...extra } });
      setSel(new Set()); setBulk(null); load();
    } catch (e) { setError(e.message); }
  };
  const subjName = (id) => subjects.find((s) => s.id === id)?.name || '';
  const chTitle = (sid, cid) => chapterChoicesOf(sid).find((c) => c.id === cid)?.title || '';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="page-title">Edit Soal</h1>
        <button type="button" className="btn-primary" onClick={() => setEdit('new')}><Plus size={18} /> Tambah soal</button>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'list', label: 'Daftar soal' }, { value: 'import', label: 'Impor massal (JSON)' }, { value: 'english', label: 'Terjemahan Inggris' }]} />

      {tab === 'english' ? <EnglishSourceExport /> : tab === 'import' ? <div className="card p-5"><ImportPanel onDone={() => load()} /></div> : (
        <>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
            <select className="input py-2" value={f.subject} onChange={(e) => set('subject', e.target.value)} aria-label="Mata kuliah"><option value="">Semua mata kuliah</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <select className="input py-2" value={f.chapter} onChange={(e) => set('chapter', e.target.value)} disabled={!f.subject} aria-label="BAB"><option value="">Semua BAB</option>{chapterChoicesOf(f.subject).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
            <select className="input py-2" value={f.qtype} onChange={(e) => set('qtype', e.target.value)} aria-label="Tipe"><option value="">Semua tipe</option>{Object.entries(QTYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <select className="input py-2" value={f.difficulty} onChange={(e) => set('difficulty', e.target.value)} aria-label="Tingkat"><option value="">Semua tingkat</option>{Object.entries(DIFF).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <select className="input py-2" value={f.status} onChange={(e) => set('status', e.target.value)} aria-label="Status"><option value="">Tayang & draf</option><option value="published">Tayang</option><option value="draft">Draf</option></select>
            <select className="input py-2" value={f.scope} onChange={(e) => set('scope', e.target.value)} aria-label="Kampus"><option value="">General & terbatas</option><option value="all">Soal General</option><option value="campus">Terbatas kampus</option></select>
            <form onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}><input className="input py-2" placeholder="Cari teks / kode" value={f.q} onChange={(e) => setF((x) => ({ ...x, q: e.target.value }))} aria-label="Cari" /></form>
          </div>

          {sel.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-academic-soft p-3 text-sm">
              <b>{sel.size} dipilih</b>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setBulk('move')}>Pindah BAB</button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setBulk('difficulty')}>Ubah tingkat</button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setBulk('scope')}>Ubah pembatasan kampus</button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => doBulk('publish')}>Tayangkan</button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => doBulk('draft')}>Jadikan draf</button>
              <button type="button" className="btn-ghost btn-sm text-coral" onClick={() => doBulk('delete')}>Hapus</button>
              <button type="button" className="btn-ghost btn-sm ml-auto" onClick={() => setSel(new Set())}>Batal pilih</button>
            </div>
          )}
          <Alert>{error}</Alert>
          {!data ? <PageLoader /> : (
            <div className="card overflow-hidden">
              <div className="scroll-x">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-page text-left text-xs text-ink-muted">
                    <tr>
                      <th className="w-10 p-3"><input type="checkbox" aria-label="Pilih semua" checked={data.items.length > 0 && data.items.every((q) => sel.has(q.id))} onChange={(e) => setSel(e.target.checked ? new Set(data.items.map((q) => q.id)) : new Set())} /></th>
                      <th className="p-3">Soal</th><th className="p-3">BAB</th><th className="p-3">Tipe</th><th className="p-3">Tingkat</th><th className="p-3">Kampus</th><th className="p-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.items.map((q) => (
                      <tr key={q.id} className="hover:bg-page">
                        <td className="p-3"><input type="checkbox" checked={sel.has(q.id)} onChange={() => toggle(q.id)} aria-label="Pilih soal" /></td>
                        <td className="max-w-md p-3">
                          <p className="line-clamp-2">{q.stemPlain || '(kosong)'}</p>
                          <p className="text-xs text-ink-faint">{q.code ? `${q.code} · ` : ''}{q.source === 'submission' ? 'dari pengajuan' : q.source === 'agent' ? 'via Hermes' : 'admin'}{q.status === 'draft' ? ' · DRAF' : ''}</p>
                          <p className="mt-1 text-xs text-ink-muted">Inggris: {({ empty: 'belum dibuat', draft: 'draf', reviewed: 'sudah diperiksa', stale: 'perlu diperiksa ulang' })[q.englishStatus] || 'belum dibuat'}</p>
                        </td>
                        <td className="p-3 text-xs">{subjName(q.subject)}<br /><span className="text-ink-muted">{chTitle(q.subject, q.chapter)}</span></td>
                        <td className="p-3">{QTYPE[q.qtype]}{q.answer ? ` · ${q.answer}` : ''}</td>
                        <td className="p-3"><Badge className={DIFF_CLASS[q.difficulty]}>{DIFF[q.difficulty]}</Badge></td>
                        <td className="p-3 text-xs">{q.scope === 'all' ? 'General' : `${q.campuses.length} kampus`}</td>
                        <td className="p-3"><div className="flex flex-wrap gap-1"><button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(q)} aria-label="Ubah soal"><Pencil size={15} /></button><button type="button" className="btn-ghost btn-sm" onClick={() => setEnglish(q.id)} aria-label="Versi Inggris" title="Versi Inggris"><Languages size={16} /></button></div></td>
                      </tr>
                    ))}
                    {!data.items.length && <tr><td colSpan={7} className="p-6 text-center text-ink-muted">Belum ada soal di filter ini.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-line p-3 text-sm">
                <span className="text-ink-muted">{data.totalItems} soal</span>
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</button>
                  <span className="self-center">Hal. {page} / {Math.max(1, Math.ceil(data.totalItems / data.perPage))}</span>
                  <button type="button" className="btn-secondary btn-sm" disabled={page * data.perPage >= data.totalItems} onClick={() => setPage((p) => p + 1)}>Berikutnya</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {edit && <QuestionEditor record={edit === 'new' ? null : edit} defaults={{ subject: f.subject, chapter: f.chapter }} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {english && <EnglishExplanationEditor questionId={english} onClose={() => { setEnglish(null); load(); }} />}
      {bulk && (
        <Modal open size="sm" title={bulk === 'move' ? 'Pindah ke BAB' : bulk === 'difficulty' ? 'Ubah tingkat kesulitan' : 'Ubah pembatasan kampus'} onClose={() => setBulk(null)} footer={<>
          <button type="button" className="btn-ghost" onClick={() => setBulk(null)}>Batal</button>
          <button type="button" className="btn-primary" onClick={() => doBulk(bulk, bulkVal)}>Terapkan ke {sel.size} soal</button>
        </>}>
          {bulk === 'move' && (
            <select className="input" value={bulkVal.chapter} onChange={(e) => setBulkVal((b) => ({ ...b, chapter: e.target.value }))} aria-label="BAB tujuan">
              <option value="">Pilih BAB tujuan</option>
              {subjects.map((s) => <optgroup key={s.id} label={s.name}>{chapterChoicesOf(s.id).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</optgroup>)}
            </select>
          )}
          {bulk === 'difficulty' && (
            <select className="input" value={bulkVal.difficulty} onChange={(e) => setBulkVal((b) => ({ ...b, difficulty: e.target.value }))} aria-label="Tingkat">{Object.entries(DIFF).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          )}
          {bulk === 'scope' && (
            <div className="space-y-3">
              <select className="input" value={bulkVal.scope} onChange={(e) => setBulkVal((b) => ({ ...b, scope: e.target.value }))} aria-label="Pembatasan"><option value="all">Soal General (semua pengguna)</option><option value="campus">Hanya kampus tertentu</option></select>
              {bulkVal.scope === 'campus' && <CampusMulti value={bulkVal.campuses} onChange={(v) => setBulkVal((b) => ({ ...b, campuses: v }))} />}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
