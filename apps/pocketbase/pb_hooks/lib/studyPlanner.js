// STUDY PLANNER (pure, deterministic). Used by pb_hooks (Goja) and by node tests.
//
// Turns exams + topics + already-done work + one SHARED daily capacity into dated study sessions.
// No randomness, no AI: the same input always gives the same plan, and every decision can be explained.
// Rules (docs/EXAM_PLANNER_LAB.md):
//   - Work per topic: unstudied -> learn + short review later; studied -> review only. Minutes already done are subtracted.
//   - Per exam: a practice block (~15% of its learning load) and a final revision on H-1. Exam day is never planned.
//   - One capacity per day for the whole student (all exams share it). Rest days have 0.
//   - Earliest deadline first; a high/low exam priority shifts urgency by +-1.5 days. Within an exam: low confidence and
//     heavy topics first. Practice is released in the last 40% of the exam's window; a review of a newly learned topic
//     waits until the day after its learning. A second pass fills leftover minutes with pieces >= 10 min.
//   - Whatever cannot fit before its exam is returned as a SHORTFALL. Nothing is dropped silently.

const BASE = { light: 45, medium: 90, heavy: 150 };
const KIND_ORDER = { final: 0, learn: 1, practice: 2, review: 3 };
const MIN_CHUNK = 25; // first pass: no study fragments shorter than this (unless it finishes the item)
const FILL_CHUNK = 10; // second pass: fill the last free minutes of a day with short pieces
const DAY_CAP_PER_ITEM = 120; // first pass: spread long topics over several days
const FINAL_MIN = 60;

function round5(x) { return Math.max(5, Math.round(x / 5) * 5); }
function clampInt(v, lo, hi, dflt) { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; }

function dayNum(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000; }
function dateOf(n) { return new Date(n * 86400000).toISOString().slice(0, 10); }
function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(dayNum(s)); }
function addDays(s, k) { return dateOf(dayNum(s) + k); }
function daysBetween(a, b) { return Math.round(dayNum(b) - dayNum(a)); }
function weekday(s) { return new Date(dayNum(s) * 86400000).getUTCDay(); } // 0 = Sunday

/** Minutes of work a topic needs (before subtracting what was done). */
function topicNeeds(t) {
  const base = t.minutes ? clampInt(t.minutes, 15, 600, 90) : BASE[t.workload] || BASE.medium;
  const conf = clampInt(t.confidence, 1, 5, t.status === 'studied' ? 3 : 2);
  if (t.status === 'studied') return { learn: 0, review: Math.max(15, round5(base * (0.2 + (5 - conf) * 0.05))), base };
  return { learn: round5(base * (1 + (3 - conf) * 0.1)), review: Math.max(15, round5(base * 0.25)), base };
}

/** Per-day capacity of the student (shared by every exam). */
function capacityOf(profile, date) {
  if ((profile.restDates || []).indexOf(date) >= 0) return 0;
  const wk = profile.weekdayMinutes;
  if (Array.isArray(wk) && wk.length === 7 && wk[weekday(date)] !== null && wk[weekday(date)] !== undefined) return clampInt(wk[weekday(date)], 0, 960, 0);
  return clampInt(profile.dailyMinutes, 0, 960, 120);
}

