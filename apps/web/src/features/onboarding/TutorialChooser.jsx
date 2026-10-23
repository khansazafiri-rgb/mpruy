// Pemilih tutorial layar penuh: Kori menyapa, lalu dua pilihan tutorial.
import clsx from 'clsx';
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { useEffect, useRef } from 'react';
import Mascot from '@/components/Mascot';
import { tutorialStatus } from '@/lib/tutorial';
import SkipButton from './SkipButton';
import Speech from './Speech';

const OPTIONS = [
  {
    key: 'fk', mascot: 'kila', tone: 'tone-sun', title: 'Latihan soal FK', time: 'sekitar 3 menit',
    points: ['Pilih mata kuliah dan BAB', 'Latihan per BAB, paket soal, dan simulasi', 'Jawab satu soal, lihat pembahasan dan riwayat'],
  },
  {
    key: 'dokter', mascot: 'nilo', tone: 'tone-sky', title: 'Simulasi jadi dokter', time: 'sekitar 5 menit',
    points: ['Tanya pasien sesuai bagian keluhannya', 'Periksa fisik dan minta pemeriksaan penunjang', 'Catatan dokter terisi otomatis'],
  },
];

export default function TutorialChooser({ me, first, busy, onPick, onSkip, onClose }) {
  const panel = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    const t = setTimeout(() => panel.current?.querySelector('.onb-choice')?.focus(), 60);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); (first ? onSkip : onClose)(); }
      if (e.key === 'Tab' && panel.current) {
        const f = [...panel.current.querySelectorAll('button:not([disabled]), a[href]')];
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [first, onSkip, onClose]);

  const firstName = (me?.name || '').trim().split(/\s+/)[0] || 'kamu';
  return (
    <div className="onb-overlay" role="dialog" aria-modal="true" aria-labelledby="onb-chooser-title" ref={panel}>
      <div className="onb-overlay-dots tex-halftone-light" aria-hidden />
      <div className="onb-chooser">
        <div className="onb-topbar">
          <span className="onb-brand">Tutorial MEDCOEL</span>
          {first ? <SkipButton onClick={onSkip} busy={busy} /> : <SkipButton onClick={onClose} label="Tutup" />}
        </div>
        <h2 id="onb-chooser-title" className="sr-only">Pilih tutorial</h2>
        <Speech
          mascot="kori" mood="wave" size={150} layout="hero"
          title={first ? `Hai, ${firstName}! Aku Kori.` : 'Mau coba tutorial yang mana?'}
          text={first
            ? 'Selamat bergabung di MEDCOEL. Biar nggak bingung, yuk coba salah satu tutorial dulu. Kamu bisa coba yang satunya kapan saja.'
            : 'Pilih salah satu. Tutorial bisa diulang kapan saja dari Beranda atau Profil.'}
        />
        <div className="onb-choices">
          {OPTIONS.map((o) => {
            const done = tutorialStatus(me, o.key) === 'done';
            return (
              <button key={o.key} type="button" className={clsx('onb-choice card-chunky tone-surface', o.tone)} onClick={() => onPick(o.key)}>
                <span className="onb-choice-art"><Mascot name={o.mascot} mood="idle" size={92} label="" /></span>
                <span className="onb-choice-body">
                  <span className="onb-choice-meta"><Clock size={14} aria-hidden /> {o.time}{done && <span className="onb-done"><CheckCircle2 size={14} aria-hidden /> sudah dicoba</span>}</span>
                  <span className="onb-choice-title">{o.title}</span>
                  <ul>{o.points.map((p) => <li key={p}>{p}</li>)}</ul>
                  <span className="onb-choice-go">{done ? 'Ulangi tutorial' : 'Mulai tutorial'} <ArrowRight size={17} aria-hidden /></span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="onb-foot">Tutorial bisa diulang kapan saja dari Beranda atau menu Profil.</p>
      </div>
    </div>
  );
}
