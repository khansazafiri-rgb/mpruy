# Exam Center, Study Planner & segmented Lab — architecture and status

Branch: `claude/confident-faraday-e9id72`, based on the default branch `claude/focused-wozniak-1ayrxa` @ `2542ecb` (PR #218).
Reference material: the master context document (19 Nov 2026) and the three reference videos named in the brief were
**not attached to this session**. This plan is built from the repository and the written brief. Re-check it against the
videos before public release.

## Loop 0 — capability inventory

| Capability | State | Where | Notes |
|---|---|---|---|
| Multiple exams per user (create/edit/delete) | EXISTING | `exam_schedules`, `pages/Schedule.jsx` (`/jadwal`) | Owner-only collection rules; title, subject, `examAt` (UTC), timezone WIB/WITA/WIT, reminder days |
| Reminders H-n (web + email, de-duplicated per day) | EXISTING | `pb_hooks/cron.pb.js`, `lib/jobs.js` `examReminders` | `remindersSent` reset when `examAt` changes. Must not be duplicated |
| Nearest exam highlighted + countdown | EXISTING | `Schedule.jsx`, `Home.jsx`, `/api/medcoel/progress` `nextExam` | Only the nearest has a live countdown |
| Multi-exam overview with plan status, progress, workload | DONE (Loop 1) | `Schedule.jsx` | No per-exam plan status/progress, no week workload view |
| Study plans, topics, daily sessions, rescheduling | DONE (Loop 2) | `StudyPlan.jsx`, `lib/study*.js` | New, additive |
| Shared daily study capacity across exams | DONE (Loop 2) | `study_profiles` | New `study_profiles` |
| Topic sources: subjects → chapters, notes, flashcards, question counts (campus-filtered) | EXISTING | `/api/medcoel/subjects/{slug}`, `/mata-kuliah/:slug/materi/:id`, `/flashcard/:id`, `?bab=` practice | Reused for planner links |
| Verified practice performance per chapter | EXISTING | `learn.pool` (answered/wrong per chapter) | Shown next to manual completion, never merged with it |
| Lab by academic discipline (7 roots), Guided + Explore | EXISTING | `pages/Lab.jsx`, `shared/lab-taxonomy.json`, `lab/catalog` | Must stay intact (URLs, progress) |
| Lab pathways + progress (`lab_pathways`, `lab_path_steps`, `lab_progress`) | EXISTING | `lib/labProgress.js` | Steps can only reference `lab_objects` |
| Lab by body system / clinical skill | DONE (Loop 3) | `shared/lab-tracks.json`, `LabHub.jsx`, `LabTrack.jsx` | Mapping layer over existing resources |
| Guided organ/skill tracks (Chest, Heart, Brain, BP, cardiac/pulmonary auscultation, ECG) | DONE where content exists; gaps shown as planned (Loop 3) | Atlas 3D, Live 4D, Lab modules, ECG module | Some steps exist (Atlas, Live 4D auscultation/US/CT, CXR module). BP, ECG, neuro-imaging content is missing |
| "All-in-One Lab" | not a named feature | — | Defined here as: the full Lab index (Guided/Explore) + Atlas 3D + Live 4D, reachable from one Lab home |
| Atlas structure identification ("Kenali Struktur", "Temukan di 3D") | EXISTING | `/anatomy/study`, `features/anatomy/study.mjs` | Reference B is mostly covered. Linked from tracks, not rebuilt |
| Neuroanatomy with MRI/DTI side-by-side | BLOCKED | — | No licensed brain imaging dataset or validated registration. `nervous.glb` is withheld by the licence quarantine (`licensing/`) |
| ECG conduction ↔ waveform education | DONE (Loop 4, schematic) | `/lab/ekg`, `features/lab/ecg/ecgModel.js` | New schematic module, labelled as non-diagnostic |
| Specialised 4D work (`feature/4d-lab-official-logo-guided-tour`, 256 commits) | not in default branch | separate branch | Not touched here. This work stays in `apps/web` + PocketBase |

## Dependency map
```
exam_schedules ──1:1── study_plans ──1:n── study_sessions
      │                    │ topics[] (JSON) ── source: chapter (subjects/chapters) | custom
      └─ reminders (cron, unchanged)
study_profiles (1 per user: shared daily capacity, rest days)  ──► planner (pure, deterministic) ──► sessions
lab tracks (shared/lab-tracks.json) ──refs──► lab modules / lab objects / pathways / Atlas / Live 4D / subjects
lab_track_progress (1 per user per track)
```
Delivered without modifying legacy components: everything except small additive edits to `Schedule.jsx`, `Home.jsx`, `Lab.jsx`, `App.jsx` and the anatomy/4D host links.

## Data model (additive migration `1800003100_study_planner.js`)
| Collection | Purpose | Access |
|---|---|---|
| `study_profiles` | user, dailyMinutes, weekdayMinutes[7], restDates[], activities[] | rules `null`; only through `/api/medcoel/study/*` |
| `study_plans` | user, exam (optional relation, **no cascade**), examTitle/examAt/timezone snapshot, priority 1–3, topics JSON, status, revision, note, shortfall | rules `null` |
| `study_sessions` | user, plan, date (YYYY-MM-DD local), topicKey, kind learn/review/practice/final, minutes, status planned/done/skipped/missed, completedAt, revision | rules `null` |
| `lab_track_progress` | user, track key, completed[], lastStep | rules `null` |

Why rules are `null`: generation and replanning read **all** of a user's plans to share capacity. Doing every write through
one server module keeps ownership checks, input validation and history preservation in one place, as Lab does.
`exam_schedules` is unchanged. Deleting an exam clears the plan's exam link (PocketBase behaviour for non-required,
non-cascade relations) and the plan becomes `archived` with its sessions kept.

