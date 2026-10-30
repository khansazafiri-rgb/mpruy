import { Check, GraduationCap, KeyRound, School, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CampusPicker from '@/components/CampusPicker';
import { placeErrors, placePayload, placeState } from '@/lib/campus';
import ExtraFields, { extraDefaults } from '@/components/ExtraFields';
import Illustration from '@/components/Illustration';
import { Alert, Field } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api, errorText } from '@/lib/api';
import pb from '@/lib/pb';
import { fmtDate } from '@/lib/time';
import PageHead from '@/components/PageHead';
import { openTutorialChooser } from '@/features/onboarding/state';
import { tutorialStatus } from '@/lib/tutorial';

const TUT_LABEL = { done: 'Selesai', skipped: 'Dilewati', '': 'Belum dicoba' };
function TutorialSection() {
  const { me } = useAuth();
  const rows = [['fk', 'Belajar dan latihan soal FK'], ['dokter', 'Simulasi jadi dokter']];
  return (
    <div className="space-y-4">
      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map(([k, label]) => {
          const st = tutorialStatus(me, k);
          return (
            <li key={k} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-page px-4 py-3">
              <span className="font-semibold">{label}</span>
              <span className={`chip ${st === 'done' ? 'bg-brand-soft text-brand-dark' : 'bg-gold-soft text-[#6b4f00]'}`}>{TUT_LABEL[st]}</span>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn-secondary" onClick={openTutorialChooser}>Ulangi tutorial</button>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold"><Icon size={20} className="text-brand" /> {title}</h2>
      {children}
    </section>
  );
}

function ProfileForm() {
  const { me, refresh, settings } = useAuth();
  const builtin = settings?.signup?.builtin || { whatsapp: 'required', semester: 'required' };
  const extraDefs = (settings?.signup?.fields || []).filter((x) => x.where !== 'admin');
  const [extra, setExtra] = useState(() => extraDefaults(extraDefs, me.extra || {}));
  const [errors, setErrors] = useState({});
  const [f, setF] = useState({ name: me.name, whatsapp: me.whatsapp ? `0${me.whatsapp.replace(/^62/, '')}` : '', semester: me.semester || '', leaderboardAnonymous: me.leaderboardAnonymous });
  const [subjects, setSubjects] = useState([]);
  const [picked, setPicked] = useState(new Set(me.studyingSubjects || []));
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('subjects').then((d) => setSubjects(d.items)).catch(() => {}); }, []);
  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const save = async (e) => {
    e.preventDefault();
    setMsg(''); setError('');
    if (!picked.size) { setError('Pilih minimal satu mata kuliah yang sedang dipelajari.'); return; }
    const digits = f.whatsapp.replace(/\D/g, '');
    const wa = !digits ? '' : digits.startsWith('0') ? `62${digits.slice(1)}` : digits.startsWith('62') ? digits : `62${digits}`;
    if (builtin.whatsapp !== 'hidden' && (wa || builtin.whatsapp === 'required') && (wa.length < 10 || wa.length > 15)) { setError('Nomor WhatsApp belum benar.'); return; }
    setBusy(true); setErrors({});
    try {
      const body = { name: f.name.trim(), leaderboardAnonymous: f.leaderboardAnonymous, studyingSubjects: [...picked] };
      if (builtin.whatsapp !== 'hidden') body.whatsapp = wa;
      if (builtin.semester !== 'hidden') body.semester = f.semester ? Number(f.semester) : 0;
      await pb.collection('users').update(me.id, body);
      const editable = extraDefs.filter((x) => x.editable);
      if (editable.length) await api('me/extra', { method: 'POST', body: { extra: Object.fromEntries(editable.map((x) => [x.key, extra[x.key]])) } });
      await refresh();
      setMsg('Profil tersimpan.');
    } catch (err) { setError(err.fields ? err.message : errorText(err)); setErrors(err.fields || {}); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Login ID" hint="Login ID tidak bisa diganti."><input className="input bg-page" value={me.loginId} disabled /></Field>
        <Field label="Email" hint="Hanya terlihat olehmu dan admin."><input className="input bg-page" value={me.email} disabled /></Field>
        <Field label="Nama lengkap" htmlFor="pf-name"><input id="pf-name" className="input" value={f.name} maxLength={100} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        {builtin.whatsapp !== 'hidden' && <Field label={`Nomor WhatsApp${builtin.whatsapp === 'optional' ? ' (opsional)' : ''}`} htmlFor="pf-wa"><input id="pf-wa" type="tel" className="input" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></Field>}
        {builtin.semester !== 'hidden' && (
          <Field label="Semester" htmlFor="pf-sem">
            <select id="pf-sem" className="input" value={f.semester} onChange={(e) => setF({ ...f, semester: e.target.value })}>
              {builtin.semester === 'optional' && <option value="">Tidak diisi</option>}
              {Array.from({ length: 14 }, (_, i) => <option key={i + 1} value={i + 1}>Semester {i + 1}</option>)}
            </select>
          </Field>
        )}
        <ExtraFields defs={extraDefs} values={extra} onChange={setExtra} errors={errors} idPrefix="pf" disabledKeys={extraDefs.filter((x) => !x.editable).map((x) => x.key)} />
        <label className="flex items-start gap-3 self-end rounded-xl border border-line p-3">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[rgb(var(--brand))]" checked={f.leaderboardAnonymous} onChange={(e) => setF({ ...f, leaderboardAnonymous: e.target.checked })} />
          <span><span className="block font-semibold">Tampil anonim di leaderboard</span><span className="text-[13px] text-ink-muted">Biasanya tampil nama depan dan inisial belakang.</span></span>
        </label>
      </div>
      <div>
        <p className="label">Mata kuliah yang sedang dipelajari</p>
        <div className="selection-summary mb-3" role="status">{picked.size} mata kuliah dipilih</div><div className="grid gap-3 sm:grid-cols-2">
          {subjects.map((s) => {
            const on = picked.has(s.id);
            return (
              <button key={s.id} type="button" onClick={() => toggle(s.id)} aria-pressed={on} className="subject-picker">
                <Illustration subject={s} className="h-9 w-9 shrink-0 rounded-lg" />
                <span className="flex-1 text-sm font-semibold">{s.name}</span>
                <span className="picker-check">{on && <Check size={15} />}</span>
              </button>
            );
          })}
        </div>
      </div>
      <Alert kind="success">{msg}</Alert>
      <Alert>{error}</Alert>
      <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan profil'}</button>
    </form>
  );
}

function CampusForm() {
  const { me, setMe, settings } = useAuth();
  const [place, setPlace] = useState(() => placeState(me));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = me.nextCampusChangeAt && new Date(me.nextCampusChangeAt) > new Date();
  const save = async () => {
    setError(''); setMsg('');
    const local = placeErrors(place);
    setErrors(local);
    if (Object.keys(local).length) return;
    const days = settings?.campusChangeDays;
    if (!window.confirm(`Ganti kampus sekarang?${days ? ` Setelah ini kampus baru bisa diganti lagi ${days} hari kemudian.` : ''} Soal khusus kampus lama tidak akan terlihat lagi.`)) return;
    setBusy(true);
    try {
      const r = await api('me/campus', { method: 'POST', body: placePayload(place) });
      setMe((m) => ({ ...m, ...r, nextCampusChangeAt: days ? new Date(Date.now() + days * 86400000).toISOString() : '' }));
      setMsg('Kampus sudah diganti.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">Program studi dan kampus sekarang: <b className="text-ink">{me.programName ? `${me.programName} · ${me.institution}` : me.campusName || '-'}</b>. Soal khusus kampus hanya terlihat oleh prodi yang sama di kampus yang sama; soal General bisa dipakai siapa saja.</p>
      {locked ? (
        <Alert kind="info">Kampus bisa diganti lagi mulai {fmtDate(me.nextCampusChangeAt)}.</Alert>
      ) : (
        <>
          <CampusPicker value={place} onChange={setPlace} errors={errors} id="pf-campus" />
          <p className="hint">Kampus hanya bisa diganti sekali tiap {settings?.campusChangeDays || 30} hari.</p>
          <button type="button" className="btn-secondary" onClick={save} disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan prodi dan kampus'}</button>
        </>
      )}
      <Alert kind="success">{msg}</Alert>
      <Alert>{error}</Alert>
    </div>
  );
}

function PasswordForm() {
  const { me, login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ oldPassword: '', password: '', passwordConfirm: '' });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    if (f.password.length < 8) { setError('Password baru minimal 8 karakter.'); return; }
    if (f.password !== f.passwordConfirm) { setError('Ulangi password belum sama.'); return; }
    setBusy(true);
    try {
      await pb.collection('users').update(me.id, f);
      // Mengganti password mengakhiri semua sesi, termasuk yang ini: masuk ulang.
      await login(me.loginId, f.password);
      setF({ oldPassword: '', password: '', passwordConfirm: '' });
      setMsg('Password diganti. Sesi di perangkat lain sudah keluar.');
    } catch (err) {
      setError(err?.status === 400 ? 'Password lama belum cocok.' : errorText(err));
      if (!pb.authStore.isValid) nav('/masuk');
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Password lama" htmlFor="pw-old"><input id="pw-old" type="password" className="input" autoComplete="current-password" value={f.oldPassword} onChange={(e) => setF({ ...f, oldPassword: e.target.value })} /></Field>
        <Field label="Password baru" htmlFor="pw-new"><input id="pw-new" type="password" className="input" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <Field label="Ulangi password baru" htmlFor="pw-new2"><input id="pw-new2" type="password" className="input" autoComplete="new-password" value={f.passwordConfirm} onChange={(e) => setF({ ...f, passwordConfirm: e.target.value })} /></Field>
      </div>
      <Alert kind="success">{msg}</Alert>
      <Alert>{error}</Alert>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Menyimpan...' : 'Ganti password'}</button>
        <Link to="/lupa-password" className="text-sm font-semibold text-academic hover:underline">Lupa password lama? Pakai kode dari email</Link>
      </div>
    </form>
  );
}

export default function Profile() {
  return (
    <div className="space-y-7">
      <PageHead eyebrow="Akunmu" title="Profil">Data diri, asal kampus, dan password.</PageHead>
      <Section icon={UserRound} title="Data diri"><ProfileForm /></Section>
      <Section icon={School} title="Program studi dan kampus"><CampusForm /></Section>
      <Section icon={KeyRound} title="Password"><PasswordForm /></Section>
      <Section icon={GraduationCap} title="Tutorial"><TutorialSection /></Section>
    </div>
  );
}
