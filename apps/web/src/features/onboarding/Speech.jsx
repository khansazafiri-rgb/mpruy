// Maskot dengan gelembung bicara. Teks diketik perlahan (mulut maskot bergerak),
// lalu maskot memakai ekspresi `mood`. Dengan "kurangi gerakan" teks langsung tampil.
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import Mascot from '@/components/Mascot';

function reduced() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

export function useTyped(text, speed = 18) {
  const [n, setN] = useState(() => (reduced() ? text.length : 0));
  useEffect(() => {
    if (reduced()) { setN(text.length); return undefined; }
    setN(0);
    let i = 0;
    const t = setInterval(() => {
      i += 2;
      setN(Math.min(i, text.length));
      if (i >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [text, speed]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

export default function Speech({ mascot = 'kori', mood = 'idle', title, text, size = 128, layout = 'side', className = '', children }) {
  const { shown, done } = useTyped(text || '');
  return (
    <div className={clsx('onb-speech', `is-${layout}`, className)}>
      <Mascot name={mascot} mood={done ? mood : 'talk'} size={size} className="onb-speech-mascot" />
      <div className="onb-bubble" aria-live="polite">
        {title && <p className="onb-bubble-title">{title}</p>}
        {/* Teks lengkap untuk pembaca layar; versi ketik hanya visual. */}
        <p className="sr-only">{text}</p>
        <p className="onb-bubble-text" aria-hidden>{shown}<span className={clsx('onb-caret', done && 'is-done')} /></p>
        {children}
      </div>
    </div>
  );
}
