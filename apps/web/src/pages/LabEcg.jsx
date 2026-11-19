// KONDUKSI JANTUNG & EKG SKEMATIK (/lab/ekg, latihan: /lab/ekg?latihan=1).
// Pola dibuat dari model matematis sederhana (features/lab/ecg/ecgModel.js) untuk belajar konsep. Bukan rekaman pasien,
// bukan simulasi elektrofisiologi tervalidasi, dan tidak untuk diagnosis. Latihan di sini mandiri: tanpa poin/peringkat.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Box, Pause, Play, RotateCcw, Target } from 'lucide-react';
import PageHead from '@/components/PageHead';
import { Segmented } from '@/components/ui';
import { NORMAL, PAPER, PHASES, RHYTHMS, beats, measure, phaseAt, practiceRound, rhythmByKey, stripPath } from '@/features/lab/ecg/ecgModel';

const PAGE = 'min-w-0 space-y-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-8';
const DURATION = 6000;
const GLOW = '#f8c038';

export default function LabEcg() {
  const [params, setParams] = useSearchParams();
  const practice = params.get('latihan') === '1';
  return (
    <div className={PAGE}>
      <Link to="/lab/keterampilan/ekg" className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-brand"><ArrowLeft size={16} aria-hidden /> Jalur EKG Dasar</Link>
      <PageHead eyebrow="MEDCOEL Lab · Modul interaktif" title="Konduksi jantung & EKG skematik">Ikuti impuls listrik dari nodus SA sampai ventrikel, lalu lihat jejaknya di kertas EKG.</PageHead>
      <p className="card-quiet px-4 py-3 text-sm text-ink-muted" role="note"><b className="text-ink">Pola skematik.</b> Gelombang dibuat dari model sederhana untuk memahami konsep. Bukan rekaman pasien dan tidak untuk menegakkan diagnosis.</p>
      <Segmented className="sm:max-w-xs" label="Mode modul EKG" value={practice ? 'latihan' : 'belajar'} onChange={(v) => setParams(v === 'latihan' ? { latihan: '1' } : {})} items={[{ value: 'belajar', label: 'Belajar' }, { value: 'latihan', label: 'Latihan' }]} />
      {practice ? <Practice /> : <Learn />}
    </div>
  );
}

