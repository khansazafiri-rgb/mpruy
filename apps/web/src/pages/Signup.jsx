// DAFTAR: lima langkah. Akun baru dibuat setelah langkah kelima.
// draftId + token disimpan di browser supaya pendaftaran bisa dilanjutkan
// bila halaman tertutup (berlaku 24 jam).
import { Check, CheckCircle2, Eye, EyeOff, ImagePlus, Instagram, MessageCircle, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CampusPicker from '@/components/CampusPicker';
import Illustration from '@/components/Illustration';
import Turnstile from '@/components/Turnstile';
import { Alert, Field, Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { compressImage, uploadFile } from '@/lib/upload';
import AuthLayout from './AuthLayout';

const KEY = 'medcoel_signup';
const STEPS = ['Data diri', 'Verifikasi email', 'Mata kuliah', 'WhatsApp', 'Instagram'];

function saved() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
function save(v) {
  try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch { /* mode privat */ }
}

function Stepper({ step }) {
  return (
    <ol className="mb-5 flex items-center gap-1.5" aria-label="Langkah pendaftaran">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const done = step > n;
        const now = step === n;
        return (
          <li key={s} className="flex flex-1 flex-col items-center gap-1 text-center" aria-current={now ? 'step' : undefined}>
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-brand text-white' : now ? 'bg-gold text-ink' : 'bg-line text-ink-muted'}`}>
              {done ? <Check size={16} /> : n}
            </span>
            <span className={`hidden text-[11px] font-semibold sm:block ${now ? 'text-ink' : 'text-ink-muted'}`}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function Signup() {
  const { settings } = useAuth();
  const nav = useNavigate();
  const [draft, setDraft] = useState(null); // state dari server
  const [cred, setCred] = useState(saved()); // { draftId, draftToken }
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(!!saved());
  const [devCode, setDevCode] = useState('');

  const apply = useCallback((d, token) => {
    setDraft(d);
    const c = { draftId: d.draftId, draftToken: token || cred?.draftToken };
    setCred(c);
    save(c);
    if (d.devCode) setDevCode(d.devCode);
    setStep(Math.min(5, d.step || 2));
  }, [cred]);

  // Lanjutkan pendaftaran yang tertunda.
  useEffect(() => {
    const c = saved();
    if (!c) return;
    api('signup/draft', { query: c })
      .then((d) => { setDraft(d); setStep(Math.min(5, d.step || 2)); })
      .catch(() => { save(null); setCred(null); })
      .finally(() => setLoading(false));
  }, []);

  const restart = () => { save(null); setCred(null); setDraft(null); setStep(1); setDevCode(''); };

  if (loading) return <AuthLayout title="Daftar akun MEDCOEL"><Spinner label="Memuat pendaftaranmu" /></AuthLayout>;

  return (
    <AuthLayout title="Daftar akun MEDCOEL" subtitle="Gratis, langsung aktif, dan bisa dipakai di banyak perangkat." wide>
      <Stepper step={step} />
      {cred && step > 1 && (
        <p className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
          Pendaftaranmu tersimpan sementara selama 24 jam.
          <button type="button" onClick={restart} className="inline-flex items-center gap-1 font-semibold text-academic hover:underline"><RotateCcw size={13} /> Mulai dari awal</button>
        </p>
      )}
      {step === 1 && <StepProfile draft={draft} cred={cred} settings={settings} onDone={(d) => apply(d, d.draftToken)} />}
      {step === 2 && <StepVerify draft={draft} cred={cred} devCode={devCode} onDone={apply} onBack={() => setStep(1)} onDevCode={setDevCode} />}
      {step === 3 && <StepSubjects draft={draft} cred={cred} onDone={apply} />}
      {step === 4 && <StepProof kind="whatsapp" draft={draft} cred={cred} settings={settings} onDone={apply} />}
      {step === 5 && (
        <StepProof
          kind="instagram"
          draft={draft}
          cred={cred}
          settings={settings}
          onDone={async (d) => {
            setDraft(d);
            const r = await api('signup/finish', { method: 'POST', body: cred });
            save(null);
            nav(`/masuk?baru=1&id=${encodeURIComponent(r.loginId)}`, { replace: true });
          }}
        />
      )}
      <p className="mt-6 text-center text-sm text-ink-muted">
        Sudah punya akun? <Link to="/masuk" className="font-semibold text-brand hover:underline">Masuk</Link>
        {' · '}
        <Link to="/kebijakan-privasi" className="font-semibold text-academic hover:underline">Kebijakan privasi</Link>
      </p>
    </AuthLayout>
  );
}

// ---------------------------------------------------------------------------
// Langkah 1: data diri
// ---------------------------------------------------------------------------

function StepProfile({ draft, cred, settings, onDone }) {
  const p = draft?.profile || {};
  const [f, setF] = useState({
    loginId: p.loginId || '', name: p.name || '', email: p.email || '', whatsapp: p.whatsapp ? `0${String(p.whatsapp).replace(/^62/, '')}` : '',
    password: '', passwordConfirm: '', semester: p.semester || '', campus: p.campus || (p.campusOther ? '__other__' : ''), campusOther: p.campusOther || '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [idState, setIdState] = useState(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const checkId = async () => {
    const id = f.loginId.trim().toLowerCase();
    if (!id) return;
    try {
      const r = await api('signup/check-login-id', { query: { loginId: id } });
      setIdState(r);
    } catch { setIdState(null); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const local = {};
    if (f.password.length < 8) local.password = 'Password minimal 8 karakter.';
    else if (f.password !== f.passwordConfirm) local.passwordConfirm = 'Ulangi password belum sama.';
    if (f.campus === '__other__' && !f.campusOther.trim()) local.campus = 'Tulis nama kampusmu.';
    if (Object.keys(local).length) { setErrors(local); return; }
    if (settings?.turnstileSiteKey && !token) { setError('Selesaikan captcha dulu.'); return; }
    setBusy(true);
    setErrors({});
    try {
      const body = {
        ...f,
        loginId: f.loginId.trim().toLowerCase(),
        semester: Number(f.semester),
        campus: f.campus === '__other__' ? '' : f.campus,
        campusOther: f.campus === '__other__' ? f.campusOther : '',
        turnstileToken: token,
        ...(cred || {}),
      };
      onDone(await api('signup/start', { method: 'POST', body }));
    } catch (err) {
      setErrors(err.fields || {});
      setError(err.message);
      if (window.turnstile) window.turnstile.reset();
      setToken('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-5 md:p-6" noValidate>
      <h2 className="section-title">Data diri</h2>
      <Alert>{error}</Alert>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Login ID" htmlFor="loginId" error={errors.loginId || (idState && !idState.available ? idState.reason : '')} hint={idState?.available ? 'Login ID tersedia.' : 'Dipakai untuk masuk. Huruf kecil, angka, titik, garis bawah.'}>
          <input id="loginId" className="input" autoCapitalize="none" autoComplete="username" value={f.loginId} onChange={(e) => { set('loginId')(e); setIdState(null); }} onBlur={checkId} maxLength={30} />
        </Field>
        <Field label="Nama lengkap" htmlFor="name" error={errors.name}>
          <input id="name" className="input" autoComplete="name" value={f.name} onChange={set('name')} maxLength={100} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email} hint="Kode verifikasi dikirim ke sini.">
          <input id="email" type="email" className="input" autoComplete="email" value={f.email} onChange={set('email')} />
        </Field>
        <Field label="Nomor WhatsApp" htmlFor="wa" error={errors.whatsapp} hint="Hanya terlihat olehmu dan admin.">
          <input id="wa" type="tel" inputMode="tel" className="input" autoComplete="tel" placeholder="081234567890" value={f.whatsapp} onChange={set('whatsapp')} />
        </Field>
        <Field label="Password" htmlFor="pw" error={errors.password} hint="Minimal 8 karakter.">
          <div className="relative">
            <input id="pw" type={show ? 'text' : 'password'} className="input pr-11" autoComplete="new-password" value={f.password} onChange={set('password')} />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-muted" onClick={() => setShow((v) => !v)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
        </Field>
        <Field label="Ulangi password" htmlFor="pw2" error={errors.passwordConfirm}>
          <input id="pw2" type={show ? 'text' : 'password'} className="input" autoComplete="new-password" value={f.passwordConfirm} onChange={set('passwordConfirm')} />
        </Field>
        <Field label="Semester" htmlFor="sem" error={errors.semester}>
          <select id="sem" className="input" value={f.semester} onChange={set('semester')}>
            <option value="">Pilih semester</option>
            {Array.from({ length: 14 }, (_, i) => <option key={i + 1} value={i + 1}>Semester {i + 1}</option>)}
          </select>
        </Field>
        <Field label="Asal kampus" htmlFor="campus" error={errors.campus} hint="Soal khusus kampus mengikuti pilihan ini.">
          <CampusPicker value={f.campus} other={f.campusOther} onChange={(campus, campusOther) => setF((x) => ({ ...x, campus, campusOther }))} error={errors.campus} />
        </Field>
      </div>
      <Turnstile siteKey={settings?.turnstileSiteKey} onToken={setToken} />
      <button type="submit" className="btn-primary w-full py-3" disabled={busy}>{busy ? 'Menyimpan...' : 'Lanjut, kirim kode ke email'}</button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Langkah 2: verifikasi email
// ---------------------------------------------------------------------------

function StepVerify({ draft, cred, devCode, onDone, onBack, onDevCode }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const verify = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try { onDone(await api('signup/verify', { method: 'POST', body: { ...cred, code } })); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const resend = async () => {
    setError(''); setInfo('');
    try {
      const d = await api('signup/resend', { method: 'POST', body: cred });
      if (d.devCode) onDevCode(d.devCode);
      setInfo('Kode baru sudah dikirim. Cek juga folder Spam atau Promosi.');
    } catch (err) { setError(err.message); }
  };

  return (
    <form onSubmit={verify} className="card space-y-4 p-5 md:p-6">
      <h2 className="section-title">Verifikasi email</h2>
      <p className="text-ink-muted">Kami mengirim kode 6 digit ke <b className="text-ink">{draft?.emailMasked}</b>. Kode berlaku 10 menit.</p>
      {devCode && <Alert kind="warn">Mode pengembangan (email belum diatur). Kodenya: <b>{devCode}</b></Alert>}
      <Alert kind="info">{info}</Alert>
      <Alert>{error}</Alert>
      <Field label="Kode verifikasi" htmlFor="code">
        <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input text-center text-2xl tracking-[0.5em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
      </Field>
      <button type="submit" className="btn-primary w-full py-3" disabled={busy || code.length !== 6}>{busy ? 'Memeriksa...' : 'Verifikasi'}</button>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <button type="button" onClick={resend} className="font-semibold text-academic hover:underline">Kirim ulang kode</button>
        <button type="button" onClick={onBack} className="font-semibold text-ink-muted hover:underline">Ganti email atau data diri</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Langkah 3: mata kuliah yang sedang dipelajari (wajib)
// ---------------------------------------------------------------------------

function StepSubjects({ draft, cred, onDone }) {
  const [list, setList] = useState([]);
  const [picked, setPicked] = useState(new Set(draft?.subjects || []));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('public-subjects').then((d) => setList(d.items)).catch((e) => setError(e.message)); }, []);
  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const submit = async () => {
    setError('');
    if (!picked.size) { setError('Centang minimal satu mata kuliah.'); return; }
    setBusy(true);
    try { onDone(await api('signup/subjects', { method: 'POST', body: { ...cred, subjects: [...picked] } })); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <div className="card space-y-4 p-5 md:p-6">
      <h2 className="section-title">Mata kuliah yang sedang dipelajari</h2>
      <p className="text-ink-muted">Centang satu atau lebih. Pilihan ini hanya menaruh mata kuliah itu di urutan pertama. Semua mata kuliah tetap bisa kamu buka.</p>
      <Alert>{error}</Alert>
      <div className="selection-summary" role="status"><span>{picked.size} mata kuliah dipilih</span><span>Bisa diubah nanti</span></div><div className="grid gap-3 sm:grid-cols-2">
        {list.map((s) => {
          const on = picked.has(s.id);
          return (
            <button key={s.id} type="button" onClick={() => toggle(s.id)} aria-pressed={on} className="subject-picker">
              <Illustration subject={s} className="h-12 w-12 shrink-0 rounded-lg" />
              <span className="flex-1 font-semibold">{s.name}</span>
              <span className="picker-check">{on && <Check size={15} />}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="btn-primary w-full py-3" onClick={submit} disabled={busy}>{busy ? 'Menyimpan...' : 'Lanjut'}</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Langkah 4 & 5: bukti WhatsApp / Instagram
// ---------------------------------------------------------------------------

function StepProof({ kind, draft, cred, settings, onDone }) {
  const wa = kind === 'whatsapp';
  const url = wa ? settings?.waCommunityUrl : settings?.instagramUrl;
  const existing = wa ? draft?.proofWhatsapp : draft?.proofInstagram;
  const [joined, setJoined] = useState(existing ? 'ya' : '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (e) => {
    setError('');
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const small = await compressImage(f);
      setFile(small);
      setPreview(URL.createObjectURL(small));
    } catch (err) { setError(err.message); }
  };

  const submit = async () => {
    setError('');
    if (joined !== 'ya') { setError(wa ? 'Gabung ke komunitas WhatsApp dulu supaya bisa lanjut.' : 'Ikuti Instagram MEDCOEL dulu supaya bisa lanjut.'); return; }
    if (!file && !existing) { setError('Unggah foto tangkapan layar sebagai bukti.'); return; }
    setBusy(true);
    try {
      let fileId = existing?.id;
      if (file) {
        const up = await uploadFile(file, { kind: wa ? 'proof_whatsapp' : 'proof_instagram', draftId: cred.draftId, draftToken: cred.draftToken }, setProgress);
        fileId = up.id;
      }
      const d = await api('signup/proof', { method: 'POST', body: { ...cred, kind, fileId, joined: true } });
      await onDone(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className="card space-y-4 p-5 md:p-6">
      <h2 className="section-title">{wa ? 'Gabung komunitas WhatsApp' : 'Ikuti Instagram MEDCOEL'}</h2>
      {wa ? (
        <ul className="list-disc space-y-1 pl-5 text-ink-muted">
          <li>Dapat kabar paling cepat saat soal baru tayang.</li>
          <li>Diskusi soal dan pembahasan bareng mahasiswa kedokteran dari kampus lain.</li>
          <li>Info jadwal, tips belajar, dan pengumuman penting dari admin.</li>
        </ul>
      ) : (
        <p className="text-ink-muted">Instagram MEDCOEL berisi rangkuman materi, info fitur baru, dan kabar komunitas. Ikuti supaya tidak ketinggalan.</p>
      )}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary">
          {wa ? <MessageCircle size={18} /> : <Instagram size={18} />} {wa ? 'Buka komunitas WhatsApp' : `Buka Instagram${settings?.instagramHandle ? ` @${settings.instagramHandle.replace(/^@/, '')}` : ''}`}
        </a>
      ) : (
        <Alert kind="warn">Tautan {wa ? 'komunitas WhatsApp' : 'Instagram'} belum diatur admin. Kamu tetap bisa lanjut dengan mengunggah bukti.</Alert>
      )}

      <fieldset>
        <legend className="label">{wa ? 'Sudah bergabung ke komunitas WhatsApp?' : 'Sudah mengikuti Instagram MEDCOEL?'}</legend>
        <div className="flex gap-2">
          {[['ya', 'Sudah'], ['belum', 'Belum']].map(([v, l]) => (
            <label key={v} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 font-semibold ${joined === v ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line'}`}>
              <input type="radio" name={`joined-${kind}`} className="sr-only" checked={joined === v} onChange={() => setJoined(v)} /> {l}
            </label>
          ))}
        </div>
      </fieldset>
      {joined === 'belum' && <Alert kind="warn">{wa ? 'Gabung dulu lewat tombol di atas, lalu pilih Sudah.' : 'Ikuti dulu lewat tombol di atas, lalu pilih Sudah.'}</Alert>}

      {joined === 'ya' && (
        <div>
          <p className="label">Foto tangkapan layar sebagai bukti</p>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-5 text-center hover:border-brand">
            {preview ? <img src={preview} alt="Pratinjau bukti" className="max-h-48 rounded-lg" /> : existing ? (
              <span className="flex items-center gap-2 text-brand-dark"><CheckCircle2 size={20} /> Bukti sudah terunggah. Pilih foto lain untuk mengganti.</span>
            ) : (
              <><ImagePlus className="text-brand" size={28} /><span className="text-sm text-ink-muted">Pilih foto JPG, PNG, atau WebP. Foto otomatis dikecilkan sebelum diunggah.</span></>
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} />
          </label>
          {busy && progress > 0 && <p className="mt-2 text-sm text-ink-muted">Mengunggah {Math.round(progress * 100)}%</p>}
        </div>
      )}
      <Alert>{error}</Alert>
      <button type="button" className="btn-primary w-full py-3" onClick={submit} disabled={busy || joined !== 'ya'}>
        {busy ? 'Menyimpan...' : wa ? 'Lanjut' : 'Selesai, buat akun'}
      </button>
    </div>
  );
}
