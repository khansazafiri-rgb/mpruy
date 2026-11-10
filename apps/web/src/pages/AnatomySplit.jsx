import { Link } from 'react-router-dom';
import { ArrowRight, Box, Activity, Target } from 'lucide-react';
import './AnatomySplit.css';

// Original MEDCOEL schematic illustrations (plain SVG drawn for this page, no third-party artwork).
function Art3D() {
  return (
    <svg viewBox="0 0 320 190" role="img" aria-label="Ilustrasi: tubuh 3D yang bisa diputar dan dibuka lapisannya" className="split-art-svg">
      <ellipse className="orbit" cx="160" cy="98" rx="104" ry="26" />
      <path className="orbit-arrow" d="M258 84 l10 8 -12 3" />
      <g className="body">
        <circle cx="160" cy="34" r="14" />
        <path d="M138 56 q22 -10 44 0 l8 54 h-16 l-4 62 h-12 l-2 -52 -2 52 h-12 l-4 -62 h-16 z" />
        <path d="M138 58 l-22 52 M182 58 l22 52" />
      </g>
      <g className="layer">
        <path d="M150 64 q10 -4 20 0 M148 74 q12 -4 24 0 M149 84 q11 -4 22 0 M150 94 q10 -4 20 0" />
        <path d="M160 58 v46" />
      </g>
      <text x="306" y="24" textAnchor="end" className="split-art-cap">putar · lapisi · beri nama</text>
    </svg>
  );
}
function Art4D() {
  return (
    <svg viewBox="0 0 320 190" role="img" aria-label="Ilustrasi: probe USG, irisan citra yang berdenyut, dan grafik jantung terhadap waktu" className="split-art-svg">
      <rect className="probe" x="140" y="8" width="40" height="22" rx="7" />
      <path className="probe-neck" d="M150 30 h20 l10 12 h-40 z" />
      <path className="fan" d="M140 42 L72 150 A110 110 0 0 0 248 150 L180 42 Z" />
      <g className="heart">
        <path d="M160 82 c-14 -20 -40 -2 -22 22 c6 8 16 14 22 20 c6 -6 16 -12 22 -20 c18 -24 -8 -42 -22 -22 z" />
      </g>
      <path className="ecg" d="M14 168 h60 l8 -16 8 28 8 -12 h40 l8 -22 8 38 8 -16 h130" />
      <circle className="ecg-dot" cx="14" cy="168" r="3.5" />
      <text x="306" y="184" textAnchor="end" className="split-art-cap">waktu →</text>
    </svg>
  );
}

export default function AnatomySplit({ structureCount }) {
  return (
    <section className="anatomy-split" aria-labelledby="anatomy-split-title">
      <div className="anatomy-split-head">
        <p className="library-eyebrow">DUA CARA BELAJAR</p>
        <h2 id="anatomy-split-title">3D untuk bentuk. 4D untuk gerak.</h2>
        <p>Dimensi ke-4 adalah <b>waktu</b>: jantung berdenyut, paru mengembang, dan kamu memegang probe USG sendiri.</p>
      </div>
      <div className="anatomy-split-cards">
        <article className="split-card split-3d">
          <div className="split-art"><span className="split-badge">3D</span><Art3D /></div>
          <h3>Atlas 3D · Anatomi</h3>
          <p className="split-tag">Lihat letak dan bentuk strukturnya.</p>
          <ul>
            <li>Putar, perbesar, sembunyikan lapisan dari kulit sampai tulang.</li>
            <li>{structureCount} struktur bernama dengan nama Inggris, Latin, dan Indonesia.</li>
            <li>Tubuh diam: tepat untuk menghafal anatomi.</li>
          </ul>
          <div className="split-actions">
            <Link className="btn-primary" to="/anatomy/explore"><Box size={16} /> Buka Atlas 3D <ArrowRight size={15} /></Link>
            <Link className="btn-secondary" to="/anatomy/study"><Target size={16} /> Kuis anatomi 3D</Link>
          </div>
        </article>
        <article className="split-card split-4d">
          <div className="split-art"><span className="split-badge">4D</span><Art4D /></div>
          <h3>Live 4D Lab · USG &amp; CT</h3>
          <p className="split-tag">Lihat tubuh bekerja dan belajar memindainya.</p>
          <ul>
            <li>Gerakkan probe USG; citra USG dan CT simulasi mengikuti.</li>
            <li>Jantung dan napas bergerak: EKG, suara jantung, kasus patologi.</li>
            <li>Untuk latihan klinis; kuisnya tetap anatomi di Atlas 3D.</li>
          </ul>
          <div className="split-actions">
            <Link className="btn-primary" to="/anatomy/live"><Activity size={16} /> Buka Live 4D Lab <ArrowRight size={15} /></Link>
          </div>
          <small className="split-note">Simulasi edukatif, bukan alat diagnosis.</small>
        </article>
      </div>
    </section>
  );
}
