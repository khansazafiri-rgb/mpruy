# 00 — Baseline audit (Loop 0, read-only)

Date: 2026-11-19. Baseline: `claude/focused-wozniak-1ayrxa` = `2bfe54c` (PR #222). Branch head and baseline are identical (0 commits after).
Method: `git archive 2bfe54c` into a scratch directory (outside the repository), static reading, the existing test suites run
against that copy, and unauthenticated GET requests to public production URLs. No file, branch, commit, PR, migration or
server change was made during Loop 0; these documents were committed afterwards in PR-A.

## 1. Repository inventory (verified)

| Area | Path | Facts verified |
|---|---|---|
| Web host | `apps/web` | React 18.3, React Router 6.30, Vite, Tailwind, `pocketbase` SDK 0.25, `three` 0.170. Only root npm workspace. |
| Routes | `apps/web/src/App.jsx` | `/anatomy/*` → `pages/AnatomyLibrary.jsx` (handles `/anatomy/explore` and `/anatomy/live` itself, plus index, library, structure/:id, region/:id, system/:id, study). Lab: `/lab`, `/lab/objek/:slug`, `/lab/jalur/:slug`, `/lab/modul/:key`, `/lab/ekg`, `/lab/sistem/:track`, `/lab/keterampilan/:track`. Planner/Exam Center: `/jadwal`, `/jadwal/:exam/rencana`, `/rencana-belajar`. No `/lab/studio` route exists. |
| Lab Hub | `apps/web/src/features/lab/LabHub.jsx` | Present. |
| Tracks | `shared/lab-tracks.json` | 14 tracks (7 `sistem`, 7 `keterampilan`), 60 steps. Server copy `pb_hooks/lib/labTracks.js`, kept identical by a test. |
| Anatomy registry | `apps/web/src/features/anatomy/registry.mjs` | 7 systems, 8 regions (`headNeck, thorax, abdomen, pelvis, upperLimb, lowerLimb, back, whole`), `UNAVAILABLE_SYSTEMS.nervous` (licence). There is no `brain` region key. |
| Study modes | `apps/web/src/features/anatomy/study.mjs` | `identify`, `find`. Answers are structure IDs chosen from options (`checkAnswer` = exact ID); there is no typed-answer or fuzzy matching code. |
| Atlas runtime | `apps/anatomy` | Separate Vite app, own lockfile, `three` 0.185, served at `/anatomy/viewer/` (Caddy `handle_path`, `/var/lib/medcoel/anatomy-viewer`). Hosted in same-origin iframes with a validated postMessage protocol (`hostProtocol.mjs`: origin, source window, version, type allow-list). |
| Live 4D | `apps/4d-lab` | Separate Vite app, own lockfile, `three` 0.185, base `/anatomy/4d-lab/`. Host: `liveLab.mjs` (`checkLiveLab` = manifest fetch + JSON content-type + schema check, `liveLabSrc` passes only `scenario`/`ws` matching `^[a-z_]{1,24}$`). **The 4D Lab has no host↔frame message bridge** (its `postMessage` use is the internal imaging worker only). |
| Backend | `apps/pocketbase` | PocketBase 0.40.5 JSVM hooks, 33 migrations up to `1800003200_study_planner.js`. Lab progress `lab_progress` (null API rules, endpoint-only). Study planner `study_plans`. ECG release gate is server-side (`labTracks.js`: `ecg: admin || MEDCOEL_LAB_ECG_PUBLIC=1`). |
| Auth | `apps/web/src/lib/api.js` | PocketBase `LocalAuthStore` (token in `localStorage`); every same-origin document or frame can read it. `RequireAuth` is client-side; data protection is server-side. |
| Licensing | `licensing/` | `commercial-release.json`: `atlas-viewer` and `4d-lab` `blocked`, `ownerOverride` (`rightsVerified: false`, expires 2027-02-08). Quarantine: nervous, kidney, renal pelvis, ossicles withheld. |
| Deploy | `deploy/` | `Caddyfile` (repo copy has `/anatomy/viewer` but **not** `/anatomy/4d-lab`; that block exists as `4d-lab.caddy.snippet`). SPA fallback: `try_files {path} /index.html`. `update.sh` builds `apps/web` only. |
| Terminology data | `apps/anatomy/public/data` | English names = catalogue keys (2,237); Latin lexicon 1,476 entries (with `official` flag); Italian synonyms 204; **Indonesian synonyms 25** (`library-reference.json`). |
| Simulated echo | `apps/4d-lab/src/sim/pathology.js` | `pericardial` scenario exists (9 mm circumferential layer, synthetic phantom, labelled educational approximation). |

## 2. Baseline test results (run on the `2bfe54c` copy, 2026-11-19)

| Suite | Result |
|---|---|
| `npm test --prefix apps/web` | 166/166 |
| `npm run lint --prefix apps/web` | clean |
| `npm test --prefix apps/pocketbase` | 84/84 |
| `npm run test:anatomy-integration` | 10/10 |
| `npm run test:licensing` (+ quarantine, distribution, evidence, origin scans) | 36/36, all checks pass. First run failed 1 test only because the scratch copy had no `.git`; rerun inside a scratch git repo passed. |
| `npm run test:4d-lab` | 123/123 + 4/4 |
| PocketBase API (real PB 0.40.5, scratch data dir) | `api.test` 55 steps; `study-api` 92 checks; `lab-api` 102 checks (after a fresh server: an earlier run hit the 429 rate limit from back-to-back suites, which is an environment effect). |
| Browser e2e (4D Lab, original Atlas viewer, BodyParts3D) | **Not run in Loop 0** (slow software WebGL); will run in PR-D/PR-E. |

## 3. Production state (observed, unauthenticated GET only)

| Check | Observation | Meaning |
|---|---|---|
| `GET /` main bundle | `index-BFkGGf6x.js` | **Identical** to a local `vite build` of `2bfe54c` → the web frontend in production is PR #222. |
| `/api/medcoel/study/overview`, `/api/medcoel/lab/tracks` | 401 (unknown route → 404) | Study-planner and lab hooks are loaded. |
| `/anatomy/4d-lab/data/phantom/anatomy.json` | 200 `application/json` | 4D Lab route is installed on the server (not in the repo `Caddyfile`). |
| `/anatomy/viewer/` | 200, `X-Frame-Options SAMEORIGIN`, `frame-ancestors 'self'` | Atlas route as in the snippet. |
| `/studio-assets/x/y/` | **200 `text/html`** (SPA fallback) | Any missing studio asset path looks "successful" unless content type + manifest are checked (STUDIO-006/028). |
| Response headers on `/` | **No** HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` | The repo `Caddyfile` sets them globally. Production configuration differs from the repo copy (config drift). Must be verified on the server; not fixed in Loop 0. |

Not verifiable from outside: production PocketBase data, env flags (`MEDCOEL_LAB_ECG_PUBLIC`), the live Caddyfile, installed release IDs.
