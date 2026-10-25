import { getLanguage } from '@/i18n';
// Landing page MEDCOEL. Gaya "buku catatan klinis" versi 2: tiap bagian punya
// latar yang jelas berbeda (seperti Apple), mata kuliah diberi nada warna
// sendiri (seperti Osmosis/Duolingo), filter kategori berbentuk pil (seperti
// Google Store/Traveloka), dan elemen muncul saat digulir.
// Angka diambil dari endpoint yang hanya mengembalikan angka (soal tidak
// terbuka ke publik). Contoh soal di hero ditulis di sini dan diberi label.
import clsx from 'clsx';
import {
  ArrowRight, BellRing, BookOpenCheck, Building2, CalendarClock, Check, ChevronDown, FileUp, Flame, Instagram,
  ListChecks, MessageCircle, MousePointerClick, SlidersHorizontal, Sparkles, Trophy, X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';
import LanguageSwitch from '@/components/LanguageSwitch';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useReveal } from '@/lib/reveal';
import { toneClass } from '@/lib/tone';
import { waLink } from '@/lib/wa';
import '@/styles/landing.css';

const SUBJECTS = [
  ['anatomi', 'Anatomi'], ['anestesiologi-dasar', 'Anestesiologi Dasar'], ['biokimia', 'Biokimia & Biologi Molekuler'], ['embriologi', 'Embriologi'],
  ['farmakologi', 'Farmakologi'], ['fisiologi', 'Fisiologi'], ['genetika', 'Genetika Kedokteran'], ['ginekologi-payudara', 'Ginekologi & Payudara'],
  ['histologi', 'Histologi'], ['ilmu-bedah', 'Ilmu Bedah'], ['ilmu-bedah-ortopedi', 'Ilmu Bedah Ortopedi'], ['ilmu-kesehatan-anak', 'Ilmu Kesehatan Anak'],
  ['ilmu-penyakit-dalam', 'Ilmu Penyakit Dalam'], ['kehamilan-persalinan', 'Kehamilan & Persalinan'], ['mikrobiologi', 'Mikrobiologi'], ['multisistem-kegawatdaruratan', 'Kegawatdaruratan'],
  ['parasitologi', 'Parasitologi'], ['patologi', 'Patologi Anatomi'], ['patologi-klinik', 'Patologi Klinik'], ['psikiatri-kesehatan-jiwa', 'Psikiatri'],
  ['radiologi-dasar', 'Radiologi Dasar'], ['sistem-endokrin-metabolik-nutrisi', 'Endokrin & Metabolik'], ['sistem-gastrointestinal-hepatobilier-pankreas', 'Gastrointestinal'], ['sistem-ginjal-saluran-kemih', 'Ginjal & Saluran Kemih'],
  ['sistem-hematologi-imunologi', 'Hematologi & Imunologi'], ['sistem-indra-mata', 'Indra: Mata'], ['sistem-indra-tht', 'Indra: THT'], ['sistem-integumen-kulit-kelamin', 'Kulit & Kelamin'],
  ['sistem-kardiovaskular', 'Kardiovaskular'], ['sistem-muskuloskeletal', 'Muskuloskeletal'], ['sistem-respirasi', 'Respirasi'], ['sistem-saraf', 'Sistem Saraf'],
];
const KLINIK = ['ilmu-bedah', 'ilmu-bedah-ortopedi', 'ilmu-kesehatan-anak', 'ilmu-penyakit-dalam', 'kehamilan-persalinan', 'ginekologi-payudara', 'psikiatri-kesehatan-jiwa', 'multisistem-kegawatdaruratan'];
const groupOf = (key) => (key.startsWith('sistem-') ? 'sistem' : KLINIK.includes(key) ? 'klinik' : 'dasar');
const GROUPS = [['semua', 'Semua'], ['dasar', 'Ilmu dasar'], ['klinik', 'Klinik'], ['sistem', 'Sistem organ']];
const img = (key) => `/illustrations/${key}.webp`;

