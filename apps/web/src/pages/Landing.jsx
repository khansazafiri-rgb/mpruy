import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, CheckCircle2, ChevronRight, FileUp, Instagram, Layers, MessageCircle, RotateCcw, Sparkles, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Illustration from '@/components/Illustration';
import Logo from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const SAMPLES = [
  { key: 'anatomi', name: 'Anatomi', topic: 'Terminologi anatomis', question: 'Bidang yang membagi tubuh menjadi bagian kanan dan kiri yang sama besar disebut…', options: ['Bidang koronal', 'Bidang median', 'Bidang transversal'], answer: 1, explanation: 'Bidang median melewati garis tengah tubuh dan membaginya menjadi sisi kanan dan kiri yang sama besar.' },
  { key: 'fisiologi', name: 'Fisiologi', topic: 'Transport membran', question: 'Perpindahan air melalui membran semipermeabel disebut…', options: ['Osmosis', 'Fagositosis', 'Eksositosis'], answer: 0, explanation: 'Osmosis adalah perpindahan air melalui membran semipermeabel akibat perbedaan konsentrasi zat terlarut.' },
  { key: 'biokimia', name: 'Biokimia', topic: 'Biomolekul', question: 'Unit penyusun utama protein adalah…', options: ['Asam lemak', 'Monosakarida', 'Asam amino'], answer: 2, explanation: 'Asam amino saling terhubung melalui ikatan peptida untuk membentuk rantai protein.' },
];

function LearningPreview() {
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState(null);
  const [checked, setChecked] = useState(false);
  const sample = SAMPLES[active];
  const choose = (i) => { setActive(i); setPicked(null); setChecked(false); };
  return (
    <div className="learning-preview">
      <div className="preview-topline"><span><span className="status-light" /> RUANG BELAJAR</span><span>Pratinjau interaktif</span></div>
      <div className="preview-tabs" role="group" aria-label="Mata kuliah contoh">
        {SAMPLES.map((s, i) => <button key={s.key} type="button" aria-pressed={i === active} onClick={() => choose(i)}>{s.name}<ArrowUpRight size={13} aria-hidden /></button>)}
      </div>
      <div className="preview-sheet" key={sample.key}>
        <div className="preview-subject">
          <div><p className="eyebrow">Contoh latihan</p><h2>{sample.name}</h2><p>{sample.topic}</p></div>
          <Illustration subject={{ illustrationKey: sample.key }} className="preview-illustration" />
        </div>
        <div className="preview-question">
          <div className="preview-question-meta"><span>01 <span>/ 01</span></span><span><span className="status-light" /> Mode Learning</span></div>
          <p className="preview-stem">{sample.question}</p>
          <fieldset className="preview-options" disabled={checked}>
            <legend className="sr-only">Pilih jawaban contoh</legend>
            {sample.options.map((o, i) => <label key={o} className={`preview-option ${picked === i ? 'is-picked' : ''} ${checked && i === sample.answer ? 'is-correct' : ''} ${checked && picked === i && i !== sample.answer ? 'is-wrong' : ''}`}>
              <input type="radio" name={`sample-${sample.key}`} className="sr-only" checked={picked === i} onChange={() => setPicked(i)} />
              <span className="preview-letter">{checked && i === sample.answer ? <Check size={14} /> : String.fromCharCode(65 + i)}</span><span>{o}</span>
            </label>)}
          </fieldset>
          {checked ? <div className="preview-explanation" role="status"><b>{picked === sample.answer ? 'Tepat sekali.' : 'Yuk, pahami bersama.'}</b> {sample.explanation}</div> : null}
          <div className="preview-actions"><span>Contoh soal · coba pilih jawaban</span>{checked ? <button className="btn-ghost btn-sm" type="button" onClick={() => { setPicked(null); setChecked(false); }}><RotateCcw size={13} /> Ulangi</button> : <button type="button" className="btn-primary btn-sm" disabled={picked === null} onClick={() => setChecked(true)}>Cek jawaban <ArrowRight size={13} /></button>}</div>
        </div>
      </div>
      <div className="preview-bottom"><BookOpen size={14} /><span>Sedikit lebih paham. Satu soal setiap kali.</span></div>
    </div>
  );
}

