// STUDY PLANNER SERVICE: ownership, validation, persistence and replanning around lib/studyPlanner.js.
// All access is for the signed-in owner only (collections are locked; see migration 1800003200).
const u = require(`${__hooks}/lib/util.js`);
const P = require(`${__hooks}/lib/studyPlanner.js`);

const ID = /^[a-z0-9]{15}$/;

function profileOf(app, user) {
  let r = null;
  try { r = app.findFirstRecordByFilter('study_profiles', 'user = {:u}', { u: user.id }); } catch (_) { r = null; }
  const p = P.cleanProfile(r ? {
    dailyMinutes: r.get('dailyMinutes'), weekdayMinutes: u.recJson(r, 'weekdayMinutes', null),
    restDates: u.recJson(r, 'restDates', []), activities: u.recJson(r, 'activities', []),
  } : { dailyMinutes: 120 });
  p.exists = !!r; p.updated = r ? r.getString('updated') : '';
  return p;
}

function saveProfile(app, user, body) {
  const p = P.cleanProfile(body);
  let r;
  try { r = app.findFirstRecordByFilter('study_profiles', 'user = {:u}', { u: user.id }); } catch (_) { r = new Record(app.findCollectionByNameOrId('study_profiles')); r.set('user', user.id); }
  r.set('dailyMinutes', p.dailyMinutes); r.set('weekdayMinutes', p.weekdayMinutes); r.set('restDates', p.restDates); r.set('activities', p.activities);
  app.save(r);
  return profileOf(app, user);
}

function ownExam(app, user, id) {
  if (!ID.test(String(id || ''))) throw new BadRequestError('Ujian tidak valid.');
  let x;
  try { x = app.findRecordById('exam_schedules', id); } catch (_) { x = null; }
  if (!x || x.getString('user') !== user.id) throw new NotFoundError('Ujian tidak ditemukan.'); // never reveal other users' exams
  return x;
}

function planForExam(app, user, examId) {
  try { return app.findFirstRecordByFilter('study_plans', 'user = {:u} && exam = {:x}', { u: user.id, x: examId }); } catch (_) { return null; }
}

function ownPlan(app, user, id) {
  if (!ID.test(String(id || ''))) throw new BadRequestError('Rencana tidak valid.');
  let p;
  try { p = app.findRecordById('study_plans', id); } catch (_) { p = null; }
  if (!p || p.getString('user') !== user.id) throw new NotFoundError('Rencana belajar tidak ditemukan.');
  return p;
}

/** The student's calendar: timezone of the nearest upcoming exam (fallback WIB). */
function userTz(app, user) {
  try {
    const x = app.findRecordsByFilter('exam_schedules', 'user = {:u} && examAt >= {:now}', 'examAt', 1, 0, { u: user.id, now: u.pbDate(new Date()) });
    if (x.length) return x[0].getString('timezone') || 'WIB';
  } catch (_) {}
  return 'WIB';
}

/** Keep only chapter sources the student may see (subject + chapter visible); everything else becomes a custom topic. */
function validateSources(app, topics) {
  return topics.map((t) => {
    if (t.source.type !== 'chapter') return t;
    try {
      const c = app.findRecordById('chapters', t.source.chapter);
      const s = app.findRecordById('subjects', c.getString('subject'));
      if (c.getString('subject') === t.source.subject && !c.getBool('hidden') && !s.getBool('hidden')) return t;
    } catch (_) {}
    return Object.assign({}, t, { source: { type: 'custom' } });
  });
}

/** Sync the plan's snapshot with its exam; archive when the exam was deleted. Returns false if archived. */
function syncExam(app, plan) {
  const examId = plan.getString('exam');
  if (!examId) { if (plan.getString('status') !== 'archived') { plan.set('status', 'archived'); app.save(plan); } return false; }
  let x;
  try { x = app.findRecordById('exam_schedules', examId); } catch (_) { x = null; }
  if (!x) { plan.set('status', 'archived'); app.save(plan); return false; }
  plan.set('examTitle', x.getString('title')); plan.set('examAt', x.getString('examAt')); plan.set('timezone', x.getString('timezone') || 'WIB'); plan.set('subject', x.getString('subject'));
  return true;
}

function sessionsOf(app, user, filter, params) {
  return app.findRecordsByFilter('study_sessions', 'user = {:u}' + (filter ? ' && ' + filter : ''), 'date,created', 0, 0, Object.assign({ u: user.id }, params || {}));
}

