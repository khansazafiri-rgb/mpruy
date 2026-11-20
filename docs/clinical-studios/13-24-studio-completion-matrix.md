# 24-studio completion matrix (honest status, 2026-11-20 — master execution update)

Machine-readable, computed source of truth: [`studio-status.v1.json`](studio-status.v1.json) (`node scripts/studio-status.mjs`,
checked in `npm run test:studios`). Counts: FUNCTIONAL_PRIVATE_REVIEW 5 · FUNCTIONAL_WITH_PENDING_CLEARANCE 11 ·
TECHNICAL_FIXTURE_ONLY 7 · BLOCKED 1 · RELEASE_ELIGIBLE 0.

Status definitions: `RELEASE_ELIGIBLE` (none) · `FUNCTIONAL_PRIVATE_REVIEW` (works end to end on real acquired data whose
source licence is verified; human reviews pending; not releasable) · `FUNCTIONAL_WITH_PENDING_CLEARANCE` (real data works, but a
source licence question is open or an asset is rights-blocked) · `TECHNICAL_FIXTURE_ONLY` (app and engine work on a labelled synthetic
fixture; no clinical data) · `PARTIALLY_IMPLEMENTED` · `BLOCKED` · `NOT_STARTED`.

Every studio is an **independent Vite build** (`apps/studios/<id>/`, own entry, bundle, `dist/` and `studio-manifest.json`)
over shared engine libraries (`engines/volume`, `engines/anatomy3d`, `engines/ecg`, `engines/image2d`, `shell/`).
**Release eligibility is NO for all 24**: no rights record is verified, no privacy/medical review is signed, and the canonical
catalog keeps every studio `planned`/`blocked`. The secure launch pipeline (WS1) refuses to issue a receipt.

