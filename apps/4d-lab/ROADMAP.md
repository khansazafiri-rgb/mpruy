# MEDCOEL Anatomy Live 4D Lab — roadmap

Acceptance gates are copied from the project mandate. A phase is "complete" only when its gate
has been demonstrated by an executed test (unit and/or browser) recorded in `PHASE_STATUS.md`.

| Phase | Scope | Gate |
|---|---|---|
| 1 Freehand scanner | Clinical probe mode (skin contact, rotate / heel-toe / rock about a fixed contact, independent camera); Free 3D mode (3-axis translation + rotation, presets, numeric angles, precision steps, out-of-volume indication); validated IJK<->LPS | Plane moves and rotates freely without depending on skin contours |
| 2 Anatomical patient | CT-derived body surface, explicit registration, thorax/abdomen contours, anterior/posterior/lateral views, surface-aware probe placement, transparent skin + cutaway, orientation labels, CT coverage box; reproducible pipeline (VTK/Slicer) | User recognises the region and the exact probe position |
| 3 Ultrasound engine | Tissue acoustic table, reflection at impedance boundaries, attenuation, speckle, shadowing, reverberation, depth, frequency, gain/TGC, linear/convex/sector geometry, separate CT vs US modes, labelled limitations | US output responds to probe orientation and tissue parameters via executable simulation |
| 4 Organ motion | Cardiac cycle (HR, phase), respiration (RR, depth, inspiration/expiration), gastric antral peristalsis (motility), synchronised meshes + images | Each system has a working, controllable motion demo |
| 5 Pathology + auscultation | Reduced LV systolic function, right pleural effusion, reduced antral motility; normal vs pathological comparison, explanations, references; stethoscope with S1/S2 (+S3), breath/bowel sounds, PCG | One integrated normal-vs-pathological scenario + working auscultation workflow |

## Later (not in this mandate)
- Local CTACardio QC session on the owner's Mac (requires the data and Safari).
- Measured time-resolved data (licensed 4D CT / echo) to replace procedural motion.
- Doppler / colour flow, M-mode, needle guidance.
- Assessment mode integrated with MEDCOEL quizzes (PocketBase) once the content is clinically reviewed.
