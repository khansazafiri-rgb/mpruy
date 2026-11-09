# MEDCOEL licence and provenance report (copyright risk containment)

Date: 2026-11-09 · Base: integration branch `claude/focused-wozniak-1ayrxa` at `b931e1b`
Policy: [`quarantine-policy.json`](quarantine-policy.json) · Per-structure manifest: [`atlas-structure-provenance.json`](atlas-structure-provenance.json)

> **Not legal advice. Not a claim of full compliance.** This report records what was found in the
> repository and on the public site, the conservative decisions taken, and what still needs the
> owner or a lawyer ([`LEGAL_REVIEW_REQUIRED.md`](LEGAL_REVIEW_REQUIRED.md)). Inclusion in the
> repository and statements in upstream notices were **not** treated as proof of redistribution rights.

## 1. Method

1. Every GLB was opened. Each structure was listed with its name, parent, system and triangle count
   (2,827 structures in 7 files). There is no per-mesh source metadata in the files: the Blender
   extras carry only `za_name` / `za_system`.
2. Each structure was compared with the upstream notice (`apps/anatomy/public/models/License.txt`)
   and with the publishers' own pages where they still exist (Sketchfab public API, read-only).
3. Origin was inferred from:
   - **naming conventions.** The FreeSurfer/Destrieux parcellation names that Brainder uses,
     e.g. `Lat_Fis-ant-Horizont` and `Sulcus interm_prim-Jensen`.
   - **hierarchy.** `White matter of telencephalon` and the commissures nested under it.
   - **upstream model descriptions.** The Dundee inner-ear model states it includes the
     tympanic membrane, ossicles and vestibular system.
   - **mesh signatures.** Z-Anatomy's procedurally generated tubes have triangle counts that are
     multiples of 288.
4. Every derived file was traced back to its inputs: previews, the 4D Lab dataset, evidence
   renders and videos.
5. Live exposure was checked with read-only `HEAD` requests (section 6 of
   [`EXPOSURE_AND_ROLLBACK_PLAN.md`](EXPOSURE_AND_ROLLBACK_PLAN.md)).

## 2. Findings on the high-risk items

| Item | What was found | Decision |
|---|---|---|
| **A. Brainder and "White matter" (University of Washington)** | Neither has a licence stated upstream. They are in `nervous.glb`:<br>• 122 cortical gyrus/sulcus meshes with Destrieux naming → Brainder (likely)<br>• 9 meshes under `White matter of telencephalon` → UW White matter (likely)<br>The remaining brain meshes (subcortical nuclei, brainstem nuclei, cerebellum, ventricles) cannot be attributed with confidence. | Safe separation **not established** → **the whole `nervous.glb` is withheld**. |
| **B. Dundee "Anatomy of the Inner Ear"** | The publisher page (Sketchfab, `tilt` account) gives CC BY-NC-SA 4.0. It is a derivative of McGill "3D Ear" (CC BY-NC-SA 1.0) and states that it includes the **tympanic membrane, facial nerve, ossicles and vestibular system**.<br>`Cochlea`, `Vestibule` and `Tympanic membrane` are in `nervous.glb`; `Malleus`, `Incus` and `Stapes` are in **`skeletal.glb`**. | NC-SA material cannot sit inside a BY-SA adaptation → `nervous.glb` withheld; the **6 ossicle nodes removed from `skeletal.glb`** as a precaution. |
| **C. lissiecowley "Kidney"** | CC BY-NC 4.0 per the upstream notice; the publisher account could not be found on 2026-11-09. `Kidney.l/.r` are in `visceral.glb`.<br>The kidney was **voxelised into the 4D Lab CT/labels**, fusing NC with BY-SA geometry in one adaptation. That cannot satisfy both licences: BY-SA requires BY-SA-compatible terms, and BY-NC is not compatible. Relabelling the result "BY-NC-SA" does not cure the conflict. | `Kidney.l/.r` and `Renal pelvis.l/.r` (part of the same organ model; precaution) **removed from `visceral.glb`**. The 4D Lab dataset is **rebuilt without them**. |
| **D. Atlas-derived CT, labels and skin** | Built from all 7 GLBs, including the kidney (labels 20/21) and the spinal cord from `nervous.glb` (label 35). | **Rebuilt from cleared inputs only.** The pipeline fails closed if a quarantined file or structure appears. Labels 20/21/35 are kept as ids, flagged `available:false`, have zero voxels and are **not substituted**. |
| Dundee "Cranial Nerves and Foramina" | The upstream notice says CC BY 4.0, but the publisher page currently shows **no licence** and says the model is **based on BodyParts3D (BY-SA)**. A "CC BY" label for a BY-SA derivative is itself doubtful. The model is in `nervous.glb`. | Withheld with `nervous.glb`. |

