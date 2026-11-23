# MEDCOEL — Fast private CT MPR, both regions in one batch

## Purpose

The owner previously achieved **7/24 private Clinical Studio previews** including
Abdomen CT and Thorax CT. TotalSegmentator small v2.0.1 passed local publisher MD5,
SHA-256, ZIP structure audit, and original NIfTI image-mask geometry checks. The
first CT preview rendered only static source-mask axial-index and coronal-index
images. This step adds **interactive three-plane MPR in both existing CT studios
at once**, without changing clinical/licensing approval or production code.

## Run on the Mac after PR merge

```bash
cd ~/mpruy
git switch claude/focused-wozniak-1ayrxa
git pull --ff-only origin claude/focused-wozniak-1ayrxa
node --test scripts/private-totalseg-mpr.test.mjs scripts/private-totalseg-ct-review.test.mjs
npm run resources:batch:mpr
open local-data/studio-resources/review-overlays/chest-ct/index.html
open local-data/studio-resources/review-overlays/abdomen-ct/index.html
```

To update the complete 24-studio review hub in one command instead, use
`npm run resources:batch:review`. It regenerates the two CT candidates in a
**single** TotalSegmentator source verification and CT decoding pass.

## What appears

- Axial, coronal, and sagittal **voxel-index** planes with independent slice
  sliders and mouse wheel navigation.
- Organ toggles, opacity slider, and original HU intensity display with
  soft-tissue, lung and bone window presets.
- The 11 requested source masks: liver, spleen, both kidneys, aorta, heart,
  vertebra L1, and the four named upper/lower lung lobes.
- One shared gzip-compressed 3D HU + organ bitset representation under
  `local-data/studio-resources/review-overlays/ct-mpr-private/`; both HTML
  viewers reuse it via **local script files**, without browser fetch calls.
- Existing original-resolution source-mask images remain accessible at each
  studio's `static-review.html`, using its existing image and overlay assets.
- Both CT candidates stay separate from the legacy **quarantined TCIA CT**.

The MPR volume is deliberately sampled to at most 144 voxels along its longest
axis, with nearest-neighbour source mapping and color-coded binary source masks.
This is for **responsive educational inspection**, not radiological
measurements or diagnostic orientation. The original CT and masks are checked
against each other's shape and affine *before* any sampling. No guessed affine,
fake masks, unreviewed diagnosis, or redistribution permission is introduced.

## Performance and provenance

The ZIP is checked once per generator invocation against the official publisher
MD5, current metadata and owner-local acquisition receipt. One source CT
is decompressed and reused for both regions. Each of the seven existing
full-resolution source masks is checked and rendered with **one 3D scan for
both axial and coronal indices**, avoiding duplicate scan work. Four additional
existing source masks are read only for the interactive MPR. A single
gzip-compressed HU/int16 + mask/uint16 bundle is written locally.

The local `bundle-manifest.json` retains archive and CT hashes, sampled
grid dimensions, source mask identities, and **all approvals false**.
The binary bundle is created under Gitignored `local-data/`; none of the
generated CT data should ever be copied into GitHub, a public folder,
patient-facing product, or MEDCOEL student release.

## Review and limitations

This version has not been visually validated against the owner's **real
TotalSegmentator volume** until the owner reruns it on the Mac. Browser support
requires `DecompressionStream('gzip')` (supported in current Safari/Chromium).
If unavailable, the UI clearly offers the original static-review link.
Check organ labels, HU intensity, laterality, geometry, privacy and
attribution with authorized reviewers. A screenshot of an unreviewed
medical image is not a release-cleared asset.

The other 17 studios are **not made ready** by sharing a single CT source.
Their own authentic modality data, rendering, and legal review are still
needed. This PR must not change `licensing/resources.v1.json`,
`licensing/commercial-release.json`, public Atlas/4D endpoints, or the
quarantined TCIA source.
