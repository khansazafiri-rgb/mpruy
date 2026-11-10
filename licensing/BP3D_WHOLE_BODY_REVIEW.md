# MEDCOEL BodyParts3D assembled-body review

**Status:** local development only. No BodyParts3D assets have been placed on the MEDCOEL host by this change. Production Anatomy and 4D Lab are untouched.

## Source assembly and anatomical frame

The 470 individually mapped official-source candidates share millimetre-scale OBJ coordinates. Their positions are not centered independently. The separate official skin reference is identified in the publisher's tables as **FMA7163 / BP9115 / FJ2810**, and is not counted as a 471st Atlas mapping. In the checked source inventory, all 470 model bounds lie within the skin bounds, within a 5 mm margin. Femur.l and Femur.r centers have the expected opposite X signs, and the sternum lies anterior at negative native Y. This is spatial coherence in one source frame, not validation of every structure's identity or completeness.

Display transformation applied once to the shared parent group (GLB files remain unchanged): native `[X,Y,Z]` mm to Three.js `[X,Z,-Y] / 1000` m. Hence patient left is +X, superior +Y, anterior +Z in the viewer. Anterior, patient-left and posterior camera presets use those axes. Skin can be hidden or shown translucently; the underlying skeletal and other systems load progressively. Start with 107 skeletal candidates and enable the other systems for combined anatomy. Tissue-class, system-color, neutral, opacity and contrast modes remain illustrative.

The **1,767** other Atlas catalog names still require reconciliation; some structures may not exist in BodyParts3D at all. The official skin model does not fill missing organs, vessels, muscles or detailed landmarks. There is no CT/USG registration or clinical validation. No existing model is replaced or promoted.

## Rebuild locally

```sh
npm ci --prefix apps/4d-lab
npm run audit:bodyparts3d -- --download
npm run batch:bodyparts3d -- --all
node --test apps/4d-lab/test/bp3d-batch.test.mjs apps/4d-lab/test/bp3d-convert.test.mjs apps/4d-lab/test/bp3d-review.test.mjs scripts/bodyparts3d-source.test.mjs
python3 -m http.server 4783 --bind 127.0.0.1 --directory local-data/licensing-quarantine/bp3d-batch
# Browse http://127.0.0.1:4783/body.html
```

`inventory.json` records 470 converted mappings, a separate `referenceSurface`, source hashes and a rights warning. `reference-surface/lineage.json` records the original skin OBJ's element hash and header notice. `coordinate-frame.js` is copied into the generated viewer. Generated geometry remains gitignored. The CI workflow now uploads metadata only, not geometry, while rights notices conflict.

## Rights block and review hosting

The current [DBCLS license page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html) (updated 2025-02-27) states CC BY 4.0, but the downloaded official 4.0 OBJ header states CC BY-SA 2.1 Japan. Preserve both notices and attribution. The exact archive's terms and any ShareAlike obligations need documented reconciliation before uploading a private review build or distributing GLBs. Do not infer that a login makes unclear rights acceptable. The third-party Atlas frontend has a separate NC license and is not imported into this viewer. Existing commercial-release gates remain active.

The prepared `deploy/Caddyfile.bp3d-review.example` is a **separate, uninstalled** host block. Before any future installation: confirm DNS and server access; inspect the live Caddyfile and Caddy version; back up the current Caddyfile and `/var/lib/medcoel/bp3d-review`; keep immutable timestamped release directories and the previous `current` symlink; generate a unique password hash outside Git; verify `caddy validate`; test HTTP 401 unauthenticated and 200 authenticated, including nested GLB URLs; verify all pages/assets remain inaccessible without credentials; and roll back by restoring the previous symlink and Caddyfile followed by validation/reload. Make direct URL checks only after these steps. Do not alter `/anatomy/viewer/`, the 4D routes, PocketBase, or other production roots.

## Remaining verification

- Actual browser anterior, lateral, posterior screenshots, WebGL loading/errors, frame time and memory on Safari Mac/iPad.
- Inspect small structures, internal overlaps, missing anatomy and individual left/right identity.
- Clear exact-source license conflict and review build hashes before any server upload.
- Verify host credentials, DNS, backup, routing and rollback on the real server before claiming a working private URL.
