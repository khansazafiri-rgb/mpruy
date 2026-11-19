// RENCANA BELAJAR PER UJIAN (/jadwal/:exam/rencana). Jadwal dihitung server secara deterministik
// (pb_hooks/lib/studyPlanner.js): waktu belajar harian dipakai bersama oleh semua ujian, sesi yang sudah
// selesai tidak pernah diubah, dan kekurangan waktu selalu ditampilkan (tidak ada jadwal mustahil).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Check, Plus, RefreshCw, Trash2 } from 'lucide-react';
import PageHead from '@/components/PageHead';
import Countdown from '@/components/Countdown';
import { Alert, ErrorState, Field, PageLoader, ProgressBar } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { fmtDate, fmtDateTime, toLocalParts } from '@/lib/time';
import { byDay, fmtMinutes, hLabel, KIND, newTopic, planStatus, PRIORITY, STALE, WORKLOAD } from '@/features/study/studyLib';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function StudyPlan() {
  const { exam } = useParams();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const load = useCallback(() => api(`study/exams/${exam}`).then((x) => { setD(x); setEditing((e) => e || !x.plan); }).catch((e) => setError(errorText(e))), [exam]);
  useEffect(() => { load(); }, [load]);
  if (error && !d) return <ErrorState onRetry={() => { setError(''); load(); }}>{error}</ErrorState>;
  if (!d) return <PageLoader />;
  const examDate = toLocalParts(d.exam.examAt, d.exam.timezone).date;
  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <Link to="/jadwal" className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft size={16} aria-hidden /> Pusat ujian</Link>
      <PageHead eyebrow="Rencana belajar" title={`${d.exam.title}${d.exam.subject ? ` · ${d.exam.subject.name}` : ''}`}>
        {fmtDateTime(d.exam.examAt, d.exam.timezone, { weekday: true })}
      </PageHead>
      <section className="card flex flex-wrap items-center justify-between gap-4 p-4"><Countdown target={d.exam.examAt} compact /><p className="meta max-w-md">Jadwal disusun dari tanggal ujian, topikmu, dan waktu belajar harian yang dipakai bersama oleh semua ujianmu. Penanda selesai di sini adalah catatanmu sendiri, bukan nilai kuis.</p></section>
      <Alert>{error}</Alert>
      {editing || !d.plan ? <PlanForm d={d} onCancel={d.plan ? () => setEditing(false) : null} onSaved={async () => { await load(); setEditing(false); }} />
        : <PlanView d={d} examDate={examDate} onEdit={() => setEditing(true)} reload={load} setError={setError} />}
    </div>
  );
}