/** Build the remaining work items of one exam. `done` = minutes already completed per topic/kind. */
function workItems(exam, examIdx, windowStart) {
  const items = [];
  const done = exam.done || {};
  const window = examIdx - windowStart; // planable days
  const lateRelease = windowStart + Math.floor(window * 0.6);
  let learnLoad = 0;
  (exam.topics || []).forEach((t, order) => {
    const need = topicNeeds(t);
    const d = done[t.key] || {};
    learnLoad += need.base;
    const learnLeft = t.learned ? 0 : Math.max(0, need.learn - (d.learn || 0));
    const reviewLeft = Math.max(0, need.review - (d.review || 0));
    const conf = clampInt(t.confidence, 1, 5, t.status === 'studied' ? 3 : 2);
    const weight = (5 - conf) * 10 + (t.workload === 'heavy' ? 3 : t.workload === 'light' ? 1 : 2);
    if (learnLeft > 0) items.push({ planId: exam.id, topicKey: t.key, kind: 'learn', left: learnLeft, total: need.learn, release: windowStart, weight: weight, order: order });
    // a studied topic can be reviewed any time (after new material in priority); a newly learned topic is reviewed after its learning
    if (reviewLeft > 0) items.push({ planId: exam.id, topicKey: t.key, kind: 'review', left: reviewLeft, total: need.review, release: windowStart, weight: weight, order: order, after: learnLeft > 0 ? t.key : null });
  });
  if (exam.practice !== false && (exam.topics || []).length) {
    const need = Math.max(30, round5(learnLoad * 0.15));
    const left = Math.max(0, need - ((done.__practice || {}).practice || 0));
    if (left > 0) items.push({ planId: exam.id, topicKey: null, kind: 'practice', left: left, total: need, release: lateRelease, weight: 0, order: 999 });
  }
  return items;
}

/**
 * plan({ today, profile, exams }) -> { days, sessions, shortfall, warnings, exams }
 * exams: [{ id, title, examDate, priority 1..3, topics:[{key,title,status,confidence,workload,minutes,learned}], done, practice }]
 * profile: { dailyMinutes, weekdayMinutes[7]|null, restDates[], todayMinutes? }
 */
