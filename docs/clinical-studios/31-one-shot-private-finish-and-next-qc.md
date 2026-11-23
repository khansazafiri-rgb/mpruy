# MEDCOEL — One-shot Private Clinical Studio Finalizer (23 Nov 2026)

## Goal

The owner wants ONE command to complete every **currently grounded** private
Clinical Studio preview, rather than a separate coding turn for every organ.
The exact catalog is 24 studios (plus one internal foundation fixture).

Private clinical data and the public MEDCOEL website are different release
boundaries. This command NEVER turns a technical preview into rights clearance,
independent clinical validation, removal of patient information, or public
deployment.

## One command on the Mac

After a reviewed PR is merged into the integration branch:

    cd ~/mpruy
    git switch claude/focused-wozniak-1ayrxa
    git pull --ff-only origin claude/focused-wozniak-1ayrxa
    node --test scripts/finish-all-clinical-studios.test.mjs scripts/private-totalseg-mpr.test.mjs
    npm run resources:finish-all
    open local-data/studio-resources/review-overlays/all-studios-dashboard.html

The command does not re-download large publisher files. It verifies/stages
metadata from the recorded local source reports and invokes existing
technical preview generators in one pass: Chest X-ray, HC18 fetal-head
ultrasound, SPIDER spine MRI, PTB-XL ECG, FracAtlas MSK X-ray and two
TotalSegmentator CT studios with shared interactive MPR.

It deliberately performs the previously established strict source-hash,
ZIP-member CRC, source CT/mask affine and exact geometry checks. The full
3.2 GiB TotalSegmentator archive must be present and can take time to re-hash
before the interactive previews are rebuilt.

## Outputs

Only in gitignored owner-local private data:

- review-overlays/index.html — existing 24-studio Private Clinical Review Hub;
- review-overlays/all-studios-dashboard.html — complete technical + blocked matrix;
- review-overlays/all-studios-report.json — machine-readable 24-studio status;
- review-overlays/next-qc-prompt.md — next-prompt QC tasks and all 24 rows;
- review-overlays/abdomen-ct/index.html and chest-ct/index.html — MPR, if
  real local NIfTI and masks passed verification;
- review-overlays/abdomen-ct/static-review.html and the matching chest page —
  original full-resolution source planes retained.

To refresh QC status WITHOUT re-rendering large CT volumes, run:

    npm run resources:qc-only

This can check whether existing private output files are present, safe paths
and local manifest flags are consistent. It **does not re-hash source archives**
or re-run clinical, privacy, legal or live website checks. Never describe it
as a new verification of source bytes.

## 24 studio coverage remains evidence-based

Previously observed technical results: 7/24 previews, 17 requiring exact
license-compatible sources, modality-specific renderers, privacy/medical
review, or 3D viewers. Some new source packages (HRA, ultrasound, echo,
knee MRI) are not yet fully indexed or acquired. Do not substitute
TotalSegmentator organ masks for full 3D anatomy studios; do not claim
HC18 fetal-head ultrasound as gynecology; do not treat ECG waveforms as
clinician-approved diagnoses or FracAtlas COCO as diagnostic truth.

Any study marked QUARANTINED, NC, unknown licence or without a pinned source
file must stay blocked. Historical live concerns for skeletal/visceral GLB
and unverified Atlas CT endpoints must be independently audited before
public release. No source override is allowed.

## One-prompt QC after the owner-local command

Use the *actual generated* local reports and browser screenshots, not only
GitHub synthetic unit tests. The future QC prompt must inspect all 24
studios, image-mask alignment, lateral orientation, labels, source hashes,
browser interaction, attribution, privacy (including burned-in identifiers),
licence compatibility with commercial release, production exposure and all
GitHub CI checks. Score PASS/FAIL/BLOCKED with concrete evidence; create
fix PRs for validated bugs and do not deploy without separately grounded
clearance.

All preview status remains HUMAN_REVIEW_REQUIRED. ReleaseApproved is false
in every output by construction.
