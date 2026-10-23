// ADMIN · PENGATURAN > PENDAFTARAN & PROFIL
// Kolom bawaan (WhatsApp, semester), kolom data tambahan (mis. akun TikTok),
// dan langkah bukti komunitas saat daftar. Disimpan di app_settings;
// server membersihkan isinya sebelum dipakai.
import clsx from 'clsx';
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, Badge, Field, Modal } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { errorText } from '@/lib/api';
import pb from '@/lib/pb';

const TYPES = [
  ['text', 'Teks singkat'], ['handle', 'Nama akun (@username)'], ['url', 'Tautan'], ['tel', 'Nomor telepon'], ['number', 'Angka'],
  ['select', 'Pilihan (dropdown)'], ['checkbox', 'Centang (ya/tidak)'], ['date', 'Tanggal'], ['textarea', 'Teks panjang'],
];
const TYPE_LABEL = Object.fromEntries(TYPES);
const WHERE = [['signup', 'Saat daftar dan di Profil'], ['profile', 'Hanya di Profil (diisi belakangan)'], ['admin', 'Hanya admin (tidak terlihat pengguna)']];
const WHERE_LABEL = Object.fromEntries(WHERE);
const MODES = [['required', 'Wajib'], ['optional', 'Opsional'], ['hidden', 'Disembunyikan']];

const FIELD_PRESETS = [
  { label: 'Akun TikTok', key: 'tiktok', type: 'handle', placeholder: 'namaakun', hint: 'Tanpa tanda @.', required: false },
  { label: 'Akun Instagram pribadi', key: 'instagram_pribadi', type: 'handle', placeholder: 'namaakun', required: false },
  { label: 'NIM', key: 'nim', type: 'text', placeholder: 'Nomor induk mahasiswa', required: false },
  { label: 'Angkatan', key: 'angkatan', type: 'number', placeholder: 'mis. 2023', required: false },
  { label: 'Tahu MEDCOEL dari mana?', key: 'sumber_info', type: 'select', options: ['Teman', 'Instagram', 'TikTok', 'Grup WhatsApp angkatan', 'Dosen', 'Lainnya'], required: false },
  { label: 'Catatan admin', key: 'catatan_admin', type: 'textarea', where: 'admin', required: false },
];
const PROOF_PRESETS = [
  { key: 'tiktok', title: 'Ikuti TikTok MEDCOEL', short: 'TikTok', description: 'Video tips belajar dan pembahasan soal singkat ada di TikTok MEDCOEL.', buttonLabel: 'Buka TikTok MEDCOEL', question: 'Sudah mengikuti TikTok MEDCOEL?', url: '', required: false },
];

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'k$1').slice(0, 30);
const blankField = () => ({ key: '', label: '', type: 'text', required: false, placeholder: '', hint: '', options: [], prefix: '@', where: 'signup', editable: true, active: true });
const blankProof = () => ({ key: '', title: '', short: '', description: '', url: '', buttonLabel: '', question: '', required: true, active: true });
const move = (list, i, d) => { const j = i + d; if (j < 0 || j >= list.length) return list; const n = [...list]; [n[i], n[j]] = [n[j], n[i]]; return n; };

