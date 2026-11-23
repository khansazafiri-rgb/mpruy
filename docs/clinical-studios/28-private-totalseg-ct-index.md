# MEDCOEL — TotalSegmentator private CT archive structure audit

## Owner-local result (23 Nov 2026)

`Totalsegmentator_dataset_small_v201.zip` has downloaded completely on the
owner Mac: **3094.3 MiB**, publisher MD5 and locally calculated SHA-256 passed.
The last batch registered 1 new file, 4 previously verified originals,
9 skipped entries, 0 failed file transfers. The CT archive remains
`PRIVATE_ARCHIVES_RECORDED`, **not rendered and not release approved**.

The publisher's <https://zenodo.org/records/10047263> page identifies this
as a **102-subject** subset of TotalSegmentator 2.0.1 with a CC BY 4.0
license claim. Files in the TotalSegmentator release use subject-level CT
`ct.nii.gz` and structure-level `segmentations/*.nii.gz`. Metadata/file
notices, privacy and downstream attribution still need file-by-file review.

## New no-extraction audit

```bash
cd ~/mpruy
git switch claude/focused-wozniak-1ayrxa
git pull --ff-only origin claude/focused-wozniak-1ayrxa
node --test scripts/private-totalseg-archive-audit.test.mjs
npm run resources:batch:ct-audit
```

The command verifies the locally stored 3.02 GiB archive against the *current
official publisher file record* MD5/bytes, re-computes SHA-256, and compares
the digest to the last private acquisition receipt. It parses the ZIP central
directory (including ZIP64 EOCD) **without extracting any medical image**.

Its output is a private-only, JSON structural report at:

`local-data/studio-resources/alternative-candidates/totalsegmentator-small-v201/archive-structure-audit.json`

The report includes a pseudonymous subject count, paths for up to 4 sample CT
volumes and available corresponding segmentation structure names, and candidate
coverage for liver/kidney/aorta/lung/heart/vertebrae. No `meta.csv` demographic
rows, patient identifiers, diagnoses, image pixels, mask bytes, or full member
lists are uploaded or copied into GitHub.

The index reader refuses unsafe paths, symlinks, encrypted members, duplicated
file names, impossible central-directory offsets and unexpectedly large
indices. It does **not** claim to decode or validate the NIfTI affine,
orientation, patient masking, or clinical correctness.

## Follow-up after viewing report

Use exact subject paths from the report to implement a **bounded subset**
NIfTI CT + matching source mask renderer, correctly resampled and aligned.
Avoid extracting all 102 volumes at once (limited disk space on owner's Mac).
Render separately labeled **Abdomen CT / Thorax CT dataset candidates** in
the private dashboard. Retain the existing TCIA chest-CT quarantine; never
substitute a new source or silently release data as a previously approved
TCIA asset. Actual medical and privacy review remains required.
