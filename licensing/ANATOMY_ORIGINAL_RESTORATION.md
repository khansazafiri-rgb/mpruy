# Restoring the original MEDCOEL 3D Anatomy experience

Date: 2026-11-10. Review candidate only: **not merged, not deployed, no release gate changed.**
Branch base: `feature/4d-lab-official-logo-guided-tour` (after PR #164).

## 1. What went wrong with the PR #160–#164 direction

- The **mature MEDCOEL Atlas Viewer was never removed.** `apps/anatomy` (the app behind `/anatomy`, `/anatomy/explore`
  and `/anatomy/viewer/`) was intact on the integration branch. Its only difference from the pre-quarantine version is the
  additive licence-quarantine layer from PR #140: `src/atlas/availability.js`, the withheld "Saraf" tile, the
  "tidak tersedia" search notice and the cleaned model files. `git diff a9894f4 HEAD -- apps/anatomy/src` is about 100 lines.
- What the owner saw was a **different application**: the independent pilot in `apps/4d-lab/src/independent-atlas`
  (`/anatomy/4d-lab/atlas-preview/`). It was the **only** viewer that `npm run preview:4d-lab` built and linked
  (`LAB4D_ATLAS_PILOT=1`). The original viewer was explicitly "not built" in that preview, so every review of "the Anatomy
  viewer" went through the pilot. PRs #161–#164 then tried to bend the pilot towards the original with layout changes.
- The pilot has six coarse system toggles, no sourced anatomy descriptions, no layer stepping, no structure list, no
  library, quiz or study integration. It cannot be brought to parity by CSS.

## 2. What this PR does

1. **The review preview now builds and serves the original MEDCOEL Atlas Viewer.** `npm run preview:4d-lab`
   (alias `npm run preview:review`) builds the 4D Lab, the original Atlas Viewer (through its quarantine-guarded Vite
   config, then re-scanned with `assertDistributionClean`) and the MEDCOEL web pages, and serves them with production URLs:

   | URL | What |
   |---|---|
   | `/anatomy` | Anatomi Manusia: overview, regions, systems, library |
   | `/anatomy/explore` | Atlas 3D (the original viewer, framed as in production) |
   | `/anatomy/viewer/` | the original viewer, full window |
   | `/anatomy/study` | Kuis anatomi 3D |
   | `/anatomy/live` | Anatomy Live 4D Lab (unchanged) |

2. **The pilot is no longer built by the preview**, no longer described as the Anatomy candidate, and stays an opt-in
   engineering experiment (`npm run build:independent-atlas-pilot --prefix apps/4d-lab`). Its files are not deleted: the
   licensing tooling and tests reference them, and removing them is an owner decision.
3. **A browser test for the original viewer** (`apps/anatomy/tests/e2e/original-viewer-e2e.mjs`, 16 journeys), because
   none existed. Evidence: `apps/anatomy/evidence/`.
4. No change to `apps/anatomy/src`, to the 4D Lab, to `licensing/commercial-release.json`, to
   `commercial-rights-evidence.json`, to the quarantine policy, or to any route configuration.

## 3. Feature-by-feature comparison (original viewer, Chromium, 1440×900)

Result column = `original-viewer-e2e.mjs` step. "Pilot" = the rejected blue viewer as of PR #164, taken from the PR #164 description and `atlas-feature-parity.json`; it was **not** re-measured in a browser here.

| Feature | Original MEDCOEL viewer | Pilot | Verified |
|---|---|---|---|
| Immersive canvas, no permanent sidebar | yes (canvas 1440×737, info panel only on selection) | full-width after #164, built on a different codebase | step 1 |
| Compact top search, centred | yes, with thumbnails and suggestions | partial | steps 1, 6 |
| Floating region selector, 8 visual cards with previews | yes | cards rendered from model, small | step 3 |
| Region change reframes camera and anatomy | yes (Toraks) | partial | step 3 |
| Right camera stack: zoom, zoom out, pan, Dpn / Smp / Blk / Ats, reset | yes | yes | steps 1, 4 |
| Bottom dock: 12 systems + withheld "Saraf" shown disabled with reason | yes | 6 coarse toggles | step 2 |
| `+` / `−` layer stepping per system (fascia → superficial → deep) | yes | missing | step 10 |
| Several systems at the same time | yes (5 active) | partial | step 10 |
| Structure list per system (⋯), `Lihat seluruh …` | yes | missing | step 11 |
| Quick presets Otot / Tulang / Organ / Semua | yes | missing | step 9, 10 |
| Search → select → camera focus + info panel (name, Latin, system, region, sourced text) | yes (Femur) | basic | step 6 |
| Isolate / return to context / focus / restore | yes | partial | step 7 |
| Hide / fade / fade others / undo / restore all | yes | partial | steps 8, 9 |
| Orbit, wheel zoom | yes | yes | step 5 |
| Share view link, help, first-run mascot tip | yes | share only | step 13 |
| Withheld anatomy: explained in search, never requested | yes | yes | step 12 |
| iPad portrait / phone layout | yes, no horizontal overflow | not measured | steps 14, 15 |
| Library, quiz, study modes, annotator, Indonesian/English data | yes (unchanged) | none | `rev-01`, `rev-04` screenshots |
| No runtime errors | 0 | – | step 16 |

Not exercised by an automated step: keyboard shortcuts beyond undo, trackpad pinch/gesture handling, annotator mode,
and loading-error recovery. These exist in the code and are **untested here**.

## 4. Provenance of the original viewer's code

What the repository can and cannot show:

- `apps/anatomy/package.json` declares `CC-BY-NC-SA-4.0`; `README.md` is the upstream `nqwrc/3d-anatomy` README;
  `README-MEDCOEL.md` calls the app "revisi kerja lokal dari sumber nqwrc/3d-anatomy". The owner has confirmed the
  upstream is a third-party project.
- The git history of `apps/anatomy` in this repository **starts with the import commit** `2d9f2ee` (2026-11-03). Per-file
  authorship from before that import cannot be recovered here. There are no per-file licence headers.
- Indicative grouping (a reading of content and commit authors, **not** a legal finding):

  | Group | Files | Indication |
  |---|---|---|
  | Likely MEDCOEL-authored | `src/atlas/availability.js` (PR #140), `src/library/*`, `src/annotations/*` (see `ANNOTATOR.md`), `src/integration/*`, `src/styles/medcoel-tokens.css`, brand assets, library data, study/quiz logic | Needs the author's confirmation and a contribution record |
  | Presumed derived from upstream | `src/viewer/*`, `src/state/*`, `src/ui/*`, `src/utils/*`, `src/atlas/engine.js`, `ui.js`, `catalog.js`, `src/data/*`, `src/styles/atlas-v3.css` | Treat as CC BY-NC-SA until proven otherwise |
  | Third-party dependencies | three, three-mesh-bvh, Vite, Draco, fonts | Licences listed in the evidence register, still unreviewed |

- **To resolve it the owner can supply** the pre-import repository or branch history (for example
  `handoff/anatomy-visual-learning`, referenced in `INTEGRATION-PROVENANCE.json`) and any written agreement with the
  upstream author. Without that, an independently written replacement of the NC-derived group is the only
  commercially safe route. Doing that **while keeping this UX** is a separate, large piece of work. The pilot is not
  that work; it shares only the name.

## 5. Commercial-rights status (unchanged)

- `licensing/commercial-release.json`: `atlas-viewer` and `4d-lab` both stay `blocked`.
- `licensing/commercial-rights-evidence.json`: 0 of 14 records verified. Restoring the original UI changes nothing here.
- The original viewer's code is CC BY-NC-SA 4.0 and has no commercial grant. This PR makes it the **local review**
  candidate only. Public staging still fails closed and nothing is deployed. Models are the six quarantine-pruned bundles
  (nervous system, kidney, renal pelvis and ossicles stay withheld and are shown as unavailable, never substituted).
- ShareAlike and attribution notices (`NOTICE`, `LICENSE`, `public/models/License.txt`) are untouched.

## 6. Not verified

- **Safari** (macOS and iPadOS) and real devices: not tested. The environment has Chromium with software WebGL
  (SwiftShader) only. The iPad and phone results are viewport emulation, not hardware.
- GPU performance and 8 GB memory behaviour: not measured.
- Visual parity is judged by screenshot comparison with the owner's reference images (same layout, same hierarchy, same
  controls). It is **not** pixel-identical to production, and the owner must confirm it. Known deliberate differences from
  the production screenshot: 2.237 structures instead of 2.827 and the disabled "Saraf" tile (licence quarantine).

## 6a. 4D Lab regression (not modified by this PR)

Run in Chromium + SwiftShader against the 4D Lab exactly as it is on the integration branch. Unit tests: `npm run test:4d-lab`
100/100 (+4 staging/preview), `test:anatomy-integration` 10/10, `test:licensing` all pass (0 of 14 rights records verified),
`apps/anatomy` Vitest 80/80, lint 0 errors.

| Browser suite | On the integration branch (this PR) | With the 3 missing PR #142 fixes (`claude/4d-lab-ux-followup-fixes`) |
|---|---|---|
| `mode-navigation-e2e` (stethoscope/scan-plane visibility, Free 3D return, tri-planar, Belajar) | pass, after making two timing waits and one missing property in the **test** robust | same |
| `run-e2e` (phantom) | 13/14. Fails: skin click in the lower-left abdomen lands on the floating direction pad | **14/14** |
| `atlas-e2e` | 17/18. Same pad failure | 16/18: pad failure fixed; 2 test-drift failures remain (head contact is now allowed by PR #155; auscultation tab is reached through the workspace nav) |
| `ux-e2e` | 7/15 (older test file; timeouts and tour state) | 10/15 with that file; with the final PR #142 test file 3 of the 5 re-run steps pass. Still failing: "first screen" (test expects the old 3-step tour, the branch has the 5-step tour) and "camera is free … monitor pixels identical" (not investigated) |

**Finding:** PR #142 was merged about 40 seconds after it was opened, so only its first commit reached the integration branch.
The later fixes I made were never merged: docked direction pad (it covered the patient and skin clicks), view menu z-index,
aspect-aware camera presets. They are on `claude/4d-lab-ux-followup-fixes` (3 small commits, +12 CSS lines, 4 lines in
`scene3d.js`). **No PR was opened for it and nothing in this PR depends on it**; it changes the accepted 4D Lab layout, so it
is the owner's call.

## 7. Run it

```bash
npm install            # once, at the repo root
npm run preview:4d-lab # builds Lab + original viewer + web pages, serves on 127.0.0.1:4173
```

Open `http://127.0.0.1:4173/anatomy` (library), `/anatomy/explore` (Atlas 3D), `/anatomy/study` (quiz) and
`/anatomy/live` (4D Lab). The command rebuilds every time; `Ctrl+C` stops the server.
On an iPad on the same network: `PORT=4173 node scripts/preview-4d-lab.mjs --lan`.

Original-viewer browser test:

```bash
npm run build:anatomy
node apps/anatomy/tests/e2e/original-viewer-e2e.mjs --shots
```

## 8. Readiness

| Gate | State |
|---|---|
| Engineering | Builds and tests pass (see PR description); original viewer 16/16 browser journeys in Chromium |
| Visual acceptance | Screenshots match the reference layout; **owner confirmation and Safari check pending** |
| Licensing | **Red.** Code, model provenance and derived CT/USG unresolved |
| Production approval | **None.** Do not merge or deploy without explicit owner approval |
