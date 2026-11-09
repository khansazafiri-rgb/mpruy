# Atlas integration audit — MEDCOEL Anatomy Atlas → Anatomy Live 4D Lab

_Audited 2026-11-08 on top of the PR #133 merge commit `6c4f696` (integration branch `claude/focused-wozniak-1ayrxa`).
Every number below was produced by code in this repository and can be re-run:
`node tools/atlas-node.mjs` (reader), `npm run atlas:dataset` (build + measurements), `npm test` (12 atlas tests)._

## 1. What MEDCOEL already owns

`apps/anatomy/public/models/` holds seven Draco-compressed GLBs exported from the Z-Anatomy Blender file
(BodyParts3D-derived). Structures are nodes carrying `extras.za_name`; a mesh belongs to its closest `za_name`
ancestor (the rule used by `apps/anatomy/src/viewer/loadModel.js`). The catalog `public/data/atlas-catalog.json`
gives each of the 2,827 structures a source file, bounding box, group (13 groups) and regions.

| File | Size | Structures (nested) | Triangles | Vertices | Materials | Used by the 4D Lab |
|---|---|---|---|---|---|---|
| `skeletal.glb` | 1.86 MB | 277 (8) | 701,905 | 374,360 | 7 | **default** – all kept (ribs/sternum/spine/pelvis frame the exam) |
| `visceral.glb` | 1.84 MB | 118 (37) | 703,447 | 356,035 | 14 | **default** – all kept; omenta, pleura, liver segments, bronchi, ducts start hidden |
| `cardiovascular.glb` | 5.61 MB | 676 (616) | 3,843,734 | 1,945,359 | 7 | **default** – heart group + great vessels kept; peripheral vessels discarded after decode |
| `lymphatic.glb` | 0.42 MB | 158 (4) | 126,338 | 64,477 | 3 | **default** – spleen and thymus kept |
| `muscular.glb` | 4.50 MB | 669 (10) | 2,308,283 | 1,352,822 | 9 | on demand – trunk regions only (incl. diaphragm) |
| `nervous.glb` | 3.80 MB | 580 (188) | 2,391,004 | 1,244,529 | 21 | on demand – trunk regions only |
| `joints.glb` | 0.92 MB | 349 (5) | 324,819 | 170,633 | 4 | on demand – trunk regions only |
| **Total** | **18.95 MB** | **2,827** | **10.40 M** | **5.51 M** | 65 | default set keeps **1.79 M triangles / 0.93 M vertices** |

Structures useful for the 4D Lab, all present: four cardiac chambers, valve leaflets, papillary muscles, coronary
tree, aorta (ascending/arch/thoracic/abdominal), venae cavae, pulmonary trunk/arteries/veins, five lung lobes,
trachea and bronchial tree, pleura, liver (+8 Couinaud segments), gallbladder, pancreas, stomach, oesophagus,
duodenum, jejunum, colon segments, appendix, kidneys, renal pelvis, ureters, bladder, spleen, adrenals, prostate,
ribs 1–12, costal cartilages, sternum (manubrium, body, xiphoid), vertebrae C3–L5, sacrum, hip bones, discs,
diaphragm and all trunk muscles.

**Missing from the atlas** (verified by name search in the catalog): skin and subcutaneous fat (no external
surface at all), ileum, caecum, rectum/anal canal, peritoneal cavity, pericardium, breast. Chamber blood volumes
are not modelled as separate solids (see §4).

## 2. Units, axes and coordinate frames (verified from the geometry)

| Frame | Units | Axes | Origin | Evidence |
|---|---|---|---|---|
| Atlas (glTF) | metres | +X patient **left**, +Y **superior**, +Z **anterior** | floor between the feet, mid-sagittal | `Kidney.l` x = +0.062, `Kidney.r` −0.059; testes/glans z = +0.056/+0.094, pineal −0.023; vertex y = 1.705 m, soles ≈ 0 |
| Patient / phantom (LPS) | mm | +x left, +y posterior, +z superior | atlas dataset: z = 0 at the **xiphoid tip** (Y0 = 1.2209 m) | `test/atlas-integration.test.mjs` "atlas frame" |
| CT physical | mm via NRRD affine | voxel (i,j,k) → LPS | `space origin` | 211 × 128 × 323 voxels, 2.5 mm isotropic |
| Probe | mm, LPS | contact point + u (image width), b (beam), e (elevation) | contact | `src/core/probe.js` |
| World (three.js) | mm | x = superior, y = anterior, z = left | patient group | one matrix `LPS_TO_SCENE` (`src/app/scene3d.js`) |

