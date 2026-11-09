# Test results — MEDCOEL Anatomy Live 4D Lab

## Release-readiness run — 2026-11-09 (merged head `58f8769` + preview/QA branch)
Cloud container (Linux x86-64, Node 22.23, Chromium headless with SwiftShader). **Safari was not available.**

| Suite | Merged head | Final branch |
|---|---|---|
| Web lint / web + PocketBase format tests / web build | pass / 140 + 58 / pass | unchanged code |
| Hermes check + tests | 67 pass | unchanged code |
| Anatomy integration / Atlas tests + lint / Atlas build | 7 / 77 + lint / pass | unchanged code |
| 4D Lab unit (`npm test --prefix apps/4d-lab`) | 45/45 | **46/46** (+ SHA-256 fallback vs node:crypto) |
| Staging + preview scripts | 1/1 | **3/3** (+ atlas model hash check, + preview routing/headers) |
| Browser, phantom | 14/14 | 14/14 |
| Browser, atlas | 14/14 | 14/14 (atlas ready 4.0–4.4 s, heap 73 MiB, deformation 33–41 ms/update) |
| MEDCOEL web integration (`/anatomy/live`) | pass | pass |
| Local staging preview smoke (`/anatomy/live` → lab → atlas ready) | — | pass on 127.0.0.1 (secure context) and on a LAN IP (non-secure, SHA-256 fallback) |
| Measured EF on the atlas LV (for review) | normal 55.9 % (model 58 %), HFrEF 19.3 % (model 26 %) | |
| PocketBase live API suite | not run here (binary download); GitHub CI | |

## Atlas integration run — 2026-11-08
Same container class (Linux x86-64, Node 22.23, Chromium via Playwright with SwiftShader software WebGL).
**Safari and Apple hardware were not tested.**

```bash
cd apps/4d-lab
npm ci
npm run atlas:dataset          # rebuild public/data/atlas from apps/anatomy/public/models (~70 s, deterministic)
npm test                       # 45 node:test tests (33 phase tests + 12 atlas tests)
npm run build
npm run test:e2e               # 14 browser tests, procedural phantom (?dataset=phantom) — Phases 1-5 regression
npm run test:e2e:atlas         # 14 browser tests, atlas dataset (default); add -- --shots for evidence/atlas-*.jpg
node test/e2e/integration.mjs  # /anatomy/live inside the MEDCOEL web app, now also waits for the shared atlas layer
```

| Suite | Result |
|---|---|
| Unit/integration (`npm test`) | 45/45 pass (33 existing unchanged + 12 atlas: frame/axes, left-right, registration + tamper, closed skin on the CT boundary, atlas mesh ↔ label agreement, documented non-registration to the phantom, standard windows aim at their organ, auscultation sites on ICS, warp exactness + EF on the atlas LV, diaphragm map, effusion, US blood vs myocardium) |
| Browser, phantom (`run-e2e.mjs`) | 14/14 pass |
| Browser, atlas (`atlas-e2e.mjs`) | 14/14 pass (`evidence/atlas-e2e-results.json`); evidence `evidence/atlas-01…12-*.jpg` |
| MEDCOEL web integration (`integration.mjs`) | pass: `/anatomy/live` frames the lab and the shared atlas layer reaches "ready" |
| Staging script test | 1/1 pass; `validateLab(dist)` reports datasets phantom + atlas |

### Atlas measurements
- Atlas default set: 484 structures, 1.79 M triangles, 0.93 M vertices kept (of 2,827 / 10.4 M). Decode + bake: visceral 2.3–2.9 s, cardiovascular 0.9–1.2 s, skeletal 0.2–0.6 s, lymphatic < 0.3 s; atlas ready 4.6–6.1 s after navigation (software WebGL).
- Atlas mesh motion: ≈ 100 k animated vertices, 46–60 ms per update under SwiftShader (scheduled adaptively); vertex displacement equals the imaging field to < 0.01 mm.
- JS heap after the full atlas session: 73 MiB.
- Skin shell: 206,580 triangles, closed, 99.6 % of tested vertices with air outside / tissue inside at ±5 mm.
- Atlas vs procedural phantom (not registered): rigid-fit residual RMS 37.5 mm, max 61 mm.
- Heart blood pools from the atlas chambers: LV 77, RV 92, LA 67, RA 93 mL.

## Phase 1–5 run — 2026-11-07
Executed 2026-11-07 in the cloud development container (Linux x86-64, Node 22.23, Python 3.13 with numpy/scipy/VTK 9.7,
Chromium via Playwright with SwiftShader software WebGL). **Safari and Apple hardware were not tested.**

