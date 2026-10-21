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
    <div className="flex gap-2" aria-label={`${p.days} hari ${p.hours} jam ${p.minutes} menit lagi`}>
      {items.map(([v, l]) => (
        <div key={l} className="min-w-[3.5rem] rounded-xl bg-white/15 px-2 py-1.5 text-center">
          <div className="font-display text-2xl font-bold tabular-nums">{String(v).padStart(2, '0')}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{l}</div>
        </div>
      ))}
    </div>
  );
}
