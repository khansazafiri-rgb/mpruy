# Model-derived visual learning previews

The landing cover, eight region images, and 2,827 isolated structure thumbnails are rendered from the existing GLBs by the existing Three.js loader and mesh registry. No model, coordinates, manual annotation, or external image service is used.

`public/data/structure-thumbnails.json` maps the exact structure ID to a hashed WebP path, actual glTF parent ID, and non-background render pixel count. The manifest records SHA-256 hashes of all seven GLBs. Tests verify complete coverage, real WebP files, nonempty renders, and unchanged GLB hashes. The image set is about 5 MB; filesystem allocation may be larger.

## Regenerate locally

1. `npm ci`
2. `npm run previews:prepare`
3. `npm run previews:generate`
4. Open the printed localhost URL and click **Generate actual mesh previews**. Wait for the completion message.
5. Run `npm test` and `npm run build -- --base=/anatomy/viewer/`.

The helper binds only `127.0.0.1:4192`. Its write endpoints accept only same-origin JSON, known IDs, limited batches, and WebP images. It is excluded from the normal viewer build. It writes only generated preview assets and their manifest.

For isolated thumbnails, the renderer shows both faces of thin surfaces and selects a useful camera direction from actual mesh bounds. Empty render attempts are retried from other directions and fail rather than publishing blank images. This affects export-time material appearance only; GLBs and runtime model materials are untouched. Very small distributed structures, such as lymph node groups, can still appear small in an image of the whole group.

## Contextual selection

The library and quiz reuse the existing reveal operation without calling isolate. Reveal enables skeletal orientation context and frames a region-sized volume around the target. The selected surface receives its highlight after the context fade is applied, fixing the old material reset. Two temporary, non-pickable shader shells add a halo; they share existing geometry and dispose only their own materials on deselection. No extra render loop or postprocessing pass is added.

Manual Isolate, Return to context, Hide, Fade, Restore, and the independent Annotator channel remain available. Study view hides labels and details during a question; it does not hide surrounding geometry. All multiple-choice answers still come from actual registry structures or valid source systems/regions.
