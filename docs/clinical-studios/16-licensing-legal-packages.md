# Licensing & legal packages — Clinical Studios (2026-11-20)

**Nothing in this document is a legal opinion or an approval.** It collects the retained evidence and drafts the questions the
owner (or counsel) may send to rights holders. No email was sent; no licence status was raised. Evidence files live in
`local-data/studio-resources/evidence/` (private, gitignored); their SHA-256 are listed so they can be re-verified.

## 1. BodyParts3D 4.0 (9 anatomy studios) — CC BY 4.0 vs CC BY-SA 2.1 JP

| Evidence | Retained file | SHA-256 |
|---|---|---|
| DBCLS licence page, "Last updated 2025/02/27": *"The license for this database is specified in the Creative Commons Attribution 4.0 International"*; required credit "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International" | `dbcls-lic.html` | `623223ee10c8b805…` |
| DBCLS update history: 2013/06/19 "3D data (Release 4.0) is updated"; 2011/08/25 "License is updated"; 2025/02/27 "License is updated" | `dbcls-update.html` | `22a942a189e864e3…` |
| Database description: "License CC BY" | `dbcls-desc.html` | `8c6802f31c0e795e…` |
| Download page (isa_BP3D_4.0_obj_99.zip, 136 MB) | `dbcls-download.html` | `0538d5c300aea49c…` |
| OBJ headers inside the 2013 archive: CC BY-SA 2.1 Japan | archive `isa_BP3D_4.0_obj_99.zip` | `40665852c49f2183…` |

**Analysis (for counsel).** The 4.0 files were published in 2013 under the licence then in force (BY-SA 2.1 JP, matching
the embedded headers). In 2025 the publisher re-issued the database licence as CC BY 4.0 for "this database" without
re-publishing the files. A licensor may offer an additional, more permissive licence for the same work; the open point is
whether the 2025 statement covers the unchanged 2013 Release 4.0 files despite their embedded notice. Written confirmation
from DBCLS settles it. Until then the registry keeps `licenseId: CC-BY-SA-2.1-JP`, status `REVIEW_REQUIRED`, and the B1
inspector refuses all nine studios (SA 2.1 JP is not on the allow-list).

