import { useAuth } from '@/context/AuthContext';
import { Html } from '@/components/RichContent';
import AuthLayout from './AuthLayout';

// Teks kebijakan diatur admin di Dashboard Admin > Pengaturan. Selama kosong,
// tampil ringkasan bawaan di bawah ini.
const DEFAULT_PRIVACY = `MEDCOEL menyimpan data yang kamu isi saat mendaftar (nama, Login ID, email, nomor WhatsApp, semester, asal kampus, dan mata kuliah) untuk menjalankan akunmu.

**Siapa yang bisa melihat:** email dan nomor WhatsApp hanya terlihat olehmu dan admin. Di leaderboard hanya tampil nama depan dan inisial belakang, dan kamu bisa memilih tampil anonim di Profil.

**Foto bukti dan PDF:** foto bukti bergabung komunitas dan PDF soal yang kamu ajukan disimpan di Google Drive privat milik admin, bukan di server web, dan hanya dibuka admin untuk memeriksa dan mengolah soal.

**Riwayat belajar:** setiap jawabanmu dicatat untuk menyusun riwayat, progres, pemilihan soal baru, dan leaderboard.

**Hak cipta:** dengan mengunggah PDF, kamu menyatakan berhak membagikan isinya untuk keperluan belajar. Admin berhak menolak pengajuan yang melanggar hak cipta.

Pertanyaan atau permintaan hapus akun bisa disampaikan lewat Chat Admin > Hubungi admin lewat WhatsApp.`;

export default function Privacy() {
  const { settings } = useAuth();
  return (
    <AuthLayout title="Kebijakan privasi" wide>
      <div className="card rich p-5 md:p-6"><Html as="div" text={settings?.privacyPolicy || DEFAULT_PRIVACY} /></div>
      {settings?.copyrightPolicy && (
        <div className="card rich mt-4 p-5 md:p-6"><h2 className="section-title mb-2">Hak cipta</h2><Html as="div" text={settings.copyrightPolicy} /></div>
      )}
    </AuthLayout>
  );
}
