import { Pencil, Plus, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCatalog } from '@/components/admin/useCatalog';
import { Alert, Badge, EmptyState, Field, Modal } from '@/components/ui';
import { errorText } from '@/lib/api';
import pb from '@/lib/pb';

function Form({ initial, subjects, chaptersOf, onClose, onSaved }) {
  const [f, setF] = useState({ subject: initial?.subject || subjects[0]?.id || '', name: initial?.name || '', description: initial?.description || '', perChapter: initial?.perChapter ?? 5, total: initial?.total ?? 100, timerMinutes: initial?.timerMinutes ?? 0, active: initial ? initial.active : true, order: initial?.order ?? 0 });
  const [quotas, setQuotas] = useState(() => Object.fromEntries((initial?.quotas || []).map((q) => [q.chapter, q.count])));
  const [error, setError] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const chs = chaptersOf(f.subject);
  const est = chs.reduce((t, c) => t + (quotas[c.id] !== undefined && quotas[c.id] !== '' ? Number(quotas[c.id]) : Number(f.perChapter)), 0);
  const save = async () => {
    setError('');
    const body = { ...f, perChapter: Number(f.perChapter), total: Number(f.total), timerMinutes: Number(f.timerMinutes), quotas: Object.entries(quotas).filter(([, v]) => v !== '' && v !== undefined).map(([chapter, count]) => ({ chapter, count: Number(count) })) };
    try {
      if (initial) await pb.collection('packages').update(initial.id, body);
      else await pb.collection('packages').create(body);
      onSaved();
    } catch (e) { setError(errorText(e)); }
  };
  return (
    <Modal open size="lg" title={initial ? 'Ubah paket' : 'Paket baru'} onClose={onClose} footer={<>
      <span className="mr-auto self-center text-sm text-ink-muted">Perkiraan isi: {Math.min(est, Number(f.total) || est)} soal</span>
      <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
      <button type="button" className="btn-primary" onClick={save} disabled={!f.name.trim() || !f.subject}>Simpan</button>
    </>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mata kuliah" htmlFor="pk-s"><select id="pk-s" className="input" value={f.subject} onChange={(e) => { set('subject', e.target.value); setQuotas({}); }}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Nama paket" htmlFor="pk-n"><input id="pk-n" className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Paket 100" /></Field>
        </div>
        <Field label="Deskripsi" htmlFor="pk-d"><input id="pk-d" className="input" value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Soal per BAB" htmlFor="pk-p"><input id="pk-p" type="number" min={0} className="input" value={f.perChapter} onChange={(e) => set('perChapter', e.target.value)} /></Field>
          <Field label="Total maks." htmlFor="pk-t"><input id="pk-t" type="number" min={0} className="input" value={f.total} onChange={(e) => set('total', e.target.value)} /></Field>
          <Field label="Waktu (menit)" htmlFor="pk-w"><input id="pk-w" type="number" min={0} className="input" value={f.timerMinutes} onChange={(e) => set('timerMinutes', e.target.value)} /></Field>
        </div>
        <div>
          <p className="label">Kuota khusus per BAB (kosong = ikut "soal per BAB")</p>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
            {chs.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{c.title}</span>
                <input type="number" min={0} className="input w-20 py-1" placeholder={String(f.perChapter)} value={quotas[c.id] ?? ''} onChange={(e) => setQuotas((q) => ({ ...q, [c.id]: e.target.value }))} />
              </label>
            ))}
            {!chs.length && <p className="text-sm text-ink-muted">Mata kuliah ini belum punya BAB.</p>}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} /> Aktif</label>
        <Alert>{error}</Alert>
      </div>
    </Modal>
  );
}

export default function Packages() {
  const { subjects, chaptersOf } = useCatalog();
  const [items, setItems] = useState([]);
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const load = () => pb.collection('packages').getFullList({ sort: 'subject,order,name' }).then(setItems).catch((e) => setError(errorText(e)));
  useEffect(() => { load(); }, []);
  const subjName = (id) => subjects.find((s) => s.id === id)?.name || '';

  // Paket awal PRD: 100, 150, 200 soal untuk tiap mata kuliah yang belum punya.
  const seed = async () => {
    setError('');
    try {
      for (const s of subjects) {
        const n = chaptersOf(s.id).length || 1;
        for (const [i, total] of [100, 150, 200].entries()) {
          if (items.some((p) => p.subject === s.id && p.name === `Paket ${total}`)) continue;
          await pb.collection('packages').create({ subject: s.id, name: `Paket ${total}`, total, perChapter: Math.max(1, Math.ceil(total / n)), timerMinutes: Math.round(total * 1.2), active: true, order: i + 1 });
        }
      }
      load();
    } catch (e) { setError(errorText(e)); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Paket simulasi</h1>
          <p className="mt-1 text-sm text-ink-muted">Paket berupa aturan kuota per BAB. Soalnya dipilih saat pengguna mulai, dari soal yang belum pernah ia kerjakan.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={seed} disabled={!subjects.length}><Wand2 size={16} /> Buat Paket 100/150/200</button>
          <button type="button" className="btn-primary" onClick={() => setEdit('new')} disabled={!subjects.length}><Plus size={18} /> Paket baru</button>
        </div>
      </div>
      <Alert>{error}</Alert>
      {!items.length ? <EmptyState title="Belum ada paket">Tekan "Buat Paket 100/150/200" untuk membuat paket awal di tiap mata kuliah, lalu sesuaikan kuotanya.</EmptyState> : (
        <div className="card divide-y divide-line">
          {items.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{p.name} <span className="font-normal text-ink-muted">· {subjName(p.subject)}</span></p>
                <p className="text-xs text-ink-muted">{p.perChapter} soal/BAB · maks. {p.total || 'tanpa batas'} · {p.timerMinutes ? `${p.timerMinutes} menit` : 'tanpa batas waktu'} · {(p.quotas || []).length} kuota khusus</p>
              </div>
              <Badge className={p.active ? 'bg-brand-soft text-brand-dark' : 'bg-page text-ink-muted'}>{p.active ? 'Aktif' : 'Nonaktif'}</Badge>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(p)}><Pencil size={15} /></button>
              <button type="button" className="btn-ghost btn-sm text-coral" onClick={async () => { if (window.confirm(`Hapus ${p.name}?`)) { await pb.collection('packages').delete(p.id); load(); } }}>Hapus</button>
            </div>
          ))}
        </div>
      )}
      {edit && <Form initial={edit === 'new' ? null : edit} subjects={subjects} chaptersOf={chaptersOf} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}
