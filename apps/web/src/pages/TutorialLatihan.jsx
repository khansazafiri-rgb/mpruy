// TUTORIAL LATIHAN SOAL FK (/tutorial/latihan-soal)
// Kotak pasir terpandu bersama Kila: semua tampilan di sini tiruan dari halaman
// asli (mata kuliah, dialog latihan, paket, simulasi, pengerjaan, riwayat),
// memakai data contoh, jadi tetap jalan walau bank soal pengguna masih kosong.
// Pengguna harus melakukan tiap langkah sendiri sebelum bisa lanjut.
import clsx from 'clsx';
import {
  ArrowLeft, ArrowRight, BookOpen, BookOpenCheck, CheckCircle2, Clock, History as HistoryIcon, Layers, LogOut, Minus,
  Package, PlayCircle, Plus, SlidersHorizontal, Sparkles, TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Illustration from '@/components/Illustration';
import QuestionView from '@/components/QuestionView';
import { useAuth } from '@/context/AuthContext';
import SkipButton from '@/features/onboarding/SkipButton';
import Speech from '@/features/onboarding/Speech';
import { PACKAGES, TUT_SUBJECTS, toQuestion } from '@/features/onboarding/samples';
import { DIFF, DIFF_CLASS } from '@/lib/labels';
import { toneClass } from '@/lib/tone';
import { markTutorial, tutorialStatus } from '@/lib/tutorial';
import '@/styles/onboarding.css';

const DIFFS = ['easy', 'medium', 'hard'];
const AVAIL = { easy: 12, medium: 10, hard: 8 };
const STEP_LABELS = ['Mata kuliah', 'Latihan per BAB', 'Paket soal', 'Simulasi', 'Kerjakan', 'Keluar', 'Riwayat', 'Selesai'];

function split(n) {
  const out = { easy: 0, medium: 0, hard: 0 };
  let left = n;
  while (left > 0) {
    let moved = false;
    for (const d of DIFFS) { if (left > 0 && out[d] < AVAIL[d]) { out[d]++; left--; moved = true; } }
    if (!moved) break;
  }
  return out;
}

function Stepper({ value, min = 0, max, onChange, label, small = false }) {
  return (
    <div className={clsx('count-stepper', small && 'onb-stepper-sm')}>
      <button type="button" aria-label={`Kurangi ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}><Minus size={15} /></button>
      <output aria-label={label}>{value}</output>
      <button type="button" aria-label={`Tambah ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}><Plus size={15} /></button>
    </div>
  );
}

function ModeChoice({ value, onChange, name }) {
  const opts = [
    ['learning', 'Mode Learning', 'Pembahasan langsung per soal.', BookOpen],
    ['exam', 'Mode ujian', 'Pembahasan setelah sesi selesai.', Clock],
  ];
  return (
    <fieldset>
      <legend className="label">Cara mengerjakan</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {opts.map(([v, t, d, Icon]) => (
          <label key={v} className={`mode-choice cursor-pointer rounded-2xl border p-4 transition-colors ${value === v ? 'is-selected' : 'border-line hover:border-brand/50'}`}>
            <input type="radio" name={name} className="sr-only" checked={value === v} onChange={() => onChange(v)} />
            <span className="mode-choice-head"><Icon size={20} /><span className="text-sm font-semibold">{t}</span>{value === v && <CheckCircle2 size={17} />}</span>
            <span className="text-[13px] text-ink-muted">{d}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Bingkai "tampilan contoh" supaya jelas ini tiruan, bukan halaman sungguhan.
function Mock({ label, children, className = '' }) {
  return (
    <div className={clsx('onb-mock', className)}>
      <div className="onb-mock-bar" aria-hidden><i /><i /><i /><span>{label}</span></div>
      <div className="onb-mock-body">{children}</div>
    </div>
  );
}

export default function TutorialLatihan() {
  const { me, refresh } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [subjectKey, setSubjectKey] = useState('');
  const [bab, setBab] = useState(null);
  const [practice, setPractice] = useState({ count: 10, mode: 'learning' });
  const [pkg, setPkg] = useState(null);
  const [pkgMode, setPkgMode] = useState('exam');
  const [plan, setPlan] = useState({});
  const [simMode, setSimMode] = useState('learning');
  const [value, setValue] = useState(null);
  const [checked, setChecked] = useState(false);
  const [exited, setExited] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [busy, setBusy] = useState(false);
  const marked = useRef(false);
  const stage = useRef(null);

  const subject = TUT_SUBJECTS.find((s) => s.key === subjectKey);
  const question = useMemo(() => (subject ? toQuestion(subject) : null), [subject]);
  const chosen = subject ? subject.chapters.filter((c) => plan[c]?.on && plan[c].total > 0) : [];
  const simTotal = chosen.reduce((a, c) => a + plan[c].total, 0);
  const correct = checked && value === question?.answer;

  const updatePlan = (c, patch) => setPlan((p) => {
    const cur = { on: false, total: 0, easy: 0, medium: 0, hard: 0, custom: false, ...(p[c] || {}), ...patch };
    if (!cur.custom) Object.assign(cur, split(cur.total));
    else cur.total = cur.easy + cur.medium + cur.hard;
    return { ...p, [c]: cur };
  });

  // Tandai selesai saat sampai di langkah terakhir.
  useEffect(() => {
    if (step !== 7 || marked.current) return;
    marked.current = true;
    markTutorial('fk', 'done').then(() => refresh()).catch(() => {});
  }, [step, refresh]);

  // Pindah langkah: gulir ke atas panggung supaya instruksi terlihat.
  useEffect(() => {
    stage.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [step]);

  const skip = async () => {
    setBusy(true);
    try {
      if (tutorialStatus(me, 'fk') !== 'done') await markTutorial('fk', 'skipped');
      await refresh();
    } catch { /* tetap keluar */ }
    nav('/beranda');
  };

  // Teks Kila dan syarat lanjut untuk tiap langkah.
  const guide = (() => {
    switch (step) {
      case 0: return subject
        ? { mood: 'happy', title: 'Pilihan bagus!', text: `${subject.name} siap. Di aplikasi aslinya, mata kuliah yang kamu pilih saat daftar selalu muncul paling atas. Tekan Lanjut.`, ok: true }
        : { mood: 'wave', title: 'Hai, aku Kila!', text: 'Aku temani kamu mencoba latihan soal di MEDCOEL. Pertama, pilih satu mata kuliah di bawah.', ok: false, need: 'Pilih satu mata kuliah' };
      case 1: return bab
        ? { mood: 'happy', title: 'Latihan per BAB', text: 'Atur jumlah soal dengan tombol − dan +, atau pilih angka cepat. Lalu pilih cara mengerjakan: Mode Learning menampilkan pembahasan langsung, Mode Ujian setelah selesai.', ok: true }
        : { mood: 'think', title: 'Cara pertama: per BAB', text: 'Ini halaman mata kuliah. Kalau mau fokus ke satu topik, klik salah satu BAB di daftar.', ok: false, need: 'Klik salah satu BAB' };
      case 2: return pkg
        ? { mood: 'happy', title: `${pkg.name} dipilih`, text: 'Paket mengambil soal dari semua BAB sekaligus, cocok untuk latihan menjelang ujian. Soal yang belum pernah kamu kerjakan didahulukan.', ok: true }
        : { mood: 'think', title: 'Cara kedua: paket soal', text: 'Di bagian bawah halaman mata kuliah ada Paket soal: 100, 150, atau 200 soal dari semua BAB. Coba pilih salah satu paket.', ok: false, need: 'Pilih satu paket' };
      case 3: return simTotal
        ? { mood: 'happy', title: `${simTotal} soal siap`, text: 'Kamu bisa atur komposisi mudah, sedang, dan sulit lewat Atur komposisi. Kalau sudah pas, tekan Mulai simulasi.', ok: false, need: 'Tekan Mulai simulasi' }
        : { mood: 'think', title: 'Cara ketiga: simulasi', text: 'Simulasi paling fleksibel. Centang BAB yang mau kamu latih, lalu atur jumlah soalnya. Untuk tutorial ini, cukup sedikit saja.', ok: false, need: 'Centang minimal satu BAB' };
      case 4: return checked
        ? (correct
          ? { mood: 'cheer', title: 'Tepat sekali!', text: 'Perhatikan pembahasannya: bukan cuma alasan jawaban benar, tapi juga kenapa pilihan lain salah. Tekan Lanjut.', ok: true }
          : { mood: 'think', title: 'Belum tepat, nggak apa-apa', text: `Kuncinya ${question.answer}. Baca pembahasan tiap pilihan di bawah, ini justru bagian paling berharga. Tekan Lanjut.`, ok: true })
        : { mood: value ? 'idle' : 'think', title: 'Soal pertamamu', text: 'Pilih satu jawaban, lalu tekan Cek jawaban untuk melihat pembahasannya.', ok: false, need: value ? 'Tekan Cek jawaban' : 'Pilih satu jawaban' };
      case 5: return exited
        ? { mood: 'happy', title: 'Progresmu aman', text: 'Jawabanmu tersimpan otomatis. Sesi yang belum selesai tidak hilang dan bisa kamu lanjutkan kapan saja dari Riwayat.', ok: true }
        : { mood: 'think', title: 'Coba keluar dulu', text: 'Kalau harus berhenti di tengah, tekan tombol Keluar di kanan atas layar pengerjaan. Coba tekan sekarang.', ok: false, need: 'Tekan tombol Keluar' };
      case 6: return resumed
        ? { mood: 'happy', title: 'Begitu caranya!', text: 'Tekan sesi yang belum selesai untuk melanjutkan. Sesi yang sudah selesai bisa dibuka lagi untuk review skor dan pembahasan. Progres per BAB ada di menu Progres.', ok: true }
        : { mood: 'idle', title: 'Ini Riwayat', text: 'Semua simulasi, paket, dan latihan yang kamu kerjakan tercatat di Riwayat (menu profil di kanan atas). Sesimu barusan ada paling atas. Coba tekan sesi itu.', ok: false, need: 'Tekan sesimu di Riwayat' };
      default: return { mood: 'cheer', title: 'Kamu siap!', text: 'Sekarang kamu tahu tiga cara latihan, cara mengerjakan dan keluar, dan di mana melihat riwayatmu. Selamat belajar!', ok: true };
    }
  })();

  const next = () => { if (guide.ok && step < 7) setStep((s) => s + 1); };
  const back = () => setStep((s) => Math.max(0, s - 1));
  const startSim = () => setStep(4);

  const runnerTitle = subject ? `Simulasi: ${subject.name}` : 'Simulasi';
  const simModeLabel = simMode === 'learning' ? 'Learning' : 'Ujian';

  return (
    <div className="onb-page">
      <div className="onb-page-top">
        <div className="min-w-0">
          <p className="onb-eyebrow">Tutorial · Latihan soal FK</p>
          <ol className="onb-dots" aria-label={`Langkah ${step + 1} dari ${STEP_LABELS.length}: ${STEP_LABELS[step]}`}>
            {STEP_LABELS.map((l, i) => <li key={l} className={clsx(i < step && 'is-done', i === step && 'is-now')} aria-hidden />)}
          </ol>
        </div>
        {step < 7 && <SkipButton onClick={skip} busy={busy} />}
      </div>

      <div className="onb-layout">
        <div className="onb-guide">
          <Speech mascot="kila" mood={guide.mood} title={guide.title} text={guide.text} size={120} key={`${step}-${guide.title}`}>
            {!guide.ok && guide.need && <p className="onb-need"><Sparkles size={14} aria-hidden /> {guide.need}</p>}
          </Speech>
          <div className="onb-nav">
            <button type="button" className="btn-ghost" onClick={back} disabled={step === 0 || step === 7}><ArrowLeft size={17} /> Kembali</button>
            {step < 7 && step !== 3 && <button type="button" className="btn-primary btn-press" onClick={next} disabled={!guide.ok}>Lanjut <ArrowRight size={17} /></button>}
          </div>
        </div>

        <section className="onb-stage" ref={stage} aria-label={STEP_LABELS[step]}>
          {step === 0 && (
            <Mock label="Mata kuliah">
              <p className="onb-mock-h">Pilih mata kuliah</p>
              <div className="onb-subjects">
                {TUT_SUBJECTS.map((s) => (
                  <button key={s.key} type="button" aria-pressed={subjectKey === s.key} onClick={() => { setSubjectKey(s.key); setBab(null); setPlan({}); setValue(null); setChecked(false); }}
                    className={clsx('onb-subject card-chunky tone-surface', toneClass(s.key), !subjectKey && 'onb-spot-soft')}>
                    <span className="onb-subject-art sticker-tone"><Illustration subject={{ illustrationKey: s.key }} className="h-full w-full" /></span>
                    <span className="onb-subject-name">{s.name}</span>
                    {subjectKey === s.key && <CheckCircle2 size={20} className="onb-subject-check" aria-label="Dipilih" />}
                  </button>
                ))}
              </div>
            </Mock>
          )}

          {step === 1 && subject && (
            <Mock label={`Mata kuliah · ${subject.name}`}>
              <div className={clsx('onb-hero tone-surface', toneClass(subject.key))}>
                <div className="min-w-0"><p className="onb-eyebrow">Mata kuliah</p><p className="onb-hero-title">{subject.name}</p><p className="text-sm text-ink-muted">{subject.desc}</p></div>
                <span className="onb-hero-art sticker-tone"><Illustration subject={{ illustrationKey: subject.key }} className="h-full w-full" /></span>
              </div>
              <p className="onb-mock-h">Latihan per topik</p>
              <ul className="onb-babs">
                {subject.chapters.map((c, i) => (
                  <li key={c}>
                    <button type="button" className={clsx('chapter-row', bab === c && 'is-picked', !bab && 'onb-spot-soft')} onClick={() => setBab(c)} aria-pressed={bab === c}>
                      <span className="chapter-num" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                      <span className="min-w-0 flex-1"><span className="block font-display text-[16px] font-semibold leading-snug">{c}</span><span className="mt-1 block text-[13px] text-ink-muted">0/30 soal dikerjakan</span></span>
                      <span className="chapter-go"><PlayCircle size={16} aria-hidden /><span>Latihan</span></span>
                    </button>
                  </li>
                ))}
              </ul>
              {bab && (
                <div className="onb-dialog">
                  <p className="onb-dialog-title">Siapkan sesi belajarmu</p>
                  <div className="space-y-5">
                    <div className="practice-banner"><span><BookOpenCheck size={22} /></span><div className="min-w-0"><p className="eyebrow mb-1">Latihan per BAB</p><p className="text-sm font-semibold">{bab}</p><p className="mt-1 text-xs text-ink-muted">30 soal tersedia untukmu</p></div></div>
                    <div>
                      <div className="count-controls"><span className="label !mb-0">Jumlah soal</span><Stepper value={practice.count} min={1} max={30} label="jumlah soal" onChange={(n) => setPractice((p) => ({ ...p, count: n }))} /></div>
                      <div className="count-presets">{[5, 10, 20, 30].map((n) => <button type="button" key={n} aria-pressed={practice.count === n} onClick={() => setPractice((p) => ({ ...p, count: n }))}>{n} soal</button>)}</div>
                    </div>
                    <ModeChoice name="tut-practice-mode" value={practice.mode} onChange={(m) => setPractice((p) => ({ ...p, mode: m }))} />
                    <p className="onb-mini-note">Di aplikasi asli, tombol <b>Mulai {practice.count} soal</b> langsung membuka sesi latihan.</p>
                  </div>
                </div>
              )}
            </Mock>
          )}

          {step === 2 && subject && (
            <Mock label={`Mata kuliah · ${subject.name} · Paket soal`}>
              <p className="onb-eyebrow">Sekali jalan, semua BAB</p>
              <p className="onb-mock-h">Paket soal</p>
              <div className="onb-packages">
                {PACKAGES.map((p) => (
                  <button key={p.id} type="button" aria-pressed={pkg?.id === p.id} onClick={() => setPkg(p)} className={clsx('onb-package card-chunky', pkg?.id === p.id && 'is-picked', !pkg && 'onb-spot-soft')}>
                    <span className="onb-package-icon"><Package size={20} aria-hidden /></span>
                    <span className="onb-package-name">{p.name}</span>
                    <span className="text-[13px] text-ink-muted">{p.per} soal per BAB, maks. {p.total} soal</span>
                  </button>
                ))}
              </div>
              {pkg && (
                <div className="onb-dialog">
                  <p className="onb-dialog-title">{pkg.name}</p>
                  <div className="space-y-4">
                    <p className="text-ink-muted">{pkg.desc}</p>
                    <p className="text-sm">Soal diambil dari semua BAB, {pkg.per} soal per BAB, paling banyak {pkg.total} soal, dengan tipe dan tingkat kesulitan beragam.</p>
                    <ModeChoice name="tut-pkg-mode" value={pkgMode} onChange={setPkgMode} />
                  </div>
                </div>
              )}
            </Mock>
          )}

          {step === 3 && subject && (
            <Mock label={`Coba Simulasi: ${subject.name}`}>
              <div className="onb-dialog is-flat">
                <p className="onb-dialog-title">Coba Simulasi: {subject.name}</p>
                <p className="label">BAB yang disimulasikan</p>
                <div className="divide-y divide-line rounded-xl border border-line bg-surface">
                  {subject.chapters.map((c) => {
                    const p = plan[c] || { on: false, total: 0, easy: 0, medium: 0, hard: 0, custom: false };
                    return (
                      <div key={c} className={clsx('p-3', !chosen.length && 'onb-spot-soft-row')}>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                            <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--brand))]" checked={p.on} onChange={(e) => updatePlan(c, { on: e.target.checked, total: e.target.checked ? (p.total || 3) : p.total })} />
                            <span className="min-w-0"><span className="block truncate font-semibold">{c}</span><span className="text-xs text-ink-muted">Tersedia: {AVAIL.easy} easy · {AVAIL.medium} medium · {AVAIL.hard} hard</span></span>
                          </label>
                          {p.on && !p.custom && <Stepper value={p.total} min={0} max={30} label={`jumlah soal ${c}`} onChange={(n) => updatePlan(c, { total: n })} />}
                          {p.on && <button type="button" className="btn-ghost btn-sm" onClick={() => updatePlan(c, { custom: !p.custom })}><SlidersHorizontal size={15} /> {p.custom ? 'Bagi rata' : 'Atur komposisi'}</button>}
                        </div>
                        {p.on && (
                          <div className="mt-2 flex flex-wrap gap-2 pl-7">
                            {DIFFS.map((d) => (
                              <span key={d} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm ${DIFF_CLASS[d]}`}>
                                {DIFF[d]}
                                {p.custom ? <Stepper small value={p[d]} min={0} max={AVAIL[d]} label={`${DIFF[d]} ${c}`} onChange={(n) => updatePlan(c, { [d]: n })} /> : <b>{p[d]}</b>}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5"><ModeChoice name="tut-sim-mode" value={simMode} onChange={setSimMode} /></div>
                <div className="onb-dialog-foot">
                  <span className="mr-auto text-sm text-ink-muted">{chosen.length} BAB · <b className="text-ink">{simTotal} soal</b></span>
                  <button type="button" className={clsx('btn-primary btn-press', simTotal > 0 && 'onb-spot')} onClick={startSim} disabled={!simTotal}>Mulai simulasi</button>
                </div>
              </div>
            </Mock>
          )}

          {(step === 4 || step === 5) && question && (
            <Mock label="Sedang mengerjakan" className="onb-runner">
              <div className="onb-runner-bar">
                <span className="min-w-0 truncate font-semibold">{runnerTitle}</span>
                <span className="onb-chip">{simModeLabel}</span>
                <button type="button" className={clsx('btn-secondary btn-sm ml-auto', step === 5 && !exited && 'onb-spot')} onClick={() => { if (step === 5) setExited(true); }} disabled={step !== 5}>
                  <LogOut size={15} /> Keluar
                </button>
              </div>
              {exited ? (
                <div className="onb-saved" role="status">
                  <CheckCircle2 size={28} aria-hidden />
                  <p className="font-display text-lg font-bold">Progres tersimpan</p>
                  <p className="text-sm text-ink-muted">1 dari {simTotal || 1} soal sudah dijawab. Lanjutkan dari Riwayat kapan saja.</p>
                </div>
              ) : (
                <>
                  <QuestionView q={question} index={0} total={simTotal || 1} value={value} onChange={(v) => !checked && setValue(v)} revealed={checked} result={checked ? { correct, scored: true } : null} disabled={checked || step === 5} />
                  {simMode === 'exam' && checked && <p className="onb-mini-note mt-3">Di Mode Ujian, pembahasan baru muncul setelah sesi selesai. Di tutorial ini kami tampilkan langsung.</p>}
                  {step === 4 && !checked && (
                    <div className="question-actions mt-4 flex justify-end">
                      <button type="button" className={clsx('btn-primary btn-press', value && 'onb-spot')} disabled={!value} onClick={() => setChecked(true)}>Cek jawaban</button>
                    </div>
                  )}
                </>
              )}
            </Mock>
          )}

          {step === 6 && subject && (
            <Mock label="Riwayat">
              <p className="onb-eyebrow">Catatan belajarmu</p>
              <p className="onb-mock-h">Riwayat</p>
              <div className="ui-tabs onb-tabs" aria-hidden><span className="is-on">Semua</span><span>Simulasi</span><span>Paket</span><span>Latihan topik</span></div>
              <div className="card mt-4 divide-y divide-line overflow-hidden">
                <button type="button" onClick={() => setResumed(true)} className={clsx('onb-hist-row is-mine', !resumed && 'onb-spot-row')}>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block font-semibold">{runnerTitle}</span>
                    <span className="block text-xs text-ink-muted">Simulasi · {simModeLabel} · baru saja · {chosen.length || 1} BAB, {simTotal || 1} soal</span>
                  </span>
                  <span className="chip bg-gold-soft text-[#6b4f00]"><PlayCircle size={13} /> Lanjutkan</span>
                </button>
                <div className="onb-hist-row is-example">
                  <span className="min-w-0 flex-1"><span className="block font-semibold">{pkg?.name || 'Paket 100'}: {subject.name} <span className="onb-tag">contoh</span></span><span className="block text-xs text-ink-muted">Paket · Ujian · kemarin · 1 j 12 m</span></span>
                  <span className="text-right"><span className="block font-display text-xl font-bold text-brand">78</span><span className="block text-xs text-ink-muted">78/100 benar · +62 poin</span></span>
                </div>
                <div className="onb-hist-row is-example">
                  <span className="min-w-0 flex-1"><span className="block font-semibold">{bab || subject.chapters[0]} <span className="onb-tag">contoh</span></span><span className="block text-xs text-ink-muted">Latihan topik · Learning · 2 hari lalu · 14 m</span></span>
                  <span className="text-right"><span className="block font-display text-xl font-bold text-brand">90</span><span className="block text-xs text-ink-muted">9/10 benar · +12 poin</span></span>
                </div>
              </div>
              {resumed && (
                <div className="onb-dialog">
                  <p className="onb-dialog-title"><HistoryIcon size={18} aria-hidden /> Melanjutkan sesi</p>
                  <p className="text-sm text-ink-muted">Di aplikasi asli, sesi ini terbuka lagi tepat di soal berikutnya. Jawaban yang sudah ada tetap tersimpan.</p>
                  <p className="mt-3 flex items-start gap-2 text-sm"><TrendingUp size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden /><span>Progres per BAB dan mata kuliah ada di menu <b>Progres</b>.</span></p>
                </div>
              )}
            </Mock>
          )}

          {step === 7 && (
            <div className="onb-finish card-chunky tone-surface tone-sun">
              <p className="onb-mock-h">Yang sudah kamu coba</p>
              <ul className="onb-learned">
                <li><CheckCircle2 size={18} aria-hidden /> Memilih mata kuliah dan BAB</li>
                <li><CheckCircle2 size={18} aria-hidden /> Latihan per BAB, paket soal, dan simulasi</li>
                <li><CheckCircle2 size={18} aria-hidden /> Mengatur jumlah soal, komposisi, dan mode</li>
                <li><CheckCircle2 size={18} aria-hidden /> Menjawab soal dan membaca pembahasan</li>
                <li><CheckCircle2 size={18} aria-hidden /> Keluar di tengah sesi dan melanjutkan dari Riwayat</li>
              </ul>
              <div className="onb-finish-actions">
                <Link to="/mata-kuliah" className="btn-primary btn-press"><Layers size={17} /> Coba sungguhan</Link>
                {tutorialStatus(me, 'dokter') !== 'done' && <Link to="/simulasi-dokter?tutorial=1" className="btn-secondary">Coba tutorial simulasi dokter</Link>}
                <Link to="/beranda" className="btn-ghost">Ke Beranda</Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
