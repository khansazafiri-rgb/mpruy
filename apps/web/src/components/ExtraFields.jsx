// Kolom data tambahan yang diatur admin (Pengaturan > Pendaftaran & profil).
// Dipakai di pendaftaran, profil, dan pengubahan data pengguna oleh admin.
// defs: daftar kolom dari server; values: { kunci: nilai }; errors: { extra_<kunci>: pesan }.
import { Field } from './ui';

export function extraDefaults(defs, values = {}) {
  const out = { ...values };
  defs.forEach((f) => { if (out[f.key] === undefined) out[f.key] = f.type === 'checkbox' ? false : ''; });
  return out;
}

export function formatExtra(f, v) {
  if (v === undefined || v === null || v === '') return '';
  if (f.type === 'checkbox') return v ? 'Ya' : 'Tidak';
  if (f.type === 'handle') return `${f.prefix || '@'}${v}`;
  return String(v);
}

export default function ExtraFields({ defs, values, onChange, errors = {}, idPrefix = 'x', disabledKeys = [] }) {
  if (!defs?.length) return null;
  const set = (k, v) => onChange({ ...values, [k]: v });
  return defs.map((f) => {
    const id = `${idPrefix}-${f.key}`;
    const err = errors[`extra_${f.key}`];
    const label = `${f.label}${f.required ? '' : ' (opsional)'}`;
    const disabled = disabledKeys.includes(f.key);
    const v = values?.[f.key];
    if (f.type === 'checkbox') {
      return (
        <div key={f.key} className="sm:col-span-2">
          <label htmlFor={id} className="flex items-start gap-3 rounded-xl border border-line p-3">
            <input id={id} type="checkbox" className="mt-1 h-4 w-4 accent-[rgb(var(--brand))]" checked={!!v} disabled={disabled} onChange={(e) => set(f.key, e.target.checked)} />
            <span><span className="block font-semibold">{f.label}</span>{f.hint && <span className="text-[13px] text-ink-muted">{f.hint}</span>}</span>
          </label>
          {err && <p className="mt-1 text-[13px] font-medium text-coral">{err}</p>}
        </div>
      );
    }
    let input;
    if (f.type === 'select') {
      input = (
        <select id={id} className="input" value={v ?? ''} disabled={disabled} onChange={(e) => set(f.key, e.target.value)}>
          <option value="">{f.placeholder || 'Pilih'}</option>
          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    } else if (f.type === 'textarea') {
      input = <textarea id={id} className="input min-h-[90px]" maxLength={f.maxLength} placeholder={f.placeholder} value={v ?? ''} disabled={disabled} onChange={(e) => set(f.key, e.target.value)} />;
    } else if (f.type === 'handle') {
      input = (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-ink-muted">{f.prefix || '@'}</span>
          <input id={id} className="input pl-8" autoCapitalize="none" maxLength={f.maxLength} placeholder={f.placeholder} value={v ?? ''} disabled={disabled} onChange={(e) => set(f.key, e.target.value.replace(/^@+/, ''))} />
        </div>
      );
    } else {
      const type = { url: 'url', tel: 'tel', number: 'number', date: 'date' }[f.type] || 'text';
      input = <input id={id} type={type} inputMode={f.type === 'tel' ? 'tel' : f.type === 'number' ? 'decimal' : undefined} className="input" maxLength={type === 'text' || type === 'url' || type === 'tel' ? f.maxLength : undefined} placeholder={f.placeholder} value={v ?? ''} disabled={disabled} onChange={(e) => set(f.key, e.target.value)} />;
    }
    return (
      <Field key={f.key} label={label} htmlFor={id} error={err} hint={f.hint} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
        {input}
      </Field>
    );
  });
}
