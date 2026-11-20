# 24-studio completion matrix (honest status, 2026-11-20)

Status definitions: `FUNCTIONAL_WITH_VERIFIED_RESOURCES` (none yet) · `FUNCTIONAL_PRIVATE_REVIEW` (works end to end on real
acquired data in private review; not releasable) · `TECHNICAL_FIXTURE_ONLY` (app and engine work on a labelled synthetic
fixture; no clinical data) · `PARTIALLY_IMPLEMENTED` · `BLOCKED` · `NOT_STARTED`.

Every studio is an **independent Vite build** (`apps/studios/<id>/`, own entry, bundle, `dist/` and `studio-manifest.json`)
over shared engine libraries (`engines/volume`, `engines/anatomy3d`, `engines/ecg`, `engines/image2d`, `shell/`).
**Release eligibility is NO for all 24**: no rights record is verified, no privacy/medical review is signed, and the canonical
catalog keeps every studio `planned`/`blocked`. The secure launch pipeline (WS1) refuses to issue a receipt.

| # | Studio | Engine | Data in private build | Explore | Guided (state-checked) | Challenge (server-graded) | Browser e2e (this session) | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | brain-anatomy | anatomy3d | BodyParts3D 4.0 (63) | yes | 5 steps | Identify/Find/Type | 5/5 + smoke | FUNCTIONAL_PRIVATE_REVIEW |
| 2 | brain-ct | volume | fixture | yes | 5 steps | crosshair items | guided 1/1 + smoke | TECHNICAL_FIXTURE_ONLY |
| 3 | brain-mri | volume (NiiVue) | SRI24 | yes | 5 steps | crosshair items | 6/6 + smoke | FUNCTIONAL_PRIVATE_REVIEW |
| 4 | head-neck-anatomy | anatomy3d | BodyParts3D (52) | yes | 5 steps | Identify/Find | smoke | FUNCTIONAL_PRIVATE_REVIEW |
| 5 | spine-anatomy | anatomy3d | BodyParts3D (42) | yes | 5 steps | Identify/Find | smoke | FUNCTIONAL_PRIVATE_REVIEW |
| 6 | spine-mri | volume | SPIDER case 1_t2 | yes | 4 steps | tissue-class items | smoke | FUNCTIONAL_PRIVATE_REVIEW |
| 7 | thorax-anatomy | anatomy3d | BodyParts3D (30) | yes | 5 steps | Identify/Find | smoke | FUNCTIONAL_PRIVATE_REVIEW |
| 8 | chest-xray | image2d | fixture | yes | 4 steps | find-region / choice | guided 1/1 + smoke | TECHNICAL_FIXTURE_ONLY |
| 9 | chest-ct | volume (NiiVue) | LIDC-IDRI-0001 | yes | 5 steps | nodule yes/no | 5/5 + smoke | FUNCTIONAL_PRIVATE_REVIEW |
| 10 | lung-ultrasound | image2d | fixture | yes | 4 steps | find-region / choice | smoke | TECHNICAL_FIXTURE_ONLY |
| 11 | heart-anatomy | anatomy3d | BodyParts3D (33) | yes | 5 steps | Identify/Find | smoke | FUNCTIONAL_PRIVATE_REVIEW |
| 12 | cardiac-echo | image2d | fixture | yes | 4 steps | find-region / choice | smoke | TECHNICAL_FIXTURE_ONLY |
| 13 | cardiac-ct | volume | fixture (CTACardio restricted) | yes | 5 steps | crosshair items | smoke | BLOCKED (data) · app TECHNICAL_FIXTURE_ONLY |
| 14 | ecg | ecg | PTB-XL (6 records) | yes | 5 steps | interpretation | 6/6 + smoke | FUNCTIONAL_PRIVATE_REVIEW |
| 15 | abdomen-anatomy | anatomy3d | BodyParts3D (18) | yes | 5 steps | Identify/Find | smoke | FUNCTIONAL_PRIVATE_REVIEW |
| 16 | abdomen-ct | volume | fixture | yes | 5 steps | crosshair items | smoke | TECHNICAL_FIXTURE_ONLY |
| 17 | abdomen-ultrasound | image2d | fixture | yes | 4 steps | find-region / choice | smoke | TECHNICAL_FIXTURE_ONLY |
| 18 | fast-ultrasound | image2d | fixture | yes | 4 steps | find-region / choice | smoke | TECHNICAL_FIXTURE_ONLY |
| 19 | pelvis-anatomy | anatomy3d | BodyParts3D (26, male) | yes | 5 steps | Identify/Find | smoke | FUNCTIONAL_PRIVATE_REVIEW (male only) |
| 20 | pelvis-ultrasound | image2d | fixture | yes | 4 steps | find-region / choice | smoke | TECHNICAL_FIXTURE_ONLY |
| 21 | upper-limb-anatomy | anatomy3d | BodyParts3D (52) | yes | 5 steps | Identify/Find | smoke | FUNCTIONAL_PRIVATE_REVIEW |
| 22 | lower-limb-anatomy | anatomy3d | BodyParts3D (50) | yes | 5 steps | Identify/Find | smoke | FUNCTIONAL_PRIVATE_REVIEW |
| 23 | msk-xray | image2d | fixture | yes | 4 steps | find-region / choice | smoke | TECHNICAL_FIXTURE_ONLY |
| 24 | knee-mri | volume | fixture | yes | 5 steps | crosshair items | smoke | TECHNICAL_FIXTURE_ONLY |

"smoke" = `test/all-studios.e2e.mjs`: Explore and Guided load in Chromium without page errors (24/24 on fixture builds,
24/24 on private builds where data exists). Challenge grading is proven against a real PocketBase with synthetic keys
(`studios-challenge-api.test.mjs`, 7/7); a full browser Challenge run per studio through the launch pipeline was **not** done.

## Not done / known gaps

- Typed quiz items are only issued with an **approved** terminology pack; no Indonesian/Latin pack has been reviewed, so typed
  questions are inactive for real anatomy data (engine proven on an engineering pack).
- Learner progress persistence for Challenge (needs a collection and design approval).
- Ultrasound **video** clips (engine handles still images only); cardiac echo views; X-ray DICOM (images are PNG in fixtures).
- Anatomy models are large (1–11 MB each); mesh simplification/compression not done.
- Spine MRI overlay palette needs tuning; anatomy terminology is English source names only.
- Safari / iPad / real GPUs not tested (Chromium + SwiftShader only).
