import { Link } from 'react-router-dom';
import MascotTip from '@/components/MascotTip';
import AuthLayout from './AuthLayout';

export default function NotFound() {
  return (
    <AuthLayout title="Halaman tidak ditemukan" subtitle="Tautannya mungkin salah ketik atau halamannya sudah dipindah.">
      <MascotTip mascot="kori" mood="think" size={88} layout="stack" className="mb-5">Hmm, Kori juga nggak menemukan halaman ini. Yuk balik ke halaman utama.</MascotTip>
      <Link to="/" className="btn-primary">Kembali ke halaman utama</Link>
    </AuthLayout>
  );
}
