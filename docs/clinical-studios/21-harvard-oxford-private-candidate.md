# Harvard–Oxford Brain MRI — isolated private import candidate

**Status: engineering-only preparation, NOT licensed-file clearance, a medical approval, or a public release.** This candidate must never be interpreted as a replacement for an actual rightsholder grant, complete attribution, patient/privacy review, clinical review, or the canonical release gate.

## Why this route is preferable to LPBA40

Oxford's current license page distinguishes the **Harvard–Oxford atlas datasets (CC BY-SA 4.0)** from most **FSL software (restricted to noncommercial software use)**: https://fsl.fmrib.ox.ac.uk/fsl/docs/license.html . The documentation also describes how the zero-based XML atlas indices map to labels in maximum-probability maps: https://fsl.fmrib.ox.ac.uk/fsl/docs/other/datasets.html .

MEDCOEL **does not need or bundle FSL software** to run this importer. Candidate image+label inputs must be independently sourced and checksummed. A known research software distribution path is Nilearn's Harvard–Oxford download reference (NITRC HarvardOxford.tgz); use of Nilearn's URL is *not* a new license grant: https://nilearn.github.io/stable/modules/generated/nilearn.datasets.fetch_atlas_harvard_oxford.html .

**Do not place Harvard–Oxford MNI-space masks on the existing SRI24 anatomical T1 image without a validated and reviewed image-to-image registration.** This generator refuses mismatched dimension/affine; it does not attempt interpolation or silently alter anatomy.

## Required private inputs and evidence

Store these only in the gitignored `local-data/studio-resources/raw/harvard-oxford/` folder:

- `atlas.nii.gz`: 3D **max-probability** Harvard–Oxford segmentation. A 4D probabilistic atlas is rejected.
- `atlas.xml`: source's label table corresponding exactly to that mask. For maximum-probability maps, voxel ID = XML `index` + 1; 0 is background.
- `underlay.nii.gz`: an anatomically aligned structural MRI/T1 image in **exactly the same physical grid and space** as the atlas. Its copyright/license and file provenance are **separate** and require independent evidence.
- `source-manifest.json`: locally constructed manifest for the exact files. Include actual SHA-256 (not placeholders) and authoritative evidence URLs.

Manifest shape (replace `<actual-...>` with actual evidence; this example will intentionally fail validation):

```json
{
  "schema": "medcoel.harvard-oxford-inputs.v1",
  "atlas": {
    "licenseId": "CC-BY-SA-4.0",
    "licenseEvidenceUrl": "https://fsl.fmrib.ox.ac.uk/fsl/docs/license.html",
    "sourceUrl": "<actual-official-atlas-data-url>",
    "version": "<exact-version>"
  },
  "underlay": {
    "sourceUrl": "<actual-https-underlay-url>",
    "licenseId": "<verified-underlay-license>",
    "version": "<exact-version>"
  },
  "files": {
    "underlay.nii.gz": "<actual-64-hex-sha256>",
    "atlas.nii.gz": "<actual-64-hex-sha256>",
    "atlas.xml": "<actual-64-hex-sha256>"
  }
}
```

Do **not** fabricate file hashes, source releases or agreement with upstream license. The manifest records a claim and processing provenance for later human review; it cannot confer permission.

## Commands (on a private development machine with authorized exact files)

```bash
node apps/studios/tools/prepare-brain-mri-harvard-oxford.mjs
node apps/studios/scripts/build-all.mjs --only brain-mri --private --harvard-oxford-candidate
node --test scripts/studio-harvard-oxford.test.mjs
```

Input SHA mismatches, unlisted labels, non-3D NIfTI, inconsistent space, absent underlay license, blank underlay or missing validated interior label points cause an immediate error. The candidate output is private at `local-data/studio-resources/build/brain-mri-harvard-oxford/`.

The candidate's label volume `data/labels-harvard-oxford.nii.gz` and region table `data/labels-harvard-oxford.json` are withheld by the studio's Challenge path restrictions. Server-only answer keys stay under `server/challenge.json`. Source files never enter GitHub or CI.

## Release and scholarly limitations

- The **Harvard–Oxford license notice needs exact source author attribution**, not just a generic CC BY-SA statement. The current candidate NOTICE is preliminary and must be replaced with full credit/change notice and verified underlay credits before any release.
- CC BY-SA 4.0 may entail distributing adapted atlas data under compatible ShareAlike terms; a viewer session, authenticated delivery and future separate paid videos do not automatically eliminate those obligations. Review distribution mechanisms and sublicensing/DRM restrictions.
- Atlas region points and terminology are mechanically generated and **not reviewed medical annotations or diagnoses**. The simple four-option Challenge is a test of grader plumbing, not approved educational assessment.
- Underlay image rights are not established by a license applying only to the Harvard–Oxford atlas segmentation.
- No LPBA40 input, atlas software, restricted dataset or clinical approved file is acquired automatically.
- The original SRI24 private data, its reproducibility ledger (46 raw / 54 derived) and existing grants are not modified.
- The resulting candidate is deliberately NOT added to verified resource registry; fail-closed catalog and receipt gates remain unchanged.
- Keep MEDCOEL's **entire core free**. Potential future paid video explanations are separated and must not include unlicensed atlas images or model content.

**Next required step:** obtain real source+underlay files with lawful redistribution, run the generator in private, verify exact output hashes, prepare a scoped source+derivative evidence record, and obtain actual qualified legal/privacy/medical/terminology decisions. Only then consider release candidate mapping and staging tests.
