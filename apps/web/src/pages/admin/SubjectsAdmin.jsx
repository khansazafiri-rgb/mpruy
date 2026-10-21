import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog } from '@/components/admin/useCatalog';
import Illustration, { ILLUSTRATION_KEYS } from '@/components/Illustration';
import { Alert, Field, Modal } from '@/components/ui';
import { errorText } from '@/lib/api';
import pb from '@/lib/pb';

const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function SubjectForm({ initial, count, onClose, onSaved }) {
  const [f, setF] = useState({ name: initial?.name || '', slug: initial?.slug || '', description: initial?.description || '', illustrationKey: initial?.illustrationKey || 'umum', order: initial?.order ?? count + 1, hidden: !!initial?.hidden });
  const [file, setFile] = useState(null);
  const [removeImg, setRemoveImg] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    setError('');
    const fd = new FormData();
    Object.entries({ ...f, slug: f.slug || slugify(f.name) }).forEach(([k, v]) => fd.append(k, String(v)));
    if (file) fd.append('illustration', file);
    if (removeImg) fd.append('illustration', '');
    try {
      if (initial) await pb.collection('subjects').update(initial.id, fd);
      else await pb.collection('subjects').create(fd);
      onSaved();
    } catch (e) { setError(errorText(e)); }
  };
  const preview = { ...initial, ...f, illustration: removeImg ? '' : initial?.illustration };
  return (
    <Modal open title={initial ? 'Ubah mata kuliah' : 'Mata kuliah baru'} onClose={onClose} footer={<>
      <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
      <button type="button" className="btn-primary" onClick={save} disabled={!f.name.trim()}>Simpan</button>
    </>}>
      <div className="space-y-3">
        <Field label="Nama" htmlFor="sb-n"><input id="sb-n" className="input" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Slug (alamat halaman)" htmlFor="sb-s" hint={`medcoel.com/mata-kuliah/${f.slug || slugify(f.name) || '...'}`}><input id="sb-s" className="input" value={f.slug} onChange={(e) => set('slug', slugify(e.target.value))} placeholder={slugify(f.name)} /></Field>
        <Field label="Deskripsi singkat" htmlFor="sb-d"><input id="sb-d" className="input" maxLength={400} value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="flex items-start gap-4">
          {file ? <img src={URL.createObjectURL(file)} alt="" className="h-24 w-24 rounded-xl object-cover" /> : <Illustration subject={preview} className="h-24 w-24 rounded-xl" />}
          <div className="flex-1 space-y-2">
            <Field label="Ilustrasi bawaan (dipakai bila belum ada file)" htmlFor="sb-k">
              <select id="sb-k" className="input" value={f.illustrationKey} onChange={(e) => set('illustrationKey', e.target.value)}>{ILLUSTRATION_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
            </Field>
            <label className="btn-secondary btn-sm cursor-pointer">Unggah ilustrasi (PNG/JPG/WebP/SVG, maks 2 MB)<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => { setFile(e.target.files?.[0] || null); setRemoveImg(false); }} /></label>
            {initial?.illustration && !file && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={removeImg} onChange={(e) => setRemoveImg(e.target.checked)} /> Hapus ilustrasi yang diunggah</label>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Urutan" htmlFor="sb-o"><input id="sb-o" type="number" className="input" value={f.order} onChange={(e) => set('order', Number(e.target.value))} /></Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={f.hidden} onChange={(e) => set('hidden', e.target.checked)} /> Sembunyikan dari pengguna</label>
        </div>
        <Alert>{error}</Alert>
      </div>
    </Modal>
  );
}

