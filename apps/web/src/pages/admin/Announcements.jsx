import { Pencil, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import CampusMulti from '@/components/admin/CampusMulti';
import { Html } from '@/components/RichContent';
import { Alert, Badge, EmptyState, Field, Modal, PageLoader } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { driveToLh3 } from '@/lib/markup';
import pb from '@/lib/pb';
import { fmtDate } from '@/lib/time';

// Waktu PocketBase (UTC) <-> isian datetime-local (waktu perangkat admin).
const toInput = (s) => {
  if (!s) return '';
  const d = new Date(String(s).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromInput = (s) => (s ? new Date(s).toISOString().replace('T', ' ') : '');

function Form({ initial, onClose, onSaved }) {
  const [f, setF] = useState({
    title: initial?.title || '', body: initial?.body || '', imageUrl: initial?.imageUrl || '', target: initial?.target || 'all', campuses: initial?.campuses || [],
    startAt: toInput(initial?.startAt), endAt: toInput(initial?.endAt), active: initial ? initial.active : true, order: initial?.order || 0,
  });
  const [error, setError] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    setError('');
    const body = { ...f, startAt: fromInput(f.startAt), endAt: fromInput(f.endAt), campuses: f.target === 'campuses' ? f.campuses : [] };
    try {
      if (initial) await pb.collection('announcements').update(initial.id, body);
      else await pb.collection('announcements').create(body);
      onSaved();
    } catch (e) { setError(errorText(e)); }
  };
  return (
    <Modal open size="lg" title={initial ? 'Ubah pengumuman' : 'Pengumuman baru'} onClose={onClose} footer={<>
      <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
      <button type="button" className="btn-primary" onClick={save} disabled={!f.title.trim()}>Simpan</button>
    </>}>
      <div className="space-y-3">
        <Field label="Judul" htmlFor="an-t"><input id="an-t" className="input" value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Teks" htmlFor="an-b" hint="Boleh **tebal**, tautan, dan pindah baris."><textarea id="an-b" className="input min-h-[100px]" value={f.body} onChange={(e) => set('body', e.target.value)} /></Field>
        <Field label="Gambar (opsional), misalnya kode QR donasi" htmlFor="an-i" hint="Tempel tautan Google Drive atau gambar. Web tidak memproses pembayaran."><input id="an-i" className="input" value={f.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} /></Field>
        {f.imageUrl && <img src={driveToLh3(f.imageUrl)} alt="" referrerPolicy="no-referrer" className="max-h-40 rounded-lg border border-line" />}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mulai tampil" htmlFor="an-s"><input id="an-s" type="datetime-local" className="input" value={f.startAt} onChange={(e) => set('startAt', e.target.value)} /></Field>
          <Field label="Berakhir (opsional)" htmlFor="an-e"><input id="an-e" type="datetime-local" className="input" value={f.endAt} onChange={(e) => set('endAt', e.target.value)} /></Field>
        </div>
        <Field label="Target" htmlFor="an-tg"><select id="an-tg" className="input" value={f.target} onChange={(e) => set('target', e.target.value)}><option value="all">Semua pengguna</option><option value="campuses">Kampus tertentu</option></select></Field>
        {f.target === 'campuses' && <CampusMulti value={f.campuses} onChange={(v) => set('campuses', v)} />}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} /> Aktif</label>
        <Alert>{error}</Alert>
      </div>
    </Modal>
  );
}

export default function Announcements() {
  const [items, setItems] = useState(null);
  const [stats, setStats] = useState({});
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');
  const load = () => {
    pb.collection('announcements').getFullList({ sort: '-created' }).then(setItems).catch((e) => setError(errorText(e)));
    api('admin/announcements/stats').then((d) => setStats(d.dismissed)).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  const toggle = async (a) => { try { await pb.collection('announcements').update(a.id, { active: !a.active }); load(); } catch (e) { setError(errorText(e)); } };
  const remove = async (a) => { if (window.confirm(`Hapus pengumuman "${a.title}"?`)) { await pb.collection('announcements').delete(a.id); load(); } };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Pengumuman</h1>
          <p className="mt-1 text-sm text-ink-muted">Tampil sebagai pop-up saat pengguna masuk, sampai pengguna menekan tombol silang.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setEdit('new')}><Plus size={18} /> Pengumuman baru</button>
      </div>
      <Alert>{error}</Alert>
      {!items ? <PageLoader /> : !items.length ? <EmptyState title="Belum ada pengumuman" /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="flex items-start gap-2">
                <p className="flex-1 font-semibold">{a.title}</p>
                <Badge className={a.active ? 'bg-brand-soft text-brand-dark' : 'bg-page text-ink-muted'}>{a.active ? 'Aktif' : 'Nonaktif'}</Badge>
              </div>
              {a.body && <Html as="div" text={a.body} className="rich mt-1 line-clamp-3 text-sm text-ink-muted" />}
              <p className="mt-2 text-xs text-ink-muted">{a.target === 'all' ? 'Semua pengguna' : `${a.campuses.length} kampus`} · {a.startAt ? `mulai ${fmtDate(a.startAt)}` : 'mulai sekarang'}{a.endAt ? ` sampai ${fmtDate(a.endAt)}` : ''} · ditutup oleh <b>{stats[a.id] || 0}</b> pengguna</p>
              <div className="mt-3 flex gap-2">
                <button type="button" className="btn-secondary btn-sm" onClick={() => setEdit(a)}><Pencil size={14} /> Ubah</button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => toggle(a)}>{a.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                <button type="button" className="btn-ghost btn-sm text-coral" onClick={() => remove(a)}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {edit && <Form initial={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}
