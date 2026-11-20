// Clinical Studios learner progress (collection studio_progress, migration 1800003300).
// Challenge scores are written ONLY by the server while grading; the first answer per item counts. Guided completion is
// client-reported and stored with selfReported=true. Persistence failures never change grading results.
'use strict';
const root = typeof __hooks !== 'undefined' ? __hooks : __dirname + '/..';
const util = require(root + '/lib/util.js');
const COLL = 'studio_progress';

const attemptKey = text => $security.sha256('medcoel.studio-progress.v1\n' + text);
function find(app, userId, key) {
  try { return app.findFirstRecordByFilter(COLL, 'user = {:u} && attemptKey = {:k}', { u: userId, k: key }); } catch (_) { return null; }
}
function summary(r) {
  return { mode: r.getString('mode'), releaseId: r.getString('releaseId'), total: r.getInt('total'), graded: r.getInt('answered'), correct: r.getInt('correct'),
    selfReported: r.getBool('selfReported'), completedAt: r.getString('completedAt') || null, startedAt: r.getString('created'), updatedAt: r.getString('updated') };
}
function create(app, g, mode, key, total, selfReported) {
  const r = new Record(app.findCollectionByNameOrId(COLL));
  r.set('user', g.session.userId); r.set('campus', String(g.record.getString('campus') || '').slice(0, 120));
  r.set('studioId', g.entry.id); r.set('releaseId', g.session.releaseId); r.set('mode', mode); r.set('attemptKey', key);
  r.set('selfReported', !!selfReported); r.set('total', total); r.set('answered', 0); r.set('correct', 0); r.set('answers', {});
  app.save(r);
  return r;
}

/** Called by the Challenge "start" action with the signed attempt payload. */
function startChallenge(app, g, payload, total) {
  try { const key = attemptKey(payload); return summary(find(app, g.session.userId, key) || create(app, g, 'challenge', key, total, false)); } catch (_) { return null; }
}
/** Called after a graded answer. Only the first answer per item changes the score. */
function recordAnswer(app, g, payload, itemId, correct) {
  try {
    let out = null;
    app.runInTransaction((tx) => {
      const r = find(tx, g.session.userId, attemptKey(payload));
      if (!r) return;
      const answers = util.recJson(r, 'answers', {}) || {};
      const first = !Object.prototype.hasOwnProperty.call(answers, itemId);
      if (first) {
        answers[itemId] = { correct: !!correct, at: new Date().toISOString() };
        const answered = Object.keys(answers).length, right = Object.keys(answers).filter(k => answers[k] && answers[k].correct).length;
        r.set('answers', answers); r.set('answered', answered); r.set('correct', right);
        if (answered >= r.getInt('total') && !r.getString('completedAt')) r.set('completedAt', new Date().toISOString());
        tx.save(r);
      }
      out = Object.assign(summary(r), { counted: first });
    });
    return out;
  } catch (_) { return null; }
}
/** Guided steps (client-reported, labelled selfReported). One row per launched session. */
function recordGuided(app, g, body) {
  const steps = Number(body && body.stepsCompleted), total = Number(body && body.totalSteps);
  if (!Number.isInteger(steps) || !Number.isInteger(total) || total < 1 || total > 50 || steps < 0 || steps > total) return { status: 400, body: { code: 'INVALID_PROGRESS' } };
  const key = attemptKey('guided~' + g.session.sid);
  let r = find(app, g.session.userId, key) || create(app, g, 'guided', key, total, true);
  if (steps > r.getInt('answered')) { r.set('answered', steps); r.set('correct', steps); if (steps >= total) r.set('completedAt', new Date().toISOString()); app.save(r); }
  return { status: 200, body: { progress: summary(r) } };
}

/** The learner's own progress for one studio (re-entry view). */
function mine(e, studioId) {
  const user = util.requireUser(e);
  e.response.header().set('Cache-Control', 'private, no-store');
  if (!/^[a-z][a-z0-9-]{2,63}$/.test(studioId || '')) return e.json(404, { code: 'NOT_FOUND' });
  const rows = e.app.findRecordsByFilter(COLL, 'user = {:u} && studioId = {:s}', '-created', 50, 0, { u: user.id, s: studioId });
  const items = rows.map(summary);
  const challenge = items.filter(x => x.mode === 'challenge');
  const best = challenge.reduce((b, x) => (x.total && (!b || x.correct / x.total > b.correct / b.total) ? x : b), null);
  return e.json(200, { studioId, attempts: items, challengeAttempts: challenge.length, completedChallenges: challenge.filter(x => x.completedAt).length,
    best: best ? { correct: best.correct, total: best.total, at: best.updatedAt } : null, guidedCompleted: items.some(x => x.mode === 'guided' && x.completedAt) });
}

/** Admin aggregate per studio (optionally per campus). No per-answer data. */
function adminReport(e) {
  util.requireAdmin(e);
  e.response.header().set('Cache-Control', 'no-store');
  const campus = String(util.query(e, 'campus') || '').slice(0, 120);
  const rows = e.app.findRecordsByFilter(COLL, campus ? 'campus = {:c}' : 'id != ""', '-created', 5000, 0, { c: campus });
  const by = {};
  rows.forEach((r) => {
    const s = r.getString('studioId'), m = r.getString('mode'), k = s + '|' + m;
    const a = by[k] || (by[k] = { studioId: s, mode: m, attempts: 0, learners: {}, completed: 0, answered: 0, correct: 0 });
    a.attempts++; a.learners[r.getString('user')] = 1; if (r.getString('completedAt')) a.completed++;
    a.answered += r.getInt('answered'); a.correct += r.getInt('correct');
  });
  const items = Object.keys(by).sort().map((k) => { const a = by[k]; return { studioId: a.studioId, mode: a.mode, attempts: a.attempts, learners: Object.keys(a.learners).length, completed: a.completed,
    accuracy: a.mode === 'challenge' && a.answered ? Math.round((a.correct / a.answered) * 1000) / 10 : null, selfReported: a.mode === 'guided' }; });
  return e.json(200, { campus: campus || null, rows: rows.length, truncated: rows.length >= 5000, items });
}

module.exports = { startChallenge, recordAnswer, recordGuided, mine, adminReport, attemptKey };