## 3. Collection versus adaptation

- **A single GLB** is an *adaptation*: Z-Anatomy merged meshes from several works into one scene
  graph and one binary. The upstream export already mixes BY-SA, BY, BY-NC-SA, BY-NC and unlicensed
  meshes under a blanket "BY-SA 4.0" notice, so it is internally inconsistent. MEDCOEL
  redistributing it does not inherit any rights the upstream did not have.
- **Several GLBs served side by side** by the viewer form a *collection*. Each file keeps its own terms.
- **The 4D Lab CT, label map and skin** are *adaptations of every mesh that contributed voxels*.
  Under BY-SA §3(b) the adaptation must carry BY-SA (or a compatible licence); under BY-NC §1/§2
  it must not be used commercially; BY-NC-SA is not on the BY-SA compatibility list. So an
  adaptation that includes both cannot be licensed consistently. The only clean remedy is to remove
  the NC input, which is what was done.
- **The cleared skin shell came out byte-identical** when rebuilt without the kidney, nervous.glb
  and ossicles. This demonstrates that those meshes, all internal, never reached the outer envelope.
  The same file is therefore published as part of the cleared build.
- **Renderings** (previews, evidence screenshots, promotional video frames) are adaptations or
  reproductions of what they depict.

## 4. File-by-file register

### 4.1 Anatomy Atlas — `apps/anatomy/public/`

| File(s) | Source | Licence | Status after this PR |
|---|---|---|---|
| `models/nervous.glb` (3.8 MB, 580 structures) | Mixture: Brainder and UW White matter (no licence); Dundee inner ear (BY-NC-SA); Dundee cranial nerves (unverifiable); BodyParts3D/Z-Anatomy | Unresolvable | **Withheld.** Removed from the tree. Original only in `local-data/` (gitignored) and Git history. |
| `models/visceral.glb` | BodyParts3D/Z-Anatomy plus lissiecowley kidney | BY-SA + BY-NC | **Replaced** by a lossless pruned adaptation (114 of 118 structures; kidney and renal pelvis removed) → CC BY-SA 4.0. |
| `models/skeletal.glb` | BodyParts3D/Z-Anatomy (ossicles possibly Dundee) | BY-SA (+ possible NC-SA) | **Replaced** by a lossless pruned adaptation (271 of 277 structures; ossicles removed) → CC BY-SA 4.0. |
| `models/{muscular,joints,cardiovascular,lymphatic}.glb` | BodyParts3D/Z-Anatomy (no other model listed upstream for these systems) | CC BY-SA 2.1 JP → CC BY-SA 4.0 | **Cleared**, unchanged. Residual low risks in section 5. |
| `models/License.txt` | Upstream notice | — | Kept **unmodified** (attribution requirement). |
| `LICENSE`, `NOTICE` (and the `public/` copies) | MEDCOEL | — | **Rewritten**: quarantine section, BY-SA 4.0 for the models, adaptation notice, collection/adaptation explanation. |
| `thumbnails/structures/*.webp` (2,827 → 2,237) | Renders of single structures | Same as the mesh | **590 withheld** (every nervous structure, kidney, renal pelvis, ossicles). The rest are cleared. |
| `thumbnails/systems/{nervous,visceral}.webp` | Renders of the original system files | Mixed | **Withheld.** Can be re-rendered from the cleared `visceral.glb` later. |
| `thumbnails/systems/{skeletal,muscular,joints,cardiovascular,lymphatic}.webp`, `thumbnails/regions/*`, `hero.webp` | Renders of skeletal + muscular (+ the system itself) | BY-SA | **Cleared.** The thumbnail tools render regions and hero from skeletal and muscular only. Head-region renders may include the tiny ossicles (not measured; low risk, see section 5). |
| `data/atlas-catalog.json`, `systems.json`, `structure-thumbnails.json` | Metadata (names, boxes) | Facts / BY-SA | **Quarantined entries removed.** `systems.nervous` is kept as `[]` for consumers. |
| `data/quarantine.json` (new) | MEDCOEL | — | Name-only list, so the UI can say "tidak tersedia". |
| `data/definitions.json` | Wikipedia | CC BY-SA 3.0 / GFDL | Cleared (text; attribution in NOTICE). |
| `data/lexicon.json`, `synonyms.it.json`, `translations/` | Z-Anatomy file / MEDCOEL | BY-SA / MEDCOEL | Cleared. |
| `data/annotations/`, `library-reference.json` | MEDCOEL | MEDCOEL | Cleared. |
| `draco/` | three.js / Google Draco | Apache-2.0 | Cleared. |
| `brand/`, `favicon.svg` | MEDCOEL | Owner-authorised | Cleared. |

