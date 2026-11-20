# 03 — Studio catalog (24 studios, confirmed by the owner on 2026-11-20)

Machine-readable source: `shared/studios/catalog.v1.json`; permanent IDs: `shared/studios/frozen-ids.json`. The list is derived from the existing Atlas regions,
the 4D Lab scenarios and the 14 Lab tracks. IDs are permanent once published. Initial `release.status` is `planned` for all;
the column "Start state" is what the availability resolver will return on day one (fail-closed).

| # | ID | Title | Region | Modality | Existing asset/engine it could reuse | Start state | Why |
|---|---|---|---|---|---|---|---|
| 1 | `brain-anatomy` | Brain Anatomy | brain | anatomy3d | Atlas nervous system | blocked | Nervous system withheld by licence quarantine |
| 2 | `brain-ct` | Brain CT | brain | ct | none | planned | No dataset |
| 3 | `brain-mri` | Brain MRI | brain | mri | none | planned | No dataset |
| 4 | `head-neck-anatomy` | Head & Neck Anatomy | headNeck | anatomy3d | Atlas `headNeck` (ossicles withheld) | planned | Adapter not built |
| 5 | `spine-anatomy` | Spine Anatomy | spine | anatomy3d | Atlas `back` | planned | Adapter not built |
| 6 | `spine-mri` | Spine MRI | spine | mri | none | planned | No dataset |
| 7 | `thorax-anatomy` | Thorax Anatomy | thorax | anatomy3d | Atlas `thorax` | planned | Adapter not built |
| 8 | `chest-xray` | Chest X-ray | thorax | xray | none | planned | No dataset |
| 9 | `chest-ct` | Chest CT | thorax | ct | 4D Lab tri-planar on synthetic volume only | planned | No real CT; synthetic must be labelled |
| 10 | `lung-ultrasound` | Lung Ultrasound | thorax | ultrasound | 4D Lab `effusion` scenario | planned | Bridge + review missing |
| 11 | `heart-anatomy` | Heart Anatomy | heart | anatomy3d | Atlas cardiovascular | planned | Adapter not built |
| 12 | `cardiac-echo` | Cardiac Echo | heart | ultrasound | 4D Lab `pericardial`, `hfref` | planned | First clinical acceptance target (Loop 2); 4D Lab has no event bridge yet |
| 13 | `cardiac-ct` | Cardiac CT | heart | ct | CTACardio (local, restricted) | blocked | Restricted dataset, never published |
| 14 | `ecg` | ECG | heart | ecg | `/lab/ekg` schematic module | blocked | Server gate closed pending clinical review |
| 15 | `abdomen-anatomy` | Abdomen Anatomy | abdomen | anatomy3d | Atlas `abdomen` (kidney withheld) | planned | Adapter not built |
| 16 | `abdomen-ct` | Abdomen CT | abdomen | ct | none | planned | No dataset |
| 17 | `abdomen-ultrasound` | Abdomen Ultrasound | abdomen | ultrasound | 4D Lab `ascites`, `gastroparesis` | planned | Bridge + review missing |
| 18 | `fast-ultrasound` | FAST Ultrasound | abdomen | ultrasound | 4D Lab free-fluid layer | planned | Bridge + review missing |
| 19 | `pelvis-anatomy` | Pelvis Anatomy | pelvis | anatomy3d | Atlas `pelvis` (renal pelvis withheld) | planned | Adapter not built |
| 20 | `pelvis-ultrasound` | Pelvis Ultrasound | pelvis | ultrasound | 4D Lab `retention` | planned | Bridge + review missing |
| 21 | `upper-limb-anatomy` | Upper Limb Anatomy | upperLimb | anatomy3d | Atlas `upperLimb` | planned | Adapter not built |
| 22 | `lower-limb-anatomy` | Lower Limb Anatomy | lowerLimb | anatomy3d | Atlas `lowerLimb` | planned | Adapter not built |
| 23 | `msk-xray` | Musculoskeletal X-ray | lowerLimb | xray | none | planned | No dataset |
| 24 | `knee-mri` | Knee MRI | lowerLimb | mri | none | planned | No dataset |
| — | `foundation-fixture` | (internal) Foundation fixture | internal | none | neutral geometric test content | building (admins only) | Technical test app, never shown to students; built in PR-C |

Notes:
- Atlas and 4D Lab themselves are **not** catalog entries and are not reclassified (spec 1.8).
- Reusing an Atlas or 4D asset inside a studio inherits that product's licence status (`blocked` + owner override, rights unverified).
