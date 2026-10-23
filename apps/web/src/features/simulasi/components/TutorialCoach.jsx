// Tutorial Simulasi Dokter bersama Nilo. Setiap langkah menyorot satu bagian
// layar. Langkah yang menunggu tindakan pemain maju sendiri begitu tindakannya
// dilakukan; tombol Lanjut/Kembali tetap ada. "Lewati" kecil di pojok kanan atas.
import clsx from 'clsx';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Mascot from '@/components/Mascot';

export const TOUR = [
  { id: 'hello', target: null, mood: 'wave', title: 'Hai, aku Nilo!', body: 'Aku temani kamu mencoba Simulasi Dokter. Pasien hari ini Pak Slamet. Kamu dokternya, Suster Ani membantumu.' },
  { id: 'dialog', target: 'dialog', mood: 'talk', title: 'Ketuk kotak dialog', body: 'Percakapan muncul di sini. Ketuk kotaknya (atau tekan Enter) untuk lanjut ke kalimat berikutnya.', wait: 'Ketuk sampai pasien selesai bicara.' },
  { id: 'areas', target: 'areas', mood: 'idle', title: 'Mau tanya bagian apa?', body: 'Anamnesis dimulai dengan memilih bagian. Coba buka "Telaah sistem" untuk menanyakan gejala per sistem organ.', wait: 'Pilih salah satu bagian.' },
  { id: 'list', target: 'list', mood: 'idle', title: 'Pilih satu pertanyaan', body: 'Sekarang pilih pertanyaan, misalnya "Apakah ada demam?". Pertanyaan yang sudah ditanyakan diberi tanda centang.', wait: 'Ketuk satu pertanyaan.' },
  { id: 'reason', target: 'reason', mood: 'think', title: 'Kenapa kamu menanyakan ini?', body: 'Untuk tindakan yang spesifik, kamu diminta memilih dugaan yang ingin dinilai. Alasanmu ikut dinilai di laporan, jadi pikirkan dulu sebelum bertanya.', wait: 'Pilih satu alasan.' },
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
  if (id === 'reason') return s.log.some((e) => e.sec === 'S');
  if (id === 'dx') return s.finished;
  return false;
}

function useRect(target, step) {
  const [rect, setRect] = useState(null);
  useLayoutEffect(() => {
    if (!target) { setRect(null); return undefined; }
    let raf;
    let scrolled = false;
    const tick = () => {
      const el = document.querySelector(`[data-tour="${target}"]`);
      if (el) {
        if (!scrolled) {
          scrolled = true;
          const r0 = el.getBoundingClientRect();
          if (r0.top < 80 || r0.bottom > window.innerHeight - 40) el.scrollIntoView({ block: r0.height > window.innerHeight * 0.7 ? 'start' : 'center', behavior: 'smooth' });
        }
        const r = el.getBoundingClientRect();
        setRect((old) => (old && old.top === r.top && old.left === r.left && old.width === r.width && old.height === r.height ? old : { top: r.top, left: r.left, width: r.width, height: r.height }));
      } else setRect(null);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [target, step]);
  return rect;
}

export default function TutorialCoach({ step, setStep, sim, ui, onSkip, onDone, finished }) {
  const cur = TOUR[step];
  const rect = useRect(cur?.target, step);
  const bubble = useRef(null);
  const [pos, setPos] = useState({});
  const waiting = cur?.wait && !stepDone(cur.id, sim, ui);

  // Maju sendiri saat tindakan yang ditunggu sudah dilakukan.
  useEffect(() => {
    if (cur?.wait && stepDone(cur.id, sim, ui)) {
      const t = setTimeout(() => setStep(step + 1), cur.id === 'reason' ? 900 : 450);
      return () => clearTimeout(t);
    }
    return undefined;
  });

  // Letak gelembung: di HP selalu di bawah layar; di laptop di sebelah sorotan.
  useLayoutEffect(() => {
    const b = bubble.current;
    if (!b) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    if (W < 768 || !rect) { setPos(W < 768 ? { mobile: true } : { center: true }); return; }
    const bw = b.offsetWidth;
    const bh = b.offsetHeight;
    const gap = 18;
    let left;
    if (rect.left + rect.width + gap + bw <= W - 12) left = rect.left + rect.width + gap;
    else if (rect.left - gap - bw >= 12) left = rect.left - gap - bw;
    else left = Math.min(Math.max(12, rect.left + rect.width / 2 - bw / 2), W - bw - 12);
    let top = rect.left + rect.width + gap + bw <= W - 12 || rect.left - gap - bw >= 12 ? rect.top : rect.top + rect.height + gap;
    if (top + bh > H - 12) top = Math.max(12, rect.top - bh - gap);
    top = Math.min(Math.max(12, top), H - bh - 12);
    setPos({ top, left });
  }, [rect, step]);

  if (!cur && !finished) return null;

  return createPortal(
    <div className="tour-layer" aria-live="polite">
      {rect && <div className="tour-ring" style={{ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }} aria-hidden />}
      {!rect && !finished && <div className="tour-dim" aria-hidden />}
      <button type="button" className="tour-skip" onClick={onSkip}>Lewati</button>
      {finished ? (
        <div className="tour-bubble is-center is-final" role="dialog" aria-label="Tutorial selesai">
          <Mascot name="nilo" mood="cheer" size={110} />
          <h3>Tutorial selesai!</h3>
          <p>Sekarang kamu tahu cara bertanya, menjelaskan alasan, membaca catatan, dan menutup konsultasi. Pasien sungguhan dipilih acak dari poli yang berbeda.</p>
          <div className="tour-final-btns">{onDone}</div>
        </div>
      ) : (
        <div
          ref={bubble}
          className={clsx('tour-bubble', pos.mobile && 'is-mobile', pos.center && 'is-center')}
          style={pos.top !== undefined ? { top: pos.top, left: pos.left } : undefined}
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
