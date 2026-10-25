// Status satu konsultasi Simulasi Dokter. Logika diporting dari prototipe v3:
// dialog diketik per baris, tindakan dicatat saat jawaban muncul, catatan SOAP
// terisi otomatis, waktu berjalan sejak tindakan pertama.
import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  DX, actionLines, caseCtx, ddxOptions, judgeDdx, judgeReason, needsReason, reasonFeedback, reasonSet, rel, score, secOf,
} from './engine';

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function fresh(caseKey, mode, dur) {
  const ctx = caseCtx(caseKey);
  return {
    ctx, mode, dur,
    done: {}, actions: [], reasons: {}, wrongTries: {}, log: [], newKey: '',
    dx: '', ddx: null, finished: false, timeout: false, t0: 0, t1: 0, deadline: 0, left: dur,
    queue: [], qi: -1, typed: 0, typing: false, commit: null, commitIdx: -1,
    pasExpr: ctx.C.expr, susExpr: 'netral', speaker: '', card: null,
    pending: null, // { type: 'reason', it, rs, wrong: [kunci salah], feedback } | { type: 'ddx', opts }
    seq: 0, // bertambah setiap ada catatan baru (untuk efek sorot)
  };
}

export function useSim(caseKey, mode = 'santai', dur = 600) {
  const S = useRef(null);
  const [, force] = useReducer((x) => x + 1, 0);
  const typeT = useRef(0);
  const clockT = useRef(0);
  if (!S.current) S.current = fresh(caseKey, mode, dur);

  const stopTimers = () => { clearInterval(typeT.current); clearInterval(clockT.current); };

  const runCommit = () => { const f = S.current.commit; S.current.commit = null; S.current.commitIdx = -1; if (f) f(); };

  const showLine = (idx) => {
    const s = S.current;
    const line = s.queue[idx];
    s.qi = idx;
    if (line.w === 'pas' && line.e) s.pasExpr = line.e;
    if (line.w === 'sus') s.susExpr = line.e || 'netral';
    s.speaker = line.w;
    s.card = line.card || null;
    if (idx === s.commitIdx) runCommit();
    clearInterval(typeT.current);
    if (reduceMotion()) { s.typed = line.t.length; s.typing = false; force(); return; }
    s.typed = 0; s.typing = true; force();
    typeT.current = setInterval(() => {
      const cur = S.current;
      cur.typed += 2;
      if (cur.typed >= line.t.length) { cur.typed = line.t.length; cur.typing = false; clearInterval(typeT.current); }
      force();
    }, 22);
  };

  const play = (lines, commitIdx = -1, commitFn = null) => {
    runCommit(); // tindakan sebelumnya yang terpotong tetap tercatat
    const s = S.current;
    s.queue = lines; s.commit = commitFn; s.commitIdx = commitFn ? commitIdx : -1;
    showLine(0);
  };

  const finish = useCallback((timeout = false) => {
    const s = S.current;
    if (s.finished) return;
    s.pending = null;
    runCommit();
    s.finished = true; s.timeout = !!timeout; s.t1 = Date.now(); clearInterval(clockT.current);
    play([{ w: 'info', t: timeout ? 'Waktu habis. Konsultasi diakhiri otomatis. Lihat laporanmu di bawah.' : 'Konsultasi selesai. Lihat laporan penilaianmu di bawah.' }]);
    force();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startClock = () => {
    const s = S.current;
    if (s.t0) return;
    s.t0 = Date.now();
    if (s.mode === 'timer') {
      s.deadline = s.t0 + s.dur * 1000;
      clearInterval(clockT.current);
      clockT.current = setInterval(() => {
        const cur = S.current;
        cur.left = Math.max(0, Math.round((cur.deadline - Date.now()) / 1000));
        if (cur.left <= 0) finish(true); else force();
      }, 250);
    }
  };

  const addLog = (key, sec, text) => {
    const s = S.current;
    if (s.log.some((e) => e.key === key)) return;
    s.log = [...s.log, { key, sec, text }];
    s.newKey = key; s.seq += 1;
  };

  const doAction = (it) => {
    const s = S.current;
    startClock();
    const { lines, note, na } = actionLines(it, s.ctx);
    play(lines.map((line, index) => ({ ...line, translationAction: na ? undefined : it.id, translationRole: index })), 1, () => {
      const cur = S.current;
      const first = !cur.done[it.id];
      cur.done = { ...cur.done, [it.id]: true };
      if (first) cur.actions = [...cur.actions, { id: it.id, rel: rel(it, cur.ctx), reason: cur.reasons[it.id] || null }];
      if (!na) addLog(it.id, secOf(it), note);
    });
  };

  /** Pilih tindakan. Tindakan spesifik meminta alasan dulu (sekali per tindakan). */
  const pick = (it) => {
    const s = S.current;
    if (s.finished || !it) return;
    if (!s.reasons[it.id] && needsReason(it, s.ctx) && !s.done[it.id]) {
      s.pending = { type: 'reason', it, rs: reasonSet(it, s.ctx), wrong: [], feedback: '' };
      force();
      return;
    }
    doAction(it);
  };

  /**
   * Menjawab "kenapa kamu melakukan ini?". Alasan yang tepat membuka tindakannya; alasan yang
   * belum tepat tidak melakukan tindakan, mencatat percobaan yang salah, dan meminta memilih lagi.
   */
  const answerReason = (key) => {
    const s = S.current;
    const p = s.pending;
    if (!p || p.type !== 'reason') return;
    const j = judgeReason(p.rs, key);
    if (!j.ok) {
      s.wrongTries = { ...s.wrongTries, [p.it.id]: (s.wrongTries[p.it.id] || 0) + 1 };
      s.pending = { ...p, wrong: [...p.wrong, key || ''], feedback: reasonFeedback(p.it, p.rs, key) };
      force();
      return;
    }
    s.reasons = { ...s.reasons, [p.it.id]: { ...j, tries: (s.wrongTries[p.it.id] || 0) + 1 } };
    s.pending = null;
    doAction(p.it);
  };

  const cancelPending = () => { S.current.pending = null; force(); };

  const advance = () => {
    const s = S.current;
    if (!s.queue.length || s.qi < 0) return;
    if (s.typing) { clearInterval(typeT.current); s.typed = s.queue[s.qi].t.length; s.typing = false; force(); return; }
    if (s.qi < s.queue.length - 1) showLine(s.qi + 1);
  };

  /** Tetapkan diagnosis kerja, lalu tanyakan diagnosis banding yang perlu disingkirkan. */
  const setDx = (key) => {
    const s = S.current;
    if (s.finished || !key) return;
    startClock();
    s.dx = key;
    s.ddx = null;
    s.log = s.log.filter((e) => e.key !== 'dx');
    addLog('dx', 'A', `Diagnosis kerja: ${DX[key][0]}`);
    s.pending = { type: 'ddx', opts: ddxOptions(s.ctx, key) };
    play([{ w: 'info', t: 'Diagnosis kerja dicatat. Kamu masih bisa melengkapi pemeriksaan atau tatalaksana sebelum mengakhiri konsultasi.' }]);
  };

  const answerDdx = (key) => {
    const s = S.current;
    s.ddx = judgeDdx(s.ctx, s.dx, key);
    s.pending = null;
    force();
  };

  const restart = useCallback((nextCase = caseKey, nextMode = mode, nextDur = dur) => {
    stopTimers();
    S.current = fresh(nextCase, nextMode, nextDur);
    play(S.current.ctx.C.intro.map((line, index) => ({ ...line, translationIntro: index })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseKey, mode, dur]);

  useEffect(() => {
    restart(caseKey, mode, dur);
    return stopTimers;
  }, [caseKey, mode, dur, restart]);

  const s = S.current;
  return {
    s,
    line: s.queue[s.qi] || null,
    text: s.queue[s.qi] ? s.queue[s.qi].t.slice(0, s.typed) : '',
    atEnd: !s.typing && s.qi >= s.queue.length - 1,
    usedSec: s.t0 ? Math.round(((s.t1 || Date.now()) - s.t0) / 1000) : 0,
    report: s.finished ? score({ ctx: s.ctx, done: s.done, actions: s.actions, dx: s.dx }) : null,
    pick, answerReason, cancelPending, advance, setDx, answerDdx, finish, restart,
  };
}
