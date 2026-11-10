# licensing/ — MEDCOEL copyright risk containment

Started 2026-11-09. **This is interim containment pending legal review, not a claim of full compliance.**

| Deliverable | Where |
|---|---|
| 1. File-by-file licence/provenance report | [`PROVENANCE_REPORT.md`](PROVENANCE_REPORT.md) and the per-structure manifest [`atlas-structure-provenance.json`](atlas-structure-provenance.json) (2,827 structures: 2,237 cleared, 590 quarantined) |
| 2. Candidate assets with commercially usable source licences (not a release approval) | [`CLEARED_ASSETS.md`](CLEARED_ASSETS.md) |
| 3. Quarantine (this PR) | policy [`quarantine-policy.json`](quarantine-policy.json) · withdrawn-bytes list [`quarantined-hashes.json`](quarantined-hashes.json) |
| 4. Assets needing written permission or legal review | [`LEGAL_REVIEW_REQUIRED.md`](LEGAL_REVIEW_REQUIRED.md) |
| 5. Quarantine-checked local build | `npm run build:anatomy` / `npm run build:4d-lab`; `npm run check:licensing-dist -- apps/anatomy/dist apps/4d-lab/dist`. These checks do not grant commercial release approval. |
| 6. Commercial release approval | [`commercial-release.json`](commercial-release.json) and [`tools/check-commercial-release.mjs`](tools/check-commercial-release.mjs): both staging commands are blocked until every bundled asset and application component has commercially usable rights documented for the exact build. |
| 7. History and production exposure plan | [`EXPOSURE_AND_ROLLBACK_PLAN.md`](EXPOSURE_AND_ROLLBACK_PLAN.md) · emergency Caddy block [`deploy/withheld-paths.caddy`](deploy/withheld-paths.caddy) |
| 8. Source rights evidence worklist | [`commercial-rights-evidence.json`](commercial-rights-evidence.json), [`COMMERCIAL_SOURCE_CLEARANCE_PLAN.md`](COMMERCIAL_SOURCE_CLEARANCE_PLAN.md) and `npm run audit:commercial-evidence`: records confirmed licence text separately from per-asset provenance and permissions. **14 records, 0 verified; not commercial clearance**. |
| 9. Tests that quarantined resources cannot be served | [`../scripts/licensing-quarantine.test.mjs`](../scripts/licensing-quarantine.test.mjs) (`npm run test:licensing`, in CI); atlas e2e "licence quarantine: no request for a withheld model" |

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
| `tools/check-commercial-release.mjs <product> <build-dir>` | An additional public-staging gate. It requires a reviewed, complete approval for the exact build digest, including commercial use, redistribution, attribution and ShareAlike obligations. Currently both products are blocked. Local preview and builds remain available. |
| `tools/build-provenance.mjs` | Regenerates `atlas-structure-provenance.json` from the original GLBs. |
| `tools/restore-originals.mjs` | Copies the originals from Git history into the gitignored `local-data/licensing-quarantine/originals/`, for review only. It refuses to write anywhere that is not ignored. |

## Commercial source evidence (separate from clean-build checks)

The upstream `nqwrc/3d-anatomy` application code explicitly carries **CC BY-NC-SA 4.0**; attribution to Z-Anatomy/BodyParts3D under CC BY-SA does **not** grant commercial rights to that application code. The official BodyParts3D database licence page was updated on 2025-02-27 to CC BY 4.0, but this does not establish the provenance/version of the meshes actually embedded in MEDCOEL. These are distinct source and asset-identity questions. See [`COMMERCIAL_SOURCE_CLEARANCE_PLAN.md`](COMMERCIAL_SOURCE_CLEARANCE_PLAN.md).

Run `npm run audit:commercial-evidence` to validate the machine-readable worklist and print unresolved records. This command passes when the **evidence register is well formed**, not when distribution is approved. To require every record verified, run `node licensing/tools/audit-commercial-evidence.mjs --require-clearance` (currently deliberately fails). Public staging remains blocked by the separate exact-build `commercial-release.json` gate.

## Independent model-source remediation for the approved 3D/4D experience

New [official BodyParts3D 4.0 onboarding notes](BP3D_OFFICIAL_SOURCE_REPLACEMENT.md) and
`npm run audit:bodyparts3d -- --download` provide a reproducible, opt-in
download/hash/inventory of the DBCLS **original geometry source**, plus a
**name-only, unverified** FMA/BP candidate mapping for the 2,237 available
Atlas structures. This does **not** alter any model or the owner's accepted
3D Anatomy / 4D Lab UI; does **not** clear the 14 unresolved rights records;
and must not be used as approval for the existing mixed Z-Anatomy GLBs or
CT/USG derivatives. Genuine geometry-level verification and separate NC
application code remediation are still mandatory.

## Commercial release procedure

Do not classify MEDCOEL as noncommercial merely because access is free. Core assets must permit
commercial use, redistribution and the intended adaptations. Preserve each upstream licence,
creator/source URL, attribution, modification notice and ShareAlike terms. An unknown or NC-only
source stays quarantined; a source with inferred rather than verified provenance is not approved.

Before a reviewed PR changes either product in `commercial-release.json` to `cleared`, document
the rights chain for **every bundled code component, mesh, image, data derivative and preview**.
Resolve the Atlas source-code rights separately. Record an exact SHA-256 build digest in
`approvedBuilds` with the reviewer, review date, evidence location, and affirmative commercial-use,
redistribution, attribution and ShareAlike review. Any build byte change requires new approval.
The manifest is a review record, not a substitute for underlying rights evidence; the automated
gate verifies the record and exact bytes, not the legal validity of a licence claim.

`npm run build:anatomy`, `npm run build:4d-lab` and local previews remain available for development.
`npm run stage:anatomy` and `npm run stage:4d-lab` reject new releases while blocked. Rollback to an already installed release is **also blocked** unless that exact rollback directory retains current commercial-rights approval and a clean quarantine scan (see [`PUBLIC_RELEASE_HARDENING.md`](PUBLIC_RELEASE_HARDENING.md)). Existing public deployments require
a separate inventory and remediation; the staging gate does not retract content already served.

## Results on this branch (2026-11-09)

The table below records the earlier quarantine audit and is not proof of commercial-release readiness. The new commercial-release tests should be run for this PR before updating results.

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
