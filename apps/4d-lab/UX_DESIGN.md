# MEDCOEL 4D Lab — UX, anatomy intelligence and clinical education upgrade

Status: implemented on branch `claude/vigilant-cerf-jjc6fj-ux` (stacked on the licence-quarantine PR), including the owner's usability round.
Not deployed. Educational simulator only — not a medical device.

## 1. Interaction: direct control in patient directions (usability round)

The first version made learners choose a mode before every movement. The owner found that harder, so it was
replaced. Now:

- **The three rotation rings** remain an opt-in advanced tool under "Sudut presisi & cincin 3D (lanjutan)".
- **Direction pad** (bottom-right of the 3D view). Buttons repeat while held, and hovering a button shows that
  patient axis as a coloured arrow in 3D.
  - Buttons: ↑ Superior, ↓ Inferior, ← Kanan pasien, → Kiri pasien, ⤒ Anterior, ⤓ Posterior.
  - Step size (1–25 mm), current position, standard-window and probe selectors.
- **The same pad drives whatever is active:**

| Target | Pad title | Superior / Inferior / Left / Right | Anterior / Posterior | Rotation rows |
|---|---|---|---|---|
| Clinical probe | Gerakkan probe | slides along the skin (≤ 2.5 mm sub-steps; refuses jumps and points outside CT coverage) | **walks around the body surface** at the same height (one rotational sense, so it never oscillates; step ≥ 20 mm) + one-click "Lompat ke sisi: Depan · Kanan · Kiri · Belakang" | Putar probe · Miring depan–belakang (heel–toe) · Miring ke samping (rock), each with a tooltip; the contact stays fixed |
| Free 3D plane | Gerakkan bidang CT | exact LPS translation | exact LPS translation | Angguk (pitch) · Geleng (yaw) · Guling (roll) |
| Tri-planar CT | Pindahkan titik silang CT | moves the crosshair | moves the crosshair | replaced by one slider per plane (mm) |

- **Probe on the skin:** click the skin to place it, drag the probe to slide it.
- **Camera is always free:** drag empty space to orbit, Shift/right-drag to pan, wheel to zoom. No camera mode is needed, and the camera never changes the image.
- **Keyboard:** ↑ ↓ superior / inferior, ← → patient right / left, PgUp / PgDn anterior / posterior, Q / E rotate, Shift for fine steps.
- **Presets:**
  - Clinical: Transversal and Longitudinal; oblique ±45° and "Tegak lurus kulit" under **Lainnya**.
  - Free 3D: Aksial, Koronal and Sagital; oblique under **Lainnya**.
- **Text up front:** a 3-step first-run tour (remembered locally) and a **?** popover replace the long hints.

## 2. Anatomy assistance on CT and simulated US

The monitor toolbar offers five levels under **Bantuan anatomi**:

1. **Mati** — clean presentation.
2. **Hanya hover** — the tooltip only; the structure under the pointer is outlined.
3. **Kontur** — thin contours around every labelled structure; the grey-scale image stays visible.
4. **Terpandu** — contours, one label for the selected structure, and an explanation card.
5. **Tantangan** — names hidden until the learner answers.

How identification works:

