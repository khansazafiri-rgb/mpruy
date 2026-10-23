// Maskot dengan gelembung bicara singkat. Dipakai di banyak halaman supaya
// Kori, Kila, dan Nilo menemani fitur (keadaan kosong, hasil latihan, tips).
//   <MascotTip mascot="kila" mood="cheer">Mantap, jawabanmu benar!</MascotTip>
// Admin bisa mematikan semua maskot di Pengaturan > Umum (settings.showMascots).
import clsx from 'clsx';
import Mascot from '@/components/Mascot';
import { useAuth } from '@/context/AuthContext';
import { MASCOTS } from '@/mascots';
import '@/styles/mascot-tip.css';

export function useMascotsOn() {
  const auth = useAuth();
  return auth?.settings?.showMascots !== false;
}

export default function MascotTip({ mascot = 'kori', mood = 'idle', size = 72, title, layout = 'side', named = true, pop = false, className = '', children }) {
  const on = useMascotsOn();
  if (!on) {
    if (!children && !title) return null;
    return <div className={clsx('mtip-bubble', className)}>{title && <p className="mtip-title">{title}</p>}{children}</div>;
  }
  return (
    <div className={clsx('mtip', layout === 'right' && 'is-right', layout === 'stack' && 'is-stack', pop && 'is-pop', className)}>
      <Mascot name={mascot} mood={mood} size={size} className="mtip-mascot" label="" />
      {(children || title) && (
        <div className="mtip-bubble">
          {named && <span className="mtip-name">{MASCOTS[mascot]?.name}</span>}
          {title && <p className="mtip-title">{title}</p>}
          {children}
        </div>
      )}
    </div>
  );
}
