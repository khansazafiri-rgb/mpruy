// Logo MEDCOEL.
// - variant "full": logo dengan tulisan, dipakai di header dan halaman publik.
// - variant "mark": logo saja (tanpa tulisan), untuk tempat sempit.
// Favicon dan ikon Safari/iPhone ada di apps/web/public (logo saja).
import logoFull from '@/assets/logo-full.webp';
import logoMark from '@/assets/logo-mark.webp';

export default function Logo({ variant = 'full', className = '' }) {
  if (variant === 'mark') {
    return <img src={logoMark} alt="MEDCOEL" width={36} height={36} className={`h-9 w-9 ${className}`} />;
  }
  return <img src={logoFull} alt="MEDCOEL" width={179} height={36} className={`h-9 w-auto ${className}`} />;
}
