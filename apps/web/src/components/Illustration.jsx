// One illustrated family for the subject catalog. Admin uploads still take priority.
import pb from '@/lib/pb';

export const ILLUSTRATION_KEYS = ['anatomi', 'histologi', 'fisiologi', 'biokimia', 'parasitologi', 'mikrobiologi', 'patologi', 'farmakologi', 'imunologi', 'genetika', 'umum'];

export function subjectImageUrl(s) {
  if (!s?.illustration) return '';
  return pb.files.getURL({ collectionId: s.collectionId || s.collectionName || 'subjects', id: s.id }, s.illustration, { thumb: '640x640' });
}

export default function Illustration({ subject, className = '' }) {
  const candidate = subject?.illustrationKey || subject?.slug;
  const key = ILLUSTRATION_KEYS.includes(candidate) ? candidate : 'umum';
  const fallback = `/illustrations/${key}.webp`;
  return <img src={subjectImageUrl(subject) || fallback} alt="" width={960} height={640} loading="lazy" decoding="async" className={`object-contain ${className}`} onError={(event) => {
    if (event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src = fallback;
  }} />;
}