## Commands
```bash
cd apps/4d-lab
npm ci
npm test                       # 33 node:test unit/integration tests (~5 s)
python3 pipeline/test_pipeline.py   # 12 reconstruction-pipeline checks (needs numpy, scipy, vtk)
npm run build && npm run test:e2e   # 14 browser tests (preinstalled Playwright Chromium)
node test/e2e/integration.mjs  # /anatomy/live inside the MEDCOEL web app (needs the web preview build, see file header)
npm run test:legacy            # previous v0.9 prototype suites (still passing)
```
From the repository root: `npm run test:4d-lab` (unit tests + staging script test) and `npm run build:4d-lab`.
CI (`.github/workflows/ci.yml`) runs the unit tests, the staging test and the build. The browser tests need Playwright and are run manually.

## Results
| Suite | Result |
|---|---|
| Phase 1 geometry (NRRD raw/gzip/big-endian/RAS/cm, exact trilinear on an oblique anisotropic grid, reslice in all presets, fixed contact under 300 random angulations, free-mode Euler round trip, out-of-volume fraction) | 6/6 pass |
| Phase 2 registration (affine/probe/SHA-256/anchor validation, tamper rejection, ≥97% of skin vertices with air outside and tissue inside at ±5 mm, organ placement) | 4/4 pass |
| Phase 3 ultrasound (impedance order, determinism, response to rotate/heel-toe/rock, anechoic bladder with posterior enhancement, rib shadow < 50% of intercostal brightness, frequency vs penetration and speckle size, gain/TGC/DR, tissue attenuation and backscatter edits, linear/convex/sector/free geometry, A-line reverberation) | 9/9 pass |
| Phase 4 motion (timing curves, inverse warp < 0.05 mm for all sampled points, EF measured from the deformation, diaphragm excursion 15/40 mm, wave speed and contraction count, mesh/image synchronisation, phase continuity, breath hold) | 7/7 pass |
| Phase 5 pathology/auscultation (scenario content, effusion volume and location, CT + US change in the effusion window, S1/S2/S3 timing and splitting, site weighting and reduced right-base breath sounds, synthesis determinism, reduced LV wall motion in HFrEF) | 7/7 pass |
| Pipeline (`pipeline/test_pipeline.py`) | 12/12 pass |
| Staging script (`scripts/stage-4d-lab.test.mjs`) | 1/1 pass |
| Browser e2e (`test/e2e/run-e2e.mjs`, results in `evidence/e2e-results.json`) | 14/14 pass |
| MEDCOEL integration (`test/e2e/integration.mjs`) | pass |
| Main web app (`apps/web`: `npm test`, lint, build) after adding `/anatomy/live` | 140/140 pass, lint clean, build ok |

### Measured values
- LV ejection fraction measured by counting deformed LV-cavity voxels: normal **57.7%** (model 57.9%; EDV 105 mL, ESV 44 mL); HFrEF pattern **21.7%** (model 25.5%; EDV 172 mL).
- Pleural effusion layer: 650 mL selected from 2,648 mL of right lung, centroid posterior and basal.
- Automatic body mask vs phantom body: Dice 0.9985. The skin surface is closed (0 boundary edges). 99th percentile of vertex-to-voxel-boundary distance is 2.5 mm.
- Ultrasound frame time (Node, this container): 12–29 ms at the interactive quality (0.6), 37–105 ms at full quality, motion included. In the browser it runs in a Web Worker (about 60–130 ms under SwiftShader load).
- Mesh deformation on the main thread: about 8–15 ms per update with organs visible, skin only when opaque. Updates are throttled to ≈22 Hz.
- Chromium JS heap after the full e2e session: **73 MiB**. The phantom download is about 6 MB (CT 2.1 MB, labels 0.26 MB, meshes 3.7 MB).

## Manual checklist (owner, Safari on the target Mac): not yet done
Atlas additions: (a) Anatomi tab: the organs are the Atlas MEDCOEL models (compare with `/anatomy/viewer/`);
(b) switch the five display modes; (c) isolate "Left ventricle" and return; (d) pick an organ with "Pilih di 3D";
(e) open "Sistem koordinat & registrasi" and check it states the atlas is not registered to the phantom;
(f) watch memory with all on-demand systems (muscles, nerves, joints) loaded.
1. Open `/anatomy/live`. The patient is recognisable and the head, chest, abdomen and arms are visible.
2. Click the skin at front, side and back. The probe lands where clicked and the region readout matches the location.
3. Change rotate / heel-toe / rock. The probe pivots on the same point and the image changes.
4. Orbit and zoom the camera. The image does not change.
5. Free 3D: axial → coronal → sagittal → oblique. Type exact angles and move the plane outside the CT; the red banner appears.
6. Expand and fullscreen the monitor, then zoom, pan and fit.
7. Play: heart, breathing and antrum move. Pause and scrub the cardiac phase.
8. Scenarios: HFrEF (apical), effusion (right posterolateral base, transparent skin) and gastroparesis (epigastric antrum).
9. Auscultation: turn sound on at mitral, aortic and right posterior base. Compare HFrEF S3 with the bell setting.
10. Watch Activity Monitor memory and responsiveness on the 8 GB machine.
