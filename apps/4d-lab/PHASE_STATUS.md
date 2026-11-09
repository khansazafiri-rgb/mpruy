# Phase status — MEDCOEL Anatomy Live 4D Lab

_Last updated: 2026-11-09 (branch `claude/vigilant-cerf-jjc6fj`, based on `b931e1b`): **licence quarantine** — withheld atlas anatomy removed, atlas dataset rebuilt from cleared inputs (CC BY-SA 4.0), build/stage/preview guards. See `../../licensing/`._

## UX, anatomy intelligence & clinical education upgrade (2026-11-09)
Details: `UX_DESIGN.md`. Stacked on the licence quarantine; not deployed.
| Stage | Status | Evidence |
|---|---|---|
| B Axis-first movement (rings opt-in, mode bar, six patient directions, side selection, presets, keyboard) | **Done** | `test/ux.test.mjs`, `test/e2e/ux-e2e.mjs`, `evidence/ux-02…04` |
| C Smart identification (5 levels, contours, hover, click-to-explain, 2D↔3D link, unavailable anatomy) | **Done** | `test/assist.test.mjs`, `evidence/ux-05…07` |
| D Tri-planar CT with linked crosshairs, W/L presets | **Done** | `evidence/ux-08-triplanar.jpg` |
| E Workspaces, drawer layout, MEDCOEL tokens, iPad/phone layouts | **Done** (Chromium emulation only) | `evidence/ux-12…14` |
| F Learning modes/modules, structured pathology cases, credits page | **Done (content draft)** | `evidence/ux-10, ux-11`; `MEDICAL_REVIEW_CHECKLIST.md` §H |
| G Auscultation workspace (sites, guide, bell/diaphragm, normal/patho, demos) | **Done (audio review pending)** | `evidence/ux-09-auscultation.jpg` |
| H Tests, evidence, docs, PR | **Done**; Safari **not tested** | `UX_DESIGN.md` §6–7 |

## Licence quarantine (2026-11-09) — highest priority
| Item | Status |
|---|---|
| `nervous.glb` (Brainder, UW White matter, Dundee inner ear/cranial nerves) | **Withheld**; lab layer 'Saraf batang tubuh' removed, shown as unavailable; never requested (atlas e2e) |
| Kidney + renal pelvis (CC BY-NC) and ossicles | **Removed** losslessly from the atlas GLBs; kidney labels 20/21 and spinal cord 35 flagged unavailable with zero voxels; RUQ view retargeted to the hepatorenal liver surface and labelled 'ginjal tidak tersedia' |
| Atlas dataset | **Rebuilt** from cleared inputs; pipeline fails closed on quarantined inputs |
| Evidence | atlas-*.jpg regenerated (`evidence/CLEARED_EVIDENCE.json`); label-slice/standard-view PNGs and staging screenshots withdrawn, not yet regenerated |
| Paused feature work | Resumed and completed (UX upgrade section above) |

Evidence files are in `evidence/`; test commands are listed in `TEST_RESULTS.md`.

| Phase | Status | Gate | Evidence |
|---|---|---|---|
| 1 Freehand scanner | **Complete** | Plane moves and rotates freely without depending on skin contours — **passed** | unit tests 1–6; e2e "clinical probe…", "free 3D mode…", "camera orbit…"; `evidence/04-free-oblique.jpg` |
| 2 Anatomical patient | **Implemented; gate needs owner review** | "User recognises the region and knows exactly where the probe is" is a human judgement. Automated proxies pass. The owner's confirmation and a real-CT (CTACardio) run are still open. | unit tests 7–10; `pipeline/test_pipeline.py` (12 checks); e2e "anterior and posterior skin placement", "dragging the probe"; `evidence/01…03, 07, 09, 11` |
| 3 Ultrasound engine | **Complete** | US output responds to probe orientation and tissue parameters via executable simulation — **passed** | unit tests 11–19; e2e "ultrasound responds to tissue parameters…"; `evidence/us-*.png` |
| 4 Organ motion | **Complete** | Each system has a working, controllable motion demo — **passed** (cardiac, respiratory, gastric antral peristalsis) | unit tests 20–26; e2e "physiology…"; `evidence/07-cutaway-motion.jpg` |
| 5 Pathology + auscultation | **Complete (educational scope)** | At least one integrated normal-vs-pathological scenario and a functional auscultation workflow — **passed** (3 scenarios; stethoscope, synthesised S1/S2/S3, breath and bowel sounds, PCG strip) | unit tests 27–33; e2e "pathology…", "auscultation…"; `evidence/08, 09, 10` |

## Release readiness (2026-11-09) — after the PR #136 merge `58f8769`
| Item | Status |
|---|---|
| Merged code verified, CI-equivalent suites and builds | **Pass** (details: `RELEASE_READINESS.md` §2, `TEST_RESULTS.md`) |
| Reviewable preview | **Local staging preview** `npm run preview:4d-lab` (production URL layout, self-checks). No isolated staging server exists; nothing deployed |
| Safari / 8 GB Apple Silicon | **Not tested** (unavailable to the session). Static compatibility review done: needs Safari ≥ 16.4; SHA-256 fallback added for plain-http LAN previews |
| Owner acceptance (12-item Safari checklist) | **Open** — `RELEASE_READINESS.md` §3 |
| Clinical/anatomical review | **Open** — `MEDICAL_REVIEW_CHECKLIST.md` (flags: HFrEF text vs subxiphoid window, displayed vs measured EF, mirror-artefact text, S3 timing 180 vs 140 ms, small atlas LV EDV) |
| Licence compliance | **Superseded by the licence quarantine** (above) |
| Production deployment | **Not started** — plan in `RELEASE_READINESS.md` §7, needs approval |

