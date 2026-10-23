import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import MascotTip from '@/components/MascotTip';
import { Alert, Field } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { safeInternalPath } from '@/lib/safePath';
import AuthLayout from './AuthLayout';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [identity, setIdentity] = useState(params.get('id') || '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identity.trim() || !password) { setError('Isi Login ID atau email, dan password.'); return; }
    setBusy(true);
    try {
      await login(identity, password);
      nav(safeInternalPath(params.get('lanjut')), { replace: true });
    } catch (err) {
      const status = err?.status;
      if (status === 400) setError('Login ID/email atau password belum cocok. Akun yang dinonaktifkan admin juga tidak bisa masuk.');
      else if (status === 429) setError('Terlalu banyak percobaan masuk. Tunggu 5 menit lalu coba lagi.');
      else setError('Tidak bisa tersambung ke server. Periksa koneksi internetmu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Masuk ke MEDCOEL" subtitle="Satu akun bisa dipakai di HP dan laptop sekaligus.">
      <MascotTip mascot={params.get('baru') ? 'kila' : 'kori'} mood={params.get('baru') ? 'cheer' : 'wave'} size={60} className="mb-4">{params.get('baru') ? 'Selamat datang di MEDCOEL! Masuk dulu, nanti aku temani tutorial singkatnya.' : 'Halo lagi! Masuk pakai Login ID atau email.'}</MascotTip>
      <form onSubmit={submit} className="card space-y-4 p-5 md:p-6" noValidate>
        {params.get('baru') && <Alert kind="success">Akunmu sudah jadi. Masuk dengan Login ID dan password yang tadi kamu buat.</Alert>}
        {params.get('reset') && <Alert kind="success">Password sudah diganti. Masuk dengan password baru.</Alert>}
        <Alert>{error}</Alert>
        <Field label="Login ID atau email" htmlFor="identity">
          <input id="identity" className="input" autoComplete="username" autoCapitalize="none" value={identity} onChange={(e) => setIdentity(e.target.value)} />
        </Field>
        <Field label="Password" htmlFor="password">
          <div className="relative">
            <input id="password" type={show ? 'text' : 'password'} className="input pr-11" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-muted hover:text-ink" onClick={() => setShow((v) => !v)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        <button type="submit" className="btn-primary w-full py-3" disabled={busy}>{busy ? 'Memeriksa...' : 'Masuk'}</button>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <Link to="/lupa-password" className="font-semibold text-academic hover:underline">Lupa password?</Link>
          <span className="text-ink-muted">Belum punya akun? <Link to="/daftar" className="font-semibold text-brand hover:underline">Daftar</Link></span>
        </div>
      </form>
    </AuthLayout>
  );
}
