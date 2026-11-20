// PUSAT UJIAN (jadwal ujian pribadi + rencana belajar per ujian). Waktu disimpan absolut + zona yang dipilih,
// jadi hitung mundur dan pengingat benar di zona mana pun. Pengingat tetap dikirim oleh cron yang sama
// (pb_hooks/cron.pb.js); halaman ini tidak membuat notifikasi sendiri.
import { ArrowRight, CalendarDays, ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import MascotTip from '@/components/MascotTip';
import Countdown from '@/components/Countdown';
import { Alert, EmptyState, Field, Modal, PageLoader, ProgressBar, Segmented } from '@/components/ui';
import { countdownText, fmtMinutes, planStatus, STALE } from '@/features/study/studyLib';
import { toneClass } from '@/lib/tone';
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
  const [overview, setOverview] = useState(null); // study planner data (null when the server does not have it yet)
  const [subjects, setSubjects] = useState([]);
  const [edit, setEdit] = useState(null); // null | 'new' | record
  const [error, setError] = useState('');
  const [view, setView] = useState('list');

  const load = () => {
    pb.collection('exam_schedules').getFullList({ sort: 'examAt', expand: 'subject' }).then(setItems).catch((e) => setError(errorText(e)));
    api('study/overview').then(setOverview).catch(() => setOverview(null));
  };
  useEffect(() => {
    load();
    api('subjects').then((d) => setSubjects(d.items)).catch(() => {});
  }, []);

  const remove = async (x) => {
    if (!window.confirm(`Hapus jadwal ${x.title}? Riwayat belajar untuk ujian ini tetap disimpan.`)) return;
    try { await pb.collection('exam_schedules').delete(x.id); load(); } catch (e) { setError(errorText(e)); }
  };

  const upcoming = (items || []).filter((x) => new Date(x.examAt.replace(' ', 'T')).getTime() >= Date.now() - 3 * 3600000);
  const past = (items || []).filter((x) => !upcoming.includes(x));
  const planOf = (id) => overview?.exams?.find((e) => e.id === id)?.plan || null;
  const today = overview?.todaySessions || [];
  const todayLeft = today.filter((s) => s.status === 'planned').reduce((a, s) => a + s.minutes, 0);

  return (
    <div className="space-y-7">
      <PageHead eyebrow="Kalender pribadi" title="Pusat ujian" note="H-7, H-3, H-1 diingatkan ✓" actions={<button type="button" className="btn-primary btn-press" onClick={() => setEdit('new')} disabled={!subjects.length}><Plus size={18} /> Tambah ujian</button>}>Semua ujianmu, hitung mundurnya, dan rencana belajar tiap ujian. Hanya kamu yang bisa melihatnya.</PageHead>
      <Alert>{error}</Alert>
      {upcoming.length > 0 && (() => {
        const d = daysUntil(upcoming[0].examAt, upcoming[0].timezone);
        return <MascotTip mascot="nilo" mood={d !== null && d <= 3 ? 'think' : 'idle'} size={60} className="max-w-2xl">{d === 0 ? 'Ujiannya hari ini. Tarik napas, kamu sudah berlatih.' : d !== null && d <= 3 ? `Tinggal ${d} hari. Fokus ulangi soal yang pernah salah, jangan begadang ya.` : `Ujian terdekat ${d} hari lagi. Cicil satu BAB per hari, nanti tidak menumpuk.`}</MascotTip>;
      })()}
      {overview && upcoming.length > 0 && (
        <section className="card flex flex-wrap items-center justify-between gap-3 p-4" aria-label="Belajar hari ini">
          <div className="min-w-0">
            <p className="eyebrow">Belajar hari ini</p>
            <p className="card-title">{today.length ? `${today.length} sesi · ${fmtMinutes(today.reduce((a, s) => a + s.minutes, 0))}` : 'Belum ada sesi hari ini'}</p>
            <p className="meta">{today.length ? (todayLeft ? `Sisa ${fmtMinutes(todayLeft)}` : 'Semua sesi hari ini selesai ✓') : 'Buat rencana belajar untuk ujianmu, lalu tugas harian muncul di sini.'}</p>
          </div>
          <Link to="/rencana-belajar" className="btn btn-primary">Buka tugas hari ini <ArrowRight size={16} aria-hidden /></Link>
        </section>
      )}
      {!items ? <PageLoader /> : !upcoming.length && !past.length ? (
        <EmptyState icon={CalendarDays} mascot="nilo" mood="wave" title="Belum ada jadwal ujian" action={<button type="button" className="btn-primary" onClick={() => setEdit('new')}>Tambah ujian</button>}>
          Tambahkan ujianmu untuk mendapat hitung mundur di beranda, pengingat H-7, H-3, H-1, dan rencana belajar harian.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 1 && overview && <Segmented className="sm:max-w-xs" label="Tampilan ujian" value={view} onChange={setView} items={[{ value: 'list', label: 'Daftar' }, { value: 'calendar', label: 'Kalender' }]} />}
          {overview?.week && upcoming.length > 0 && <Workload week={overview.week} exams={upcoming} />}
          {view === 'calendar' && overview ? <ExamCalendar exams={upcoming} week={overview.week} /> : (
            <div className="space-y-3">
              {upcoming.map((x, i) => <ExamCard key={x.id} x={x} first={i === 0} plan={planOf(x.id)} planner={!!overview} onEdit={() => setEdit(x)} onDelete={() => remove(x)} />)}
            </div>
          )}
          {(past.length > 0 || overview?.archived?.length > 0) && (
            <details className="card p-4">
              <summary className="cursor-pointer font-semibold text-ink-muted">Ujian yang sudah lewat ({past.length}){overview?.archived?.length ? ` · riwayat belajar ${overview.archived.length}` : ''}</summary>
              <ul className="mt-2 space-y-1 text-sm">
                {past.map((x) => <li key={x.id} className="flex justify-between gap-2"><span>{x.title} · {x.expand?.subject?.name} · {fmtDateTime(x.examAt, x.timezone)}{planOf(x.id)?.minutesDone ? ` · ${fmtMinutes(planOf(x.id).minutesDone)} belajar tercatat` : ''}</span><button type="button" className="text-coral hover:underline" onClick={() => remove(x)}>Hapus</button></li>)}
                {(overview?.archived || []).map((p) => <li key={p.id} className="text-ink-muted">{p.examTitle} (ujian dihapus) · {fmtMinutes(p.minutesDone)} belajar tercatat</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
      {edit && <Form initial={edit === 'new' ? null : edit} subjects={subjects} defaults={settings?.reminderDaysDefault || [7, 3, 1]} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function ExamCard({ x, first, plan, planner, onEdit, onDelete }) {
  const d = daysUntil(x.examAt, x.timezone);
  const st = planStatus(plan);
  const dark = first;
  return (
    <article className={`flex flex-wrap items-center gap-4 p-5 ${first ? 'exam-next surface-forest' : `card-chunky tone-surface ${toneClass(x.expand?.subject?.illustrationKey || x.expand?.subject?.slug)}`}`} aria-label={`${x.title} ${x.expand?.subject?.name || ''}`}>
      <div className="min-w-0 flex-[1_1_16rem] space-y-1">
        <p className={`text-[13px] font-bold ${dark ? 'text-white/80' : 'text-[rgb(var(--tone-fg))]'}`}>{d === 0 ? 'Hari ini' : d === 1 ? 'Besok' : `${d} hari lagi`}{!first && ` · ${countdownText(x.examAt)}`}</p>
        <p className={`font-display text-xl font-bold ${dark ? 'text-white' : ''}`}>{x.title} · {x.expand?.subject?.name}</p>
        <p className={`text-sm ${dark ? 'text-white/85' : 'text-ink/75'}`}>{fmtDateTime(x.examAt, x.timezone, { weekday: true })} · pengingat {(x.reminderDays || []).map((r) => (r === 0 ? 'hari H' : `H-${r}`)).join(', ') || 'tidak ada'}</p>
        {planner && <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className={st.chip}>{st.label}</span>
          {plan && <span className={`text-sm ${dark ? 'text-white/85' : 'text-ink/75'}`}>{plan.topicsReady}/{plan.topics} topik siap · {fmtMinutes(plan.minutesDone)} dari {fmtMinutes(plan.minutesPlanned)}</span>}
          {plan?.stale?.length > 0 && <span className={`text-sm ${dark ? 'text-white/85' : 'text-ink/75'}`}>({plan.stale.map((r) => STALE[r] || r).join(', ')})</span>}
        </div>}
        {plan && plan.minutesPlanned > 0 && <ProgressBar value={plan.minutesDone} max={plan.minutesPlanned} label={`Progres belajar ${x.title}`} className={`!h-2 max-w-sm ${dark ? 'bg-white/20' : ''}`} />}
      </div>
      {first && <Countdown target={x.examAt} compact />}
      <div className="flex flex-wrap items-center gap-1">
        {planner && <Link to={`/jadwal/${x.id}/rencana`} className={dark ? 'btn btn-paper btn-sm' : 'btn btn-primary btn-sm'}><ClipboardList size={16} aria-hidden /> {plan ? 'Rencana belajar' : 'Buat rencana'}</Link>}
        <button type="button" className={`rounded-lg p-2 ${dark ? 'hover:bg-white/10' : 'text-ink hover:bg-white/70'}`} onClick={onEdit} aria-label={`Ubah ${x.title}`}><Pencil size={18} /></button>
        <button type="button" className={`rounded-lg p-2 ${dark ? 'hover:bg-white/10' : 'text-ink hover:bg-white/70 hover:text-coral'}`} onClick={onDelete} aria-label={`Hapus ${x.title}`}><Trash2 size={18} /></button>
      </div>
    </article>
  );
}

// 14 days of shared study load against daily capacity; exam days are marked.
function Workload({ week, exams }) {
  const examDays = new Map(exams.map((x) => [toLocalParts(x.examAt, x.timezone).date, x]));
  const max = Math.max(60, ...week.map((d) => Math.max(d.capacity, d.minutes)));
  return (
    <section className="card p-4" aria-label="Beban belajar 14 hari">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h2 className="section-title !text-lg">Beban belajar 14 hari</h2><p className="meta">Batang = rencana belajar · garis = waktu yang kamu sediakan · 🎯 = hari ujian</p></div>
      <ol className="grid grid-cols-7 gap-1.5 sm:grid-cols-[repeat(14,minmax(0,1fr))]">
        {week.map((d) => {
          const ex = examDays.get(d.date);
          const h = Math.round((d.minutes / max) * 64), cap = Math.round((d.capacity / max) * 64);
          return (
            <li key={d.date} className="flex flex-col items-center gap-1" title={`${d.date}: ${d.minutes} mnt direncanakan, ${d.done} mnt selesai, kapasitas ${d.capacity} mnt`}>
              <div className="relative h-16 w-full max-w-8 rounded bg-paper-2/60">
                <span className="absolute inset-x-0 bottom-0 rounded bg-brand/70" style={{ height: h }} />
                <span className="absolute inset-x-0 bottom-0 rounded bg-brand" style={{ height: Math.round((d.done / max) * 64) }} />
                {d.capacity > 0 && <span className="absolute inset-x-0 border-t-2 border-dashed border-gold" style={{ bottom: cap }} />}
              </div>
              <span className="text-[11px] font-semibold text-ink-muted">{ex ? '🎯' : d.date.slice(8)}</span>
              <span className="sr-only">{d.date}: {d.minutes} menit{ex ? `, ujian ${ex.title}` : ''}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// Month-style view of the next 5 weeks (Monday first) with exams and planned minutes.
function ExamCalendar({ exams, week }) {
  const start = new Date(); const dow = (start.getDay() + 6) % 7; start.setDate(start.getDate() - dow);
  const days = Array.from({ length: 35 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  const byDate = new Map(); exams.forEach((x) => { const k = toLocalParts(x.examAt, x.timezone).date; byDate.set(k, [...(byDate.get(k) || []), x]); });
  const load = new Map(week.map((d) => [d.date, d.minutes]));
  return (
    <section className="card overflow-x-auto p-4" aria-label="Kalender ujian 5 minggu">
      <div className="grid min-w-[560px] grid-cols-7 gap-1 text-sm">
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => <div key={d} className="px-1 text-xs font-bold uppercase text-ink-muted">{d}</div>)}
        {days.map((date) => {
          const ex = byDate.get(date) || [];
          return (
            <div key={date} className={`min-h-20 rounded-lg border p-1.5 ${ex.length ? 'border-brand bg-brand-soft' : 'border-line'}`}>
              <p className="text-xs font-semibold text-ink-muted">{Number(date.slice(8))}</p>
              {ex.map((x) => <Link key={x.id} to={`/jadwal/${x.id}/rencana`} className="block truncate text-xs font-bold text-brand-dark hover:underline">🎯 {x.title}</Link>)}
              {load.get(date) > 0 && <p className="text-[11px] text-ink-muted">{fmtMinutes(load.get(date))} belajar</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
