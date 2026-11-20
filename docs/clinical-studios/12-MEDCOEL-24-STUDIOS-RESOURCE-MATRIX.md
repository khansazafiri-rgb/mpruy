# MEDCOEL-24-STUDIOS-RESOURCE-MATRIX

Date: 2026-11-20. Scope: resource research, acquisition and integration for all 24 Clinical Studios.
Rules applied: official sources only; licence read from the actual file or the publisher's machine-readable record;
small subsets only (largest single acquisition: one LIDC series, 34 MB raw); raw data and converted outputs stay in
`local-data/` (gitignored, never committed, never on the VPS). **No resource below has a verified rights, privacy or medical
review**: every acquired asset is registered in `licensing/resources.v1.json` and the rights ledger as `needs-review`, and the
B1 inspector refuses every studio (blockers listed by `node licensing/tools/inspect-studio-resources.mjs <id> <build>`).

Legend. *Verified here* = the licence/metadata were read in this session from the official URL shown.
*Not verified* = named as a lead only; no claim about its licence or content is made.

## A. Acquired and integrated (private review only)

| Studio | Dataset (official source) | Version / DOI | Licence (evidence) | Subset & format | Main asset (bytes, sha256…) | Validation done | Blockers |
|---|---|---|---|---|---|---|---|
| `brain-mri` | SRI24 atlas, NITRC `sri24_*_nifti.zip` | 2012 release; paper doi:10.1002/hbm.20906 | CC BY-SA 3.0 Unported (`LICENSE` inside the archive, sha256 35b6ea8b…) | T1 (spgr), LPBA40 labels, tissue map → NIfTI gz + JSON | `t1.nii.gz` 2,114,240 B, ff5f8d71… | grid/affine identical for all overlays; laterality 54/54; tissue contrast CSF<GM<WM | **LPBA40-derived labels BLOCKED**: LONI licence = non-commercial research only (doc 16 §2); AAL not used; medical + terminology review |
| `ecg` | PTB-XL, PhysioNet | 1.0.3, doi:10.13026/kfzx-aw45 | CC BY 4.0 (`LICENSE.txt` = official SHA256SUMS entry 9a78e7f2…) | 6 validated records, 500 Hz, 12 leads → JSON (ADC + gain + baseline + fs) | `cases/c1.json` 224,453 B, 25dad9bb… | all files = official SHA256SUMS; per-lead WFDB checksums; HR plausibility | case-key clinical review; privacy sign-off (patient metadata removed) |
| `chest-ct` | LIDC-IDRI, TCIA (NBIA API) | doi:10.7937/K9/TCIA.2015.LO9QL9SX | CC BY 3.0 (license per series from the NBIA API; collection page) | 1 CT series (133 slices) + 4 DICOM SEG → NIfTI HU + reader bitmask | `ct.nii.gz` 34,078,081 B, 05738486… | transfer syntax, identical IOP/spacing, even slice spacing, HU rescale, SEG frames matched to slices, orientation | burned-in text check; clinical review of challenge points; non-consensus annotations by design |
| `spine-mri` | SPIDER lumbar spine, Zenodo | record 10159290, doi:10.5281/zenodo.10159290; paper doi:10.1038/s41597-024-03090-w | CC BY 4.0 (Zenodo record metadata) | 1 case (`1_t2`) + mask, members fetched by HTTP Range (ZIP CRC verified) → NIfTI | `t1.nii.gz` 5,930,802 B, cdd2971c… | mask on identical grid; vertebra/disc labels verified caudal→cranial; level names NOT invented | medical review; display palette tuning |
| `brain-anatomy` | BodyParts3D 4.0, DBCLS `isa_BP3D_4.0_obj_99.zip` | 4.0 | **Discrepancy**: OBJ headers CC BY-SA 2.1 JP vs DBCLS site CC BY 4.0 | 63 FMA concepts → GLB (opaque node ids) + table | `model.glb` 10,049,352 B, dda21bbc… | archive/table digests; laterality 50/50 | licence discrepancy (SA 2.1 JP not on allow-list); catalog licence blocker; anatomy review |
| `head-neck-anatomy` | BodyParts3D 4.0 | 4.0 | as above | 52 concepts → GLB | 11,395,272 B, 1a55b924… | laterality 35/35 paired | as above |
| `spine-anatomy` | BodyParts3D 4.0 | 4.0 | as above | 42 concepts → GLB | 3,357,732 B, c68a29aa… | (midline set) | as above |
| `thorax-anatomy` | BodyParts3D 4.0 | 4.0 | as above | 30 concepts → GLB | 6,157,660 B, be9df3de… | laterality 24/24 | as above |
| `heart-anatomy` | BodyParts3D 4.0 | 4.0 | as above | 33 concepts (chamber walls/cavities, papillary muscles, valves, great vessels, coronaries) → GLB | 2,240,452 B, e58cf968… | pair order + side checks (chamber/cusp names treated as local naming) | as above |
| `abdomen-anatomy` | BodyParts3D 4.0 | 4.0 | as above | 18 concepts → GLB (kidney excluded) | 8,188,804 B, 4b1b2e8e… | laterality 0 errors | as above; kidney pending quarantine decision |
| `pelvis-anatomy` | BodyParts3D 4.0 | 4.0 | as above | 26 concepts → GLB (male model only) | 1,385,620 B, cc69c135… | laterality 22/22 | as above; **no female pelvic organs exist in this source** |
| `upper-limb-anatomy` | BodyParts3D 4.0 | 4.0 | as above | 52 concepts → GLB | 5,667,636 B, f6efe2ac… | laterality 52/52 | as above |
| `lower-limb-anatomy` | BodyParts3D 4.0 | 4.0 | as above | 50 concepts → GLB | 7,092,340 B, e90f8f9a… | laterality 50/50 | as above |
| `chest-xray` | PTX-498 v2-fix, Zenodo `PTX-498-v2-fix.zip` (Range members) | doi:10.5281/zenodo.8266529; paper doi:10.1016/j.neucom.2021.05.029 | CC BY 4.0 (Zenodo record metadata, sha256 12a052d2…) | 4 radiographs (sites A, A, B, C) + pixel masks → PNG (no metadata chunks) + polygons | `image-1.png` 813,050 B | ZIP CRC per member; polygon covers ≥ 99.7 % of each mask | all cases pneumothorax-positive (no normals); no laterality (PNG has no orientation tag); burned-in "R"/corner markers for privacy reviewer |
| `pelvis-ultrasound` | HC18, Zenodo `training_set.zip` (Range members) + pixel-size CSV | doi:10.5281/zenodo.1327317; paper doi:10.1371/journal.pone.0200412 | CC BY 4.0 (Zenodo record metadata, sha256 4470f466…) | 4 fetal-head US images + head contours → PNG + polygons, mm calibration | `image-1.png` 133,843 B | filled contour area matches the reference head circumference (e.g. 33,111 px² vs ≈32,700 expected) | **obstetric only** (no gynaecological pelvis): scope decision for the owner/educators |
| `abdomen-ct` | AMOS 2022, Zenodo `amos22.zip` (24 GB ZIP64, Range members) | doi:10.5281/zenodo.7262581; arXiv:2206.08023 | **Discrepancy**: Zenodo record CC BY 4.0 vs archive `dataset.json` CC-BY-SA 4.0 → REVIEW_REQUIRED | 1 contrast CT (amos_0004, 512×512×78) + 13 organ labels → NIfTI (header text cleared) | `ct.nii.gz` 16,759,352 B | RAS laterality (spleen/left adrenal at −X; cross-checked on 8 cases), HU plausibility, identical grid | kidney labels withheld pending owner decision; licence clarification (doc 16 §3) |

