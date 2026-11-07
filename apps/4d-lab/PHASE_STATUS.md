# Phase status — MEDCOEL Anatomy Live 4D Lab

_Last updated: 2026-11-07 (branch `claude/confident-faraday-e9id72`, mirrored to `feature/medcoel-4d-lab`)._
Evidence files are in `evidence/`; test commands are listed in `TEST_RESULTS.md`.

| Phase | Status | Gate | Evidence |
|---|---|---|---|
| 1 Freehand scanner | **Complete** | Plane moves and rotates freely without depending on skin contours — **passed** | unit tests 1–6; e2e "clinical probe…", "free 3D mode…", "camera orbit…"; `evidence/04-free-oblique.jpg` |
| 2 Anatomical patient | **Implemented; gate needs owner review** | "User recognises the region and knows exactly where the probe is" is a human judgement. Automated proxies pass. The owner's confirmation and a real-CT (CTACardio) run are still open. | unit tests 7–10; `pipeline/test_pipeline.py` (12 checks); e2e "anterior and posterior skin placement", "dragging the probe"; `evidence/01…03, 07, 09, 11` |
| 3 Ultrasound engine | **Complete** | US output responds to probe orientation and tissue parameters via executable simulation — **passed** | unit tests 11–19; e2e "ultrasound responds to tissue parameters…"; `evidence/us-*.png` |
| 4 Organ motion | **Complete** | Each system has a working, controllable motion demo — **passed** (cardiac, respiratory, gastric antral peristalsis) | unit tests 20–26; e2e "physiology…"; `evidence/07-cutaway-motion.jpg` |
| 5 Pathology + auscultation | **Complete (educational scope)** | At least one integrated normal-vs-pathological scenario and a functional auscultation workflow — **passed** (3 scenarios; stethoscope, synthesised S1/S2/S3, breath and bowel sounds, PCG strip) | unit tests 27–33; e2e "pathology…", "auscultation…"; `evidence/08, 09, 10` |

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

## Resume here
- Deploy to staging only after approval: see `INTEGRATION.md`.
- Owner QC session on a Mac with Safari: run through `TEST_RESULTS.md` § "Manual checklist" and record the results here.
- CTACardio locally: `pipeline/README.md` → load `ct.nrrd` + `skin.glb` + `registration.json` (+ optional labels and anatomy) in the Data tab.
- Candidate next work: per-region speckle textures (muscle fibres, portal triads), Doppler, M-mode, assessment mode with PocketBase quizzes after clinical review.
