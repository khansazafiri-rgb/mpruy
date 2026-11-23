# MEDCOEL — all-region, all-system BodyParts3D completeness audit

**Scope:** the ENTIRE Atlas catalog (every structure across skeletal, muscular, joints, cardiovascular, lymphatic and visceral). This does not claim the Atlas catalog itself is a complete reference anatomy. **UI: no redesign. Rights: PRIVATE REVIEW ONLY.**

## Current observed baseline (23 Nov 2026)

- Official BodyParts3D 4.0 files are downloaded locally; 2,234 OBJ entries in the publisher ZIP.
- The user's conversion completed **470/470 exact-name candidates** with 0 conversion errors. 1,767 Atlas catalog names are not represented by that conversion.
- The 470 include 107 skeletal and 30 visceral catalog candidates; this is *name coverage*, not anatomical completeness.
- The original Atlas viewer, existing system tiles, gold selection sweep, isolation, transparency, zoom, search, and context controls are retained.
- Exact-source license status remains blocked: source OBJ headers cite CC BY-SA 2.1 Japan; current publisher page says CC BY 4.0. Do not distribute any reviewed mesh until reconciled.

## Run the whole audit on the same Mac that has the local BodyParts3D archive and converted model inventory

```sh
cd ~/mpruy
git switch fix/atlas-bp3d-selective-source-no-ui-change-20261123
git pull --ff-only origin fix/atlas-bp3d-selective-source-no-ui-change-20261123
npm ci --prefix apps/4d-lab
npm run audit:bodyparts3d-full
```

This compares all 2,237 named Atlas structures with the publisher's official FMA/BP name records, FJ→OBJ source table, ZIP members, and local converted inventory. It also hashes/inspects the actual converted GLBs and checks source skin bounds, without modifying them. For faster metadata-only iteration, `npm run audit:bodyparts3d-full:fast` skips the GLB geometry scan and must not be treated as full QA.

Gitignored output in `local-data/licensing-quarantine/bp3d-completeness/`: 

- `SUMMARY.md` — every system coverage table, including all unconverted names.
- `full-audit.json` — all structure records, region and anatomy group summaries, exact/ambiguous/missing-OBJ statuses, official orphan identities, and integrity problems.
- `all-structures.csv` — every MEDCOEL catalog name, selected system/region, conversion state, official source identity (where direct), and review-only suggestions.
- `unlinked-official.csv` — publisher FMA/BP representations with real source meshes not represented by current conversion. These are not necessarily missing from the MEDCOEL curriculum.

### Three independent definitions of 'missing'

1. **Not converted:** catalog name is absent from private BP3D inventory. Distinguish exact-name official source available, ambiguous official matches, no OBJ, and no exact official name match.
2. **Converted but visually incomplete:** the structure exists but may have partial geometry, clipping, overlap, incorrect camera, or a named substructure (e.g., manubrium / sternal body / xiphoid, nasal bone / septal cartilage) not represented. Review individual FMA/BP/FJ source, triangle/bounds and screenshot: do NOT invent geometry.
3. **Outside Atlas catalog:** a publisher FMA/BP structure exists but there is no existing MEDCOEL card/metadata ID. Do not inject it into existing UI without anatomical taxonomy, labels/translations, region, source rights and clinical validation.

## How to add additional matching source geometry safely

**Only after a reviewer has checked each candidate's anatomy and source identity.** Fill the gitignored file `local-data/licensing-quarantine/bp3d-reviewed-mappings.json` with a reviewed set. Example *schema only* (placeholder identifiers are not approvals):

```json
{
  "schemaVersion": 1,
  "sourceArchiveSha256": "<copy exact SHA256 from bp3d-batch/inventory.json sourceHashes.archiveSha256>",
  "entries": [
    {
      "atlasName": "<existing unmatched Atlas catalog name>",
      "officialName": "<exact official table name>",
      "fmaId": "<FMA identifier from official table>",
      "bpId": "<BP identifier from official table>",
      "fjIds": ["<ALL official FJ elements for this concept>"],
      "reviewedSourceIdentity": true,
      "reviewer": "<actual anatomy reviewer>",
      "identityEvidence": "<at least 35 characters describing how FMA/BP/FJ identity, laterality, and anatomy were checked>"
    }
  ]
}
```

Then run:

```sh
npm run batch:bodyparts3d-reviewed
MEDCOEL_BP3D_REVIEWED=1 npm run preview:4d-lab
```

The rebuild outputs to `local-data/licensing-quarantine/bp3d-reviewed/`, keeping the original 470-model `bp3d-batch/` intact. The preview uses the **existing MEDCOEL Atlas interface** at `http://127.0.0.1:4173/anatomy/viewer/?models=bp3d:skeletal,visceral`; no new UI or production upload. The reviewed file is deliberately NOT committed. Empty or fuzzy-only reviews must not create new geometry.

The added candidate is still explicitly `geometryAnatomyValidated:false` and `approvedForDistribution:false`. Even verified FMA/BP/FJ identity does not establish mesh quality, clinical validation or an acceptable commercial license.

## Before any publication

- Every model: complete source lineage, hash/GLB validation, source-side laterality, named landmark/subpart integrity, overlap/bounds and clinical peer review.
- Every system: correct counts vs course anatomy, labels/language and search results, regional camera clipping, selection gold sweep, isolation/undo and all original user controls.
- Verify Safari desktop/mobile, WebGL errors, performance and UI layout regression.
- Resolve exact archive rights and MEDCOEL Atlas frontend code rights separately. **No production release by this work.**


## Follow-on: action-oriented triage of all 1,767 unmapped Atlas labels

After running `npm run audit:bodyparts3d-full` with the original private source archive and 470 converted GLBs, inspect these new gitignored outputs in `local-data/licensing-quarantine/bp3d-completeness/`:

- `priority-review.csv` and `priority-review.json`: all remaining Atlas names, by system and clinical group, ranked into review-only tiers. No automatic additions.
- `converted-geometry-review.csv`: already converted models with source geometry warnings, omitted degenerates, or potentially reversed side bounding boxes. All flags prompt **inspection**, not a diagnosis of inaccurate anatomy.
- `unapproved-identity-template.json`: a draft for human review containing only strict terminology-equivalent source candidates with source FMA/BP/FJ. Every entry has `reviewedSourceIdentity:false`, blank reviewer and evidence, and `approvedForDistribution:false`. **This file cannot be submitted to the batch converter without genuine documented identity review**.

Triage tiers: `TERMINOLOGY_EQUIVALENT_REVIEW`, `PROMISING_IDENTITY_REVIEW`, `MANUAL_ANATOMICAL_REVIEW`, `IDENTITY_COLLISION_REVIEW`, `SOURCE_GEOMETRY_MISSING`, and `NO_PUBLISHER_CANDIDATE`. These are **priorities**, never validation or public-release statuses.

A report with 0 integrity errors means the converted local files and source identifiers were consistent, **not** that the human body contains all required bones, cartilages, muscles, organs, or vessels. Anatomical completeness additionally requires landmark-level review, visual/clinical peer review, and suitable original source geometry.

**Do not copy the draft into `bp3d-reviewed-mappings.json` and mark it approved based solely on similarity scoring.** Only a reviewer who has checked the original source identities and exact FJ objects should fill the approval fields. No selected candidate is automatically published, merged into the current Atlas source, or used to claim clinical completeness.

