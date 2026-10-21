// JADWAL UJIAN PRIBADI. Waktu disimpan absolut + zona yang dipilih, jadi
// hitung mundur dan pengingat benar di zona mana pun.
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Countdown from '@/components/Countdown';
import { Alert, EmptyState, Field, Modal, PageLoader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { api, errorText } from '@/lib/api';
import pb from '@/lib/pb';
import { daysUntil, fmtDateTime, fromLocal, guessTz, toLocalParts } from '@/lib/time';
import PageHead from '@/components/PageHead';

const PRESET = [14, 7, 3, 1, 0];

function Form({ initial, subjects, onClose, onSaved, defaults }) {
  const { me } = useAuth();
  const tz0 = initial?.timezone || guessTz();
  const parts = initial ? toLocalParts(initial.examAt, tz0) : { date: '', time: '08:00' };
  const [f, setF] = useState({
    subject: initial?.subject || subjects[0]?.id || '',
    title: initial?.title || '',
    date: parts.date,
    time: parts.time || '08:00',
    timezone: tz0,
    reminderDays: initial?.reminderDays?.length ? initial.reminderDays : defaults,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggleDay = (d) => set('reminderDays', f.reminderDays.includes(d) ? f.reminderDays.filter((x) => x !== d) : [...f.reminderDays, d].sort((a, b) => b - a));

  const save = async () => {
    setError('');
    if (!f.subject || !f.title.trim() || !f.date || !f.time) { setError('Isi materi, judul, tanggal, dan jam ujian.'); return; }
    const examAt = fromLocal(f.date, f.time, f.timezone);
    const body = { subject: f.subject, title: f.title.trim(), examAt: examAt.toISOString().replace('T', ' '), timezone: f.timezone, reminderDays: f.reminderDays };
    setBusy(true);
    try {
      if (initial) await pb.collection('exam_schedules').update(initial.id, body);
      else await pb.collection('exam_schedules').create({ ...body, user: me.id });
      onSaved();
    } catch (e) { setError(errorText(e)); setBusy(false); }
  };

  return (
    <Modal open title={initial ? 'Ubah jadwal ujian' : 'Tambah jadwal ujian'} onClose={onClose} footer={<>
      <button type="button" className="btn-ghost" onClick={onClose}>Batal</button>
      <button type="button" className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
    </>}>
      <div className="space-y-4">
        <Field label="Materi yang diujikan" htmlFor="ex-subj">
          <select id="ex-subj" className="input" value={f.subject} onChange={(e) => set('subject', e.target.value)}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Judul ujian" htmlFor="ex-title" hint="Misalnya UTB, UAB, kuis, atau OSCE.">
          <input id="ex-title" className="input" maxLength={120} value={f.title} onChange={(e) => set('title', e.target.value)} list="judul-ujian" />
          <datalist id="judul-ujian"><option value="UTB" /><option value="UAB" /><option value="Kuis" /><option value="Remedial" /></datalist>
        </Field>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Tanggal" htmlFor="ex-date"><input id="ex-date" type="date" className="input" value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label="Jam" htmlFor="ex-time"><input id="ex-time" type="time" className="input" value={f.time} onChange={(e) => set('time', e.target.value)} /></Field>
          <Field label="Zona waktu" htmlFor="ex-tz">
            <select id="ex-tz" className="input" value={f.timezone} onChange={(e) => set('timezone', e.target.value)}>
              <option value="WIB">WIB</option><option value="WITA">WITA</option><option value="WIT">WIT</option>
            </select>
          </Field>
        </div>
        <fieldset>
          <legend className="label">Kirim pengingat (di web dan email)</legend>
          <div className="flex flex-wrap gap-2">
            {PRESET.map((d) => (
              <label key={d} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-semibold ${f.reminderDays.includes(d) ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line'}`}>
                <input type="checkbox" className="sr-only" checked={f.reminderDays.includes(d)} onChange={() => toggleDay(d)} /> {d === 0 ? 'Hari H' : `H-${d}`}
              </label>
            ))}
          </div>
          <p className="hint">Pengingat dikirim pagi hari (sekitar pukul 07.00 WIB). Email digabung jadi satu per hari.</p>
        </fieldset>
        <Alert>{error}</Alert>
      </div>
    </Modal>
  );
}

export default function Schedule() {
  const { settings } = useAuth();
  const [items, setItems] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [edit, setEdit] = useState(null); // null | 'new' | record
  const [error, setError] = useState('');

  const load = () => pb.collection('exam_schedules').getFullList({ sort: 'examAt', expand: 'subject' }).then(setItems).catch((e) => setError(errorText(e)));
  useEffect(() => {
    load();
    api('subjects').then((d) => setSubjects(d.items)).catch(() => {});
  }, []);

  const remove = async (x) => {
    if (!window.confirm(`Hapus jadwal ${x.title}?`)) return;
    try { await pb.collection('exam_schedules').delete(x.id); load(); } catch (e) { setError(errorText(e)); }
  };

  const upcoming = (items || []).filter((x) => new Date(x.examAt.replace(' ', 'T')).getTime() >= Date.now() - 3 * 3600000);
  const past = (items || []).filter((x) => !upcoming.includes(x));

  return (
    <div className="space-y-7">
      <PageHead eyebrow="Kalender pribadi" title="Jadwal ujian" note="H-7, H-3, H-1 diingatkan ✓" actions={<button type="button" className="btn-primary btn-press" onClick={() => setEdit('new')} disabled={!subjects.length}><Plus size={18} /> Tambah jadwal</button>}>Hanya kamu yang bisa melihat jadwal ini.</PageHead>
      <Alert>{error}</Alert>
      {!items ? <PageLoader /> : !upcoming.length && !past.length ? (
        <EmptyState icon={CalendarDays} title="Belum ada jadwal ujian" action={<button type="button" className="btn-primary" onClick={() => setEdit('new')}>Tambah jadwal</button>}>
          Tambahkan ujianmu untuk mendapat hitung mundur di beranda dan pengingat H-7, H-3, H-1.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {upcoming.map((x, i) => {
            const d = daysUntil(x.examAt, x.timezone);
            return (
              <div key={x.id} className={`flex flex-wrap items-center gap-4 p-5 ${i === 0 ? 'exam-next surface-forest' : 'card'}`}>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold ${i === 0 ? 'text-white/80' : 'text-ink-muted'}`}>{d === 0 ? 'Hari ini' : d === 1 ? 'Besok' : `${d} hari lagi`}</p>
                  <p className={`font-display text-xl font-bold ${i === 0 ? 'text-white' : ''}`}>{x.title} · {x.expand?.subject?.name}</p>
                  <p className={`text-sm ${i === 0 ? 'text-white/85' : 'text-ink-muted'}`}>{fmtDateTime(x.examAt, x.timezone, { weekday: true })} · pengingat {(x.reminderDays || []).map((r) => (r === 0 ? 'hari H' : `H-${r}`)).join(', ') || 'tidak ada'}</p>
                </div>
                {i === 0 && <Countdown target={x.examAt} compact />}
                <div className="flex gap-1">
                  <button type="button" className={`rounded-lg p-2 ${i === 0 ? 'hover:bg-white/10' : 'text-ink-muted hover:bg-page'}`} onClick={() => setEdit(x)} aria-label={`Ubah ${x.title}`}><Pencil size={18} /></button>
                  <button type="button" className={`rounded-lg p-2 ${i === 0 ? 'hover:bg-white/10' : 'text-ink-muted hover:bg-page hover:text-coral'}`} onClick={() => remove(x)} aria-label={`Hapus ${x.title}`}><Trash2 size={18} /></button>
                </div>
              </div>
            );
          })}
          {past.length > 0 && (
            <details className="card p-4">
              <summary className="cursor-pointer font-semibold text-ink-muted">Ujian yang sudah lewat ({past.length})</summary>
              <ul className="mt-2 space-y-1 text-sm">
                {past.map((x) => <li key={x.id} className="flex justify-between gap-2"><span>{x.title} · {x.expand?.subject?.name} · {fmtDateTime(x.examAt, x.timezone)}</span><button type="button" className="text-coral hover:underline" onClick={() => remove(x)}>Hapus</button></li>)}
              </ul>
            </details>
          )}
        </div>
      )}
      {edit && <Form initial={edit === 'new' ? null : edit} subjects={subjects} defaults={settings?.reminderDaysDefault || [7, 3, 1]} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}
