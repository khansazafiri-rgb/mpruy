// Tutorial Simulasi Dokter bersama Nilo. Setiap langkah menyorot satu bagian
// layar. Langkah yang menunggu tindakan pemain maju sendiri begitu tindakannya
// dilakukan; tombol Lanjut/Kembali tetap ada. "Lewati" kecil di pojok kanan atas.
import clsx from 'clsx';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Mascot from '@/components/Mascot';

export const TOUR = [
  { id: 'hello', target: null, mood: 'wave', title: 'Hai, aku Nilo!', body: 'Aku temani kamu mencoba Simulasi Dokter. Pasien hari ini Pak Slamet. Kamu dokternya, Suster Ani membantumu.' },
  { id: 'dialog', target: 'dialog', mood: 'talk', title: 'Ketuk kotak dialog', body: 'Percakapan muncul di sini. Ketuk kotaknya (atau tekan Enter) untuk lanjut ke kalimat berikutnya.', wait: 'Ketuk sampai pasien selesai bicara.' },
  { id: 'areas', target: 'areas', mood: 'idle', title: 'Mau tanya bagian apa?', body: 'Anamnesis dimulai dengan memilih bagian. Coba buka "Telaah sistem" untuk menanyakan gejala per sistem organ.', wait: 'Pilih salah satu bagian.' },
  { id: 'list', target: 'list', mood: 'idle', title: 'Pilih satu pertanyaan', body: 'Sekarang pilih pertanyaan, misalnya "Apakah ada demam?". Pertanyaan yang sudah ditanyakan diberi tanda centang.', wait: 'Ketuk satu pertanyaan.' },
  { id: 'reason', target: 'reason', mood: 'think', title: 'Kenapa kamu menanyakan ini?', body: 'Untuk tindakan yang spesifik, kamu diminta memilih dugaan yang ingin dinilai. Hanya alasan yang tepat yang membuka tindakannya; kalau belum tepat, tindakan belum dilakukan dan kamu memilih lagi. Pilihan yang pas di percobaan pertama dapat nilai penuh.', wait: 'Pilih alasan yang tepat.' },
  { id: 'answer', target: 'dialog', mood: 'talk', title: 'Dengarkan jawabannya', body: 'Pertanyaanmu sudah diajukan. Ketuk kotak dialog untuk mendengar jawaban Pak Slamet.', wait: 'Ketuk kotak dialog.' },
  { id: 'notes', target: 'notes', mood: 'happy', title: 'Catatan terisi sendiri', body: 'Jawaban pasien langsung masuk Catatan dokter bagian S. Hasil pemeriksaan masuk O, diagnosis A, dan tatalaksana P. Kamu juga bisa menulis catatan sendiri di bawahnya.' },
  { id: 'phases', target: 'phases', mood: 'idle', title: 'Tahap berikutnya', body: 'Lanjutkan dengan cara yang sama di Pemeriksaan fisik, Penunjang, dan Tatalaksana. Angka kecil menunjukkan berapa tindakan yang sudah kamu lakukan di tiap tahap.' },
  { id: 'dx', target: 'dx', mood: 'think', title: 'Tetapkan diagnosis, lalu selesai', body: 'Pilih diagnosis kerja dan ketuk Tetapkan. Kamu akan ditanya diagnosis banding apa yang masih perlu disingkirkan. Setelah itu ketuk Akhiri konsultasi.', wait: 'Akhiri konsultasi untuk melihat laporan.' },
  { id: 'report', target: 'report', mood: 'cheer', title: 'Ini laporanmu', body: 'Skor dari diagnosis, hal penting yang kamu lakukan, alasanmu, dan efisiensi. Di bawahnya ada umpan balik untuk setiap tindakan dan hal penting yang terlewat. Hasil tutorial tidak disimpan ke riwayat.' },
];

/** Apakah syarat langkah yang menunggu sudah terpenuhi. */
export function stepDone(id, sim, ui) {
  const { s } = sim;
  if (id === 'dialog') return (s.queue === s.ctx.C.intro && s.qi >= s.queue.length - 1 && !s.typing) || s.actions.length > 0;
  if (id === 'areas') return !!ui.area || s.actions.length > 0;
  if (id === 'list') return s.pending?.type === 'reason' || s.actions.length > 0;
  if (id === 'reason') return !s.pending && Object.keys(s.reasons).length > 0;
  if (id === 'answer') return s.log.some((e) => e.sec === 'S' && e.key !== 'ku');
  if (id === 'dx') return s.finished;
  return false;
}

/**
 * Sorotan dan letak gelembung dihitung di requestAnimationFrame dan ditulis
 * langsung ke elemen (bukan state React), supaya mengikuti gulir dan ukuran
 * layar tanpa memicu render berulang.
 */