export default function SignupSettings() {
  const { refreshSettings } = useAuth();
  const [rec, setRec] = useState(null);
  const [fields, setFields] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [builtin, setBuiltin] = useState({ whatsapp: 'required', semester: 'required' });
  const [editField, setEditField] = useState(null); // { index, value }
  const [editProof, setEditProof] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    pb.collection('app_settings').getList(1, 1).then((r) => {
      const x = r.items[0];
      setRec(x);
      setFields(Array.isArray(x.signupFields) ? x.signupFields : []);
      setProofs(Array.isArray(x.signupProofs) ? x.signupProofs : []);
      setBuiltin({ whatsapp: 'required', semester: 'required', ...(x.signupBuiltin || {}) });
    }).catch((e) => setError(errorText(e)));
  }, []);
  const change = (fn) => (...a) => { fn(...a); setDirty(true); setMsg(''); };
  const setF = change(setFields);
  const setP = change(setProofs);
  const setB = change(setBuiltin);

  const save = async () => {
    setMsg(''); setError('');
    try {
      await pb.collection('app_settings').update(rec.id, { signupFields: fields, signupProofs: proofs, signupBuiltin: builtin });
      await refreshSettings();
      setDirty(false);
      setMsg('Pengaturan pendaftaran tersimpan. Berlaku untuk pendaftar berikutnya.');
    } catch (e) { setError(errorText(e)); }
  };

  if (!rec) return <Alert>{error}</Alert>;
  const usedKeys = (except) => fields.filter((_, i) => i !== except).map((f) => f.key);

  return (
    <div className="space-y-6">
      <section className="card space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Kolom bawaan</h2>
        <p className="text-sm text-ink-muted">Login ID, nama, email, password, dan asal kampus selalu wajib karena dipakai untuk masuk dan hak lihat soal.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[['whatsapp', 'Nomor WhatsApp'], ['semester', 'Semester']].map(([k, l]) => (
            <Field key={k} label={l} htmlFor={`bi-${k}`}>
              <select id={`bi-${k}`} className="input" value={builtin[k]} onChange={(e) => setB({ ...builtin, [k]: e.target.value })}>
                {MODES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </Field>
          ))}
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 font-display text-lg font-semibold">Kolom data tambahan</h2>
          <button type="button" className="btn-primary btn-sm" onClick={() => setEditField({ index: -1, value: blankField() })}><Plus size={15} /> Kolom baru</button>
        </div>
        <p className="text-sm text-ink-muted">Misalnya akun TikTok, NIM, atau angkatan. Isiannya tampil di halaman Pengguna dan ikut di ekspor CSV.</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-sm text-ink-muted">Contoh cepat:</span>
          {FIELD_PRESETS.filter((p) => !fields.some((f) => f.key === p.key)).map((p) => (
            <button key={p.key} type="button" className="chip border border-line bg-surface hover:border-brand" onClick={() => setEditField({ index: -1, value: { ...blankField(), ...p } })}><Plus size={12} /> {p.label}</button>
          ))}
        </div>
        {!fields.length ? <p className="text-sm text-ink-muted">Belum ada kolom tambahan.</p> : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {fields.map((f, i) => (
              <li key={f.key || i} className={clsx('flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm', f.active === false && 'opacity-60')}>
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">{f.label}</span> {f.required && <Badge className="bg-coral-soft text-coral">Wajib</Badge>} {f.active === false && <Badge className="bg-page text-ink-muted">Nonaktif</Badge>}
                  <span className="block text-ink-muted">{TYPE_LABEL[f.type] || f.type} · {WHERE_LABEL[f.where || 'signup']}{f.where !== 'admin' && f.editable === false ? ' · tidak bisa diubah pengguna' : ''} · kunci <code>{f.key}</code></span>
                </span>
                <button type="button" className="btn-ghost btn-sm" aria-label="Naikkan" disabled={i === 0} onClick={() => setF(move(fields, i, -1))}><ArrowUp size={14} /></button>
                <button type="button" className="btn-ghost btn-sm" aria-label="Turunkan" disabled={i === fields.length - 1} onClick={() => setF(move(fields, i, 1))}><ArrowDown size={14} /></button>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setF(fields.map((x, k) => (k === i ? { ...x, active: x.active === false } : x)))}>{f.active === false ? <><Eye size={14} /> Aktifkan</> : <><EyeOff size={14} /> Nonaktifkan</>}</button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setEditField({ index: i, value: { ...blankField(), ...f } })}><Pencil size={14} /> Ubah</button>
                <button type="button" className="btn-ghost btn-sm text-coral" aria-label={`Hapus ${f.label}`} onClick={() => { if (window.confirm(`Hapus kolom ${f.label}? Isian lama pengguna tetap tersimpan, tetapi tidak tampil lagi.`)) setF(fields.filter((_, k) => k !== i)); }}><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 font-display text-lg font-semibold">Langkah bukti komunitas</h2>
          <button type="button" className="btn-primary btn-sm" onClick={() => setEditProof({ index: -1, value: blankProof() })}><Plus size={15} /> Langkah baru</button>
        </div>
        <p className="text-sm text-ink-muted">Setelah memilih mata kuliah, pendaftar menyelesaikan langkah ini berurutan dan mengunggah tangkapan layar. Langkah opsional bisa dilewati. Bila semua dinonaktifkan, akun langsung dibuat setelah memilih mata kuliah.</p>
        <div className="flex flex-wrap gap-1.5">
          {PROOF_PRESETS.filter((p) => !proofs.some((x) => x.key === p.key)).map((p) => (
            <button key={p.key} type="button" className="chip border border-line bg-surface hover:border-brand" onClick={() => setEditProof({ index: -1, value: { ...blankProof(), ...p } })}><Plus size={12} /> {p.title}</button>
          ))}
        </div>
        <ul className="divide-y divide-line rounded-xl border border-line">
          {proofs.map((p, i) => (
            <li key={p.key || i} className={clsx('flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm', p.active === false && 'opacity-60')}>
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{i + 4}. {p.title}</span> {p.required === false ? <Badge className="bg-page text-ink-muted">Opsional</Badge> : <Badge className="bg-coral-soft text-coral">Wajib</Badge>} {p.active === false && <Badge className="bg-page text-ink-muted">Nonaktif</Badge>}
                <span className="block truncate text-ink-muted">{p.url || (p.key === 'whatsapp' ? `Tautan dari Komunitas & kontak${rec.waCommunityUrl ? '' : ' (belum diisi)'}` : p.key === 'instagram' ? `Tautan dari Komunitas & kontak${rec.instagramUrl ? '' : ' (belum diisi)'}` : 'Tautan belum diisi')}</span>
              </span>
              <button type="button" className="btn-ghost btn-sm" aria-label="Naikkan" disabled={i === 0} onClick={() => setP(move(proofs, i, -1))}><ArrowUp size={14} /></button>
              <button type="button" className="btn-ghost btn-sm" aria-label="Turunkan" disabled={i === proofs.length - 1} onClick={() => setP(move(proofs, i, 1))}><ArrowDown size={14} /></button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setP(proofs.map((x, k) => (k === i ? { ...x, active: x.active === false } : x)))}>{p.active === false ? <><Eye size={14} /> Aktifkan</> : <><EyeOff size={14} /> Nonaktifkan</>}</button>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setEditProof({ index: i, value: { ...blankProof(), ...p } })}><Pencil size={14} /> Ubah</button>
              {!['whatsapp', 'instagram'].includes(p.key) && <button type="button" className="btn-ghost btn-sm text-coral" aria-label={`Hapus ${p.title}`} onClick={() => { if (window.confirm(`Hapus langkah ${p.title}?`)) setP(proofs.filter((_, k) => k !== i)); }}><Trash2 size={14} /></button>}
            </li>
          ))}
        </ul>
      </section>

      <Alert kind="success">{msg}</Alert>
      <Alert>{error}</Alert>
      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary" onClick={save}>Simpan pengaturan pendaftaran</button>
        {dirty && <span className="text-sm text-[#6b4f00]">Ada perubahan yang belum disimpan.</span>}
      </div>

      {editField && <FieldEditor initial={editField.value} taken={usedKeys(editField.index)} isNew={editField.index < 0} onClose={() => setEditField(null)} onSave={(v) => { setF(editField.index < 0 ? [...fields, v] : fields.map((x, k) => (k === editField.index ? v : x))); setEditField(null); }} />}
      {editProof && <ProofEditor initial={editProof.value} taken={proofs.filter((_, i) => i !== editProof.index).map((p) => p.key)} isNew={editProof.index < 0} onClose={() => setEditProof(null)} onSave={(v) => { setP(editProof.index < 0 ? [...proofs, v] : proofs.map((x, k) => (k === editProof.index ? v : x))); setEditProof(null); }} />}
    </div>
  );
}

