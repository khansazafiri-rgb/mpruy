import { useEffect, useState } from 'react';
import { Alert, Field, Tabs } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api, errorText } from '@/lib/api';
import pb from '@/lib/pb';
import CampusSettings from './CampusSettings';
import SignupSettings from './SignupSettings';

function General() {
  const { refreshSettings } = useAuth();
  const [rec, setRec] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { pb.collection('app_settings').getList(1, 1).then((r) => setRec(r.items[0])).catch((e) => setError(errorText(e))); }, []);
  if (!rec) return <Alert>{error}</Alert>;
  const set = (k, v) => setRec((r) => ({ ...r, [k]: v }));
  const num = (k) => ({ type: 'number', className: 'input', value: rec[k] ?? '', onChange: (e) => set(k, e.target.value === '' ? '' : Number(e.target.value)) });
  const save = async () => {
    setMsg(''); setError('');
    try {
      const { id, collectionId: _c, collectionName: _n, created: _cr, updated: _u, ...body } = rec;
      await pb.collection('app_settings').update(id, body);
      await refreshSettings();
      setMsg('Pengaturan tersimpan.');
    } catch (e) { setError(errorText(e)); }
  };
  const types = rec.simulationTypes || ['A', 'K'];
  const toggleType = (t) => set('simulationTypes', types.includes(t) ? types.filter((x) => x !== t) : [...types, t]);
  return (
    <div className="space-y-6">
      <section className="card space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Komunitas & kontak</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tautan komunitas WhatsApp" htmlFor="st-wa"><input id="st-wa" className="input" value={rec.waCommunityUrl} onChange={(e) => set('waCommunityUrl', e.target.value)} placeholder="https://chat.whatsapp.com/..." /></Field>
          <Field label="Nomor WhatsApp admin" htmlFor="st-adm" hint="Untuk konfirmasi pengajuan dan tombol Hubungi admin."><input id="st-adm" className="input" value={rec.adminWhatsapp} onChange={(e) => set('adminWhatsapp', e.target.value)} placeholder="0812..." /></Field>
          <Field label="Tautan Instagram" htmlFor="st-ig"><input id="st-ig" className="input" value={rec.instagramUrl} onChange={(e) => set('instagramUrl', e.target.value)} placeholder="https://instagram.com/medcoel" /></Field>
          <Field label="Nama akun Instagram" htmlFor="st-igh"><input id="st-igh" className="input" value={rec.instagramHandle} onChange={(e) => set('instagramHandle', e.target.value)} placeholder="medcoel" /></Field>
        </div>
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Pengajuan soal & unggahan</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Kapasitas harian antrean (PDF)" htmlFor="st-cap"><input id="st-cap" min={1} {...num('dailyCapacity')} /></Field>
          <Field label="Batas waktu konfirmasi (hari)" htmlFor="st-cd"><input id="st-cd" min={1} {...num('confirmDays')} /></Field>
          <Field label="Batas ukuran PDF (MB)" htmlFor="st-mb"><input id="st-mb" min={1} max={100} {...num('maxPdfMb')} /></Field>
          <Field label="Kuota unggah per pengguna per hari" htmlFor="st-q"><input id="st-q" min={1} {...num('dailyUploadQuota')} /></Field>
          <Field label="File pengajuan kedaluwarsa/batal" htmlFor="st-ef"><select id="st-ef" className="input" value={rec.expiredFilePolicy} onChange={(e) => set('expiredFilePolicy', e.target.value)}><option value="archive">Pindah ke folder arsip</option><option value="delete">Hapus</option></select></Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={rec.submissionsOpen} onChange={(e) => set('submissionsOpen', e.target.checked)} /> Pengajuan baru dibuka</label>
        </div>
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Belajar, poin, dan akun</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Poin soal easy" htmlFor="st-pe"><input id="st-pe" min={0} {...num('pointsEasy')} /></Field>
          <Field label="Poin soal medium" htmlFor="st-pm"><input id="st-pm" min={0} {...num('pointsMedium')} /></Field>
          <Field label="Poin soal hard" htmlFor="st-ph"><input id="st-ph" min={0} {...num('pointsHard')} /></Field>
          <Field label="Poin Simulasi Dokter (skor 100)" htmlFor="st-ps" hint="Skor terbaik per kasus dikalikan nilai ini / 100, lalu masuk leaderboard."><input id="st-ps" min={0} {...num('pointsSimulation')} /></Field>
          <Field label="Batas ganti kampus (hari, 0 = bebas)" htmlFor="st-cc"><input id="st-cc" min={0} {...num('campusChangeDays')} /></Field>
          <Field label="Pengingat ujian bawaan (H-)" htmlFor="st-rd" hint="Pisahkan dengan koma, misalnya 7,3,1."><input id="st-rd" className="input" value={(rec.reminderDaysDefault || []).join(',')} onChange={(e) => set('reminderDaysDefault', e.target.value.split(',').map((x) => parseInt(x, 10)).filter((x) => x >= 0))} /></Field>
          <fieldset>
            <legend className="label">Tipe soal di simulasi & paket</legend>
            <div className="flex flex-wrap gap-3 text-sm">
              {[['A', 'Tipe A'], ['K', 'Tipe K'], ['isian', 'Isian']].map(([k, l]) => <label key={k} className="flex items-center gap-1.5"><input type="checkbox" checked={types.includes(k)} onChange={() => toggleType(k)} /> {l}</label>)}
            </div>
          </fieldset>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rec.requireProofApproval} onChange={(e) => set('requireProofApproval', e.target.checked)} /> Akun baru menunggu admin memeriksa bukti komunitas sebelum aktif</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rec.showMascots !== false} onChange={(e) => set('showMascots', e.target.checked)} /> Tampilkan maskot Kori, Kila, dan Nilo di halaman pengguna</label>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={rec.landingShowSubjects} onChange={(e) => set('landingShowSubjects', e.target.checked)} /> Landing page: tampilkan jumlah mata kuliah</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={rec.landingShowUsers} onChange={(e) => set('landingShowUsers', e.target.checked)} /> Landing page: tampilkan jumlah pengguna</label>
        </div>
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Istilah ilmiah pembahasan Inggris</h2>
        <Field label="Kamus istilah yang wajib dipertahankan" htmlFor="st-terms" hint="Satu istilah per baris, paling banyak 200 istilah. Berlaku untuk semua soal. Perubahan kamus membuat terjemahan lama perlu diperiksa ulang.">
          <textarea id="st-terms" className="input" rows={5} maxLength={6000} value={rec.translationTerms || ''} onChange={(e) => set('translationTerms', e.target.value)} placeholder={'nervus medianus\nM. supraspinatus\ncurah jantung'} />
        </Field>
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Kebijakan</h2>
        <Field label="Kebijakan privasi" htmlFor="st-pp" hint="Kosongkan untuk memakai teks bawaan."><textarea id="st-pp" className="input min-h-[140px]" value={rec.privacyPolicy} onChange={(e) => set('privacyPolicy', e.target.value)} /></Field>
        <Field label="Kebijakan hak cipta PDF" htmlFor="st-cp"><textarea id="st-cp" className="input min-h-[100px]" value={rec.copyrightPolicy} onChange={(e) => set('copyrightPolicy', e.target.value)} /></Field>
      </section>
      <Alert kind="success">{msg}</Alert>
      <Alert>{error}</Alert>
      <button type="button" className="btn-primary" onClick={save}>Simpan pengaturan</button>
    </div>
  );
}

