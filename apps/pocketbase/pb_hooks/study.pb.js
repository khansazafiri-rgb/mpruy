/// <reference path="../pb_data/types.d.ts" />
// STUDY PLANNER API (docs/EXAM_PLANNER_LAB.md). Every route requires an active signed-in user and only ever
// touches that user's own exams, plans and sessions.

// Overview for the Exam Center and Home: all exams with plan status, progress and today's sessions.
routerAdd('GET', '/api/medcoel/study/overview', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const st = require(`${__hooks}/lib/study.js`);
  const user = u.requireUser(e);
  const tz = st.userTz(e.app, user), today = u.localDate(new Date(), tz);
  const profile = st.profileOf(e.app, user);
  const sessions = st.sessionsOf(e.app, user, '');
  const plans = e.app.findRecordsByFilter('study_plans', 'user = {:u}', '-created', 0, 0, { u: user.id });
  const exams = e.app.findRecordsByFilter('exam_schedules', 'user = {:u}', 'examAt', 0, 0, { u: user.id });
  const subj = {};
  const subjectOf = (id) => { if (!(id in subj)) { try { const s = e.app.findRecordById('subjects', id); subj[id] = { name: s.getString('name'), slug: s.getString('slug'), illustrationKey: s.getString('illustrationKey') }; } catch (_) { subj[id] = null; } } return subj[id]; };
  const planByExam = {};
  plans.forEach((p) => { if (p.getString('exam')) planByExam[p.getString('exam')] = p; });
  const titles = {};
  plans.forEach((p) => { const m = {}; u.recJson(p, 'topics', []).forEach((t) => { m[t.key] = t.title; }); titles[p.id] = { exam: p.getString('examTitle'), topics: m }; });
  // resource links for today's topics only (campus- and visibility-aware, same rules as the plan page)
  const linkCache = {};
  const linksFor = (planId, key) => {
    if (!key) return [];
    if (!(planId in linkCache)) { const p = plans.filter((x) => x.id === planId)[0]; linkCache[planId] = p ? st.resources(e.app, user, u.recJson(p, 'topics', []).filter((t) => sessions.some((s) => s.getString('plan') === planId && s.getString('date') === today && s.getString('topicKey') === t.key))) : {}; }
    return (linkCache[planId][key] || { links: [] }).links;
  };
  const todayItems = sessions.filter((s) => s.getString('date') === today).map((s) => ({
    links: linksFor(s.getString('plan'), s.getString('topicKey')),
    id: s.id, plan: s.getString('plan'), exam: titles[s.getString('plan')] ? titles[s.getString('plan')].exam : '', kind: s.getString('kind'),
    topicKey: s.getString('topicKey'), topic: titles[s.getString('plan')] ? titles[s.getString('plan')].topics[s.getString('topicKey')] || '' : '',
    minutes: s.getInt('minutes'), status: s.getString('status'),
  }));
  // next 14 days workload (shared capacity view)
  const week = [];
  for (let i = 0; i < 14; i++) {
    const date = require(`${__hooks}/lib/studyPlanner.js`).addDays(today, i);
    const day = sessions.filter((s) => s.getString('date') === date && s.getString('status') !== 'skipped');
    week.push({ date: date, minutes: day.reduce((a, s) => a + s.getInt('minutes'), 0), done: day.filter((s) => s.getString('status') === 'done').reduce((a, s) => a + s.getInt('minutes'), 0), capacity: require(`${__hooks}/lib/studyPlanner.js`).capacityOf(profile, date) });
  }
  return e.json(200, {
    today: today, timezone: tz, profile: profile,
    exams: exams.map((x) => ({
      id: x.id, title: x.getString('title'), examAt: x.getString('examAt'), timezone: x.getString('timezone'), reminderDays: u.recJson(x, 'reminderDays', []),
      subject: Object.assign({ id: x.getString('subject') }, subjectOf(x.getString('subject')) || {}),
      plan: planByExam[x.id] ? st.planSummary(e.app, user, planByExam[x.id], today, profile, sessions) : null,
    })),
    archived: plans.filter((p) => p.getString('status') === 'archived').map((p) => ({ id: p.id, examTitle: p.getString('examTitle'), examAt: p.getString('examAt'), minutesDone: sessions.filter((s) => s.getString('plan') === p.id && s.getString('status') === 'done').reduce((a, s) => a + s.getInt('minutes'), 0) })),
    todaySessions: todayItems, week: week,
  });
});