export default function SubjectsAdmin() {
  const { subjects, chaptersOf, reload } = useCatalog();
  const [edit, setEdit] = useState(null);
  const [open, setOpen] = useState('');
  const [newCh, setNewCh] = useState('');
  const [error, setError] = useState('');
  const run = async (fn) => { setError(''); try { await fn(); await reload(); } catch (e) { setError(errorText(e)); } };

  const addChapter = (sid) => run(async () => {
    if (!newCh.trim()) return;
    await pb.collection('chapters').create({ subject: sid, title: newCh.trim(), order: chaptersOf(sid).length + 1, hidden: false });
    setNewCh('');
  });
  const move = (sid, idx, dir) => run(async () => {
    const list = chaptersOf(sid);
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const reordered = [...list];
    [reordered[idx], reordered[j]] = [reordered[j], reordered[idx]];
    await Promise.all(reordered.map((c, i) => (c.order !== i + 1 ? pb.collection('chapters').update(c.id, { order: i + 1 }) : null)));
  });
  const rename = (c) => { const t = window.prompt('Nama BAB', c.title); if (t && t.trim()) run(() => pb.collection('chapters').update(c.id, { title: t.trim() })); };
  const removeCh = (c) => { if (window.confirm(`Hapus BAB "${c.title}" beserta SEMUA soalnya?`)) run(() => pb.collection('chapters').delete(c.id)); };
  const removeSubject = (s) => { if (window.confirm(`Hapus mata kuliah "${s.name}"? Semua BAB dan soalnya ikut terhapus. Biasanya cukup disembunyikan.`)) run(() => pb.collection('subjects').delete(s.id)); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="page-title">Mata kuliah & BAB</h1>
        <button type="button" className="btn-primary" onClick={() => setEdit('new')}><Plus size={18} /> Mata kuliah baru</button>
      </div>
      <Alert>{error}</Alert>
      <div className="space-y-3">
        {subjects.map((s) => {
          const chs = chaptersOf(s.id);
          return (
            <div key={s.id} className="card">
              <div className="flex flex-wrap items-center gap-3 p-3">
                <Illustration subject={s} className="h-14 w-14 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold">{s.name} {s.hidden && <span className="chip bg-page text-ink-muted">tersembunyi</span>}</p>
                  <p className="text-xs text-ink-muted">/{s.slug} · urutan {s.order} · {chs.length} BAB</p>
                </div>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setOpen(open === s.id ? '' : s.id)}>{open === s.id ? 'Tutup BAB' : 'Kelola BAB'}</button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(s)} aria-label="Ubah"><Pencil size={15} /></button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => run(() => pb.collection('subjects').update(s.id, { hidden: !s.hidden }))} aria-label={s.hidden ? 'Tampilkan' : 'Sembunyikan'}>{s.hidden ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                <button type="button" className="btn-ghost btn-sm text-coral" onClick={() => removeSubject(s)} aria-label="Hapus"><Trash2 size={15} /></button>
              </div>
              {open === s.id && (
                <div className="border-t border-line p-3">
                  <ul className="divide-y divide-line">
                    {chs.map((c, i) => (
                      <li key={c.id} className="flex items-center gap-2 py-2">
                        <span className="w-6 text-xs text-ink-muted">{i + 1}</span>
                        <span className={`flex-1 ${c.hidden ? 'text-ink-faint line-through' : ''}`}>{c.title}</span>
                        <Link to={`/admin/soal?subject=${s.id}`} className="text-xs font-semibold text-academic hover:underline">soal</Link>
                        <button type="button" className="rounded p-1 hover:bg-page" onClick={() => move(s.id, i, -1)} aria-label="Naik"><ArrowUp size={15} /></button>
                        <button type="button" className="rounded p-1 hover:bg-page" onClick={() => move(s.id, i, 1)} aria-label="Turun"><ArrowDown size={15} /></button>
                        <button type="button" className="rounded p-1 hover:bg-page" onClick={() => rename(c)} aria-label="Ganti nama"><Pencil size={15} /></button>
                        <button type="button" className="rounded p-1 hover:bg-page" onClick={() => run(() => pb.collection('chapters').update(c.id, { hidden: !c.hidden }))} aria-label={c.hidden ? 'Tampilkan' : 'Sembunyikan'}>{c.hidden ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                        <button type="button" className="rounded p-1 text-coral hover:bg-page" onClick={() => removeCh(c)} aria-label="Hapus BAB"><Trash2 size={15} /></button>
                      </li>
                    ))}
                  </ul>
                  <form onSubmit={(e) => { e.preventDefault(); addChapter(s.id); }} className="mt-2 flex gap-2">
                    <input className="input py-2" placeholder="Nama BAB baru" value={newCh} onChange={(e) => setNewCh(e.target.value)} />
                    <button type="submit" className="btn-primary btn-sm">Tambah</button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {edit && <SubjectForm initial={edit === 'new' ? null : edit} count={subjects.length} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}