const SAMPLES = [
  {
    key: 'anatomi', name: 'Anatomi', topic: 'Ekstremitas atas', level: 'Mudah',
    stem: 'Pasien tidak mampu memulai abduksi lengan atas pada 15° pertama. Otot yang paling mungkin terganggu adalah…',
    answer: 'B',
    options: [
      ['A', 'M. deltoideus', 'Deltoid melanjutkan abduksi setelah 15° sampai sekitar 90°, bukan memulainya.'],
      ['B', 'M. supraspinatus', 'Supraspinatus memulai abduksi pada 0–15° pertama sebelum deltoid mengambil alih.'],
      ['C', 'M. infraspinatus', 'Infraspinatus berperan dalam rotasi lateral (eksternal) bahu.'],
      ['D', 'M. teres minor', 'Teres minor juga terutama memutar lengan ke lateral.'],
      ['E', 'M. subscapularis', 'Subscapularis memutar lengan ke medial (internal).'],
    ],
  },
  {
    key: 'fisiologi', name: 'Fisiologi', topic: 'Fisiologi ginjal', level: 'Sedang',
    stem: 'Saat tekanan perfusi ginjal turun, sel jukstaglomerular menyekresikan…',
    answer: 'B',
    options: [
      ['A', 'Aldosteron', 'Aldosteron dihasilkan zona glomerulosa korteks adrenal, sebagai kelanjutan jalur RAA.'],
      ['B', 'Renin', 'Sel jukstaglomerular (granular) melepas renin saat perfusi ginjal turun, memulai jalur renin-angiotensin-aldosteron.'],
      ['C', 'ADH', 'ADH dibuat di hipotalamus dan dilepas dari hipofisis posterior.'],
      ['D', 'ANP', 'ANP dilepas miosit atrium saat atrium teregang, efeknya justru menurunkan tekanan darah.'],
      ['E', 'Eritropoietin', 'Eritropoietin dilepas sel interstisial peritubular ginjal terutama sebagai respons terhadap hipoksia.'],
    ],
  },
  {
    key: 'biokimia', name: 'Biokimia', topic: 'Metabolisme lipid', level: 'Sedang',
    stem: 'Enzim pembatas laju pada sintesis kolesterol, yang juga dihambat oleh statin, adalah…',
    answer: 'B',
    options: [
      ['A', 'HMG-KoA sintase', 'Enzim ini membentuk HMG-KoA, tetapi bukan langkah pembatas laju.'],
      ['B', 'HMG-KoA reduktase', 'HMG-KoA reduktase mengubah HMG-KoA menjadi mevalonat. Inilah langkah pembatas laju dan target statin.'],
      ['C', 'Asetil-KoA karboksilase', 'Enzim ini pembatas laju sintesis asam lemak, bukan kolesterol.'],
      ['D', 'Skualen epoksidase', 'Enzim ini bekerja di tahap lanjut, setelah skualen terbentuk.'],
      ['E', 'Lipoprotein lipase', 'Lipoprotein lipase menghidrolisis trigliserida pada kilomikron dan VLDL.'],
    ],
  },
];


const STEPS = [
  { n: '1', tone: 'mint', icon: MousePointerClick, title: 'Pilih mata kuliah dan BAB', text: 'Mata kuliah yang sedang kamu pelajari muncul paling atas. Mulai dari BAB yang paling mendesak.' },
  { n: '2', tone: 'sun', icon: SlidersHorizontal, title: 'Kerjakan dengan caramu', text: 'Mode Learning membuka kunci tiap soal. Mode Ujian bertimer, pembahasan dibuka setelah selesai.' },
  { n: '3', tone: 'lilac', icon: BookOpenCheck, title: 'Baca pembahasan tiap pilihan', text: 'Bukan cuma tahu yang benar, tapi juga kenapa pilihan lain salah. Progresmu tercatat per BAB.' },
];

const FAQ = [
  ['Beneran gratis?', 'Iya. Semua fitur MEDCOEL bisa dipakai tanpa bayar: latihan per BAB, simulasi, paket soal, leaderboard, dan jadwal ujian.'],
  ['Soalnya dari mana?', 'Dari admin MEDCOEL dan dari PDF soal yang dikirim teman-teman lewat Chat Admin. Setiap kiriman diperiksa admin dulu sebelum tayang.'],
  ['Soal kampusku bisa dilihat kampus lain?', 'Saat mengirim PDF, kamu memilih sendiri: hanya untuk kampusmu atau General (untuk semua pengguna). Soal khusus kampus hanya terlihat oleh akun dari kampus itu.'],
  ['Kampusku belum ada di daftar, atau aku belum kuliah?', 'Tetap bisa. Pilih Lainnya bila kampusmu belum ada di daftar, atau pilih Belum punya kampus kalau kamu masih siswa SMA atau belum kuliah. Kamu bisa memakai semua soal General, dan kampus bisa diisi kapan saja di Profil.'],
  ['Bisa dipakai di HP?', 'Bisa. MEDCOEL dibuat untuk layar HP sejak awal, jadi enak dipakai sambil di kereta atau menunggu jadwal praktikum.'],
];


