const enabled = import.meta.env.DEV || new URLSearchParams(globalThis.location?.search || '').get('perf') === '1';
const totals = {}, origin = performance.now();
export function beginPhase(name) {
  const start = performance.now(), mark = `anatomy:${name}:${start}`;
  if (enabled) performance.mark(mark);
  let complete = false;
  return () => {
    if (complete) return; complete = true;
    const duration = performance.now() - start;
    totals[name] = (totals[name] || 0) + duration;
    if (enabled) { performance.mark(mark + ':end'); performance.measure('Anatomy ' + name, mark, mark + ':end'); }
  };
}
export function reportPerf(stage) {
  if (!enabled) return;
  const navigation = performance.getEntriesByType('navigation')[0];
  const report = { stage, htmlMs: Math.round(navigation?.responseEnd || 0), sinceJsMs: Math.round(performance.now() - origin), sinceNavigationMs: Math.round(performance.now()), phases: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, Math.round(v)])) };
  // Opt-in developer instrumentation contains durations and system names only.
  // eslint-disable-next-line no-console
  console.info('[AnatomyPerf] ' + JSON.stringify(report));
}
