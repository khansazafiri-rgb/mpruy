import { useEffect, useState } from 'react';
import { countdownParts } from '@/lib/time';

export default function Countdown({ target, compact = false }) {
  const [p, setP] = useState(() => countdownParts(target));
  useEffect(() => {
    const t = setInterval(() => setP(countdownParts(target)), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!p) return null;
  if (p.done) return <span className="font-semibold">Sedang berlangsung</span>;
  const items = [[p.days, 'hari'], [p.hours, 'jam'], [p.minutes, 'menit'], ...(compact ? [] : [[p.seconds, 'detik']])];
  return (
    <div className="countdown flex gap-2" role="timer" aria-label={`${p.days} hari ${p.hours} jam ${p.minutes} menit lagi`}>
      {items.map(([v, l]) => (
        <div key={l} className="countdown-cell" aria-hidden>
          <div className="countdown-num">{String(v).padStart(2, '0')}</div>
          <div className="countdown-unit">{l}</div>
        </div>
      ))}
    </div>
  );
}
