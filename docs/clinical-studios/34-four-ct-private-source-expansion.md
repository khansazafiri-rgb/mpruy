# MEDCOEL — Four CT Clinical Studios: PRIVATE engineering expansion

Date: 23 November 2026. No public data release, no production deployment, no medical/rights/privacy approval.

## Actual technical coverage

| Studio | Genuine source | This PR | Release |
|---|---|---|---|
| Chest CT | Existing owner-local pinned TotalSegmentator 2.0.1 ZIP | MPR with original mandatory masks plus up to 6 optional source masks | BLOCKED |
| Abdomen CT | Same verified source ZIP and CT volume | MPR with up to 11 optional source masks | BLOCKED |
| Brain CT | No new source bytes attached | Source-pinned NIfTI CT + manual brain mask importer; same MPR renderer | BLOCKED pending real data and rights |
| Cardiac CT | No new source bytes attached | Source-pinned NIfTI CTA + seven labelled heart-class importer; same MPR renderer | BLOCKED pending real data and rights |

Existing TotalSegmentator: 11 mandatory authentic mask IDs plus 17 optional publisher IDs = maximum 28. Optional masks are included ONLY if their corresponding ZIP member exists for the selected source subject and passes ZIP CRC, exact grid/affine/units and entire-source binary checks. Missing members are reported as unavailable, not manufactured. Generated CT data remain gitignored in local-data.

The same geometry, HU codec, canvas UI, three-plane MPR and HTML template are reused across four CT studios. Legacy v1/uint16 packets remain compatible; 16–30 masks use v2/uint32 packets. Different patients/modalities never share a 3D volume or claim registration.

## Owner Mac: extend the two grounded CT studios

After PR merge, run:
    npm run test:ct-expansion
    npm run resources:batch:mpr
Then open:
    local-data/studio-resources/review-overlays/chest-ct/index.html
    local-data/studio-resources/review-overlays/abdomen-ct/index.html
See private ct-mpr-private/bundle-manifest.json for additionalMasksPresent and optionalMasksUnavailable. The old full-resolution static panels are preserved. Real source QA and native browser/anatomical L/R review must be completed on the owner's system. The PR itself cannot read the owner-local 3.2GB ZIP.

## Brain CT candidate — restricted access, no commercial release approval

PhysioNet: Brain Segmentation Performance in Head CT from MISTIE III Trial, version 1.0 (17 Nov 2026), DOI 10.13026/a3rk-n089.
https://physionet.org/content/mistie-iii-brain-segmentation/1.0/
Ten defaced CT volumes have manual *whole-brain* masks, value 1. One mask may have source-defined -2000 outside-image fill. This is not a hemorrhage subtype or stroke lesion segmentation dataset.
Access requires signed PhysioNet Restricted Health Data Use Agreement 1.5.0; the publisher expressly warns that commercial/public redistribution rights are NOT granted by download. Do not auto-download or upload this data into MEDCOEL public infrastructure.

## Cardiac CT candidate — registration terms require independent clearance

MM-WHS 2017 official source: https://zmiclab.github.io/zxh/0/mmwhs/data.html
Cardiac CT/CTA training masks include: LV blood cavity=500, RV blood cavity=600, LA blood cavity=420, RA blood cavity=550, LV myocardium=205, ascending aorta=820, and pulmonary artery=850. These are whole-heart classes, not coronary artery, plaque, or stenosis masks. Registration and organizer terms apply; no commercial redistribution permission is assumed.

## Import only a lawfully obtained matched NIfTI pair

After obtaining proper source access and independent authorization, place a REAL CT image and its matching REAL source mask under:
    local-data/studio-resources/paired-ct-inputs/brain-ct/
or  local-data/studio-resources/paired-ct-inputs/cardiac-ct/

Create manifest.json there with this structure. Literal angle-bracket text is a placeholder, NOT a valid hash:
```json
{
  "schema": "medcoel.private-paired-ct-input.v1",
  "studio": "brain-ct",
  "sourceId": "mistie-iii-brain-segmentation-v1",
  "subjectAlias": "s0001",
  "files": {
    "ct": {"filename": "real-ct.nii.gz", "sha256": "<actual SHA256>"},
    "segmentation": {"filename": "real-mask.nii.gz", "sha256": "<actual SHA256>"}
  }
}
```
For Cardiac CT set studio to cardiac-ct and sourceId to mm-whs-2017-cardiac-cta. The alias is locally chosen and must not encode patient information. Preserve the actual CT and labelled segmentation grid without guessing.

Commands, only when real source files and hashes exist:
    npm run resources:ct:brain:private
    npm run resources:ct:cardiac:private
    npm run resources:finish-all

Output pages are local-data/studio-resources/review-overlays/{brain-ct,cardiac-ct}/index.html. The 24-studio review hub counts these only if source-pair receipt, input manifest, output file hashes, selected labels, source affiliation, and all unapproved release flags agree.

Fail closed on unknown/unexpected mask labels, insufficient source content, altered SHA256, affine/dimension/units mismatch, missing file/permission, unsupported compressed NIfTI, unsafe path/symlink, or truncated data. Some large cardiac volumes may exceed parser size limits and remain BLOCKED, not silently resampled before validation.

## Non-goals

No patient data, licensed raw CT, or source-derived binary volumes are committed to GitHub; no public deployment, no registry rights override, no synthetic medical content. 24/24 Clinical Studios remain public-release NO-GO. Human review of anatomical L/R, organ overlays, native browser/device behavior, privacy, exact-file licensing, attribution, and exact-build approval is mandatory.
