// Catatan dokter: SOAP terisi otomatis dari tindakan, ditambah catatan bebas
// milik pemain (tersimpan di perangkat ini).
import clsx from 'clsx';
import { ChevronDown, NotebookPen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const SEC = [['S', 'Subjektif', 'Jawaban pasien'], ['O', 'Objektif', 'Pemeriksaan dan penunjang'], ['A', 'Asesmen', 'Diagnosis kerja'], ['P', 'Planning', 'Tatalaksana']];
const KEY = 'medcoel-sim-notes-';

export default function Notes({ sim }) {
  const { s } = sim;
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1024);
  const [own, setOwn] = useState('');
  const [glow, setGlow] = useState(false);
  const area = useRef(null);
  const seen = useRef(s.seq);
  const poli = s.ctx.poli;

  useEffect(() => { try { setOwn(localStorage.getItem(KEY + poli) || ''); } catch { setOwn(''); } }, [poli]);
  useEffect(() => {
    if (s.seq === seen.current) return undefined;
    seen.current = s.seq;
    setGlow(true);
    const t = setTimeout(() => setGlow(false), 2600);
    return () => clearTimeout(t);
  }, [s.seq]);

  const save = (v) => { setOwn(v); try { localStorage.setItem(KEY + poli, v); } catch { /* penyimpanan perangkat tidak tersedia */ } };
  const insert = (h) => {
    const v = own && !/\n$/.test(own) ? `${own}\n${h}` : `${own}${h}`;
    save(v);
    requestAnimationFrame(() => { const t = area.current; if (t) { t.focus(); t.setSelectionRange(v.length, v.length); } });
  };

  return (
    <section className={clsx('sim-notes', glow && 'is-glow')} data-tour="notes" aria-labelledby="sim-notes-title">
      <button type="button" className="sim-notes-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <NotebookPen size={18} aria-hidden />
        <span id="sim-notes-title">Catatan dokter</span>
        <span className="sim-notes-count">{s.log.length} catatan</span>
        <span className={clsx('sim-notes-badge', glow && 'is-on')} aria-hidden>Data baru</span>
        <ChevronDown size={18} className={clsx('ml-auto transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="sim-notes-body">
          <div className="sim-soap">
            {SEC.map(([k, name, hint]) => {
              const items = s.log.filter((e) => e.sec === k);
              const hot = items.some((e) => e.key === s.newKey) && glow;
              return (
                <div key={k} className={clsx('sim-soap-sec', hot && 'is-hot')}>
                  <h4><i>{k}</i>{name}<small>{hint}</small></h4>
                  {items.length ? (
                    <ul>{items.map((e) => <li key={e.key} className={clsx(e.key === s.newKey && glow && 'is-new')}>{e.text}</li>)}</ul>
                  ) : <p className="sim-soap-empty">Belum ada</p>}
                </div>
              );
            })}
          </div>
          <div className="sim-own">
            <div className="sim-own-head">
              <span>Catatan tambahan</span>
              <div role="group" aria-label="Sisipkan judul SOAP">{['S', 'O', 'A', 'P'].map((h) => <button key={h} type="button" onClick={() => insert(`${h}: `)}>{h}</button>)}</div>
            </div>
            <textarea ref={area} value={own} onChange={(e) => save(e.target.value)} placeholder="Tulis catatanmu sendiri, misalnya diagnosis banding atau rencana lanjutan." aria-label="Catatan tambahan" />
          </div>
        </div>
      )}
    </section>
  );
}
