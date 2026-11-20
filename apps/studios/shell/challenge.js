// Challenge client. Answer keys stay on the server: items arrive without answers, grading happens per submission.
// Endpoints live under the studio's own release path, so the scoped HttpOnly session cookie authenticates them.
export function createChallengeClient(base = './') {
  async function call(action, body) {
    const r = await fetch(base + '_challenge/' + action, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(Error(data.code || 'CHALLENGE_UNAVAILABLE'), { status: r.status, code: data.code });
    return data;
  }
  const client = {
    /** Latest progress the server persisted for this attempt (null when persistence is unavailable). */
    lastProgress: null,
    start: async () => { const d = await call('start'); client.lastProgress = d.progress || null; return d; },
    answer: async (attempt, itemId, response) => { const d = await call('answer', { attempt, itemId, response }); if (d.progress) client.lastProgress = d.progress; return d; },
  };
  return client;
}

/** Score shown to the learner. Uses the server-persisted progress when available (first answer per item counts there
 * too); otherwise local bookkeeping for display only. The server is always the grader. */
export function createScore(client = null) {
  const answered = new Map();
  const server = () => (client && client.lastProgress && typeof client.lastProgress.graded === 'number' ? client.lastProgress : null);
  return {
    record(itemId, correct) { if (!answered.has(itemId)) answered.set(itemId, !!correct); },
    get answered() { return server() ? server().graded : answered.size; },
    get correct() { return server() ? server().correct : [...answered.values()].filter(Boolean).length; },
    get persisted() { return !!server(); },
  };
}
