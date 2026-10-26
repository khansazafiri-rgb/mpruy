// Lightweight per-user Lab progress: one row per (user, pathway). No prerequisite locking.
// A lesson counts as complete only through an explicit signal: the learner marks it done, finishes the practice
// session, or moves on with "next lesson". Merely rendering a page never completes it.
const HOOKS = typeof __hooks !== 'undefined' ? __hooks : __dirname + '/..';
const u = require(HOOKS + '/lib/util.js');
const lab = require(HOOKS + '/lib/lab.js');
function fail(message) { throw new BadRequestError(message); }

function steps(app, pathway) {
  return app.findRecordsByFilter('lab_path_steps', 'pathway = {:id}', 'position', 100, 0, { id: pathway.id }).flatMap((s) => {
    try { const o = lab.find(app, 'objects', s.getString('object'), true); return [{ id: o.id, slug: o.getString('slug'), title: o.getString('title') }]; } catch (_) { return []; }
  });
}
function row(app, user, pathway) {
  try { return app.findFirstRecordByFilter('lab_progress', 'user = {:u} && pathway = {:p}', { u: user.id, p: pathway.id }); } catch (_) { return null; }
}
function state(app, user, pathway) {
  const st = steps(app, pathway); const r = row(app, user, pathway); const done = r ? u.recJson(r, 'completed', []) : [];
  const completed = st.filter((s) => done.includes(s.id)).map((s) => s.slug);
  const last = r ? st.find((s) => s.id === r.getString('lastObject')) : null;
  return { total: st.length, completed, lastObject: last ? last.slug : '', updatedAt: r ? r.getString('updated') : '', steps: st };
}
// body: { pathway: slug|id, object: slug|id, complete?: boolean }  complete=true marks done, false clears, omitted only records "last studied".
function mark(app, user, body) {
  const pathway = lab.find(app, 'pathways', String(body.pathway || ''), true);
  if (body.reset === true) { // "Ulangi jalur": clears this learner's progress on one pathway only
    const r = row(app, user, pathway); if (r) { r.set('completed', []); r.set('lastObject', ''); app.save(r); }
    const s0 = state(app, user, pathway); return { total: s0.total, completed: s0.completed, lastObject: s0.lastObject };
  }
  const st = steps(app, pathway); const target = lab.find(app, 'objects', String(body.object || ''), true);
  if (!st.some((s) => s.id === target.id)) fail('Materi ini bukan bagian dari jalur tersebut.');
  if (body.complete !== undefined && typeof body.complete !== 'boolean') fail('Nilai complete tidak valid.');
  app.runInTransaction((tx) => {
    let r = row(tx, user, pathway); if (!r) { r = new Record(tx.findCollectionByNameOrId('lab_progress')); r.set('user', user.id); r.set('pathway', pathway.id); r.set('completed', []); }
    let done = u.recJson(r, 'completed', []).filter((id) => st.some((s) => s.id === id));
    if (body.complete === true && !done.includes(target.id)) done.push(target.id);
    if (body.complete === false) done = done.filter((id) => id !== target.id);
    r.set('completed', done); r.set('lastObject', target.id); tx.save(r);
  });
  const s = state(app, user, pathway); return { total: s.total, completed: s.completed, lastObject: s.lastObject };
}
// Per-pathway status for list cards: not started / in progress / completed, plus the number of steps.
function brief(app, user, pathway) {
  const s = state(app, user, pathway); const done = s.completed.length;
  return { total: s.total, done, status: !s.total || (!done && !s.lastObject) ? 'new' : done >= s.total ? 'done' : 'active' };
}
function summary(app, user) {
  const rows = app.findRecordsByFilter('lab_progress', 'user = {:u}', '-updated', 20, 0, { u: user.id });
  return rows.flatMap((r) => {
    let p; try { p = lab.find(app, 'pathways', r.getString('pathway'), true); } catch (_) { return []; }
    if (lab.isDemoSlug(p.getString('slug'))) return []; // onboarding demo never competes with real learning
    const s = state(app, user, p); if (!s.total) return [];
    const next = s.steps.find((x) => !s.completed.includes(x.slug)); const last = s.steps.find((x) => x.slug === s.lastObject);
    return [{ pathway: { slug: p.getString('slug'), title: p.getString('title'), summary: p.getString('summary') }, total: s.total, completed: s.completed, lastObject: s.lastObject, updatedAt: s.updatedAt,
      // Continue where the learner stopped unless that lesson is finished; then offer the first unfinished one.
      resume: (last && !s.completed.includes(last.slug) ? last : next || last || s.steps[0]).slug, finished: s.completed.length >= s.total }];
  });
}
function overview(app, user) {
  const domains = {}; lab.DOMAINS.forEach((d) => { domains[d] = app.countRecords('lab_objects', $dbx.exp(`status = 'published' AND domain = {:d} AND data NOT LIKE '%"demo":true%'`, { d })); });
  const progress = summary(app, user);
  return { domains, continue: progress.find((p) => !p.finished) || null, progress };
}
module.exports = { state, mark, brief, summary, overview };