Atlas → LPS is a proper rigid map with a unit change and one translation (no fitting):

```
atlasToLPS = [[1000, 0,     0,  0         ],
              [0,    0, -1000,  0         ],
              [0, 1000,     0, -1000·Y0   ],
              [0,    0,     0,  1         ]]     det(R) = +1 → left/right preserved
```

The phantom's existing `glbToLPS` uses the same axis permutation, so the atlas and the 4D Lab already agreed on
orientation; only the origin differs. The model is a 1.705 m male in anatomical position (arms adducted, palms
forward). The phantom is a different, procedural body.

## 3. Licences and redistribution

> **Licence quarantine (2026-11-09).** Superseded licence statements below are kept for history but no longer describe the build. Current status: `../../licensing/PROVENANCE_REPORT.md` and `../../licensing/quarantine-policy.json`. The atlas-derived dataset is rebuilt from cleared inputs only and is **CC BY-SA 4.0**; `nervous.glb`, the CC BY-NC kidney (+ renal pelvis) and the ossicles are withheld and shown as unavailable.

Read (2026-11-08) from `apps/anatomy/LICENSE`, `NOTICE` and `public/models/License.txt`:

| Component | Licence | Commercial use |
|---|---|---|
| BodyParts3D base geometry | CC BY-SA 2.1 JP | allowed with attribution + share-alike |
| Z-Anatomy derivative/organisation | CC BY-SA 4.0 | allowed with attribution + share-alike |
| Cranial nerves & foramina (Dundee CAHID), in `nervous.glb` | CC BY 4.0 | allowed |
| Inner ear (Dundee), in `nervous.glb` | **CC BY-NC-SA 4.0** | **not allowed** |
| Kidney (lissiecowley), in `visceral.glb` | **CC BY-NC 4.0** | **not allowed** |
| "Brainder", "White matter" (U. Washington) | not stated | unknown – do not rely on |
| Definitions text (Wikipedia) | CC BY-SA 3.0 / GFDL | not used by the 4D Lab |

Conclusion: reuse inside MEDCOEL's non-commercial educational deployment is permitted with the attribution strings
and under CC BY-NC-SA 4.0 for derivatives. The 4D Lab **does not copy** the GLBs: it loads them from the atlas URL.
The atlas-derived CT, labels, skin shell and fitted parameters in `public/data/atlas/` **are derivatives** (they are
voxelised from the meshes, including the NC-licensed kidney), so they carry CC BY-NC-SA 4.0 and the attributions;
see `ASSET_LICENSE_REGISTRY.md`. Commercial operation would require replacing the kidney (and not loading the
inner-ear structures, which the lab does not load by default) and re-running the pipeline.

## 4. Mesh quality findings that shaped the implementation

| Finding (measured) | Consequence |
|---|---|
| Many meshes are not closed (e.g. liver 438 boundary edges / 3 components, RV 334, lung lobes 544–570) | Parity voxelisation alone streaks; the pipeline caps boundary loops (`capHoles`) and uses band-and-fill, falling back to 3-axis parity voting |
| **All four cardiac chambers are wall shells** (endocardial + epicardial surface) with open valve/vessel orifices; LV wall solid: outer 174 mL, inner −98 mL | Walls by parity restricted to a thickness band (LV 13, RV 5, atria 4 mm); blood pools by flood-filling the closed heart envelope with the great-vessel lumens as plugs. Result: LV 77, RV 92, LA 67, RA 93 mL |
| The bladder is also a wall shell (rim of "bladder" around fat) | Lumen filled explicitly; wall gets its own label (43). The atlas bladder is nearly empty (32 mL) |
| Stomach is a closed solid (502 mL) | Wall 4.5 mm + content; gas only in the fundus (assumption, labelled) so the antrum is fluid-filled as in antral US protocols |
| Arms are adducted and rest on the lateral chest wall down to the costal margin | Arms and trunk get separate envelopes; mid-axillary sites are placed just below the arm; abduction is impossible without a rig |
| Anterior lung margins and lingula cover most of the heart | Windows are found by an acoustic-window search; the **apical window stays partly obstructed** (49 obstructed samples) and the HFrEF scenario uses the clearest cardiac window (subxiphoid) |
| No meshes are rigged or carry morph targets | Motion is applied per vertex on the CPU with the existing procedural field (§6) |

## 5. Why not simply overlay the atlas on the existing phantom CT