// ------------------------------------------------------------------ setup / edit
function PlanForm({ d, onCancel, onSaved }) {
  const [profile, setProfile] = useState({ dailyMinutes: d.profile.dailyMinutes, weekdayMinutes: d.profile.weekdayMinutes || [null, null, null, null, null, null, null], restDates: d.profile.restDates || [], activities: d.profile.activities || ['materi', 'soal'] });
  const [perDay, setPerDay] = useState(!!d.profile.weekdayMinutes);
  const [topics, setTopics] = useState(() => (d.plan?.topicList || []).map((t) => ({ ...t })));
  const [priority, setPriority] = useState(d.plan?.priority || 2);
  const [subject, setSubject] = useState(d.exam.subject?.id || '');
  const [chapters, setChapters] = useState(d.chapters);
  const [custom, setCustom] = useState('');
  const [rest, setRest] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!subject || subject === d.exam.subject?.id) { setChapters(d.chapters); return; }
    api(`study/chapters/${subject}`).then((x) => setChapters(x.items)).catch((e) => setError(errorText(e)));
  }, [subject, d]);
  const chosen = new Set(topics.filter((t) => t.source?.type === 'chapter').map((t) => t.source.chapter));
  const toggleChapter = (c) => setTopics((ts) => (chosen.has(c.id) ? ts.filter((t) => t.source?.chapter !== c.id) : [...ts, newTopic({ title: c.title, source: { type: 'chapter', subject: c.subject, chapter: c.id } })]));
  const update = (key, patch) => setTopics((ts) => ts.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  const addCustom = () => { const title = custom.trim(); if (!title) return; setTopics((ts) => [...ts, newTopic({ title })]); setCustom(''); };
  const body = () => ({ topics: topics.map(({ key, title, source, status, confidence, workload, learned }) => ({ key, title, source, status, confidence, workload, learned })), priority });

  async function run(dryRun) {
    setError(''); setBusy(true);
    try {
      if (!topics.length) throw new Error('Pilih minimal satu topik.');
      await api('study/profile', { method: 'PUT', body: { ...profile, weekdayMinutes: perDay ? profile.weekdayMinutes : null } });
      const r = await api(`study/exams/${d.exam.id}/plan`, { method: 'POST', body: { ...body(), dryRun } });
      if (dryRun) setPreview(r); else await onSaved();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  const studied = topics.filter((t) => t.status === 'studied').length;

  return (
    <div className="space-y-6">
      <section className="card space-y-4 p-4" aria-labelledby="sp-time">
        <h2 id="sp-time" className="section-title !text-lg">1. Waktu belajarmu</h2>
        <p className="meta">Waktu ini dipakai bersama oleh semua ujian, jadi tidak ada ujian yang "mengambil" seluruh harimu.</p>
        <Field label="Waktu belajar per hari (menit)" htmlFor="sp-daily"><input id="sp-daily" type="number" min="0" max="960" step="15" className="input max-w-40" value={profile.dailyMinutes} onChange={(e) => setProfile({ ...profile, dailyMinutes: Number(e.target.value) })} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={perDay} onChange={(e) => setPerDay(e.target.checked)} /> Atur berbeda per hari</label>
        {perDay && <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">{DAYS.map((name, i) => (
          <Field key={name} label={name} htmlFor={`sp-wd-${i}`}><input id={`sp-wd-${i}`} type="number" min="0" max="960" step="15" className="input" placeholder={String(profile.dailyMinutes)} value={profile.weekdayMinutes[i] ?? ''} onChange={(e) => { const w = [...profile.weekdayMinutes]; w[i] = e.target.value === '' ? null : Number(e.target.value); setProfile({ ...profile, weekdayMinutes: w }); }} /></Field>
        ))}</div>}
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Hari libur / tidak bisa belajar" htmlFor="sp-rest"><input id="sp-rest" type="date" className="input" value={rest} onChange={(e) => setRest(e.target.value)} /></Field>
          <button type="button" className="btn btn-secondary" onClick={() => { if (rest && !profile.restDates.includes(rest)) setProfile({ ...profile, restDates: [...profile.restDates, rest].sort() }); setRest(''); }}>Tambah</button>
        </div>
        {profile.restDates.length > 0 && <ul className="flex flex-wrap gap-2">{profile.restDates.map((r) => <li key={r} className="chip">{fmtDate(r + 'T00:00:00Z', 'WIB', { weekday: true })} <button type="button" aria-label={`Hapus ${r}`} className="ml-1" onClick={() => setProfile({ ...profile, restDates: profile.restDates.filter((x) => x !== r) })}>×</button></li>)}</ul>}
        <fieldset><legend className="label">Aktivitas yang kamu suka</legend><div className="flex flex-wrap gap-2">{[['materi', 'Membaca materi'], ['soal', 'Latihan soal'], ['flashcard', 'Flashcard'], ['lab', 'MEDCOEL Lab'], ['drilling', 'Drilling/CBT']].map(([k, label]) => (
          <label key={k} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-semibold ${profile.activities.includes(k) ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line'}`}><input type="checkbox" className="sr-only" checked={profile.activities.includes(k)} onChange={() => setProfile({ ...profile, activities: profile.activities.includes(k) ? profile.activities.filter((x) => x !== k) : [...profile.activities, k] })} />{label}</label>
        ))}</div></fieldset>
      </section>

      <section className="card space-y-4 p-4" aria-labelledby="sp-topics">
        <h2 id="sp-topics" className="section-title !text-lg">2. Topik yang diujikan</h2>
        <div className="grid gap-3 md:grid-cols-[minmax(0,260px)_1fr]">
          <Field label="Ambil dari BAB mata kuliah" htmlFor="sp-subj"><select id="sp-subj" className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>{d.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line p-2" role="group" aria-label="Daftar BAB">
            {chapters.length ? chapters.map((c) => <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-paper-2/50"><input type="checkbox" checked={chosen.has(c.id)} onChange={() => toggleChapter(c)} /> {c.title}</label>) : <p className="meta p-2">Belum ada BAB terbit untuk mata kuliah ini. Tambahkan topikmu sendiri di bawah.</p>}
          </div>
        </div>
        <div className="flex gap-2"><label className="min-w-0 flex-1"><span className="sr-only">Topik sendiri</span><input className="input" maxLength={160} placeholder="Tambah topik sendiri (mis. dari catatan dosen)" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} /></label><button type="button" className="btn btn-secondary" onClick={addCustom}><Plus size={16} aria-hidden /> Tambah</button></div>
        {topics.length > 0 && <p className="meta">{topics.length} topik · {studied} sudah dipelajari · {topics.length - studied} belum</p>}
        <ul className="space-y-2">{topics.map((t) => (
          <li key={t.key} className="rounded-xl border border-line p-3">
            <div className="flex flex-wrap items-center gap-2"><p className="min-w-0 flex-1 font-semibold">{t.title}</p><span className="chip">{t.source?.type === 'chapter' ? 'BAB MEDCOEL' : 'Topik sendiri'}</span><button type="button" className="rounded-lg p-1.5 hover:text-coral" aria-label={`Hapus ${t.title}`} onClick={() => setTopics((ts) => ts.filter((x) => x.key !== t.key))}><Trash2 size={16} /></button></div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <label className="text-sm"><span className="label">Status</span><select className="input" value={t.status} onChange={(e) => update(t.key, { status: e.target.value })}><option value="unstudied">Belum dipelajari</option><option value="studied">Sudah dipelajari</option></select></label>
              <label className="text-sm"><span className="label">Keyakinan</span><select className="input" value={t.confidence} onChange={(e) => update(t.key, { confidence: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} · {['sangat ragu', 'ragu', 'cukup', 'yakin', 'sangat yakin'][n - 1]}</option>)}</select></label>
              <label className="text-sm"><span className="label">Beban</span><select className="input" value={t.workload} onChange={(e) => update(t.key, { workload: e.target.value })}>{WORKLOAD.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            </div>
          </li>
        ))}</ul>
      </section>

      <section className="card space-y-3 p-4" aria-labelledby="sp-prio">
        <h2 id="sp-prio" className="section-title !text-lg">3. Prioritas ujian ini</h2>
        <p className="meta">Bila waktu tidak cukup untuk semua ujian, ujian berprioritas tinggi didahulukan (setara ±1,5 hari lebih mendesak).</p>
        <div className="flex gap-2">{PRIORITY.map(([v, l]) => <button key={v} type="button" aria-pressed={priority === v} className={`btn btn-sm ${priority === v ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPriority(v)}>{l}</button>)}</div>
      </section>

      <Alert>{error}</Alert>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => run(true)}><CalendarClock size={16} aria-hidden /> Pratinjau jadwal</button>
        <button type="button" className="btn btn-primary" disabled={busy || !topics.length} onClick={() => run(false)}>{busy ? 'Menyusun…' : 'Simpan rencana'}</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Batal</button>}
      </div>
      {preview && <Preview preview={preview} examId={d.exam.id} topics={topics} />}
    </div>
  );
}

function Preview({ preview, topics }) {
  const names = Object.fromEntries(topics.map((t) => [t.key, t.title]));
  const days = byDay(preview.sessions);
  return (
    <section className="card space-y-3 p-4" aria-label="Pratinjau jadwal" aria-live="polite">
      <h2 className="section-title !text-lg">Pratinjau (belum disimpan)</h2>
      <Shortfall list={preview.shortfall} warnings={preview.warnings} names={names} />
      <ol className="space-y-2">{days.map((day) => (
        <li key={day.date} className="rounded-xl border border-line p-3"><p className="font-semibold">{fmtDate(day.date + 'T00:00:00Z', 'WIB', { weekday: true })} · {fmtMinutes(day.minutes)}</p>
          <ul className="mt-1 space-y-0.5 text-sm">{day.items.map((s, i) => <li key={i}><span className={KIND[s.kind].tone}>{KIND[s.kind].label}</span> {s.topicKey ? names[s.topicKey] || 'topik ujian lain' : ''} · {fmtMinutes(s.minutes)}</li>)}</ul></li>
      ))}</ol>
    </section>
  );
}

function Shortfall({ list = [], warnings = [], names = {} }) {
  if (!list.length && !warnings.length) return <p className="text-sm font-semibold text-brand">✓ Semua topik muat sebelum ujian.</p>;
  return <div className="space-y-2">
    {list.map((s) => <Alert key={s.planId} kind="warn"><b>Waktu tidak cukup: kurang {fmtMinutes(s.minutes)}.</b> Belum terjadwal: {s.items.map((i) => (i.topicKey ? `${KIND[i.kind].label.toLowerCase()} ${names[i.topicKey] || 'topik'}` : KIND[i.kind].label.toLowerCase())).join(', ')}.{s.extraPerDay ? ` Tambah sekitar ${fmtMinutes(s.extraPerDay)} per hari, kurangi topik, atau naikkan prioritas ujian ini.` : ''}</Alert>)}
    {warnings.map((w, i) => <Alert key={i} kind="info">{w.text}</Alert>)}
  </div>;
}

// ------------------------------------------------------------------ plan view
function PlanView({ d, examDate, onEdit, reload, setError }) {
  const plan = d.plan, st = planStatus(plan);
  const names = useMemo(() => Object.fromEntries(plan.topicList.map((t) => [t.key, t.title])), [plan]);
  const [proposal, setProposal] = useState(null);
  const [busy, setBusy] = useState(false);
  const days = byDay(d.sessions.filter((s) => s.status !== 'skipped'));
  const upcoming = days.filter((x) => x.date >= d.today), history = days.filter((x) => x.date < d.today);
  async function mark(s, status) { try { await api(`study/sessions/${s.id}`, { method: 'POST', body: { status } }); reload(); } catch (e) { setError(errorText(e)); } }
  async function learned(t) { try { await api(`study/plans/${plan.id}/topics/${t.key}`, { method: 'POST', body: { learned: !t.learned } }); reload(); } catch (e) { setError(errorText(e)); } }
  async function replan(apply) {
    setBusy(true);
    try { const r = await api('study/replan', { method: 'POST', body: { dryRun: !apply } }); if (apply) { setProposal(null); reload(); } else setProposal(r); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-5">
      <section className="card space-y-3 p-4" aria-label="Ringkasan rencana">
        <div className="flex flex-wrap items-center gap-2"><span className={st.chip}>{st.label}</span><span className="meta">Revisi {plan.revision} · prioritas {PRIORITY.find((p) => p[0] === plan.priority)?.[1]}</span><button type="button" className="btn btn-secondary btn-sm ml-auto" onClick={onEdit}>Ubah topik & waktu</button></div>
        <ProgressBar value={plan.minutesDone} max={Math.max(1, plan.minutesPlanned)} label="Progres belajar" />
        <p className="text-sm">{plan.topicsReady}/{plan.topics} topik siap · {fmtMinutes(plan.minutesDone)} selesai dari {fmtMinutes(plan.minutesPlanned)} direncanakan</p>
        {plan.note && <p className="meta">Perubahan terakhir: {plan.note}</p>}
        <Shortfall list={plan.shortfall ? [plan.shortfall] : []} names={names} />
      </section>
      {(plan.stale.length > 0 || proposal) && (
        <section className="card space-y-3 border-gold p-4" aria-label="Pembaruan jadwal">
          <p className="font-semibold">Jadwal perlu diperbarui: {plan.stale.map((r) => STALE[r] || r).join(', ') || 'usulan baru'}.</p>
          <p className="meta">Sesi yang sudah selesai tidak diubah. Sesi lampau yang belum selesai disimpan sebagai "terlewat".</p>
          {!proposal ? <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => replan(false)}><RefreshCw size={16} aria-hidden /> Lihat usulan perubahan</button> : <>
            {proposal.changes.length ? <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">{proposal.changes.map((c) => <li key={c.date}><b>{fmtDate(c.date + 'T00:00:00Z', 'WIB', { weekday: true })}</b><ul className="ml-4 list-disc">{c.changes.map((x, i) => <li key={i}>{x.text}</li>)}</ul></li>)}</ul> : <p className="text-sm">Tidak ada perubahan pada sesi mendatang.</p>}
            <Shortfall list={proposal.shortfall} warnings={proposal.warnings} names={names} />
            <div className="flex gap-2"><button type="button" className="btn btn-primary" disabled={busy} onClick={() => replan(true)}>Terapkan</button><button type="button" className="btn btn-ghost" onClick={() => setProposal(null)}>Nanti</button></div>
          </>}
        </section>
      )}
      <section className="space-y-3" aria-labelledby="sp-days"><h2 id="sp-days" className="section-title">Jadwal harian</h2>
        {!upcoming.length && <p className="meta">Tidak ada sesi mendatang untuk ujian ini.</p>}
        <ol className="space-y-3">{upcoming.map((day) => <DayCard key={day.date} day={day} examDate={examDate} today={d.today} names={names} resources={d.resources} onMark={mark} />)}</ol>
      </section>
      <section className="space-y-2" aria-labelledby="sp-topics-list"><h2 id="sp-topics-list" className="section-title">Topik</h2>
        <ul className="grid gap-2 sm:grid-cols-2">{plan.topicList.map((t) => {
          const r = d.resources[t.key];
          return <li key={t.key} className="rounded-xl border border-line p-3 text-sm">
            <p className="font-semibold">{t.title}</p>
            <p className="meta">{t.status === 'studied' ? 'Sudah dipelajari' : 'Belum dipelajari'} · keyakinan {t.confidence}/5{r ? ` · ${r.subject}` : ' · topik sendiri'}</p>
            {r?.practice?.total > 0 && <p className="meta">Data latihan terverifikasi: {r.practice.answered}/{r.practice.total} soal dijawab, {r.practice.wrong} salah</p>}
            {t.status !== 'studied' && <button type="button" className="mt-1 text-sm font-semibold text-brand hover:underline" onClick={() => learned(t)}>{t.learned ? 'Batalkan "selesai lebih awal"' : 'Tandai selesai lebih awal'}</button>}
          </li>;
        })}</ul>
      </section>
      {history.length > 0 && <details className="card p-4"><summary className="cursor-pointer font-semibold text-ink-muted">Riwayat ({history.length} hari)</summary>
        <ol className="mt-2 space-y-1 text-sm">{history.map((day) => <li key={day.date}>{fmtDate(day.date + 'T00:00:00Z', 'WIB')}: {day.items.map((s) => `${KIND[s.kind].label}${s.topicKey ? ' ' + (names[s.topicKey] || '') : ''} ${s.status === 'done' ? '✓' : s.status === 'missed' ? '(terlewat)' : ''}`).join(' · ')}</li>)}</ol></details>}
    </div>
  );
}

export function SessionRow({ s, title, links = [], onMark, exam }) {
  const done = s.status === 'done';
  return (
    <li className={`flex flex-wrap items-start gap-3 rounded-xl border p-3 ${done ? 'border-brand/40 bg-brand-soft/40' : 'border-line bg-surface'}`}>
      <button type="button" className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${done ? 'border-brand bg-brand text-white' : 'border-line'}`} aria-pressed={done} aria-label={done ? `Batalkan selesai: ${title || KIND[s.kind].label}` : `Tandai selesai: ${title || KIND[s.kind].label}`} onClick={() => onMark(s, done ? 'planned' : 'done')}>{done && <Check size={16} aria-hidden />}</button>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2"><span className={KIND[s.kind].tone}>{KIND[s.kind].label}</span><span className={`font-semibold ${done ? 'line-through decoration-brand/50' : ''}`}>{title || KIND[s.kind].hint}</span>{s.status === 'missed' && <span className="chip chip-danger">terlewat</span>}</p>
        <p className="meta">{fmtMinutes(s.minutes)}{exam ? ` · ${exam}` : ''}</p>
        {links.length > 0 && <div className="mt-1 flex flex-wrap gap-2">{links.map((l) => <Link key={l.href} to={l.href} className="text-sm font-semibold text-brand hover:underline">{l.label} →</Link>)}</div>}
      </div>
    </li>
  );
}

function DayCard({ day, examDate, today, names, resources, onMark }) {
  return (
    <li className={`card space-y-2 p-4 ${day.date === today ? 'border-2 border-gold' : ''}`}>
      <p className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-semibold">{hLabel(day.date, examDate)} · {fmtDate(day.date + 'T00:00:00Z', 'WIB', { weekday: true })}{day.date === today ? ' · hari ini' : ''}</span><span className="meta">{fmtMinutes(day.minutes)}</span></p>
      <ul className="space-y-2">{day.items.map((s) => <SessionRow key={s.id} s={s} title={s.topicKey ? names[s.topicKey] : ''} links={s.topicKey ? resources[s.topicKey]?.links : []} onMark={onMark} />)}</ul>
    </li>
  );
}
