// Pemilih program studi lalu kampus. Satu pilihan kampus = satu penyelenggaraan (prodi + institusi),
// jadi soal khusus kampus hanya terlihat oleh prodi yang sama di kampus yang sama.
import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { OTHER } from '@/lib/campus';
import pb from '@/lib/pb';

let campusCache = null;
let programCache = null;

export async function loadCampuses() {
  if (!campusCache) campusCache = pb.collection('campuses').getFullList({ filter: 'active = true', sort: 'name', fields: 'id,name,city,kind,program,institution,unverified', requestKey: null });
  try { return await campusCache; } catch (e) { campusCache = null; throw e; }
}

export async function loadPrograms() {
  if (!programCache) programCache = pb.collection('programs').getFullList({ filter: 'active = true', sort: 'order,name', fields: 'id,name,order,unverified', requestKey: null });
  try { return await programCache; } catch (e) { programCache = null; throw e; }
}

export function resetCampusCache() { campusCache = null; programCache = null; }

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Daftar yang bisa dicari. options: [{ value, label, sub }]; extras: pilihan di dasar daftar.
function SearchSelect({ id, value, options, extras = [], placeholder, searchPlaceholder, emptyText, disabled, error, selectedLabel, onPick }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef(null);
  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const filtered = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return options.filter((o) => words.every((w) => norm(`${o.label} ${o.sub || ''}`).includes(w))).slice(0, 80);
  }, [q, options]);
  const hit = options.find((o) => o.value === value);
  const extra = extras.find((x) => x.value === value);
  const label = extra ? extra.label : hit ? `${hit.label}${hit.sub ? ` (${hit.sub})` : ''}` : selectedLabel || placeholder;
  const picked = !!(extra || hit || selectedLabel);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        className={`input flex items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-60 ${!picked ? 'text-ink-faint' : ''} ${error ? 'border-coral' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={18} className="shrink-0 text-ink-muted" />
      </button>
      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search size={16} className="text-ink-muted" />
            <input autoFocus className="w-full py-2.5 text-[15px] outline-none" placeholder={searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} aria-label={searchPlaceholder} />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.map((o) => (
              <li key={o.value}>
                <button type="button" role="option" aria-selected={o.value === value} onClick={() => { onPick(o.value); setOpen(false); setQ(''); }} className="flex w-full items-start gap-2 px-3 py-2 text-left text-[15px] hover:bg-page">
                  <span className="mt-0.5 w-4 shrink-0">{o.value === value && <Check size={16} className="text-brand" />}</span>
                  <span>{o.label}{o.sub && <span className="text-ink-muted"> · {o.sub}</span>}</span>
                </button>
              </li>
            ))}
            {!filtered.length && <li className="px-3 py-2 text-sm text-ink-muted">{emptyText}</li>}
            {extras.map((x) => (
              <li key={x.value} className="border-t border-line">
                <button type="button" onClick={() => { onPick(x.value, q); setOpen(false); setQ(''); }} className="w-full px-3 py-2.5 text-left text-[15px] font-semibold text-academic hover:bg-page">{x.label}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * value: { none, program, programOther, campus, campusOther } (lihat lib/campus.js)
 * errors: { program, campus } (opsional). includeUnverified: hanya untuk admin.
 */
export default function CampusPicker({ value, onChange, errors = {}, id = 'campus', includeUnverified = false, allowNone = true }) {
  const [programs, setPrograms] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [loadErr, setLoadErr] = useState('');
  useEffect(() => {
    Promise.all([loadPrograms(), loadCampuses()]).then(([p, c]) => { setPrograms(p); setCampuses(c); })
      .catch(() => setLoadErr('Daftar program studi dan kampus gagal dimuat. Muat ulang halaman.'));
  }, []);

  const set = (patch) => onChange({ ...value, ...patch });
  const progTyped = value.program === OTHER;
  const campTyped = progTyped || value.campus === OTHER;

  const programOptions = useMemo(
    () => programs.filter((p) => includeUnverified || !p.unverified).map((p) => ({ value: p.id, label: p.name })),
    [programs, includeUnverified],
  );
  const campusOptions = useMemo(
    () => campuses
      .filter((c) => c.program === value.program && (includeUnverified || !c.unverified))
      .map((c) => ({ value: c.id, label: c.institution || c.name, sub: c.city })),
    [campuses, value.program, includeUnverified],
  );

  return (
    <div className="space-y-4">
      {loadErr && <p className="text-sm text-coral" role="alert">{loadErr}</p>}
      {allowNone && (
        <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${value.none ? 'border-brand bg-brand-soft' : 'border-line hover:border-brand/50'}`}>
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--brand))]" checked={!!value.none} onChange={(e) => set({ none: e.target.checked })} />
          <span>
            <span className="block text-[15px] font-semibold">Saya belum punya kampus</span>
            <span className="block text-[13px] text-ink-muted">Misalnya masih siswa SMA. Kamu tetap bisa memakai semua soal General dan fitur lainnya. Prodi dan kampus bisa diisi nanti di Profil.</span>
          </span>
        </label>
      )}

      {!value.none && (
        <>
          <div>
            <label className="label" htmlFor={`${id}-program`}>Program studi / fakultas</label>
            <SearchSelect
              id={`${id}-program`}
              value={value.program}
              options={programOptions}
              extras={[{ value: OTHER, label: 'Prodi lainnya, tulis sendiri' }]}
              placeholder="Pilih program studi"
              searchPlaceholder="Cari program studi"
              emptyText="Tidak ketemu. Pilih Prodi lainnya di bawah."
              error={errors.program}
              onPick={(v, typed) => set(v === OTHER ? { program: OTHER, campus: OTHER, programOther: value.programOther || typed || '', campusOther: value.campusOther } : { program: v, programOther: '', campus: '', campusOther: '' })}
            />
            {progTyped && (
              <input className="input mt-2" placeholder="Tulis nama program studimu, mis. Teknik Biomedis" value={value.programOther || ''} onChange={(e) => set({ programOther: e.target.value })} aria-label="Nama program studi lainnya" maxLength={120} />
            )}
            {errors.program && <p className="mt-1 text-sm text-coral" role="alert">{errors.program}</p>}
          </div>

          <div>
            <label className="label" htmlFor={`${id}-campus`}>Asal kampus</label>
            {progTyped ? (
              <input id={`${id}-campus`} className={`input ${errors.campus ? 'border-coral' : ''}`} placeholder="Tulis nama kampusmu" value={value.campusOther || ''} onChange={(e) => set({ campusOther: e.target.value })} aria-label="Nama kampus" maxLength={120} />
            ) : (
              <>
                <SearchSelect
                  id={`${id}-campus`}
                  value={value.campus}
                  options={campusOptions}
                  extras={value.program ? [{ value: OTHER, label: 'Kampusku belum ada di daftar, tulis sendiri' }] : []}
                  placeholder={value.program ? 'Pilih kampus' : 'Pilih program studi dulu'}
                  searchPlaceholder="Cari nama kampus atau kota"
                  emptyText="Belum ada kampus untuk prodi ini. Pilih Kampusku belum ada di bawah."
                  disabled={!value.program}
                  error={errors.campus}
                  onPick={(v, typed) => set(v === OTHER ? { campus: OTHER, campusOther: value.campusOther || typed || '' } : { campus: v, campusOther: '' })}
                />
                {campTyped && (
                  <input className="input mt-2" placeholder="Tulis nama kampusmu, mis. Universitas Contoh" value={value.campusOther || ''} onChange={(e) => set({ campusOther: e.target.value })} aria-label="Nama kampus lainnya" maxLength={120} />
                )}
              </>
            )}
            {errors.campus && <p className="mt-1 text-sm text-coral" role="alert">{errors.campus}</p>}
            <p className="hint mt-1">
              {campTyped
                ? 'Kamu otomatis bergabung dengan teman dari prodi dan kampus yang sama. Admin akan memeriksa nama kampusnya.'
                : 'Soal khusus kampus hanya terlihat oleh prodi yang sama di kampus yang sama.'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
