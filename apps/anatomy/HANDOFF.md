# MEDCOEL Anatomy — Claude handoff

Repository: https://github.com/khansazafiri-rgb/mpruy
Anatomy branch: handoff/anatomy-visual-learning (standalone project at repository root).
Main web branch: handoff/medcoel-anatomy-visual-learning (frontend in apps/web).
Use two separate clones.

Reviewed local Anatomy UI/engine commit: 57f941d5e319f9c09bede31bca3b7bd629a91583.
Reviewed local main frontend commit: c5b0af3e8ee2e5c0723751b081e8ca46bb5050f4.
GitHub publication commit IDs differ because these branches preserve the existing remote histories. All runtime Anatomy files match the reviewed local source; publication only refreshes provenance and this document.

Includes complete Anatomy engine, all seven unchanged GLBs, Draco, 2,827 actual isolated structure thumbnails, eight region previews, actual 3D landing cover, contextual glow, Library and Annotator bridges, and existing ready/error/share host integration.

Validation: Anatomy 55 tests, main frontend 127 tests, routing 1 test; lint/build passed; 49 preview HTTP checks passed. Local preview: http://127.0.0.1:4188/anatomy (only available on the original development computer).

## Continue editing

Create a new feature branch from this handoff branch. Preserve contextual fade with a highlighted target, guided region/system quiz setup, model-derived thumbnails, all atlas controls, and /admin/anatomy Annotator. Do not require new manual annotations. Do not change GLBs, PocketBase, question bank, Caddy or medcoel-hermes. Do not merge or deploy production. Run tests/lint/build and create a preview.

Node >=22.12.0. Run npm ci, npm run lint, npm test, npm run build -- --base=/anatomy/viewer/. Verify SOURCE-MANIFEST.json before editing. See README-VISUAL-PREVIEWS.md for image generation and LIBRARY.md / ANNOTATOR.md for their protocols.

Original published spatial source: a874a3dcb111d5b4de543c5be6253f5013416f4d. SOURCE-PUBLICATION.md records historical publications; this document describes the current handoff.
