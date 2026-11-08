# MEDCOEL 4D Lab v0.9 · anatomical reconstruction review build

**CT REFORMAT — NOT ULTRASOUND**

The patient viewer now loads a real triangle mesh reconstructed from the same voxel volume, with explicit registration. Clinical picking uses ray–triangle intersections, not cylindrical angles. Free MPR retains independent six-axis plane manipulation.

The included CT/mesh pair is a generated anatomy-inspired chest/abdomen phantom with shoulder/upper-arm and neck-base contours. It is not CTACardio, patient data or a validated anatomical model. No external assets are included. See `evidence/` for three clearly labelled offline mesh renders; these are not browser screenshots.

## Run the local viewer

1. Extract this folder. Open Terminal in it.
2. Run `python3 -m http.server 8765 --bind 127.0.0.1`.
3. Open http://127.0.0.1:8765/ in your browser. Opening index.html directly with file:// will not load the demo assets.
4. The matching synthetic NRRD, GLB and registration JSON load together automatically.

For CTACardio: follow `PREPROCESS_MAC.md` to generate `patient.glb` and `registration.json` on your Mac. Load the same CT NRRD with the dataset input. Then select both GLB and JSON together with the mesh input. Loading a new CT invalidates the previous mesh. A mismatching affine, size, sparse voxel signature or GLB hash rejects the mesh. These checks establish geometric correspondence and a source mismatch guard; the sparse signature is not a cryptographic digest of the entire CT.

## Controls

- Clinical: click a reachable skin triangle or drag the orange probe. The contact point is the actual mesh intersection. A drag starting on the probe preserves the pointer offset, and misses retain the last valid contact. Artificial acquisition caps are excluded from contact picking.
- HEEL, ROCK, ROTATE or numeric degree controls change orientation at the same contact point. Camera movement and transparency do not change CT sampling.
- Front/back/left/right camera presets change the view; separate contact presets choose reachable central mesh points on those sides. Empty-space drag orbits, Shift+drag pans, scroll zooms. Follow is optional.
- Free MPR has no skin constraint: three translation arrows, three rotation rings, precise millimetre/degree inputs, axial/coronal/sagittal/oblique presets. Its pivot is at the center of the rectangular sampling plane. Rotations accumulate in a quaternion; numeric values show cumulative patient-axis rotations, so rotation order matters.
- Skin opacity is adjustable, with a transparency toggle. The CT acquisition box and metadata-based patient directions remain visible. No names of unsegmented structures are invented.
- Drag the divider to resize the CT monitor. Focus/Expand, zoom, pan, Fit and 1:1 change the display only. Physical field width/depth and window/level stay in probe controls. Expand is an in-page overlay with movable controls. Sampling is capped at 1200×1500 pixels; 1:1 refers to the reslice raster, not native oblique voxel resolution.

## Verification and remaining gates

Run `npm test` with Node.js for eight JS suites. Run `python3 preprocess/test_pipeline.py` in an environment with numpy, scipy and VTK for the pipeline checks. All passed in the development environment; logs are included.

Actual browser interaction was blocked by automatic approval review, and Slicer's headless launch failed because its Qt offscreen plugin was unavailable. Consequently browser screenshots, Safari responsiveness, target Mac memory, and the Slicer console wrapper are not claimed as passed. The reusable core pipeline was executed successfully with Python/VTK. Details and measured limits are in `TECHNICAL_REPORT.md`.

CTACardio was not accessible for this build. Its acquisition coverage and actual skin/table segmentation must be reviewed locally. This release remains a review build until that QC and the browser/Safari tests are completed. No production deployment was made.
