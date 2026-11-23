# MEDCOEL emergency 3D skeleton + viscera recovery (2026-11-23)

**Decision: SOURCE CANDIDATE AND CODE HOTFIX ONLY — NO PUBLIC-RELEASE CLEARANCE.**
The exact old Atlas `skeletal.glb` and `visceral.glb` paths must remain HTTP 404 in production. They are separate mixed-provenance assets; neither their identity nor the legacy Atlas Viewer application code is commercially cleared.

## Why the site currently breaks

- Caddy's confirmed strict quarantine returns 404 for the old skeleton and visceral GLBs.
- The legacy Atlas viewer boots by loading `skeletal` and may throw instead of presenting its remaining controls. Merely lifting Caddy's 404 would re-expose the rights-unverified bytes.
- The 4D Lab defaults to `/anatomy/4d-lab/data/atlas/`; the strict Caddy quarantine blocks that entire namespace. The Lab now has a code-level recovery path to its existing procedural synthetic phantom when initial Atlas data cannot load. This does not change any Caddy rules and does not approve Atlas data for distribution.
- A real patient CT MPR from private TotalSegmentator is a different product from a mesh-based 3D/4D synthetic anatomy scene; their coordinates and clinical validity are not interchangeable.

## Replacement source — authoritative, version-specific

**BodyParts3D 4.0** from DBCLS:
- Official downloads: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- Current DBCLS licensing page: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html (updated 2025-02-27; says CC BY 4.0).
- The official 2013 4.0 OBJ archive's older headers may still say **CC BY-SA 2.1 Japan**. Preserve source and historical attribution and satisfy the more conservative ShareAlike obligations until an exact-license review resolves them.
- Both versions are compatible with commercial use at license-category level; **neither licenses the older Z-Anatomy mixed GLBs or the noncommercial legacy Atlas Viewer application code**.

Our source-pinned BodyParts3D bulk pipeline already converted 470 exact name candidates out of a 2,237-structure older Atlas catalog, including **107 skeletal and 30 visceral** candidates by the prior source audit. These 137 are an **incomplete** replacement, not proof of equivalent coverage or perfect geometry. There is no authorization to fill unmatched models with generated meshes.

## Ready-to-run isolated replacement, on owner Mac

The new script consumes verified local official-source models from the existing pipeline; it **never downloads or edits old models**:

```sh
npm ci --prefix apps/4d-lab
# If the 470-model local bundle is already present, skip the next two commands:
npm run audit:bodyparts3d -- --download
npm run batch:bodyparts3d -- --all
npm run prepare:bp3d-skeletal-visceral
npm run test:bp3d-skeletal-visceral
cd local-data/licensing-quarantine/bp3d-skeletal-visceral-replacement
python3 -m http.server 4783 --bind 127.0.0.1
# Browser: http://127.0.0.1:4783/body.html
```

The package only includes the real converted official skeletal and visceral source GLBs, metadata with actual FMA/BP IDs, a SHA-256 source receipt for every GLB and lineage file, and an **independent** viewer based on MIT Three.js. Files stay under gitignored `local-data/` and never enter `apps/*/public`, Caddy, PocketBase, or production by executing this command. Re-run after reviewing/removing a prior output folder; the exporter refuses to overwrite an existing review.

If reviewers later decide to publish an independently authored BodyParts3D viewer, retain official attribution, file-level SHA-256, model/element provenance, appropriate CC BY-SA-compatible source notice where required, an explicit limited-coverage label, and documented image/geometry QA. Use a **separate reviewed publication and deployment**; do not upload this package directly to the old Atlas URL, and do not claim all 2,237 structures are present.

The current Atlas application is an adapted NC-licensed codebase. Supplying official BodyParts3D assets to `?models=bp3d:skeletal,visceral` can be useful for private regression tests, but does **not** by itself clear the existing application's public commercial rights. The new code prevents this explicit source mode from quietly falling back to the blocked legacy GLBs.

## 4D Lab fail-safe

The app attempts its existing atlas dataset first. If it fails before any data is loaded, it switches to its existing **procedural synthetic phantom** and visibly labels it, rather than showing a permanently empty screen. No synthetic CT is presented as real patient imaging. The code also detects a 200 HTML SPA fallback being returned in place of static NRRD/GLB/JSON.

**No promise of a live fix yet:** after CI, a separately approved, rights-cleared deployment must confirm that `/anatomy/4d-lab/data/phantom/registration.json` and `/anatomy/4d-lab/data/phantom/ct.nrrd` return actual files (not 404 or HTML SPA). The staging script's commercial-release gate must not be bypassed.

## Release blockers

1. Source file hashes and exact FMA/organ identity acceptance on the owner's source bytes, plus anatomical geometry/dimensions visual review.
2. Official licence text, old OBJ header reconciliation, attribution/ShareAlike assessment per derived file, and independent app-code commercial rights.
3. Independent renderer native browser and mobile tests, performance, health-screen labels and user-friendly partial coverage.
4. Exact public build assets and URLs, strict Caddy 404 preservation for old two GLBs and blocked Atlas CT namespace.
5. Final user authorization for production rollout, rollback plan and independent post-deploy smoke check.

**No build, rights, clinical, privacy, or public-release flag is set to approved in this PR.**
