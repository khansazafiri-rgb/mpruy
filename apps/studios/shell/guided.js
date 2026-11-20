// Guided learning runner: each step is complete only when its check() is true against the LIVE viewer state.
// steps: [{ id, title, text, hint?, check(state) -> boolean, done?: string }]
// When the studio runs inside an authorised launch (served from the studio-asset API), completed steps are reported to the
// server as SELF-REPORTED guided progress (fire-and-forget; never blocks learning).
const hosted = () => typeof location !== 'undefined' && location.pathname.includes('/api/medcoel/studio-assets/');
export function reportGuided(stepsCompleted, totalSteps, base = './') {
  if (!hosted() || typeof fetch !== 'function') return Promise.resolve(null);
  return fetch(base + '_progress/guided', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stepsCompleted, totalSteps }) })
    .then(r => (r.ok ? r.json() : null)).catch(() => null);
}
export function createGuide(steps, { onChange = () => {}, report = reportGuided } = {}) {
  let index = 0;
  const completed = new Set();
  const api = {
    get index() { return index; }, get step() { return steps[index]; }, get completed() { return new Set(completed); },
    get finished() { return completed.size === steps.length; },
    /** Feed the current viewer state; advances only when the real condition holds. Returns true if the step completed now. */
    update(state) {
      const step = steps[index];
      if (!step || completed.has(index)) return false;
      let ok = false;
      try { ok = !!step.check(state); } catch { ok = false; }
      if (ok) { completed.add(index); onChange(api); report(completed.size, steps.length); }
      return ok;
    },
    next() { if (completed.has(index) && index < steps.length - 1) { index++; onChange(api); } return index; },
    back() { if (index > 0) { index--; onChange(api); } return index; },
    skip() { if (index < steps.length - 1) { index++; onChange(api); } return index; },
  };
  return api;
}
