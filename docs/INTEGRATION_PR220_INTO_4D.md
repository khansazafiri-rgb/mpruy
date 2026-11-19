# Integration: PR #220 → `feature/4d-lab-official-logo-guided-tour`

Branch `claude/integrate-pr220-into-4d-lab`, created from `origin/feature/4d-lab-official-logo-guided-tour` @ `5b9c156`.
It merges `origin/claude/focused-wozniak-1ayrxa` @ `c87979a` (PR #220 merged) with a real merge commit, so the history
of both branches is kept. No force-push, no reset, and the production branch was not changed.

| | |
|---|---|
| Merge base of the two branches | `c381f7e` |
| Commits only on the 4D branch | 258 |
| Commits only on the default branch | 42 (PR #220 and video/content work since #143) |
| Production today | `/opt/medcoel` on `feature/4d-lab-official-logo-guided-tour` @ `7878a90` (4D head is `5b9c156`) |

## 1. What changes for production (`7878a90`/`5b9c156` → this branch)

| Area | Change | Needs |
|---|---|---|
| PocketBase migrations | **one new** `1800003200_study_planner.js` (4 locked collections) | backup, restart `pocketbase` |
| PocketBase hooks | `study.pb.js`, `lib/study*.js`, `lib/labTracks.js`, routes in `lab.pb.js`, page list in `lib/activity.js` | restart `pocketbase` (`--hooksWatch=false`) |
| PocketBase content | 66 new note files in `apps/pocketbase/content/materi/` (Respirasi, Kardiovaskular, Mata, THT, Psikiatri) | none: the existing `medcoelMateriSync` cron adds them to existing chapters within a minute and skips notes an admin edited |
| Web (`apps/web`) | Exam Center, Study Planner, 14 Lab tracks, ECG module (gated), activity map | `npm ci`, web build |
| 4D Lab | 8 lines in `src/app/main.js` (`?scenario=` / `?ws=` deep link) | optional rebuild + new 4D release (below) |
| Anatomy Atlas (`/var/lib/medcoel/anatomy-viewer`) | none | nothing |
| Caddy | none | nothing |
| Hermes, licensing, deploy scripts | none | nothing |
| Repository size | +~170 MB (education videos under `video/`, not served) | check free disk before `git pull` |

The 4D Lab loads its models from its own verified `atlas-assets/` pack, not from `/anatomy/viewer/`, so the Atlas does not
have to change for this release. A web build never installs the 4D Lab: the static 4D release lives in
`/var/lib/medcoel/4d-lab` and is switched only by `scripts/stage-4d-lab.mjs`.

## 2. Conflicts resolved

Textual conflicts (resolved by keeping both sides, not by choosing one):

| File | Resolution |
|---|---|
| `apps/pocketbase/package.json` | unit test list = union: `activity`, `submission-notice` (4D) + `studyPlanner`, `labTracks` (#220) |
| `apps/web/src/features/anatomy/liveLab.test.mjs` | both tests kept: `liveLabAvailability` (4D) and `liveLabSrc` deep link (#220) |
| `apps/web/src/lib/serverVersion.test.mjs` | follows the migration renumbering below |

Auto-merged files that were checked: `apps/4d-lab/src/app/main.js` (deep link + 4D-branch changes, unit + e2e green),
`apps/4d-lab/test/e2e/ux-e2e.mjs`, `apps/4d-lab/PHASE_STATUS.md`, `apps/4d-lab/evidence/ux-e2e-results.json` (valid JSON),
`apps/web/src/App.jsx`, `apps/web/src/features/anatomy/liveLab.mjs`, `apps/pocketbase/test/api.test.mjs`.

Semantic conflicts (no textual conflict, fixed in follow-up commits):

1. **Migration number collision.** Both branches added a `1800003100_*` migration. `1800003100_activity_daily.js` is
   already applied in production, and the web's `REQUIRED_MIGRATION` check compares numbers, so the study planner would have
   been reported as installed before it was. → renamed to **`1800003200_study_planner.js`**, made idempotent (a database
   that already ran the old file name keeps its collections and data), `REQUIRED_MIGRATION = 1800003200`.
2. **Student activity tracking (4D branch).** New pages were missing from the page list, so their use would not be
   counted. → `/jadwal/:exam/rencana`, `/rencana-belajar`, `/lab/sistem/:track`, `/lab/keterampilan/:track`, `/lab/ekg` added on
   both sides (web `activityMap.mjs` = server `lib/activity.js`, kept equal by a test). `/jadwal` is now labelled "Pusat ujian".
3. **Live 4D availability (4D branch).** The 4D release can be absent on a server; the Atlas nav already hides its link.
   → Lab track steps that open `/anatomy/live` are shown as unavailable (and not counted) when the 4D build is missing;
   the Lab hub hides its Live 4D button.
4. **ECG module not clinically reviewed.** → closed to students until released: steps marked `"review": "ecg"` and the
   `/lab/ekg` page are open to admins (for review) and to everyone only when the server runs with
   `MEDCOEL_LAB_ECG_PUBLIC=1`. The server reports `features` in `GET /api/medcoel/lab/tracks` and refuses to complete gated steps.
5. **Campus-only material (found while verifying campus access).** The planner accepted a chapter id sent by the client
   and checked only `hidden`; a student could reference another campus's *drilling* chapter and get its title and links.
   → sources and links now also require `drilling = false`, like the subject pages. The API test fails without the fix.

## 3. Migrations

Full list of what this branch adds on top of production: **`1800003200_study_planner.js` only.**

| Collection | Purpose | Rules |
|---|---|---|
| `study_profiles` | one per user: shared daily minutes, per-weekday minutes, rest dates, activities | locked (`null`) |
| `study_plans` | one per exam; `exam` relation is optional and **not** cascading (deleting an exam archives the plan) | locked |
| `study_sessions` | dated sessions; `done`/`missed` are history and never rewritten | locked |
| `lab_track_progress` | per user per track (unique) | locked |

All access goes through `/api/medcoel/study/*` and `/api/medcoel/lab/tracks*` (signed-in owner only). Existing tables are
not altered. The down migration intentionally throws: rollback is code-only and keeps learning history.

Validated on real PocketBase 0.40.5 databases:

- **A — production-like:** database built from `7878a90`'s migrations (`…1800003100_activity_daily.js` applied), seeded
  with a user, an exam and activity rows, then upgraded: `Applied 1800003200_study_planner.js`; user, exam and
  `activity_daily` rows unchanged; the full study API suite (92 checks) passes on the upgraded database; the old exam shows
  in the Exam Center without a plan.
- **B — staging from the default branch:** database that already ran `1800003100_study_planner.js` with a plan, 5
  sessions (1 done) and track progress, then upgraded: `1800003100_activity_daily.js` and `1800003200_study_planner.js`
  applied without error; all study data preserved.

## 4. Tests (merged tree)

| Suite | Result |
|---|---|
| Lint (web) | pass |
| Unit: web | 166/166 |
| Unit: PocketBase (format + node tests) | 84/84 |
| Web build | pass |
| Hermes check + tests | 67/67 |
| Anatomy release & host integration | 10/10 |
| Licence quarantine tests | 36/36 |
| Anatomy viewer tests + lint, viewer build | 92/92, pass |
| 4D Lab unit + stage/preview scripts | 123/123 + 4/4 |
| 4D Lab build + licence scan of `apps/anatomy/dist` and `apps/4d-lab/dist` | pass, clean |
| API: roles (`api.test`) | 55 steps |
| API: Lab | 102 checks |
| API: decks (drilling) | 28 steps |
| API: study planner + lab tracks + ECG gate + campus-only chapters | 92 checks |
| API: activity (not in CI) | 10 steps |
| API: lab packs / program-campus / authoring bundle / lab jobs (not in CI) | 104 checks / 13 steps / pass / pass |
| Browser: Study Planner journey (production route layout) | pass |
| Browser: Lab tracks journey incl. ECG gate, real deep link into the 4D Lab, server without 4D release | pass |
| Browser: integration smoke (Atlas landing, Atlas library/quiz/3D viewer, question bank, Kampusmu, simulation, progress, admin activity report) | pass |
| 4D Lab UX e2e | see section 4.1 |
| 4D release staging dry run (temp dir) | pass: phantom + atlas datasets, 6 atlas models hash-verified in the Lab-owned pack |

Browser runs use `scripts/local-prod-layout-server.mjs`, a local stand-in for the production Caddy routes
(`/api` → PocketBase, `/anatomy/viewer/` and `/anatomy/4d-lab/` as separate static roots without SPA fallback, web SPA).
Screenshots: `docs/evidence/integration/`, `docs/evidence/lab/`, `docs/evidence/study/`.

### 4.1 Known failing test (not hidden, not skipped)
The 4D Lab UX e2e step *"keyboard: arrows = patient directions…"* fails with `ArrowUp superior`. It fails the same way on a
build without PR #220's change (checked earlier on `30b01ab`), so it predates this integration. The new deep-link step passes.
Follow-up: investigate the state left by the directed-learning step before the keyboard step.

## 5. Licensing and clinical review constraints (unchanged by this release)
- The 4D release check passes only through an **owner override** (2026-11-10, expires **2027-02-08**) with **2 rights
  blockers** still open (`licensing/`). Renew or resolve before that date.
- Withheld anatomy (nervous system, kidney, ossicles) stays withheld; Lab tracks show these steps as unavailable.
- ECG module: keep `MEDCOEL_LAB_ECG_PUBLIC` **unset** until a clinical educator has reviewed it. The 4D Lab clinical texts
  are still "DRAF" (`apps/4d-lab/MEDICAL_REVIEW_CHECKLIST.md`).

## 6. Production backup plan (before anything else)

```bash
sudo mkdir -p /var/backups/medcoel
TS=$(date +%Y%m%d-%H%M)
# code position and current static releases
git -C /opt/medcoel rev-parse HEAD | sudo tee /var/backups/medcoel/commit-$TS.txt
readlink -f /var/lib/medcoel/4d-lab | sudo tee /var/backups/medcoel/4d-lab-target-$TS.txt
readlink -f /var/lib/medcoel/anatomy-viewer | sudo tee /var/backups/medcoel/anatomy-target-$TS.txt
sudo cp -a /opt/medcoel/apps/web/dist /var/backups/medcoel/web-dist-$TS
# consistent database copy: stop PocketBase for the copy only (seconds), then start it again
sudo systemctl stop pocketbase
sudo tar -C /opt/pocketbase -czf /var/backups/medcoel/pb_data-$TS.tgz pb_data
sudo systemctl start pocketbase
sudo tar -tzf /var/backups/medcoel/pb_data-$TS.tgz | grep -c data.db   # must print 1
```

Keep the archive off the server as well (download it). Do not delete it until the release has run cleanly for a week.

## 7. Deploy steps (production layout given by the owner; each step needs approval)

**0. Read-only pre-flight** (confirm the facts this plan relies on):

```bash
git -C /opt/medcoel status --short && git -C /opt/medcoel rev-parse --abbrev-ref HEAD   # clean, feature/4d-lab-official-logo-guided-tour
systemctl cat pocketbase        # ExecStart: --dir=/opt/pocketbase/pb_data and where --migrationsDir/--hooksDir point
sudo cat /usr/local/bin/medcoel-update   # what it does: pull? npm ci? web build? restart pocketbase? anything for 4D?
readlink -f /var/lib/medcoel/4d-lab      # must be a release symlink (…/4d-lab-releases/<id>)
df -h /opt /var/lib /var/backups         # the pull adds ~170 MB
```

If `--migrationsDir`/`--hooksDir` do not point at `/opt/medcoel/apps/pocketbase/pb_migrations` and `pb_hooks`, copy the
new files there in step 3 instead of relying on the checkout. If `medcoel-update` does not run `npm ci`, the web build or
the PocketBase restart, run those steps by hand.

1. **Backup** (section 6).
2. **Merge** this PR into `feature/4d-lab-official-logo-guided-tour` (owner, on GitHub).
3. **Update code and web** (either `sudo /usr/local/bin/medcoel-update`, if pre-flight showed it does exactly this, or):

   ```bash
   cd /opt/medcoel && git pull --ff-only
   npm ci
   npm run build --prefix apps/web          # writes /opt/medcoel/apps/web/dist
   ```

4. **Backend:** `sudo systemctl restart pocketbase` (applies `1800003200_study_planner.js`, loads the new hooks), then:

   ```bash
   sudo journalctl -u pocketbase -n 50 --no-pager   # no migration errors
   curl -sf https://medcoel.com/api/health
   ```

   In the admin dashboard the "server version" warning must be gone (it reads the latest applied migration).
5. **4D Lab release (optional, for the Lab-track deep links).** Without it, track links open the 4D Lab at its default
   case; everything else works.

   ```bash
   cd /opt/medcoel && npm ci --prefix apps/4d-lab && npm run test:4d-lab && npm run build:4d-lab
   LAB4D_DIR=/var/lib/medcoel/4d-lab LAB4D_RELEASE_ID=$(date +%Y%m%d)-pr220 npm run stage:4d-lab
   ```

   The stage script validates both datasets, the NOTICE files and the SHA-256 of every model in the Lab's atlas pack
   against the CT before it switches the symlink, and refuses on any mismatch. No Caddy reload is needed.
6. **Atlas, Caddy:** no action.
7. **Smoke test** (student account and admin account):
   - `/jadwal`: existing exams listed with countdowns; create a plan (preview, save); `/rencana-belajar`.
   - `/lab`: hub and 14 tracks; a track page; `/lab/ekg` shows "sedang ditinjau" for a student, the module for an admin.
   - `/anatomy/live?scenario=effusion` opens the effusion case (only after step 5).
   - `/anatomy`, `/anatomy/explore`, a subject page, `/drilling`, `/kerjakan/...`, `/admin/aktivitas`.
   - Existing exam reminders: next day, check that H-n reminders still arrive once.

## 8. Rollback (no database deletion, learning history kept)

- **Code + web:** `cd /opt/medcoel && git checkout --detach 7878a90` (or the commit saved in step 1), `npm ci`,
  `npm run build --prefix apps/web` (or restore `web-dist-$TS`), `sudo systemctl restart pocketbase`.
  The four new collections stay in the database; the old code ignores them, so plans and progress are still there if the
  release is re-applied. Do **not** run a down migration (it is designed to refuse).
- **4D Lab:** `LAB4D_DIR=/var/lib/medcoel/4d-lab node scripts/stage-4d-lab.mjs --rollback` (only if step 5 ran).
- **ECG:** unset `MEDCOEL_LAB_ECG_PUBLIC` and restart `pocketbase` to close the module again.
- **Database restore** from `pb_data-$TS.tgz` is a last resort for corruption only: it loses everything students did after
  the backup (answers, plans, progress).
- Return to the branch afterwards with `git checkout feature/4d-lab-official-logo-guided-tour` once fixed.

## 9. Not done here
No merge, no deploy, no change to the production server or the production branch. The production facts above (paths,
service name, updater) were given by the owner and are not visible from this repository: `deploy/update.sh` and
`deploy/Caddyfile` in the repo describe an older layout (`/opt/medcoel/app`, service `medcoel`). Verify them with the
pre-flight commands.
