export default function Logo({ className = '', light = false }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="16" fill={light ? '#F8F7F3' : '#007060'} />
        <path d="M32 14c-2 0-3.5 1.5-3.5 3.5V28H18c-2 0-3.5 1.5-3.5 3.5S16 35 18 35h10.5v11.5c0 2 1.5 3.5 3.5 3.5s3.5-1.5 3.5-3.5V35H46c2 0 3.5-1.5 3.5-3.5S48 28 46 28H35.5V17.5c0-2-1.5-3.5-3.5-3.5z" fill={light ? '#007060' : '#F8F7F3'} />
        <circle cx="47" cy="17" r="5" fill="#F8C038" />
      </svg>
      <span className={`font-display text-xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
        MED<span className={light ? 'text-gold' : 'text-brand'}>COEL</span>
      </span>
    </span>
  );
}
