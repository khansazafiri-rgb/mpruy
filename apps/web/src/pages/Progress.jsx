// PROGRES SAYA: hanya data pemilik akun.
import { CalendarClock, Flame, Table2, Target, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Alert, PageLoader, ProgressBar, Stat } from '@/components/ui';
import { useApi } from '@/lib/useApi';
import { fmtDate, fmtDateTime } from '@/lib/time';

// Warna grafik dari token (tiap grafik satu seri, jadi tanpa kotak legenda).
const C = { brand: 'rgb(0 112 96)', progress: 'rgb(99 87 155)', grid: 'rgb(230 227 218)', ink: 'rgb(74 93 105)', surface: '#fff' };

function Tip({ active, payload, label, unit, labelFmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-card">
      <p className="text-xs text-ink-muted">{labelFmt ? labelFmt(label, payload[0].payload) : label}</p>
      <p className="font-semibold text-ink">{payload[0].value} {unit}</p>
    </div>
  );
}

function ChartCard({ title, children, table }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display font-semibold">{title}</h2>
        <button type="button" className="btn-ghost btn-sm" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}><Table2 size={15} /> {asTable ? 'Grafik' : 'Tabel'}</button>
      </div>
      {asTable ? <div className="scroll-x max-h-72 overflow-y-auto">{table}</div> : children}
    </section>
  );
}

export default function Progress() {
  const { data, error, loading } = useApi('progress');
  const [range, setRange] = useState(7);
  if (loading) return <PageLoader />;
  if (error) return <Alert>{error.message}</Alert>;

  const days = data.daily.slice(-range).map((d) => ({ ...d, label: fmtDate(d.date + 'T00:00:00Z', 'WIB').replace(/ \d{4}$/, '') }));
  const scores = data.scores.map((s, i) => ({ ...s, n: i + 1 }));
  const summary = range === 7 ? data.last7 : data.last30;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Progres saya</h1>
        <p className="mt-1 text-ink-muted">Hanya kamu yang bisa melihat halaman ini.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Hari aktif berturut-turut" value={<span className="inline-flex items-center gap-1"><Flame size={22} className="text-gold" />{data.streak}</span>} accent="text-ink" />
        <Stat label={`Soal dikerjakan (${range} hari)`} value={summary.answered} sub={`${summary.activeDays} hari aktif`} />
        <Stat label={`Jawaban benar (${range} hari)`} value={summary.correct} accent="text-progress" />
        <Stat label="Total poin" value={<span className="inline-flex items-center gap-1"><Trophy size={20} className="text-gold" />{data.totalPoints}</span>} accent="text-ink" />
      </div>

      <div className="flex gap-1 rounded-xl bg-surface p-1 shadow-card w-fit" role="group" aria-label="Rentang waktu">
        {[7, 30].map((r) => (
          <button key={r} type="button" onClick={() => setRange(r)} aria-pressed={range === r} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${range === r ? 'bg-brand text-white' : 'text-ink-muted'}`}>{r} hari</button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Soal dikerjakan per hari" table={(
          <table className="w-full text-sm"><thead><tr className="text-left text-ink-muted"><th className="py-1">Tanggal</th><th>Dikerjakan</th><th>Benar</th></tr></thead>
            <tbody>{days.map((d) => <tr key={d.date} className="border-t border-line"><td className="py-1">{d.label}</td><td>{d.answered}</td><td>{d.correct}</td></tr>)}</tbody></table>
        )}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={C.grid} strokeWidth={1} />
                <XAxis dataKey="label" tick={{ fill: C.ink, fontSize: 11 }} tickLine={false} axisLine={{ stroke: C.grid }} interval={range === 30 ? 4 : 0} />
                <YAxis allowDecimals={false} tick={{ fill: C.ink, fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgb(227 241 238 / 0.6)' }} content={<Tip unit="soal" labelFmt={(l) => l} />} />
                <Bar dataKey="answered" fill={C.brand} radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Skor simulasi dan latihan" table={(
          <table className="w-full text-sm"><thead><tr className="text-left text-ink-muted"><th className="py-1">Percobaan</th><th>Selesai</th><th>Skor</th></tr></thead>
            <tbody>{scores.map((s) => <tr key={s.id} className="border-t border-line"><td className="py-1"><Link className="text-academic hover:underline" to={`/kerjakan/${s.id}`}>{s.title}</Link></td><td>{fmtDate(s.finishedAt)}</td><td>{s.score}</td></tr>)}</tbody></table>
        )}>
          {scores.length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scores} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={C.grid} strokeWidth={1} />
                  <XAxis dataKey="n" tick={{ fill: C.ink, fontSize: 11 }} tickLine={false} axisLine={{ stroke: C.grid }} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fill: C.ink, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ stroke: C.grid, strokeWidth: 1 }} content={<Tip unit="" labelFmt={(_, p) => `${p.title} · ${fmtDateTime(p.finishedAt)}`} />} />
                  <Line type="monotone" dataKey="score" stroke={C.progress} strokeWidth={2} strokeLinecap="round" dot={{ r: 4, fill: C.progress, stroke: C.surface, strokeWidth: 2 }} activeDot={{ r: 6, stroke: C.surface, strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="py-10 text-center text-sm text-ink-muted">Selesaikan satu latihan atau simulasi untuk melihat grafik skor.</p>}
        </ChartCard>
      </div>

      {data.nextExam && (
        <section className="card flex flex-wrap items-center gap-3 p-4">
          <CalendarClock className="text-academic" size={24} />
          <p className="flex-1">Ujian terdekat: <b>{data.nextExam.title} {data.nextExam.subjectName}</b> · {fmtDateTime(data.nextExam.examAt, data.nextExam.timezone)}</p>
          <Link to="/jadwal" className="btn-secondary btn-sm">Jadwal ujian</Link>
        </section>
      )}

      <section>
        <h2 className="section-title mb-3">Per mata kuliah</h2>
        <div className="card divide-y divide-line">
          {data.subjects.map((s) => (
            <Link key={s.id} to={`/mata-kuliah/${s.slug}`} className="grid gap-2 p-4 hover:bg-page sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_7rem_8rem] sm:items-center sm:gap-5">
              <p className="font-semibold">{s.name}{s.studying && <span className="ml-2 chip bg-gold-soft text-[#6b4f00]">Sedang dipelajari</span>}</p>
              <div>
                <p className="mb-1 text-xs text-ink-muted">BAB tuntas {s.chaptersDone}/{s.chaptersWithQuestions}</p>
                <ProgressBar value={s.chaptersDone} max={s.chaptersWithQuestions || 1} color="bg-progress" label={`BAB tuntas ${s.name}`} />
              </div>
              <p className="text-sm"><span className="text-ink-muted">Dikerjakan</span> <b>{s.answered}</b></p>
              <p className="flex items-center gap-1 text-sm"><Target size={14} className="text-ink-muted" /> <b>{s.correctPct}%</b> <span className="text-ink-muted">benar</span></p>
            </Link>
          ))}
        </div>
        <p className="hint">BAB dihitung tuntas bila minimal 80% soalnya sudah pernah kamu kerjakan.</p>
      </section>
    </div>
  );
}
