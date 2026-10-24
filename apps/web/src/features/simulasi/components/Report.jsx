// Laporan setelah konsultasi: skor, diagnosis, tindakan berurutan dengan
// penilaian dan umpan balik alasan, serta hal penting yang terlewat.
import clsx from 'clsx';
import { CheckCircle2, CircleAlert, Loader2, Save, RotateCcw, UserRoundPlus, XCircle } from 'lucide-react';
import { forwardRef } from 'react';
import Mascot from '@/components/Mascot';
import { BYID, DX, PHASES, PHASE_NAME, RATE, fmtClock, reasonText, whyText } from '../engine';

function Ring({ value }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg className="sim-ring" viewBox="0 0 128 128" role="img" aria-label={`Skor ${value} dari 100`}>
      <circle cx="64" cy="64" r={r} className="sim-ring-track" />
      <circle cx="64" cy="64" r={r} className="sim-ring-val" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      <text x="64" y="62" textAnchor="middle" className="sim-ring-num">{value}</text>
      <text x="64" y="84" textAnchor="middle" className="sim-ring-sub">dari 100</text>
    </svg>
  );
}

const Report = forwardRef(function Report({ sim, saved, onNext, onRetry, tutorial }, ref) {
  const { s, report: R, usedSec } = sim;
  const { C } = s.ctx;
  const dxName = s.dx ? DX[s.dx][0] : 'belum ditetapkan';
  const verdict = R.okDx ? 'ok' : R.nearDx ? 'mid' : 'no';
  const mood = R.total >= 75 ? 'cheer' : R.total >= 45 ? 'happy' : 'think';

  return (
    <section className="sim-report" ref={ref} tabIndex={-1} aria-labelledby="sim-report-title" data-tour="report">
      <div className="sim-report-hero surface-forest">
        <Ring value={R.total} />
        <div className="min-w-0 flex-1">
          <p className="sim-report-eyebrow">Laporan konsultasi{s.timeout ? ' · waktu habis' : ''}</p>
          <h2 id="sim-report-title">{C.id}</h2>
          <p className={clsx('sim-verdict', `is-${verdict}`)}>
            {R.okDx ? <CheckCircle2 size={18} aria-hidden /> : R.nearDx ? <CircleAlert size={18} aria-hidden /> : <XCircle size={18} aria-hidden />}
            <span>Diagnosis kerjamu: <b>{dxName}</b>. {R.okDx ? 'Tepat.' : R.nearDx ? `Masih masuk akal sebagai diagnosis banding, tetapi yang paling sesuai adalah ${DX[C.dxOk][0]}.` : `Belum tepat. Diagnosis yang paling sesuai: ${DX[C.dxOk][0]}.`}</span>
          </p>
        </div>
        <Mascot name={R.total >= 45 ? 'kila' : 'nilo'} mood={mood} size={96} className="sim-report-mascot" />
      </div>

      <div className="sim-stats">
        <div className="tone-mint"><b>{R.keyDone.length}/{R.keyAll.length}</b><span>hal penting dilakukan</span></div>
        <div className="tone-sky"><b>{R.reasonOk}/{R.asked}</b><span>alasan tepat di percobaan pertama{R.reasonLate ? `, ${R.reasonLate} setelah mencoba lagi` : ''}</span></div>
        <div className="tone-sun"><b>{R.cnt.L}</b><span>tindakan kurang perlu</span></div>
        <div className="tone-rose"><b>{R.cnt.T + R.cnt.B}</b><span>tidak tepat atau berisiko</span></div>
        <div className="tone-lilac"><b>{s.t0 ? fmtClock(usedSec) : '-'}</b><span>lama konsultasi</span></div>
      </div>
      <p className="sim-ref">Rincian skor: diagnosis {R.parts.dx}/30, hal penting {R.parts.key}/40, alasan {R.parts.reason}/20, efisiensi {R.parts.eff}/10. Skor ini gambaran untuk latihan, bukan penilaian resmi.</p>

      {s.ddx && (
        <div className={clsx('sim-reflect', s.ddx.ok ? 'is-ok' : 'is-no')}>
          <b>Diagnosis banding yang kamu pikirkan: {s.ddx.key ? DX[s.ddx.key][0] : 'tidak ada'}.</b>{' '}
          {s.ddx.ok ? 'Bagus, ini memang perlu disingkirkan pada kasus ini.' : `Pada kasus ini, yang lebih perlu disingkirkan antara lain ${C.ddx.filter((k) => k !== s.dx).slice(0, 3).map((k) => DX[k][0]).join(', ')}.`}
        </div>
      )}

      <h3 className="sim-report-h">Tindakanmu, berurutan</h3>
      {!s.actions.length ? <p className="sim-empty">Kamu belum melakukan tindakan apa pun.</p> : (
        <ol className="sim-acts">
          {s.actions.map((a, i) => {
            const it = BYID[a.id];
            const rt = a.reason ? reasonText(it, a.reason) : null;
            return (
              <li key={a.id}>
                <div className="sim-act-top">
                  <span className="sim-act-n">{i + 1}</span>
                  <div className="min-w-0 flex-1"><b>{it.label}</b><small>{PHASE_NAME[it.tab]} · {it.sub}</small></div>
                  <span className={clsx('sim-badge', `is-${a.rel}`)}>{RATE[a.rel]}</span>
                </div>
                {rt && <p className={clsx('sim-act-rs', rt.ok ? 'is-ok' : 'is-no')}>{rt.ok ? '✓' : '✗'} {rt.t}</p>}
                <p className="sim-act-why">{whyText(it, a.rel)}</p>
              </li>
            );
          })}
        </ol>
      )}

      <h3 className="sim-report-h">Hal penting yang belum kamu lakukan{R.missed.length ? ` (${R.missed.length})` : ''}</h3>
      {!R.missed.length ? <p className="sim-empty">Semua hal penting sudah kamu lakukan. Mantap.</p> : (
        <div className="sim-miss-groups">
          {PHASES.map((ph) => {
            const ids = R.missed.filter((id) => BYID[id].tab === ph.key);
            if (!ids.length) return null;
            return (
              <details key={ph.key} className="sim-miss-group" open={ids.length <= 4}>
                <summary><b>{ph.label}</b><span>{ids.length} terlewat</span></summary>
                <ul className="sim-miss">
                  {ids.map((id) => { const it = BYID[id]; return <li key={id}><b>{it.kind === 'pas' ? `“${it.label}”` : it.label}</b><small>{it.why}</small></li>; })}
                </ul>
              </details>
            );
          })}
        </div>
      )}
      {C.ref && <p className="sim-ref">{C.ref}</p>}

      <div className="sim-report-foot">
        {!tutorial && (
          <span className="sim-saved" role="status">
            {saved === 'saving' && <><Loader2 size={15} className="animate-spin" /> Menyimpan ke riwayat…</>}
            {saved === 'ok' && <><Save size={15} /> Tersimpan di Riwayat</>}
            {saved === 'error' && <>Hasil belum tersimpan. Periksa koneksi lalu coba pasien berikutnya.</>}
          </span>
        )}
        <div className="sim-report-btns">
          <button type="button" className="btn-secondary" onClick={onRetry}><RotateCcw size={17} /> Ulangi kasus ini</button>
          <button type="button" className="btn-primary btn-press" onClick={onNext}><UserRoundPlus size={17} /> Pasien berikutnya</button>
        </div>
      </div>
    </section>
  );
});

export default Report;
