// Study planner: deterministic scheduling scenarios from the Exam/Planner brief (docs/EXAM_PLANNER_LAB.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../pb_hooks/lib/studyPlanner.js');

const TODAY = '2026-11-20';
const topics = (n, studied = 0, extra = {}) => Array.from({ length: n }, (_, i) => ({ key: 'k' + i, title: 'Topik ' + String.fromCharCode(65 + i), status: i < studied ? 'studied' : 'unstudied', workload: 'medium', ...extra }));
const exam = (id, inDays, list, more = {}) => ({ id, title: id, examDate: P.addDays(TODAY, inDays), priority: 2, topics: list, ...more });
const minutesOf = (r, pred) => r.sessions.filter(pred).reduce((s, x) => s + x.minutes, 0);

function invariants(r, input) {
  for (const d of r.days) {
    const used = r.sessions.filter((s) => s.date === d.date).reduce((s, x) => s + x.minutes, 0);
    assert.ok(used <= d.capacity, `capacity exceeded on ${d.date}: ${used} > ${d.capacity}`);
    assert.equal(used, d.used);
  }
  for (const s of r.sessions) {
    const x = input.exams.find((e) => e.id === s.planId);
    assert.ok(s.date < x.examDate, 'no session on/after exam day');
    assert.ok(s.date >= TODAY, 'no session in the past');
    assert.ok(s.minutes >= 5);
  }
}

test('five days left, 12 topics of which 5 studied: new material first, short reviews, final revision on H-1', () => {
  // demand: 7 x 100 learn + 12 x 25 review + 160 practice + 60 final = 1220 min -> 260 min/day fits
  const input = { today: TODAY, profile: { dailyMinutes: 260 }, exams: [exam('ujian', 5, topics(12, 5))] };
  const r = P.plan(input);
  invariants(r, input);
  assert.deepEqual(r.shortfall, []);
  // the 7 unstudied topics are learned; the 5 studied ones are only reviewed (never assigned as new material)
  const learned = new Set(r.sessions.filter((s) => s.kind === 'learn').map((s) => s.topicKey));
  assert.deepEqual([...learned].sort(), ['k10', 'k11', 'k5', 'k6', 'k7', 'k8', 'k9']);
  for (const k of ['k0', 'k1', 'k2', 'k3', 'k4']) {
    assert.equal(minutesOf(r, (s) => s.topicKey === k && s.kind === 'learn'), 0);
    assert.ok(minutesOf(r, (s) => s.topicKey === k && s.kind === 'review') > 0, 'studied topic gets a short review');
    assert.ok(minutesOf(r, (s) => s.topicKey === k) < 45, 'review is short');
  }
  const h1 = P.addDays(TODAY, 4);
  assert.ok(r.sessions.some((s) => s.date === h1 && s.kind === 'final'), 'final revision on H-1');
  assert.ok(r.sessions.some((s) => s.kind === 'practice'), 'practice block planned');
  // all learning is finished before H-1 so the last day is revision/practice
  assert.equal(minutesOf(r, (s) => s.kind === 'learn' && s.date === h1), 0);
});

test('insufficient daily time: the shortfall is explicit, never an impossible schedule', () => {
  const input = { today: TODAY, profile: { dailyMinutes: 60 }, exams: [exam('ujian', 5, topics(12, 0))] };
  const r = P.plan(input);
  invariants(r, input);
  assert.equal(r.shortfall.length, 1);
  const s = r.shortfall[0];
  assert.ok(s.minutes > 500 && s.extraPerDay > 100, JSON.stringify({ minutes: s.minutes, extra: s.extraPerDay }));
  assert.ok(s.items.some((i) => i.kind === 'learn'));
  const scheduled = r.sessions.reduce((a, x) => a + x.minutes, 0);
  assert.ok(scheduled >= 0.95 * 5 * 60, 'available time is used: ' + scheduled);
});