| # | Studio | Engine | Data in private build | Explore | Guided (state-checked) | Challenge (server-graded) | Browser e2e (this session) | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | brain-anatomy | anatomy3d | BodyParts3D 4.0 (63) | yes | 5 steps | Identify/Find/Type | 5/5 + smoke | FUNCTIONAL_WITH_PENDING_CLEARANCE (BodyParts3D licence) |
| 2 | brain-ct | volume | fixture | yes | 5 steps | crosshair items | guided 1/1 + smoke | TECHNICAL_FIXTURE_ONLY |
| 3 | brain-mri | volume (NiiVue) | SRI24 | yes | 5 steps | crosshair items | 6/6 + smoke | FUNCTIONAL_WITH_PENDING_CLEARANCE (LPBA40 labels BLOCKED) |
| 4 | head-neck-anatomy | anatomy3d | BodyParts3D (52) | yes | 5 steps | Identify/Find | smoke | FUNCTIONAL_WITH_PENDING_CLEARANCE |
| 5 | spine-anatomy | anatomy3d | BodyParts3D (42) | yes | 5 steps | Identify/Find | smoke | FUNCTIONAL_WITH_PENDING_CLEARANCE |
| 6 | spine-mri | volume | SPIDER case 1_t2 | yes | 4 steps | tissue-class items | smoke | FUNCTIONAL_PRIVATE_REVIEW |
| 7 | thorax-anatomy | anatomy3d | BodyParts3D (30) | yes | 5 steps | Identify/Find | smoke | FUNCTIONAL_WITH_PENDING_CLEARANCE |
| 8 | chest-xray | image2d | PTX-498 (4 radiographs + masks) | yes | 4 steps | find-region (server polygon) | smoke | FUNCTIONAL_PRIVATE_REVIEW |
| 9 | chest-ct | volume (NiiVue) | LIDC-IDRI-0001 | yes | 5 steps | nodule yes/no | 5/5 + smoke | FUNCTIONAL_PRIVATE_REVIEW |
| 10 | lung-ultrasound | image2d | fixture | yes | 4 steps | find-region / choice | smoke | TECHNICAL_FIXTURE_ONLY |
| 11 | heart-anatomy | anatomy3d | BodyParts3D (33) | yes | 5 steps | Identify/Find | smoke | FUNCTIONAL_WITH_PENDING_CLEARANCE |
| 12 | cardiac-echo | image2d | fixture | yes | 4 steps | find-region / choice | smoke | TECHNICAL_FIXTURE_ONLY |
| 13 | cardiac-ct | volume | fixture (CTACardio restricted) | yes | 5 steps | crosshair items | smoke | BLOCKED (data) · app TECHNICAL_FIXTURE_ONLY |
| 14 | ecg | ecg | PTB-XL (6 records) | yes | 5 steps | interpretation | 6/6 + smoke | FUNCTIONAL_PRIVATE_REVIEW |
| 15 | abdomen-anatomy | anatomy3d | BodyParts3D (18) | yes | 5 steps | Identify/Find | smoke | FUNCTIONAL_WITH_PENDING_CLEARANCE |
| 16 | abdomen-ct | volume (NiiVue) | AMOS case 0004 (13 organs; kidneys withheld) | yes | 5 steps | crosshair organ items | smoke | FUNCTIONAL_WITH_PENDING_CLEARANCE (AMOS licence) |
| 17 | abdomen-ultrasound | image2d | fixture | yes | 4 steps | find-region / choice | smoke | TECHNICAL_FIXTURE_ONLY |
| 18 | fast-ultrasound | image2d | fixture | yes | 4 steps | find-region / choice | smoke | TECHNICAL_FIXTURE_ONLY |
| 19 | pelvis-anatomy | anatomy3d | BodyParts3D (26, male) | yes | 5 steps | Identify/Find | smoke | FUNCTIONAL_WITH_PENDING_CLEARANCE (male only) |
| 20 | pelvis-ultrasound | image2d | HC18 (4 fetal-head images, mm-calibrated) | yes | 4 steps | find-region (server polygon) | smoke | FUNCTIONAL_PRIVATE_REVIEW (obstetric scope) |
| 21 | upper-limb-anatomy | anatomy3d | BodyParts3D (52) | yes | 5 steps | Identify/Find | smoke | FUNCTIONAL_WITH_PENDING_CLEARANCE |
| 22 | lower-limb-anatomy | anatomy3d | BodyParts3D (50) | yes | 5 steps | Identify/Find | smoke | FUNCTIONAL_WITH_PENDING_CLEARANCE |
| 23 | msk-xray | image2d | fixture | yes | 4 steps | find-region / choice | smoke | TECHNICAL_FIXTURE_ONLY |
| 24 | knee-mri | volume | fixture | yes | 5 steps | crosshair items | smoke | TECHNICAL_FIXTURE_ONLY |

"smoke" = `test/all-studios.e2e.mjs`: Explore and Guided load in Chromium without page errors (24/24 on fixture builds,
24/24 on private builds where data exists). Challenge grading and progress are proven against a real PocketBase with synthetic keys (`studios-challenge-api.test.mjs`,
10/10). A **full browser run through the authenticated host** (login → hub → iframe → Explore → Guided → Challenge → progress →
re-entry → revocation) passes 7/7 for the anatomy3d engine on a `test-` fixture (`npm run test:studios-fullstack`); the other
engines share the same host/bridge/Challenge client but were not individually run through the host.

## Not done / known gaps

- Typed quiz items are only issued with an **approved** terminology pack; no Indonesian/Latin pack has been reviewed, so typed
  questions are inactive for real anatomy data (engine proven on an engineering pack).
- ~~Learner progress persistence~~ done: additive `studio_progress` collection (migration 1800003300), server-written scores,
  Guided self-reports, re-entry summary on the studio page, admin aggregate (`/api/medcoel/admin/studio-progress`).
- Ultrasound **video** clips (engine handles still images only); cardiac echo views; X-ray DICOM (images are PNG in fixtures).
- Anatomy models are large (1–11 MB each); mesh simplification/compression not done.
- Spine MRI overlay palette needs tuning; anatomy terminology is English source names only.
- Safari / iPad / real GPUs not tested (Chromium + SwiftShader only).