## Atlas integration (2026-11-08) — status by element
| Element | Status | Evidence / note |
|---|---|---|
| Atlas audit (inventory, units, axes, licences, gaps, memory) | **Done** | `ATLAS_INTEGRATION_AUDIT.md` |
| Shared atlas models at runtime from `/anatomy/viewer/` (no copies, decoder not bundled) | **Implemented, tested** | atlas e2e "shared atlas models load"; `dist/assets` has no Draco files |
| Selective loading (4 systems by default, 3 on demand, subset kept per system, unload API) | **Implemented, tested** | 484 structures / 1.79 M triangles kept of 10.4 M |
| Atlas-derived synthetic CT + labels in an exact atlas→LPS frame | **Implemented, tested** | `test/atlas-integration.test.mjs` (frame, L/R, mesh↔label agreement ≥ 90 %); `evidence/atlas-label-slices.png` |
| Skin surface | **Approximate (illustrative)** | atlas envelope + assumed fat/skin; closed; 99.6 % on the CT body boundary; labelled "kulit ilustratif" |
| Atlas ↔ procedural phantom | **Explicitly not registered** | rigid-fit residual RMS 37.5 mm, max 61 mm; atlas never shown on the phantom |
| Atlas ↔ real CT | **Not possible with available data** | no authorised acquired CT; atlas hidden for local CT |
| Display modes, systems/transparency, search/highlight/isolate/hide, pick in 3D, legend, frames panel | **Implemented, tested (Chromium)** | atlas e2e; `evidence/atlas-*.jpg` |
| Independent probe (clinical + free 3D) on the atlas body; camera never changes the scan | **Preserved, tested** | atlas e2e steps "fixed contact point", "camera rotation", "free 3D" |
| Phases 3–5 on the atlas dataset (US, CT, motion, pathology, auscultation) | **Working, tested** | atlas unit tests 9–12; atlas e2e "dynamic heart", "pathology + auscultation" |
| Procedural motion of atlas meshes | **Approximate (procedural)** | same displacement field as imaging (checked < 0.01 mm); heart, lungs, diaphragm, liver, stomach, spleen, kidneys, great vessels; coronaries static/hidden |
| Phantom dataset (Phases 1–5 regression) | **Preserved** | phantom e2e 14/14; unit tests 33/33 unchanged |
| Apical 4-chamber window on the atlas body | **Limited** | lingula/anterior lung margins cover the apex in this atlas body; HFrEF uses the clearest cardiac window (subxiphoid) |
| Lateral chest wall | **Limited** | atlas arms are adducted against the chest; mid-axillary sites sit just below the arm |
| Safari / 8 GB Apple Silicon | **Not tested** | not available to this session |
| Human anatomical/clinical review of the atlas-derived dataset | **Open** | owner / clinician |

## What exists now
- `apps/4d-lab`: integrated workstation with a 3D patient on an exam table (CT-derived skin and 20 organ meshes with verified registration), clinical and free 3D probe modes, rotation/translation gizmos, exact numeric controls, CT/US/split monitor with zoom, pan, fit, 1:1, expand and fullscreen, CT window/level, physiology playback, pathology scenarios and auscultation.
- MEDCOEL integration: `/anatomy/live` (React page `apps/web/src/pages/LiveLab.jsx`) frames the static build at `/anatomy/4d-lab/`. Links are in the Anatomy header and on the landing page. Staging script and Caddy snippet are ready but **not deployed**.

## Not verified / open items (do not claim these)
1. **Safari / macOS / 8 GB Apple Silicon**: not tested. Only headless Chromium (SwiftShader software WebGL) on Linux was run. Its ~10 fps reflects software rendering, not target hardware. JS heap after a full e2e session was 73 MiB.
2. **CTACardio**: not available to this session and not uploaded (rights unconfirmed). The local route (`pipeline/README.md`) is implemented and its core (`reconstruct_ct`) is tested on the phantom. The 3D Slicer wrapper (`pipeline/slicer_reconstruct.py`) was **not executed** because Slicer is not installed here.
3. **Human review**: anatomical recognisability (Phase 2 gate), clinical accuracy of scenario text and auscultation sound quality need review by the MEDCOEL owner / a clinician. Audio *scheduling* was verified in Chromium (AudioContext running, beats scheduled); nobody listened to it.
4. **Language**: UI labels are Indonesian. Scenario explanations and findings are English for accuracy; translate them through MEDCOEL's normal i18n review.
5. **Physiology is procedural** (no licensed time-resolved data). It is labelled as an educational approximation everywhere.
6. Phantom limitations: 2.5 mm voxels, simplified organ shapes, no vessels inside lung or liver, no small anatomy. The body touches the CT table at the buttocks, so automatic thresholding keeps ~0.2% of table voxels; use the corrected-mask route for real CT.

## Resume here (atlas)
- Owner review on the Mac (Safari): the atlas dataset is the default at `/anatomy/live`; the procedural phantom is `?dataset=phantom`.
- If the shell or labels need changes: edit `pipeline/atlas/build_atlas_dataset.mjs`, run `npm run atlas:dataset`, `npm run atlas:evidence`, `npm test`, then both browser suites.
- Commercial use: replace the NC kidney, rebuild (see `ASSET_LICENSE_REGISTRY.md`).

## Resume here
- Deploy to staging only after approval: see `INTEGRATION.md`.
- Owner QC session on a Mac with Safari: run through `TEST_RESULTS.md` § "Manual checklist" and record the results here.
- CTACardio locally: `pipeline/README.md` → load `ct.nrrd` + `skin.glb` + `registration.json` (+ optional labels and anatomy) in the Data tab.
- Candidate next work: per-region speckle textures (muscle fibres, portal triads), Doppler, M-mode, assessment mode with PocketBase quizzes after clinical review.
