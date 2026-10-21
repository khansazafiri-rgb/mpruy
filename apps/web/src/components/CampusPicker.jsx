// Pemilih asal kampus yang bisa dicari, dengan pilihan Lainnya (isian bebas).
import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import pb from '@/lib/pb';

let cache = null;
export async function loadCampuses() {
  if (!cache) cache = pb.collection('campuses').getFullList({ filter: 'active = true', sort: 'name', fields: 'id,name,city,kind', requestKey: null });
  try { return await cache; } catch (e) { cache = null; throw e; }
}

export function resetCampusCache() { cache = null; }

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function CampusPicker({ value, other, onChange, id = 'campus', error }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [loadErr, setLoadErr] = useState('');
  const box = useRef(null);
  const isOther = value === '__other__' || (!value && !!other);

  useEffect(() => { loadCampuses().then(setList).catch(() => setLoadErr('Daftar kampus gagal dimuat. Muat ulang halaman.')); }, []);
  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return list.filter((c) => {
      const hay = norm(`${c.name} ${c.city}`);
      return words.every((w) => hay.includes(w));
    }).slice(0, 80);
  }, [q, list]);

  const selected = list.find((c) => c.id === value);
  const label = isOther ? 'Lainnya (tulis sendiri)' : selected ? `${selected.name}${selected.city ? ` (${selected.city})` : ''}` : 'Pilih asal kampus';

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        id={id}
        className={`input flex items-center justify-between text-left ${!selected && !isOther ? 'text-ink-faint' : ''} ${error ? 'border-coral' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={18} className="shrink-0 text-ink-muted" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search size={16} className="text-ink-muted" />
            <input autoFocus className="w-full py-2.5 text-[15px] outline-none" placeholder="Cari nama kampus atau kota" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari kampus" />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {loadErr && <li className="px-3 py-2 text-sm text-coral">{loadErr}</li>}
            {filtered.map((c) => (
              <li key={c.id}>
                <button type="button" role="option" aria-selected={c.id === value} onClick={() => { onChange(c.id, ''); setOpen(false); setQ(''); }} className="flex w-full items-start gap-2 px-3 py-2 text-left text-[15px] hover:bg-page">
                  <span className="mt-0.5 w-4">{c.id === value && <Check size={16} className="text-brand" />}</span>
                  <span>{c.name}{c.city && <span className="text-ink-muted"> · {c.city}</span>}</span>
                </button>
              </li>
            ))}
            {!filtered.length && !loadErr && <li className="px-3 py-2 text-sm text-ink-muted">Tidak ketemu. Pilih Lainnya di bawah.</li>}
            <li className="border-t border-line">
              <button type="button" onClick={() => { onChange('__other__', other || q); setOpen(false); }} className="w-full px-3 py-2.5 text-left text-[15px] font-semibold text-academic hover:bg-page">
                Lainnya, kampusku belum ada di daftar
              </button>
            </li>
          </ul>
        </div>
      )}
      {isOther && (
        <input className="input mt-2" placeholder="Tulis nama fakultas dan kampusmu" value={other || ''} onChange={(e) => onChange('__other__', e.target.value)} aria-label="Nama kampus lainnya" maxLength={200} />
      )}
    </div>
  );
}
