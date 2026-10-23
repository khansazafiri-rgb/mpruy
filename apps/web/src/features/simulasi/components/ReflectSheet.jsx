// "Kenapa kamu menanyakan ini?" dan "Diagnosis banding apa yang perlu disingkirkan?"
// Lembar refleksi yang muncul sebelum tindakan spesifik dan setelah
// diagnosis kerja ditetapkan. Ditemani Nilo yang sedang berpikir.
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Mascot from '@/components/Mascot';
import { DX } from '../engine';

const WHY = { pas: 'Kenapa kamu menanyakan ini?', exam: 'Kenapa kamu memeriksa ini?', card: 'Kenapa kamu meminta pemeriksaan ini?', tata: 'Kenapa kamu melakukan ini?' };
const KIND = { pas: 'Kamu akan menanyakan', exam: 'Kamu akan memeriksa', card: 'Kamu akan meminta pemeriksaan', tata: 'Kamu akan melakukan' };

export default function ReflectSheet({ sim }) {
  const p = sim.s.pending;
  const box = useRef(null);
  useEffect(() => {
    if (!p) return undefined;
    const t = setTimeout(() => box.current?.querySelector('button')?.focus(), 30);
    const onKey = (e) => { if (e.key === 'Escape') { if (p.type === 'reason') sim.cancelPending(); else sim.answerDdx(''); } };
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); };
  }, [p, sim]);
  if (!p) return null;

  const isReason = p.type === 'reason';
  const it = p.it;
  const verb = isReason && it.kind === 'tata' ? 'Menangani dugaan ' : 'Menilai kemungkinan ';
  const opts = isReason ? p.rs.opts : p.opts;
  const choose = (k) => (isReason ? sim.answerReason(k) : sim.answerDdx(k));
  const close = () => (isReason ? sim.cancelPending() : sim.answerDdx(''));

  // Lewat portal: .app-content beranimasi transform, jadi elemen fixed di dalamnya ikut terkurung.
  return createPortal(
    <div className="sim-sheet-wrap" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="sim-sheet" role="dialog" aria-modal="true" aria-labelledby="sim-sheet-title" ref={box} data-tour="reason">
        <div className="sim-sheet-top">
          <Mascot name="nilo" mood="think" size={78} label="Nilo sedang berpikir" />
          <div className="min-w-0">
            {isReason ? (
              <>
                <p className="sim-sheet-kind">{KIND[it.kind]}</p>
                <p className="sim-sheet-what">{it.kind === 'pas' ? `“${it.ask}”` : it.label}</p>
              </>
            ) : (
              <>
                <p className="sim-sheet-kind">Diagnosis kerjamu</p>
                <p className="sim-sheet-what">{DX[sim.s.dx][0]}</p>
              </>
            )}
          </div>
        </div>
        <h3 id="sim-sheet-title">{isReason ? WHY[it.kind] : 'Diagnosis banding apa yang masih perlu kamu singkirkan?'}</h3>
        <p className="sim-sheet-sub">{isReason ? 'Pilih dugaan yang ingin kamu nilai lewat tindakan ini. Alasanmu ikut dinilai di laporan.' : 'Dokter yang baik tetap memikirkan kemungkinan lain. Pilihanmu dibahas di laporan dan tidak mengurangi skor.'}</p>
        <div className="sim-sheet-opts">
          {opts.map((k) => <button key={k} type="button" onClick={() => choose(k)}>{isReason ? verb : ''}{DX[k][0]}</button>)}
          <button type="button" className="is-none" onClick={() => choose('')}>{isReason ? 'Tidak ada dugaan khusus' : 'Tidak ada'}</button>
        </div>
        {isReason && <div className="sim-sheet-foot"><button type="button" className="btn-ghost btn-sm" onClick={close}>Batal</button></div>}
      </div>
    </div>,
    document.body,
  );
}