## Planner algorithm (`pb_hooks/lib/studyPlanner.js`, pure and deterministic)
1. **Work items per exam.** An unstudied topic gets `learn` (light 45 / medium 90 / heavy 150 min, scaled by low confidence) and a later
   `review` (25%). An already studied topic gets `review` only (20–40% depending on confidence). Each exam gets `practice` (~15% of its
   learning load, min 30), plus `final` revision on H-1. Minutes already completed are subtracted, so done work is never re-assigned.
2. **Capacity.** One per-day capacity per **user** (weekday overrides, rest dates) shared by all exams. Exam day itself is not planned.
3. **Order.** Earliest-deadline-first over all exams. A user priority of high/low moves an exam ±1.5 days in urgency.
   Inside an exam: learning before practice before review, heavier work first, then the order the student listed topics.
   A review is released only after its topic's learning is placed; topic practice is released in the last 40% of the window.
   Ties are broken by stable ids, so the same input always gives the same schedule.
4. **Fill.** Day by day, up to capacity, in two passes: first in ≥ 25-minute parts (max 120 min of one topic per day), then
   remaining gaps are filled in 10-minute steps. Reviews are never split. The H-1 final revision (60 min) is reserved first.
5. **Shortfall.** Anything that cannot be placed before its exam is reported per exam (minutes, topics, extra minutes per day
   needed). It is never silently dropped.
6. **Replanning.** Past planned-but-not-done sessions become `missed` (kept). Future planned sessions are regenerated. `done` sessions
   are never touched. The response lists per-day differences, so the student can review a proposal (`dryRun`) before applying it.

## Acceptance criteria (tests)
Unit (`apps/pocketbase/test/studyPlanner.test.mjs`): 5-day exam with 12 topics/5 studied; adjacent exams; three exams sharing
capacity; mostly studied; none studied; insufficient time → shortfall; missed day; exam date change; custom topic; capacity never exceeded;
done work preserved; determinism.
API (`apps/pocketbase/test/study-api.test.mjs`, local disposable DB): ownership isolation, validation, persistence across logins,
exam deletion keeps history, reminders unchanged.
Browser: Exam Center with 3 exams, planner wizard, Today view, Lab home entry points, desktop + mobile screenshots.

Status of each loop: see "Iteration reports" below.

