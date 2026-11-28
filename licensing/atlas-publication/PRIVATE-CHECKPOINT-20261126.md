# Integrated private Atlas checkpoint — 2026-11-26

This is a checkpoint for engineering review, not a final production release. The latest draft chain is #317 → #318 → #319 → #320 → #321. The separate #313 and #314 branches remain source investigations. Do not sum source file counts, individual meshes, ontology IDs and parent groups into a single human anatomy completeness percentage.

| Component | Evidence | Open gate |
|---|---|---|
| BP3D 4.3 | 246 original individual elements / 239 FMA / 667805 triangles, browser run 45752696033 | 239-concept glossary code added, full browser replay running; all terminology provisional |
| HRA | 9 files, 160 direct crosswalk rows, 37 source groups, one held, browser 45764063688 | Medical review, source frames, release-specific rights |
| Lower-limb | 13 right-sided candidate meshes decoded, 86204 triangles, run 45763902994 | No left inference, no serving, exact publisher version and texture rights unresolved |
| SIO | 23 publisher text targets | Actual workbook/volume bytes and TIFF counts unverified; no jobs in previous retries |
| BP3D 4.0 comparison | 247 sample rows, 70 overlapping FMA, 169 absent from sample | Full inventory unavailable, not net-new anatomy |

## Source alternatives for lymphatic vessels
- Dundee head/neck model: https://sketchfab.com/3d-models/lymphatics-of-head-and-neck-5abcaca1574248c0860ae1d81b06998d — candidate discovery only, direct model page returned HTTP 403; exact license and bytes not verified.
- Zygote male and female lymphatic models: https://www.zygote.com/poly-models/3d-male-systems/3d-male-lymphatic-system and https://www.zygote.com/poly-models/3d-female-systems/3d-female-lymphatic-system — commercial procurement candidate only. https://www.zygote.com/help states redistribution needs specific written permission. No purchase, no download, no authorization inferred.
- UMCG overview: https://sketchfab.com/3d-models/lymphatic-system-an-overview-00d877fa9fbc44218237dbc0a4cc96e1 — previously NC-SA; excluded.
- HRA Lymph Vasculature tables and patient lymph node CT datasets are not a complete normal human lymphatic vessel model.

## Nomenclature
https://ifaa.net/committees/anatomical-terminology-fipat/ and https://ifaa.net/committees/anatomical-terminology-fipat/fipat-ifaa-terminologies/ are standard references for review. Descriptive Latin and Indonesian glossary candidates are not official TA2/TNA crosswalks. A human anatomy reviewer must approve source-qualified, side-qualified, level-qualified terms before public use.

## Release gates
Keep production NO_GO until model-specific commercial rights, attribution/SA obligations, private pack separation, clinically reviewed labels, verified native registration, complete regional/layer inventories, actual host build/QC and owner approval are documented. The proprietary/NC legacy code remains excluded from commercial release without separate rights. Run `node scripts/audit-atlas-private-checkpoint.mjs` for reproducible receipt checks (does not download or publish anything). External branch evidence copies are records only, not an import of source geometry or integration code.
