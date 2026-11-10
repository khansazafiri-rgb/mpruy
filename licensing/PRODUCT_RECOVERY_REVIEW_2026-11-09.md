# MEDCOEL Anatomy and 4D Lab recovery review

This branch follows merged PR #163 (`e9b28c5`). It is a local review candidate only. It does not replace the mature `/anatomy/viewer/` route or modify MEDCOEL production infrastructure.

## Visual baseline and work completed

The owner's two Safari screenshots dated 2026-11-09 show (A) the rejected dark-blue viewer with a permanent left sidebar and small model, and (B) the mature green Atlas workspace with top search, floating region picker, right camera stack and bottom system dock. Neither is an after screenshot of this branch.

The independently authored candidate now places those four functional interfaces around a full-width canvas. Region cards display tiny previews rendered from the **currently loaded allowed model geometry**, using a single 72×72 render target that is disposed after use; no legacy thumbnail file is imported. The existing corner-based camera fit stays in place. Selection actions and structure details appear only when a structure is selected. A selected structure's opacity can be adjusted independently; transparent material clones are released when an override is removed or its model unloads. The available six bundled systems are toggled from the dock; no absent artery/vein/respiratory subgroups are invented. The original viewer remains available as an unchanged functional reference while its NC code and model rights are unresolved.

The 4D Lab retains its existing clinical probe, Free 3D, CT/USG, tri-planar, auscultation, physiology, pathology, and tutorial implementation. This branch consolidates the stethoscope and listening marker visibility policy: the tool appears only while the auscultation instrument is active in Auskultasi or Belajar. It leaves the image plane's separate visibility policy intact.

## Actual checks

| Area | Result |
| --- | --- |
| 4D Lab unit/integration | 100 pass, 0 fail; includes LPS registration, probe pose, synthetic CT/USG, MPR, pathology, the stethoscope transition policy and independent viewer state/layout checks |
| 4D staging/preview | 4 pass, 0 fail |
| Anatomy integration | 10 pass, 0 fail |
| Licensing/quarantine | 19 pass, 0 fail; 0 of 14 rights records verified; release still blocked |
| Ordinary 4D Lab and opt-in independent viewer | Both Vite builds pass; ordinary build excludes the independent viewer |
| Browser E2E on changed candidate | **Blocked before page load.** System Chromium aborts at `socket() failed: Operation not permitted`. Browser service also refused access to the local preview URL by policy. No after screenshot or interactive WebGL proof exists. |
| Safari on Apple Silicon / iPad / 8 GB memory | **Not executed.** No FPS, GPU memory or responsiveness measurements are claimed. |

The E2E script checks top search, floating region picker, a model-generated region thumbnail, bottom dock, right camera controls, projected body size, search, isolate, hide/undo, switching systems, URL state and restricted network requests when a permitted browser is available. It optionally captures an actual screenshot with `ATLAS_SCREENSHOT_DIR`. A screenshot comparison to the supplied mature green view remains a required acceptance gate. No screenshot has been synthesized.

## Feature and rights disposition

The machine-readable [`atlas-feature-parity.json`](atlas-feature-parity.json) lists implemented but browser-unverified and incomplete features. Critical remaining gaps include semantic layer stepping, sourced anatomy descriptions and curriculum integration. Per-structure transparency and undo/redo are implemented but browser-unverified. The six packaged groups are coarser than the mature Atlas dock. These are visible blockers to declaring full feature parity.

The code-origin overlap test is only a literal-copy screen. The legacy Atlas frontend is CC BY-NC-SA 4.0 and has no documented commercial grant. The independent viewer source still needs qualified expressive-similarity and contributor-rights review. All six model bundles have inferred per-structure provenance. The 4D Lab's atlas-derived synthetic CT, labels, skin and USG teaching images inherit that unresolved input chain. Dependency licences and media are metadata-only or pending evidence. Quarantined nervous, inner-ear, kidney and other uncertain assets remain withheld. No new clinical dataset, mesh, audio, tutorial media or third-party image was added here.

**Release decision:** Anatomy Viewer RED, 4D Lab RED for intended public/commercial distribution. Local review is technically possible; production activation requires exact-version rights evidence, attribution/ShareAlike and derivative review, browser/Safari QA, approved build digest, and owner authorization. Preserve the current route and existing rollback path until then.

Local preview: install dependencies, run `npm run preview:4d-lab`, then visit `http://127.0.0.1:4173/anatomy/4d-lab/atlas-preview/`. This command builds the local opt-in viewer and web preview. To run the independent page directly during development use `npm run dev --prefix apps/4d-lab` and `http://127.0.0.1:4180/atlas-preview/`.