## API (all routes require a signed-in student; every record is owner-only, other users get 404)
| Route | Purpose |
|---|---|
| `GET /api/medcoel/study/overview` | all exams with plan summary, archived plans, today's sessions (with resource links), 14-day load vs capacity, profile |
| `PUT /api/medcoel/study/profile` | daily minutes, per-weekday minutes, rest dates, preferred activities (shared by all exams) |
| `GET /api/medcoel/study/exams/{exam}` | exam, chapters of its subject (campus-visible only), plan with topics/sessions, verified practice stats |
| `GET /api/medcoel/study/chapters/{subject}` | chapter picker for another subject (hidden subjects/chapters excluded) |
| `POST /api/medcoel/study/exams/{exam}/plan` | create/update the plan `{topics, priority, dryRun}`; `dryRun` writes nothing and returns the preview |
| `POST /api/medcoel/study/replan` | recompute all active plans `{dryRun}`; returns per-day differences |
| `POST /api/medcoel/study/sessions/{id}` | mark `done`/`planned`/`skipped` (a `missed` session may only become `done`) |
| `POST /api/medcoel/study/plans/{plan}/topics/{key}` | mark a topic learned early `{learned}` |
| `POST /api/medcoel/study/plans/{plan}/archive` | archive a plan (history kept) |

The four new collections have `null` API rules (no direct REST access). Reminders (`exam_schedules.remindersSent`, the hourly
cron) are unchanged.

## Iteration reports

### Iteration 1–2 — Exam Center + Study Planner (P0)
- **Baseline.** `exam_schedules` already supported several exams per user with H-7/H-3/H-1 reminders, an exam list (`/jadwal`) and
  a nearest-exam countdown on Home. No study planning existed.