function doneMap(sessions) {
  const done = {};
  sessions.forEach((s) => {
    if (s.getString('status') !== 'done') return;
    const kind = s.getString('kind');
    const key = s.getString('topicKey') || (kind === 'practice' ? '__practice' : '__final');
    (done[key] = done[key] || {})[kind] = (done[key][kind] || 0) + s.getInt('minutes');
  });
  return done;
}

const plain = (s) => ({ planId: s.getString('plan'), date: s.getString('date'), topicKey: s.getString('topicKey') || null, kind: s.getString('kind'), minutes: s.getInt('minutes') });

/**
 * Recompute every active plan of the student with one shared capacity.
 * dryRun: compute and return the proposal + per-day differences without writing anything.
 */
function replan(app, user, opts) {
  opts = opts || {};
  const tz = userTz(app, user);
  const today = u.localDate(new Date(), tz);
  const profile = profileOf(app, user);
  const plans = app.findRecordsByFilter('study_plans', "user = {:u} && status = 'active'", 'created', 0, 0, { u: user.id })
    .filter((p) => (opts.dryRun ? !!p.getString('exam') : syncExam(app, p)));
  const all = sessionsOf(app, user, '');
  const byPlan = {};
  all.forEach((s) => { (byPlan[s.getString('plan')] = byPlan[s.getString('plan')] || []).push(s); });
  const doneToday = all.filter((s) => s.getString('date') === today && s.getString('status') === 'done').reduce((a, s) => a + s.getInt('minutes'), 0);
  const capToday = P.capacityOf(profile, today);
  const exams = plans.map((p) => {
    const override = opts.overrides && opts.overrides[p.id];
    let examAt = p.getString('examAt'), tzp = p.getString('timezone') || 'WIB';
    if (opts.dryRun) { try { const x = app.findRecordById('exam_schedules', p.getString('exam')); examAt = x.getString('examAt'); tzp = x.getString('timezone') || tzp; } catch (_) {} }
    return {
      id: p.id, title: p.getString('examTitle'), examDate: u.localDate(u.parseDate(examAt), tzp),
      priority: override && override.priority ? override.priority : p.getInt('priority') || 2,
      topics: override && override.topics ? override.topics : u.recJson(p, 'topics', []),
      done: doneMap(byPlan[p.id] || []),
    };
  });
  const result = P.plan({ today: today, profile: Object.assign({}, profile, { todayMinutes: Math.max(0, capToday - doneToday) }), exams: exams });
  const future = all.filter((s) => s.getString('status') === 'planned' && s.getString('date') >= today).map(plain);
  const titleOf = {};
  exams.forEach((x) => { titleOf[x.id] = { title: x.title, topics: {} }; (x.topics || []).forEach((t) => { titleOf[x.id].topics[t.key] = t.title; }); });
  const KIND = { learn: 'Pelajari', review: 'Ulas', practice: 'Latihan soal', final: 'Revisi akhir' };
  const label = (k) => KIND[k.kind] + (k.topicKey && titleOf[k.planId] ? ': ' + (titleOf[k.planId].topics[k.topicKey] || k.topicKey) : '') + (titleOf[k.planId] ? ' (' + titleOf[k.planId].title + ')' : '');
  const changes = P.diff(future, result.sessions, label);
  const out = { today: today, timezone: tz, sessions: result.sessions, shortfall: result.shortfall, warnings: result.warnings, changes: changes, days: result.days };
  if (opts.dryRun) return out;

  app.runInTransaction((tx) => {
    const col = tx.findCollectionByNameOrId('study_sessions');
    // past planned-but-not-done sessions are kept as "missed" (history); future planned ones are regenerated
    all.forEach((s) => {
      if (s.getString('status') !== 'planned') return;
      const fresh = tx.findRecordById('study_sessions', s.id);
      if (s.getString('date') < today) { fresh.set('status', 'missed'); tx.save(fresh); } else tx.delete(fresh);
    });
    plans.forEach((p) => {
      const fresh = tx.findRecordById('study_plans', p.id);
      const rev = fresh.getInt('revision') + 1;
      result.sessions.filter((s) => s.planId === p.id).forEach((s) => {
        const r = new Record(col);
        r.set('user', user.id); r.set('plan', p.id); r.set('date', s.date); r.set('topicKey', s.topicKey || ''); r.set('kind', s.kind);
        r.set('minutes', s.minutes); r.set('status', 'planned'); r.set('revision', rev);
        tx.save(r);
      });
      ['examTitle', 'examAt', 'timezone', 'subject'].forEach((f) => fresh.set(f, p.get(f)));
      fresh.set('revision', rev);
      fresh.set('plannedExamAt', p.getString('examAt'));
      fresh.set('shortfall', result.shortfall.filter((s) => s.planId === p.id)[0] || null);
      const mine = changes.reduce((a, d) => a + d.changes.filter((c) => c.planId === p.id).length, 0);
      fresh.set('note', opts.reason ? String(opts.reason).slice(0, 300) + (mine ? ' · ' + mine + ' perubahan jadwal.' : '') : '');
      tx.save(fresh);
    });
  });
  return out;
}

