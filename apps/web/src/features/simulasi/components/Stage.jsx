// Panggung visual novel: latar poli, pasien, suster, dokter, kartu hasil, dan
// kotak dialog. Pembicara maju dan terang; yang lain mundur dan redup.
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { asset, doctorSprite, patientName } from '../engine';
import { translate } from '@/i18n';

function plateFor(w, ctx) {
  if (w === 'pas') return patientName(ctx.C);
  if (w === 'sus') return 'Suster Ani';
  if (w === 'dok') return 'Dokter (kamu)';
  return 'Temuan pemeriksaan';
}

export default function Stage({ sim, gender }) {
  const { s, text, atEnd, line } = sim;
  const localizedLine = sim.translateClinical ? sim.translateClinical(line?.t || '', line) : translate(line?.t || '');
  const visibleText = s.typing ? localizedLine.slice(0, Math.round(localizedLine.length * text.length / Math.max(1, line?.t.length || 1))) : localizedLine;
  const { ctx } = s;
  const doc = doctorSprite(ctx, gender);
  const speaker = s.speaker;
  const state = (k) => (!speaker || speaker === 'info' ? 'mid' : speaker === k ? 'on' : 'off');
  const [flash, setFlash] = useState(false);
  const seen = useRef(s.seq);
  useEffect(() => {
    if (s.seq === seen.current) return undefined;
    seen.current = s.seq;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1800);
    return () => clearTimeout(t);
  }, [s.seq]);

  const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sim.advance(); } };
  const hint = s.typing ? 'Ketuk untuk menampilkan semua' : atEnd ? (s.finished ? 'Konsultasi selesai' : 'Pilih tindakan di panel') : 'Ketuk untuk lanjut';

  return (
    <div className="sim-frame" data-tour="stage">
      <div className="sim-stage" key={ctx.poli}>
        <img className="sim-bg" src={asset(`BG_${ctx.poli}`)} alt="" />
        <img className="sim-char" data-slot="pas" data-state={state('pas')} src={asset(`PAS_${ctx.C.pas}_${s.pasExpr}`)} alt={`Pasien, ${patientName(ctx.C)}`} />
        <img className="sim-char" data-slot="sus" data-state={state('sus')} src={asset(`SUS_${s.susExpr}`)} alt="Suster Ani" />
        {doc && <img className="sim-char" data-slot="dok" data-state={state('dok')} src={asset(doc)} alt="Dokter, kamu" />}
        {s.card && (
          <div className="sim-card" role="group" aria-label={s.card.title}>
            <h3>{s.card.title}<span>{s.card.sub}</span></h3>
            <dl>{s.card.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          </div>
        )}
      </div>
      <div
        className="sim-dialog"
        role="button"
        tabIndex={0}
        aria-label="Lanjutkan dialog"
        onClick={sim.advance}
        onKeyDown={onKey}
        data-tour="dialog"
      >
        {line && <span className={clsx('sim-plate', `is-${line.w}`)}>{plateFor(line.w, ctx)}</span>}
        <p className={clsx(line?.w === 'info' && 'is-info')} aria-live="polite">{visibleText}</p>
        <div className="sim-dialog-foot">
          <span className={clsx('sim-autonote', flash && 'is-on')}><Check size={14} aria-hidden /> Masuk catatan otomatis</span>
          <span className={clsx('sim-next', !atEnd && !s.typing && 'is-nudge')}>{hint} {!atEnd && '▸'}</span>
        </div>
      </div>
    </div>
  );
}
