# MEDCOEL Phase 2 · v0.9 technical report

## Delivered implementation

The viewer's primary patient object is now an imported triangle mesh generated from the CT, not the previous radial torso proxy. Clinical contact does not call `surface(az,height)` or `moveOnSurface`; those old pure functions remain only for legacy regression tests. Free MPR retains its own unconstrained rectangular plane and quaternion state.

The local preprocessing core uses numpy/scipy/VTK: stride downsampling without resetting the original affine, HU threshold, one-voxel morphological opening, largest 3D component, per-slice cavity filling, closing, padded isosurface extraction, physical-coordinate windowed-sinc smoothing (10 iterations, passband .15), topology-preserving decimation and outward normal orientation. Target is 16,000 triangles by default; the included fixture uses 14,000. A corrected binary segmentation can replace automatic thresholding. ROI, crop touches, mesh edge count, settings and elapsed time are exported as QC metadata.

Opening/largest-component logic is not guaranteed to separate a connected table or keep disconnected limbs. The corrected segmentation route is therefore part of the workflow, not an optional assertion that automatic extraction is anatomically valid. GLB closure includes artificial acquisition caps where the volume is cropped. Picking excludes a coarse-voxel margin at touched acquisition faces and declared ROI faces. The mesh still shows the coverage limit rather than inventing missing anatomy.

## Explicit registration

| Mapping | Implementation |
| --- | --- |
| Original IJK → patient LPS mm | Full 4×4 affine from NRRD, or diag(−1,−1,1,1) × Slicer IJKToRAS. Includes direction columns, spacing and origin. |
| Downsampled sample → original IJK | Multiply each index by stride; padded isosurface index uses `(index−1)*stride`. |
| LPS mm → GLB metres | `(L,P,S) → (−L/1000, S/1000, P/1000)`. No visual fitting, center offset or scale guessing. |
| GLB metres → LPS mm | Explicit `glbToLPS` matrix in registration JSON. |
| LPS → NRRD physical coordinates | Identity for LPS; first two signs flipped for RAS. |
| NRRD physical → scanner local | Inverse of I/K/J unit basis around physical volume center. |
| Probe/MPR → CT samples | `planePoint` returns actual local physical point, then local→physical→inverse affine→IJK→trilinear voxel read. Camera and monitor zoom do not participate. |

GLB is deliberately a simple, single uncompressed primitive with no node transforms, so the loader can validate all transforms explicitly. Unknown external GLB layouts are rejected. Scanner validation checks CT dimensions, affine within .01 mm at basis points, sparse source HU probes, complete GLB SHA-256, and 20 mesh/IJK anchors within .05 mm. Sparse HU probes are a source mismatch guard, not a cryptographic CT identity guarantee. No anatomical accuracy follows merely from passing a geometric round trip.

Clinical pointer picking constructs an orthographic 3D ray from the camera and intersects actual mesh triangles. The nearest reachable non-cap hit determines contact. Interpolated outward normals form a contact frame; the prior tangent is projected onto the next tangent plane to reduce arbitrary roll changes. Angulation changes only the quaternion basis around the stored contact. Surface misses keep the last contact. Camera changes leave contact and sample geometry unchanged.

The viewer sorts mesh faces by camera depth and caches projection/sort until the camera or viewport changes. It uses a canvas renderer rather than adding a large rendering dependency. Contact raycasts are linear over the reduced mesh; the loader caps imports at 50,000 triangles and recommends 16,000. This still requires real browser performance testing; there is no measured target-device FPS claim.

## Executed validation

- `npm test`: eight suites pass. Existing NRRD, clinical geometry and Free MPR regression suites remain; new units, registered-mesh and updated application tests pass.
- `python3 preprocess/test_pipeline.py`: passed NRRD affine, surrounding-air removal, disconnected-table removal, lung-cavity filling, closed mesh edge check, polygon budget and corrected-mask route.
- Synthetic anatomical-region CT: 160×120×160 at 2.6 mm; mesh 7,002 vertices / 14,000 triangles / zero detected boundary-or-nonmanifold edges.
- Numerical skin landmarks: known synthetic anterior chest, posterior back and lateral abdomen regions were raycast. Each hit mapped to the same IJK via physical and local transforms; outward 12 mm sampled air and inward 12 mm sampled tissue. Expected region bounds use 15 mm tolerance because the fixture is downsampled/smoothed. These are synthetic landmark checks, not annotated real CTACardio anatomy. See `MESH_TEST_RESULTS.json`.
- Mismatch tests: altered source HU samples, altered affine and modified GLB bytes were all rejected.
- Application event harness: matching CT+GLB load; anterior drag and posterior/lateral contact; fixed contact through all three angle changes; resulting CT raster differences; camera/opacity leave raster unchanged; all six free gizmo handlers; no-data feedback; CT reload invalidates mesh and matching pair re-enables contact. This uses a stub DOM/canvas, not a browser.
- Pipeline run: approximately 3.7 seconds process wall time including Python/VTK startup, about 430 MiB peak child RSS on this Linux host. Reconstruction itself reported about .3 seconds. This small fixture does not establish CTACardio or Mac performance.
- Three offline mesh views generated and visually inspected. They are explicitly labelled as offline renders, not browser screenshots.

## Failed/blocked tests and outstanding acceptance gates

**Real browser interaction:** automatic approval review rejected opening the new local test page, treating it as a repetition of an earlier blocked localhost navigation. No alternate browser surface was used after that rejection. Actual v0.9 browser drag, rendering errors, monitor layout and performance remain unverified.

**3D Slicer wrapper:** a headless launch of installed Slicer 5.10 Linux was attempted. It failed before executing the script because only the xcb Qt plugin was available and the offscreen platform plugin was missing. The reusable Python/VTK core was executed, but the console wrapper and its labelmap overlay still need a real Slicer session. No macOS Slicer test is claimed.

**CTACardio:** the 512×512×321 NRRD was not accessible to this session. Only synthetic data was reconstructed. Actual skin/table separation, retained landmarks, cropped coverage, source licensing, local registration review and real anatomical appearance must be evaluated on the user's Mac. The browser rejects strongly sheared input grids; resample and use the exact same reference NRRD for preprocessing and scanning if necessary. Spatial units mm/cm/m are supported; missing units are assumed mm and require source review.

**Safari / 8 GB Apple Silicon:** not tested. Full CT parser memory includes the payload and temporary decompression/digest state; keep the Slicer scene small, begin at stride 2 or 3, and close unnecessary volumes. No promise of memory/fps on the target device is made.

## License and medical scope

Only original generated phantom data and source are included. No CTACardio, IT'IS Virtual Population mesh, licensed third-party anatomy or patient information is redistributed. License the real CT and any future segmentations appropriately before sharing; verify dataset conditions separately. The viewer shows static CT reformats and never claims ultrasound, physiological motion or clinical validation. No production servers, PocketBase, Caddy or Anatomy Atlas were accessed.
