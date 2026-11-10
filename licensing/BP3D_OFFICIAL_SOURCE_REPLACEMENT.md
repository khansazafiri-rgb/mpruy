# Official BodyParts3D 4.0 source onboarding — exact-data evidence for MEDCOEL

Date of investigation: **2026-11-10**. Scope: **future commercial-rights remediation of anatomy meshes and 4D Lab CT/USG derivatives**. This tool produces a **review-only source manifest and candidate name mapping**. It does not change the accepted original Anatomy Viewer UI, 4D Lab runtime, model geometry, quarantine, release inventory, or legal approval.

## Confirmed publisher resources

DBCLS's official site currently states a **CC BY 4.0** database licence, updated **2025-02-27**, with the required notice:

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International

Sources:

- [Exact DBCLS licence](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html)
- [Official source downloads](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html)
- [Official dataset update log](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/update.html) (geometry release 4.0 updated 2013-06-19)
- [ISA English FMA/BP ID table](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_parts_list_e.txt)
- [ISA source geometry archive](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip) (~136 MB)

The 2025 terms apply to the database as now published on DBCLS's site. **They are not a blanket permission for the MEDCOEL's older Z-Anatomy mixed derivative GLBs** or their third-party contributions. They do not relicense the CC BY-NC-SA Atlas application source. A name in the DBCLS table that resembles a MEDCOEL atlas name is not evidence the geometry is identical.

## Reproducible source download and mapping

On a local development computer with Node >=22 and the standard `unzip` utility:

```bash
npm run audit:bodyparts3d -- --download
```

This explicit opt-in command downloads the two *official* DBCLS resources into `local-data/licensing-quarantine/bp3d-4.0/` (gitignored), then generates `review.json` in that directory. It does not install any extra model package or deploy anything.

For already downloaded files, an offline alternative is:

```bash
node licensing/tools/prepare-bodyparts3d-source.mjs \
  --names /path/to/isa_parts_list_e.txt \
  --archive /path/to/isa_BP3D_4.0_obj_99.zip \
  --out local-data/licensing-quarantine/bp3d-4.0/review.json
```

The manifest includes:

- Dataset version and official source URLs.
- SHA-256 of exact downloaded ISA names and official OBJ ZIP, byte lengths and OBJ file count (when archive supplied).
- Original FMA and BP source IDs.
- A **candidate-only** mapping between all currently available MEDCOEL catalog names and official identities. This intentionally marks duplicate-name results as `ambiguous`, missing names as `unmatched`, and *every* result as `geometryIdentityVerified: false` and `redistributionApproved: false`.
- An explicit warning against treating this as legal approval, derivative rights, or evidence that the current Z-Anatomy export equals DBCLS source geometry.

The code rejects unrecognized official tabular schemas and suspicious archive entry names. It does not extract ZIP entries or write files anywhere under the public web roots.

## Actual source OBJ → separate GLB candidate (no UI changes)

BodyParts3D's official `isa_parts_list_e.txt` identifies FMA concepts and BP representation IDs, but **the source archive contains ELEMENT meshes identified by FJ file IDs**. Official `isa_element_parts.txt` is the required FMA → FJ relationship. Matching names alone must not be treated as obtaining the correct source geometry. The updated `audit:bodyparts3d` command now downloads all **three** official resources and records `elementSummary` plus per-candidate `sourceObjs` with exact archive paths.

To produce a local, *non-distributable* model candidate with original source mesh identity:

```sh
npm ci --prefix apps/4d-lab
npm run audit:bodyparts3d -- --download
npm run build:bodyparts3d-candidate -- --structure "Femur.l"
```

The converter reads FJ OBJ meshes directly from the verified official ZIP, writes a GLB and SHA-256 lineage manifest under `local-data/licensing-quarantine/bp3d-candidates/Femur.l/`. It does **not** write the publicly served `skeletal.glb` or any atlas/4D Lab dataset.