test('none studied vs mostly studied', () => {
  const none = P.plan({ today: TODAY, profile: { dailyMinutes: 300 }, exams: [exam('a', 7, topics(8, 0))] });
  const most = P.plan({ today: TODAY, profile: { dailyMinutes: 300 }, exams: [exam('a', 7, topics(8, 7))] });
  const total = (r) => r.sessions.reduce((a, x) => a + x.minutes, 0);
  // fixed per-exam work (practice block + final revision) remains, so compare the topic work only
  const topicWork = (r) => r.sessions.filter((s) => s.topicKey).reduce((a, x) => a + x.minutes, 0);
  assert.ok(topicWork(most) < topicWork(none) * 0.35, `${topicWork(most)} vs ${topicWork(none)}`);
  assert.ok(total(most) < total(none));
  assert.equal(most.sessions.filter((s) => s.kind === 'learn').length > 0, true, 'the one unstudied topic is learned');
  assert.equal(new Set(most.sessions.filter((s) => s.kind === 'learn').map((s) => s.topicKey)).size, 1);
});

test('two exams on adjacent days share one daily capacity and get a warning', () => {
  const input = { today: TODAY, profile: { dailyMinutes: 180 }, exams: [exam('anat', 4, topics(5, 1)), exam('fisio', 5, topics(5, 1))] };
  const r = P.plan(input);
  invariants(r, input);
  assert.ok(r.warnings.some((w) => w.type === 'adjacent'));
  // both exams receive work, and on H-1 of the first exam its final revision is present
  assert.ok(minutesOf(r, (s) => s.planId === 'anat') > 0 && minutesOf(r, (s) => s.planId === 'fisio') > 0);
  assert.ok(r.sessions.some((s) => s.planId === 'anat' && s.kind === 'final' && s.date === P.addDays(TODAY, 3)));
});

test('three exams competing for the same hours: no double booking, priorities are respected, conflict is explained', () => {
  const base = [exam('a', 6, topics(6)), exam('b', 6, topics(6)), exam('c', 7, topics(6))];
  const input = { today: TODAY, profile: { dailyMinutes: 150 }, exams: base };
  const r = P.plan(input);
  invariants(r, input);
  assert.ok(r.shortfall.length >= 1, 'demand exceeds capacity');
  assert.ok(r.warnings.some((w) => w.type === 'capacity'));
  // raising b's priority moves its shortfall onto the others
  const pr = P.plan({ ...input, exams: base.map((x) => (x.id === 'b' ? { ...x, priority: 3 } : x)) });
  invariants(pr, input);
  const short = (res, id) => res.shortfall.find((s) => s.planId === id)?.minutes || 0;
  assert.ok(short(pr, 'b') < short(r, 'b') || short(r, 'b') === 0, 'priority reduces the high-priority exam shortfall');
  assert.ok(minutesOf(pr, (s) => s.planId === 'b') >= minutesOf(r, (s) => s.planId === 'b'));
});

test('missed day and replanning: done work is kept, remaining work moves forward, diff explains the change', () => {
  const ex = exam('a', 6, topics(6, 2));
  const first = P.plan({ today: TODAY, profile: { dailyMinutes: 180 }, exams: [ex] });
  // student completed day 1 but missed day 2: replan from day 3 with day-1 work done
  const day1 = first.sessions.filter((s) => s.date === TODAY);
  const done = {};
  for (const s of day1) { const k = s.topicKey || (s.kind === 'practice' ? '__practice' : '__final'); (done[k] = done[k] || {})[s.kind] = (done[k][s.kind] || 0) + s.minutes; }
  const today2 = P.addDays(TODAY, 2);
  const re = P.plan({ today: today2, profile: { dailyMinutes: 180 }, exams: [{ ...ex, done }] });
  for (const s of day1.filter((x) => x.kind === 'learn')) {
    const need = P.topicNeeds(ex.topics.find((t) => t.key === s.topicKey)).learn;
    const planned = re.sessions.filter((x) => x.topicKey === s.topicKey && x.kind === 'learn').reduce((a, x) => a + x.minutes, 0);
    assert.equal(planned, Math.max(0, need - done[s.topicKey].learn), 'only the remaining part of a started topic is planned');
  }
  assert.ok(re.sessions.every((s) => s.date >= today2));
  const changes = P.diff(first.sessions.filter((s) => s.date >= today2), re.sessions, (k) => k.topicKey || k.kind);
  assert.ok(changes.length > 0 && changes[0].changes[0].text.length > 0);
});

