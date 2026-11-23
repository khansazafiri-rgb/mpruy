# Final end-to-end QC — 24 Clinical Studios, 23 November 2026

**Decision: NO-GO for public release of all 24 studios.** Six source-compatible private data pipelines pass bounded engineering checks; one preview fails source fit; 17 studios lack a grounded modality-specific private preview. All native private-data browser checks and all medical, privacy, internal commercial-rights and exact-build release approvals remain blocked. Fixture/browser CI is a separate technical result, never a clinical approval.

Audit target: `claude/focused-wozniak-1ayrxa` at **406b28afbe26f023a2a02bc92fdcf73b67df1bf1** (PR #265). Source QC executed against **0054635cf40738e9d5f98f94ce749e317a56a10b**, clean code worktree, at 2026-11-23 03:02 UTC / **10:02 WIB**. The report-only child commit does not change these audited pipeline files. Fresh Linux CI for the final PR head is authoritative for its browser/API checks; inspect the PR checks and artifacts rather than infer success from this document. No merge, deployment, dataset download, studio activation, rights override or clinical approval is performed by this QC.

Machine-readable summary and all 24 resolver decisions: [final-qc-2026-11-23.json](final-qc-2026-11-23.json). This is an observation artifact, **not a second catalog, registry or release authority**. Canonical catalog/registry/ledgers are unchanged.

## Evidence and reproducible scope

The actual owner-local input files were found under `local-data/studio-resources/review-overlays/`, read in full and preserved before regeneration. They were not timestamp/commit attestations. Pinning them identifies exactly the supplied evidence, not which code created them.

| Input | Bytes | SHA-256 |
|---|---:|---|
| `all-studios-report.json` | 12578 | `b46c7c728f1bb099437f0e4e84b6a8bf132261e59d0b65bdb98ffff2d53df773` |
| `review-hub-status.json` | 1157 | `4293754a593a60d5abd4c39b2cc8b1b5210ee8925ffa1ff0e2ef8b20ca6f0aaf` |
| `next-qc-prompt.md` | 3506 | `04388de05e378575e7d8390f7315845708bf6d71dd232ea930c3bf934a633b6d` |

After fixes, `node scripts/finish-all-clinical-studios.mjs` genuinely rebuilds **7/24 private previews**, up from the supplied 5/24; 17 remain blocked and public releases remain **0**. Source files already held locally were used. Large source archives were staged using copy-on-write and only selected members read; no medical dataset was downloaded and no clinical bytes were uploaded to GitHub/CI. Private files remain gitignored with restrictive local permissions.

`node scripts/private-studio-source-qc.mjs --owner-root <existing-owner-repo>` audits the retained bytes and writes private evidence under `local-data/qc-final-20261123/source-qc.json`. This source-only CLI returns nonzero for the HC18 source-fit failure. Its Node VM DOM/Canvas harness is **not a native browser**. CLI paths refuse symlink escapes and external writes; raw-data paths never enter public manifests.

## Per-studio matrix

`PASS` in the data column means the bounded private pipeline/source checks described below passed. It does not certify clinical labels or learner-facing rendering. `FAIL` means a demonstrated mismatch; `BLOCKED` means missing evidence, approval or execution. Overall gives precedence to the demonstrated source-fit failure. Every row has **medical BLOCKED, privacy BLOCKED, internal commercial clearance BLOCKED, native private browser BLOCKED, release eligible false**. Engine fixtures, Guided and Challenge engineering checks are covered separately by CI.

| Studio ID | Real-data pipeline | Overall QC | Release | Concrete evidence / remaining gap |
|---|---|---|---|---|
| brain-anatomy | BLOCKED | BLOCKED | BLOCKED | No commercial-cleared complete 3D brain geometry |
| brain-ct | BLOCKED | BLOCKED | BLOCKED | No verified CT data and annotations for brain |
| brain-mri | BLOCKED | BLOCKED | BLOCKED | LPBA40 blocked; alternative MRI and renderer not cleared |
| head-neck-anatomy | BLOCKED | BLOCKED | BLOCKED | 3D asset file manifest and rights review missing |
| spine-anatomy | BLOCKED | BLOCKED | BLOCKED | 3D anatomy geometry and rights review pending |
| spine-mri | PASS | BLOCKED | BLOCKED | SPIDER source geometry and clinical label orientation review pending |
| thorax-anatomy | BLOCKED | BLOCKED | BLOCKED | CT organ masks are not a complete licensed 3D anatomy atlas |
| chest-xray | PASS | BLOCKED | BLOCKED | Source polygon review required before public use |
| chest-ct | PASS | BLOCKED | BLOCKED | Private TotalSegmentator candidate ONLY; legacy TCIA remains quarantined |
| lung-ultrasound | BLOCKED | BLOCKED | BLOCKED | Lung ultrasound publisher file manifest/renderer missing |
| heart-anatomy | BLOCKED | BLOCKED | BLOCKED | 3D heart geometry and rights review missing |
| cardiac-echo | BLOCKED | BLOCKED | BLOCKED | Cardiac echo publisher file manifest/renderer missing |
| cardiac-ct | BLOCKED | BLOCKED | BLOCKED | Verified cardiac CT source/labels missing |
| ecg | PASS | BLOCKED | BLOCKED | PTB-XL diagnosis and waveform interpretation unapproved |
| abdomen-anatomy | BLOCKED | BLOCKED | BLOCKED | CT 2D organ masks are not full cleared 3D abdomen anatomy |
| abdomen-ct | PASS | BLOCKED | BLOCKED | TotalSegmentator anatomical mask review pending |
| abdomen-ultrasound | BLOCKED | BLOCKED | BLOCKED | Ultrasound source file manifest and renderer missing |
| fast-ultrasound | BLOCKED | BLOCKED | BLOCKED | Verified and redistributable FAST dataset missing |
| pelvis-anatomy | BLOCKED | BLOCKED | BLOCKED | Full pelvis 3D asset with rights review missing |
| pelvis-ultrasound | FAIL | FAIL | BLOCKED | HC18 depicts fetal head, not gynecologic pelvis |
| upper-limb-anatomy | BLOCKED | BLOCKED | BLOCKED | Commercial-clear 3D limb assets pending |
| lower-limb-anatomy | BLOCKED | BLOCKED | BLOCKED | Commercial-clear 3D limb assets pending |
| msk-xray | PASS | BLOCKED | BLOCKED | FracAtlas image, polygon and privacy review pending |
| knee-mri | BLOCKED | BLOCKED | BLOCKED | Knee MRI publisher file manifest, annotation and renderer missing |

The six source-compatible pipelines may advance to **independent private human review only**, subject to the gaps below. HC18 must not be presented as pelvic pathology or gynecologic ultrasound. The 17 remaining studios require appropriately licensed source files, exact manifests and valid annotation/viewer coverage before meaningful content QC. A CT organ mask is not a complete 3D atlas; a non-gated body CT does not establish Cardiac CT coverage.

## Actual data, MPR, alignment and labels

**Chest CT and Abdomen CT — engineering PASS, clinical/release BLOCKED.** Retained TotalSegmentator small v2.0.1 ZIP: **3,244,617,817 bytes**, SHA-256 `6c47636d9727cd97048616383365dd5a588d0bbc5723b5eb0fa736ed08480ffc`, publisher MD5 `6b5524af4b15e6ba06ef2d700c0c73e0`. Source and all 11 masks have matching grids and affines. ZIP member CRCs, full archive digests, source member digests, **2,944,656 sampled HU values** and **32,391,216 mask values** were compared to native source. All full source masks are binary, including voxels outside the downsampled selection. The preview grid is 143×143×144, with recorded sampled-source indices and preserved source affine/units.

All three planes, soft/lung/bone windows, independent wheel navigation, opacity 0/55/100% and organ on/off were exercised against the real source in a Node DOM/Canvas harness: **431,431 pixels per CT studio** compared. This establishes arithmetic/grid correspondence for those samples, not native browser behavior, correct diagnoses or medical truth of publisher segmentation. RAS-header edge labels and physical aspect follow the affine. Axis permutations/signs are supported; oblique/noncanonical orientation is explicitly labelled source-index rather than falsely called standard axial/coronal/sagittal. Clinical laterality and organ contours still require reviewer approval. Cross-dataset registration is not assumed.

These are private **TotalSegmentator candidates**, not the old LIDC-IDRI or AMOS canonical asset chain. Neither canonical dataset IDs, registry hashes nor clearance were rewritten. No old TCIA quarantined input was restored. Kidney/lung left/right IDs remain exact publisher identities; a code-level match does not validate the anatomical segmentation.

**Spine MRI.** Three retained SPIDER preview slices have matching registered bytes; source image/mask geometry agrees. SPIDER is T2 lumbar MRI, not LPBA40 or a normal-brain source. The inherited `t1.nii.gz` / `labels-lpba40.nii.gz` filenames are legacy internal aliases, not provenance. Source numbered vertebra/disc labels are not promoted to unsupported named vertebral levels. Medical label/laterality review is pending. Three historical tool pins are valid at the declared processing commit; the current tool differs and is reported separately. This QC does not claim a new historical-pipeline reproduction.

**Chest X-ray.** Four PTX-498 source-image/polygon previews pass existing byte/polygon preparation checks. Reported polygon coverage ≥0.9974 is engineering correspondence, not radiologist validation. Laterality, projection, burned-in identifiers and diagnosis still need human review.

**ECG.** Six PTB-XL 1.0.3 records, 12 leads, 500 Hz, 5,000 samples (10 seconds stored); preview displays the first 2.5 seconds with 25 mm/s and 10 mm/mV scale. Source WFDB lead checksums agree. Diagnosis interpretation, labels and Challenge keys remain unapproved; stored signal existence is not a clinician-reviewed diagnosis.

**MSK X-ray.** Six FracAtlas images and source COCO contours regenerated; retained archive SHA-256 `b67ec2d290a022b3dcf47f78e9a37f7edcc80592c0571f439355bf00bd9f0e23`, MD5 `fe9da2c7c285915ebee69dfdab8fd396`; COCO SHA-256 `e749d5aaff26cca58f34af0cd88eec7cd992bf1847b81c1beae16168ee409f86`. A reviewed preview visibly contains facility branding/laterality markings, requiring burned-in-text/privacy review. The source may be commercially compatible at publisher level; its exact files are not internally approved or canonical-registry-bound yet.

**Pelvis Ultrasound — FAIL source fit.** Four HC18 fetal-head circumference images/contours have valid source bytes, but the publisher explicitly describes fetal heads. They cannot certify a gynecologic pelvis studio. Retain as private source-reference evidence only; acquire/approve a correctly scoped dataset or separately approve a suitable product change. No fake pelvic annotations are created.

## Source license versus internal asset clearance

Publisher evidence below establishes candidate source identity/scope. It does not authorize a MEDCOEL build or eliminate dependencies, ShareAlike obligations, private-data risks or prior Atlas/4D blockers. Public source pages may change; exact retained file hashes remain in private source evidence and the unchanged canonical registry.

| Source | Version / official evidence | Source-level observation | Internal release |
|---|---|---|---|
| TotalSegmentator | [Zenodo 10047263](https://zenodo.org/records/10047263), small v2.0.1 / DOI 10.5281/zenodo.10047263 | Publisher-declared CC BY 4.0; pinned ZIP; generated notice credits publisher, source, version and MEDCOEL changes | BLOCKED; new private candidate chain not approved |
| SPIDER | [Zenodo 10159290](https://zenodo.org/records/10159290), v4 / DOI 10.5281/zenodo.10159290 | CC BY 4.0 source record; diseased lumbar MRI and reference segmentations | BLOCKED; exact-file medical/privacy/rights pending |
| PTB-XL | [PhysioNet 1.0.3](https://physionet.org/content/ptb-xl/1.0.3/), DOI 10.13026/kfzx-aw45 | CC BY 4.0 source record and attribution required | BLOCKED; diagnosis and exact files unapproved |
| PTX-498 | [Zenodo 8266529](https://zenodo.org/records/8266529) | CC BY 4.0 publisher record; source image/polygon lineage retained | BLOCKED |
| HC18 | [Zenodo 1327317](https://zenodo.org/records/1327317), v2 / DOI 10.5281/zenodo.1327317 | CC BY 4.0 publisher record; **fetal-head scope** | FAIL intended source fit; BLOCKED release |
| FracAtlas | [Figshare 22363012](https://figshare.com/articles/dataset/22363012), version 7 | Publisher-declared CC BY 4.0; retained archive and source COCO hashes | BLOCKED; exact-file chain/reviews not approved |
| SRI24 / BodyParts3D legacy chains | Unchanged `licensing/resources.v1.json` and rights ledger | Registry retains CC BY-SA 3.0 / CC BY-SA 2.1 JP respectively for its chosen legacy files; do not infer CC BY 4.0 for them from newer general pages | BLOCKED; missing active data/rights/SA assessment |
| LPBA40 / quarantined NC code/data | Unchanged quarantine, rights ledger and policy | NC/incompatible or unresolved provenance remains blocked | Do not restore or relabel |

The canonical registry has **8 sources / 100 assets** (46 source parents, 54 derived). The local read-only audit matches **32/46 source inputs and 26/54 derived assets**, with **zero mismatches among files actually present**. Missing/retired/quarantined active paths mean the full registry audit is **not PASS**. Zero invalid historical tool pins; **three current-tool changes remain visible**. Missing NC/retired inputs must not be restored merely to make this audit green. All 100 assets have pending medical and privacy review, reviewer registry and signed decision log are empty, and **0/39 rights records are verified**. The original 14 legacy rights records, all current rights records and catalog are unchanged.

## Proven bug fixes and negative acceptance checks

1. Permit authentic safe publisher IDs such as `vertebrae_L1`, retaining strict non-path identifiers and duplicate rejection. Scan every source mask voxel for binary labels; reject mismatched/nonfinite/degenerate geometry. Old lowercase-only validation caused the real retained CT previews to fail closed despite existing unit tests passing.
2. Before private browser rendering, bound streaming decompression to expected byte count and verify decoded HU/mask SHA-256. Reject zero/missing/tampered hashes, unknown bits, duplicate organ bit/ID, malformed RGB and forged approval flags. On failure clear output and disable controls. Report readiness only after actual draw.
3. Preserve affine, sampling maps, source-member identities and physical dimensions; bind HTML, geometry, renderer and volume bytes to availability checks. Edited/removed bundle parts, false source receipts or forged release/medical/privacy/rights/orientation approval must be rejected. Oblique volumes cannot claim canonical MPR orientation.
4. Validate pinned historical processing blobs at their declared git commit. Report current tool drift separately; never rerun changed tools as though they were the recorded pipeline. Detect missing preparation tools, changed asset bytes, missing commits, invalid paths/symlinks and refuse external reproduction writes.
5. Make strict public-exposure audit fail on missing/duplicate/unknown probes, unsupported HTTP codes, network errors, HTML SPA fallback, critical findings or any served uncleared/unverified candidate. Only confirmed 403/404/410 non-served observations can pass this bounded surface check. Always keep `releaseCleared:false`.

Focused changed-code tests: **31/31 PASS**. Full local studio tests **133/133 PASS** and licensing **102/102 PASS**. These tests verify the intended fail-closed behavior; synthetic fixtures are explicitly engineering-only and never grant source/clinical approval.

## Regression / browser / security evidence

Local regression: Web **168/168**, PocketBase units **84/84** plus formatting **7/7**, Anatomy units **92/92** plus integration **10/10**, 4D units **123/123 + 4/4**, Hermes **67/67**, integration guards **8/8**, all 24 fixture builds, lint and web production build pass. These are local Node 26 checks. Fresh GitHub Node 22 CI and separate integration workflow validate the final PR checkout; results/logs/artifacts are on the PR.

The integration workflow preserves 48 Explore/Guided fixture-page browser checks, shared Guided checks, all original 16 legacy 4D assertions on both same-run base and integrated head, and the failure comparison/freshness proof. It adds **10 synthetic MPR browser cases** and the existing real-PocketBase full-stack login/iframe/Guided/Challenge/revocation fixture test. Main CI retains real PocketBase API tests. Authorization tests must reject anonymous, forged/replayed/expired receipts, unapproved/revoked resources and cross-user/cross-studio access; no answer keys or private bytes may leak from Studio API. Existing suites cover these contracts without approving clinical content.

**Native private-data browser execution is BLOCKED in this session.** Real Chromium headless aborts at macOS Mach bootstrap permission denial; WebKit aborts on launch. No sandbox bypass was attempted. Source-only Node VM results above are not substituted for Safari/mobile/WebGL/performance or real clinical browser validation. Linux CI uses tiny synthetic fixtures, not owner medical bytes; passing those tests does not remove this blocker. Original known 4D browser failures are not deleted, skipped or declared passed; inspect fresh base/head raw results even if the regression-comparison job succeeds.

Checks are bounded to tested paths; this is not a claim of a complete penetration test or a production secret scan. No runtime studio, PocketBase hook/migration, Atlas, 4D, Lab Hub, Study Planner, Hermes, Caddy, dependency or lockfile is changed by this PR. Only offline private pipeline/renderer, auditing/tests, CI and documentation are touched. No clearance record or review decision is created.

## Production exposure — FAIL, observed 23 November 2026 10:02 WIB

Read-only HTTP observations, not production changes:

| Route | Observation | Decision |
|---|---|---|
| `/anatomy/viewer/models/nervous.glb` | 404 | Not served at this observation |
| `/anatomy/viewer/thumbnails/systems/nervous.webp` | 404 | Not served at this observation |
| `/anatomy/viewer/models/skeletal.glb` | 200, 1,826,044 B; SHA-256 `2de765c25b2860708a4ff984908e19853eb443875cd4256e3104aef45a1291be` | **FAIL**: matches repository candidate with unverified commercial rights |
| `/anatomy/viewer/models/visceral.glb` | 200, 1,815,064 B; SHA-256 `5392afc3fd9a54f653e6b976e82e6fd7a51ea4b5661297b41f259a5d46c72bb8` | **FAIL**: matches repository candidate with unverified commercial rights |
| `/anatomy/4d-lab/data/atlas/ct.nrrd` | HEAD 200, no established byte identity | **FAIL strict exposure gate**; identity/privacy/rights unverified; HEAD alone does not establish a valid CT file |

The two GLBs match current candidate hashes, not the old withdrawn hashes. Neither a 200 response nor being in Git proves commercial rights. The bounded strict audit fails with **three uncleared/unverified observations** and `releaseCleared:false`. This is only five known probes, not exhaustive deployed/CDN inventory. Ops must inspect exact deployed build identity, files, backups/caches and ledger coverage, then remediate exposure under separate production approval; no live file is altered here.

Anonymous `GET /api/medcoel/studios` and **24/24 launch URLs return 404**, zero unexpected success. This establishes no public response at those URLs, **not passing deployed authorization or proof that all alternate/private resource paths are absent**. Live Studio API availability/auth contract stays BLOCKED. Atlas and 4D child pages expose `X-Frame-Options: SAMEORIGIN` and CSP `frame-ancestors 'self'`; root headers differ. Effective deployed config must be checked separately rather than inferred from checked-in Caddy.

## Storage, staging and release prerequisites

The existing local source archives alone include ~3.245 GB TotalSegmentator and ~338 MB FracAtlas; avoid duplicate extraction and treat them as private raw storage. The sampled CT decoded HU + bitset is **11,778,624 B (~11.23 MiB)**; bundled volume JS is ~4.14 MB. These are data sizes, **not measured peak browser memory**. Include processing/backup/extraction/cache headroom; full native CT and mask arrays add substantially more memory. Lazy loading and budget tests still need actual-device validation. Keep private raw/processing separate from approved immutable hash-keyed delivery; public delivery may contain only exact approved build assets. Never publish `local-data`, reviewer packages, patient metadata or Challenge keys.

**VPS disk space was not measured.** The historical 21 GB free is not a current capacity check; Mac disk figures are not VPS figures. No private resource installation, PocketBase migrations, production environment values or effective Caddy config were verified/changed. Staging needs separately approved exact resource manifests/install receipts, release build attestation, appropriate private/authenticated delivery, server-side signing/review keys outside Git, backup/restore evidence, current free-disk/inode/memory check, restrictive ACLs and effective reverse-proxy/API routing. Never print secret values. Git merge alone installs no clinical data.

## Remaining blockers and next decision

- **All 24 release BLOCKED:** exact-file medical, privacy and rights approvals; signed dependency lineage/attribution review; valid exact-build approval. Canonical status is evaluated from existing authority, not this report.
- **17 content BLOCKED:** missing correctly scoped clinical data/geometry/annotations/viewer evidence; source candidates or fixture engines are insufficient.
- **Pelvis Ultrasound FAIL:** HC18 fetal-head reference is unsuitable for the intended pelvic studio.
- **Native private clinical browser BLOCKED:** all real-data browser/device/clinical laterality checks still needed; synthetic CI is insufficient.
- **Global registry/reproduction BLOCKED:** missing active source/derived paths and three current-tool changes; reconcile sources/retirement without reviving quarantined content. TotalSegmentator/FracAtlas candidate chains need separate reviewed registry integration, not ID substitution.
- **Production exposure FAIL:** two unverified-rights GLBs still served; CT endpoint identity unresolved. Full deployed inventory and authorized remediation required.
- Fresh PR CI, real PocketBase/API/browser results and any raw 4D failures remain visible on the PR. A passing same-run comparison is not a passing raw 4D suite.

This PR is a code/QC integration for owner review, **not a clinical release approval**. Merge only after reviewing actual final-head CI and these limitations. Do not deploy or activate studios until their relevant checks and exact approvals pass. No PR-B2 expansion, medical approval fabrication, automatic merge or production action is included.