The conversion **preserves native DBCLS coordinates without guessing patient registration or anatomical unit scale**. The resulting candidate requires visual/anatomical validation, frame alignment against the MEDCOEL patient, per-mesh attribution and geometry QA before it may replace any public anatomy, CT label, or ultrasound simulation input. The source is only a candidate. All release gates remain blocked, and the original 3D/4D UI is unchanged.

## Verified real-source conversion and isolated visual QC (10 November 2026)

[GitHub Actions BodyParts3D source conversion](https://github.com/khansazafiri-rgb/mpruy/actions/runs/42771848318) actually downloaded the official DBCLS archive and produced a review-only `Femur.l` GLB (3,204 triangles, 233,088 bytes, 1 official FJ element). The official ID crosswalk reported **470 exact name candidates among 2,237 currently retained MEDCOEL structures**, with **1,767 names not mapped**. The 470 name matches point to 554 distinct FJ files, all found in the archive. **None of those 470 have passed independent clinical shape/registration validation.**

**Do not replace the 2,237 current structures with just 470 exact-name candidates.** That would be a functional regression; several structures also have different names, hierarchy and granularity in the official dataset. The existing UI must not be simplified to accommodate incomplete replacement data.

The next non-destructive QC tool produces a three-dimensional raw-source preview and geometric measurements for a selected official candidate:

```sh
npm ci --prefix apps/4d-lab
npm run audit:bodyparts3d -- --download
npm run build:bodyparts3d-candidate -- --structure Femur.l
npm run review:bodyparts3d-candidate -- --structure Femur.l
cd local-data/licensing-quarantine/bp3d-candidates/Femur.l
python3 -m http.server 4783
# Open http://127.0.0.1:4783/review.html
```

The preview includes orbit/zoom, wireframe, original mesh counts, source-coordinate bounding boxes, SHA-256 lineage checks and bundled MIT-licensed Three.js source. This is **independent test output**, not a new MEDCOEL Anatomy UI or a website deployment. Geometry units and patient alignment are explicitly unverified, and the converter does not change `apps/anatomy/public/models` or `apps/4d-lab/public/data`. The GitHub candidate workflow uploads the preview and `geometry-review.json` as a temporary downloadable artifact.

## What must happen next before any replacement is approved

1. Download and hash the exact official archive, review archive structure, and pin publisher release evidence.
2. Map FMA/BP objects to the correct anatomy, using geometry-level registration and clinically reviewed identities, not names alone. Ambiguous candidates require resolution; unmatched ones cannot be silently replaced.
3. Independently convert verified original OBJ meshes into appropriately attributed web models, preserving dimensions, handedness, anatomical coordinate frames and structural identities.
4. Generate new model previews and derived synthetic CT/labels/skin only from verified inputs. Keep versioned hashes and input-output lineage for every derived artifact.
5. Validate geometry alignment and 4D Lab scanning, CT MPR and simulated USG against actual supported volumes. Missing real data must remain unavailable, not fabricated.
6. Independently audit/rewrite the original third-party NC Atlas application code while **preserving the accepted mature user experience**. A model dataset change alone cannot give that code a commercial grant.
7. Obtain qualified rights review of the exact downstream release and keep attribution, ShareAlike and privacy obligations where applicable.
8. Only after all affected components meet the applicable review criteria may a separately reviewed PR consider changing either `commercial-release.json` status or an approved-build digest.

## Remaining blocker and evidence semantics

A SHA-256 establishes *byte identity*. A valid public CC BY licence establishes DBCLS rights for the officially covered dataset. Neither a matching name nor a build success establishes that an existing MEDCOEL mesh is from that dataset. A newly converted model must have its own source link and transformation record before publication.

The current **14 commercial-rights register entries remain unresolved**. This work is tooling toward evidence-backed replacement, not a declaration of 3D Anatomy or 4D Lab commercial readiness.

Owner's UX approval is recorded separately and must not be invalidated by a future model-source migration.
