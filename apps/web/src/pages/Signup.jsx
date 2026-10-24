// DAFTAR: data diri, verifikasi email, mata kuliah, lalu langkah bukti
// komunitas yang diatur admin (bawaan: WhatsApp dan Instagram). Akun baru
// dibuat setelah langkah terakhir.
// draftId + token disimpan di browser supaya pendaftaran bisa dilanjutkan
// bila halaman tertutup (berlaku 24 jam).
import { Check, CheckCircle2, ExternalLink, Eye, EyeOff, ImagePlus, Instagram, MessageCircle, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CampusPicker from '@/components/CampusPicker';
import { campusPayload, campusState } from '@/lib/campus';
import ExtraFields, { extraDefaults } from '@/components/ExtraFields';
import MascotTip from '@/components/MascotTip';
import Illustration from '@/components/Illustration';
import Turnstile from '@/components/Turnstile';
import { Alert, Field, Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { compressImage, uploadFile } from '@/lib/upload';
import AuthLayout from './AuthLayout';

const KEY = 'medcoel_signup';
const BASE_STEPS = ['Data diri', 'Verifikasi email', 'Mata kuliah'];
// Dipakai sampai pengaturan dari server termuat.
const DEFAULT_PROOFS = [
  { key: 'whatsapp', title: 'Gabung komunitas WhatsApp', short: 'WhatsApp', question: 'Sudah bergabung ke komunitas WhatsApp?', required: true },
  { key: 'instagram', title: 'Ikuti Instagram MEDCOEL', short: 'Instagram', question: 'Sudah mengikuti Instagram MEDCOEL?', required: true },
];
// Kata-kata Kori di tiap langkah.
const STEP_TIPS = [
  'Halo! Aku Kori. Isi data dirimu dulu ya, nanti kode verifikasi dikirim ke email.',
  'Cek kotak masuk emailmu. Kalau belum ada, intip folder Spam atau Promosi.',
  'Pilih mata kuliah yang lagi kamu pelajari. Tenang, semua mata kuliah tetap bisa dibuka.',
];

function saved() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
function save(v) {
  try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch { /* mode privat */ }
}

function Stepper({ step, steps }) {
  return (
    <ol className="mb-5 flex items-center gap-1.5" aria-label="Langkah pendaftaran">
      {steps.map((s, i) => {
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
  const proofs = settings?.signup?.proofs ?? DEFAULT_PROOFS;
  const steps = [...BASE_STEPS, ...proofs.map((p) => p.short || p.title)];
  const total = steps.length;
  const [draft, setDraft] = useState(null); // state dari server
  const [cred, setCred] = useState(saved()); // { draftId, draftToken }
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(!!saved());
  const [devCode, setDevCode] = useState('');
  const [finishError, setFinishError] = useState('');

  const finish = useCallback(async (c) => {
    setFinishError('');
    try {
      const r = await api('signup/finish', { method: 'POST', body: c });
      save(null);
      nav(`/masuk?baru=1&id=${encodeURIComponent(r.loginId)}`, { replace: true });
    } catch (err) { setFinishError(err.message); }
  }, [nav]);

  const apply = useCallback(async (d, token) => {
    setDraft(d);
    const c = { draftId: d.draftId, draftToken: token || cred?.draftToken };
    setCred(c);
    save(c);
    if (d.devCode) setDevCode(d.devCode);
    // Semua langkah selesai (mis. tanpa langkah bukti, atau bukti terakhir): buat akun.
    if ((d.step || 2) > total) { setStep(total); await finish(c); return; }
    setStep(Math.min(total, d.step || 2));
  }, [cred, total, finish]);

  // Lanjutkan pendaftaran yang tertunda.
  useEffect(() => {
    const c = saved();
    if (!c) return;
    api('signup/draft', { query: c })
      .then((d) => { setDraft(d); setStep(Math.min(total, d.step || 2)); })
      .catch(() => { save(null); setCred(null); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restart = () => { save(null); setCred(null); setDraft(null); setStep(1); setDevCode(''); };

  if (loading) return <AuthLayout title="Daftar akun MEDCOEL"><Spinner label="Memuat pendaftaranmu" /></AuthLayout>;
  const proof = step > 3 ? proofs[step - 4] : null;

  return (
    <AuthLayout title="Daftar akun MEDCOEL" subtitle="Gratis, langsung aktif, dan bisa dipakai di banyak perangkat." wide>
      <Stepper step={step} steps={steps} />
      {step <= 3 && <MascotTip mascot="kori" mood={step === 1 ? 'wave' : 'idle'} size={60} className="mb-4">{STEP_TIPS[step - 1]}</MascotTip>}
      {cred && step > 1 && (
        <p className="mb-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
          Pendaftaranmu tersimpan sementara selama 24 jam.
          <button type="button" onClick={restart} className="inline-flex items-center gap-1 font-semibold text-academic hover:underline"><RotateCcw size={13} /> Mulai dari awal</button>
        </p>
      )}
      <Alert className="mb-3">{finishError}</Alert>
      {step === 1 && <StepProfile draft={draft} cred={cred} settings={settings} onDone={(d) => apply(d, d.draftToken)} />}
      {step === 2 && <StepVerify draft={draft} cred={cred} devCode={devCode} onDone={apply} onBack={() => setStep(1)} onDevCode={setDevCode} />}
      {step === 3 && <StepSubjects draft={draft} cred={cred} onDone={apply} last={total === 3} />}
      {proof && <StepProof key={proof.key} proof={proof} draft={draft} cred={cred} settings={settings} last={step === total} onDone={apply} />}
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
  const builtin = settings?.signup?.builtin || { whatsapp: 'required', semester: 'required' };
  const fields = (settings?.signup?.fields || []).filter((x) => x.where === 'signup');
  const [extra, setExtra] = useState(() => extraDefaults(fields, p.extra || {}));
  const [f, setF] = useState({
    loginId: p.loginId || '', name: p.name || '', email: p.email || '', whatsapp: p.whatsapp ? `0${String(p.whatsapp).replace(/^62/, '')}` : '',
    password: '', passwordConfirm: '', semester: p.semester || '', campus: campusState(p).campus, campusOther: campusState(p).other,
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
        semester: f.semester ? Number(f.semester) : 0,
        extra,
        ...campusPayload(f.campus, f.campusOther),
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
        {builtin.whatsapp !== 'hidden' && (
          <Field label={`Nomor WhatsApp${builtin.whatsapp === 'optional' ? ' (opsional)' : ''}`} htmlFor="wa" error={errors.whatsapp} hint="Hanya terlihat olehmu dan admin.">
            <input id="wa" type="tel" inputMode="tel" className="input" autoComplete="tel" placeholder="081234567890" value={f.whatsapp} onChange={set('whatsapp')} />
          </Field>
        )}
        <Field label="Password" htmlFor="pw" error={errors.password} hint="Minimal 8 karakter.">
          <div className="relative">
            <input id="pw" type={show ? 'text' : 'password'} className="input pr-11" autoComplete="new-password" value={f.password} onChange={set('password')} />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-muted" onClick={() => setShow((v) => !v)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
        </Field>
        <Field label="Ulangi password" htmlFor="pw2" error={errors.passwordConfirm}>
          <input id="pw2" type={show ? 'text' : 'password'} className="input" autoComplete="new-password" value={f.passwordConfirm} onChange={set('passwordConfirm')} />
        </Field>
        {builtin.semester !== 'hidden' && (
          <Field label={`Semester${builtin.semester === 'optional' || f.campus === '__none__' ? ' (opsional)' : ''}`} htmlFor="sem" error={errors.semester}>
            <select id="sem" className="input" value={f.semester} onChange={set('semester')}>
              <option value="">Pilih semester</option>
              {Array.from({ length: 14 }, (_, i) => <option key={i + 1} value={i + 1}>Semester {i + 1}</option>)}
            </select>
          </Field>
        )}
        <Field label="Asal kampus" htmlFor="campus" error={errors.campus} hint={f.campus === '__none__' ? 'Tidak apa-apa. Kamu tetap bisa memakai semua soal General dan fitur lainnya. Kampus bisa diisi nanti di Profil.' : 'Soal khusus kampus mengikuti pilihan ini.'}>
          <CampusPicker value={f.campus} other={f.campusOther} onChange={(campus, campusOther) => setF((x) => ({ ...x, campus, campusOther }))} error={errors.campus} />
        </Field>
        <ExtraFields defs={fields} values={extra} onChange={setExtra} errors={errors} idPrefix="su" />
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

function StepSubjects({ draft, cred, onDone, last }) {
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
      <button type="button" className="btn-primary w-full py-3" onClick={submit} disabled={busy}>{busy ? 'Menyimpan...' : last ? 'Selesai, buat akun' : 'Lanjut'}</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Langkah bukti komunitas (diatur admin; bawaan WhatsApp dan Instagram)
// ---------------------------------------------------------------------------

const PROOF_ICON = { whatsapp: MessageCircle, instagram: Instagram };
const PROOF_MASCOT = { whatsapp: ['kila', 'wave'], instagram: ['nilo', 'happy'] };

function StepProof({ proof, draft, cred, settings, last, onDone }) {
  const Icon = PROOF_ICON[proof.key] || ExternalLink;
  const url = proof.url || (proof.key === 'whatsapp' ? settings?.waCommunityUrl : proof.key === 'instagram' ? settings?.instagramUrl : '');
  const existing = draft?.proofs?.[proof.key]?.id ? draft.proofs[proof.key] : proof.key === 'whatsapp' ? draft?.proofWhatsapp : proof.key === 'instagram' ? draft?.proofInstagram : null;
  const [joined, setJoined] = useState(existing ? 'ya' : '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lines = String(proof.description || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const [mascot, mood] = PROOF_MASCOT[proof.key] || ['kori', 'wave'];
  const button = proof.buttonLabel || `Buka ${proof.short || proof.title}`;

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
    if (joined !== 'ya') { setError(`${proof.title} dulu supaya bisa lanjut.`); return; }
    if (!file && !existing) { setError('Unggah foto tangkapan layar sebagai bukti.'); return; }
    setBusy(true);
    try {
      let fileId = existing?.id;
      if (file) {
        const up = await uploadFile(file, { kind: `proof_${proof.key}`, draftId: cred.draftId, draftToken: cred.draftToken }, setProgress);
        fileId = up.id;
      }
      const d = await api('signup/proof', { method: 'POST', body: { ...cred, kind: proof.key, fileId, joined: true } });
      await onDone(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };
  const skip = async () => {
    setError(''); setBusy(true);
    try { await onDone(await api('signup/proof', { method: 'POST', body: { ...cred, kind: proof.key, skip: true } })); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="card space-y-4 p-5 md:p-6">
      <h2 className="section-title">{proof.title}{!proof.required && <span className="ml-2 text-sm font-normal text-ink-muted">(opsional)</span>}</h2>
      {lines.length > 1 ? (
        <ul className="list-disc space-y-1 pl-5 text-ink-muted">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      ) : lines.length === 1 ? <p className="text-ink-muted">{lines[0]}</p> : null}
      <MascotTip mascot={mascot} mood={mood} size={56}>Setelah {proof.short || 'selesai'}, ambil tangkapan layar sebagai bukti, lalu unggah di bawah.</MascotTip>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary">
          <Icon size={18} /> {proof.key === 'instagram' && settings?.instagramHandle && !proof.buttonLabel ? `Buka Instagram @${settings.instagramHandle.replace(/^@/, '')}` : button}
        </a>
      ) : (
        <Alert kind="warn">Tautan untuk langkah ini belum diatur admin. Kamu tetap bisa lanjut dengan mengunggah bukti.</Alert>
      )}

      <fieldset>
        <legend className="label">{proof.question}</legend>
        <div className="flex gap-2">
          {[['ya', 'Sudah'], ['belum', 'Belum']].map(([v, l]) => (
            <label key={v} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 font-semibold ${joined === v ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line'}`}>
              <input type="radio" name={`joined-${proof.key}`} className="sr-only" checked={joined === v} onChange={() => setJoined(v)} /> {l}
            </label>
          ))}
        </div>
      </fieldset>
      {joined === 'belum' && <Alert kind="warn">Selesaikan dulu lewat tombol di atas, lalu pilih Sudah.</Alert>}

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
        {busy ? 'Menyimpan...' : last ? 'Selesai, buat akun' : 'Lanjut'}
      </button>
      {!proof.required && <button type="button" className="btn-ghost w-full" onClick={skip} disabled={busy}>Lewati langkah ini</button>}
    </div>
  );
}