const JOURNEY = [
  { icon: BookOpen, title: 'Pilih yang sedang dipelajari.', text: 'Mulai dari mata kuliah dan BAB yang kamu butuhkan. Pilihanmu selalu hadir lebih dulu.' },
  { icon: Target, title: 'Latihan. Pahami. Ulangi.', text: 'Cek jawaban dan pembahasan per soal, atau gunakan mode ujian untuk mengukur kesiapanmu.' },
  { icon: Layers, title: 'Temukan ritme belajarmu.', text: 'Atur komposisi simulasi, lihat progres, dan siapkan diri menuju ujian berikutnya.' },
];

export default function Landing() {
  const { me, settings } = useAuth();
  const [stats, setStats] = useState(null);
  useEffect(() => { let alive = true; api('stats').then((s) => { if (alive) setStats(s); }).catch(() => {}); return () => { alive = false; }; }, []);
  const startUrl = me ? '/beranda' : '/daftar';
  return (
    <div className="landing paper-surface">
      <a href="#utama" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:p-3">Lewati ke isi</a>
      <header className="landing-header">
        <div className="landing-container landing-nav">
          <Link to="/" aria-label="MEDCOEL halaman utama"><Logo /></Link>
          <nav aria-label="Navigasi halaman utama"><a href="#cara-belajar">Cara belajar</a><a href="#fitur">Fitur</a><a href="#komunitas">Komunitas</a></nav>
          <div className="flex items-center gap-2">{!me && <Link to="/masuk" className="btn-ghost landing-login">Masuk</Link>}<Link to={startUrl} className="btn-primary landing-start">{me ? 'Buka beranda' : 'Mulai gratis'}<ArrowUpRight size={15} /></Link></div>
        </div>
      </header>
      <main id="utama">
        <section className="landing-hero landing-container">
          <div className="hero-copy">
            <p className="landing-kicker"><span className="status-light" /> RUANG BELAJAR MAHASISWA KEDOKTERAN</p>
            <h1>Banyak materi.<br />Satu tempat<br /><span>untuk mengerti.</span></h1>
            <p className="hero-description">Dari Anatomi sampai sistem tubuh. Latihan soal, pahami pembahasan, dan temukan ritme belajarmu—bareng komunitas.</p>
            <div className="hero-cta"><Link to={startUrl} className="btn-primary">{me ? 'Lanjut belajar' : 'Mulai belajar gratis'}<ArrowRight size={18} /></Link><a href="#cara-belajar" className="hero-secondary">Kenali MEDCOEL<ArrowDown size={15} /></a></div>
            <div className="hero-notes"><span><CheckCircle2 size={15} /> Semua fitur gratis</span><span><CheckCircle2 size={15} /> Untuk semua kampus</span></div>
            <div className="hero-footnote"><span className="hero-footnote-line" /><p>Belajar bukan sekadar selesai.<br /><strong>Tapi pulang dengan lebih paham.</strong></p></div>
          </div>
          <div className="hero-stage forest-surface"><div className="hero-stage-orbit" aria-hidden /><div className="stage-caption"><Sparkles size={15} /><span>Rasa penasaranmu, punya tempat.</span></div><LearningPreview /><span className="stage-index" aria-hidden>MEDCOEL / STUDY WELL</span></div>
        </section>
        <div className="landing-container"><div className="landing-strip"><p>Dibuat untuk perjalanan<br /><strong>panjang di kedokteran.</strong></p><div><BookOpen size={21} /><span><strong>{stats?.subjects > 0 ? `${stats.subjects} mata kuliah` : 'Lintas mata kuliah'}</strong><small>Dari dasar sampai klinis</small></span></div><div><Layers size={21} /><span><strong>Learning & ujian</strong><small>Dua cara, satu tujuan</small></span></div><div><Sparkles size={21} /><span><strong>100% gratis</strong><small>Ruang yang terbuka untukmu</small></span></div></div></div>

        <section id="cara-belajar" className="landing-container landing-section">
          <div className="landing-section-heading"><div><p className="eyebrow">SEDIKIT DEMI SEDIKIT</p><h2>Mulai dari satu topik.<br /><span>Bangun pemahaman yang utuh.</span></h2></div><p>Tidak harus menguasai semuanya hari ini. Pilih satu bagian, lalu beri dirimu ruang untuk memahami.</p></div>
          <div className="journey-grid">{JOURNEY.map((s, i) => <article className="journey-card" key={s.title}><div className="journey-top"><span className="journey-icon"><s.icon size={21} /></span><span>0{i + 1}</span></div><h3>{s.title}</h3><p>{s.text}</p></article>)}</div>
        </section>

        <section id="fitur" className="landing-container landing-section landing-features">
          <div className="landing-section-heading"><div><p className="eyebrow">SATU RUANG, BANYAK KEMUNGKINAN</p><h2>Yang kamu butuhkan.<br /><span>Lebih dekat, lebih tertata.</span></h2></div></div>
          <div className="feature-composition">
            <article className="feature-focus forest-surface"><div className="feature-label"><Target size={19} /><span>LATIHAN & SIMULASI</span></div><h3>Belajar dengan caramu.<br />Ujian dengan ritmemu.</h3><p>Pilih BAB, jumlah soal, dan tingkat kesulitan. Cek pembahasan langsung atau simpan sampai ujian selesai.</p><div className="feature-mode-list"><div><BookOpen size={21} /><span><b>Mode Learning</b><small>Pahami alasan di balik jawaban.</small></span><CheckCircle2 size={18} /></div><div><Layers size={21} /><span><b>Mode ujian</b><small>Fokus mengerjakan, bahas setelahnya.</small></span><ChevronRight size={18} /></div></div><Link to={startUrl}>Temukan cara belajarmu <ArrowUpRight size={17} /></Link></article>
            <article className="feature-calendar paper-surface"><div className="feature-label"><CalendarDays size={19} /><span>JADWAL & PENGINGAT</span></div><h3>Biar ujian tidak<br />datang tiba-tiba.</h3><p>Catat jadwalmu. Pantau hitung mundurnya. Dapatkan pengingat H-7, H-3, dan H-1.</p><div className="calendar-art" aria-hidden><div className="calendar-binding"><i /><i /></div><div className="calendar-dots">{Array.from({ length: 14 }, (_, i) => <i key={i} className={[3, 7, 10].includes(i) ? 'marked' : ''}>{i + 1}</i>)}</div><span><Check size={13} /> Satu langkah lebih siap</span></div></article>
            <article className="feature-community"><span className="feature-small-icon"><FileUp size={23} /></span><div><p className="eyebrow">DARI KOMUNITAS, UNTUK KOMUNITAS</p><h3>Soalmu bisa membantu teman lain.</h3><p>Kirim PDF melalui Chat Admin. Setelah diperiksa, soal bisa jadi bahan latihan bersama.</p></div><ArrowUpRight size={23} aria-hidden /></article>
          </div>
        </section>

        <section id="komunitas" className="landing-container landing-section">
          <div className="community-invite forest-surface"><span className="community-star" aria-hidden>✳</span><div><p className="eyebrow">KAMU TIDAK BELAJAR SENDIRIAN</p><h2>Perjalanan panjang.<br />Lebih ringan bersama.</h2><p>Teman satu tujuan, dari berbagai kampus. Tukar semangat dan tumbuh bersama komunitas MEDCOEL.</p><div className="flex flex-wrap gap-3">{settings?.waCommunityUrl ? <a href={settings.waCommunityUrl} target="_blank" rel="noopener noreferrer" className="btn invite-primary"><MessageCircle size={17} /> Gabung komunitas</a> : <Link to={startUrl} className="btn invite-primary">{me ? 'Kembali belajar' : 'Jadi bagian dari MEDCOEL'}<ArrowRight size={17} /></Link>}{settings?.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn invite-secondary"><Instagram size={17} /> Instagram</a>}</div></div><div className="community-art" aria-hidden><Illustration subject={{ illustrationKey: 'histologi' }} /><Illustration subject={{ illustrationKey: 'anatomi' }} /><Illustration subject={{ illustrationKey: 'biokimia' }} /></div></div>
        </section>
      </main>
      <footer className="landing-footer landing-container"><div><Logo /><p>Ruang untuk belajar. Ruang untuk bertumbuh.</p></div><span>© {new Date().getFullYear()} MEDCOEL</span><Link to="/kebijakan-privasi">Kebijakan privasi <ArrowUpRight size={13} /></Link></footer>
    </div>
  );
}
