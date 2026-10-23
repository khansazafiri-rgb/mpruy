// Kartu ajakan Simulasi Dokter di Beranda.
import { ArrowRight, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import Mascot from '@/components/Mascot';
import { asset } from '../engine';
import '@/styles/simulasi.css';

export default function SimHomeCard() {
  return (
    <section className="sim-home surface-forest" aria-labelledby="sim-home-title">
      <div className="sim-home-copy">
        <p className="sim-home-eyebrow"><Stethoscope size={16} aria-hidden /> Fitur baru · Simulasi jadi dokter</p>
        <h2 id="sim-home-title">Hadapi pasien virtual dari poli yang berbeda.</h2>
        <p>Tanya keluhan, periksa, tetapkan diagnosis, dan jelaskan alasanmu. Laporannya langsung keluar.</p>
        <Link to="/simulasi-dokter" className="btn btn-paper">Coba sekarang <ArrowRight size={17} /></Link>
      </div>
      <div className="sim-home-art" aria-hidden>
        <img src={asset('PAS_kakek_lemas')} alt="" className="sim-home-pas" loading="lazy" />
        <img src={asset('DOK_L_umum_netral')} alt="" className="sim-home-dok" loading="lazy" />
        <Mascot name="nilo" mood="wave" size={78} className="sim-home-mascot" />
      </div>
    </section>
  );
}