// ------------------------------------------------------------------ learn
function Learn() {
  const [key, setKey] = useState('sinus');
  const rhythm = rhythmByKey(key);
  const list = useMemo(() => beats(rhythm, DURATION), [rhythm]);
  const m = useMemo(() => measure(rhythm, DURATION), [rhythm]);
  const [playing, setPlaying] = useState(() => !(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  const [speed, setSpeed] = useState(0.5);
  const [t, setT] = useState(0);
  const last = useRef(0);
  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0; last.current = 0;
    const tick = (now) => { if (last.current) { const dt = now - last.current; setT((x) => (x + dt * speed) % DURATION); } last.current = now; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);
  const phase = phaseAt(list, t);
  const info = PHASES[phase.key];
  const range = (v, [lo, hi]) => (v >= lo && v <= hi ? 'dalam rentang' : v < lo ? 'di bawah rentang' : 'di atas rentang');
  return <>
    <div role="group" aria-label="Pilih pola" className="flex flex-wrap gap-2">{RHYTHMS.map((r) => <button key={r.key} type="button" aria-pressed={r.key === key} onClick={() => { setKey(r.key); setT(0); }} className={`chip min-h-9 px-3 text-[13px] ${r.key === key ? 'bg-brand text-white' : 'chip-brand'}`}>{r.title}</button>)}</div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="card min-w-0 space-y-3 p-4" aria-label="Rekaman EKG skematik">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title !text-lg">{rhythm.title}</h2>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>{playing ? <><Pause size={15} aria-hidden /> Jeda</> : <><Play size={15} aria-hidden /> Putar</>}</button>
            <label className="sr-only" htmlFor="ecg-speed">Kecepatan</label>
            <select id="ecg-speed" className="input !h-9 !w-auto !py-0 text-sm" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value={0.25}>0,25×</option><option value={0.5}>0,5×</option><option value={1}>1× (waktu nyata)</option></select>
          </div>
        </div>
        <Strip list={list} cursor={t} labels />
        <label className="flex items-center gap-2 text-sm"><span className="shrink-0 text-ink-muted">Geser waktu</span><input type="range" className="w-full accent-[rgb(var(--brand))]" min={0} max={DURATION - 1} step={10} value={Math.round(t)} onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }} aria-valuetext={`${(t / 1000).toFixed(2).replace(".", ",")} detik`} /></label>
        <p className="meta">Kertas {PAPER.mmPerSecond} mm/detik · kotak kecil {PAPER.smallBoxMs} ms · kotak besar {PAPER.bigBoxMs} ms · 10 mm = 1 mV.</p>
      </section>
      <section className="card space-y-3 p-4" aria-label="Sistem konduksi">
        <Conduction phase={phase.key} />
        <div aria-live="polite" className="space-y-1">
          <p className="text-[13px] font-bold text-brand">{info.wave} · {info.part}</p>
          <p className="text-sm">{info.text}</p>
        </div>
      </section>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card space-y-2 p-4" aria-labelledby="ecg-measure-h">
        <h2 id="ecg-measure-h" className="section-title !text-lg">Ukuran pada pola ini</h2>
        <table className="w-full text-sm"><tbody className="[&_td]:py-1 [&_td:first-child]:text-ink-muted">
          <tr><td>Laju ventrikel</td><td className="font-semibold">{m.ventricularRate}/menit</td><td className="meta">{range(m.ventricularRate, NORMAL.hr)} 60–100</td></tr>
          {m.dropped > 0 && <tr><td>Laju atrium (P)</td><td className="font-semibold">{m.atrialRate}/menit</td><td className="meta">{m.dropped} P tanpa QRS</td></tr>}
          <tr><td>Interval PR</td><td className="font-semibold">{m.prMin === m.prMax ? `${m.prMin} ms` : `${m.prMin}–${m.prMax} ms`}</td><td className="meta">{m.prMin === m.prMax ? range(m.prMin, NORMAL.pr) : 'berubah tiap denyut'} 120–200</td></tr>
          <tr><td>Durasi QRS</td><td className="font-semibold">{m.qrs} ms</td><td className="meta">sempit (&lt; 120)</td></tr>
          <tr><td>Keteraturan R–R</td><td className="font-semibold">{m.regular ? 'teratur' : 'tidak teratur'}</td><td /></tr>
        </tbody></table>
        {m.regular && <p className="meta">Cara cepat: 300 ÷ jumlah kotak besar antar-R = {m.rateFromBoxes}/menit.</p>}
      </section>
      <section className="card space-y-2 p-4" aria-labelledby="ecg-points-h">
        <h2 id="ecg-points-h" className="section-title !text-lg">Ciri yang dicari</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">{rhythm.points.map((p) => <li key={p}>{p}</li>)}</ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link className="btn btn-secondary btn-sm" to="/anatomy/system/cardiovascular"><Box size={15} aria-hidden /> Jantung di Atlas 3D</Link>
          <Link className="btn btn-secondary btn-sm" to="/anatomy/study?mode=identify&system=cardiovascular&region=thorax"><Target size={15} aria-hidden /> Kuis struktur jantung</Link>
        </div>
      </section>
    </div>
  </>;
}

