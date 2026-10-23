// SIMULASI JADI DOKTER: konsultasi gaya visual novel dengan pasien virtual.
// Pasien dipilih sistem secara acak (tanpa pilihan karakter atau poli).
// /simulasi-dokter?tutorial=1 menjalankan tutorial bersama Nilo dengan kasus tetap.
import { ArrowLeft, Home as HomeIcon, UserRoundPlus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import ActionPanel from '@/features/simulasi/components/ActionPanel';
import Notes from '@/features/simulasi/components/Notes';
import ReflectSheet from '@/features/simulasi/components/ReflectSheet';
import Report from '@/features/simulasi/components/Report';
import Stage from '@/features/simulasi/components/Stage';
import StartScreen from '@/features/simulasi/components/StartScreen';
import TutorialCoach, { TOUR } from '@/features/simulasi/components/TutorialCoach';
import { CASES, asset, caseSprites, pickCase } from '@/features/simulasi/engine';
import { useSimContent } from '@/features/simulasi/content';
import { PageLoader } from '@/components/ui';
import { useSim } from '@/features/simulasi/useSim';
import { api } from '@/lib/api';
import { markTutorial } from '@/lib/tutorial';
import '@/styles/simulasi.css';

const PREFS = 'medcoel-sim-prefs';
const LAST = 'medcoel-sim-last';
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* penyimpanan perangkat tidak tersedia */ } };
const DEFAULT_PREFS = { mode: 'santai', dur: 600, gender: 'L' };

function Consultation({ caseKey, prefs, tutorial, onNext, onExit }) {
  const mode = tutorial ? 'santai' : prefs.mode;
  const sim = useSim(caseKey, mode, prefs.dur);
  const { s } = sim;
  const { refresh, me } = useAuth();
  const nav = useNavigate();
  const [ui, setUi] = useState({ phase: 'anam', area: null, sys: null, q: '' });
  const [saved, setSaved] = useState('');
  const [step, setStep] = useState(0);
  const savedRound = useRef(null);
  const reportRef = useRef(null);
  const marked = useRef(false);

  // Muat gambar kasus ini saja.
  useEffect(() => { caseSprites(s.ctx, prefs.gender).forEach((n) => { const i = new Image(); i.src = asset(n); }); }, [s.ctx, prefs.gender]);

  // Simpan hasil sekali per konsultasi (tutorial tidak disimpan).
  useEffect(() => {
    if (!s.finished || tutorial || savedRound.current === s) return;
    savedRound.current = s;
    const R = sim.report;
    setSaved('saving');
    api('doctor-sim/results', {
      method: 'POST',
      body: { caseKey, dxKey: s.dx, score: R.total, durationSec: sim.usedSec, mode: s.mode, timeout: s.timeout, actionsCount: s.actions.length, keyDone: R.keyDone.length, keyTotal: R.keyAll.length },
    }).then((r) => { setSaved('ok'); write(LAST, { caseKey, score: r.result.score, caseTitle: r.result.caseTitle }); }).catch(() => setSaved('error'));
  }, [s.finished, s, tutorial, caseKey, sim.report, sim.usedSec]);

  useEffect(() => {
    if (s.finished) setTimeout(() => reportRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 120);
  }, [s.finished]);

  // Tutorial: buka tahap diagnosis saat langkahnya tiba, tandai selesai di akhir.
  const tourId = TOUR[step]?.id;
  useEffect(() => { if (tutorial && tourId === 'dx') setUi((u) => ({ ...u, phase: 'dx', area: null, q: '' })); }, [tutorial, tourId]);
  const finishedTour = tutorial && step >= TOUR.length;
  useEffect(() => {
    if (!finishedTour || marked.current) return;
    marked.current = true;
    markTutorial('dokter', 'done').then(() => refresh()).catch(() => {});
  }, [finishedTour, refresh]);
  const skip = useCallback(async () => {
    if (me?.tutorials?.dokter !== 'done') { try { await markTutorial('dokter', 'skipped'); await refresh(); } catch { /* tetap keluar */ } }
    nav('/beranda');
  }, [me, nav, refresh]);

  const retry = () => { sim.restart(); setSaved(''); setUi({ phase: 'anam', area: null, sys: null, q: '' }); window.scrollTo({ top: 0 }); };

  return (
    <div className="sim-page">
      <div className="sim-topbar">
        <button type="button" className="btn-ghost btn-sm" onClick={tutorial ? skip : onExit}><ArrowLeft size={16} /> {tutorial ? 'Keluar tutorial' : 'Ganti pasien'}</button>
        <p className="sim-topbar-title">Simulasi jadi dokter{tutorial && <span className="sim-tag">Tutorial</span>}</p>
      </div>
      <div className="sim-layout">
        <div className="sim-main">
          <Stage sim={sim} gender={prefs.gender} />
          <Notes sim={sim} />
        </div>
        <ActionPanel sim={sim} ui={ui} setUi={setUi} onFinish={() => sim.finish(false)} />
      </div>
      {s.finished && sim.report && (
        <Report ref={reportRef} sim={sim} saved={saved} tutorial={tutorial} onRetry={retry} onNext={tutorial ? () => nav('/simulasi-dokter') : () => { setSaved(''); onNext(); }} />
      )}
      <ReflectSheet sim={sim} />
      {tutorial && (
        <TutorialCoach
          step={step}
          setStep={(n) => setStep(Math.max(0, n))}
          sim={sim}
          ui={ui}
          onSkip={skip}
          finished={finishedTour}
          onDone={(
            <>
              <button type="button" className="btn-primary btn-press" onClick={() => nav('/simulasi-dokter')}><UserRoundPlus size={17} /> Mulai pasien sungguhan</button>
              <button type="button" className="btn-secondary" onClick={() => nav('/beranda')}><HomeIcon size={17} /> Kembali ke beranda</button>
            </>
          )}
        />
      )}
    </div>
  );
}

