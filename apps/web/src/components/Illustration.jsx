// One illustrated family for the subject catalog. Admin uploads still take priority.
import pb from '@/lib/pb';

export const ILLUSTRATION_KEYS = ["anatomi", "histologi", "fisiologi", "biokimia", "parasitologi", "mikrobiologi", "patologi", "farmakologi", "imunologi", "genetika", "umum", "anestesiologi-dasar", "embriologi", "ginekologi-payudara", "ilmu-bedah", "ilmu-bedah-ortopedi", "ilmu-kesehatan-anak", "ilmu-penyakit-dalam", "kehamilan-persalinan", "patologi-klinik", "psikiatri-kesehatan-jiwa", "radiologi-dasar", "sistem-endokrin-metabolik-nutrisi", "sistem-gastrointestinal-hepatobilier-pankreas", "sistem-ginjal-saluran-kemih", "sistem-hematologi-imunologi", "sistem-indra-mata", "sistem-indra-tht", "sistem-integumen-kulit-kelamin", "sistem-kardiovaskular", "sistem-muskuloskeletal", "sistem-respirasi", "sistem-saraf", "multisistem-kegawatdaruratan"];

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
