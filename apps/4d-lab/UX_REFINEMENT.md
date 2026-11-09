# MEDCOEL 4D Lab — Navigation, learning and auscultation UX

This is an additive usability change on top of the merged Atlas-based simulator. It does not change the CT or ultrasound physics models and does not deploy to production.

## What changed
- **Patient-axis navigation** in the Probe tab: six plain-language buttons for left/right, superior/inferior and anterior/posterior. The selected 5/10/25 mm step is in *patient* LPS millimetres, independent of camera view.
  - **Free 3D:** moves the actual slice plane along the corresponding LPS axis.
  - **Clinical:** takes a discrete step along the registered skin mesh. Anterior/Posterior intentionally picks the corresponding surface of the patient, and changes the camera to reveal it; it does not push the ultrasound beam through the patient's body. When no eligible skin vertex lies in CT coverage, movement is rejected with an explanatory status.
  - Existing drag gestures and precision degree controls remain available.
- **Contextual teaching card**: the Probe tab explains the current teaching window and how to interpret the *simulated* anatomy, or documents anatomical axes in Free 3D. Normal/pathology comparison remains in the Pathology tab.
- **Quick stethoscope audio** beside the monitor's ECG/PCG strip: the existing synthesised Web Audio system is exposed without requiring users to discover the Auscultation tab. Playback is synchronized to the procedural cardiac cycle and respects user activation / autoplay restrictions. It does not generate ECG-to-audio beeps and does not switch the user's scanning tool unexpectedly. Site/filter/volume selections remain in Auscultation.
- **Cleaner UI:** tab list uses one scrollable row; camera and monitor toolbar no longer wrap into overlapping rows; numeric controls take less vertical space; overlapping anatomical direction labels are filtered, preserving visible high-priority labels.

## Anatomical and teaching constraints
- LPS axes mean **patient left** = +L, **patient posterior** = +P, **patient superior** = +S. Do not confuse patient left with the viewer's screen left.
- The skin is an **illustrative shell**, not a registered real patient's skin. Clinical button nudges are discrete nearest-vertex approximations, not validated continuous probe biomechanics.
- CT and ultrasound are *educational simulations* derived from Atlas anatomy; ECG and phonocardiogram are schematic; synthesized heart, respiratory and bowel sounds are not recorded clinical findings.
- Synthetic S1 and S2 reflect mechanical valve-related heart sounds, not a noise emitted by the ECG electrical waveform itself.

## Verification
- Syntax of changed JavaScript modules was parsed independently.
- Pure navigation behaviour was exercised for all six patient-space axes and for anterior/posterior and lateral synthetic skin examples.
- Automated test added at `test/navigation.test.mjs`. **Full npm/browser/Safari test results have not been run in this session**. GitHub CI and a manual Safari run are still required before approval.

## Manual Safari acceptance checks
1. In Clinical mode, click skin in front; use Left/Right and Superior/Inferior. Ensure the contact and *corresponding image* change while the camera alone does not change imaging.
2. Use Anterior/Posterior; confirm front/back skin is chosen correctly, no through-body "teleport" within the imaging volume, and the camera shows the selected side.
3. In Free 3D, use all six buttons. Exact LPS position should move by the selected step and the scan plane should update, without re-coupling to the skin.
4. Change heel-toe/rock/rotation while holding contact fixed.
5. Confirm no label overlaps at whole-body, anterior and posterior camera presets on 8 GB Safari.
6. Enable "Dengar jantung" next to the ECG/PCG monitor. Sound should start after a click, remain synchronized to motion and reflect the mitral default site; scanner drag still works. In the Auscultation tab, compare mitral/aortic/right posterior lung, Bell/Diaphragm, S3 and respiratory sounds.
7. Verify the reading card changes when switching teaching windows, presets and scenarios.
8. Run full phantom and Atlas test suites and review memory, layout and browser console in Safari.

## Non-goals and clinical review
This change does **not** clinically validate ultrasound textures, ejection fraction calculations, pathology interpretation, ECG timing, or heart-sound synthesis. Previously identified discrepancies in `MEDICAL_REVIEW_CHECKLIST.md` still require a clinician's review before public launch. It does not add copyrighted audio recordings or restricted imaging datasets.

## Follow-up: instrument and CT navigation (November 2026)
- Quick audio previously made the chestpiece visible whenever `audio.on` was true, even while `S.tool` remained `probe`. A saved posterior listening site could therefore place it under the examination table. Visibility now follows the active auscultation tool in Auscultation/Belajar; audio playback remains independent. Switching workspaces clears the stale tool and site markers.
- The Probe tab offered Clinical/Free 3D, but it was behind the sidebar. A persistent viewport mode badge now names the active interaction and offers **Kembali ke Probe USG** from Free 3D and Tri-planar CT. Returning preserves a valid prior skin contact or chooses a skin point in the CT acquisition bounds; it restores probe controls and a clinical image display. CT volumes without registered skin keep Free 3D and explain why.
- The rectangular CT plane is legitimate Free 3D/Tri-planar geometry. Mode transitions hide its old texture while a new frame is prepared; worker frames from a previous mode are discarded. Camera controls remain independent from image geometry.
- Tri-planar CT now exposes separate axial, coronal and sagittal sliders, ± one physical step, millimetre readouts, a linked-crosshair reset, and Indonesian gesture/direction guidance above the image. The contextual three-step spotlight reuses the first-run tutorial engine and persists a separate completion key; help replays it.
- Belajar labels automatically prepared CT tasks and supplies a direct return-to-probe action without resetting learning progress.

### Verification and Safari gate
Run `npm run test:licensing`, `npm run test:4d-lab`, `npm run build:4d-lab`, then `node apps/4d-lab/test/e2e/mode-navigation-e2e.mjs --shots` and `node apps/4d-lab/test/e2e/ux-e2e.mjs --shots`. On environments with system Chromium, set `PLAYWRIGHT_CHROMIUM=/usr/bin/chromium` if the Playwright-managed browser is absent. Browser tests require permission to launch Chromium and create local sockets; a source-only pass is not a browser QA pass.

In Safari on macOS, check: audio quick toggle with probe active (no chestpiece below patient), Auscultation anterior/posterior sites, transitions through all five workspaces, Free 3D → Probe, Tri-planar → Probe, a Belajar Free 3D task → Probe, linked controls and crosshair click/scroll, first-use tri tutorial skip/back/replay, viewport camera orbit with unchanged image pose, smaller iPad layout, and browser console/WebGL. The Safari result must be recorded separately before merge.