- **Source of truth.** Identification comes only from the dataset's label map. The worker samples it with the **same `both()` lookup** that produces the CT pixel, which applies the same physiology warp and pathology overrides. The label raster therefore shares the image's pixel grid exactly (`core/labels.js`, `core/reslice.js`).
- **Ultrasound.** The label raster is clipped to the probe field of view.
- **Contours.** Single-pass marching squares produce sub-pixel vertices at pixel-edge midpoints. They are computed lazily per frame, only when shown (≈11–17 ms for a 300×210 image in headless Chromium).
- **Display transform.** Hover and click use the same `panelLayout` transform as drawing: zoom, pan, fit, 1:1, resize, fullscreen, device pixel ratio, split US/CT and tri-planar panels.
- **Labels.** They are translucent (no loud white pills). The guided label sits above the structure with a leader line. The cursor is a crosshair while identifying and a grab hand only over the draggable probe.
- **Structure list.** It is stable while the anatomy moves: fixed order by system then name, and a structure stays listed for 1.5 s after it was last seen. Hovering a row highlights the structure in the image, and hovering the image highlights the row. Colours come from a curated high-contrast palette.
- **Tooltip.** It shows the Indonesian name with the English name, the Terminologia Anatomica term, the system, and the provenance ("Segmentasi sintetis atlas" / "Label phantom prosedural" / "Label map lokal (belum diverifikasi)").
- **Never inventing truth:**
  - Unlabelled soft tissue, skin, air and the table read **"tidak teridentifikasi"**.
  - Tissue classes (all skeletal muscle, all bone) are labelled as groups and never named as individual muscles or bones.
  - A local CT without `anatomy.json` gets no names.
  - Licence-withheld anatomy (kidney, renal pelvis, spinal cord in the atlas dataset) is listed as *tidak tersedia* and never substituted.
- **2D ↔ 3D links.**
  - Selecting an organ in the image highlights it in 3D, with *Isolasi di 3D* and *Kembali ke tampilan semula*.
  - Selecting an organ in 3D (Inspect tool) selects it in the image, or says that it does not intersect the current plane.
  - Links exist **only on the atlas dataset**, where atlas ↔ CT registration is exact by construction. On the phantom or a local CT the app says the data is not registered.

## 3. Multiplanar CT

- **Display modes:** USG, CT (single plane), USG + CT (comparison), and **Tri-planar CT**.
- **Tri-planar CT** shows axial, coronal and sagittal CT reformats through one patient-space point, with linked, colour-coded crosshairs and the slice position in mm.
  - Orientation is radiological: axial with patient left on screen right and anterior at the top; coronal with superior at the top; sagittal with anterior on the left (`core/mpr.js`).
  - Scroll on a panel = next slice (1 voxel). A click moves the crosshair. Ctrl/⌘ + scroll = zoom.
  - The info panel states that these are CT planes, not ultrasound acquisition geometry.
- **3D + plane:** the active plane (or the axial MPR plane in tri-planar mode) is drawn in the 3D scene.
- **Window/level presets** are in the monitor toolbar; the full controls are under *Citra lanjut*.

## 4. Workspaces (shared patient, one task at a time)

The top navigation has five workspaces:

- **Anatomi & Citra**
- **Auskultasi**
- **Fisiologi**
- **Patologi**
- **Belajar**

They share one patient state, 3D scene and monitor. The control panel is a **drawer** (☰ Panel): it is closed in *Anatomi & Citra*, so the patient and the image get the space, and open in the other workspaces. The 3D view options sit in one **Tampilan 3D ▾** menu, and the movement help is behind **?**.

- **Auskultasi.** The stethoscope becomes the tool, starting at the mitral area.
  - Sites are grouped as heart, lung and abdomen. Each site has "what to listen for / why here" with references.
  - Controls: Play/Stop (user-initiated, no autoplay), Bell/Diaphragm, volume.
  - Normal ↔ HFrEF (S3 with bell at the mitral area) ↔ pleural effusion (reduced breath sounds at the right base).
  - Crackles and wheeze are **demos only** (synthetic, unreviewed).
  - The phonocardiogram is synchronised with the cardiac phase. The ECG is labelled as electrical activity: sounds are never derived from it.
