# Reconstruction pipeline (phantom + local CT such as CTACardio)

Requires Python 3 with numpy, scipy and VTK (all bundled with 3D Slicer). Nothing is uploaded.
Outputs for real data go to a folder **outside** the repository (or `apps/4d-lab/local-data/`, which is gitignored).

## 1. Regenerate the bundled synthetic phantom
```bash
cd apps/4d-lab
python3 pipeline/build_phantom.py          # ~15 s, writes public/data/phantom/*
python3 pipeline/test_pipeline.py          # 12 checks
python3 pipeline/render_slices.py public/data/phantom evidence/phantom-label-slices.png
```
`build_phantom.py` writes `ct.nrrd` (int16 HU), `labels.nrrd` (41 tissue labels on the same grid) and `anatomy.json`
(label table, heart / respiratory / GI model parameters, auscultation sites projected to the skin). It then runs
`reconstruct.py` to export `skin.glb`, `organs.glb` and `registration.json`. The geometry is original procedural code in
`phantom_geometry.py`; there is no third-party anatomy.

## 2. Local CTACardio (or any single-file NRRD CT)
### In 3D Slicer (recommended on the Mac)
1. Load the CT and keep the scene small (8 GB machine). If the volume has a parent transform, harden it and save a new NRRD.
2. Python Interactor:
   ```python
   import sys; sys.path.insert(0, "/Users/YOU/mpruy/apps/4d-lab/pipeline")
   import slicer_reconstruct as med
   vol = slicer.util.getNode("CTACardio")
   med.run(vol, "/Users/YOU/Documents/MEDCOEL-CTACardio")
   ```
3. Review the `MEDCOEL exterior QC` label map in axial, coronal and sagittal views. Check the skin at the front, sides and back,
   and the table, bedding, electrodes and cropped faces. If anything is wrong, correct a segment in Segment Editor, then:
   ```python
   seg = slicer.util.getNode("Segmentation")
   med.run(vol, "/Users/YOU/Documents/MEDCOEL-CTACardio-corrected", segmentationNode=seg,
           segmentId=seg.GetSegmentation().GetNthSegmentID(0))
   ```
4. Optional organ labels: pass `labelmapNode=` with a label map in the CT geometry (e.g. a local TotalSegmentator run).
   Keep academic licence keys and restricted weights private. Never commit their outputs.

> Not executed in the development container (no Slicer installed). The underlying `reconstruct_ct()` function is tested.

### Without Slicer
```bash
python3 pipeline/reconstruct.py /path/CTACardio.nrrd /path/out [--labels seg.nrrd] [--mask corrected.nrrd] [--threshold -350]
```

### Load in the browser
In the 4D Lab, open **Data**. Choose the same `ct.nrrd`, an optional `labels.nrrd`, and select
`skin.glb` (+ `organs.glb`) + `registration.json` (+ `anatomy.json` if you created one) together. Then click **Muat data lokal**.
The browser checks the CT grid size, the affine (0.01 mm), sparse HU probes, the SHA-256 of every GLB and the skin anchors.
A mismatched pair is rejected; there is no manual alignment.

What works with a real CT:
- CT reslicing, free 3D mode, clinical mode on the reconstructed skin.
- Ultrasound from labels if provided, otherwise a coarse HU classification. Contrast-enhanced blood and bone overlap in HU; this is documented in the app.
- Physiological motion, pathology layers and auscultation sites need an `anatomy.json` with heart, respiratory and GI landmarks for that CT. Without it they stay disabled rather than guessed.

## Coordinate conventions
- NRRD `space` LPS or RAS (RAS is converted with diag(−1, −1, 1)); units mm/cm/m are converted to mm.
- GLB positions are glTF metres: +X patient left, +Y superior, +Z anterior. `registration.json` → `glbToLPS` is the exact inverse.
- The browser maps LPS to the three.js scene with one matrix (`src/app/scene3d.js`: `LPS_TO_SCENE`).
