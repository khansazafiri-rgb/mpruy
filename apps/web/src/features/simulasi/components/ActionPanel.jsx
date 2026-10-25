// Panel tindakan. Alurnya seperti bertanya sungguhan: pilih tahap, lalu
// "Mau tanya bagian apa?", lalu daftar pertanyaan/pemeriksaan di bagian itu.
import clsx from 'clsx';
import {
  Activity, ArrowLeft, Baby, Brain, Check, ClipboardList, Droplet, FlaskConical, HeartPulse, History, Home, ListChecks,
  MessageCircle, Microscope, Pill, ScanFace, ScanLine, Search, Stethoscope, TestTube, Timer, Users, X,
} from 'lucide-react';
import { useMemo } from 'react';
import { translate } from '@/i18n';
import { BYID, DX, PHASES, PHASE_NAME, POLI, areasFor, fmtClock, searchActions } from '../engine';

const ICON = {
  message: MessageCircle, list: ListChecks, baby: Baby, history: History, pill: Pill, users: Users, home: Home,
  'Pemeriksaan umum': Activity, 'Kepala dan leher': ScanFace, Toraks: HeartPulse, Abdomen: Stethoscope, 'Obstetri dan ginekologi': Baby, 'Ekstremitas dan saraf': Brain,
  'Darah rutin dan inflamasi': Droplet, 'Kimia darah': FlaskConical, 'Mikrobiologi dan serologi': Microscope, 'Urin dan tinja': TestTube, 'Pencitraan dan fungsi': ScanLine,
  'Suportif dan monitoring': Activity, Obat: Pill, 'Rencana dan komunikasi': ClipboardList,
};
const TONES = ['mint', 'sky', 'lilac', 'peach', 'sun', 'rose'];
const PROMPT = {
  anam: 'Mau tanya bagian apa?',
  fisik: 'Mau periksa bagian apa?',
  penunjang: 'Pemeriksaan apa yang kamu perlukan?',
  tata: 'Apa rencana penanganannya?',
};
// Dihitung saat dipakai karena daftar diagnosis bisa diganti dari server.
const dxSorted = () => Object.keys(DX).sort((a, b) => DX[a][0].localeCompare(DX[b][0], 'id'));

function ActionRow({ it, sim, showArea }) {
  const { s } = sim;
  const done = !!s.done[it.id];
  const noted = done ? s.log.find((e) => e.key === it.id)?.text : '';
  return (
    <li>
      <button type="button" className={clsx('sim-opt', done && 'is-done')} onClick={() => sim.pick(it)} disabled={s.finished}>
        <span className="sim-opt-main">
          {showArea && <small>{PHASE_NAME[it.tab]} · {it.sub}</small>}
          <span>{it.kind === 'pas' ? `“${it.label}”` : it.label}</span>
          {noted && <em>{noted}</em>}
        </span>
        <span className="sim-opt-mark" aria-label={done ? 'Sudah dilakukan' : undefined}>{done ? <Check size={16} /> : null}</span>
      </button>
    </li>
  );
}

