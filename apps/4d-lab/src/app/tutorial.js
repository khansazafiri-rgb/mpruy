// Mascot-led, learn-by-doing tutorial engine.
//
// A step can carry a TASK. The tutorial then waits until the learner has really used the real control (the task's `done()`
// is checked against the live state, never a click on "Lanjut"), shows what happened, and only then lets them continue.
// Mascots follow the roles written in apps/web/src/mascots/index.js:
//   Kori (curiosity, first steps)  guides every step
//   Kila (the moment of understanding) celebrates a completed task
//   Nilo (trying again)            appears with a hint when the learner is stuck
// The page below stays fully usable (the overlay never blocks pointer events outside its card), so the learner touches the
// real thing. "Lewati langkah" and "Lewati" are always available: nobody is trapped.
import kori from '../../../web/src/mascots/kori.svg?raw';
import kila from '../../../web/src/mascots/kila.svg?raw';
import nilo from '../../../web/src/mascots/nilo.svg?raw';
import '../../../web/src/styles/mascot.css';

const SVG = { kori, kila, nilo };
const NAMES = { kori: 'Kori', kila: 'Kila', nilo: 'Nilo' };
const POLL_MS = 120;
const HINT_AFTER_MS = 12000;

/** A MEDCOEL mascot (static SVG files from the repo, never user input), expression chosen by a mood-* class. */
export function mascotEl(name, mood = 'idle', size = 64) {
  const span = document.createElement('span');
  span.className = `mc-character mood-${mood}`;
  span.style.width = span.style.height = size + 'px';
  span.setAttribute('role', 'img');
  span.setAttribute('aria-label', `${NAMES[name] || 'Kori'}, maskot MEDCOEL`);
  span.innerHTML = SVG[name] || SVG.kori;
  return span;
}

/**
 * steps: [{ target, pane?, mascot?, mood?, title, text, next?, task?: { text, hint, prepare?, baseline?, done, success } }]
 *   task.prepare()  optional, may return a cleanup function (listeners, observers)
 *   task.baseline() optional, value handed to done(baseline) on every poll
 *   task.success    { title, text } or a function returning it (can read what the learner just did)
 */
