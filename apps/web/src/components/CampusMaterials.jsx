import { ArrowUpRight, BookOpen, ChevronDown, School } from 'lucide-react';
import { Link } from 'react-router-dom';
import Illustration from './Illustration';
import { useApi } from '@/lib/useApi';

export default function CampusMaterials() {
  const { data, error, reload } = useApi('campus-materials');
  if (error) return <div className="text-xs text-ink-muted">Materi kampus belum dapat dimuat. <button type="button" onClick={reload} className="font-semibold text-brand underline">Coba lagi</button></div>;
  if (!data?.items?.length) return null;
  return (
    <details className="campus-library surface-forest">
      <summary aria-label={`Soal kampusmu, ${data.campusName}, ${data.items.length} mata kuliah tersedia`}><div className="campus-library-art sticker"><span className="tape -top-3 left-1/2 -translate-x-1/2 rotate-2" /><Illustration subject={{ illustrationKey: 'umum' }} /></div><div className="min-w-0 flex-1"><p className="tag-label bg-white/10 text-mint"><School size={14} aria-hidden /> Khusus kampusmu</p><h2>Soal kampusmu</h2><p>{data.campusName}</p><span>{data.items.length} mata kuliah · sudah diperiksa dan tayang</span></div><ChevronDown className="campus-chevron" size={23} aria-hidden /></summary>
      <div className="campus-library-list">{data.items.map((s) => <Link key={s.id} to={`/mata-kuliah/${s.slug}?kampus=1`}><span className="campus-list-icon"><BookOpen size={18} /></span><span className="min-w-0 flex-1"><b>{s.name}</b><small>{s.chapters.length} materi tersedia · {s.questionCount} soal</small></span><ArrowUpRight size={18} aria-hidden /></Link>)}</div>
    </details>
  );
}
