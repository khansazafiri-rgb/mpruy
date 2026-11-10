# Approved Atlas UI + official BodyParts3D (local review integration)

Date: 2026-11-10. **Local review only. Not merged, not deployed, no release gate changed.** The geometry is never in the
repository or in any `dist/`.

## 1. Forensic baseline: which UI is the approved one?

The history of `apps/anatomy` in this repository begins with the import commit `2d9f2ee` (2026-11-03). Across all **33 remote
branches** that contain the app there are only two versions of the Atlas UI:

| Version | `src/atlas/ui.js` blob | `index.html` blob | Where | Meaning |
|---|---|---|---|---|
| Pre-quarantine | `c8004a1` | `79b2083` | 7 branches (e.g. `claude/confident-faraday-e9id72`, `feature/medcoel-4d-lab`) | the approved Atlas as imported |
| Post-quarantine | `1ffd611` | `d0a0205` | 26 branches incl. the integration branch | same UI plus the licence-quarantine layer of PR #140 |

- `git diff` between the two `src` trees (`01d64e1` → `cdbe93a`): **6 files, +84/−14**: `atlas/availability.js` (new), `catalog.js`
  (Saraf group moved out), `engine.js`, `ui.js`, `atlas-v3.css`, `loadModel.js`. Nothing was removed from the layout, the
  interactions or the animations.
- The yellow selection beam is `src/viewer/selectionGlow.js` ("selection sweep"): a yellow band with a bright leading edge that
  travels along the structure's principal axis, render-only and never pickable. There is **one blob for the whole history, in all
  33 branches**: it was never altered or lost.
- Two older variants of `src/` exist on `fix/anatomy-quiz-find-ux` and `fix/hermes-anatomy-reliability-latest`. They differ from the
  integration branch only in `viewer/selection.js` / `tap.js` (older reliability fixes the integration branch already contains).
