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
npm run resources:batch:all
```

`resources:batch:all` executes **all nine publisher metadata checks** and
attempts one **bounded private acquisition batch** for official Figshare or
Zenodo files with verified publisher MD5, recorded version and size. It
writes consolidated reports at
`local-data/studio-resources/alternative-candidates/batch-report.json`
and `acquisition-report.json`.

The default safety caps are **512 MiB per archive** and **4096 MiB total**,
with a free-disk-space check. Consequently, TotalSegmentator small (3.2GB)
is **not** downloaded by default; HRA GLBs and Mendeley medical files are
also skipped until their exact publisher file inventories are pinned.
That is intentional and is reported rather than being called a successful
install. To explicitly allow larger archives after checking Mac disk space,
run `npm run resources:batch:all -- --max-file-mib=4096 --max-total-mib=8192`.

The online metadata checks are capped at 2.5MB per record, and raw medical
data are retained as verified **archives** only in gitignored local-data:
no unpacking, conversion, PHI review, asset registry promotion, UI deployment
or fake approval occurs. Source checksums are publisher MD5 plus independent
local SHA-256 inventory, not evidence of clinical review.

Cases with unavailable HTTP metadata, unexpected version, conflicting licence,
unknown files, or changed official hashes remain `SOURCE_METADATA_BLOCKED`.
Do not manually flip those status strings.

## Required next actions for *all* candidates together

1. From the private batch reports, reconcile any **skipped/failed** source
   against its exact official file list, revision, licence and archive notices.
2. Complete Mendeley/HRA file-level manifests and, for large CT packages,
   confirm disk capacity before rerunning the same batch. No unpinned
   source is allowed into the clinical UI. Do not silently lower safety gates.
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

## 22 Nov local follow-up: Figshare transport diagnostics

The owner ran the first batch and reported **9/9 publisher metadata matches,
0 downloaded private files, 11 excluded for size/file-manifest gates, 3
Figshare file-download failures**: `FracAtlas.zip`, `dataset.csv` and
`folder_structure.zip`. The initial HTTP/redirect error merged multiple
causes and was not proof of an incompatible source licence.

Figshare supports an official `ndownloader.figshare.com/files/{fileId}`
endpoint and an official `api.figshare.com/v2/file/download/{fileId}`
fallback. The transport fix checks **every redirect hop**, requires HTTPS,
allows only expected Figshare/Zenodo and object-storage hosts, rejects
HTTP 202 challenge/interstitials, rejects HTML in place of medical assets,
caps bytes, and verifies the **same exact publisher checksum and size**.
Error reports reveal HTTP status and host but never a signed query/token.
Regression tests cover 202, 403, malicious redirects and API fallback.

To retry the same one-batch acquisition after pulling the fix:

```bash
cd ~/mpruy
git switch claude/focused-wozniak-1ayrxa
git pull --ff-only origin claude/focused-wozniak-1ayrxa
npm run resources:batch:all
```

If Figshare still blocks access, inspect the new per-file HTTP/host reasons.
Do not turn off checksum or host verification to force a download. A 202
from the Figshare website is not a successful 200 medical source file.
The five size-capped assets and six missing-file-index sources still
require their separate exact-file admission; no source is automatically
promoted or deployed.

## 23 Nov 2026 — Large Zenodo archive timeout and resumable transport

The owner's Mac ran the 8 GiB batch with ~22 GiB free. The previous downloader
terminated the ~3.2 GiB TotalSegmentator transfer after a fixed 15-minute
network abort, then deleted its `.partial-PID`. The last run recorded one new
private archive, nine exclusions and one CT transfer failure; the newest report
also ceased listing earlier FracAtlas/GRAZ downloads because it included only
files planned in that specific batch.

The hardened downloader now:

- Uses a **120-second idle/no-progress watchdog** for publisher HTTP streaming,
  reset on each received chunk. No 15-minute absolute transfer deadline.
- Uses a stable `.partial` and source MD5/byte-size-pinned `.partial.json`
  sidecar. Both stay exclusively within gitignored private local-data.
- Retries safely (up to three attempts), requesting `Range` from the local
  byte offset; requires HTTP 206 `Content-Range` start, end, total and byte
  count to match exact publisher metadata. If the official endpoint ignores
  Range and returns a full HTTP 200 response, truncates that partial and
  restarts cleanly rather than appending duplicate bytes.
- Shows private progress at approximately each 64 MiB, retaining partial
  data if a stream stalls. Any complete file is accepted only after
  streaming verification of the *entire file* against publisher MD5/size
  plus independent SHA-256.
- Rechecks original files from earlier runs and restores verified receipt
  entries, even if a later batch would exclude them under a changed size cap.
  This protects FracAtlas review from losing its previous acquisition receipt.

**Owner Mac command** (not for CI/VPS; potentially 8 GiB of network traffic):

```bash
cd ~/mpruy
git switch claude/focused-wozniak-1ayrxa
git pull --ff-only origin claude/focused-wozniak-1ayrxa
node --test scripts/private-resumable-archive.test.mjs
df -h ~/mpruy
npm run resources:batch:all -- --max-file-mib=4096 --max-total-mib=8192
npm run resources:batch:review
```

The original ~318 MiB `.partial-PID` file from the old downloader was
removed by its old timeout handler and **cannot be resumed**. New transfers
will preserve stable `.partial` across interruptions and process restarts.
If the publisher does not support consistent Range requests, HTTP 200 may
require restarting that individual file. Never disable checksum verification.

The source still has **no rights, privacy, medical or release approval**;
receiving a full verified archive does not authorize unzipping it into a
public app. The live Atlas/4D rights blockers remain unchanged.
