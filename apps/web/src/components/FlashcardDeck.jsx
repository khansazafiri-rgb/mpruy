// Tumpukan flashcard satu BAB: balik kartu, tandai "hafal" atau "belum hafal".
// Kartu yang belum hafal muncul lagi di akhir giliran; yang sudah hafal tersimpan di peramban per BAB.
import clsx from 'clsx';
import { Check, RotateCcw, Shuffle, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Html } from '@/components/RichContent';

const shuffled = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function useKnown(chapterKey) {
  const key = `medcoel.kartu.hafal.${chapterKey}`;
  const [known, setKnown] = useState({});
  useEffect(() => {
    try { setKnown(JSON.parse(localStorage.getItem(key) || '{}') || {}); } catch { setKnown({}); }
  }, [key]);
  const save = useCallback((next) => {
    setKnown(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* penyimpanan dimatikan */ }
  }, [key]);
  return [known, save];
}

export default function FlashcardDeck({ cards, chapterKey, finish }) {
  const [known, saveKnown] = useKnown(chapterKey);
  const [order, setOrder] = useState(() => shuffled(cards.map((c) => c.id)));
  const [flipped, setFlipped] = useState(false);
  const [round, setRound] = useState(0);          // naik tiap kartu dijawab; memicu animasi kartu baru
  const byId = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards]);
  const total = cards.length;
  const knownCount = cards.filter((c) => known[c.id]).length;
  // Antrean sesi: kartu yang belum hafal menurut urutan acak (yang "belum hafal" dipindah ke belakang).
  const queue = order.filter((id) => !known[id]);
  const current = byId[queue[0]];
  const done = total > 0 && knownCount >= total;

  const answer = useCallback((hafal) => {
    if (!current) return;
    if (hafal) saveKnown({ ...known, [current.id]: true });
    else setOrder((o) => [...o.filter((id) => id !== current.id), current.id]);
    setFlipped(false);
    setRound((r) => r + 1);
  }, [current, known, saveKnown]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select, [role=dialog]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); setFlipped((f) => !f); }
      else if (flipped && (e.key === 'ArrowRight' || e.key === '2')) answer(true);
      else if (flipped && (e.key === 'ArrowLeft' || e.key === '1')) answer(false);
      else if (!flipped && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) setFlipped(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, answer]);

  const restart = () => { saveKnown({}); setOrder(shuffled(cards.map((c) => c.id))); setFlipped(false); setRound((r) => r + 1); };
  const reshuffle = () => { setOrder(shuffled(cards.map((c) => c.id))); setFlipped(false); setRound((r) => r + 1); };

  if (done) return finish({ restart, total });
  if (!current) return null;
  const left = queue.length;

  return (
    <section className="fc" aria-label="Flashcard">
      <div className="fc-meter" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={knownCount} aria-label={`Sudah hafal ${knownCount} dari ${total} kartu`}>
        <span style={{ width: `${(knownCount / total) * 100}%` }} />
      </div>
      <div className="fc-stats">
        <p><b>{knownCount}</b> dari {total} kartu sudah hafal</p>
        <p className="fc-left">Tersisa {left}</p>
      </div>

      <div key={`${current.id}-${round}`} className={clsx('fc-stage', flipped && 'is-flipped')}>
        <button type="button" className="fc-card" onClick={() => setFlipped((f) => !f)} aria-pressed={flipped} aria-label={flipped ? 'Kartu menampilkan jawaban. Ketuk untuk melihat pertanyaan.' : 'Kartu menampilkan pertanyaan. Ketuk untuk melihat jawaban.'}>
          <span className="fc-face fc-front" aria-hidden={flipped}>
            {current.ctx && <span className="fc-ctx">{current.ctx}</span>}
            <Html as="span" text={current.front} marks className="fc-text" />
            <span className="fc-hint">Ketuk untuk melihat jawaban</span>
          </span>
          <span className="fc-face fc-back" aria-hidden={!flipped}>
            <span className="fc-ctx">{current.front.length > 70 ? `${current.front.slice(0, 68)}…` : current.front}</span>
            <Html as="span" text={current.back} marks className="fc-text is-back" />
          </span>
        </button>
      </div>

      <div className="fc-actions">
        {flipped ? (
          <>
            <button type="button" className="fc-btn is-no" onClick={() => answer(false)}><X size={18} aria-hidden /> Belum hafal</button>
            <button type="button" className="fc-btn is-yes" onClick={() => answer(true)}><Check size={18} aria-hidden /> Hafal</button>
          </>
        ) : (
          <button type="button" className="fc-btn is-flip" onClick={() => setFlipped(true)}>Lihat jawaban</button>
        )}
      </div>
      <p className="fc-keys" aria-hidden>Pintasan: <kbd>Spasi</kbd> balik kartu · <kbd>←</kbd> belum hafal · <kbd>→</kbd> hafal</p>

      <div className="fc-tools">
        <button type="button" onClick={reshuffle}><Shuffle size={14} aria-hidden /> Acak ulang</button>
        {knownCount > 0 && <button type="button" onClick={restart}><RotateCcw size={14} aria-hidden /> Mulai dari awal</button>}
      </div>
    </section>
  );
}
