import { Link } from 'react-router-dom';
import AuthLayout from './AuthLayout';

export default function NotFound() {
  return (
    <AuthLayout title="Halaman tidak ditemukan" subtitle="Tautannya mungkin salah ketik atau halamannya sudah dipindah.">
      <Link to="/" className="btn-primary">Kembali ke halaman utama</Link>
    </AuthLayout>
  );
}
