# licensing/ — MEDCOEL copyright risk containment

Started 2026-11-09. **This is interim containment pending legal review, not a claim of full compliance.**

| Deliverable | Where |
|---|---|
| 1. File-by-file licence/provenance report | [`PROVENANCE_REPORT.md`](PROVENANCE_REPORT.md) and the per-structure manifest [`atlas-structure-provenance.json`](atlas-structure-provenance.json) (2,827 structures: 2,237 cleared, 590 quarantined) |
| 2. Assets verified safe for non-commercial education | [`CLEARED_ASSETS.md`](CLEARED_ASSETS.md) |
| 3. Quarantine (this PR) | policy [`quarantine-policy.json`](quarantine-policy.json) · withdrawn-bytes list [`quarantined-hashes.json`](quarantined-hashes.json) |
| 4. Assets needing written permission or legal review | [`LEGAL_REVIEW_REQUIRED.md`](LEGAL_REVIEW_REQUIRED.md) |
| 5. Verified build without uncertain assets | `npm run build:anatomy` / `npm run build:4d-lab` (both fail closed); `npm run check:licensing-dist -- apps/anatomy/dist apps/4d-lab/dist` |
| 6. History and production exposure plan | [`EXPOSURE_AND_ROLLBACK_PLAN.md`](EXPOSURE_AND_ROLLBACK_PLAN.md) · emergency Caddy block [`deploy/withheld-paths.caddy`](deploy/withheld-paths.caddy) |
| 7. Tests that quarantined resources cannot be served | [`../scripts/licensing-quarantine.test.mjs`](../scripts/licensing-quarantine.test.mjs) (`npm run test:licensing`, in CI); atlas e2e "licence quarantine: no request for a withheld model" |

## What is withheld

- **`nervous.glb`, the whole file.** It contains:
  - Brainder and UW "White matter" meshes, with no licence stated;
  - the Dundee inner ear, CC BY-NC-SA;
  - Dundee cranial nerves, whose licence cannot be verified;
  - other meshes that cannot be separated from those.
- **Kidney and renal pelvis** (lissiecowley, CC BY-NC), removed from `visceral.glb`.
- **Auditory ossicles**, removed from `skeletal.glb` as a precaution (inner-ear model, CC BY-NC-SA).
- **Every preview, dataset and screenshot derived from them.**

## Tools (all dependency-free Node)

| Tool | Purpose |
|---|---|
| `tools/glb-prune.mjs` | Lossless node removal from Draco GLBs. Kept meshes stay byte-identical; removed bytes are dropped. Embeds an adaptation notice. |
| `tools/apply-quarantine.mjs [--check]` | Applies the policy to the Atlas metadata and previews, idempotently. `--check` exits 1 if the tree is not compliant. |
| `tools/check-distribution.mjs <dir…>` | The guard. It rejects withdrawn bytes under any name, withheld paths, GLBs with withheld nodes or systems, catalogues listing withheld structures, and 4D Lab datasets built from withdrawn inputs.<br>Used by: both Vite builds (`buildStart` + `closeBundle`), `scripts/stage-anatomy.mjs`, `scripts/stage-4d-lab.mjs`, `scripts/preview-4d-lab.mjs`, CI. |
| `tools/build-provenance.mjs` | Regenerates `atlas-structure-provenance.json` from the original GLBs. |
| `tools/restore-originals.mjs` | Copies the originals from Git history into the gitignored `local-data/licensing-quarantine/originals/`, for review only. It refuses to write anywhere that is not ignored. |

## Results on this branch (2026-11-09)

| Check | Result |
|---|---|
| `npm run test:licensing` | 7/7 pass; `apply-quarantine --check` compliant; public folders clean |
| `npm test` (web 140 + PocketBase) | pass |
| `npm run lint`, `npm run build` (web) | pass |
| `npm run test:anatomy-integration` | 7/7 pass |
| `npm run test:anatomy` | 80/80 pass (3 new quarantine tests) |
| `npm run lint:anatomy` | 0 errors (11 `console` warnings; not compared against `b931e1b`) |
| `npm run test:4d-lab` | 49/49 + 3/3 pass (new quarantine test) |
| Atlas e2e (Chromium, SwiftShader) | 15/15 pass, including "no request for a withheld model" |
| 4D Lab phantom e2e | 14/14 pass |
| Atlas build + 4D Lab build + `check:licensing-dist` on both `dist/` | clean |
| Negative test: copy `nervous.glb` back into `apps/anatomy/public/models/` and build | **build fails** with "Licence quarantine: Atlas public/ contains withheld content" |
| Safari | **not tested** (unavailable to this session) |

Screenshots: [`evidence/atlas-search.png`](evidence/atlas-search.png) (search "ginjal" → "Tidak tersedia sementara · Ginjal dan pelvis renalis") and [`evidence/atlas-tiles.png`](evidence/atlas-tiles.png) (the "Saraf · tidak tersedia" tile).
