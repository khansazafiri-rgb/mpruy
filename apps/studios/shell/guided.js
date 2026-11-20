// Guided learning runner: each step is complete only when its check() is true against the LIVE viewer state.
// steps: [{ id, title, text, hint?, check(state) -> boolean, done?: string }]
export function createGuide(steps, { onChange = () => {} } = {}) {
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
      if (ok) { completed.add(index); onChange(api); }
      return ok;
    },
    next() { if (completed.has(index) && index < steps.length - 1) { index++; onChange(api); } return index; },
    back() { if (index > 0) { index--; onChange(api); } return index; },
    skip() { if (index < steps.length - 1) { index++; onChange(api); } return index; },
  };
  return api;
}