export default function SimulasiDokter() {
  const { me } = useAuth();
  const [params] = useSearchParams();
  const ready = useSimContent(me?.role === 'admin' && !!params.get('kasus'));
  if (!ready) return <PageLoader />;
  return <SimulasiDokterReady />;
}

function SimulasiDokterReady() {
  const [params] = useSearchParams();
  const tutorial = params.get('tutorial') === '1';
  const { me } = useAuth();
  // Untuk admin (mencoba kasus dari dashboard) dan pengujian lokal: ?kasus=kode memaksa satu kasus.
  // Pemain biasa tidak punya pemilih kasus.
  const want = params.get('kasus');
  const forced = (import.meta.env.DEV || me?.role === 'admin') && want && CASES[want] && !CASES[want].nodoc ? want : '';
  const [prefs, setPrefsState] = useState(() => ({ ...DEFAULT_PREFS, ...read(PREFS, {}) }));
  const [caseKey, setCaseKey] = useState(tutorial ? 'umum' : forced);
  const [round, setRound] = useState(0);
  const setPrefs = (p) => { setPrefsState(p); write(PREFS, p); };

  useEffect(() => { setCaseKey(tutorial ? 'umum' : forced); setRound((r) => r + 1); }, [tutorial, forced]);

  const start = () => {
    const prev = read(LAST, {})?.caseKey || '';
    const next = forced || pickCase(prev);
    write(LAST, { ...read(LAST, {}), caseKey: next });
    setCaseKey(next);
    setRound((r) => r + 1);
    window.scrollTo({ top: 0 });
  };

  if (!caseKey) {
    const last = read(LAST, null);
    return <StartScreen prefs={prefs} setPrefs={setPrefs} onStart={start} lastResult={last?.score !== undefined && CASES[last.caseKey] ? last : null} />;
  }
  return (
    <Consultation
      key={`${round}-${caseKey}`}
      caseKey={caseKey}
      prefs={prefs}
      tutorial={tutorial}
      onNext={start}
      onExit={() => setCaseKey('')}
    />
  );
}

