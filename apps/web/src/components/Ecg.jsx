// Garis EKG dekoratif untuk bidang hijau. Tergambar sekali saat muncul.
export default function Ecg({ className = '' }) {
  return (
    <svg className={`ecg ${className}`} viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden focusable="false">
      <path d="M0 60 H300 l18 -6 l12 6 H420 l10 -42 l14 70 l12 -50 l8 22 H640 l16 -8 l14 8 H860 l10 -40 l14 66 l12 -44 l8 18 H1200" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