function useCountUp(target) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!target) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(target); return undefined; }
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 1400);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}

function QuizDemo() {
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState(null);
  const q = SAMPLES[active];
  const done = picked !== null;
  const correct = picked === q.answer;
  const switchTo = (i) => { setActive(i); setPicked(null); };

  return (
    <div className="lp-demo">
      <p className="lp-note lp-note-try hand" aria-hidden>coba jawab satu! <svg viewBox="0 0 60 40" width="52" height="34"><path d="M4 6c18 2 34 10 44 26m0 0-2-11m2 11-10-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg></p>
      <span className="float-pill tone-sun lp-float lp-float-a" style={{ '--rot': '-6deg' }} aria-hidden><Flame size={17} /> 5 hari berturut-turut</span>
      <span className={clsx('float-pill lp-float lp-float-b', done && correct ? 'tone-mint is-on' : 'tone-mint')} style={{ '--rot': '5deg' }} aria-hidden><Sparkles size={16} /> +1 poin</span>
      <div className={clsx('lp-demo-sticker sticker-tone', toneClass(q.key))} aria-hidden><span className="tape" style={{ top: -10, left: 22, transform: 'rotate(-8deg)' }} /><img src={img(q.key)} alt="" width={120} height={120} /></div>

      <div className="lp-demo-card">
        <span className="tape" style={{ top: -12, left: '42%', transform: 'rotate(3deg)' }} aria-hidden />
        <div className="lp-demo-head">
          <span className="lp-demo-label">Contoh soal</span>
          <div className="lp-demo-tabs" role="group" aria-label="Pilih mata kuliah contoh">
            {SAMPLES.map((s, i) => (
              <button key={s.key} type="button" aria-pressed={i === active} onClick={() => switchTo(i)} className={toneClass(s.key)}>{s.name}</button>
            ))}
          </div>
        </div>

        <div className="lp-demo-body" key={q.key}>
          <p className="lp-demo-meta"><span className={clsx('tone-chip', toneClass(q.key))}>{q.name}</span> {q.topic} <span className={clsx('lp-level', q.level === 'Mudah' ? 'is-easy' : 'is-mid')}>{q.level}</span></p>
          <p className="lp-demo-stem">{q.stem}</p>
          <fieldset className="lp-demo-options">
            <legend className="sr-only">Pilih jawaban</legend>
            {q.options.map(([label, text, why]) => {
              const isKey = done && label === q.answer;
              const isWrong = done && label === picked && !isKey;
              return (
                <div key={label}>
                  <label className={clsx('lp-option', isKey && 'is-key', isWrong && 'is-wrong', done && 'is-done')}>
                    <input type="radio" name={`demo-${q.key}`} className="sr-only" checked={picked === label} disabled={done} onChange={() => setPicked(label)} />
                    <span className="lp-letter">{isKey ? <Check size={16} aria-label="Kunci" /> : isWrong ? <X size={16} aria-label="Salah" /> : label}</span>
                    <span className="min-w-0 flex-1">{text}</span>
                  </label>
                  {done && (isKey || isWrong) && <p className={clsx('lp-why', isKey ? 'is-key' : 'is-wrong')}>{why}</p>}
                </div>
              );
            })}
          </fieldset>
          <div className="lp-demo-foot" role="status">
            {done ? (
              <>
                <span className={clsx('lp-verdict', correct ? 'is-key' : 'is-wrong')}>{correct ? 'Tepat! +1 poin' : `Belum tepat. Kuncinya ${q.answer}.`}</span>
                <button type="button" className="lp-link" onClick={() => switchTo((active + 1) % SAMPLES.length)}>Soal berikutnya <ArrowRight size={16} /></button>
              </>
            ) : <span className="text-ink-muted">Pilih satu jawaban untuk melihat pembahasannya.</span>}
          </div>
        </div>
      </div>
      {done && <p className="lp-note lp-note-done hand" aria-hidden>pembahasan tiap pilihan ✓</p>}
    </div>
  );
}