function FieldEditor({ initial, taken, isNew, onClose, onSave }) {
  const [f, setF] = useState({ ...initial, options: Array.isArray(initial.options) ? initial.options : [] });
  const [optText, setOptText] = useState((initial.options || []).join('\n'));
  const [err, setErr] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const key = f.key || slug(f.label);
  const ok = () => {
    if (!f.label.trim()) return setErr('Isi nama kolom.');
    if (!/^[a-z][a-z0-9_]{1,30}$/.test(key)) return setErr('Kunci 2-31 karakter, diawali huruf: huruf kecil, angka, garis bawah.');
    if (taken.includes(key)) return setErr('Kunci sudah dipakai kolom lain.');
    if (['loginid', 'name', 'email', 'whatsapp', 'password', 'semester', 'campus', 'campusother', 'role', 'id'].includes(key)) return setErr('Kunci ini dipakai kolom bawaan. Pilih yang lain.');
    const options = optText.split('\n').map((o) => o.trim()).filter(Boolean);
    if (f.type === 'select' && options.length < 2) return setErr('Tulis minimal dua pilihan, satu per baris.');
    return onSave({ ...f, key, label: f.label.trim(), options: f.type === 'select' ? options : [] });
  };
  return (
    <Modal open title={isNew ? 'Kolom data baru' : `Ubah kolom ${initial.label}`} onClose={onClose} footer={<>
      <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
      <button type="button" className="btn-primary" onClick={ok}>Pakai</button>
    </>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama kolom" htmlFor="fe-label"><input id="fe-label" className="input" value={f.label} maxLength={100} onChange={(e) => set('label', e.target.value)} placeholder="Akun TikTok" /></Field>
          <Field label="Kunci" htmlFor="fe-key" hint={isNew ? 'Dipakai di ekspor CSV. Tidak bisa diganti setelah ada isian.' : 'Tidak bisa diganti.'}><input id="fe-key" className="input" value={key} disabled={!isNew} maxLength={31} onChange={(e) => set('key', slug(e.target.value))} /></Field>
          <Field label="Jenis isian" htmlFor="fe-type"><select id="fe-type" className="input" value={f.type} onChange={(e) => set('type', e.target.value)}>{TYPES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></Field>
          <Field label="Tampil di" htmlFor="fe-where"><select id="fe-where" className="input" value={f.where} onChange={(e) => set('where', e.target.value)}>{WHERE.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></Field>
          {f.type !== 'checkbox' && <Field label="Contoh isian (placeholder)" htmlFor="fe-ph"><input id="fe-ph" className="input" value={f.placeholder} maxLength={120} onChange={(e) => set('placeholder', e.target.value)} /></Field>}
          {f.type === 'handle' && <Field label="Awalan" htmlFor="fe-pre"><input id="fe-pre" className="input" value={f.prefix} maxLength={5} onChange={(e) => set('prefix', e.target.value)} /></Field>}
        </div>
        <Field label="Petunjuk di bawah kolom" htmlFor="fe-hint"><input id="fe-hint" className="input" value={f.hint} maxLength={300} onChange={(e) => set('hint', e.target.value)} /></Field>
        {f.type === 'select' && <Field label="Pilihan (satu per baris)" htmlFor="fe-opt"><textarea id="fe-opt" className="input min-h-[110px]" value={optText} onChange={(e) => setOptText(e.target.value)} /></Field>}
        <div className="flex flex-wrap gap-4 text-sm">
          {f.where !== 'admin' && <label className="flex items-center gap-2"><input type="checkbox" checked={f.required} onChange={(e) => set('required', e.target.checked)} /> Wajib diisi{f.where === 'profile' ? ' saat diisi di Profil' : ''}</label>}
          {f.where !== 'admin' && <label className="flex items-center gap-2"><input type="checkbox" checked={f.editable !== false} onChange={(e) => set('editable', e.target.checked)} /> Pengguna bisa mengubah di Profil</label>}
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.active !== false} onChange={(e) => set('active', e.target.checked)} /> Aktif</label>
        </div>
        <Alert>{err}</Alert>
      </div>
    </Modal>
  );
}

function ProofEditor({ initial, taken, isNew, onClose, onSave }) {
  const [p, setP] = useState(initial);
  const [err, setErr] = useState('');
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const key = p.key || slug(p.short || p.title);
  const builtinKey = ['whatsapp', 'instagram'].includes(initial.key);
  const ok = () => {
    if (!p.title.trim()) return setErr('Isi judul langkah.');
    if (!/^[a-z][a-z0-9_]{1,30}$/.test(key)) return setErr('Kunci 2-31 karakter, diawali huruf.');
    if (taken.includes(key)) return setErr('Kunci sudah dipakai langkah lain.');
    if (p.url && !/^https?:\/\//i.test(p.url)) return setErr('Tautan harus diawali https://');
    return onSave({ ...p, key, title: p.title.trim(), short: (p.short || p.title).trim().slice(0, 20), question: p.question.trim() || `Sudah ${p.title.trim().toLowerCase()}?` });
  };
  return (
    <Modal open title={isNew ? 'Langkah bukti baru' : `Ubah langkah ${initial.title}`} onClose={onClose} footer={<>
      <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
      <button type="button" className="btn-primary" onClick={ok}>Pakai</button>
    </>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Judul langkah" htmlFor="pe-title"><input id="pe-title" className="input" value={p.title} maxLength={100} onChange={(e) => set('title', e.target.value)} placeholder="Ikuti TikTok MEDCOEL" /></Field>
          <Field label="Label singkat di penanda langkah" htmlFor="pe-short"><input id="pe-short" className="input" value={p.short} maxLength={20} onChange={(e) => set('short', e.target.value)} placeholder="TikTok" /></Field>
          <Field label="Kunci" htmlFor="pe-key" hint="Nama folder bukti di penyimpanan."><input id="pe-key" className="input" value={key} disabled={!isNew} maxLength={31} onChange={(e) => set('key', slug(e.target.value))} /></Field>
          <Field label="Tautan yang dibuka" htmlFor="pe-url" hint={builtinKey ? 'Kosongkan untuk memakai tautan di Umum > Komunitas & kontak.' : 'Mis. https://www.tiktok.com/@medcoel'}><input id="pe-url" className="input" value={p.url} maxLength={500} onChange={(e) => set('url', e.target.value)} placeholder="https://" /></Field>
          <Field label="Tulisan tombol" htmlFor="pe-btn"><input id="pe-btn" className="input" value={p.buttonLabel} maxLength={60} onChange={(e) => set('buttonLabel', e.target.value)} placeholder="Buka TikTok MEDCOEL" /></Field>
          <Field label="Pertanyaan konfirmasi" htmlFor="pe-q"><input id="pe-q" className="input" value={p.question} maxLength={150} onChange={(e) => set('question', e.target.value)} placeholder="Sudah mengikuti TikTok MEDCOEL?" /></Field>
        </div>
        <Field label="Penjelasan (satu poin per baris)" htmlFor="pe-desc"><textarea id="pe-desc" className="input min-h-[100px]" value={p.description} maxLength={1500} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={p.required !== false} onChange={(e) => set('required', e.target.checked)} /> Wajib (tidak bisa dilewati)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={p.active !== false} onChange={(e) => set('active', e.target.checked)} /> Aktif</label>
        </div>
        <Alert>{err}</Alert>
      </div>
    </Modal>
  );
}
