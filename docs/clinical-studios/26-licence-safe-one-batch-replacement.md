# MEDCOEL — single-batch licence-safe resource replacement (22 Nov 2026)

**One batch for all sources; no stage-by-body-part implementation.**
The owner has directed MEDCOEL to exclude datasets/software with NC, research-only,
missing, conflicting or unknown exact-file rights instead of depending on permission
emails. This policy is stricter than merely keeping MEDCOEL Core free.

## Current facts (owner's 22 Nov audit)

- `npm run test:licensing`: 74/74 existing checks passed **before this change**.
- Rights ledger: 39 records = **0 verified**, 37 pending, 2 blocked.
- Public exposure audit: forbidden nervous GLB/thumbnail return 404, good;
  `skeletal.glb` and `visceral.glb` are served with the repository's **uncleared**
  candidate digests; 4D Lab CT endpoint returns 200 but its file identity is
  unknown (HEAD only).
- Those facts do **not** mean the public Atlas or 4D Lab is license-cleared.
  Disabling owner overrides in the repository only blocks **future staging**.
  It does not delete, stop, or license assets already served by the live VPS.
  The owner should arrange a reviewed production containment/rollback of those
  routes without deleting other MEDCOEL content. No production mutation occurs
  in this PR.

## Catalogue of nine replacement source packages

All nine candidates have **publisher-record CC BY 4.0 claims**, but exact archive
rights, license inside each source archive, patient privacy and medical correctness
must be reviewed **after** source acquisition. They are not already released or
integrated into studio data pipelines.

| Package | Studio coverage / limitation | Official source |
| --- | --- | --- |
| HRA 3D Reference Organs | Candidate 3D organs for 9 Anatomy studios; not a detailed complete nervous atlas | https://humanatlas.io/3d-reference-library |
| TotalSegmentator small 2.0.1 | CT / organ labels, thorax/abdomen candidate; 3.2GB, no dedicated cardiac CTA | https://zenodo.org/records/10047263 |
| FracAtlas v7 | MSK X-ray fracture masks and labels; metadata review needed | https://figshare.com/articles/dataset/FracAtlas_A_Dataset_for_Fracture_Classification_Localization_and_Segmentation_of_Musculoskeletal_Radiographs/22363012 |
| GRAZPEDWRI-DX v2 | Pediatric wrist X-ray, labels and PII-sensitive filenames | https://figshare.com/articles/dataset/GRAZPEDWRI-DX/14825193 |
| LUS-7Seg v1 | Hepatobiliary US masks | https://data.mendeley.com/datasets/cwc37g672d/1 |
| LUS vertical artifacts v2 | Lung US B-line/vertical artifact annotation | https://data.mendeley.com/datasets/h923m366sf/2 |
| EchoNSTE-MI v1 | Echo 2CH/4CH/PLAX video; no pixel-level heart masks | https://data.mendeley.com/datasets/y6z64ntstg/1 |
| KMAR-50K v6 | Paired knee MRI artifact dataset, no organ labels | https://data.mendeley.com/datasets/xw7mrg7ntg/6 |
| KMAR-50K part 2 v6 | Additional knee MRI artifact cases | https://data.mendeley.com/datasets/95w9f5tzz8/6 |

**Explicitly excluded:** BodyParts3D 4.0 legacy version conflict, LPBA40 and
its upstream research-only license/USC refusal, AMOS archive-license conflict,
legacy Atlas NC software, Stanford MURA/EchoNet restricted datasets, and
mixed-provenance Z-Anatomy derived resources.

**Not yet solved:** complete Brain CT, FAST Ultrasound, dedicated Cardiac CT,
clinical knee segmentation and precise peripheral neuroanatomy. Do not fill
those with an unrelated dataset or publish technical fixtures as medical data.
Existing PTB-XL/HC18/PTX-498/SPIDER local cases stay private and untouched.

## All-at-once execution on owner's Mac

```bash
cd ~/mpruy
git switch claude/focused-wozniak-1ayrxa
git pull --ff-only origin claude/focused-wozniak-1ayrxa
npm run resources:batch:plan
npm run resources:batch:stage-all
```

This checks **all nine publisher records in one execution**, compares their
metadata licensing claims and version/publisher file indexes, and writes
one consolidated local report in
`local-data/studio-resources/alternative-candidates/batch-report.json`.

**Important:** `--stage-all` fetches publisher **metadata**, not patient
images, GLBs or CT archives. The command is intentionally capped at 2.5MB
per metadata record. No 3.2GB TotalSegmentator download is silently launched,
no unpinned files are registered, no registry promotion occurs, and no
medical or licensing reviewer is impersonated.

Cases with unavailable HTTP metadata, unexpected version, conflicting licence,
unknown files, or changed official hashes remain `SOURCE_METADATA_BLOCKED`.
Do not manually flip those status strings.

## Required next actions for *all* candidates together

1. From the private report, retain the exact official file list, sizes,
   original notices, release-specific licenses and publisher checksums.
2. For **all approved-for-acquisition candidates in one batch**, obtain
   bounded exact official files locally, validate SHA-256 and publisher MD5
   where published, quarantine any changed/ambiguous file and avoid PHI.
   Mendeley files and HRA GLBs need an actual publisher file manifest before
   automatic acquisition. Large CT/mesh archives require explicit disk
   capacity planning. No silent unbounded download.
3. Generate transformed source/derived byte inventories, provenance, attribution
   and notices; mark `PRIVATE_REVIEW` and keep disabled release receipts.
4. Adapt real modality-specific annotation/segmentation renderers, always
   without replacing existing valid data.
5. Have authorised independent rights, privacy, medical/terminology reviewers
   sign exact hashes before any student-facing release.
6. Use `npm run audit:live-rights-strict` to check what *currently* remains
   exposed on medcoel.com. It is read-only and is deliberately stricter than
   a hash-clean-but-unapproved release audit.

## Controls

- `licensing/commercial-release.json`: owner override disabled for both Atlas
  and 4D Lab; blocks new deployments that still rely on unverified rights.
- Legacy blocked and pending source records **remain preserved**; this batch
  creates no fake `verified` rights entries or approvals.
- `npm run test:licensing` includes source-batch regression tests and strict
  live-exposure classification (network not needed).
- User's free-for-all MEDCOEL Core policy remains unchanged.

This is a **candidate onboarding and public-release containment step**,
not a claim that all 24 studios have original datasets, that files have been
downloaded, or that the public website is already compliant.
