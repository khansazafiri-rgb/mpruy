# MEDCOEL — exact-level vertebra source preview (PRIVATE ONLY)

## Why the spine is missing in the 602-model preview

The authenticated local audit showed **602/2,237** catalog names converted, but only 1/26 spine/sacrum/coccyx catalog entries had a GLB before this change. The old source CSV limited each name to 8 token matches. Thus, `Vertebra C3` was linked only to generic `vertebra` or unrelated levels such as `eighth thoracic vertebra` — *not* an acceptable anatomy source for C3. The original Atlas mode is a separate mesh source, not proof that BodyParts3D contained the missing bones.

## New conservative matcher

The publisher's **complete** official FMA/BP/FJ table is inspected *directly* for `atlas` (C1), `axis` (C2), exact numbered cervical C3–C7, thoracic T1–T12, lumbar L1–L5, and `coccyx`. There are **25 targeted catalog identities** (24 levels plus coccyx); zero is a possible result if none of the exact publisher OBJ representations pass.

The matcher requires a unique whole-bone publisher label for a specific level, complete original FJ OBJ data, unique identity and non-overlapping source geometry, expected anatomical type, and zero conflicting laterality or source naming warnings. It refuses generic `vertebra`, `cervical vertebra`, neighboring level bones, intervertebral discs, small facets, segments, vessels, and arbitrary fallback meshes. **A source label match is not a clinical verification of the model.**

## One-step Mac private batch and preview

```sh
cd ~/mpruy
git fetch origin
git switch feat/bp3d-exact-vertebra-private-preview-20261124
git pull --ff-only origin feat/bp3d-exact-vertebra-private-preview-20261124
npm run qc:bodyparts3d-vertebra:preview
```

The single command runs existing 4D, Atlas and licensing tests, verifies the original BodyParts3D archive and prior 470/584/602 GLB source lineage, selects **only exact bone-level matches**, converts only the extra accepted candidates, checks full source identity and GLB integrity, stores output as `local-data/licensing-quarantine/bp3d-vertebral/`, and opens the **unchanged original MEDCOEL Atlas UI** using `MEDCOEL_BP3D_VERTEBRAL=1`.

One-pass status: `local-data/licensing-quarantine/bp3d-vertebral-onepass-review/readiness.json`. Full per-structure audit: `local-data/licensing-quarantine/bp3d-completeness-vertebral/focus-gaps.md`, `full-audit.json` and `converted-geometry-review.csv`.

**Maximum possible**: 602 existing + 25 exact missing bones = **627 unvalidated private GLBs**. This is an upper bound, not a promise that all 25 are present, independent or geometrically sound. A zero-candidate or failed audit blocks promotion of the private preview, preserves the 602 package and produces an error report. The optional `--vertebral` audit reads the new package only after creation.

## Medical/source review and public release

Examine each converted bone from front/back/lateral orientation and with source FJ landmarks; inspect C1–C2 versus C3–C7, 12 thoracic costal facets, lumbar morphology and the coccyx separately. Check left/right, relative LPS coordinates and missing portions against the archive and established anatomy references. Never fill missing bones by duplicating adjacent levels.

The exact BodyParts3D archive's license terms and MEDCOEL Atlas code's noncommercial source code grant remain unresolved. **No public medcoel.com deployment, no asset upload, no false medical/rights approval, and no original Atlas UI redesign.**
