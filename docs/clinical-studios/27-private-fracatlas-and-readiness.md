# MEDCOEL — private FracAtlas review & all-source readiness (2026-11-22)

## Evidence entering this step

The owner's Mac reported the first **successful local batch** after Figshare's
Cloudflare R2 redirect fix (`npm run resources:batch:all`):

- 9/9 source-publisher metadata records matched.
- 3 exact publisher files acquired privately; 0 file-download errors.
- The files are FracAtlas `FracAtlas.zip`, GRAZPEDWRI-DX
  `dataset.csv`, and `folder_structure.zip`.
- 11 source/file items remain excluded for file-manifest or size gates:
  TotalSegmentator 3.2 GB, 4 GRAZ image parts, HRA 3D files and five
  Mendeley-source packages.
- Rights/medical/privacy approval is still false. **No public deployment.**

## One local review command

```bash
cd ~/mpruy
git switch claude/focused-wozniak-1ayrxa
git pull --ff-only origin claude/focused-wozniak-1ayrxa
npm run resources:batch:review
open local-data/studio-resources/review-overlays/index.html
```

This generates the nine-source/24-studio readiness report at
`local-data/studio-resources/alternative-candidates/processing-readiness.json`
and updates the offline review hub. Existing Chest X-ray, HC18, SPIDER MRI and
PTB-XL review views are preserved and rechecked using existing exact registry
pins. The new **MSK X-ray** preview uses a _different_ non-approving label,
`PRIVATE_CANDIDATE_REVIEW_READY`, because FracAtlas is not yet in the frozen,
approved studio resource registry.

## What FracAtlas produces

- The input `FracAtlas.zip` must match its original Figshare metadata file
  index, publisher MD5, local SHA-256 and last private acquisition receipt.
- The local ZIP reader verifies entry CRC, declared size, uncompressed bounds,
  central index and paths; refuses symlinks, traversal, duplicate entries and
  oversized decompressions. Nothing extracts wholesale.
- Select up to six real fracture-positive radiographs with a COCO-JSON
  `segmentation` polygon and matching image ID, image dimensions and source
  basename. **COCO RLE, bounding boxes or normal images never become made-up
  fracture polygons.**
- Re-encode the container to remove JPEG APP/COM metadata without touching
  the compressed scan content. This does **not** guarantee removal of burned-in
  text or other identifying pixel content.
- Create private sanitized `image-N.jpg` and `overlay-N.svg` with an opacity
  slider, review summary, and source archive/COCO hashes under
  `local-data/studio-resources/review-overlays/msk-xray/`.
- Does not create Challenge answers, clinical case labels, patient IDs,
  public images, production routes or approval records.

The FracAtlas source layout is grounded in the published paper, including
`images/Fractured/`, `Annotations/COCO JSON/COCO_fracture_masks.json` and
`dataset.csv`: Abedeen et al., *Scientific Data* (2023), doi:
`10.1038/s41597-023-02432-4`. The source publisher Figshare article v7
remains `https://doi.org/10.6084/m9.figshare.22363012`.

## Remaining source packages are not secretly complete

- **GRAZPEDWRI-DX:** the CSV and folder ZIP are not radiographs. Its four
  `images_part*.zip` packages still exceed the default file-size cap;
  there is no legitimate GRAZ X-ray preview until image/annotation bytes
  are paired and reviewed.
- **TotalSegmentator:** selected small v2.0.1 is ~3.2 GB, above the default
  512 MiB per-file cap. Needs disk capacity, exact archive and medical review.
- **HRA 3D:** organ-by-organ file manifest/provenance still missing; a
  portal-wide CC BY claim does not approve every imported GLB.
- **Mendeley ultrasound, echo, knee MRI:** source page metadata was checked,
  but file-level manifests and exact asset hashes are still missing.
- **Brain CT, cardiac CT, FAST ultrasound, peripheral neuroanatomy:** no
  sufficiently grounded replacement automatically inferred from unrelated
  datasets.

The new `processing-readiness.json` describes **recorded archive counts**,
not an independent re-hash and never medical, privacy or rights clearance.
Only the FracAtlas preview path re-hashes the actual archive before using it.
All sensitive data stays under Gitignored `local-data/`.

## Review checklist

Visually compare original radiograph and source fracture polygon on each case.
Confirm laterality (if possible), anatomical region, nonfractured controls,
false-positive or uncertain annotations, and any patient text burned into the
pixel grid. Keep results private until medical, rights and privacy reviewers
sign the exact derived asset hashes. Do not screenshot/share an unreviewed image
as though it were deidentified.

Production Atlas/4D risks remain separate: the last live audit observed
uncleared skeletal/visceral GLBs and an unverified CT endpoint, even though the
repository disabled legacy owner overrides. This PR does **not** change those
live public routes or relabel them as cleared.
