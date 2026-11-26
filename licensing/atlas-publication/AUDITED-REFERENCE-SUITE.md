# Audited reference suite (private only)

Use the explicit `--audited-reference-suite` flag on `scripts/preview-independent-atlas.mjs` with an existing independent source-review pack. This selects eleven BP3D 4.3 acquisitions by exact FJ/BP/FMA/OBJ/GLB/triangle receipts and two HRA sets by exact file/version hashes and node proofs. It requires 246 BP3D elements, nine HRA files, 160 direct mapped rows and 37 source groups. Missing or ambiguous verified folders block the entire suite. No fallback, download, mirror substitution, automatic registration, public distribution or production deployment occurs. The main body inventory still comes from the explicit local source pack; an actual workstation pack was not available for this commit's cloud-only tests.

Example for a future authorized local review only:
```sh
node scripts/preview-independent-atlas.mjs independent-source-review-<actual-folder> --audited-reference-suite --original-ui
```
Do not use the placeholder as a real folder name. Do not use the original NC shell in a commercial build. The new suite is also tested by one combined HRA and BP3D real-reference browser workflow. Production release remains NO_GO.
