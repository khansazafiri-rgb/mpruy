# 06 — Test and acceptance plan, folder structure, PR-A…E

## Final folder structure (all new paths; nothing existing moves)

```text
packages/studio-contract/{manifest,launch,capabilities,events,validation}.mjs   + test/*.test.mjs   (no npm deps)
packages/studio-runtime/{mount,lifecycle,events,bridge}.mjs, adapters/{fixture-echo,unavailable}.mjs + test/
shared/studios/{catalog.v1.json, catalog.schema.json, frozen-ids.json}
apps/studios/_template/{vite.config.mjs, index.html, src/main.mjs, src/workspace/, src/adapters/, test/}   (copy source, not built)
apps/studios/foundation-fixture/{vite.config.mjs, index.html, src/, test/}   → dist/ (gitignored)
apps/web/src/features/studios/{StudioHub,StudioHost,StudioCard}.jsx, {studioRegistry,studioAvailability,studioBridge}.mjs (+ tests)
apps/web/src/pages/StudioEntry.jsx            route /lab/studio/:studioId (additive in App.jsx)
apps/pocketbase/pb_hooks/studios.pb.js, lib/studios.js (+ copy of the catalog, kept identical by test)
scripts/stage-studio.mjs, scripts/stage-studio.test.mjs     local staging only, licence scan included
docs/clinical-studios/00…06 (these documents)
```
Not touched: `deploy/`, `apps/anatomy`, `apps/4d-lab`, `shared/lab-tracks.json`, existing migrations, root `package.json` workspaces, lockfiles.

## Acceptance tests (STUDIO-001…030 → where and how)

| ID | Where | How |
|---|---|---|
| 001–004 | `packages/studio-contract/test`, `pb lib/studios` unit | IDs unique + equal to `frozen-ids.json` (removal/rename fails); schema; bad modality/duplicate route rejected; `ready` impossible without release + verified licence + approved review |
| 005 | runtime unit | unknown capability/op → `unsupported` |
| 006, 028 | web unit + browser | manifest fetch returning `text/html`, 404, wrong schema, wrong id → error state; never mounts the SPA |
| 007, 008, 010 | Playwright (Chromium) on local production layout | mount fixture, unmount: frame removed, `WEBGL_lose_context` called, listener count back to baseline, 20 open/close cycles without growth |
| 009 | browser | fixture `?crash=1` throws → host error card, Lab Hub still interactive |
| 011, 012 | browser + unit | reload/direct URL same result; `mode=<script>`/`case=../x` normalised |
| 013–015 | PB API test (real PB 0.40.5) | 401 without auth; role/campus filter; client cannot obtain `launch` for non-ready studio by editing JSON or calling the endpoint |
| 016 | static + preview server test | no `protected: true` dataset path under `studio-assets`; distribution scan of fixture `dist` |
| 017 | unit (jsdom-free fake events) + browser | wrong origin, wrong source window, wrong `v`, oversize payload → ignored |
| 018–022 | existing suites rerun: web, pocketbase unit, `api`, `study-api`, `lab-api`, `test:anatomy-integration`, `test:4d-lab`, `original-viewer-e2e`, 4D Lab e2e | must stay at baseline (00 §2); key snapshot of tracks/steps |
| 023–025 | browser at 1440, 834 (iPad), 390 | no horizontal overflow; keyboard focus order; `aria-live` errors; `planned`/`blocked` cards have no Start button |
| 026, 027 | build scripts | fixture builds alone; `apps/web` builds and runs with fixture `dist` absent (card shows unavailable) |
| 029 | review | no script writes outside the workspace/scratch; no network to medcoel.com in tests |
| 030 | CI check | `git diff --stat <base> -- deploy apps/anatomy apps/4d-lab` empty |

Existing failures (none at baseline) would be reported separately, never skipped.

## PR plan (proposal; nothing created yet)

| PR | Branch (proposed) | Content | Evidence |
|---|---|---|---|
| A | `feature/studios-a-docs-catalog` | `docs/clinical-studios/00–06`, `shared/studios/catalog.v1.json` (24 + fixture, all fail-closed), `frozen-ids.json` | Docs review; STUDIO-001/002 via a tiny JSON check |
| B | `feature/studios-b-contract` | `packages/studio-contract`, availability resolver (web + PB hook mirror), `GET /api/medcoel/studios` and `/launch` | STUDIO-001–005, 013–015 (unit + real PB) |
| C | `feature/studios-c-runtime-fixture` | `packages/studio-runtime`, `_template`, `foundation-fixture`, `StudioHost`, `StudioEntry` route, local staging script | STUDIO-006–012, 016, 017, 026–028; browser recording |
| D | `feature/studios-d-lab-hub` | "Clinical Studios" section appended to Lab Hub, `StudioHub`, `StudioCard` states | STUDIO-018–025, screenshots desktop/iPad/phone, Atlas before/after screenshot |
| E | `feature/studios-e-hardening` | security tests consolidated, CI script `test:studios`, release/rollback doc, Caddy proposal for `/studio-assets/` **as a document only** | STUDIO-029/030, full regression report |

Each PR is stacked on the previous one, targets `claude/focused-wozniak-1ayrxa`, is never merged automatically, and changes
nothing in production.
