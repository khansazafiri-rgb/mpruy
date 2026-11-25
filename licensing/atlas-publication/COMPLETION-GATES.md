# MEDCOEL Atlas: completion and evidence gates (2026-11-25)

Status: PRIVATE REVIEW / NO_GO. Do not turn source-level license eligibility into an approved build.
Do not request owner UI acceptance until the engineering and source checks below have evidence.

## Source review

| Publisher / dataset | Evidence | Status and limits |
|---|---|---|
| DBCLS BodyParts3D 4.0 | https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html (publisher notice updated 2025-02-27); https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html | CC BY 4.0 explicitly permits redistribution and adaptations with attribution. Retain historical BY-SA notice and exact archive receipts; each exported asset must match official OBJ. Adult male reference, not complete human anatomy. |
| Human Reference Atlas | https://humanatlas.io/3d-reference-library ; https://humanatlas.io/vccf | Existing 80 references have prior version-specific source replay. Individual organ models, e.g. mesenteric lymph nodes; keep source frames separate. Lymph Vasculature CSV is not a 3D vessel model. |
| Anatomia Aperta 3D | https://anatomiaaperta.org/sources/ ; https://anatomiaaperta.org/about/ | Publisher declares model CC BY-SA 4.0, describes extensive CNS/PNS/autonomic expansion. Candidate only: verify exact downloadable bytes, individual lineage (including Z-Anatomy ancestry), compatibility, and attribution before ingestion. No blanket approval. |
| Open3DModel | https://anatomytool.org/open3dmodel | Candidate regional replacement. Publisher item page unavailable during this review. No download or approval. Check model and texture rights separately. |
| Legacy Atlas UI | apps/anatomy/LICENSE §3 | Declared NC-SA; only explicit local noncommercial comparison is permitted by current engineering policy. Commercial path requires documented ownership/relicensing or independent implementation of the same functional design. |

## Acceptance gates

1. Preserve original desktop/mobile layout, branding, controls, navigation, search, yellow highlight, per-structure visibility, undo, transparency, camera, fullscreen. Compare browser captures and test functionality. Do not invent metadata to enable layers or region filters.
2. Per-system target inventory with explicit FMA/ontology identities, missing and ambiguous labels, verified geometry, source/sex/frame and separate reference vs registered body status. Counts alone do not prove completeness. Include nerve pathways, respiratory lobes/bronchi/pleura, lymph nodes and actual lymph vessels, all visceral systems and male/female reference differences.
3. Replay source hashes, compare native geometry, verify model-level rights, attribution and adaptation obligations. Exclude NC or unknown commercial rights. Never use a global owner-risk override.
4. Build, security, HTTP, WebGL, functional regression and browser comparison with the actual pack. Test thumbnails, layer/region validity, Library/Guided/Quiz mappings; do not silently reuse withheld geometry.
5. Final build-specific rights and clinical/educational accuracy review. Keep public release policy blocked until all gates are evidenced and explicitly approved.

The broad recovery mode adds isolated exact-source concepts only, not registered whole-body anatomy. It is not a claim of clinical coverage or a release approval. Current local evidence before broad recovery: 1016 body models, 80 HRA references, 29 isolated priority exports. Broad export and browser checks remain pending on the workstation holding the source archives.

## Additional source findings — 2026-11-25

- Anatomia Aperta 3D publishes a system-organized GLB collection via the download link in https://github.com/tspiriev/Anatomia-Aperta-3D/blob/main/3D%20Models.md. The license at https://github.com/tspiriev/Anatomia-Aperta-3D/blob/main/LICENSE.md expressly permits commercial use of eligible original contributions and adaptations under CC BY-SA 4.0, while preserving third-party restrictions. Cranial nerves from Dundee, NC inner-ear and kidney components, and unspecified brain/white-matter provenance must be checked individually. HOLD: no model bytes or per-mesh lineage verified; do not import the whole nervous system file as a cleared asset.
- Open3DModel upper/lower limb publisher pages https://anatomytool.org/content/open3dmodel-upper-limb-english-labels and https://anatomytool.org/content/open3dmodel-lower-limb-english-labels returned HTTP 502 in the source review. HOLD until exact publisher download, model terms and texture exclusions are verified. Third-party mirrors do not substitute for publisher evidence.
- OpenEar v2 https://doi.org/10.5281/zenodo.1473724 is publicly downloadable and includes eight distinct temporal-bone specimens with segmented ossicles and other ear structures. The record totals 59.1 GB; earliest v1 is restricted. HOLD: verify v2 dataset-level license (not merely associated paper license), exact archive/member integrity, specimen identity, and independent frame. No mass download.
- TCIA CT Lymph Nodes https://www.cancerimagingarchive.net/collection/ct-lymph-nodes/ lists 176 patient-specific mediastinal/abdominal node mask sets (CC BY 3.0). These may be useful for separate clinical examples, not a normal whole-body reference. No vascular continuity or normal-node anatomy claim. TCIA LNQ https://doi.org/10.7937/qvaz-ja09 contains oncology cases, not a normal lymphatic network. HOLD for educational case-specific privacy/geometry review; do not fuse patient cases into the atlas.
- Whole-body lymphatic vessel continuity remains unverified. Schematic teaching models and NC third-party models do not fill this gate.

The latest engineering regression at commit 74681f21c74f63d77ad83ccc86922496ce679eec (run 45587799800) passed 14 viewer tests, 11 source/shell tests, 10 release-boundary tests, build and WebGL browser fixture (not real anatomy). Later changes require a new CI result. The expanded named learning targets are lookup queries only, not verified source models.
