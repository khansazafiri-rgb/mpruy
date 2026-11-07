# MEDCOEL 4D Lab — working notes for Claude Code sessions

Read `PHASE_STATUS.md` first: it records what is done, what is blocked and where to resume.

## What this is
`apps/4d-lab` is the MEDCOEL Anatomy Live 4D Lab: an educational freehand CT / simulated
ultrasound workstation. It is a standalone Vite app (vanilla JS modules + three.js), built with
base `/anatomy/4d-lab/` and embedded by the main web app at `/anatomy/live`
(`apps/web/src/pages/LiveLab.jsx`). It is NOT a medical device and must never claim validation.

## Layout
- `src/core/`  pure geometry: NRRD, affine sampling, probe kinematics, reslicing, GLB registration
- `src/sim/`   tissue table, ultrasound engine, physiology (motion fields), pathology, auscultation
- `src/app/`   UI: three.js scene, gizmos, monitor, panels (browser only)
- `pipeline/`  Python (numpy/scipy/VTK) phantom generator + CT->mesh reconstruction (also for local CTACardio)
- `public/data/phantom/` generated synthetic data (original, committed). Regenerate: `npm run phantom`
- `test/*.test.mjs` node:test unit/integration; `test/e2e/` Playwright browser tests
- `legacy/v0.9/` the previous prototype, kept for provenance (its own tests: `npm run test:legacy`)

## Rules
- Coordinates are patient LPS millimetres everywhere in `src/core` and `src/sim`. The three.js scene
  maps LPS -> scene with ONE matrix (`src/app/frames.js`). Never add visual offsets.
- Camera state must never feed imaging. Imaging depends only on probe/plane state + physiology time.
- Mesh deformation and image sampling must call the same `physiology.displacement` function.
- Never commit CTACardio, TotalSegmentator licence keys/weights, EchoNet, IT'IS ViP data. Put local data in `local-data/` (gitignored).
- Every simulated output is labelled as an educational approximation. Do not add diagnostic claims.
- Run `npm test` (fast) and `npm run test:e2e` (needs `npm run build` first; uses preinstalled Playwright Chromium) before committing.
- Update `PHASE_STATUS.md` after every milestone and commit.