### 4.2 4D Lab — `apps/4d-lab/`

| File(s) | Status |
|---|---|
| `public/data/atlas/{ct,labels}.nrrd`, `anatomy.json`, `registration.json` | **Rebuilt from cleared inputs.** Old SHA-256 values are blocked by the distribution guard. |
| `public/data/atlas/skin.glb` | Rebuilt; byte-identical (section 3), so published. |
| `public/data/atlas/NOTICE.txt` | Rewritten: CC BY-SA 4.0, attributions with licence URLs, adaptation notice, exclusions. |
| `public/data/phantom/*`, `legacy/v0.9/assets/*` | Original MEDCOEL synthetic data. Cleared. |
| `evidence/atlas-*.jpg` (13) | **Withdrawn and regenerated** from the cleared build (`CLEARED_EVIDENCE.json`). |
| `evidence/atlas-label-slices.png`, `atlas-us-standard-views.png`, `11-medcoel-anatomy-live.jpg`, `staging-preview-anatomy-live.jpg` | **Withdrawn**; not regenerated in this PR. |
| `evidence/0*.jpg`, `us-*.png`, `phantom-*.png` | Phantom only (original). Cleared. |
| `pipeline/atlas/`, `src/`, `tools/` | MEDCOEL code. The pipeline now enforces the policy. |

### 4.3 Elsewhere in the repository

| Item | Finding | Status |
|---|---|---|
| `video/human-anatomy-3d/medcoel-3d-anatomy.mp4` | Owner-authorised promotional media. Recorded from the live atlas; per its README the takes show muscles, skeleton, vessels and lymphatic — not the nervous/visceral systems. | **Kept** (owner instruction). The owner should spot-check frames for withheld anatomy (head region: ossicles are tiny). |
| `video/kuis-anatomi-3d/*` | Owner-authorised. Thorax and skeletal quiz recording. | Kept; same spot-check. |
| `brand/video/ad/voices.mjs` | Mentions a TTS voice under **CC BY-NC-SA 4.0, "hanya untuk uji lokal"**. | **Separate issue, not removed.** Owner to confirm that no published ad uses that voice (ElevenLabs narration is confirmed paid). |
| `docs/panduan/*` | Mentions MMS-TTS (CC BY-NC) as an option. | Owner to confirm that no published media uses it. |
| `apps/web/public/*` (illustrations, simulasi, icons) | MEDCOEL original artwork. | Owner-authorised; kept. |
| `apps/web/src/...` | The Anatomy Library reads the atlas data, so quarantined structures show "tidak tersedia". | Updated. |

## 5. Residual risks (published, judged low)

- **Upstream attribution is presumed, not proven.** The remaining 2,237 structures are attributed to
  BodyParts3D/Z-Anatomy because the upstream notice lists no other model for them. If any were
  replaced upstream by another unlisted model, this audit could not tell.
- **Cerebral and intrarenal vessels** (`cardiovascular.glb`) follow the shape of the brain surface and
  kidney. Their triangle counts are multiples of 288, consistent with Z-Anatomy's own procedural
  tubes rather than copies of those meshes.
- **The skull in `skeletal.glb`.** The Dundee "Cranial Nerves and Foramina" model includes foramina.
  If Z-Anatomy adapted skull meshes from it, those would still be BodyParts3D-based, but carry
  Dundee's terms.
- **Region and system previews of the head** may contain a handful of ossicle pixels.
- **The atlas application code** is under CC BY-NC-SA 4.0 by the original author's choice (see
  LICENSE §3). This is an owner decision, not a model obligation any more.

## 6. Verification

`npm run test:licensing` (also in CI) and `scripts/licensing-quarantine.test.mjs` verify:

- public folders and every tracked binary are free of withheld content;
- the guard catches renamed copies, foreign GLBs with withheld node names, and catalogue entries;
- the stage scripts refuse to publish;
- the local servers return 404 for withheld paths even from a stale build;
- the pruned GLBs are reproducible from the originals, keep every retained mesh byte-identical, and
  contain none of the removed bytes.

The atlas e2e test asserts that the lab never requests a withheld model. Results are in
[`README.md`](README.md).
