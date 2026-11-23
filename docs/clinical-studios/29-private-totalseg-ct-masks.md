# MEDCOEL TotalSegmentator — private CT and anatomy mask overlays

## Evidence from owner Mac (23 November 2026)

The exact TotalSegmentator small v2.0.1 archive was downloaded privately
(3,244,617,817 bytes; publisher MD5 and SHA-256 verified). The owner ran
`resources:batch:ct-audit` and confirmed:

- **102 / 102** subjects have a CT volume and at least one structure mask.
- **12,241** ZIP members, including **102 CT volumes** and **11,934 mask files**.
- The four audited subject samples each contain **117** organ/structure masks.
- Liver, spleen, kidneys, four named lung lobes, aorta, heart, and vertebra L1
  are indexed for all 102 subjects.
- The source has **NO release, rights, clinical or privacy approval**.

## Private visual preview (one source subject; no bulk extraction)

After pulling the merged branch, generate both CT candidates in one command:

```bash
cd ~/mpruy
git switch claude/focused-wozniak-1ayrxa
git pull --ff-only origin claude/focused-wozniak-1ayrxa
node --test scripts/private-totalseg-ct-review.test.mjs
npm run resources:batch:review
open local-data/studio-resources/review-overlays/index.html
```

Alternatively, to render CT only: `npm run resources:batch:ct-preview`.

The generator revalidates the entire ZIP's **publisher MD5 and SHA-256** and
compares its receipt with last acquisition report. It opens one pseudonymous
subject's `ct.nii.gz` and seven matching source mask members with ZIP
central offset/size and **CRC-32 checks**. It never extracts all 102 volumes.

- **Abdomen CT**: source masks for liver, left kidney, spleen and aorta.
- **Thorax/Chest CT**: source masks for left upper lung lobe, right lower lung
  lobe and heart.

For each structure, choose the source mask's densest axial-index and
coronal-index slice, and compare the original CT windowed in HU with a
source-colored overlay. A slider adjusts the transparency.

The NIfTI-1 reader supports little-endian signed INT16 or FLOAT32 CT and
UINT8 or INT16 binary masks, including Nibabel's undefined NaN scaling and
valid sform/qform affine transforms. It checks **identical image-mask grid
dimensions and affine** (tolerance 0.001 mm) and refuses nonbinary labels,
invalid headers, out-of-range voxels and oversized decompressions. There is
**no silent resampling**. This is a _voxel-index_ layout; do not interpret
its orientation as left/right/anterior without radiological review.

Local output:

`local-data/studio-resources/review-overlays/abdomen-ct/index.html`

`local-data/studio-resources/review-overlays/chest-ct/index.html`

Both are labeled **PRIVATE_CANDIDATE_REVIEW_READY** only when actual local
NIfTI members successfully render and pass geometry checks. It is **not**
rights, privacy or medical clearance and does not edit
`licensing/resources.v1.json`, `licensing/commercial-release.json`, or
production web routes.

**Important:** The previously quarantined TCIA Chest CT source **stays
quarantined**. A TotalSegmentator Chest CT candidate is a separate source,
not a license override or clearance of TCIA. No raw CT is uploaded to GitHub.

## Verification and disclosure limits

A source mask is not proof of correctness; a clinician should review organ
alignment, laterality, HU window, scan orientation, missing anatomy and any
identifying elements before considering use beyond private preview. The
publisher's CC BY 4.0 source metadata still requires file-level provenance,
attribution, redistribution/privacy review and final approval.

If the owner machine's real NIfTI type or affine differs from the supported
subset, the renderer must fail closed and report its exact error rather than
fabricating a picture. Do not raise memory limits, strip registration
verification or silently adopt unknown slices in order to force a preview.
