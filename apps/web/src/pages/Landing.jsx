// Landing page: satu halaman ringkas (PRD). Angka diambil dari endpoint yang
// hanya mengembalikan angka, karena soal tidak boleh terbuka ke publik.
import { ArrowRight, CalendarClock, FileUp, Instagram, Layers, MessageCircle, Trophy, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const FEATURES = [
  {
    icon: FileUp,
    title: 'Ubah PDF soal jadi latihan di web',
    text: 'Punya PDF soal dari kakak tingkat atau dosen? Kirim lewat Chat Admin. Admin memeriksa kunci dan pembahasannya, lalu soalnya tayang untuk kamu dan teman sekampus.',
    highlight: true,
  },
  { icon: Layers, title: 'Simulasi sesuai maumu dan paket soal', text: 'Pilih BAB, jumlah soal, dan komposisi easy, medium, hard sendiri. Atau ambil Paket 100, 150, 200 yang mencakup semua BAB.' },
  { icon: Trophy, title: 'Leaderboard', text: 'Kumpulkan poin dari jawaban benar di percobaan pertama. Lihat peringkat mingguan dan sepanjang waktu, se-Indonesia atau per kampus.' },
  { icon: CalendarClock, title: 'Jadwal ujian pribadi', text: 'Catat UTB, UAB, atau ujian lain dengan zona WIB, WITA, atau WIT. Ada hitung mundur dan pengingat H-7, H-3, H-1.' },
  { icon: Users, title: 'Belajar bareng komunitas', text: 'Gabung grup WhatsApp dan ikuti Instagram MEDCOEL untuk info soal baru, diskusi, dan semangat belajar bersama.' },
];

function useCountUp(target) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!target) return undefined;
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 1200);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}

export default function Landing() {
  const { me, settings } = useAuth();
  const [stats, setStats] = useState(null);
  useEffect(() => { api('stats').then(setStats).catch(() => setStats({})); }, []);
  const soal = useCountUp(stats?.questions || 0);
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(n || 0);

  return (
    <div className="min-h-screen bg-page">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo />
        <div className="flex items-center gap-2">
          {me ? (
            <Link to="/beranda" className="btn-primary">Buka beranda</Link>
          ) : (
            <>
              <Link to="/masuk" className="btn-ghost">Masuk</Link>
              <Link to="/daftar" className="btn-primary">Daftar</Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-8 md:grid-cols-[1.1fr_0.9fr] md:pt-14">
          <div>
            <p className="chip mb-4 bg-gold-soft text-[#6b4f00]">Gratis untuk semua mahasiswa kedokteran</p>
            <h1 className="page-title">Belajar kedokteran bareng komunitas, tanpa bayar.</h1>
            <p className="mt-4 max-w-xl text-lg text-ink-muted">
              Latihan soal per topik, simulasi yang bisa kamu atur sendiri, dan teman belajar dari kampus seluruh Indonesia.
              Semua fitur MEDCOEL gratis dan tidak berbayar.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={me ? '/beranda' : '/daftar'} className="btn-primary px-5 py-3 text-base">
                {me ? 'Lanjut belajar' : 'Daftar gratis'} <ArrowRight size={18} />
              </Link>
              {!me && <Link to="/masuk" className="btn-secondary px-5 py-3 text-base">Saya sudah punya akun</Link>}
            </div>
          </div>
          <div className="card relative overflow-hidden p-6 md:p-8">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-soft" aria-hidden />
            <p className="relative text-sm font-semibold text-ink-muted">Soal di bank MEDCOEL saat ini</p>
            <p className="relative mt-1 font-display text-6xl font-extrabold text-brand md:text-7xl" aria-live="polite">{fmt(soal)}</p>
            <p className="relative mt-2 text-sm text-ink-muted">dan terus bertambah dari admin dan kiriman PDF teman-teman.</p>
            <div className="relative mt-6 grid grid-cols-2 gap-3">
              {stats?.subjects !== undefined && (
                <div className="rounded-xl bg-page p-3"><p className="text-xs font-semibold text-ink-muted">Mata kuliah</p><p className="font-display text-2xl font-bold">{fmt(stats.subjects)}</p></div>
              )}
              {stats?.users !== undefined && (
                <div className="rounded-xl bg-page p-3"><p className="text-xs font-semibold text-ink-muted">Pengguna</p><p className="font-display text-2xl font-bold">{fmt(stats.users)}</p></div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-surface py-14" aria-labelledby="fitur">
          <div className="mx-auto max-w-6xl px-4">
            <h2 id="fitur" className="section-title">Yang bisa kamu lakukan di MEDCOEL</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <article key={f.title} className={`rounded-2xl border p-5 ${f.highlight ? 'border-brand bg-brand text-white md:col-span-2 lg:col-span-1' : 'border-line bg-page'}`}>
                  <f.icon size={28} className={f.highlight ? 'text-gold' : 'text-brand'} aria-hidden />
                  <h3 className={`mt-3 font-display text-lg font-semibold ${f.highlight ? 'text-white' : ''}`}>{f.title}</h3>
                  <p className={`mt-1.5 text-[15px] leading-relaxed ${f.highlight ? 'text-white/90' : 'text-ink-muted'}`}>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="card flex flex-col items-start gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div>
              <h2 className="section-title">Ayo gabung komunitasnya</h2>
              <p className="mt-1 text-ink-muted">Info soal baru, diskusi, dan teman seperjuangan ada di sana.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings?.waCommunityUrl && (
                <a href={settings.waCommunityUrl} target="_blank" rel="noopener noreferrer" className="btn-primary"><MessageCircle size={18} /> Komunitas WhatsApp</a>
              )}
              {settings?.instagramUrl && (
                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary"><Instagram size={18} /> Instagram{settings.instagramHandle ? ` @${settings.instagramHandle.replace(/^@/, '')}` : ''}</a>
              )}
              {!me && <Link to="/daftar" className="btn-secondary">Daftar sekarang</Link>}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 text-sm text-ink-muted">
          <span>© {new Date().getFullYear()} MEDCOEL · medcoel.com</span>
          <Link to="/kebijakan-privasi" className="hover:text-brand">Kebijakan privasi</Link>
        </div>
      </footer>
    </div>
  );
}