**Draft email to DBCLS** (the "Contact us" link on the DBCLS licence page points to the JST/NBDC form https://form2.jst.go.jp/s/contact_nbdc):

> Subject: Licence of BodyParts3D Release 4.0 OBJ files (isa_BP3D_4.0_obj_99.zip)
>
> Dear BodyParts3D / DBCLS team,
>
> We are preparing an educational anatomy application that would include 3D meshes derived from BodyParts3D Release 4.0
> (isa_BP3D_4.0_obj_99.zip, SHA-256 40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e). Your licence page
> (updated 2025-02-27) states that the database is licensed under CC BY 4.0, while the OBJ file headers in the 2013 archive
> state CC BY-SA 2.1 Japan.
>
> Could you please confirm whether the Release 4.0 OBJ files, as currently distributed, may be used, adapted (converted to
> glTF, combined per body region) and redistributed — including in a paid educational service — under CC BY 4.0 with the
> attribution "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International"?
>
> Thank you very much. [Name, role, organisation, contact]

## 2. SRI24 / LPBA40 / AAL (brain-mri)

| Evidence | Retained | SHA-256 |
|---|---|---|
| SRI24 archive `LICENSE`: "The SRI24 atlas is licensed under … CC BY-SA 3.0 Unported" | inside `sri24_*_nifti.zip` | `35b6ea8bfe7c3d06…` |
| LONI licence agreement: *"Permission is granted to use atlases without charge for non-commercial research purposes only."*; atlases "for research purposes only and have not been approved for clinical use" | `loni-licenseagreement.html` | `3c72d2f8557e44ef…` |
| LONI atlas pages (LPBA40 description; download requires agreeing to the licence) | `loni-atlases.html`, `loni-atlas_downloads.html` | `27f3677938ca3c77…`, `f4be3b26e8d5b808…` |
| LONI terms of use | `loni-termsofuse.html` | `0189b2f2ff0db6e8…` |

**Outcome recorded.** The SRI24 T1 template and tissue map are SRI's own work (CC BY-SA 3.0, needs-review). The
**LPBA40-derived label map** (`data/labels-lpba40.nii.gz`, `data/labels.json`) is recorded as **BLOCKED**
(`studio-res-brain-mri-lpba40`, `sourceCommercialUse: false`): the SRI24 authors redistribute LPBA40-derived labels, but the
upstream LONI licence limits LPBA40 to non-commercial research, and the SRI24 archive cannot widen that. The **AAL-derived**
`tzo116plus` labels are not used or shipped by any studio. Options for the owner: (a) ask LONI for written permission;
(b) ship brain-mri without LPBA40 labels (T1 + tissue classes only, Guided/Challenge reduced to tissue items);
(c) replace labels with an openly licensed parcellation after a separate review.

**Draft email to LONI (USC Mark and Mary Stevens Neuroimaging and Informatics Institute):**

> Subject: Permission request — LPBA40-derived labels in an educational application
>
> Dear LONI team,
>
> The SRI24 atlas (Rohlfing et al., 2010) redistributes a label map derived from the LONI Probabilistic Brain Atlas
> (LPBA40) under CC BY-SA 3.0. Your licence agreement permits atlas use for non-commercial research only.
> We would like to display these LPBA40-derived region labels (56 structures, unchanged names) in a paid medical-education
> web application (no clinical use, no diagnosis). Could you tell us whether this use can be permitted, and under which
> conditions and attribution? [Name, role, organisation, contact]

**Optional email to the SRI24 authors** (via NITRC project page) asking how they cleared LPBA40/AAL redistribution.

## 3. AMOS 2022 (abdomen-ct) — CC BY 4.0 vs CC BY-SA 4.0

| Evidence | Retained | SHA-256 |
|---|---|---|
| Zenodo record 7262581 metadata: `license: cc-by-4.0` | `zenodo-7262581.json` | `9da3ec6b8efb21ea…` |
| `amos22/dataset.json` inside the archive: `"licence": "CC-BY-SA 4.0"` | raw member | `02db984f724dba8d…` |

Recorded as `REVIEW_REQUIRED` with the stricter CC BY-SA 4.0 (both are on the allow-list; SA means MEDCOEL's adapted data
must stay CC BY-SA). **Draft email to the AMOS authors** (corresponding author per arXiv:2206.08023):

> Subject: AMOS 2022 licence clarification (Zenodo 7262581)
>
> The Zenodo record lists CC BY 4.0, while amos22/dataset.json states CC-BY-SA 4.0. Which licence applies to the
> labelled training cases? We plan to show one CT case with its organ labels in an educational application and would
> share our adapted files under the applicable licence with attribution. [Name, organisation, contact]

## 4. PTB-XL, LIDC-IDRI, SPIDER, PTX-498, HC18 — obligations (no discrepancy found)

| Source | Licence evidence | Obligations to honour |
|---|---|---|
| PTB-XL 1.0.3 | `LICENSE.txt` = official SHA256SUMS entry (CC BY 4.0) | cite dataset + paper; no attempt at re-identification; PhysioNet terms |
| LIDC-IDRI (TCIA) | CC BY 3.0 per series (NBIA API) | TCIA data-usage policy & citation; annotations are non-consensus by design |
| SPIDER (Zenodo 10159290) | cc-by-4.0 in record metadata | cite paper (Sci Data 2024) and data DOI |
| PTX-498 (Zenodo 8266529) | cc-by-4.0 in record metadata | cite Neurocomputing 2021 paper; publisher states images anonymised |
| HC18 (Zenodo 1327317) | cc-by-4.0 in record metadata | cite PLoS ONE 2018 paper; obstetric scope |

All are still `needs-review` (a human must sign rights, privacy and medical review on the exact bytes).

## 5. Legacy Atlas / 4D Lab risk review (status unchanged)

Read-only summary of `licensing/commercial-rights-evidence.json` (14 legacy records; none was modified):
- **Highest risk:** `atlas-code` is **blocked** — the forked viewer code is CC BY-NC-SA 4.0; removing NC meshes does not
  relicense code. Commercial use needs the upstream author's permission or a clean-room replacement.
- **Model records** (skeletal, muscular, joints, cardiovascular, lymphatic, visceral): needs-review; they inherit the same
  BodyParts3D BY-SA 2.1 JP question as §1 plus per-mesh contributor provenance; kidney stays excluded; `nervous.glb` stays
  quarantined.
- **Derived/other:** previews, definitions (CC BY-SA 3.0 + GFDL question), other data, synthetic CT, lab code ownership,
  dependency SBOM and promotional media — all needs-review.
A favourable DBCLS answer (§1) would help both the studios and the legacy model records; it would not resolve `atlas-code`.
