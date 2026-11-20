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
| `brain-mri` | SRI24 atlas, NITRC `sri24_*_nifti.zip` | 2012 release; paper doi:10.1002/hbm.20906 | CC BY-SA 3.0 Unported (`LICENSE` inside the archive, sha256 35b6ea8b…) | T1 (spgr), LPBA40 labels, tissue map → NIfTI gz + JSON | `t1.nii.gz` 2,114,240 B, ff5f8d71… | grid/affine identical for all overlays; laterality 54/54; tissue contrast CSF<GM<WM | LPBA40/AAL label provenance (third-party atlases); medical + terminology review |
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

## B. Researched, not acquired yet (studio runs on a labelled technical fixture)

| Studio | Candidates (verified here unless marked) | Licence evidence | Why not acquired now / decision needed |
|---|---|---|---|
| `abdomen-ct` | AMOS (Zenodo 10.5281/zenodo.7262581); TotalSegmentator-style 117-structure CT set (Zenodo 10.5281/zenodo.22688904) | cc-by-4.0 in Zenodo metadata (both) | archives are multi-GB; single-case Range extraction (as done for SPIDER) is the next step; CHAOS rejected (CC BY-NC-SA) |
| `brain-ct` | none suitable found in this pass; "CT Dataset of a Human Head" (Zenodo 10.5281/zenodo.3374839, cc-by-4.0) is a **phantom**, not clinical | Zenodo metadata | needs a non-contrast clinical head CT with commercial rights; CTA must not substitute |
| `cardiac-ct` | CTACardio (local, restricted) | restricted | stays **BLOCKED**; no commercially usable cardiac CT found in this pass |
| `knee-mri` | none verified in this pass (fastMRI, MRNet, OAI are known research-use datasets: *not verified*, typically non-commercial terms) | – | needs a CC0/CC BY knee MRI with annotations |
| `chest-xray` | PTX-498 pneumothorax segmentation (Zenodo 10.5281/zenodo.8266529); VinDr WhatsApp CXR (10.5281/zenodo.12727012) | cc-by-4.0 in Zenodo metadata | 957 MB single archive: Range extraction of a few images + masks is feasible next; upstream source provenance of each must be reviewed |
| `msk-xray` | FracAtlas (*not verified here*, figshare); several Zenodo fracture items are papers/code, not datasets | – | needs a verified radiograph set with fracture annotations |
| `lung-ultrasound` | none verified (POCUS/COVID-US collections: *not verified*) | – | many US datasets carry NC or unclear terms |
| `abdomen-ultrasound` | none verified | – | as above |
| `fast-ultrasound` | none verified | – | FAST-specific open datasets not found |
| `pelvis-ultrasound` | FETAL_PLANES_DB (Zenodo 10.5281/zenodo.3904280); HC18 fetal head circumference (10.5281/zenodo.1327317) | cc-by-4.0 in Zenodo metadata | obstetric (not gynaecological) pelvis; 2 GB archive: Range subset next; clinical scope decision needed |
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
node licensing/tools/register-studio-resources.mjs  # writes needs-review records from local provenance
node apps/studios/scripts/build-all.mjs --private   # private-review builds (never published)
```
