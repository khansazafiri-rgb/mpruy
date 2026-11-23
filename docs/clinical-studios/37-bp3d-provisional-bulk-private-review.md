# MEDCOEL — Fast bulk *provisional* BodyParts3D source review

**Status: PRIVATE / NOT MEDICALLY VALIDATED / NOT APPROVED FOR DISTRIBUTION.**

This adds additional candidate **GLBs** for visual source review under the existing Atlas anatomy cards, not a new UI. The original MEDCOEL layout, gold selection glow, isolation, visibility, search, transparency, routing and 4D Lab are retained. No licensing gates or production assets change.

## Why another batch?

The 23 Nov 2026 audit counted 2,237 MEDCOEL Atlas names; 470 exact-name BodyParts3D 4.0 source conversions passed integrity, and 1,767 lacked verified direct mapping. Re-running the original 470 conversion would not add structures.

The stricter semantic triage instead marked **16 review-only terminology equivalents** and **98 promising review-only candidates**, with many more requiring manual anatomical work or carrying ID conflicts. *Neither* category is proof of clinical/anatomical equivalence. Source-identifier checks can only justify preparing private geometry for inspection.

## Build a private additional-model package on the Mac holding the original official archive

```sh
cd ~/mpruy
git fetch origin
git switch feat/bp3d-bulk-provisional-local-atlas-20261123
git pull --ff-only origin feat/bp3d-bulk-provisional-local-atlas-20261123
npm ci --prefix apps/4d-lab
npm run test:4d-lab
# Conservative first batch: terminology-equivalent suggestions only (up to 16 candidates)
npm run batch:bodyparts3d-provisional
```

To expand to **up to 120 additional source candidates** from the two non-colliding triage tiers:

```sh
npm run batch:bodyparts3d-provisional -- --include-promising --limit-new 120
```

Only *passing candidates* are added. Actual totals may be lower than 114 because every candidate must have a unique FMA/BP representation, correctly ordered official FJ OBJ files, permitted laterality, no high-risk semantic warnings and no collision with an existing converted source. Candidate selection is automatically recomputed from the same official source and current 470-model private inventory. **This is not human-reviewed anatomical approval**.

The original 470 GLB files are integrity-scanned, then reused by copy into a new gitignored package rather than regenerated. Only new source candidates go through the OBJ→GLB converter. The baseline `bp3d-batch/` is never modified. Output: `local-data/licensing-quarantine/bp3d-provisional/`.

If the directory already contains an old provisional batch, remove it **only** after preserving any review notes; do not delete `bp3d-batch` or `bp3d-4.0`. To ensure fresh review after choosing a different candidate scope, run `rm -rf local-data/licensing-quarantine/bp3d-provisional` then rebuild. Never delete outside this specific gitignored folder.

## Quality check before opening Atlas

```sh
npm run audit:bodyparts3d-full:provisional
```

Review `local-data/licensing-quarantine/bp3d-completeness-provisional/SUMMARY.md` and `full-audit.json`. A passing hash/lineage audit does **not** prove anatomy completeness or clinical suitability. The inventory records `provisionalSource:true`, new/reused counts, original FMA/BP/FJ, mapping method `provisional-name-review-NOT-validated`, and `approvedForCommercialDistribution:false`.

## Preview WITH THE ORIGINAL MEDCOEL Atlas UI

```sh
MEDCOEL_BP3D_PROVISIONAL=1 npm run preview:4d-lab
```

On the same Mac, open:

`http://127.0.0.1:4173/anatomy/viewer/?models=bp3d:skeletal,muscular,cardiovascular,visceral`

The existing banner explicitly labels this as **KANDIDAT BELUM TERVERIFIKASI**. Test clicking a newly added bone/vascular/muscle structure, highlight gold, isolation/un-isolate, hide/show, zoom, side orientation, and mixed layers. Without the environment flag the normal private original 470-model source is used; without `?models=bp3d` the normal Atlas source remains untouched.

**Do not use the private preview as evidence of correct anatomy or embed these GLBs on medcoel.com.** Clinical identity requires source-level and landmark review (especially small subparts), and exact-archive CC BY-SA 2.1 Japan vs CC BY 4.0 terms require legal resolution. A visible candidate may be anatomically *incorrect* and must not be treated as a teaching reference before verification.

## Constraints

- This feature is only in `scripts/preview-4d-lab.mjs`, with paths inside gitignored `local-data`.
- No new public Atlas catalog or UI components; new candidates use their already existing Atlas IDs.
- Never promote from `IDENTITY_COLLISION_REVIEW`, `SOURCE_GEOMETRY_MISSING`, `NO_PUBLISHER_CANDIDATE` or `MANUAL_ANATOMICAL_REVIEW` automatically.
- No fake reviewers, no invented mesh geometry, no patient CT/USG registration, no automatic release clearance.
- For sternum and nose defects that fall outside the two non-colliding tiers, separate true FMA/BP/FJ source review is still required; this batch alone is **not** a complete anatomical repair.