function useSpotlight(target, step, ringRef, dimRef, bubbleRef) {
  useEffect(() => {
    let raf;
    let scrolled = false;
    const tick = () => {
      const ring = ringRef.current;
      const dim = dimRef.current;
      const b = bubbleRef.current;
      const el = target ? document.querySelector(`[data-tour="${target}"]`) : null;
      const W = window.innerWidth;
      const H = window.innerHeight;
      let r = null;
      if (el) {
        if (!scrolled) {
          scrolled = true;
          const r0 = el.getBoundingClientRect();
          if (r0.top < 90 || r0.bottom > H - 40) el.scrollIntoView({ block: r0.height > H * 0.7 ? 'start' : 'center', behavior: 'smooth' });
        }
        r = el.getBoundingClientRect();
      }
      if (ring) {
        ring.style.display = r ? 'block' : 'none';
        if (r) Object.assign(ring.style, { top: `${r.top - 8}px`, left: `${r.left - 8}px`, width: `${r.width + 16}px`, height: `${r.height + 16}px` });
      }
      if (dim) dim.style.display = r ? 'none' : 'block';
      if (b) {
        const mobile = W < 768;
        b.classList.toggle('is-mobile', mobile);
        b.classList.toggle('is-top', mobile && !!r && (target === 'reason' || r.top + r.height / 2 > H * 0.5));
        b.classList.toggle('is-center', !mobile && !r);
        if (mobile || !r) { b.style.top = ''; b.style.left = ''; } else {
          const bw = b.offsetWidth;
          const bh = b.offsetHeight;
          const gap = 18;
          const right = r.left + r.width + gap + bw <= W - 12;
          const left = r.left - gap - bw >= 12;
          let x;
          if (right) x = r.left + r.width + gap;
          else if (left) x = r.left - gap - bw;
          else x = Math.min(Math.max(12, r.left + r.width / 2 - bw / 2), W - bw - 12);
          let y = right || left ? r.top : r.top + r.height + gap;
          if (y + bh > H - 12) y = Math.max(12, r.top - bh - gap);
          y = Math.min(Math.max(12, y), H - bh - 12);
          b.style.top = `${Math.round(y)}px`;
          b.style.left = `${Math.round(x)}px`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    document.body.classList.add('tour-active');
    return () => { cancelAnimationFrame(raf); document.body.classList.remove('tour-active'); };
  }, [target, step, ringRef, dimRef, bubbleRef]);
}

export default function TutorialCoach({ step, setStep, sim, ui, onSkip, onDone, finished }) {
  const cur = TOUR[step];
  const ring = useRef(null);
  const dim = useRef(null);
  const bubble = useRef(null);
  useSpotlight(finished ? null : cur?.target, step, ring, dim, bubble);
  const waiting = cur?.wait && !stepDone(cur.id, sim, ui);

  // Maju sendiri saat tindakan yang ditunggu sudah dilakukan.
  const ready = !!cur?.wait && stepDone(cur.id, sim, ui);
  useEffect(() => {
    if (!ready) return undefined;
    const t = setTimeout(() => setStep(step + 1), cur.id === 'answer' ? 1100 : 450);
    return () => clearTimeout(t);
  }, [ready, step, setStep, cur]);

  if (!cur && !finished) return null;
  // Saat lembar refleksi terbuka di luar langkahnya, gelembung disembunyikan supaya tidak menutupi pilihan.
  const hidden = !finished && !!sim.s.pending && cur.id !== 'reason';

  return createPortal(
    <div className="tour-layer" aria-live="polite">
      {!hidden && <div ref={ring} className="tour-ring" style={{ display: 'none' }} aria-hidden />}
      {!finished && !hidden && <div ref={dim} className="tour-dim" aria-hidden />}
      {!finished && <button type="button" className="tour-skip" onClick={onSkip}>Lewati</button>}
      {finished ? (
        <div key="final" className="tour-bubble is-center is-final" role="dialog" aria-label="Tutorial selesai">
          <Mascot name="nilo" mood="cheer" size={110} />
          <h3>Tutorial selesai!</h3>
          <p>Sekarang kamu tahu cara bertanya, menjelaskan alasan, membaca catatan, dan menutup konsultasi. Di pasien sungguhan, kamu memilih poli dan penyakitnya diundi dari poli itu.</p>
          <div className="tour-final-btns">{onDone}</div>
        </div>
      ) : hidden ? null : (
        <div
          key="step"
          ref={bubble}
          // Kelas is-mobile/is-center dan posisi diatur oleh useSpotlight.
          className="tour-bubble"
          role="dialog"
          aria-labelledby="tour-title"
        >
          <div className="tour-head">
            <Mascot name="nilo" mood={cur.mood} size={64} />
            <div className="min-w-0">
              <p className="tour-count">Langkah {step + 1} dari {TOUR.length}</p>
              <h3 id="tour-title">{cur.title}</h3>
            </div>
          </div>
          <p className="tour-body">{cur.body}</p>
          {waiting && <p className="tour-wait"><span className="tour-dot" aria-hidden /> {cur.wait}</p>}
          <div className="tour-foot">
            <div className="tour-progress" aria-hidden>{TOUR.map((t, i) => <i key={t.id} className={clsx(i <= step && 'is-on')} />)}</div>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setStep(step - 1)} disabled={step === 0}><ArrowLeft size={15} /> Kembali</button>
            <button type="button" className="btn-primary btn-sm" onClick={() => setStep(step + 1)}>{step === TOUR.length - 1 ? 'Selesai' : 'Lanjut'} <ArrowRight size={15} /></button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