- **Changes.** `/jadwal` became *Pusat ujian*: countdown per exam (nearest highlighted), plan status/progress per exam, a list/calendar
  switch, a 14-day shared-load chart, past exams and archived plans. New `/jadwal/:exam/rencana` (setup wizard with preview,
  daily plan, topic list, change proposals) and `/rencana-belajar` (today's sessions across exams). Home shows today's tasks and the
  other upcoming exams under the nearest one. Server: pure planner library, `study` helper library, routes above, additive migration.
- **Files.** `apps/pocketbase/pb_hooks/lib/{studyPlanner,study}.js`, `apps/pocketbase/pb_hooks/study.pb.js`,
  `apps/pocketbase/pb_migrations/1800003100_study_planner.js`, `apps/web/src/pages/{Schedule,StudyPlan,StudyToday,Home}.jsx`,
  `apps/web/src/features/study/studyLib.js`, `apps/web/src/{App.jsx,components/AppShell.jsx,lib/serverVersion.js}`, tests, CI step.
- **Tests.** Planner unit 10/10 (all 10 acceptance scenarios + invariants); study API 70 checks on a disposable local PocketBase
  (`npm run test:study --prefix apps/pocketbase`, also in CI); web 143/143; build OK; browser journey
  `scripts/study-planner-e2e.mjs` passes (desktop 1360×900 + mobile 390×844, no horizontal scroll, no runtime errors).
- **Bugs found by the browser run and fixed.** (1) After saving a first plan the page went blank (plan view rendered before the
  reload). (2) On phones, exam cards squeezed the text into a narrow column. (3) The extra nav item made the crowded desktop nav
  overflow; *Rencana belajar* is now reached from Home, Pusat ujian and the mobile menu.
- **Visual evidence.** `docs/evidence/study/01…10-*.jpg` (local QA data, fictitious student).
- **Compatibility.** `/jadwal` URL, exam form, reminders and existing exam records unchanged; deleting an exam archives its plan
  instead of deleting history. Deploy order: migration + hooks first (the web app checks `REQUIRED_MIGRATION = 1800003100`).
- **Medical/licensing.** No new medical content; links only to existing MEDCOEL chapters/flashcards/practice visible to the student's campus.
- **Known limitations.** Time zone per user is taken from the nearest exam; no calendar export; the session "done" mark is
  self-reported (verified practice numbers are shown separately).
- **Status.** Implemented and verified locally. Not deployed.


### Iteration 3 — Lab entry points by body system and clinical skill (P1)
- **Baseline.** `/lab` offered the seven academic disciplines through Guided Learning and Explore, plus pathway "continue". Atlas 3D,
  the Atlas quiz and the Live 4D Lab were reachable only from `/anatomy`. Nothing grouped content by organ system or skill.
- **Changes.** `shared/lab-tracks.json` defines 7 body-system and 7 clinical-skill tracks. Every step points at content that
  exists (Atlas system/region pages, Atlas quiz, Live 4D scenario, published Lab module, ECG module) or is marked *planned* with
  a reason. On `/lab`, above the unchanged Guided/Explore index: *Lanjutkan jalur*, an **All-in-One Lab** panel (Atlas 3D, Live 4D,
  all Lab material), and cards for each track with "x/y langkah tersedia". Track pages `/lab/sistem/:track` and
  `/lab/keterampilan/:track` list the steps, open them, and keep a self-marked "selesai" per step (`lab_track_progress`, routes
  `GET /api/medcoel/lab/tracks`, `POST /api/medcoel/lab/tracks/{track}` with `{step, done?}`).
- **Availability rules.** Planned steps, Atlas systems withheld by the licence quarantine (`UNAVAILABLE_SYSTEMS`, currently
  *nervous*), and Lab modules that are not published are shown as "belum tersedia" with the reason, never get a "Tandai selesai"
  button, and are excluded from progress. The server refuses to complete a planned step. A track counts as done only over the
  steps available now, and says so ("partial").
- **Live 4D deep link.** `/anatomy/live?scenario=<key>&ws=<workspace>` passes only these two whitelisted keys to the frame
  (`liveLabSrc`); the 4D Lab applies them after loading and ignores unknown values (`applyDeepLink` in `apps/4d-lab/src/app/main.js`).
- **Tests.** `labTracks.test.mjs` (web): every link resolves to a real Atlas system/region, quiz mode, 4D scenario/workspace,
  web route or taxonomy module; the brief's proposed tracks exist; availability and progress rules. `labTracks.test.mjs`
  (PocketBase): server registry equals the shared file. Study API test: +12 HTTP checks (401, unknown track 404, wrong/planned
  step 400, owner isolation, locked collection). 4D Lab UX e2e: deep link step. Browser journey `scripts/lab-tracks-e2e.mjs`.
- **Compatibility.** `/lab`, `/lab/objek`, `/lab/jalur`, `/lab/modul` URLs and Guided/Explore behaviour unchanged; existing
  `lab_progress` untouched; the hub is hidden while searching or paging.
- **Known limitations / blocked content.** Brain: Atlas nervous system withheld (licensing), MRI/DTI neuroimaging needs a licensed
  dataset. Blood pressure: no measurement simulation (only arm vessel anatomy available). Auscultation: synthetic sounds only;
  reviewed murmur recordings missing. Lab modules (CXR, OCT, histology, blood smear) appear only once published.

### Iteration 4 — Interactive modules (P2)
- **Skeleton / structure identification.** Already EXISTING in the Atlas quiz (`/anatomy/study`, *Kenali Struktur* and
  *Temukan di 3D*). Not rebuilt; linked from *Rangka, Otot & Sendi* and *Identifikasi Anatomi* tracks with the right filters.
- **Neuroanatomy module.** BLOCKED (see above). The track shows what exists (skull, head-neck region, OCT retina when published).
- **ECG & conduction (`/lab/ekg`, practice `/lab/ekg?latihan=1`).** New. A schematic conduction diagram (SA node, atria, AV node,
  His bundle, bundle branches, Purkinje) glows in the Atlas selection yellow in sync with a 6-second schematic strip on
  25 mm/s paper (play/pause, 0.25–1× speed, time scrubber). Five patterns: sinus rhythm, sinus bradycardia, sinus tachycardia,
  first-degree AV block, second-degree AV block type I (Wenckebach, with the non-conducted P shown on the AV node). The page
  computes rate, PR, QRS and regularity from the same model the strip is drawn from, with textbook teaching ranges.
  Practice: 5 self-check questions, feedback with the criteria, no points or leaderboard.
- **Medical / licensing.** Waveforms are generated from a sum-of-Gaussians model written for this module (no copied ECG images,
  no patient recordings, no reference-video material). Labelled on the page as schematic and not for diagnosis. Content still needs
  review by a clinical educator before public release (same rule as the 4D Lab, `apps/4d-lab/MEDICAL_REVIEW_CHECKLIST.md`).
- **Tests.** `ecg/ecgModel.test.mjs`: the patterns read back their teaching numbers (rate, PR, QRS, regularity, box rule),
  Wenckebach progression and drop, waveform shape, phase order SA→atria→AV→His→ventricles→ST→T, deterministic practice rounds.
  Browser journey covers scrubbing ↔ diagram, the dropped beat, and a full practice round on desktop and phone.
- **Visual evidence.** `docs/evidence/lab/01…08-*.jpg`.
- **Status.** Implemented and verified locally. Not deployed. No merge or release without approval.
