# MEDCOEL Atlas: private BodyParts3D skeletal/visceral source in the ORIGINAL UI

**Status:** code change for private review; not a new viewer and **NOT approved for release**.

## Immutable UI contract

Keep the existing MEDCOEL Anatomy/Atlas page, navigation, system tiles, list cards, camera, quiz, Three.js selection and visibility implementation. No CSS, layout, `selectionGlow.js`, `selection.js`, or `visibility.js` is replaced by this change.

The new source is loaded through the existing `bp3dSource.js` adapter, under the original `loadModel.js` mesh registry. It preserves `za_name` / part ID for the established gold selection sweep, isolation, hide/show, transparency and undo. Other systems continue to use their original Atlas source.

## Local review with the existing MEDCOEL Atlas

The local user has already built the official BodyParts3D 4.0 batch in:

`local-data/licensing-quarantine/bp3d-batch/`

The conversion log reported 470/470 candidates converted (107 skeletal, 30 visceral, plus other systems), 0 conversion failures. These are source-matched candidates, **not** 470 anatomically approved structures. The raw OBJ source remains local and the built GLBs stay gitignored.

1. Ensure the private source exists: `test -s local-data/licensing-quarantine/bp3d-batch/inventory.json`.
2. Install dependencies if not already present: `npm ci --prefix apps/anatomy`, `npm ci --prefix apps/4d-lab`, and the normal web workspace dependencies.
3. Run `npm run test:anatomy` and `npm run build:anatomy`.
4. For an integrated, read-only local preview, run `npm run preview:4d-lab -- --build` from the repository root.
5. Open **http://127.0.0.1:4173/anatomy/viewer/?models=bp3d:skeletal,visceral** on the same computer. It is the **original MEDCOEL Atlas UI**, not the separate green BodyParts3D assembly viewer on port 4783. The source is served only by the local review route and never copied into dist or public assets.

The earlier `BP3D_VENDOR_TOO_MANY_FILES` applies only to the separate skeletal/visceral standalone packaging script. This original-Atlas preview uses the already successful `bp3d-batch` source and does not depend on that script.

## Behavior and QA

- **Skeletal and visceral only:** selectively load authentic converted GLBs. Other Atlas systems remain unchanged; a selective source filter must not hide non-selected muscle, joint or cardiac search results.
- **Lists/tiles:** in the selected systems, the existing browse list and its count only show IDs actually present in the BP3D inventory. The original tile design stays unchanged.
- **Selection:** click Femur (and representative right/left paired bones) and a visceral organ; verify the gold selection sweep and callout use the existing Atlas code paths.
- **Isolation/visibility:** isolate, hide, show, transparency, return context and undo work without other structures becoming unselectable. Check combined bones + muscles, and a bone + visceral preset.
- **Fail closed:** if any GLB in a selected official system is absent, malformed or mesh-free, do not declare the system loaded and never fall back to the quarantined older skeletal/visceral model.
- **UI regression:** check Safari desktop and mobile or iPad, WebGL FPS/memory, click/drag separation, side-panel count, regional framing and L/R anatomical orientation; test default URL without `models` still behaves exactly as before.
- **Production:** `medcoel.com` public operational containment, independent licensing quarantines and build distribution checks remain in place. No new source geometry is committed, deployed or promoted.

## Explicit blockers

Official-source name matching alone does not constitute geometry/identity validation. The archive's OBJ header contains a CC BY-SA 2.1 Japan notice while the official webpage describes CC BY 4.0; exact-file terms and commercial distribution eligibility still require review. The 1,767 unmatched Atlas names remain unavailable from this source. No CT/USG registration or human clinical approval is implied.

**Release decision: NO-GO**, pending exact-source rights clearance, anatomical/geometry QC, verified private preview interactions and the usual MEDCOEL production checks.
