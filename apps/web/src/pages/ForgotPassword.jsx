import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Field } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import AuthLayout from './AuthLayout';

export default function ForgotPassword() {
  const { me, logout } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(me?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const request = async (e) => {
    e?.preventDefault();
    setError(''); setInfo('');
    setBusy(true);
    try {
      const r = await api('password/request', { method: 'POST', body: { email } });
      setInfo(r.message + (r.devCode ? ` (Mode pengembangan, kode: ${r.devCode})` : ''));
      setStep(2);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const reset = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password minimal 8 karakter.'); return; }
    if (password !== password2) { setError('Ulangi password belum sama.'); return; }
    setBusy(true);
    try {
      const r = await api('password/reset', { method: 'POST', body: { email, code, password, passwordConfirm: password2 } });
      if (me) logout();
      nav(`/masuk?reset=1&id=${encodeURIComponent(r.loginId || '')}`, { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <AuthLayout title={me ? 'Ganti password' : 'Lupa password'} subtitle="Kami kirim kode 6 digit ke emailmu. Kode berlaku 10 menit dan hanya bisa dipakai sekali.">
      {step === 1 ? (
        <form onSubmit={request} className="card space-y-4 p-5 md:p-6">
          <Alert>{error}</Alert>
          <Field label="Email akun MEDCOEL" htmlFor="email">
            <input id="email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <button type="submit" className="btn-primary w-full py-3" disabled={busy || !email}>{busy ? 'Mengirim...' : 'Kirim kode'}</button>
          <p className="text-center text-sm"><Link to={me ? '/profil' : '/masuk'} className="font-semibold text-academic hover:underline">Kembali</Link></p>
        </form>
      ) : (
        <form onSubmit={reset} className="card space-y-4 p-5 md:p-6">
          <Alert kind="info">{info}</Alert>
          <Alert>{error}</Alert>
          <Field label="Kode dari email" htmlFor="code">
            <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input text-center text-2xl tracking-[0.5em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </Field>
          <Field label="Password baru" htmlFor="pw" hint="Minimal 8 karakter.">
            <input id="pw" type="password" className="input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Ulangi password baru" htmlFor="pw2">
            <input id="pw2" type="password" className="input" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
          </Field>
          <p className="text-[13px] text-ink-muted">Setelah password diganti, sesi di perangkat lain otomatis keluar.</p>
          <button type="submit" className="btn-primary w-full py-3" disabled={busy || code.length !== 6}>{busy ? 'Menyimpan...' : 'Simpan password baru'}</button>
          <button type="button" className="btn-ghost w-full" onClick={request} disabled={busy}>Kirim ulang kode</button>
        </form>
      )}
    </AuthLayout>
  );
}
