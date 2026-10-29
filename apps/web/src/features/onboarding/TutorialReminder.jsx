// Pengingat kecil di pojok kiri bawah: muncul sekali per sesi bila masih ada
// tutorial yang belum selesai.
import { X } from 'lucide-react';
import Mascot from '@/components/Mascot';
import { TUTORIAL_NAMES } from './state';

export default function TutorialReminder({ pending, onOpen, onPick, onClose }) {
  const one = pending.length === 1 ? pending[0] : null;
  return (
    <aside className="onb-reminder card-chunky" role="status" aria-label="Pengingat tutorial">
      <Mascot name={one === 'dokter' ? 'nilo' : one === 'fk' ? 'kila' : 'kori'} mood="wave" size={64} label="" />
      <div className="min-w-0 flex-1">
        <p className="onb-reminder-title">{one ? `Belum coba tutorial ${TUTORIAL_NAMES[one]}?` : 'Belum coba tutorialnya?'}</p>
        <p className="onb-reminder-text">{one === 'dokter' ? 'Latihan jadi dokter jaga, ditemani Nilo. Sekitar 5 menit.' : one === 'fk' ? 'Kila tunjukkan alur belajar: materi, flashcard, lalu latihan soal. Sekitar 5 menit.' : 'Ada dua tutorial singkat yang bisa kamu coba.'}</p>
        <div className="onb-reminder-actions">
          <button type="button" className="btn-primary btn-sm btn-press" onClick={() => (one ? onPick(one) : onOpen())}>Coba sekarang</button>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose}>Nanti saja</button>
        </div>
      </div>
      <button type="button" className="onb-reminder-x" onClick={onClose} aria-label="Tutup pengingat"><X size={18} /></button>
    </aside>
  );
}
