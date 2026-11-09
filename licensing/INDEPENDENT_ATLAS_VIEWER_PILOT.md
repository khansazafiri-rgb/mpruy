# MEDCOEL Independent Anatomy Viewer — local proof of concept

Date: 2026-11-09. **NOT approved for public staging or commercial distribution.** This is an engineering review candidate separate from the upstream third-party Atlas application.

## Context

The MEDCOEL owner confirmed they do **not own** `nqwrc/3d-anatomy`. The upstream project expressly licenses its application source code **CC BY-NC-SA 4.0**. We must not relicense it unilaterally, commercialize a modified copy, or infer that an educational/free login qualifies for the NonCommercial exemption when MEDCOEL may support sponsors, media partnerships, academic announcements or paid services.

PR #159 decoupled the **4D Lab** from the Atlas Viewer's runtime URL. This PR creates a **new, minimal viewer implementation** as a local preview in the already available 4D Lab Vite build. It is not a replacement for `apps/anatomy` yet; old routes remain unchanged and their commercial gate remains blocked.

## Implemented from a fresh UI entrypoint

- `apps/4d-lab/atlas-preview/index.html` — separate HTML entrypoint and a basic accessible layout.
- `apps/4d-lab/src/independent-atlas/main.js` — standalone Three.js scene, native OrbitControls, a fresh GLTF loading flow, owned GPU cleanup on system transitions, model framing, raycast selection, structure highlight, isolating a structure, and returning to all structures.
- `apps/4d-lab/src/independent-atlas/catalog.js` — small data-driven search and strict list of six available GLB systems.
- `apps/4d-lab/src/independent-atlas/styles.css` — independent responsive styling.
- Uses **only** 4D Lab's SHA-256-checked `atlas-assets` package for six quarantine-pruned models, catalog and Draco decoder. It never imports `apps/anatomy/src` modules or fetches `/anatomy/viewer/`.
- No added patient, organ, anatomical model or fabricated CT/USG information.

Local URL after **explicit opt-in** `npm run preview:4d-lab` (ordinary 4D Lab builds exclude this experiment):

`http://127.0.0.1:4173/anatomy/4d-lab/atlas-preview/`

Or use `npm run dev --prefix apps/4d-lab` and open `http://127.0.0.1:4180/atlas-preview/`.

The page is **not linked to navigation or accessible through the production host as a launch feature**. A separately built 4D Lab review candidate can contain it, but the exact-build commercial staging gate remains blocked.

## Source-code origin screen

`node licensing/tools/scan-atlas-code-origin.mjs` uses tokenized source comparisons between the **four newly authored pilot files** and the imported Atlas application's `apps/anatomy/src/**`, `tools/**`, and `index.html`. Contiguous matching sequences over 90 tokens fail the test. A separate unit test rejects direct imports and requests to `/anatomy/viewer/`.

This is an automated screen for **large literal copied blocks only**, not a legal determination. It cannot detect nonliteral similarity, derivative user-interface design, copied algorithms that have been rewritten, third-party contributions outside the imported tree, or rights in the anatomy data.

For a commercial-release decision, a qualified reviewer still needs to compare relevant code expression, commit histories and contributor rights with the pinned upstream repository and any other original sources.

## Gap analysis: pilot vs full Anatomy Viewer

| Requirement | This PR | Further work |
| --- | --- | --- |
| 3D scene, orbit and zoom | Basic working implementation | Accessibility and Safari review |
| Six atlas model groups | On-demand, one loaded at a time | Memory profiling, region presets |
| Structure search/pick | Basic catalog search, click and highlight | Translation, deep context and clinical review |
| Isolate/restore | Basic | Hide/unhide, depth/layer controls and undo |
| Body region handling | Not yet implemented | Head/neck/limbs camera/region presets |
| Teaching integration | Separate local review entrypoint | Curriculum links, learning states, study mode |
| Offline/recovery | Loading error text | Robust cache strategy, downloads, retries |
| Commercial source rights | **Not verified** | Code audit, model-level provenance, copyright review |
| Deployment | **Blocked** | Legal approval, product QA, release authorization |

## Verification commands

- `npm run test:4d-lab` (new catalog/source boundary/unit tests)
- `npm run test:licensing` (code-block overlap screen, provenance, quarantined asset guard)
- `npm run build:4d-lab` (new independent HTML entrypoint plus existing 4D Lab)
- `npm run preview:4d-lab` (local review only)
- `npm run test:e2e:independent-atlas --prefix apps/4d-lab` (optional Playwright Chromium E2E, not automatically run in GitHub CI)
- Manual Safari: model framing, searching sternum and femur, isolating/restoring, switching systems and watching memory, smooth orbit/zoom and local responsive layout.

## Must NOT happen in this phase

- Do **not** delete or relicense `apps/anatomy` yet. Other MEDCOEL routes depend on it.
- Do **not** use code from the old Atlas viewer as a shortcut to increase parity.
- Do **not** claim independently authored application code automatically grants rights to bundled GLBs or their derivatives.
- Do **not** mark `licensing/commercial-release.json` as cleared; it remains `blocked` for both products.
- Do **not** merge into production, stage publicly, change Caddy or publish advertising while rights/clinical/performance gates are unresolved.

## Next milestone

Continue building functionality in the new viewer **from original code and verified requirements**, compare functional parity with the legacy application without copying its expression, and resolve **per-model provenance and derivative licences**. Then present owner Safari review and an evidence-backed migration plan for `/anatomy/viewer/` that will not silently break existing bookmarks, learning links or navigation.
