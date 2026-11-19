/// <reference path="../pb_data/types.d.ts" />
// STUDY PLANNER + LAB TRACK PROGRESS (additive only; docs/EXAM_PLANNER_LAB.md).
//
// exam_schedules stays exactly as it is (reminders keep working). New collections are locked (rules null):
// every read/write goes through /api/medcoel/study/* and /api/medcoel/lab/tracks/*, which enforce ownership,
// validate input and preserve history (done sessions are never rewritten).
migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  const exams = app.findCollectionByNameOrId('exam_schedules');
  const rel = (name, c, opts) => Object.assign({ name: name, type: 'relation', collectionId: c.id, maxSelect: 1, cascadeDelete: false }, opts || {});
  const auto = [{ name: 'created', type: 'autodate', onCreate: true }, { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }];
  const locked = { type: 'base', listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null };

  // One per user: the daily study time shared by ALL exams.
  app.save(new Collection(Object.assign({}, locked, {
    name: 'study_profiles',
    fields: [
      rel('user', users, { required: true, cascadeDelete: true }),
      { name: 'dailyMinutes', type: 'number', onlyInt: true, min: 0, max: 960 },
      { name: 'weekdayMinutes', type: 'json', maxSize: 400 },
      { name: 'restDates', type: 'json', maxSize: 4000 },
      { name: 'activities', type: 'json', maxSize: 400 },
    ].concat(auto),
    indexes: ['CREATE UNIQUE INDEX idx_study_profiles_user ON study_profiles (user)'],
  })));

  // One per exam. `exam` is optional and NOT cascading: deleting an exam keeps the plan (archived) and its history.
  const plans = new Collection(Object.assign({}, locked, {
    name: 'study_plans',
    fields: [
      rel('user', users, { required: true, cascadeDelete: true }),
      rel('exam', exams),
      { name: 'examTitle', type: 'text', max: 200 },
      { name: 'examAt', type: 'date' },
      { name: 'timezone', type: 'text', max: 8 },
      { name: 'subject', type: 'text', max: 15 },
      { name: 'priority', type: 'number', onlyInt: true, min: 1, max: 3 },
      { name: 'topics', type: 'json', maxSize: 60000 },
      { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['active', 'archived'] },
      { name: 'revision', type: 'number', onlyInt: true, min: 0 },
      { name: 'plannedExamAt', type: 'date' },
      { name: 'note', type: 'text', max: 2000 },
      { name: 'shortfall', type: 'json', maxSize: 20000 },
    ].concat(auto),
    indexes: ['CREATE INDEX idx_study_plans_user ON study_plans (user, status)', 'CREATE INDEX idx_study_plans_exam ON study_plans (exam)'],
  }));
  app.save(plans);

  // Dated sessions. `done` rows are history and are never rewritten by replanning.
  app.save(new Collection(Object.assign({}, locked, {
    name: 'study_sessions',
    fields: [
      rel('user', users, { required: true, cascadeDelete: true }),
      rel('plan', plans, { required: true, cascadeDelete: true }),
      { name: 'date', type: 'text', required: true, max: 10, pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      { name: 'topicKey', type: 'text', max: 40 },
      { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['learn', 'review', 'practice', 'final'] },
      { name: 'minutes', type: 'number', onlyInt: true, min: 1, max: 960 },
      { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['planned', 'done', 'skipped', 'missed'] },
      { name: 'completedAt', type: 'date' },
      { name: 'revision', type: 'number', onlyInt: true, min: 0 },
    ].concat(auto),
    indexes: ['CREATE INDEX idx_study_sessions_user_date ON study_sessions (user, date)', 'CREATE INDEX idx_study_sessions_plan ON study_sessions (plan, status)'],
  })));

  // Organ / clinical-skill Lab tracks are configuration (shared/lab-tracks.json); only progress is stored.
  app.save(new Collection(Object.assign({}, locked, {
    name: 'lab_track_progress',
    fields: [
      rel('user', users, { required: true, cascadeDelete: true }),
      { name: 'track', type: 'text', required: true, max: 60, pattern: '^[a-z0-9-]+$' },
      { name: 'completed', type: 'json', maxSize: 4000 },
      { name: 'lastStep', type: 'text', max: 60 },
    ].concat(auto),
    indexes: ['CREATE UNIQUE INDEX idx_lab_track_progress ON lab_track_progress (user, track)'],
  })));
}, () => {
  // Rollback is code-only: keep student plans and history (same policy as Lab, docs/LAB.md).
  throw new Error('Study planner rollback preserves data. Revert application code; do not drop these collections.');
});