## B. Researched, not acquired yet (studio runs on a labelled technical fixture)

Acquired in this pass and moved to section A: AMOS (abdomen-ct), PTX-498 (chest-xray), HC18 (pelvis-ultrasound).
Further candidates kept for later: TotalSegmentator-style CT set (Zenodo 10.5281/zenodo.22688904, abdomen-ct), VinDr WhatsApp
CXR (10.5281/zenodo.12727012), FETAL_PLANES_DB (10.5281/zenodo.3904280).

| Studio | Candidates (verified here unless marked) | Licence evidence | Why not acquired now / decision needed |
|---|---|---|---|
| `brain-ct` | none suitable found in this pass; "CT Dataset of a Human Head" (Zenodo 10.5281/zenodo.3374839, cc-by-4.0) is a **phantom**, not clinical | Zenodo metadata | needs a non-contrast clinical head CT with commercial rights; CTA must not substitute |
| `cardiac-ct` | CTACardio (local, restricted) | restricted | stays **BLOCKED**; no commercially usable cardiac CT found in this pass |
| `knee-mri` | none verified in this pass (fastMRI, MRNet, OAI are known research-use datasets: *not verified*, typically non-commercial terms) | – | needs a CC0/CC BY knee MRI with annotations |
| `msk-xray` | FracAtlas (*not verified here*, figshare); several Zenodo fracture items are papers/code, not datasets | – | needs a verified radiograph set with fracture annotations |
| `lung-ultrasound` | none verified (POCUS/COVID-US collections: *not verified*) | – | many US datasets carry NC or unclear terms |
| `abdomen-ultrasound` | none verified | – | as above |
| `fast-ultrasound` | none verified | – | FAST-specific open datasets not found |
| `cardiac-echo` | none commercially usable verified; EchoNet (restricted, excluded by policy) | – | the 4D Lab simulator could teach views but is not a real echo source |
| `ecg` (already acquired) | – | – | – |

