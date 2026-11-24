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


## One-pass command — combined QA, conversion, audit and local review

Run **one command**, rather than repeating each build/audit manually:

```sh
cd ~/mpruy
git fetch origin
git switch feat/bp3d-bulk-provisional-local-atlas-20261123
git pull --ff-only origin feat/bp3d-bulk-provisional-local-atlas-20261123
npm ci --prefix apps/4d-lab
npm ci --prefix apps/anatomy
npm run qc:bodyparts3d-onepass:preview
```

The single QC command executes 4D Lab, anatomy and licensing tests; builds the original Atlas; rechecks the existing private 470-model inventory; converts only source-matched additional candidates (up to the 16+98 review tiers, subject to all guards); audits each model's FMA/BP/FJ source and GLB checksum; scans public output locations for private model leakage; and, **only after passing**, atomically places the private batch and opens the **original Atlas UI** for manual review.

It preserves any previous private review folder under a timestamped `*.previous-...` name, keeps the 470-source baseline unchanged, and writes the one-stop outcome to:

`local-data/licensing-quarantine/bp3d-launch-qc/readiness.json`

Expect `privatePreview: READY_FOR_HUMAN_REVIEW` and **`publicRelease: NO_GO`**. The latter is intentional: CI/build success is not source-asset clinical review or proof of permission to publicly distribute the Atlas code and exact BodyParts3D 4.0 archive. No production data is copied, no PR merged and no deploy attempted. Stop the local preview with Ctrl-C; the QC result stays recorded.

If this command reports `PRIVATE REVIEW QC BLOCKED`, inspect the one-stop JSON and errors; it preserves the previous working private models and does not replace public content. Never treat a `--no-tests` source-only run as release QC.


## Fast recovery from the 584-model run blocked at source audit (24 Nov 2026)

The user Mac completed 584 real GLB conversions (470 baseline reused, 114 new, 0 conversion failures). The final audit stopped at Branch to angular gyrus.l / .r because it handled literal left/right words differently from publisher `.l` / `.r` suffixes.

The reviewed fix shares a strict anatomical identity and laterality check across candidate selection and the final audit. To avoid reconverting 114 new models, **reuse the existing private GLBs** in a single command:

```sh
cd ~/mpruy
git fetch origin
git switch fix/bp3d-provisional-suffix-laterality-audit-20261124
git pull --ff-only origin fix/bp3d-provisional-suffix-laterality-audit-20261124
npm run qc:bodyparts3d-onepass:preview -- --resume-private local-data/licensing-quarantine/bp3d-qa-new-EKQhVK
```

The `--resume-private` option **does not trust or bypass** the previously blocked audit. It reruns tests and the full FMA/BP/FJ, source archive checksum, GLB integrity and distribution checks before promoting any local preview. It refuses directories outside the exact private quarantine, symlinks, malformed manifest, or declared commercial clearance. It never publishes any files.

On success, the original Atlas viewer loads the candidate-only batch and the launch report still reports `publicRelease: NO_GO`, pending medical review, atlas code commercial permission and exact source license review. If any audit fails, the existing private models stay untouched and production is unchanged.

## Targeted gaps visible in the original MEDCOEL UI (2026-11-24)

The 584-model BodyParts3D preview replaces selected Atlas source systems; it is NOT an additive geometry repair to the original Atlas UI. Original Atlas meshes may appear more complete, but they have different rights, provenance, and identity and must not be silently substituted.

The existing private audit now automatically produces `focus-gaps.md`, `focus-gaps.csv`, and `focus-gaps.json` under `local-data/licensing-quarantine/bp3d-completeness-provisional/`. The report separates 8 catalogue entries for digiti minimi of the **hand** (abductor, flexor, opponens, extensor, left/right) and 6 for digiti minimi of the **foot** (abductor, flexor, opponens, left/right), plus the nasal skeleton, vertebrae/sacrum/coccyx, sternum, and all catalogued visceral structures.

After syncing this branch, no conversion is necessary to regenerate this focused report from the already reviewed 584-model private package:

```sh
cd ~/mpruy
npm run audit:bodyparts3d-full:provisional
open local-data/licensing-quarantine/bp3d-completeness-provisional/focus-gaps.md
```

The precise number of missing structures comes from the **local actual GLB inventory**, not a guess or from the original Atlas rendering. Every row shows whether a model exists, the official FMA/BP if converted, and collision/suggestion warnings when missing. `status: converted` means source GLB exists—not correct anatomical identity, muscle origins/insertions, organ completeness, medical validation, or commercial clearance. A suspicious foot muscle must not be used to fill a hand gap.

Use the missing rows to inspect exact official OBJ FJ elements and anatomical equivalence with a human reviewer. Keep the original Atlas UI unchanged and all candidate geometry privately quarantined; public release remains NO-GO pending licensing and clinical review.
