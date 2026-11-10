import { Link } from 'react-router-dom';
import { ArrowRight, Box, Activity, Target } from 'lucide-react';
import StructureThumbnail from '../features/anatomy/StructureThumbnail';
import './AnatomySplit.css';

// 3D: the real rendered muscular body from the atlas meshes. 4D: a real capture of the Live 4D Lab (patient, probe and
// the simulated USG / CT images), composed into one picture. Both are screenshots of MEDCOEL's own product.
export default function AnatomySplit({ structureCount, heroUrl }) {
  return (
    <section className="anatomy-split" aria-labelledby="anatomy-split-title">
      <div className="anatomy-split-head">
        <p className="library-eyebrow">DUA CARA BELAJAR</p>
        <h1 id="anatomy-split-title">3D untuk bentuk. 4D untuk gerak.</h1>
        <p>Dimensi ke-4 adalah <b>waktu</b>: jantung berdenyut, paru mengembang, dan kamu memegang probe USG sendiri.</p>
      </div>
      <div className="anatomy-split-cards">
        <article className="split-card split-3d">
          <div className="split-art split-art-3d"><span className="split-badge">3D</span>
            <StructureThumbnail path={heroUrl} name="Tubuh manusia 3D dengan otot dan rangka dari Atlas MEDCOEL" className="split-art-model" eager />
          </div>
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
          <div className="split-art split-art-4d"><span className="split-badge">4D</span>
            <img src="/anatomy-landing/live-4d.webp" width="1280" height="800" loading="eager" decoding="async" alt="Live 4D Lab: pasien virtual dengan probe USG, serta citra USG dan CT simulasi di sebelahnya" />
          </div>
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
