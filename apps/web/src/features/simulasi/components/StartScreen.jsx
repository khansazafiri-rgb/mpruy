// Layar awal: pemain hanya mengatur caranya bermain. Pasien dipilih sistem
// secara acak; kasus menentukan pasien, ruang poli, dan jas dokter.
import clsx from 'clsx';
import { GraduationCap, ListChecks, MessageCircleQuestion, NotebookPen, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import Mascot from '@/components/Mascot';
import { asset } from '../engine';

const DURS = [[300, '5 menit'], [600, '10 menit'], [900, '15 menit']];

export default function StartScreen({ prefs, setPrefs, onStart, lastResult }) {
  const set = (k, v) => setPrefs({ ...prefs, [k]: v });
  return (
    <div className="sim-start">
      <section className="sim-start-hero surface-forest">
        <div className="sim-start-copy">
          <p className="sim-start-eyebrow">Simulasi jadi dokter</p>
          <h1>Pasienmu sudah menunggu di ruang periksa.</h1>
          <p>Tanya keluhannya, periksa, minta penunjang, lalu tetapkan diagnosis dan rencana. Setiap pasien dipilih acak dari poli yang berbeda, jadi kamu tidak tahu kasusnya sebelum masuk.</p>
          <button type="button" className="btn btn-paper sim-start-btn" onClick={onStart}><Play size={19} /> Mulai pasien baru</button>
          <Link to="/simulasi-dokter?tutorial=1" className="sim-start-tour"><GraduationCap size={17} /> Belum pernah coba? Ikuti tutorial bareng Nilo</Link>
        </div>
        <div className="sim-start-art" aria-hidden>
          <img className="sim-start-bg" src={asset('BG_tunggu')} alt="" />
          <img className="sim-start-sus" src={asset('SUS_senyum')} alt="" />
          <img className="sim-start-dok" src={asset(prefs.gender === 'P' ? 'DOK_P_umum_netral' : 'DOK_L_umum_netral')} alt="" />
          <span className="sim-start-mystery">?</span>
        </div>
      </section>

      <div className="sim-start-grid">
        <section className="sim-start-prefs card-chunky" aria-labelledby="sim-prefs-title">
          <h2 id="sim-prefs-title">Atur caramu bermain</h2>
          <fieldset>
            <legend>Mode</legend>
            <div className="sim-seg">
              <button type="button" aria-pressed={prefs.mode === 'santai'} onClick={() => set('mode', 'santai')}><b>Santai</b><small>Tanpa batas waktu</small></button>
              <button type="button" aria-pressed={prefs.mode === 'timer'} onClick={() => set('mode', 'timer')}><b>Berwaktu</b><small>Seperti ujian OSCE</small></button>
            </div>
            {prefs.mode === 'timer' && (
              <div className="sim-chips" role="group" aria-label="Lama waktu">
                {DURS.map(([v, l]) => <button key={v} type="button" aria-pressed={prefs.dur === v} onClick={() => set('dur', v)}>{l}</button>)}
              </div>
            )}
          </fieldset>
          <fieldset>
            <legend>Penampilan doktermu</legend>
            <div className="sim-chips" role="group" aria-label="Penampilan dokter">
              <button type="button" aria-pressed={prefs.gender === 'L'} onClick={() => set('gender', 'L')}>Laki-laki</button>
              <button type="button" aria-pressed={prefs.gender === 'P'} onClick={() => set('gender', 'P')}>Perempuan</button>
            </div>
            {prefs.gender === 'P' && <p className="sim-start-note">Dokter perempuan baru punya jas poli umum, jadi di poli spesialis jasnya tetap jas umum.</p>}
          </fieldset>
        </section>

        <section className="sim-start-how" aria-labelledby="sim-how-title">
          <div className="sim-start-how-head">
            <Mascot name="nilo" mood="wave" size={72} />
            <h2 id="sim-how-title">Cara mainnya</h2>
          </div>
          <ol>
            <li className={clsx('tone-mint')}><MessageCircleQuestion size={18} aria-hidden /><span><b>Pilih bagian, lalu tanya.</b> Mulai dari keluhan utama, lanjut ke telaah sistem dan riwayat.</span></li>
            <li className="tone-sky"><ListChecks size={18} aria-hidden /><span><b>Jelaskan alasanmu.</b> Untuk tindakan spesifik, kamu ditanya: kenapa kamu melakukan ini?</span></li>
            <li className="tone-sun"><NotebookPen size={18} aria-hidden /><span><b>Catatan terisi sendiri.</b> Jawaban dan hasil pemeriksaan langsung masuk catatan SOAP.</span></li>
          </ol>
          {lastResult && <p className="sim-start-last">Hasil terakhirmu: <b>{lastResult.score}</b> di {lastResult.caseTitle}. <Link to="/riwayat?tab=dokter">Lihat riwayat</Link></p>}
        </section>
      </div>
    </div>
  );
}
