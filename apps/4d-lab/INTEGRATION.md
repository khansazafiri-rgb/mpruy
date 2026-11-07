# Safe integration plan — MEDCOEL Anatomy Live 4D Lab

Nothing in this branch has been deployed. Every step below needs the owner's explicit approval.
The production/default branch (`claude/focused-wozniak-1ayrxa`) and `main` were not modified.

## Architecture
| Piece | Path | Served at |
|---|---|---|
| Static simulator (Vite, vanilla JS + three.js) | `apps/4d-lab` → `apps/4d-lab/dist` | `/anatomy/4d-lab/` (Caddy `handle_path`, outside `apps/web/dist`) |
| Host page in the MEDCOEL React app | `apps/web/src/pages/LiveLab.jsx`, route branch in `AnatomyLibrary.jsx` | `/anatomy/live` (SPA, existing `RequireAuth` on `/anatomy/*`) |
| Entry points | Anatomy header link "Live 4D Lab" and a landing-page button | — |

The page checks `/anatomy/4d-lab/data/phantom/anatomy.json` before framing. If the Caddy route is
missing (SPA fallback answers instead), it shows a clear message instead of framing itself.
PocketBase, Hermes, quizzes and the Anatomy Atlas are unchanged. The lab needs no backend: all
processing runs in the student's browser and no data is uploaded.

## Steps (staging first)
1. Review and merge the branch into the integration branch (owner).
2. Build:
   ```bash
   npm ci --prefix apps/4d-lab
   npm run test:4d-lab
   npm run build:4d-lab
   ```
3. Stage atomically outside the web dist (keeps a rollback record):
   ```bash
   LAB4D_DIR=/var/lib/medcoel/4d-lab LAB4D_RELEASE_ID=$(date +%Y%m%d%H%M) npm run stage:4d-lab
   ```
4. Add `deploy/4d-lab.caddy.snippet` to the medcoel.com site block next to the `/anatomy/viewer`
   routes and before the SPA handle. Validate with `caddy validate` and reload only with approval.
   The snippet sets `X-Frame-Options SAMEORIGIN` for this path only; the site keeps `DENY` elsewhere.
5. Build and deploy `apps/web` as usual (it now contains `/anatomy/live`).
6. Smoke test: open `/anatomy/live` while logged in and run the manual checklist in `TEST_RESULTS.md`.
7. Rollback: `node scripts/stage-4d-lab.mjs --rollback` (switches the symlink back). The web route
   degrades to the "not installed" message if the lab is removed.

## Content and licensing gates before public launch
- Clinical review of the scenario text (`src/sim/pathology.js`) and auscultation descriptions.
- Indonesian translation of the scenario explanations through the normal MEDCOEL i18n review.
- Keep `ASSET_LICENSE_REGISTRY.md` current. Never place CTACardio, ViP, EchoNet or TotalSegmentator
  restricted outputs under `apps/4d-lab/public`.
- Keep the "educational simulation, not for diagnosis" labels; they are part of the product.

## Performance notes
The default phantom is about 6 MB over the network (CT 2.1 MB gzip-NRRD, labels 0.26 MB, meshes 3.7 MB). It holds
about 40 MB of volume data in memory per thread (main + imaging worker). Static assets get hashed names (immutable caching);
`/data/*` is cached for one hour. Measured target-device frame rate: **not yet measured** (see `PHASE_STATUS.md`).