routerAdd('PUT', '/api/medcoel/study/profile', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const st = require(`${__hooks}/lib/study.js`);
  const user = u.requireUser(e);
  return e.json(200, st.saveProfile(e.app, user, u.body(e)));
});

// Plan detail for one exam (null plan = not created yet) + chapters of the exam subject for topic picking.
routerAdd('GET', '/api/medcoel/study/exams/{exam}', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const st = require(`${__hooks}/lib/study.js`);
  const user = u.requireUser(e);
  const x = st.ownExam(e.app, user, e.request.pathValue('exam'));
  const tz = st.userTz(e.app, user), today = u.localDate(new Date(), tz);
  const profile = st.profileOf(e.app, user);
  const plan = st.planForExam(e.app, user, x.id);
  let subject = null;
  try { const s = e.app.findRecordById('subjects', x.getString('subject')); if (!s.getBool('hidden')) subject = { id: s.id, name: s.getString('name'), slug: s.getString('slug') }; } catch (_) {}
  // chapters the student can see (catalog only; question visibility is enforced separately per campus)
  const subjects = e.app.findRecordsByFilter('subjects', 'hidden = false', 'name', 200, 0);
  const chapters = subject ? e.app.findRecordsByFilter('chapters', 'subject = {:s} && hidden = false && drilling = false', 'order,created', 300, 0, { s: subject.id })
    .map((c) => ({ id: c.id, subject: subject.id, title: c.getString('title') })) : [];
  const sessions = plan ? st.sessionsOf(e.app, user, 'plan = {:p}', { p: plan.id }) : [];
  const topics = plan ? u.recJson(plan, 'topics', []) : [];
  return e.json(200, {
    today: today, timezone: tz, profile: profile,
    exam: { id: x.id, title: x.getString('title'), examAt: x.getString('examAt'), timezone: x.getString('timezone'), subject: subject },
    subjects: subjects.map((s) => ({ id: s.id, name: s.getString('name'), slug: s.getString('slug') })),
    chapters: chapters,
    plan: plan ? Object.assign(st.planSummary(e.app, user, plan, today, profile, sessions), { topicList: topics, done: st.doneMap(sessions) }) : null,
    sessions: sessions.map((s) => ({ id: s.id, date: s.getString('date'), kind: s.getString('kind'), topicKey: s.getString('topicKey'), minutes: s.getInt('minutes'), status: s.getString('status'), completedAt: s.getString('completedAt'), revision: s.getInt('revision') })),
    resources: plan ? st.resources(e.app, user, topics) : {},
  });
});

// Chapters of another visible subject (an exam may cover topics from several subjects).
routerAdd('GET', '/api/medcoel/study/chapters/{subject}', (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  u.requireUser(e);
  const id = e.request.pathValue('subject');
  let s;
  try { s = e.app.findRecordById('subjects', id); } catch (_) { s = null; }
  if (!s || s.getBool('hidden')) throw new NotFoundError('Mata kuliah tidak ditemukan.');
  return e.json(200, { items: e.app.findRecordsByFilter('chapters', 'subject = {:s} && hidden = false && drilling = false', 'order,created', 300, 0, { s: s.id }).map((c) => ({ id: c.id, subject: s.id, title: c.getString('title') })) });
});

