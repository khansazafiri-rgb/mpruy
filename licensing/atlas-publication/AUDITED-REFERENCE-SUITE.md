# Audited reference suite (private only)

Use the explicit `--audited-reference-suite` flag on `scripts/preview-independent-atlas.mjs` with an existing independent source-review pack. This selects eleven BP3D 4.3 acquisitions by exact FJ/BP/FMA/OBJ/GLB/triangle receipts and two HRA sets by exact file/version hashes and node proofs. It requires 246 BP3D elements, nine HRA files, 160 direct mapped rows and 37 source groups. Missing or ambiguous verified folders block the entire suite. No fallback, download, mirror substitution, automatic registration, public distribution or production deployment occurs. The main body inventory still comes from the explicit local source pack; an actual workstation pack was not available for this commit's cloud-only tests.

Example for a future authorized local review only:
```sh
node scripts/preview-independent-atlas.mjs independent-source-review-<actual-folder> --audited-reference-suite --original-ui
```
Do not use the placeholder as a real folder name. Do not use the original NC shell in a commercial build. The new suite is also tested by one combined HRA and BP3D real-reference browser workflow. Production release remains NO_GO.

## Existing-workstation preparation (376 elements)
After dependencies are installed and the draft branch is checked out, run `node scripts/prepare-atlas-private-workstation.mjs` for read-only preflight. It chooses only an unambiguous existing body pack; if multiple exist, pass `--pack=<exact-existing-folder>`. The plan validates the actual existing pack and retained exact acquisitions. To explicitly acquire missing reference batches in quarantine, add `--acquire-missing`. It reuses verified folders, rejects ambiguous or conflicting full identities, never deletes existing packs, and prints the exact private preview and read-only QC commands only once the full suite passes. It does not register geometry, launch a server automatically, approve assets or deploy. Cloud unit fixtures do not prove a real workstation run. A failed acquisition remains held; inspect it rather than deleting or replacing it blindly. Original UI is private review only.

## Exact suite HTTP boundary
The explicit audited reference suite exposes exactly its 9 HRA references; other cached organs are not added to the audited inventory. A conflicting hash for a matching HRA ID blocks the suite. The independent body and priority model routes verify the actual byte buffer against the pinned digest at request time (including HEAD), so a model changed after startup is withheld. This is engineering QC, not real workstation clearance or a public route. Existing body pack and cached organ files remain unchanged.

## One-command private workstation rehearsal
After checking out the draft branch and installing its existing dependencies, from the repository root run:

```sh
node scripts/launch-atlas-private-workstation.mjs --include-lymphatic --acquire-missing --http-only
```

This verifies the existing actual body pack, reuses or acquires only missing exact reference batches, verifies the optional pinned HRA hierarchy, runs the read-only native-overlap report, and executes the existing private HTTP smoke test. To leave the loopback server running for manual visual review, replace `--http-only` with `--launch-private`. With neither mode it only prints the plan. If multiple existing body packs are present, add `--pack=<exact-existing-folder>`; no automatic newest-pack selection. No auto-install, Git branch switch, archive reconstruction, deletion of existing packs, clinical clearance, registration or deployment. Original UI is private comparison only. Actual workstation execution has not been verified in cloud CI.
