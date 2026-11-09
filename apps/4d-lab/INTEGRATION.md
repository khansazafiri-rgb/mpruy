# Safe integration plan — MEDCOEL Anatomy Live 4D Lab

Nothing in this branch has been deployed. Every step below needs the owner's explicit approval.
The production/default branch (`claude/focused-wozniak-1ayrxa`) and `main` were not modified.

## Architecture
| Piece | Path | Served at |
|---|---|---|
| Static simulator (Vite, vanilla JS + three.js) | `apps/4d-lab` → `apps/4d-lab/dist` | `/anatomy/4d-lab/` (Caddy `handle_path`, outside `apps/web/dist`) |
| Host page in the MEDCOEL React app | `apps/web/src/pages/LiveLab.jsx`, route branch in `AnatomyLibrary.jsx` | `/anatomy/live` (SPA, existing `RequireAuth` on `/anatomy/*`) |
| Entry points | Anatomy header link "Live 4D Lab" and a landing-page button | — |
| **Shared atlas assets** (read-only dependency) | the existing Anatomy Atlas deployment (`apps/anatomy/dist`, staged by `scripts/stage-anatomy.mjs`) | `/anatomy/viewer/models/*.glb`, `/anatomy/viewer/draco/*`, `/anatomy/viewer/data/atlas-catalog.json` |

### Atlas integration (this branch)
- The lab's default dataset is `data/atlas/` (CT/labels/skin generated from the atlas meshes). The procedural
  phantom stays available as `?dataset=phantom`.
- The 3D anatomy is loaded at runtime from the **atlas's own URL** (`/anatomy/viewer/`, same origin): no GLB or Draco
  decoder is copied into `apps/4d-lab/dist` (the Vite config strips three's bundled decoder defaults). The browser
  cache is shared with the Atlas viewer. Override for staging with `?atlasBase=/some/path/` or `VITE_ATLAS_BASE`.
- If `/anatomy/viewer/` is not deployed, the lab still runs (CT/US work), shows a warning and hides the atlas layer.
- No new Caddy route is needed for the atlas files: they are already served by the atlas deployment. If the atlas
  route sets `X-Frame-Options DENY`, that does not matter (files are fetched, not framed).
- `scripts/stage-4d-lab.mjs` now verifies both bundled datasets (phantom and atlas: manifest, CT/labels, mesh SHA-256).

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

## Staging preview for this branch (not executed; needs approval)
1. Stage the atlas build first if the staging host does not already serve `/anatomy/viewer/`:
   `npm run build:anatomy && node scripts/stage-anatomy.mjs` (existing procedure).
2. `npm ci --prefix apps/4d-lab && npm run test:4d-lab && npm run build:4d-lab`.
3. `LAB4D_DIR=<staging dir> LAB4D_RELEASE_ID=atlas-$(date +%Y%m%d%H%M) npm run stage:4d-lab`.
4. Open `/anatomy/live` on staging, confirm the Anatomi tab shows "Atlas MEDCOEL: … struktur dimuat", then run
   `TEST_RESULTS.md` § "Manual checklist" on the 8 GB Apple Silicon Mac in Safari.
Nothing here touches production Caddy, PocketBase or the production database.

## Performance notes
The atlas dataset is about 7 MB (CT 2.9 MB, labels 0.4 MB, skin 3.8 MB) plus the shared atlas models (9.7 MB for the default systems, cached together with the Atlas viewer). The procedural phantom is about 6 MB over the network (CT 2.1 MB gzip-NRRD, labels 0.26 MB, meshes 3.7 MB). It holds
about 40 MB of volume data in memory per thread (main + imaging worker). Static assets get hashed names (immutable caching);
`/data/*` is cached for one hour. Measured target-device frame rate: **not yet measured** (see `PHASE_STATUS.md`).