The procedural phantom and the atlas are different bodies. The atlas build measures this: centroids of eight
matching structures (LV cavity, both lungs, liver, spleen, kidneys, stomach, bladder) after the **best rigid fit**
still differ by **RMS 37.5 mm, max 61.1 mm** (bladder 61, kidneys 48, left lung 37 mm). That is 15–25 CT voxels,
so an overlay would show the atlas heart where the CT shows lung or liver. The atlas is therefore never drawn on the
phantom dataset, and the UI says so (Anatomi tab → "Sistem koordinat & registrasi").

No acquired CT that is authorised for this use is available (CTACardio was not uploaded; see the licence registry),
so atlas ↔ real-CT registration cannot be validated and is not attempted.

## 6. The chosen solution

1. **Atlas-derived synthetic dataset** (`pipeline/atlas/build_atlas_dataset.mjs` → `public/data/atlas/`): the CT and
   tissue labels are voxelised **from the atlas meshes in the exact frame above**, so atlas anatomy and imaging agree
   by construction. Checked by test: ≥ 90 % of the vertices of liver, spleen, kidneys, stomach, bladder, LV and lung
   lobes touch their own label within 3 mm. This is a synthetic image of a generalised atlas body, not an acquired
   image, and is labelled as such everywhere ("CT SINTETIS dari Atlas MEDCOEL").
2. **Illustrative skin shell** (option 3 of the brief, but derived rather than landmark-aligned): the closed atlas
   musculoskeletal envelope + 8 mm (trunk/head/legs) or 5 mm (arms) of assumed fat and skin. Closed surface
   (0 boundary edges; 30 non-manifold edges from surface-net ambiguities, harmless for picking), 206,580 triangles, 99.6 % of tested vertices sit on the CT body boundary (air outside, tissue
   inside at ±5 mm). No licensed skin mesh compatible with the atlas exists in the repository (option 1) and no
   authorised imaging of this body exists (option 2).
3. **Shared atlas layer at runtime** (`src/app/atlasLayer.js`): the lab loads `/anatomy/viewer/models/*.glb`,
   `/anatomy/viewer/draco/` and `/anatomy/viewer/data/atlas-catalog.json` — the same files and browser cache as the
   Atlas viewer. Structure identity, nesting rule and catalog groups follow the atlas. Meshes outside the
   workstation subset are disposed right after decoding.
4. **Physiology fitted to the atlas** (`anatomy.json`): LV long axis/cavity/wall from the voxelised chambers, RV/LA/RA
   ellipsoids, diaphragm height map from the lung bases (right dome z = 40 mm, left 22.5 mm), stomach centre-line by a
   geodesic through the stomach, rib-measured intercostal spaces for auscultation sites, and standard windows found
   by the acoustic-window search with heel-toe/rock solved to aim the beam (aim error ≤ 0.2°).

## 7. Performance on the target class of device

Measured in this container (Chromium headless, SwiftShader software WebGL, x86-64); **not** measured on an 8 GB
Apple Silicon Mac with Safari:

| Item | Value |
|---|---|
| Atlas download for the default set | 9.7 MB (visceral 1.84 + cardiovascular 5.61 + skeletal 1.86 + lymphatic 0.42), shared with and cached by the Atlas viewer |
| Atlas-derived dataset download | CT 2.9 MB + labels 0.39 MB + skin 3.8 MB + json 0.05 MB |
| Decode + bake time (this container) | visceral ≈ 2.3–2.7 s, cardiovascular ≈ 0.9 s, skeletal ≈ 0.2–0.3 s, lymphatic < 0.1 s; page ready ≈ 1.1 s, atlas ready ≈ 4.6–5.1 s |
| GPU geometry kept | 1.79 M triangles, 0.93 M vertices (≈ 40 MB of vertex/index buffers) |
| Animated atlas vertices per update | ≈ 100 k; 50–60 ms per update under SwiftShader, scheduled adaptively (≥ 3× its own cost) so the UI stays responsive |
| JS heap after the full atlas session | ≈ 73 MiB |

On Apple Silicon the CPU part (deformation) is expected to be several times faster and WebGL is hardware
accelerated, but this is an expectation, not a measurement. The manual Safari checklist in `TEST_RESULTS.md` remains
open.

## 8. Remaining gaps

- Human anatomical review of the derived CT/labels and the shell (owner / clinician).
- Safari on an 8 GB Apple Silicon Mac: not available to this session.
- Abducted-arm pose and a validated skin surface would need a rigged, licensed body model.
- Ileum, caecum and rectum are absent from the atlas; the lower abdomen therefore contains unlabelled soft tissue.
- The atlas lungs cover the apex: the apical 4-chamber window is partly obstructed in this body.
