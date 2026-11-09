# QC follow-up after merged PR #161 — independent Anatomy pilot

Date: 9 November 2026. This is **engineering quality control**, not commercial release approval.

## Verified from repository and CI

- PR #161 (`feature/anatomy-parity-provenance-review`) merged into `feature/4d-lab-official-logo-guided-tour` (merge `faace2f72cbc0f9527a5c6a1d969c3d44dbfad54`).
- The PR's GitHub Actions CI completed successfully.
- It added multi-system viewing, regions, hide/isolate/undo, faded/transparent rendering, camera presets, share links, a parity inventory and local exact-byte rights inventory.
- The prior Playwright Chromium E2E run could not start due to sandbox socket restrictions. **Browser interaction and Safari remain UNVERIFIED.**
- Both `atlas-viewer` and `4d-lab` remain `blocked` in the public commercial-release policy with no approved build digests.

## Regressions found during code review and fixed in this PR

1. **Blank model after switching systems.** The isolated/faded/selected key from an unloaded system was retained; the active model could therefore be completely invisible. Disabling a system now clears context only when its system is no longer enabled. Exclusive system selection becomes a single undoable operation.
2. **Search/pick of a hidden object.** Previously search or clicking could select an invisible object. The new `reveal` transition restores the requested item, removes conflicting isolation and fade, and preserves undo.
3. **Incorrect opacity fallback.** An explicit zero value formerly became 100% opaque. It now clamps to the supported 15% minimum.
4. **Parity worklist accuracy.** The matrix incorrectly said zoom buttons were absent even though PR #161 added them. Corrected to implemented but browser-unverified.

Unit tests were added for all the state regressions. The opt-in Chromium E2E script now also reproduces isolate→exclusive-system and hidden→search→reveal flows.

## Manual Safari review on the owner's Apple Silicon Mac

Use the **local review** command, not the public staging/deployment scripts:

```bash
npm run preview:4d-lab
```

Open `http://127.0.0.1:4173/anatomy/4d-lab/atlas-preview/` on that Mac.

| Check | Expected |
|---|---|
| Initial view | Skeleton loads; model visible, no blank viewport or JS errors |
| Multi-system | Enable muscular + cardiovascular; multiple systems visible without losing skeleton |
| Isolate then change `Sistem anatomi` | Select sternum, isolate, switch to visceral; visible organs appear rather than a blank scene |
| Hide then search | Hide sternum, search and select it again; it reappears, highlight and camera framing work |
| Undo | One undo after exclusive switch restores prior enabled systems and isolate context |
| Transparency / fade | Opacity changes smoothly; faded other structures remain recognizable |
| Regions | Thorax/abdomen/head/limbs filter visible catalog structures; empty dataset is labelled, not fabricated |
| Camera | Front/back/side/top, zoom, pan, fit; no camera flips or sudden jumps |
| Share view | Copy URL, reload; valid camera, systems, region and selection restore |
| Licence quarantine | No `nervous.glb` request; no request to `/anatomy/viewer/` from pilot |
| Original 4D Lab | Open `/anatomy/4d-lab/`: probe, independent camera, CT/USG monitor, tri-planar and auscultation remain usable |
| Responsive | Mobile-sized viewport + Safari: controls accessible, no unintended overflow |
| Resource use | Observe memory and frame responsiveness on 8 GB Safari; record crashes/poor loading |

Capture before/after screenshots and browser console network errors. Report actual browser and device. Do **not** claim test pass merely because GitHub CI passes.

## Release constraints

- The mature NC Atlas Viewer is the functional reference, not a source of permission to reuse restricted code.
- The independent pilot is not yet feature-complete and is explicitly excluded from ordinary 4D Lab builds.
- Model provenance, code authorship, derived CT/USG rights, accurate anatomy, and clinical review remain pending.
- No change to production routes, Caddy, PocketBase, commercial clearance manifest, or distribution policy occurs in this PR.
