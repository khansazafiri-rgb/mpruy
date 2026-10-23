// Maskot MEDCOEL (Kori, Kila, Nilo) dengan ekspresi berbasis kelas CSS.
// <Mascot name="kori" mood="wave" size={160} />
// mood: idle | wave | think | happy | talk | cheer. Gerak berhenti otomatis
// bila perangkat memakai "kurangi gerakan".
import clsx from 'clsx';
import { MASCOTS } from '@/mascots';
import '@/styles/mascot.css';

export default function Mascot({ name = 'kori', mood = 'idle', size = 140, className = '', label, still = false }) {
  const m = MASCOTS[name] || MASCOTS.kori;
  return (
    <span
      role="img"
      aria-label={label ?? `${m.name}, maskot MEDCOEL`}
      className={clsx('mc-character', `mood-${mood}`, still && 'is-still', className)}
      style={{ width: size, height: size }}
      // SVG berasal dari file statis di repo (bukan masukan pengguna).
      dangerouslySetInnerHTML={{ __html: m.svg }}
    />
  );
}