function SubjectWall() {
  const [group, setGroup] = useState('semua');
  const [all, setAll] = useState(false);
  const counts = useMemo(() => SUBJECTS.reduce((c, [k]) => ({ ...c, [groupOf(k)]: (c[groupOf(k)] || 0) + 1 }), { semua: SUBJECTS.length }), []);
  const list = SUBJECTS.filter(([k]) => group === 'semua' || groupOf(k) === group);
  return (
    <>
      <div className="lp-filter" role="group" aria-label="Saring mata kuliah">
        {GROUPS.map(([k, label]) => (
          <button key={k} type="button" aria-pressed={group === k} onClick={() => setGroup(k)}>{label}<span>{counts[k]}</span></button>
        ))}
      </div>
      <ul className={clsx('lp-wall', !all && group === 'semua' && 'is-clipped')} key={group}>
        {list.map(([key, name], i) => (
          <li key={key} className={toneClass(key)} style={{ '--r': `${[-3, 2, -1.5, 3, -2.5, 1, 2.5, -1][i % 8]}deg`, '--i': i % 8 }}>
            <div className="sticker-tone lp-wall-sticker"><img src={img(key)} alt="" width={160} height={160} loading="lazy" decoding="async" /></div>
            <span>{name}</span>
          </li>
        ))}
      </ul>
      {!all && group === 'semua' && <div className="lp-wall-more"><button type="button" className="btn-secondary" onClick={() => setAll(true)}>Lihat semua 32 mata kuliah <ChevronDown size={18} /></button></div>}
    </>
  );
}

function Marquee() {
  const row = SUBJECTS.map(([key, name]) => (
    <span key={key} className={clsx('lp-marquee-item', toneClass(key))}><img src={img(key)} alt="" width={36} height={36} loading="lazy" />{name}</span>
  ));
  return (
    <div className="lp-marquee" aria-label="Daftar mata kuliah">
      <div className="lp-marquee-track"><div>{row}</div><div aria-hidden>{row}</div></div>
    </div>
  );
}

