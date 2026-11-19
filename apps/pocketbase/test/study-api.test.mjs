// STUDY PLANNER API: real HTTP flows against a disposable LOCAL PocketBase (never production).
//   ./pocketbase migrate up --dir=./pb_data_study --migrationsDir=./pb_migrations --hooksDir=./pb_hooks
//   ./pocketbase superuser upsert study@medcoel.test study-test-password-123 --dir=./pb_data_study
//   MEDCOEL_DEV_MODE=1 ./pocketbase serve --http=127.0.0.1:8092 --dir=./pb_data_study --migrationsDir=./pb_migrations --hooksDir=./pb_hooks --hooksWatch=false
//   PB_URL=http://127.0.0.1:8092 PB_SU_EMAIL=study@medcoel.test PB_SU_PASSWORD=study-test-password-123 node test/study-api.test.mjs
import assert from 'node:assert/strict';
const base = process.env.PB_URL || 'http://127.0.0.1:8092';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw new Error('Study API tests must target localhost.');
let checks = 0;
async function call(method, path, body, token, status = 200) {
  const r = await fetch(base + path, { method, headers: { ...(token ? { Authorization: token } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  assert.equal(r.status, status, `${method} ${path}: ${text.slice(0, 400)}`); checks++; return data;
}
const api = (p) => '/api/medcoel/' + p;
const step = async (name, fn) => { await fn(); console.log('  ok', name); };
const su = (await call('POST', '/api/collections/_superusers/auth-with-password', { identity: process.env.PB_SU_EMAIL || 'study@medcoel.test', password: process.env.PB_SU_PASSWORD || 'study-test-password-123' })).token;
const run = Date.now().toString(36);
const PASSWORD = 'study-fixture-password';
async function account(tag) {
  const loginId = `st${tag}${run}`;
  const rec = await call('POST', '/api/collections/users/records', { loginId, name: 'Study ' + tag, email: `${loginId}@example.test`, password: PASSWORD, passwordConfirm: PASSWORD, role: 'user', verified: true }, su);
  const auth = await call('POST', '/api/collections/users/auth-with-password', { identity: loginId, password: PASSWORD });
  return { id: rec.id, loginId, token: auth.token };
}
const fmt = (d) => d.toISOString().replace('T', ' ');
const inDays = (n, hour = 1) => { const d = new Date(); d.setUTCHours(hour, 0, 0, 0); d.setUTCDate(d.getUTCDate() + n); return d; }; // 08:00 WIB
const A = await account('a'), B = await account('b');
const subjects = (await call('GET', '/api/collections/subjects/records?perPage=50&filter=' + encodeURIComponent('hidden=false'), undefined, su)).items;
assert.ok(subjects.length >= 3, 'seeded subjects available');

// fixtures: one subject with two visible chapters and one hidden chapter
const subj = subjects[0];
const ch = [];
for (const [title, hidden] of [['BAB A ' + run, false], ['BAB B ' + run, false], ['BAB tersembunyi ' + run, true]]) {
  ch.push(await call('POST', '/api/collections/chapters/records', { subject: subj.id, title, order: 900 + ch.length, hidden }, su));
}
const exams = [];
for (const [title, days, s] of [['UTB Anatomi', 5, subj], ['UAB Fisiologi', 6, subjects[1]], ['Kuis Biokimia', 7, subjects[2]]]) {
  exams.push(await call('POST', '/api/collections/exam_schedules/records', { user: A.id, subject: s.id, title, examAt: fmt(inDays(days)), timezone: 'WIB', reminderDays: [3, 1] }, A.token));
}
const topicsFor = (n, studied, extra = []) => [...Array.from({ length: n }, (_, i) => ({ title: 'Topik ' + (i + 1), status: i < studied ? 'studied' : 'unstudied', workload: 'medium' })), ...extra];

await step('authentication and locked collections', async () => {
  await call('GET', api('study/overview'), undefined, undefined, 401);
  for (const c of ['study_plans', 'study_sessions', 'study_profiles', 'lab_track_progress']) await call('GET', `/api/collections/${c}/records`, undefined, A.token, 403);
  await call('POST', '/api/collections/study_plans/records', { user: A.id, status: 'active' }, A.token, 403);
});

await step('three exams coexist with independent data; overview lists them without plans', async () => {
  const o = await call('GET', api('study/overview'), undefined, A.token);
  assert.equal(o.exams.length, 3);
  assert.ok(o.exams.every((x) => x.plan === null));
  assert.equal(o.timezone, 'WIB');
  await call('PATCH', `/api/collections/exam_schedules/records/${exams[2].id}`, { title: 'Kuis Biokimia (ubah)' }, A.token);
  const o2 = await call('GET', api('study/overview'), undefined, A.token);
  assert.deepEqual(o2.exams.map((x) => x.title), ['UTB Anatomi', 'UAB Fisiologi', 'Kuis Biokimia (ubah)'], 'editing one exam leaves the others unchanged');
});

let planA;
await step('profile + dry-run preview stores nothing; apply creates a persistent plan', async () => {
  const p = await call('PUT', api('study/profile'), { dailyMinutes: 150, restDates: ['bad-date'] }, A.token);
  assert.equal(p.dailyMinutes, 150); assert.deepEqual(p.restDates, []);
  const detail = await call('GET', api(`study/exams/${exams[0].id}`), undefined, A.token);
  assert.ok(detail.chapters.some((c) => c.id === ch[0].id) && !detail.chapters.some((c) => c.id === ch[2].id), 'hidden chapter not offered');
  const topics = [
    { title: ch[0].title, source: { type: 'chapter', subject: subj.id, chapter: ch[0].id }, status: 'unstudied' },
    { title: ch[1].title, source: { type: 'chapter', subject: subj.id, chapter: ch[1].id }, status: 'studied', confidence: 4 },
    { title: 'Hidden', source: { type: 'chapter', subject: subj.id, chapter: ch[2].id } },
    { title: 'Catatan dosen (tanpa materi MEDCOEL)', workload: 'heavy' },
    ...topicsFor(4, 1),
  ];
  const preview = await call('POST', api(`study/exams/${exams[0].id}/plan`), { topics, dryRun: true }, A.token);
  assert.ok(preview.sessions.length > 0 && preview.changes.length > 0);
  assert.equal((await call('GET', api('study/overview'), undefined, A.token)).exams[0].plan, null, 'dry run wrote nothing');
  const applied = await call('POST', api(`study/exams/${exams[0].id}/plan`), { topics, priority: 2 }, A.token);
  planA = applied.plan;
  const d = await call('GET', api(`study/exams/${exams[0].id}`), undefined, A.token);
  assert.equal(d.plan.topicList.length, 8);
  assert.equal(d.plan.topicList.find((t) => t.title === 'Hidden').source.type, 'custom', 'hidden chapter becomes a custom topic');
  assert.equal(d.plan.topicList.find((t) => t.title.startsWith('Catatan')).source.type, 'custom');
  assert.ok(d.sessions.length > 0 && d.sessions.every((s) => s.status === 'planned'));
  assert.ok(d.sessions.some((s) => s.kind === 'final'));
  assert.ok(Object.keys(d.resources).length >= 0);
});

await step('three exams share one daily capacity (no double booking)', async () => {
  await call('POST', api(`study/exams/${exams[1].id}/plan`), { topics: topicsFor(6, 2) }, A.token);
  await call('POST', api(`study/exams/${exams[2].id}/plan`), { topics: topicsFor(6, 0), priority: 3 }, A.token);
  const o = await call('GET', api('study/overview'), undefined, A.token);
  assert.ok(o.exams.every((x) => x.plan && x.plan.minutesPlanned > 0));
  for (const day of o.week) assert.ok(day.minutes <= day.capacity, `day ${day.date}: ${day.minutes} > ${day.capacity}`);
  assert.ok(o.todaySessions.length > 0, "today's tasks across exams");
});

await step('another student cannot read or change these plans', async () => {
  await call('GET', api(`study/exams/${exams[0].id}`), undefined, B.token, 404);
  await call('POST', api(`study/exams/${exams[0].id}/plan`), { topics: topicsFor(1, 0) }, B.token, 404);
  await call('POST', api(`study/plans/${planA}/archive`), {}, B.token, 404);
  const s = (await call('GET', api(`study/exams/${exams[0].id}`), undefined, A.token)).sessions[0];
  await call('POST', api(`study/sessions/${s.id}`), { status: 'done' }, B.token, 404);
  const ob = await call('GET', api('study/overview'), undefined, B.token);
  assert.equal(ob.exams.length, 0); assert.equal(ob.todaySessions.length, 0);
  await call('GET', `/api/collections/exam_schedules/records/${exams[0].id}`, undefined, B.token, 404);
});

await step('manual completion persists through replanning and re-login; history is never rewritten', async () => {
  const d = await call('GET', api(`study/exams/${exams[0].id}`), undefined, A.token);
  const first = d.sessions.find((s) => s.kind === 'learn');
  await call('POST', api(`study/sessions/${first.id}`), { status: 'done' }, A.token);
  await call('POST', api(`study/sessions/${first.id}`), { status: 'bogus' }, A.token, 400);
  await call('POST', api('study/replan'), {}, A.token);
  const relog = await call('POST', '/api/collections/users/auth-with-password', { identity: A.loginId, password: PASSWORD });
  const d2 = await call('GET', api(`study/exams/${exams[0].id}`), undefined, relog.token);
  const kept = d2.sessions.find((s) => s.id === first.id);
  assert.ok(kept && kept.status === 'done' && kept.minutes === first.minutes, 'done session kept unchanged');
  assert.ok(d2.plan.minutesDone >= first.minutes);
  assert.ok(d2.plan.revision >= 2);
});

await step('missed session is kept as history and work moves forward', async () => {
  const d = await call('GET', api(`study/exams/${exams[1].id}`), undefined, A.token);
  const victim = d.sessions.find((s) => s.status === 'planned');
  const yesterday = new Date(Date.now() + 7 * 3600000 - 86400000).toISOString().slice(0, 10);
  await call('PATCH', `/api/collections/study_sessions/records/${victim.id}`, { date: yesterday }, su); // simulate a missed day
  const o = await call('GET', api('study/overview'), undefined, A.token);
  assert.ok(o.exams.find((x) => x.id === exams[1].id).plan.stale.includes('missed'));
  const preview = await call('POST', api('study/replan'), { dryRun: true }, A.token);
  assert.ok(Array.isArray(preview.changes));
  await call('POST', api('study/replan'), {}, A.token);
  const d2 = await call('GET', api(`study/exams/${exams[1].id}`), undefined, A.token);
  assert.equal(d2.sessions.find((s) => s.id === victim.id).status, 'missed');
  assert.ok(!(await call('GET', api('study/overview'), undefined, A.token)).exams.find((x) => x.id === exams[1].id).plan.stale.includes('missed'));
  await call('POST', api(`study/sessions/${victim.id}`), { status: 'skipped' }, A.token, 400);
});

await step('exam date change: plan is flagged, reminders reset, replanned before the new date', async () => {
  await call('PATCH', `/api/collections/exam_schedules/records/${exams[1].id}`, { examAt: fmt(inDays(4)) }, A.token);
  const o = await call('GET', api('study/overview'), undefined, A.token);
  assert.ok(o.exams.find((x) => x.id === exams[1].id).plan.stale.includes('exam_changed'));
  const ex = await call('GET', `/api/collections/exam_schedules/records/${exams[1].id}`, undefined, su);
  assert.deepEqual(ex.remindersSent, [], 'existing reminder reset still works');
  await call('POST', api('study/replan'), {}, A.token);
  const d = await call('GET', api(`study/exams/${exams[1].id}`), undefined, A.token);
  const examDay = new Date(inDays(4).getTime() + 7 * 3600000).toISOString().slice(0, 10);
  assert.ok(d.sessions.filter((s) => s.status === 'planned').every((s) => s.date < examDay));
});

await step('insufficient daily time reports a shortfall instead of an impossible plan', async () => {
  await call('PUT', api('study/profile'), { dailyMinutes: 20 }, A.token);
  const o = await call('GET', api('study/overview'), undefined, A.token);
  assert.ok(o.exams.some((x) => x.plan?.stale.includes('availability_changed')));
  const p = await call('POST', api('study/replan'), { dryRun: true }, A.token);
  assert.ok(p.shortfall.length >= 1 && p.shortfall[0].minutes > 0 && p.shortfall[0].extraPerDay > 0);
  await call('PUT', api('study/profile'), { dailyMinutes: 150 }, A.token);
});

await step('topic finished early and deleting an exam keep history', async () => {
  const d = await call('GET', api(`study/exams/${exams[2].id}`), undefined, A.token);
  const key = d.plan.topicList[0].key;
  await call('POST', api(`study/plans/${d.plan.id}/topics/${key}`), { learned: true }, A.token);
  await call('POST', api(`study/plans/${d.plan.id}/topics/nope`), { learned: true }, A.token, 404);
  await call('POST', api('study/replan'), {}, A.token);
  const d2 = await call('GET', api(`study/exams/${exams[2].id}`), undefined, A.token);
  assert.ok(!d2.sessions.some((s) => s.status === 'planned' && s.topicKey === key && s.kind === 'learn'));
  const s = d2.sessions.find((x) => x.status === 'planned');
  await call('POST', api(`study/sessions/${s.id}`), { status: 'done' }, A.token);
  await call('DELETE', `/api/collections/exam_schedules/records/${exams[2].id}`, undefined, A.token, 204);
  await call('POST', api('study/replan'), {}, A.token);
  const o = await call('GET', api('study/overview'), undefined, A.token);
  assert.equal(o.exams.length, 2);
  const arch = o.archived.find((p) => p.id === d.plan.id);
  assert.ok(arch && arch.minutesDone >= s.minutes, 'archived plan keeps its completed minutes');
  const stored = await call('GET', `/api/collections/study_sessions/records?filter=${encodeURIComponent(`plan='${d.plan.id}' && status='done'`)}`, undefined, su);
  assert.ok(stored.items.length >= 1);
});

console.log(`study api: ${checks} HTTP checks passed`);
