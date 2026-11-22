# MEDCOEL — Private Clinical Review Hub (24 studios)

**Private review only · No release approval · No network or dataset publication**

The source catalogue contains 24 clinical studios. A visual reviewer cannot safely treat
an arbitrary studio (CT, ultrasound, MRI, ECG, GLB anatomy) as the same kind of image
overlay. The tool routes available **verified local assets** to their appropriate viewer.

## One-command Mac workflow

```bash
cd ~/mpruy
git switch claude/focused-wozniak-1ayrxa
git pull --ff-only origin claude/focused-wozniak-1ayrxa
npm run review:all-clinical-overlays
open local-data/studio-resources/review-overlays/index.html
```

All generated PNG, SVG, HTML and JSON are inside the gitignored
`local-data/studio-resources/review-overlays/`. The script has no upload
or publication code and does **not** modify `licensing/resources.v1.json`
or `licensing/reviews/`. It reads already prepared private builds only.

## Actual output types

| Studio | Real private review view | Input source |
| --- | --- | --- |
| `chest-xray` | 4 PNG radiographs overlaid with source pneumothorax polygons; opacity sliders | PTX-498 |
| `pelvis-ultrasound` | 4 PNG fetal-head ultrasound images overlaid with source contour polygons | HC18; **obstetric fetal head**, not gynecology |
| `spine-mri` | Three index-space NIfTI slices (sagittal, coronal, axial), original and colored reference mask with sliders | SPIDER; **not LPBA40** despite legacy mask filename |
| `ecg` | 6 12-lead ECG SVG sheets using waveform ADC values, gain, baseline, and 25 mm/s–10 mm/mV paper grid | PTB-XL |

All original image, annotation, mask, and ECG source **bytes must match both**
committed registry SHA-256/byte length and private `provenance.json`.
Each studio fails closed if any required file is missing, altered, or
unregistered; an error is recorded in the dashboard and no automatic
medical/privacy approval is created.

The ECG display shows the **first 2.5 seconds per lead**, not a full
diagnostic ten-second rhythm strip. The Spine MRI display shows
**voxel-index planes, not clinical R/L radiological orientation**;
orientation must be confirmed by a qualified human reviewer before
teaching laterality. The X-ray/USG red masks show source annotations,
not independent diagnoses.

## Studios without support or clearance

All other catalogue studios remain visible in the dashboard and are
not given fake overlays. In particular, **Chest CT (TCIA/LIDC)** stays
in quarantine pending exact source/derived hash evidence; anatomy GLB
regions require a separate 3D viewer, and missing/fixture-only clinical
resources cannot be represented as reviewed clinical imagery.

The private visual review process is only evidence collection. Qualified
human medical, privacy, terminology, licensing and source-rights review
and all existing distribution gates remain required. Never copy these
private previews to `apps/web/public/`, a PR, a cloud site, or a chat
if patient identifiers are visible.

## Test

```bash
node --test scripts/private-chest-xray-overlays.test.mjs scripts/private-multimodal-review.test.mjs
npm run test:studios
```

All CI tests use synthetic, non-patient fixtures. The actual four-studio
preview is generated on the owner's Mac because `local-data/` is never
committed.