/** Why a plan should be refreshed (offered to the student, never applied silently). */
function staleReasons(app, user, plan, today, profile, sessions) {
  const why = [];
  if (!plan.getString('exam')) return ['exam_deleted'];
  try {
    const x = app.findRecordById('exam_schedules', plan.getString('exam'));
    if (x.getString('examAt') !== plan.getString('plannedExamAt')) why.push('exam_changed');
  } catch (_) { return ['exam_deleted']; }
  if (sessions.some((s) => s.getString('status') === 'planned' && s.getString('date') < today)) why.push('missed');
  if (profile.updated && profile.updated > plan.getString('updated')) why.push('availability_changed');
  return why;
}

function planSummary(app, user, plan, today, profile, sessions) {
  const mine = sessions.filter((s) => s.getString('plan') === plan.id);
  const total = mine.filter((s) => s.getString('status') !== 'skipped').reduce((a, s) => a + s.getInt('minutes'), 0);
  const done = mine.filter((s) => s.getString('status') === 'done').reduce((a, s) => a + s.getInt('minutes'), 0);
  const topics = u.recJson(plan, 'topics', []);
  const d = doneMap(mine);
  const learned = topics.filter((t) => t.status === 'studied' || t.learned || ((d[t.key] || {}).learn || 0) >= P.topicNeeds(t).learn).length;
  return {
    id: plan.id, exam: plan.getString('exam'), status: plan.getString('status'), revision: plan.getInt('revision'), priority: plan.getInt('priority') || 2,
    topics: topics.length, topicsReady: learned, minutesPlanned: total, minutesDone: done,
    progressPct: total ? Math.round((done / total) * 100) : 0,
    today: mine.filter((s) => s.getString('date') === today).map((s) => ({ id: s.id, kind: s.getString('kind'), topicKey: s.getString('topicKey'), minutes: s.getInt('minutes'), status: s.getString('status') })),
    shortfall: u.recJson(plan, 'shortfall', null), note: plan.getString('note'),
    stale: plan.getString('status') === 'active' ? staleReasons(app, user, plan, today, profile, mine) : [],
  };
}

/** Links to existing MEDCOEL resources for a chapter topic, respecting visibility and campus rules. */
function resources(app, user, topics) {
  const learn = require(`${__hooks}/lib/learn.js`);
  const bySubject = {};
  topics.forEach((t) => { if (t.source && t.source.type === 'chapter') (bySubject[t.source.subject] = bySubject[t.source.subject] || []).push(t); });
  const out = {};
  Object.keys(bySubject).forEach((sid) => {
    let s;
    try { s = app.findRecordById('subjects', sid); } catch (_) { return; }
    if (s.getBool('hidden')) return;
    const slug = s.getString('slug');
    const noted = learn.notedChapters(app, sid), carded = learn.cardChapters(app, sid);
    const stats = {};
    learn.pool(app, user, { subject: sid }).forEach((q) => {
      const st = (stats[q.chapter] = stats[q.chapter] || { total: 0, answered: 0, wrong: 0 });
      st.total++; if (q.seen) st.answered++; if (q.wrong) st.wrong++;
    });
    bySubject[sid].forEach((t) => {
      let c;
      try { c = app.findRecordById('chapters', t.source.chapter); } catch (_) { return; }
      if (c.getBool('hidden') || c.getString('subject') !== sid) return;
      const st = stats[c.id] || { total: 0, answered: 0, wrong: 0 };
      const links = [];
      if (noted.has(c.id)) links.push({ kind: 'materi', label: 'Catatan materi', href: '/mata-kuliah/' + slug + '/materi/' + c.id });
      if (carded.has(c.id)) links.push({ kind: 'flashcard', label: 'Flashcard', href: '/mata-kuliah/' + slug + '/flashcard/' + c.id });
      if (st.total > 0) links.push({ kind: 'soal', label: 'Latihan soal (' + st.total + ')', href: '/mata-kuliah/' + slug + '?bab=' + c.id });
      out[t.key] = { subject: s.getString('name'), chapter: c.getString('title'), links: links, practice: st };
    });
  });
  return out;
}

module.exports = { profileOf, saveProfile, ownExam, ownPlan, planForExam, validateSources, replan, planSummary, resources, sessionsOf, userTz, doneMap };