// ------------------------------------------------------------------ practice (self-check, no points)
function Practice() {
  const [seed, setSeed] = useState(() => (Date.now() % 100000) + 1);
  const round = useMemo(() => practiceRound(seed, 5), [seed]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const q = round[i];
  const list = useMemo(() => (q ? beats(rhythmByKey(q.answer), DURATION) : []), [q]);
  if (!q) return <section className="card space-y-3 p-5 text-center" aria-live="polite">
    <p className="font-display text-2xl font-bold">{score} dari {round.length} benar</p>
    <p className="text-sm text-ink-muted">Latihan mandiri, tidak dinilai dan tidak masuk peringkat.</p>
    <div className="flex flex-wrap justify-center gap-2"><button type="button" className="btn btn-primary" onClick={() => { setSeed((s) => s + 1); setI(0); setScore(0); setPicked(null); }}><RotateCcw size={16} aria-hidden /> Latihan lagi</button><Link className="btn btn-secondary" to="/lab/ekg">Kembali belajar</Link></div>
  </section>;
  const right = picked === q.answer;
  return <section className="card space-y-3 p-4" aria-label="Latihan mengenali pola">
    <p className="flex items-center justify-between gap-2"><span className="eyebrow">Soal {i + 1} dari {round.length}</span><span className="meta">Benar: {score}</span></p>
    <h2 className="section-title !text-lg">Pola apa yang paling sesuai?</h2>
    <Strip list={list} />
    <p className="meta">Tips: hitung kotak besar antar-R, lihat apakah setiap P diikuti QRS, dan ukur PR.</p>
    <div role="group" aria-label="Pilihan jawaban" className="grid gap-2 sm:grid-cols-2">{q.options.map((k) => {
      const tone = picked == null ? 'btn-secondary' : k === q.answer ? 'btn-primary' : k === picked ? 'btn-secondary !border-coral !text-coral' : 'btn-secondary opacity-60';
      return <button key={k} type="button" disabled={picked != null} className={`btn justify-start text-left ${tone}`} onClick={() => { setPicked(k); if (k === q.answer) setScore((s) => s + 1); }}>{rhythmByKey(k).title}</button>;
    })}</div>
    {picked != null && <div aria-live="polite" className="space-y-2">
      <p className={`font-semibold ${right ? 'text-brand' : 'text-coral'}`}>{right ? 'Benar.' : `Belum tepat. Jawabannya: ${rhythmByKey(q.answer).title}.`}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">{rhythmByKey(q.answer).points.map((p) => <li key={p}>{p}</li>)}</ul>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => { setI((x) => x + 1); setPicked(null); }}>{i + 1 < round.length ? 'Soal berikutnya' : 'Lihat hasil'} <ArrowRight size={15} aria-hidden /></button>
    </div>}
  </section>;
}

// ------------------------------------------------------------------ drawing
function Strip({ list, cursor = null, labels = false }) {
  const w = (DURATION / 1000) * PAPER.mmPerSecond, h = 30, base = 20;
  const d = useMemo(() => stripPath(list, DURATION, base), [list]);
  const first = list.find((b) => b.qrs != null);
  const x = (ms) => (ms / 1000) * PAPER.mmPerSecond;
  return <div className="overflow-x-auto rounded-lg border border-line bg-white">
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full min-w-[600px]" role="img" aria-label="Strip EKG skematik 6 detik, sadapan tunggal">
      <defs>
        <pattern id="ecg-small" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0V1H0" fill="none" stroke="rgb(240 160 160 / .35)" strokeWidth=".05" /></pattern>
        <pattern id="ecg-big" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="url(#ecg-small)" /><path d="M5 0V5H0" fill="none" stroke="rgb(220 110 110 / .55)" strokeWidth=".12" /></pattern>
      </defs>
      <rect width={w} height={h} fill="url(#ecg-big)" />
      <path d={d} fill="none" stroke="rgb(30 40 45)" strokeWidth=".28" strokeLinejoin="round" />
      {labels && first && <g fontSize="2.2" fontWeight="700" fill="rgb(0 110 90)" textAnchor="middle">
        <text x={x(first.p + 45)} y={base - 3.2}>P</text>
        <text x={x(first.qrs + 40)} y={base - 12.6}>QRS</text>
        <text x={x(first.t)} y={base - 4.6}>T</text>
        <path d={`M${x(first.p)} ${base + 3}h${x(first.pr)}`} stroke="rgb(0 110 90)" strokeWidth=".2" />
        <text x={x(first.p + first.pr / 2)} y={base + 6} fontSize="1.9">PR</text>
      </g>}
      {cursor != null && <line x1={x(cursor)} x2={x(cursor)} y1="0" y2={h} stroke={GLOW} strokeWidth=".5" opacity=".9" />}
    </svg>
  </div>;
}

// Schematic (not to scale) conduction system; the active part glows yellow like a selection in the Atlas.
function Conduction({ phase }) {
  const on = (keys) => keys.includes(phase);
  const part = (keys) => ({ stroke: on(keys) ? GLOW : 'rgb(120 130 125)', strokeWidth: on(keys) ? 3.2 : 1.6, style: on(keys) ? { filter: `drop-shadow(0 0 3px ${GLOW})` } : undefined });
  const fill = (keys) => (on(keys) ? 'rgb(248 192 56 / .28)' : 'rgb(0 110 90 / .07)');
  const blocked = phase === 'blocked';
  return <svg viewBox="0 0 220 210" className="mx-auto block w-full max-w-[280px]" role="img" aria-label={`Diagram skematik sistem konduksi; aktif: ${PHASES[phase].part}`}>
    {/* chambers (schematic): atria above, ventricles below */}
    <ellipse cx="78" cy="70" rx="38" ry="28" fill={fill(['sa', 'atria'])} stroke="rgb(0 110 90 / .45)" />
    <ellipse cx="146" cy="64" rx="36" ry="26" fill={fill(['atria'])} stroke="rgb(0 110 90 / .45)" />
    <path d="M44 104 Q40 150 108 196 Q178 150 176 100 Z" fill={fill(['ventricles', 'plateau', 'repol'])} stroke="rgb(0 110 90 / .45)" />
    {/* internodal pathways + atrial spread */}
    <path d="M70 50 Q60 80 104 100 M70 50 Q120 40 150 60" fill="none" {...part(['atria'])} />
    {/* AV node, His, bundle branches, Purkinje */}
    <circle cx="106" cy="102" r="6" fill={blocked ? 'rgb(220 90 90)' : on(['av']) ? GLOW : 'rgb(255 255 255)'} {...part(['av', 'blocked'])} />
    {blocked && <path d="M98 94l16 16M114 94l-16 16" stroke="rgb(180 40 40)" strokeWidth="2.2" />}
    <path d="M106 108 V126" fill="none" {...part(['his', 'ventricles'])} />
    <path d="M106 126 Q84 140 72 170 M106 126 Q130 140 146 168" fill="none" {...part(['ventricles'])} />
    <path d="M72 170 Q90 192 108 194 Q128 190 146 168 M60 150 Q54 128 58 112 M152 150 Q160 128 158 110" fill="none" {...part(['ventricles'])} strokeDasharray="3 2" />
    <circle cx="68" cy="48" r="6" fill={on(['sa']) ? GLOW : 'rgb(255 255 255)'} {...part(['sa'])} />
    <g fontSize="9.5" fill="rgb(30 40 45)" fontWeight="600">
      <text x="2" y="38">Nodus SA</text>
      <text x="116" y="106">Nodus AV</text>
      <text x="112" y="124" fontSize="8.5">Berkas His</text>
      <text x="8" y="182" fontSize="8.5">Cabang kanan</text>
      <text x="150" y="184" fontSize="8.5">Cabang kiri</text>
      <text x="62" y="72" fontSize="8" fill="rgb(0 90 75)">Atrium</text>
      <text x="88" y="150" fontSize="8" fill="rgb(0 90 75)">Ventrikel</text>
    </g>
  </svg>;
}