function plan(input) {
  const today = input.today;
  if (!isDate(today)) throw new Error('today must be YYYY-MM-DD');
  const profile = input.profile || {};
  const active = (input.exams || []).filter((x) => isDate(x.examDate) && daysBetween(today, x.examDate) >= 1)
    .slice().sort((a, b) => (a.examDate < b.examDate ? -1 : a.examDate > b.examDate ? 1 : String(a.id) < String(b.id) ? -1 : 1));
  const lastIdx = active.reduce((m, x) => Math.max(m, daysBetween(today, x.examDate)), 0);
  const days = [];
  for (let i = 0; i < lastIdx; i++) {
    const date = addDays(today, i);
    let cap = capacityOf(profile, date);
    if (i === 0 && profile.todayMinutes !== undefined && profile.todayMinutes !== null) cap = Math.min(cap, clampInt(profile.todayMinutes, 0, 960, cap));
    days.push({ date: date, capacity: cap, used: 0 });
  }
  const sessions = [];
  const put = (dayIdx, item, minutes, part) => {
    days[dayIdx].used += minutes;
    sessions.push({ planId: item.planId, date: days[dayIdx].date, topicKey: item.topicKey, kind: item.kind, minutes: minutes, part: part });
  };

  // 1. Final revision on H-1 for every exam (reserved before anything else).
  const finals = [];
  active.forEach((x) => {
    const idx = daysBetween(today, x.examDate) - 1;
    const already = ((x.done || {}).__final || {}).final || 0;
    const want = Math.max(0, FINAL_MIN - already);
    if (x.final === false || want <= 0) return;
    const free = days[idx].capacity - days[idx].used;
    const m = Math.min(want, free >= MIN_CHUNK ? free : 0);
    if (m > 0) put(idx, { planId: x.id, topicKey: null, kind: 'final' }, m, 1);
    if (m < want) finals.push({ planId: x.id, topicKey: null, kind: 'final', left: want - m });
  });

  // 2. Work items of all exams, ordered by urgency.
  const items = [];
  active.forEach((x) => {
    const idx = daysBetween(today, x.examDate);
    const prio = clampInt(x.priority, 1, 3, 2);
    workItems(x, idx, 0).forEach((it) => {
      it.deadline = idx; // exclusive
      it.urgency = idx - (prio - 2) * 1.5;
      it.parts = 0;
      items.push(it);
    });
  });
  const learnLeft = (planId, key) => items.some((it) => it.planId === planId && it.topicKey === key && it.kind === 'learn' && it.left > 0);
  const learnDoneOn = {};
  // ties keep the student's own topic order (stable, explainable)
  items.sort((a, b) => a.urgency - b.urgency || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || b.weight - a.weight ||
    String(a.planId).localeCompare(String(b.planId)) || a.order - b.order);

  for (let d = 0; d < days.length; d++) {
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        const free = days[d].capacity - days[d].used;
        if (free <= 0) break;
        if (it.left <= 0 || d >= it.deadline || d < it.release) continue;
        if (it.after) { // review of a topic waits until the day after its learning is finished
          if (learnLeft(it.planId, it.after)) continue;
          const doneDay = learnDoneOn[it.planId + '|' + it.after];
          if (doneDay !== undefined && doneDay >= d) continue;
        }
        const cap = pass === 0 && it.kind === 'learn' ? DAY_CAP_PER_ITEM : Infinity;
        const room = Math.min(free, cap);
        let m = Math.min(it.left, room);
        if (it.kind === 'review' && m < it.left) continue; // short reviews are never split
        if (m < it.left && m < (pass === 0 ? MIN_CHUNK : FILL_CHUNK)) continue;
        if (pass === 0 && it.kind === 'learn' && m < it.left && it.left - m < MIN_CHUNK) m = it.left - MIN_CHUNK; // avoid a tiny tail
        if (m <= 0) continue;
        it.left -= m; it.parts++;
        const existing = sessions.find((s) => s.date === days[d].date && s.planId === it.planId && s.topicKey === it.topicKey && s.kind === it.kind);
        if (existing) { existing.minutes += m; days[d].used += m; } else put(d, it, m, it.parts);
        if (it.kind === 'learn' && it.left <= 0) learnDoneOn[it.planId + '|' + it.topicKey] = d;
      }
    }
  }

  // 3. Shortfall per exam: nothing is dropped silently.
  const shortfall = [];
  active.forEach((x) => {
    const left = items.filter((it) => it.planId === x.id && it.left > 0).concat(finals.filter((f) => f.planId === x.id));
    if (!left.length) return;
    const minutes = left.reduce((s, it) => s + it.left, 0);
    const planable = days.filter((d, i) => i < daysBetween(today, x.examDate) && d.capacity > 0).length;
    shortfall.push({
      planId: x.id, minutes: minutes,
      items: left.map((it) => ({ topicKey: it.topicKey, kind: it.kind, minutes: it.left })),
      extraPerDay: planable ? round5(minutes / planable) : null,
    });
  });

  // 4. Transparent warnings for competing exams.
  const warnings = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const gap = daysBetween(active[i].examDate, active[j].examDate);
      if (gap <= 1) warnings.push({ type: 'adjacent', planIds: [active[i].id, active[j].id], text: gap === 0 ? 'Dua ujian di hari yang sama.' : 'Dua ujian di hari berurutan.' });
    }
  }
  if (shortfall.length && active.length > 1) {
    warnings.push({ type: 'capacity', planIds: active.map((x) => x.id), text: 'Waktu belajar harian dipakai bersama oleh ' + active.length + ' ujian dan tidak cukup untuk semuanya.' });
  }
  // stable order inside each day: final first, then by urgency order
  const order = {}; items.forEach((it, i) => { order[it.planId + '|' + it.topicKey + '|' + it.kind] = i; });
  sessions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.kind === 'final' ? -1 : 0) - (b.kind === 'final' ? -1 : 0) ||
    (order[a.planId + '|' + a.topicKey + '|' + a.kind] || 0) - (order[b.planId + '|' + b.topicKey + '|' + b.kind] || 0)));
  return {
    days: days, sessions: sessions, shortfall: shortfall, warnings: warnings,
    exams: active.map((x) => ({ id: x.id, examDate: x.examDate, daysLeft: daysBetween(today, x.examDate) })),
  };
}