function System() {
  const [summary, setSummary] = useState(null);
  const [out, setOut] = useState('');
  useEffect(() => { api('admin/summary').then(setSummary).catch(() => {}); }, []);
  const job = async (name) => { try { setOut(JSON.stringify(await api(`admin/run-job/${name}`, { method: 'POST', body: {} }))); } catch (e) { setOut(e.message); } };
  return (
    <div className="space-y-4">
      <section className="card space-y-2 p-5 text-sm">
        <h2 className="font-display text-lg font-semibold">Status layanan</h2>
        <p>Penyimpanan file: <b>{summary?.storageMode === 'drive' ? 'Google Drive' : 'lokal (mode pengembangan)'}</b></p>
        <p>Email (SMTP): <b>{summary?.smtp ? 'aktif' : 'belum diatur'}</b> · atur di dashboard PocketBase <code>/_/</code> &gt; Settings &gt; Mail settings</p>
        <p>Captcha Turnstile: <b>{summary?.turnstile ? 'aktif' : 'belum diatur'}</b></p>
        <p className="text-ink-muted">Kredensial Drive, Turnstile, dan Hermes disimpan di file lingkungan server, bukan di repositori. Lihat docs/DEPLOY.md.</p>
      </section>
      <section className="card space-y-2 p-5">
        <h2 className="font-display text-lg font-semibold">Tugas terjadwal</h2>
        <p className="text-sm text-ink-muted">Berjalan otomatis. Tombol ini untuk menjalankan sekarang juga.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={() => job('cleanup')}>Bersihkan data sementara & pengajuan kedaluwarsa</button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => job('reminders')}>Kirim pengingat ujian hari ini</button>
        </div>
        {out && <pre className="overflow-x-auto rounded-lg bg-page p-2 text-xs">{out}</pre>}
      </section>
    </div>
  );
}

export default function SettingsAdmin() {
  const [tab, setTab] = useState('general');
  return (
    <div className="space-y-5">
      <h1 className="page-title">Pengaturan</h1>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'general', label: 'Umum' }, { value: 'signup', label: 'Pendaftaran & profil' }, { value: 'campus', label: 'Prodi & kampus' }, { value: 'system', label: 'Sistem' }]} />
      {tab === 'general' && <General />}
      {tab === 'signup' && <SignupSettings />}
      {tab === 'campus' && <CampusSettings />}
      {tab === 'system' && <System />}
    </div>
  );
}