- Visual proof: the integration branch renders the owner's reference layout (compact top bar with search, floating region card, right
  camera stack, bottom dock with ± per system and quick presets). See `apps/anatomy/evidence/orig-*.jpg` (PR #165).

**Conclusion:** the approved interface is the current `apps/anatomy`. Nothing needed to be rolled back or restored; the replacement
that the owner rejected was the independent pilot (PR #160–#164, handled in PR #165). No source file of the UI was changed to
"recover" it, because there was no divergence to recover.

## 2. Recovery matrix (current viewer, default mode and `?models=bp3d`)

Results are from `tests/e2e/original-viewer-e2e.mjs` (16 steps, default models) and `tests/e2e/bp3d-atlas-e2e.mjs` (BodyParts3D mode).

| Feature | Implementation | Default (Atlas models) | `?models=bp3d` | Verified |
|---|---|---|---|---|
| Compact top bar, search, undo / restore / share / help | `index.html`, `atlas/ui.js` | preserved | preserved | both suites |
| Floating region picker, 8 cards with previews | `atlas/ui.js` `renderRegions` | preserved | preserved; Toraks reframes and clips | B3 |
| Bottom dock: 12 systems, ± layer stepping, quick presets, ⋯ lists | `atlas/ui.js` `renderGroups` | preserved | preserved (layers use catalogue metadata) | B2, original step 10 |
| Withheld "Saraf" shown disabled with a reason | `atlas/availability.js` | preserved | preserved | B1 |
| Right camera stack: zoom, pan, Dpn / Smp / Blk / Ats, reset | `viewer/camera.js` | preserved | preserved; 4 distinct views | B2 |
| Search, select, info panel, definitions | `atlas/ui.js`, `engine.js` | preserved | only structures present in BodyParts3D are offered; the rest are reported | B4, B5 |
| Selection highlight (yellow sweep) | `viewer/selectionGlow.js` | preserved | preserved (same code, same selection path) | B4 screenshot |
| Isolate / return to context / fade / hide / undo / restore | `atlas/engine.js`, `viewer/visibility.js` | preserved | preserved | B4 |
| Share link, help, Kori tip, library and quiz integration | `integration/*`, `library/*`, `apps/web` | preserved | link back drops `models=bp3d` | B7 |
| Loading / error states | `viewer/loadModel.js` | preserved | unavailable data falls back to the Atlas models with a visible note | C1 |
| iPad / phone layouts | `atlas-v3.css` | preserved | not re-run in BodyParts3D mode | original steps 14–15 only |
| Licence quarantine (no withheld model requested) | `loadModel.js`, build guards | preserved | preserved | original step 12, D1 |

Nothing in the approved UI was replaced or removed. The only UI additions exist in BodyParts3D mode: the coverage banner (with the
skin toggle and the link back) and the search note.

## 3. Integration architecture (reversible)

- **Switch:** `?models=bp3d` (all six systems) or `?models=bp3d:skeletal,muscular` (only those; the other systems keep the Atlas
  models). Without the parameter the viewer behaves exactly as before. The banner link "Kembali ke model Atlas" removes it.
- **Adapter:** `src/viewer/bp3dSource.js`. `loadModel.js` asks it first; if it cannot serve a system it returns `null` and the
  original GLB is used. Each official structure is wrapped in a node with `userData.za_name = <catalogue id>`, which is how the Atlas
  identifies structures, so selection, search, layers, isolate, fade, undo and the sweep need no changes.
- **Materials:** tissue-class palette (`bp3dMaterials.js`, a tested copy of the review viewer's palette): all bones one ivory, all
  muscles one muscular tone, distinct vessel, cartilage, ligament, lymphatic and organ classes. Double-sided, because the source OBJ
  normals are not consistently oriented.
- **Coordinates:** source OBJ mm `[X,Y,Z]` → metres `[X,Z,−Y]` (patient left +X, superior +Y, anterior +Z), applied once on a parent
  group, then a fixed translation `[0.0007, 0.0692, −0.0987] m` into the Atlas frame. The Atlas skeleton and BodyParts3D are the
  same body in the same orientation with a different origin; the offset is the **median centre difference of 40 large bones** (the
  per-bone spread is about ±2 cm). It makes the existing camera presets, regional clipping bands and framing work. **It is not a
  registration, and no accuracy claim is made.**
- **Data path:** `bp3d/inventory.json`, `bp3d/structures/<id>/model.glb`, `bp3d/reference-surface/skin.glb` next to the viewer.
  Only the local review preview serves them (`scripts/preview-4d-lab.mjs`, read-only, an exact path allow-list, 404 for everything
  else). `licensing` scanning of `public/` and `dist/` is unchanged and still finds none.
- **Skin:** the official skin surface is a translucent, non-pickable reference (toggle in the banner), not a 471st structure.

## 4. Coverage (what is present and what is not)

Of the Atlas catalogue (2,237 structures), **470 exist as official BodyParts3D structures** (2 % to 39 % depending on the system). Nothing was
invented to fill the rest; absent structures are reported, never drawn.

| Atlas source system | In BodyParts3D | Catalogue |
|---|---|---|
| skeletal | 107 | 271 |
| muscular | 80 | 669 |
| cardiovascular | 242 (arterial 162, venous 78, heart 2) | 676 |
| visceral | 30 (digestive 15, reproductive 8, respiratory 3, urinary 4) | 114 |
| joints | 8 | 349 |
| lymphatic | 3 | 158 |
| nervous / sensory | 0 (withheld by the licence quarantine) | withheld |

Gaps worth knowing before judging the look: the muscle set is 80 of 669 structures, so muscles are coarse groups without the fine
detail the owner wants; the skeleton lacks some small bones; the heart is two structures; the endocrine group is empty; there are
no joints beyond 8, no nerves and no brain. **None of this is clinically validated**, and the body is a single male model.
Mapping of the other 1,767 names is in `local-data/.../bp3d-batch/mapping-gaps.json` (local).

## 5. Licensing (unchanged and unresolved)

- DBCLS now states **CC BY 4.0**; the exact OBJ archive header carries **CC BY-SA 2.1 Japan**. Attribution and ShareAlike are
  preserved in the banner link, `lineage.json` and the review viewer; the discrepancy is still open and is **not** a clearance.
- The Atlas front-end code stays CC BY-NC-SA 4.0; the adapter is new MEDCOEL code, but the host app is the same NC-derived code.
- `licensing/commercial-release.json` (both products blocked) and `commercial-rights-evidence.json` (0 of 14 verified) are untouched.
  Do not copy `local-data/` to a server or CDN.

## 6. Run it

```bash
npm install
npm run batch:bodyparts3d -- --all     # once: downloads the official source, converts 470 structures (local-data/, gitignored)
npm run preview:4d-lab                 # builds everything and serves 127.0.0.1:4173
```

Open `http://127.0.0.1:4173/anatomy/viewer/?models=bp3d` (or `/anatomy/explore` for the framed page; add `?models=bp3d` to the
viewer URL). The standalone review viewer is still `npm run review:bodyparts3d` (`/body.html`).

## 7. Not verified

- **Safari / real devices:** not tested (Chromium with software WebGL only). Frame rate under software GL is meaningless for a real
  GPU, but **470 separate meshes plus a transparent skin is heavy**: memory and speed on an 8 GB MacBook are unmeasured.
- BodyParts3D mode on iPad/phone layouts; keyboard shortcuts; the structure-count labels on the dock tiles still show Atlas totals.
- Fine anatomical correctness of the 2 cm frame offset per structure.