export default function ActionPanel({ sim, ui, setUi, onFinish }) {
  const { s } = sim;
  const { ctx } = s;
  const areas = useMemo(() => (ui.phase === 'dx' ? [] : areasFor(ui.phase, ctx)), [ui.phase, ctx]);
  const counts = useMemo(() => {
    const c = {};
    s.actions.forEach((a) => { const tab = BYID[a.id]?.tab; if (tab) c[tab] = (c[tab] || 0) + 1; });
    return c;
  }, [s.actions]);
  const area = areas.find((a) => a.key === ui.area) || null;
  const sys = area?.systems ? (area.systems.find((x) => x.name === ui.sys) || null) : null;
  const results = ui.q ? searchActions(ui.q, ctx, 60, translate) : [];
  const setPhase = (phase) => setUi({ phase, area: null, sys: null, q: '' });

  const steps = [...PHASES, { key: 'dx', label: 'Diagnosis & selesai', short: 'Diagnosis' }];

  return (
    <section className="sim-panel" data-tour="panel" aria-label="Menu tindakan">
      <header className="sim-panel-head">
        <div>
          <p className="sim-panel-eyebrow">{POLI[ctx.poli]}</p>
          <p className="sim-panel-patient">{ctx.C.id}</p>
        </div>
        {s.mode === 'timer' && (
          <span className={clsx('sim-clock', s.t0 && s.left <= 60 && 'is-low')} role="timer" aria-label="Sisa waktu">
            <Timer size={15} aria-hidden /> {fmtClock(s.t0 ? s.left : s.dur)}
          </span>
        )}
      </header>

      <ol className="sim-steps" data-tour="phases">
        {steps.map((p, i) => (
          <li key={p.key}>
            <button type="button" aria-current={ui.phase === p.key ? 'step' : undefined} onClick={() => setPhase(p.key)} data-tour={p.key === 'dx' ? 'step-dx' : undefined}>
              <span className="sim-step-n">{p.key === 'dx' && s.dx ? <Check size={13} /> : i + 1}</span>
              <span className="sim-step-label">{p.short}</span>
              {p.key !== 'dx' && counts[p.key] > 0 && <span className="sim-step-count">{counts[p.key]}</span>}
            </button>
          </li>
        ))}
      </ol>

      {ui.phase === 'dx' ? (
        <DxStep sim={sim} onFinish={onFinish} />
      ) : (
        <div className="sim-phase">
          <label className="sim-search">
            <Search size={16} aria-hidden />
            <span className="sr-only">Cari tindakan</span>
            <input type="search" value={ui.q} onChange={(e) => setUi({ ...ui, q: e.target.value })} placeholder="Cari pertanyaan atau pemeriksaan" />
            {ui.q && <button type="button" onClick={() => setUi({ ...ui, q: '' })} aria-label="Hapus pencarian"><X size={15} /></button>}
          </label>

          {ui.q ? (
            results.length ? <ul className="sim-list">{results.map((it) => <ActionRow key={it.id} it={it} sim={sim} showArea />)}</ul>
              : <p className="sim-empty">Tidak ada tindakan yang cocok.</p>
          ) : !area ? (
            <div data-tour="areas">
              <h3 className="sim-prompt">{PROMPT[ui.phase]}</h3>
              <div className="sim-areas">
                {areas.map((a, i) => {
                  const Icon = ICON[a.icon] || ICON[a.key] || ClipboardList;
                  const n = a.items.filter((it) => s.done[it.id]).length;
                  return (
                    <button key={a.key} type="button" className={clsx('sim-area', `tone-${TONES[i % TONES.length]}`)} onClick={() => setUi({ ...ui, area: a.key, sys: a.systems ? a.systems[0].name : null })}>
                      <span className="sim-area-icon"><Icon size={19} aria-hidden /></span>
                      <span className="sim-area-text"><b>{a.label}</b>{a.desc && <small>{a.desc}</small>}</span>
                      <span className="sim-area-count">{n ? `${n}/` : ''}{a.items.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div data-tour="list">
              <div className="sim-list-head">
                <button type="button" className="sim-back" onClick={() => setUi({ ...ui, area: null, sys: null })}><ArrowLeft size={16} /> Semua bagian</button>
                <h3>{area.label}</h3>
              </div>
              {area.systems && (
                <div className="sim-sys" role="group" aria-label="Sistem organ">
                  {area.systems.map((x) => {
                    const n = x.items.filter((it) => s.done[it.id]).length;
                    return <button key={x.name} type="button" aria-pressed={ui.sys === x.name} onClick={() => setUi({ ...ui, sys: x.name })}>{x.name}{n > 0 && <span>{n}</span>}</button>;
                  })}
                </div>
              )}
              <ul className="sim-list">{(sys ? sys.items : area.items).map((it) => <ActionRow key={it.id} it={it} sim={sim} />)}</ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function DxStep({ sim, onFinish }) {
  const { s } = sim;
  const okToFinish = !!s.dx && !s.finished;
  return (
    <div className="sim-dx" data-tour="dx">
      <h3 className="sim-prompt">Apa diagnosis kerjamu?</h3>
      <p className="sim-dx-hint">Tetapkan diagnosis kerja dari temuan yang sudah kamu kumpulkan. Kamu masih bisa kembali ke tahap lain sebelum mengakhiri konsultasi.</p>
      <form className="sim-dx-form" onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get('dx'); if (v) sim.setDx(String(v)); }}>
        <label className="sr-only" htmlFor="sim-dx-sel">Diagnosis kerja</label>
        <select id="sim-dx-sel" name="dx" defaultValue={s.dx} disabled={s.finished} key={s.dx}>
          <option value="">Pilih diagnosis kerja…</option>
          {dxSorted().map((k) => <option key={k} value={k}>{DX[k][0]}</option>)}
        </select>
        <button type="submit" className="btn-secondary" disabled={s.finished}>{s.dx ? 'Ganti' : 'Tetapkan'}</button>
      </form>
      {s.dx && (
        <div className="sim-dx-set">
          <span>Diagnosis kerja</span>
          <b>{DX[s.dx][0]}</b>
          {s.ddx && <small>Diagnosis banding yang kamu pertimbangkan: {s.ddx.key ? DX[s.ddx.key][0] : 'tidak ada'}</small>}
        </div>
      )}
      <button type="button" className="btn-primary btn-press sim-finish" disabled={!okToFinish} onClick={() => onFinish()} data-tour="finish">
        {s.finished ? 'Konsultasi selesai' : 'Akhiri konsultasi'}
      </button>
      {!s.dx && !s.finished && <p className="sim-dx-hint">Tombol ini aktif setelah kamu menetapkan diagnosis kerja.</p>}
    </div>
  );
}
