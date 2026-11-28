# Remaining anatomy gaps — 2026-11-26

## HRA
The single held crosswalk row is male lung / VH_M_hyoid / UBERON:0001685, HOLD_NO_UNIQUE_SOURCE_GROUP. Retain the hold; a BP3D hyoid does not repair an HRA node or validate cross-source alignment.
Pinned BP3D 4.3 mirror MANIFEST.csv (blob 3604032721bbcdc4477b9735b3a022188ff7544c) lists FJ2772 and FJ3201, BP22977, generic discovery FMA5018. Exact mesh paths and both is_a and part_of membership rows identify FMA52749 instead. Both have reported 1196 faces, 687 vertices and 75198 bytes; equal counts are not byte identity. Run the isolated dual-source hyoid batch before counting, importing, or deduplicating either. No HRA mapping, clinical review or release approved.

## Lower limb
Existing source evidence at commit 5e730e1de17cdd3316efce005e36406a25389114 (open3dmodel-lower-limb-observed-nerve-audit-20261126.json) covers 13 exact right-side node candidates decoded, 14 left-side targets unresolved, and right saphenous nerve unresolved. The exact raw source name "Saphenous branch of Femoralis nerve.r" (node 379, mesh 372) is a candidate for nomenclature review only; do not equate a branch with the complete nerve or infer geometry for the left side. The pinned 4.3 mirror manifest did not return the 14 target nerve names under the queried English spellings (including peroneal); that is a label search result, not proof of source absence. The public Anatomio left-limb page lists several exact left-side nerve names, but its Z-Anatomy/DBCLS provenance must be reconciled with existing asset-specific rights holds before acquisition or reuse. Discovery URL: https://anatomio.org/en/human/lower-limb/left/ . No download, mesh export or approval.

## Regression
Commit 8e48022c7dcac94c11b4d2ef63dd7d2224094853: review queue 45768627737, focused learning 45768627864, private regression 45768627774 succeeded. Actual workstation inventory, registration and medical review remain held. NO_GO.
