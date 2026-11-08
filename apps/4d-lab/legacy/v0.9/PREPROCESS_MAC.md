# Process CTACardio locally in 3D Slicer on macOS

No CT upload is required. The supplied scripts write only to your chosen local folder. Use a new output directory. This procedure preserves the CT's physical geometry; do not manually move or scale the exported mesh to match the CT.

## First reconstruction

1. Open CTACardio.nrrd in Slicer. Keep only the volume and necessary nodes in the scene on an 8 GB Mac. Confirm it is a CT with HU values, not a rescaled screenshot or RGB image.
2. If a parent transform is present, harden it and save the resulting volume as a new NRRD. Load that exact saved NRRD in both Slicer and the scanner. The wrapper rejects non-hardened transforms.
3. Open **View → Python Interactor**. Adapt the following paths to the extracted project folder and a local output directory:

```python
import sys
sys.path.insert(0, "/Users/YOUR_NAME/Downloads/MEDCOEL-4D-Lab-v0.9/preprocess")
import slicer_reconstruct as med
volume = slicer.util.getNode("CTACardio")  # use the actual volume node name
result = med.run(volume, "/Users/YOUR_NAME/Documents/MEDCOEL-CTACardio", stride=2)
```

The core uses numpy, scipy and VTK, normally bundled with Slicer. If an import fails, preserve the traceback and check that this is the Slicer Python console, not system Python; no automatic package download is performed.

For 512×512×321 voxels, stride 2 processes roughly 256×256×161 voxels for segmentation. The original CT is accessed as a view, not duplicated by the wrapper. If the scene is still too large, close other volumes or use stride 3; inspect the resulting loss of surface detail. No 8 GB Mac performance guarantee has been measured.

The script exports `patient.glb`, `registration.json`, and `body-mask.npz`, and creates a downsampled labelmap QC overlay in Slicer. The affine maps the coarse samples back to original IJK exactly; downsampling does not reset origin or spacing. The lower and upper mask ends are padded to close the mesh. Where the mask touches acquisition faces, those caps are artificial boundaries, not anatomical skin, and are excluded from scanner contact picking within a coarse-voxel margin.

## Inspect and correct before accepting

Scroll all axial slices, then inspect coronal and sagittal views. Check skin at the anterior chest, lateral chest/abdomen, posterior back and every cropped face. Verify that the table, bedding, electrodes, disconnected objects and outer air are absent. Check that the exterior includes lung cavities rather than following lung walls. Opening can erase narrow anatomy or miss arms; largest-component selection can retain table bridges. A mesh being watertight does not mean it is the correct body.

The synthetic test verifies separation of a disconnected table, not every possible patient/table contact. If the table is connected to the body or thresholds omit skin, correct the segmentation:

1. Locate the new `MEDCOEL exterior QC` labelmap node. Create a Segmentation node, use the Segmentations module to import that labelmap, and set CTACardio as the reference/source volume in Segment Editor.
2. In axial/sagittal/coronal views, use **Scissors/Erase** to remove table or external objects and **Paint/Draw** to restore missing body outline. Use Islands → Keep largest island only if appropriate; do not delete disconnected anatomy that is actually desired.
3. Close the outside contour and fill internal cavities to represent one external envelope. Use conservative smoothing (e.g. one voxel) and inspect before/after. Do not use smoothing to hide an incorrect segmentation.
4. Select the corrected segment. Find its ID and re-export from that exact segmentation in the original CT geometry:

```python
segmentation = slicer.util.getNode("Segmentation")  # actual node name
segmentId = segmentation.GetSegmentation().GetNthSegmentID(0)
result = med.run(volume,
    "/Users/YOUR_NAME/Documents/MEDCOEL-CTACardio-corrected",
    segmentationNode=segmentation, segmentId=segmentId, stride=2)
```

The corrected mask is sampled in the original CT reference geometry. A transformed segmentation must first be hardened. The returned QC metadata records that the corrected-mask route was used but never labels it clinically validated automatically.

For a clearly bounded region, the automatic route can also use an original-voxel ROI: `roi=[iMin,iMax,jMin,jMax,kMin,kMax]`. ROI cuts make artificial boundaries; they are documented by the voxel mask output, and should be kept away from intended contact sites. Prefer a corrected mask for complex table separation. The scanner excludes a coarse-voxel margin around the declared ROI faces as well as touched acquisition faces; inspect these boundaries manually.

## Verify the exported pair

1. Inspect the GLB in the scanner along with the same CT. The scanner validates dimensions, affine and physical units, sparse CT probes, GLB SHA-256 and exported mesh/IJK anchors. It does not permit manual alignment offsets.
2. In Slicer, place three or more fiducials at identifiable external landmarks visible in your acquired region (for example sternum skin, posterior midline skin, lateral chest skin). Record each point's RAS coordinates and convert to LPS by flipping R and A signs. Compare these against the volume affine and the mesh surface. Synthetic landmarks have automated tests; real CTACardio landmarks still require this human validation.
3. Record missing/cropped areas and any residual table/skin error in a local QC note. Do not call all chest/abdomen anatomy available if only the cardiac acquisition is covered.
4. In the browser, test contact clicks from front/back/side; tilt 0°→30° and oblique rotation at a fixed point; compare the changing CT image; orbit camera and verify CT remains fixed; test transparency, monitor expansion and Free MPR outside the data. Use Safari on the target Mac and record responsiveness/errors.

## Alternative: system Python

If numpy, scipy and VTK are already installed:

```bash
python3 preprocess/reconstruct.py /path/CTACardio.nrrd /path/output --stride 2 --target-faces 16000
```

The standalone reader supports scalar single-file raw/gzip NRRD with explicit LPS/RAS directions and origin. It accepts mm/cm/m spatial units and converts them to millimetres; absent units are assumed mm, so verify the source convention. An exported binary corrected NRRD can be supplied with `--mask /path/body-mask.nrrd`; it must have exactly the same shape and affine. The browser rejects strongly sheared grids; resample to an orthogonal reference in Slicer and use that same resampled NRRD for both reconstruction and scanning.

## Geometry references

- Slicer coordinate conventions: https://slicer.readthedocs.io/en/5.10/user_guide/coordinate_systems.html
- Volume arrays and IJK/RAS matrices: https://slicer.readthedocs.io/en/latest/developer_guide/script_repository.html
- Segmentation arrays in a reference volume: https://github.com/Slicer/Slicer/blob/main/Docs/developer_guide/script_repository/segmentations.md

Slicer internally uses RAS. The wrapper converts RAS to LPS with diag(−1,−1,1,1). GLB positions use metres and +X right/+Y superior/+Z posterior; the registration records the inverse mapping to LPS millimetres explicitly. Do not rely on an STL/OBJ file's unlabelled coordinate convention.
