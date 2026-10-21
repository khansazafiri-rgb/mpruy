// Pilih beberapa kampus (pembatasan soal, target pengumuman).
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { loadCampuses } from '@/components/CampusPicker';

export default function CampusMulti({ value = [], onChange }) {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  useEffect(() => { loadCampuses().then(setList).catch(() => {}); }, []);
  const byId = useMemo(() => Object.fromEntries(list.map((c) => [c.id, c])), [list]);
  const found = q ? list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) && !value.includes(c.id)).slice(0, 8) : [];
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {value.map((id) => (
          <span key={id} className="chip bg-academic-soft text-academic">
            {byId[id]?.name || id}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} aria-label="Hapus kampus"><X size={12} /></button>
          </span>
        ))}
        {!value.length && <span className="text-sm text-ink-muted">Belum ada kampus dipilih.</span>}
      </div>
      <input className="input" placeholder="Cari kampus untuk ditambahkan" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari kampus" />
      {found.length > 0 && (
        <ul className="mt-1 rounded-xl border border-line bg-surface py-1 shadow-card">
          {found.map((c) => (
            <li key={c.id}><button type="button" className="w-full px-3 py-1.5 text-left text-sm hover:bg-page" onClick={() => { onChange([...value, c.id]); setQ(''); }}>{c.name}</button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