- **Fisiologi.** Explanations of the cardiac cycle, respiration and antral motility, plus phase controls (ED/ES, breath hold, rates).
- **Patologi.** Seven scenarios. The new model fluid layers are **pericardial effusion**, **perihepatic free fluid** and **urinary retention**. They are grown from the label map by a bounded breadth-first search through allowed tissue only, rendered in CT, US and 3D, and identifiable. Structured cases: context, related anatomy (click to highlight), normal baseline, mechanism, findings tagged *Keluaran model / Ilustratif / Tidak disimulasikan*, differentials, limitations, references, and review status **DRAF**.
- **Belajar** (directed):
  - The home screen has **Lanjutkan** (the next unfinished step) and the module path with progress.
  - Each step is one screen: goal, view prepared automatically, one action, ✓/✗ feedback (contrast ≥ 4.5:1), **Lanjut**.
  - Each module ends with a summary of mistakes and their explanations.
  - **Modes:** Explore / Guided / Practice / Review.
  - **Modules:** 1 cross-sectional anatomy, 2 basic POCUS, 3 auscultation, 4 normal vs pathological, 5 guided case. Tasks are checked against the real simulator state (plane orientation, structures in the image, structure under the beam, stethoscope site/filter, scenario).
  - **Progress** is local-only (no server writes).
  - **Credits & licences** page with status *Terverifikasi / Bersyarat / Ditahan*.

## 5. Layout on desktop, iPad and phone

| Screen | Layout |
|---|---|
| ≥ 1700 px | Patient + image side by side; the panel can sit beside them when opened |
| 1100–1700 px (laptops, iPad landscape) | Patient + image side by side; the panel is an overlay drawer |
| ≤ 1100 px (iPad portrait) | Patient above, image below; the strip is shorter |
| ≤ 760 px (phones) | One pane at a time with a **Pasien 3D / Citra** switch; icon-only mode bar; panel full-width |

Touch: one finger drags in the selected mode (the probe or plane, or the camera in camera mode). On the monitor, one finger pans and **two fingers pinch-zoom**.

The layouts were checked with Playwright device emulation (iPad Pro 11, iPhone 13) in **Chromium**. That is not Safari — see section 7.

## 6. Tests

| Suite | Covers |
|---|---|
| `test/ux.test.mjs` | All six directions in free mode (exact LPS) and clinical mode (skin sliding, side selection) · one angle per rotation with the contact numerically fixed · camera independence over 200 random cameras · MPR geometry and radiological orientation · contour alignment on the CT label map in three planes · withheld anatomy · every learning task solvable after its own setup · credits / cases / auscultation guide completeness · deterministic, bounded synthetic adventitious sounds |
| `test/assist.test.mjs` | Label raster ↔ CT/US pixel grid · FOV clipping · contour shapes · structure registry · drag mapping · skin sliding |
| `test/e2e/ux-e2e.mjs` | Browser: the brief's test list 1–17 (camera independence, hover after zoom/pan/resize/split, tri-planar, auscultation, pathology, learning, keyboard, iPad/phone layouts); evidence `evidence/ux-*.jpg` |
| `test/e2e/run-e2e.mjs`, `atlas-e2e.mjs` | Existing phantom and atlas regression suites (updated for the drawer, workspaces and axis-locked drag) |

## 7. Known limitations and not implemented

- **Safari is not tested.** Only Chromium is available here. Preview for the owner's Mac:
  `npm run preview:4d-lab` → http://127.0.0.1:4173/anatomy/live (Safari blocks port 4190).
  For an iPad on the same network: `PORT=4173 node scripts/preview-4d-lab.mjs --lan`, then open `http://<mac-ip>:4173/anatomy/live`.
- **Fonts.** Plus Jakarta Sans / Inter are named in CSS but not bundled in the lab; system fonts are used if they are not installed.
- **Not modelled:** murmurs, S4, bronchial breathing, Doppler, lung sliding/B-lines, IVC respiratory variation, real ultrasound textures. The adventitious sounds are unreviewed demos.
- **Contours are only as specific as the label map.** One label per tissue class (all muscle, all bone); no individual vessels or segments.
- **The 3D atlas shows more structures than the CT labels** (e.g. individual muscles). Selecting those in 3D reports "no label in the synthetic CT".
- **Educational content is DRAFT** and needs clinical-educator review (`MEDICAL_REVIEW_CHECKLIST.md`).
- **No account-backed progress.** It stays in local storage; no PocketBase collections were added.
- **Kidney, renal pelvis and spinal cord are unavailable** in the atlas dataset (licence quarantine).
