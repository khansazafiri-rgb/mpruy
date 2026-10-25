import { Link } from 'react-router-dom';
import Ecg from '@/components/Ecg';
import Logo from '@/components/Logo';
import LanguageSwitch from '@/components/LanguageSwitch';
import { toneClass } from '@/lib/tone';

const STICKERS = [
  { key: 'anatomi', tilt: -7, x: '6%', y: '0%' },
  { key: 'sistem-kardiovaskular', tilt: 5, x: '46%', y: '10%' },
  { key: 'farmakologi', tilt: -2, x: '22%', y: '48%' },
];

// Halaman masuk/daftar: panel papan hijau berisi stiker di kiri (layar lebar),
// formulir di atas kertas di kanan.
export default function AuthLayout({ title, subtitle, children, wide = false }) {
  return (
    <div className="auth-frame min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="auth-panel surface-forest hidden lg:flex" aria-hidden>
        <span className="auth-dots tex-halftone-light" />
        <Ecg className="auth-ecg" />
        <div className="relative z-[1] flex h-full flex-col">
          <p className="tag-label w-fit bg-white/10 text-mint">Gratis untuk mahasiswa kedokteran</p>
          <p className="mt-6 max-w-sm font-display text-[40px] font-extrabold leading-[1.05] tracking-tight text-paper">Belajar kedokteran bareng komunitas.</p>
          <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-white/75">Latihan per BAB, simulasi yang kamu atur sendiri, dan soal dari kampus seluruh Indonesia.</p>
          <div className="auth-stickers">
            {STICKERS.map((s, i) => (
              <span key={s.key} className={`sticker-tone auth-sticker ${toneClass(s.key)}`} style={{ left: s.x, top: s.y, '--tilt': `${s.tilt}deg` }}>
                {i === 0 && <span className="tape -top-3 left-6 -rotate-6" />}
                <img src={`/illustrations/${s.key}.webp`} alt="" width={960} height={640} />
              </span>
            ))}
            <p className="hand auth-note">satu BAB dulu,<br />pelan-pelan ✦</p>
          </div>
        </div>
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="mx-auto flex w-full max-w-6xl items-center px-4 py-4 lg:px-10">
          <Link to="/" aria-label="Kembali ke halaman utama"><Logo /></Link>
          <div className="ml-auto"><LanguageSwitch /></div>
        </header>
        <main className={`mx-auto w-full flex-1 px-4 pb-16 pt-4 lg:pt-10 ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
          <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-tight md:text-[36px]">{title}</h1>
          {subtitle && <p className="mt-2 text-[16px] text-ink-muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
