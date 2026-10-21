// Ilustrasi kartu mata kuliah.
//
// PRD: ilustrasi akhir dibuat admin dengan GPT lalu diunggah di Dashboard
// Admin > Mata kuliah. Selama belum ada file, kartu memakai gambar sederhana
// di bawah ini, dengan palet MEDCOEL dan gaya yang seragam.
import pb from '@/lib/pb';

const G = '#007060';
const GD = '#00584E';
const GOLD = '#F8C038';
const INK = '#172B38';
const SOFT = '#E3F1EE';

const shapes = {
  anatomi: (
    <g>
      <ellipse cx="60" cy="38" rx="17" ry="19" fill="#fff" stroke={INK} strokeWidth="3" />
      <circle cx="53" cy="37" r="4" fill={INK} />
      <circle cx="67" cy="37" r="4" fill={INK} />
      <path d="M56 49h8M58 49v5M62 49v5" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M60 58v34" stroke={G} strokeWidth="5" strokeLinecap="round" />
      <path d="M46 66c9 4 19 4 28 0M44 74c10 5 22 5 32 0M46 82c9 4 19 4 28 0" stroke={G} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M60 92l-10 14M60 92l10 14" stroke={GD} strokeWidth="4" strokeLinecap="round" />
      <circle cx="86" cy="24" r="5" fill={GOLD} />
    </g>
  ),
  histologi: (
    <g>
      <rect x="40" y="96" width="44" height="8" rx="4" fill={INK} />
      <path d="M50 96c0-14 6-22 18-26" stroke={GD} strokeWidth="6" fill="none" strokeLinecap="round" />
      <rect x="56" y="22" width="14" height="44" rx="5" transform="rotate(-20 63 44)" fill={G} />
      <rect x="46" y="72" width="34" height="6" rx="3" fill={GD} />
      <circle cx="66" cy="18" r="6" fill={INK} />
      <circle cx="90" cy="70" r="12" fill="#fff" stroke={GOLD} strokeWidth="3" />
      <circle cx="87" cy="67" r="3" fill={G} />
      <circle cx="94" cy="73" r="2" fill={G} />
    </g>
  ),
  fisiologi: (
    <g>
      <path d="M60 92C38 76 28 64 28 50c0-11 8-19 18-19 7 0 11 4 14 9 3-5 7-9 14-9 10 0 18 8 18 19 0 14-10 26-32 42z" fill={G} />
      <path d="M18 62h22l6-12 8 26 8-20 5 6h35" stroke={GOLD} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  biokimia: (
    <g>
      <path d="M50 22h20M54 22v26L34 88c-3 7 1 12 8 12h36c7 0 11-5 8-12L66 48V22" stroke={INK} strokeWidth="3.5" fill="#fff" strokeLinejoin="round" />
      <path d="M41 78h38l7 12c2 5 0 8-6 8H40c-6 0-8-3-6-8z" fill={G} />
      <circle cx="52" cy="86" r="3" fill="#fff" />
      <circle cx="64" cy="90" r="2.5" fill="#fff" />
      <circle cx="78" cy="30" r="5" fill={GOLD} />
      <circle cx="86" cy="18" r="3" fill={GOLD} />
    </g>
  ),
  parasitologi: (
    <g>
      <path d="M24 78c10-22 26-22 34-6s22 16 30-6" stroke={G} strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d="M24 78c10-22 26-22 34-6s22 16 30-6" stroke={GD} strokeWidth="2" strokeDasharray="2 7" fill="none" strokeLinecap="round" />
      <circle cx="88" cy="66" r="2.5" fill={INK} />
      <circle cx="36" cy="34" r="9" fill="#fff" stroke={GOLD} strokeWidth="3" />
      <circle cx="36" cy="34" r="3" fill={GOLD} />
    </g>
  ),
  mikrobiologi: (
    <g>
      <ellipse cx="60" cy="80" rx="38" ry="14" fill="#fff" stroke={INK} strokeWidth="3" />
      <ellipse cx="60" cy="76" rx="30" ry="9" fill={SOFT} />
      <rect x="40" y="30" width="34" height="16" rx="8" fill={G} transform="rotate(-18 57 38)" />
      <path d="M38 44l-6 4M76 30l6-4M50 50l-2 6M66 24l2-6" stroke={GD} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="84" cy="52" r="7" fill={GOLD} />
      <circle cx="50" cy="76" r="3" fill={G} />
      <circle cx="68" cy="74" r="2.5" fill={G} />
    </g>
  ),
  patologi: (
    <g>
      <rect x="26" y="40" width="68" height="44" rx="8" fill="#fff" stroke={INK} strokeWidth="3" />
      <circle cx="50" cy="62" r="11" fill={G} />
      <circle cx="74" cy="58" r="7" fill={GOLD} />
      <circle cx="70" cy="72" r="4" fill={GD} />
    </g>
  ),
  farmakologi: (
    <g>
      <rect x="26" y="48" width="68" height="26" rx="13" fill={G} transform="rotate(-30 60 61)" />
      <path d="M60 44l0 34" stroke="#fff" strokeWidth="3" transform="rotate(-30 60 61)" />
      <circle cx="84" cy="88" r="10" fill={GOLD} />
      <circle cx="36" cy="30" r="6" fill={GD} />
    </g>
  ),
  imunologi: (
    <g>
      <path d="M60 98V62M60 62L40 34M60 62l20-28" stroke={G} strokeWidth="9" strokeLinecap="round" />
      <circle cx="38" cy="30" r="7" fill={GOLD} />
      <circle cx="82" cy="30" r="7" fill={GOLD} />
    </g>
  ),
  genetika: (
    <g>
      <path d="M44 20c0 26 32 26 32 52s-32 26-32 32" stroke={G} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M76 20c0 26-32 26-32 52s32 26 32 32" stroke={GOLD} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M50 34h20M50 58h20M50 86h20" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </g>
  ),
  umum: (
    <g>
      <path d="M40 24v26c0 12 9 20 20 20s20-8 20-20V24" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M60 70v10c0 10 8 16 18 16s16-6 16-14" stroke={G} strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="94" cy="78" r="8" fill={GOLD} />
    </g>
  ),
};

export function subjectImageUrl(s) {
  if (!s?.illustration) return '';
  return pb.files.getURL({ collectionId: s.collectionId || s.collectionName || 'subjects', id: s.id }, s.illustration, { thumb: '320x320' });
}

export default function Illustration({ subject, className = '' }) {
  const url = subjectImageUrl(subject);
  if (url) {
    return <img src={url} alt="" className={`h-full w-full object-cover ${className}`} loading="lazy" />;
  }
  const key = shapes[subject?.illustrationKey] ? subject.illustrationKey : 'umum';
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={`Ilustrasi ${subject?.name || 'mata kuliah'}`}>
      <rect width="120" height="120" rx="24" fill={SOFT} />
      {shapes[key]}
    </svg>
  );
}

export const ILLUSTRATION_KEYS = Object.keys(shapes);
