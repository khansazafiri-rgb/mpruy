# MEDCOEL 4D Lab — UX, anatomy intelligence and clinical education upgrade

Status: implemented on branch `claude/vigilant-cerf-jjc6fj-ux` (stacked on the licence-quarantine PR).
Not deployed. Educational simulator only — not a medical device.

## 1. Interaction philosophy: choose WHAT, then do ONE thing

The three simultaneously visible rotation rings are gone from the default interface. They remain an
opt-in advanced tool under **"Sudut presisi & cincin 3D (lanjutan)"**.

Above the 3D view, a **mode bar** selects exactly one quantity:

| Mode | Key | What one gesture changes | Clinical probe | Free 3D |
|---|---|---|---|---|
| ⌖ Tempatkan | P | click places the probe on the skin; drag the probe to slide it | on the skin | — |
| ↕ Superior–Inferior | 1 | patient S axis | slides along the skin, sub-steps ≤ 2.5 mm, refuses jumps and points outside CT coverage | exact LPS translation |
| ↔ Kanan–Kiri pasien | 2 | patient L axis (+ = patient LEFT, not screen left) | same | same |
| ⇅ Anterior–Posterior | 3 | patient P axis | **explicit body-side selection** (front, back, right, left at the same height) — never through the body | exact LPS translation |
| ⟳ Putar | 4 | one angle at a time: rotation / heel–toe / rock (clinical) or pitch / yaw / roll (free) | pivots on the fixed skin contact | rotates the plane about its centre |
| 🎥 Kamera | C | orbit / pan / zoom | camera only | camera only |

- **Gestures.** In the selected mode, a drag anywhere on the 3D view, the mouse wheel, the − / + buttons and the arrow keys (Shift = fine) change only that quantity. The context strip shows the current value (e.g. `S 12.5 mm`, `Heel–toe 8.0°`) and the step size (1–25 mm, 1–15°).
- **Axis guide.** A coloured two-headed arrow at the probe or plane shows the patient axis, labelled "+ Superior / − Inferior" etc.
- **Camera-independent mapping.** A drag is projected onto the arrow's on-screen direction (`dragToAmount`), so dragging toward "+ Superior" always means superior, whatever the camera orientation. This is tested over 200 random cameras.
- **No silent mode changes.** In a movement mode, a click on the skin does not relocate the probe; the status bar explains how to do that. The wheel never zooms the camera outside camera mode.
- **Orientation presets** (one click):
  - **Clinical:** Transversal, Longitudinal, Oblique ±45°, Custom. They are defined in the local patient frame at the skin contact, and reset tilt/rock to 0.
  - **Free 3D:** Axial, Coronal, Sagittal, Oblique, Custom. These are true patient planes; the 2D image is never just rotated.

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
- **Patologi.** Structured cases: context, related anatomy (click to highlight), normal baseline, mechanism, findings tagged *Keluaran model / Ilustratif / Tidak disimulasikan*, differentials, limitations, references, and review status **DRAF**.
- **Belajar.**
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