test('exam date change: plan follows the new date, nothing remains after it', () => {
  const ex = exam('a', 10, topics(4));
  const moved = P.plan({ today: TODAY, profile: { dailyMinutes: 120 }, exams: [{ ...ex, examDate: P.addDays(TODAY, 4) }] });
  assert.ok(moved.sessions.every((s) => s.date < P.addDays(TODAY, 4)));
  const later = P.plan({ today: TODAY, profile: { dailyMinutes: 120 }, exams: [ex] });
  assert.ok(later.sessions.some((s) => s.date >= P.addDays(TODAY, 4)));
});

test('custom topic without MEDCOEL content, rest days, weekday availability, early completion', () => {
  const clean = P.cleanTopics([{ title: 'Topik catatan dosen (tanpa materi MEDCOEL)', status: 'unstudied', workload: 'heavy' }, { title: 'BAB 1', source: { type: 'chapter', subject: 'aaaaaaaaaaaaaaa', chapter: 'bbbbbbbbbbbbbbb' } }]);
  assert.equal(clean[0].source.type, 'custom');
  assert.equal(clean[1].source.type, 'chapter');
  const rest = P.addDays(TODAY, 1);
  const r = P.plan({ today: TODAY, profile: { dailyMinutes: 120, restDates: [rest], weekdayMinutes: [0, null, null, null, null, null, null] }, exams: [exam('a', 6, clean)] });
  assert.ok(r.sessions.some((s) => s.topicKey === clean[0].key && s.kind === 'learn'), 'custom topic is planned');
  assert.ok(!r.sessions.some((s) => s.date === rest), 'rest day respected');
  assert.ok(!r.sessions.some((s) => new Date(s.date + 'T00:00:00Z').getUTCDay() === 0), 'Sunday set to 0 minutes');
  const early = P.plan({ today: TODAY, profile: { dailyMinutes: 120 }, exams: [exam('a', 6, clean.map((t, i) => (i === 0 ? { ...t, learned: true } : t)))] });
  assert.equal(minutesOf(early, (s) => s.topicKey === clean[0].key && s.kind === 'learn'), 0, 'topic completed early is not re-planned');
});

test('deterministic and robust to input order; past and same-day exams are not planned', () => {
  const ex = [exam('b', 5, topics(5, 1)), exam('a', 5, topics(5, 2)), exam('past', -1, topics(3)), exam('now', 0, topics(3))];
  const r1 = P.plan({ today: TODAY, profile: { dailyMinutes: 150 }, exams: ex });
  const r2 = P.plan({ today: TODAY, profile: { dailyMinutes: 150 }, exams: [...ex].reverse() });
  assert.deepEqual(r1, r2);
  assert.ok(!r1.sessions.some((s) => s.planId === 'past' || s.planId === 'now'));
});

test('input validation', () => {
  assert.throws(() => P.plan({ today: '20-11-2026', exams: [] }));
  assert.throws(() => P.cleanTopics([{ title: '' }]), /nama/);
  assert.throws(() => P.cleanTopics(Array.from({ length: 81 }, (_, i) => ({ title: 'x' + i }))), /80/);
  const p = P.cleanProfile({ dailyMinutes: 99999, restDates: ['2026-11-21', 'bad', '2026-11-21'], weekdayMinutes: [1, 2, 3], activities: ['soal', 'rm -rf'] });
  assert.equal(p.dailyMinutes, 960); assert.deepEqual(p.restDates, ['2026-11-21']); assert.equal(p.weekdayMinutes, null); assert.deepEqual(p.activities, ['soal']);
});
