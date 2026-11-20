// Challenge client. Answer keys stay on the server: items arrive without answers, grading happens per submission.
// Endpoints live under the studio's own release path, so the scoped HttpOnly session cookie authenticates them.
export function createChallengeClient(base = './') {
  async function call(action, body) {
    const r = await fetch(base + '_challenge/' + action, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(Error(data.code || 'CHALLENGE_UNAVAILABLE'), { status: r.status, code: data.code });
    return data;
  }
  return {
    start: () => call('start'),
    answer: (attempt, itemId, response) => call('answer', { attempt, itemId, response }),
  };
}

/** Local score bookkeeping (display only; the server is the grader). */
export function createScore() {
  const answered = new Map();
  return {
    record(itemId, correct) { if (!answered.has(itemId)) answered.set(itemId, !!correct); },
    get answered() { return answered.size; },
    get correct() { return [...answered.values()].filter(Boolean).length; },
  };
}