// Create or update the plan of an exam, then (re)plan all active plans together (shared capacity).
// body: { topics:[...], priority, dryRun }
routerAdd('POST', '/api/medcoel/study/exams/{exam}/plan', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const st = require(`${__hooks}/lib/study.js`); const P = require(`${__hooks}/lib/studyPlanner.js`);
  const user = u.requireUser(e);
  const x = st.ownExam(e.app, user, e.request.pathValue('exam'));
  const b = u.body(e);
  let topics;
  try { topics = st.validateSources(e.app, P.cleanTopics(b.topics)); } catch (err) { throw new BadRequestError(String(err.message || err)); }
  if (!topics.length) throw new BadRequestError('Pilih minimal satu topik.');
  const priority = Math.min(3, Math.max(1, parseInt(b.priority, 10) || 2));
  let plan = st.planForExam(e.app, user, x.id);
  if (b.dryRun) {
    if (!plan) {
      // preview for a plan that does not exist yet: temporary in-memory plan through overrides
      plan = new Record(e.app.findCollectionByNameOrId('study_plans'));
      plan.set('user', user.id); plan.set('exam', x.id); plan.set('examTitle', x.getString('title')); plan.set('examAt', x.getString('examAt'));
      plan.set('timezone', x.getString('timezone')); plan.set('status', 'active'); plan.set('topics', topics); plan.set('priority', priority); plan.set('revision', 0);
      // computed inside a transaction that is always rolled back: nothing is stored
      let preview = null;
      try { e.app.runInTransaction((tx) => { tx.save(plan); preview = st.replan(tx, user, { dryRun: true }); throw new Error('__rollback__'); }); }
      catch (err) { if (!preview) throw err; }
      return e.json(200, preview);
    }
    const o = {}; o[plan.id] = { topics: topics, priority: priority };
    return e.json(200, st.replan(e.app, user, { dryRun: true, overrides: o }));
  }
  if (!plan) {
    plan = new Record(e.app.findCollectionByNameOrId('study_plans'));
    plan.set('user', user.id); plan.set('exam', x.id); plan.set('revision', 0);
  }
  plan.set('examTitle', x.getString('title')); plan.set('examAt', x.getString('examAt')); plan.set('timezone', x.getString('timezone')); plan.set('subject', x.getString('subject'));
  plan.set('topics', topics); plan.set('priority', priority); plan.set('status', 'active');
  e.app.save(plan);
  const out = st.replan(e.app, user, { reason: 'Rencana ' + x.getString('title') + ' diperbarui' });
  return e.json(200, Object.assign(out, { plan: plan.id }));
});

// Replan everything (missed sessions, changed availability or exam dates). dryRun shows the proposal first.
routerAdd('POST', '/api/medcoel/study/replan', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const st = require(`${__hooks}/lib/study.js`);
  const user = u.requireUser(e);
  const b = u.body(e);
  return e.json(200, st.replan(e.app, user, { dryRun: !!b.dryRun, reason: 'Jadwal disusun ulang' }));
});

// Mark a session done / not done / skipped. Manual completion only; quiz performance is reported separately.
routerAdd('POST', '/api/medcoel/study/sessions/{id}', (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const user = u.requireUser(e);
  const id = e.request.pathValue('id');
  if (!/^[a-z0-9]{15}$/.test(id)) throw new BadRequestError('Sesi tidak valid.');
  let s;
  try { s = e.app.findRecordById('study_sessions', id); } catch (_) { s = null; }
  if (!s || s.getString('user') !== user.id) throw new NotFoundError('Sesi tidak ditemukan.');
  const status = String(u.body(e).status || '');
  if (['done', 'planned', 'skipped'].indexOf(status) < 0) throw new BadRequestError('Status tidak dikenal.');
  if (s.getString('status') === 'missed' && status !== 'done') throw new BadRequestError('Sesi yang terlewat hanya bisa ditandai selesai.');
  s.set('status', status);
  s.set('completedAt', status === 'done' ? u.pbDate(new Date()) : '');
  e.app.save(s);
  return e.json(200, { id: s.id, status: status });
});

// Topic finished early (or reopened). The next replan stops scheduling its learning.
routerAdd('POST', '/api/medcoel/study/plans/{plan}/topics/{key}', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const st = require(`${__hooks}/lib/study.js`);
  const user = u.requireUser(e);
  const plan = st.ownPlan(e.app, user, e.request.pathValue('plan'));
  const key = e.request.pathValue('key');
  const topics = u.recJson(plan, 'topics', []);
  const t = topics.filter((x) => x.key === key)[0];
  if (!t) throw new NotFoundError('Topik tidak ditemukan.');
  t.learned = !!u.body(e).learned;
  plan.set('topics', topics);
  e.app.save(plan);
  return e.json(200, { key: key, learned: t.learned });
});

// Archive a plan (keeps all history; frees the shared capacity).
routerAdd('POST', '/api/medcoel/study/plans/{plan}/archive', (e) => {
  const u = require(`${__hooks}/lib/util.js`); const st = require(`${__hooks}/lib/study.js`);
  const user = u.requireUser(e);
  const plan = st.ownPlan(e.app, user, e.request.pathValue('plan'));
  plan.set('status', 'archived');
  e.app.save(plan);
  e.app.findRecordsByFilter('study_sessions', "plan = {:p} && status = 'planned'", '', 0, 0, { p: plan.id }).forEach((s) => e.app.delete(s));
  return e.json(200, { id: plan.id, status: 'archived' });
});