export function startTutorial({ steps, storageKey, label, el, setPane, force = false, onFinish = () => {} }) {
  let seen = false; try { seen = localStorage.getItem(storageKey) === 'done'; } catch { /* private mode */ }
  if (seen && !force) return null;
  document.querySelector('.tour-root')?.remove();
  const previousFocus = document.activeElement;
  const done = new Set();
  let i = 0, poll = null, hintTimer = null, talkTimer = null, cleanup = null, baseline = null, successInfo = null;

  const root = el('div', { class: 'tour-root' });
  const spotlight = el('div', { class: 'tour-focus', 'aria-hidden': 'true' });
  const card = el('div', { class: 'tour', role: 'dialog', 'aria-modal': 'false', 'aria-label': 'Tutorial MEDCOEL 4D Lab', 'data-testid': 'tour' });
  root.append(spotlight, card);
  document.body.append(root);

  const stopTask = () => {
    clearInterval(poll); clearTimeout(hintTimer); clearTimeout(talkTimer);
    poll = hintTimer = talkTimer = null;
    if (cleanup) { try { cleanup(); } catch { /* ignore */ } cleanup = null; }
  };
  const position = () => {
    const target = document.querySelector(steps[i].target);
    if (!target) { spotlight.hidden = true; return; }
    spotlight.hidden = false;
    const rect = target.getBoundingClientRect(), pad = 6;
    spotlight.style.left = `${Math.max(0, rect.left - pad)}px`;
    spotlight.style.top = `${Math.max(0, rect.top - pad)}px`;
    spotlight.style.width = `${Math.min(innerWidth, rect.right + pad) - Math.max(0, rect.left - pad)}px`;
    spotlight.style.height = `${Math.min(innerHeight, rect.bottom + pad) - Math.max(0, rect.top - pad)}px`;
    const size = card.getBoundingClientRect();
    const left = Math.max(12, Math.min(innerWidth - size.width - 12, rect.left));
    let top = rect.bottom + 16;
    if (top + size.height > innerHeight - 12) top = rect.top - size.height - 16;
    if (top < 12) top = Math.max(12, innerHeight - size.height - 12);
    card.style.left = `${left}px`; card.style.top = `${top}px`;
  };
  const finish = () => {
    stopTask();
    window.removeEventListener('resize', position);
    window.removeEventListener('scroll', position, true);
    window.removeEventListener('keydown', handleKey, true);
    root.remove();
    try { localStorage.setItem(storageKey, 'done'); } catch { /* private mode */ }
    if (previousFocus?.isConnected && previousFocus?.focus) previousFocus.focus();
    onFinish();
  };
  const go = (n) => { i = n; show(); };
  const next = () => { if (i + 1 >= steps.length) finish(); else go(i + 1); };

  /** state: 'task' (waiting for the learner) | 'success' | 'hint' | 'plain' */
  const paint = (state) => {
    const step = steps[i], task = step.task;
    const who = state === 'success' ? 'kila' : state === 'hint' ? 'nilo' : (step.mascot || 'kori');
    const mood = state === 'success' ? 'cheer' : state === 'hint' ? 'think' : (step.mood || 'wave');
    const mascot = mascotEl(who, mood, matchMedia('(max-width: 740px)').matches ? 52 : 72);
    mascot.dataset.mascot = who;
    if (state === 'task') { // Kori talks for a moment, then waits quietly while the learner tries
      clearTimeout(talkTimer);
      mascot.className = 'mc-character mood-talk';
      talkTimer = setTimeout(() => { mascot.className = 'mc-character mood-idle'; }, 1800);
    }
    const success = state === 'success' && successInfo;
    const body = success ? successInfo.text : state === 'hint' ? `Belum terdeteksi. Coba lagi: ${task.hint}` : step.text;
    const title = success ? successInfo.title : state === 'hint' ? 'Pelan-pelan saja' : step.title;
    const isDone = done.has(i);
    card.dataset.state = state;
    spotlight.classList.toggle('is-task', !!task && !isDone);
    spotlight.classList.toggle('is-ok', !!task && isDone);
    card.replaceChildren(
      el('div', { class: 'tour-head' },
        el('div', { class: 'tour-mascot', 'data-testid': 'tour-mascot' }, mascot),
        el('div', { class: 'tour-headtext' },
          el('small', {}, `${label} · ${i + 1} DARI ${steps.length}`),
          el('div', { class: 'tour-progress', 'aria-hidden': 'true' }, ...steps.map((_, n) => el('i', { class: n < i || done.has(n) ? 'done' : n === i ? 'active' : '' }))))),
      el('h2', {}, title),
      el('p', { class: 'tour-text', 'aria-live': 'polite' }, body),
      ...(task ? [el('div', { class: 'tour-task' + (isDone ? ' is-done' : ''), 'data-testid': 'tour-task' },
        el('span', { class: 'tour-check', 'aria-hidden': 'true' }, isDone ? '✓' : '✋'),
        el('span', {}, isDone ? 'Selesai' : `Coba sekarang: ${task.text}`))] : []),
      el('div', { class: 'row' },
        el('button', { type: 'button', class: 'btn', 'data-testid': 'tour-skip', onclick: finish }, 'Lewati'),
        ...(i ? [el('button', { type: 'button', class: 'btn', 'data-testid': 'tour-back', onclick: () => go(i - 1) }, 'Kembali')] : []),
        ...(task && !isDone ? [el('button', { type: 'button', class: 'btn ghost', 'data-testid': 'tour-skip-step', onclick: () => { stopTask(); next(); } }, 'Lewati langkah')] : []),
        el('button', {
          type: 'button', class: 'btn primary', 'data-testid': 'tour-next', ...(task && !isDone ? { disabled: 'true', title: 'Selesaikan dulu langkah di atas, atau pilih "Lewati langkah".' } : {}),
          onclick: next,
        }, i === steps.length - 1 ? (step.next || 'Mulai simulasi') : (step.next || 'Lanjut')))
    );
    if (!task || isDone) card.querySelector('[data-testid=tour-next]')?.focus();
    requestAnimationFrame(position);
  };
  const complete = () => {
    const task = steps[i].task;
    stopTask();
    done.add(i);
    const s = typeof task.success === 'function' ? task.success() : task.success;
    successInfo = { title: s?.title || 'Bagus!', text: s?.text || '' };
    paint('success');
  };
  function show() {
    stopTask();
    const step = steps[i], task = step.task;
    if (matchMedia('(max-width: 740px)').matches) setPane(step.pane || 'patient');
    successInfo = null;
    if (!task) { paint('plain'); return; }
    if (done.has(i)) { // coming back to a step that is already done
      const s = typeof task.success === 'function' ? task.success() : task.success;
      successInfo = { title: s?.title || 'Bagus!', text: s?.text || '' };
      paint('success'); return;
    }
    cleanup = task.prepare?.() || null;
    baseline = task.baseline ? task.baseline() : null;
    paint('task');
    poll = setInterval(() => { try { if (task.done(baseline)) complete(); } catch (e) { console.warn('[tutorial] step', step.id, e); } }, POLL_MS);
    hintTimer = setTimeout(() => { if (!done.has(i)) paint('hint'); }, task.hintAfterMs || HINT_AFTER_MS);
  }
  const handleKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); finish(); }
    if (e.key !== 'Tab') return;
    const buttons = [...card.querySelectorAll('button:not([disabled])')];
    if (!buttons.length) return;
    if (!card.contains(document.activeElement)) return; // the learner is using the page: leave Tab alone
    if (e.shiftKey && document.activeElement === buttons[0]) { e.preventDefault(); buttons.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === buttons.at(-1)) { e.preventDefault(); buttons[0].focus(); }
  };
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
  window.addEventListener('keydown', handleKey, true);
  show();
  return { finish, get step() { return i; }, get done() { return new Set(done); } };
}