## C. Rejected or excluded

| Resource | Reason |
|---|---|
| CHAOS (Zenodo 10.5281/zenodo.3431873) | CC BY-NC-SA 4.0 (non-commercial) |
| HaN-Seg (10.5281/zenodo.7442914) | CC BY-NC-ND 4.0 |
| Regensburg Pediatric Appendicitis US (10.5281/zenodo.7711412) | CC BY-NC 4.0 |
| "Chest X-ray viral/bacterial" (10.5281/zenodo.10084748) | CC BY-NC 1.0 |
| CTACardio, EchoNet, IT'IS ViP, TotalSegmentator weights | restricted by policy (CLAUDE.md) |
| Legacy Atlas `nervous.glb`, kidney, renal pelvis, ossicles | quarantined; never used as inputs |

## D. Reproduce

```bash
node apps/studios/tools/prepare-brain-mri.mjs       # needs local-data/studio-resources/raw/sri24 (official zips)
node apps/studios/tools/prepare-ecg.mjs             # raw/ptbxl (official files + SHA256SUMS)
node apps/studios/tools/prepare-chest-ct.mjs        # raw/lidc (NBIA series)
node apps/studios/tools/prepare-spine-mri.mjs       # raw/spider (Range-extracted members)
node apps/studios/tools/prepare-bp3d-region.mjs <studio-id>   # local-data/licensing-quarantine/bp3d-4.0
node apps/studios/tools/prepare-image2d.mjs chest-xray|pelvis-ultrasound   # raw/ptx498, raw/hc18 (zip-range.mjs members)
node apps/studios/tools/prepare-abdomen-ct.mjs      # raw/amos (zip-range.mjs members of the ZIP64 archive)
MEDCOEL_PROCESSING_COMMIT=<sha> node licensing/tools/register-studio-resources.mjs  # parents + derived assets, needs-review records
npm run studios:reproduce                           # re-hash 26 raw inputs, re-run all tools, compare 35 outputs byte-for-byte
node apps/studios/scripts/build-all.mjs --private   # private-review builds (never published)
```

## E. Provenance model (registry `licensing/resources.v1.json`)

- **Parent assets (46)**: every official raw input actually used (3 SRI24 zips; PTB-XL database CSV + 6×(.hea,.dat); LIDC CT zip +
  4 SEG zips; 2 SPIDER ZIP members; BodyParts3D 4.0 OBJ archive + 2 tables; 8 PTX-498 members; HC18 CSV + 8 members; AMOS
  dataset.json + CT + labels). Each has `sourceFile {url, member, sha256}`, a
  logical `source/<sourceId>/…` path (never shipped, `protected: true`) and points to a `studio-src-<source>` rights record.
- **Derived assets (54)**: the converted files shipped inside private builds. `dependsOn` lists the exact parents with their
  sha256; `derivation.tool` = `<tool path>@sha256:<tool file digest>`; `derivation.pipelineCommit` = the commit whose tools
  reproduced every byte (`1fbf1d68cbc950300ab58efe40ef80d490694ca7`); `parametersSha256` binds studio, tool and inputs.
- Rights records: `studio-src-*` (8, one per source) and `studio-res-*` (16 per studio + 1 BLOCKED LPBA40 record).
  24 are `needs-review`, 1 `blocked`; nothing is verified.
- Reproducibility (2026-11-20, local): parents 46/46 matched, derived 54/54 byte-identical, 0 stale tool digests
  (`local-data/studio-resources/evidence/reproducibility.json`).
