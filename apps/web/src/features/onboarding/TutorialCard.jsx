// Kartu kecil untuk memulai atau mengulang tutorial (Beranda dan Profil).
import { ArrowRight } from 'lucide-react';
import Mascot from '@/components/Mascot';
import { pendingTutorials } from '@/lib/tutorial';
import { openTutorialChooser } from './state';

export default function TutorialCard({ me, compact = false }) {
  const pending = pendingTutorials(me);
  const allDone = pending.length === 0;
  return (
    <button type="button" onClick={openTutorialChooser} className={`onb-card card-chunky tone-surface tone-mint${compact ? ' is-compact' : ''}`}>
      <Mascot name="kori" mood={allDone ? 'happy' : 'wave'} size={compact ? 56 : 72} label="" />
      <span className="min-w-0 flex-1 text-left">
        <span className="onb-card-title">{allDone ? 'Ulangi tutorial' : pending.length === 2 ? 'Coba tutorial singkat' : 'Satu tutorial lagi'}</span>
        <span className="onb-card-text">{allDone ? 'Lihat lagi cara latihan soal atau simulasi dokter.' : 'Latihan soal FK dan simulasi jadi dokter, ditemani maskot MEDCOEL.'}</span>
      </span>
      <ArrowRight size={18} className="shrink-0" aria-hidden />
    </button>
  );
}