/** Per-day differences between two session lists (for the "review proposed changes" step). */
function diff(before, after, label) {
  const key = (s) => s.planId + '|' + (s.topicKey || '') + '|' + s.kind;
  const byDay = {};
  const add = (list, side) => list.forEach((s) => {
    const d = (byDay[s.date] = byDay[s.date] || { before: {}, after: {} });
    d[side][key(s)] = (d[side][key(s)] || 0) + s.minutes;
  });
  add(before, 'before'); add(after, 'after');
  const out = [];
  Object.keys(byDay).sort().forEach((date) => {
    const d = byDay[date], changes = [];
    const keys = Object.keys(d.before).concat(Object.keys(d.after)).filter((k, i, a) => a.indexOf(k) === i).sort();
    keys.forEach((k) => {
      const a = d.before[k] || 0, b = d.after[k] || 0;
      if (a === b) return;
      const [planId, topicKey, kind] = k.split('|');
      changes.push({ planId: planId, topicKey: topicKey || null, kind: kind, from: a, to: b, text: (label ? label({ planId: planId, topicKey: topicKey || null, kind: kind }) : k) + (a === 0 ? ' ditambahkan (' + b + ' mnt)' : b === 0 ? ' dipindahkan dari hari ini' : ' ' + a + ' → ' + b + ' mnt') });
    });
    if (changes.length) out.push({ date: date, changes: changes });
  });
  return out;
}

/** Validate and normalise topics coming from the client. */
function cleanTopics(list) {
  if (!Array.isArray(list)) throw new Error('topics must be an array');
  if (list.length > 80) throw new Error('Maksimal 80 topik per ujian.');
  const seen = {};
  return list.map((t, i) => {
    const title = String((t && t.title) || '').trim().slice(0, 160);
    if (!title) throw new Error('Topik ke-' + (i + 1) + ' belum punya nama.');
    let key = String((t && t.key) || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || ('t' + i);
    while (seen[key]) key = key + 'x';
    seen[key] = true;
    const source = t && t.source && t.source.type === 'chapter' && /^[a-z0-9]{15}$/.test(String(t.source.chapter || '')) && /^[a-z0-9]{15}$/.test(String(t.source.subject || ''))
      ? { type: 'chapter', subject: t.source.subject, chapter: t.source.chapter } : { type: 'custom' };
    return {
      key: key, title: title, source: source,
      status: t.status === 'studied' ? 'studied' : 'unstudied',
      confidence: clampInt(t.confidence, 1, 5, t.status === 'studied' ? 3 : 2),
      workload: BASE[t.workload] ? t.workload : 'medium',
      minutes: t.minutes ? clampInt(t.minutes, 15, 600, 90) : 0,
      learned: !!t.learned,
    };
  });
}

function cleanProfile(p) {
  p = p || {};
  const wk = Array.isArray(p.weekdayMinutes) && p.weekdayMinutes.length === 7 ? p.weekdayMinutes.map((v) => (v === null || v === '' || v === undefined ? null : clampInt(v, 0, 960, 0))) : null;
  const rest = (Array.isArray(p.restDates) ? p.restDates : []).filter(isDate).filter((v, i, a) => a.indexOf(v) === i).sort().slice(-120);
  const acts = (Array.isArray(p.activities) ? p.activities : []).filter((a) => ['materi', 'soal', 'flashcard', 'lab', 'drilling'].indexOf(a) >= 0);
  return { dailyMinutes: clampInt(p.dailyMinutes, 0, 960, 120), weekdayMinutes: wk, restDates: rest, activities: acts.length ? acts : ['materi', 'soal'] };
}

module.exports = { plan, diff, topicNeeds, capacityOf, cleanTopics, cleanProfile, addDays, daysBetween, isDate, BASE };