function Ecg({ className = '' }) {
  return (
    <svg className={`ecg ${className}`} viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden>
      <path d="M0 50 H260 l14 -8 14 8 H330 l10 18 14 -62 14 62 10 -16 H520 l16 -10 16 10 H760 l10 18 14 -62 14 62 10 -16 H960 l16 -10 16 10 H1200" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function PhoneShot() {
  // Cuplikan beranda di bingkai HP, digambar dengan HTML (bukan foto).
  const subjects = [['anatomi', 'Anatomi', 62], ['fisiologi', 'Fisiologi', 35], ['farmakologi', 'Farmakologi', 18]];
  return (
    <div className="lp-phone" aria-hidden>
      <div className="lp-phone-screen">
        <div className="lp-phone-top"><span>09.41</span><span className="lp-phone-notch" /><span>100%</span></div>
        <p className="lp-phone-hi">Halo, Nadia 👋</p>
        <div className="lp-phone-exam surface-forest"><small>UTB Anatomi</small><b>12 hari lagi</b><Ecg className="lp-phone-ecg" /></div>
        <p className="lp-phone-label">Lanjutkan</p>
        {subjects.map(([k, n, p]) => (
          <div key={k} className={clsx('lp-phone-row', toneClass(k))}>
            <img src={img(k)} alt="" width={40} height={40} />
            <div><b>{n}</b><i><em style={{ width: `${p}%` }} /></i></div>
            <span>{p}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const { me, settings } = useAuth();
  const [stats, setStats] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const top = useRef(null);
  useReveal();
  useEffect(() => { let alive = true; api('stats').then((s) => alive && setStats(s)).catch(() => {}); return () => { alive = false; }; }, []);
  useEffect(() => {
    const el = top.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([en]) => setScrolled(!en.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const soal = useCountUp(stats?.questions || 0);
  const fmt = (n) => new Intl.NumberFormat(getLanguage() === 'en' ? 'en-GB' : 'id-ID').format(n || 0);
  const startUrl = me ? '/beranda' : '/daftar';
  const startLabel = me ? 'Lanjut belajar' : 'Daftar gratis';

  return (
    <div className="lp">
      <a href="#utama" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-3">Lewati ke isi</a>
      <div ref={top} aria-hidden />
      <header className={clsx('lp-header', scrolled && 'is-scrolled')}>
        <div className="lp-wrap lp-header-row">
          <Link to="/" aria-label="MEDCOEL, halaman utama"><Logo /></Link>
          <LanguageSwitch />
          <nav aria-label="Bagian halaman" className="lp-nav">
            <a href="#cara-kerja">Cara kerja</a><a href="#mata-kuliah">Mata kuliah</a><a href="#fitur">Fitur</a><a href="#tanya">Tanya jawab</a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {!me && <Link to="/masuk" className="btn-ghost px-3">Masuk</Link>}
            <Link to={startUrl} className="btn-primary btn-press">{me ? 'Buka beranda' : 'Daftar'}</Link>
          </div>
        </div>
      </header>

      <main id="utama">
        {/* HERO */}
        <section className="lp-hero surface-forest">
          <div className="lp-hero-dots tex-halftone-light" aria-hidden />
          <div className="lp-wrap lp-hero-grid">
            <div className="lp-hero-copy">
              <p className="lp-kicker"><span className="lp-dot" />Untuk mahasiswa kedokteran · semua fitur gratis</p>
              <h1>Latihan soal FK yang bikin kamu <span className="lp-hl">paham</span>, bukan cuma hafal kunci</h1>
              <p className="lp-lead">32 mata kuliah dari Anatomi sampai Sistem Saraf. Kerjakan per BAB atau simulasi ujian, baca pembahasan tiap pilihan, dan kirim PDF soal kampusmu supaya jadi latihan bareng.</p>
              <div className="lp-cta">
                <Link to={startUrl} className="btn btn-paper lp-cta-main">{startLabel} <ArrowRight size={19} /></Link>
                {!me && <Link to="/masuk" className="lp-cta-alt">Saya sudah punya akun</Link>}
              </div>
              <ul className="lp-proof">
                <li><Check size={17} /> Tanpa langganan</li>
                <li><Check size={17} /> Soal diperiksa admin sebelum tayang</li>
                <li><Check size={17} /> Nyaman di HP</li>
              </ul>
            </div>
            <QuizDemo />
          </div>
          <Ecg className="lp-hero-ecg" />
        </section>

        <Marquee />

        {/* CARA KERJA */}
        <section id="cara-kerja" className="lp-section lp-band tone-sky tone-surface">
          <div className="lp-band-dots tex-halftone" aria-hidden />
          <div className="lp-wrap">
            <div className="lp-heading lp-center reveal">
              <p className="lp-eyebrow">Cara kerja</p>
              <h2>Tiga langkah, setiap kali kamu buka MEDCOEL.</h2>
            </div>
            <ol className="lp-steps">
              {STEPS.map((s, i) => (
                <li key={s.n} className={clsx('card-chunky lp-step reveal', `tone-${s.tone}`)} style={{ '--i': i }}>
                  <div className="lp-step-top">
                    <span className="lp-step-n hand" aria-hidden>{s.n}.</span>
                    <span className="lp-step-icon tone-surface"><s.icon size={24} /></span>
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* MATA KULIAH */}
        <section id="mata-kuliah" className="lp-section lp-section-paper">
          <div className="lp-wrap">
            <div className="lp-heading lp-heading-split reveal">
              <div>
                <p className="lp-eyebrow">32 mata kuliah · 384 BAB</p>
                <h2>Dari ilmu dasar sampai sistem organ, semuanya di satu tempat.</h2>
              </div>
              <p className="lp-heading-note hand" aria-hidden>yang kamu pilih saat daftar<br />selalu muncul paling atas ↓</p>
            </div>
            <SubjectWall />
          </div>
        </section>

        {/* DI HP */}
        <section className="lp-section lp-phone-band surface-forest">
          <div className="lp-hero-dots tex-halftone-light" aria-hidden />
          <div className="lp-wrap lp-phone-grid">
            <div className="reveal">
              <p className="lp-eyebrow lp-eyebrow-light">Di HP maupun laptop</p>
              <h2 className="lp-phone-title">Lima menit di kereta pun cukup untuk satu BAB.</h2>
              <p className="lp-phone-lead">Progres tersimpan otomatis. Buka di HP, lanjutkan di laptop, dan hitung mundur ujianmu selalu ada di beranda.</p>
              <ul className="lp-phone-points">
                <li className="tone-mint"><Check size={18} /> Lanjut dari soal terakhir</li>
                <li className="tone-sun"><BellRing size={18} /> Pengingat H-7, H-3, H-1</li>
                <li className="tone-lilac"><Trophy size={18} /> Poin dan peringkat mingguan</li>
              </ul>
            </div>
            <div className="reveal" style={{ '--i': 2 }}><PhoneShot /></div>
          </div>
        </section>

        {/* FITUR */}
        <section id="fitur" className="lp-section tex-grid">
          <div className="lp-wrap">
            <div className="lp-heading reveal">
              <p className="lp-eyebrow">Fitur</p>
              <h2>Yang kamu dapat setelah daftar.</h2>
            </div>
            <div className="lp-bento">
              <article className="lp-card lp-card-sim surface-forest reveal">
                <div className="lp-hero-dots tex-halftone-light" aria-hidden />
                <p className="lp-card-tag"><SlidersHorizontal size={17} /> Simulasi</p>
                <h3>Atur sendiri komposisi soal ujianmu.</h3>
                <p>Pilih BAB, jumlah soal, dan berapa yang mudah, sedang, atau sulit. Atau ambil Paket 100, 150, 200 yang mencakup semua BAB.</p>
                <div className="lp-mix" aria-hidden>
                  {[['Mudah', 30, 'is-easy'], ['Sedang', 50, 'is-mid'], ['Sulit', 20, 'is-hard']].map(([l, v, c]) => (
                    <div key={l} className="lp-mix-row"><span>{l}</span><i className={c} style={{ width: `${v}%` }} /><b>{v}%</b></div>
                  ))}
                  <div className="lp-packs">{['Paket 100', 'Paket 150', 'Paket 200'].map((p, i) => <span key={p} className={i === 1 ? 'is-on' : ''}>{p}</span>)}</div>
                </div>
              </article>

              <article className="lp-card card-chunky tone-sun tone-surface reveal" style={{ '--i': 1 }}>
                <p className="lp-card-tag"><CalendarClock size={17} /> Jadwal ujian</p>
                <h3>Hitung mundur sampai hari ujian.</h3>
                <div className="lp-countdown" aria-hidden>
                  <div><b>12</b><span>hari</span></div><div><b>08</b><span>jam</span></div><div><b>45</b><span>menit</span></div>
                </div>
                <p className="lp-small"><BellRing size={15} /> Pengingat H-7, H-3, dan H-1. Zona WIB, WITA, atau WIT.</p>
              </article>

              <article className="lp-card card-chunky tone-lilac tone-surface reveal" style={{ '--i': 2 }}>
                <p className="lp-card-tag"><Trophy size={17} /> Leaderboard</p>
                <h3>Poin dari jawaban benar di percobaan pertama.</h3>
                <ol className="lp-board" aria-label="Contoh tampilan leaderboard">
                  <li><span>1</span><b>Nama tampil atau anonim</b><em>248</em></li>
                  <li><span>2</span><b>Per kampus atau nasional</b><em>231</em></li>
                  <li className="is-me"><span>3</span><b>Kamu</b><em>219</em></li>
                </ol>
              </article>

              <article className="lp-card lp-card-chat card-chunky tone-mint tone-surface reveal">
                <div className="lp-band-dots tex-halftone" aria-hidden />
                <p className="lp-card-tag"><FileUp size={17} /> Kirim soal lewat Chat Admin</p>
                <h3>Punya PDF soal tahun lalu? Jadikan latihan bareng.</h3>
                <div className="lp-chat" aria-hidden>
                  <p className="is-bot">Soal ini untuk mata kuliah apa?</p>
                  <p className="is-me">Parasitologi</p>
                  <p className="is-bot">Sip. Unggah PDF-nya di sini, nanti admin periksa dulu.</p>
                </div>
              </article>

              <article className="lp-card card-chunky tone-peach tone-surface reveal" style={{ '--i': 1 }}>
                <p className="lp-card-tag"><Building2 size={17} /> Soal kampusmu</p>
                <h3>Soal khusus kampus hanya terlihat teman sekampus.</h3>
                <p className="lp-small"><ListChecks size={15} /> Kamu yang memilih saat mengirim PDF.</p>
              </article>
            </div>
          </div>
        </section>

        {/* ANGKA */}
        <section className="lp-numbers tone-sun tone-surface" aria-label="MEDCOEL dalam angka">
          <div className="lp-band-dots tex-halftone" aria-hidden />
          <div className="lp-wrap lp-numbers-row">
            <div className="reveal"><b aria-live="polite">{fmt(soal)}</b><span>soal sudah tayang</span></div>
            <div className="reveal" style={{ '--i': 1 }}><b>32</b><span>mata kuliah</span></div>
            <div className="reveal" style={{ '--i': 2 }}><b>384</b><span>BAB</span></div>
            <div className="reveal" style={{ '--i': 3 }}><b>Rp0</b><span>biaya untuk semua fitur</span></div>
          </div>
        </section>

        {/* FAQ */}
        <section id="tanya" className="lp-section lp-section-paper">
          <div className="lp-wrap lp-faq-grid">
            <div className="lp-heading reveal">
              <p className="lp-eyebrow">Tanya jawab</p>
              <h2>Yang sering ditanyakan.</h2>
              <p className="lp-faq-note">Masih ada yang bingung? Tanya langsung ke admin lewat Chat Admin setelah masuk{settings?.adminWhatsapp ? ', atau lewat WhatsApp' : ''}.</p>
              {settings?.adminWhatsapp && <a href={waLink(settings.adminWhatsapp, 'Halo admin MEDCOEL, saya mau tanya.')} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-4"><MessageCircle size={18} /> WhatsApp admin</a>}
            </div>
            <div className="lp-faq">
              {FAQ.map(([q, a], i) => (
                <details key={q} className="card-chunky reveal" style={{ '--i': i }}>
                  <summary>{q}<ChevronDown size={20} aria-hidden /></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* AJAKAN */}
        <section className="lp-wrap lp-final-wrap">
          <div className="lp-final surface-forest reveal">
            <div className="lp-hero-dots tex-halftone-light" aria-hidden />
            <div className="lp-final-copy">
              <h2>Soal pertamamu sudah menunggu.</h2>
              <p>Daftar sebentar saja: pilih kampus dan mata kuliah yang sedang kamu pelajari, lalu langsung latihan.</p>
              <div className="lp-cta">
                <Link to={startUrl} className="btn btn-paper lp-cta-main">{startLabel} <ArrowRight size={19} /></Link>
                {settings?.waCommunityUrl && <a href={settings.waCommunityUrl} target="_blank" rel="noopener noreferrer" className="lp-cta-alt"><MessageCircle size={18} /> Komunitas WhatsApp</a>}
                {settings?.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="lp-cta-alt"><Instagram size={18} /> Instagram</a>}
              </div>
            </div>
            <div className="lp-final-art" aria-hidden>
              {['sistem-kardiovaskular', 'histologi', 'farmakologi'].map((k, i) => (
                <div key={k} className={clsx('sticker-tone lp-final-sticker', `s${i}`, toneClass(k))}><span className={clsx('tape', i === 1 && 'tape-mint')} style={{ top: -11, left: 30 }} /><img src={img(k)} alt="" width={150} height={150} loading="lazy" /></div>
              ))}
              <p className="hand lp-final-note">sampai ketemu<br />di soal pertama!</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-row">
          <div>
            <Logo />
            <p>Belajar kedokteran bareng komunitas, tanpa bayar.</p>
          </div>
          <nav aria-label="Tautan bawah">
            {!me && <Link to="/masuk">Masuk</Link>}
            {!me && <Link to="/daftar">Daftar</Link>}
            <Link to="/kebijakan-privasi">Kebijakan privasi</Link>
          </nav>
          <span>© {new Date().getFullYear()} MEDCOEL · medcoel.com</span>
        </div>
      </footer>
    </div>
  );
}
