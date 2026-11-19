# Independent Anatomy Viewer: visual recovery candidate

This local candidate is **not approved for public staging or commercial distribution**. It keeps the 4D Lab application and the legacy viewer routes unchanged. Base: integration commit `cc8336a` (merged PRs #161 and #162).

## Observed problem and implementation

The owner-supplied Safari screenshot (2026-11-09 22:37 local) shows a full body at roughly three fifths of the viewport height inside a large dark canvas, a tall generic white sidebar, and camera controls below the visible portion of the sidebar. This is visual evidence of the **previous** candidate, not a screenshot of this revision.

The previous fit used `0.7 * box diagonal / tan(vertical FOV / 2) * 1.1`. A full body is tall but comparatively narrow, so this diagonal-based sphere fit creates excess camera distance. The replacement projects all eight box corners against the actual vertical and horizontal field of view, camera direction and viewport aspect. Its target occupancy is 0.78, with a small safety margin; unit tests cover whole-body proportions, top/side directions and narrow displays. The camera preset now interpolates position, target and up vector for 340 ms and yields immediately to direct pointer input.

The local viewer now has a dark navigation panel, a visible camera toolbar in the viewport, structure list, search results, selection actions, status, zoom, region filter and expandable recovery/share controls. The rights notice stays visible. These are newly authored interface changes to the independent pilot; the legacy NC frontend has not been copied into this route.

## Verification and limits

| Check | Result |
| --- | --- |
| Camera framing math | 3/3 tests pass, including 65–85% target on representative body bounds |
| 4D Lab unit/integration | 96/96 and staging/preview 4/4 pass before final camera-up tweak; rerun in final PR checks |
| Anatomy integration | 10/10 pass |
| Licensing/quarantine | 19/19 pass; audit reports 0/14 rights records verified; release remains blocked |
| Independent pilot and ordinary 4D builds | Both build; pilot is opt-in only |
| Chromium browser E2E | **Blocked in this container:** bundled browser absent; system Chromium aborts at `socket() failed: Operation not permitted`. Script includes measured projected model height and optional screenshot capture for a permitted browser environment. |
| Safari visual, touch, memory and network QA | **Not executed** on an Apple Silicon device. The new layout has no after screenshot or measured frame rate yet. |

The measured screenshot comparison, interactions and device QA are mandatory before claiming visual parity. Run the opt-in build locally, use the browser test with `ATLAS_SCREENSHOT_DIR` on a permitted machine, then inspect front/side/top/selected structure, system transitions, desktop and mobile layouts in Safari. The test should measure the projected model extent; on real models the result may differ from the synthetic unit geometry.

## Feature and release status

Implemented with unit coverage but browser unverified: model framing calculation, camera preset transition, catalogue-backed structure browser, responsive panel layout. Existing system toggles, hide/isolate/undo, search, opacity, share link and retry remain in the candidate; the merged #162 state regressions stay covered by tests.

Partial or missing: per-structure opacity, redo, system layer stepping, curated descriptions with rights evidence, study navigation, and validated mobile/Safari performance. The existing `atlas-feature-parity.json` remains the acceptance matrix. The 4D Lab has not been rebuilt from different anatomy; its synthetic CT, segmentation and ultrasound derivatives still depend on model provenance review. No clinical imaging dataset or new anatomical mesh was introduced in this change.

The application source in `apps/anatomy` is adapted from an upstream NC project and remains **RED** for commercial distribution. The independent candidate is **RED** while its six model bundles and derived 4D Lab resources have unverified per-structure input rights. The original website can continue separately under its existing release policy; this candidate is for local review only. A safe migration requires exact build hashes, model and derivative source evidence, dependency review, attribution/ShareAlike obligations, a qualified legal review, browser QA, and explicit owner approval for the exact candidate. No public route is changed here.

Local review: `npm run build:independent-atlas-pilot --prefix apps/4d-lab`, then `npm run preview:4d-lab`; open `http://127.0.0.1:4173/anatomy/4d-lab/atlas-preview/` in Safari. The normal 4D Lab build excludes the preview.
