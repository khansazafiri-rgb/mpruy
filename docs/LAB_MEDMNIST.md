# MEDCOEL Lab — ingestion with separate learning and practice samples

Only **PneumoniaMNIST 224px/test** ingestion is enabled. Lab UI, session length, database schema, and production services are unchanged. No BloodMNIST, PathMNIST, OCTMNIST, ChestMNIST, or DermaMNIST data is downloaded/imported by this change. There are no AI inference dependencies.

## Sampling policy

| Role | Normal | Pneumonia | Total |
| --- | ---: | ---: | ---: |
| Learning gallery | 10 | 10 | 20 |
| Practice bank | 5 | 5 | 10 |

Thirty source images are exported. Practice is capped at **5 images/class**, independently of the number of learning examples. This is the bank size, not the number of questions per sitting. Questions use image-level benchmark labels only: `Foto toraks ini termasuk kategori benchmark mana?` with Normal/Pneumonia choices and an empty explanation. No image-specific clinical descriptions, locations, bounding boxes, or lesion annotations are invented.

`sampling.py` is independent of the content adapter and API:

- Config: `learning_per_class=10`, `practice_per_class=5`, `seed=20261026`.
- Versioned algorithm: `prefix-learning-sha256-practice-v1`.
- Learning retains the first 10 indices per class, preserving the legacy gallery images, filenames, and asset slugs.
- Practice ranks the remaining indices per class by SHA-256 of algorithm/dataset/source-checksum/split/seed/class/index, then selects 5. No RNG/library-version-dependent shuffle.
- Each source index can appear in only one role. Insufficient class samples fail clearly; there is no automatic overlap fallback.
- Scalar integer single-label arrays only; multi-label/fractional labels are rejected.
- Practice filenames are opaque hashes: they do not encode the source class or sample index. Learning filenames stay compatible with the existing labeled gallery.

The generic sampler accepts any explicit class mapping. Synthetic tests exercise 4/8/9 classes and learning counts above 5. `dataset_registry.py` records disabled future configurations: BloodMNIST (8), PathMNIST (9), OCTMNIST (4). They require individual license/content review and a dataset-specific content adapter before enabling ingestion. ChestMNIST is blocked as multi-label; DermaMNIST is excluded for CC BY-NC 4.0. Metadata is not a license approval. Unknown datasets are disabled.

Reference for task/label/license metadata: [official MedMNIST info.py](https://github.com/MedMNIST/MedMNIST/blob/main/medmnist/info.py). Software license is not treated as the dataset/image license. PneumoniaMNIST metadata/checksum remains the same as the previous importer: CC BY 4.0, official Zenodo source, MD5 `d6a3c71de1b945ea11211b03746c1fe1`.

## Migrating the published 20-question pack

All old questions reused images from the labeled gallery. To make learning/practice disjoint while retaining that gallery, the importer creates 10 replacement questions using different images and deprecates **all 20 old questions**, including the previous extra 10. Existing gallery/object/pathway slugs stay stable; the new practice questions retain the sample-based slug convention.

There is no hard-delete API call and no SQLite access. With explicit `--apply --update-existing`, each obsolete importer-managed question:

1. Receives a `Deprecated · ` title prefix and is saved through the canonical revision-checked admin PUT, returning it to draft.
2. Loses its relation to the active practice object and its pack relation.
3. Joins `pneumoniamnist-arsip-ingestion`, a draft operational archive object outside the pack/pathway. Other object links and original question data remain available to admins.

The archive is not published. Its questions are excluded from pack publishing, inaccessible through the student answer endpoint while draft, and no longer counted in the active practice object. The pack ends with 30 assets, 2 objects, 10 questions, and 1 pathway. The additional archive object and retained old questions live outside it.

The pack is resolved by its canonical slug first. Older installations may have a different pack slug: the importer can follow the single consistent pack ID attached to the known PneumoniaMNIST lessons and linked questions/assets, requiring dataset provenance and a successful pack lookup by ID. It reuses that ID and original slug, does not rename or create a duplicate pack, and records the resolved identity in the private manifest. Conflicting IDs, missing provenance, or an unreadable/dangling pack ID stop before any writes. The publish CLI uses the same fallback for its standard `pneumoniamnist` alias. Manually authored/unrecognized questions remain blocked.

The read-only plan lists current/target counts, source overlap, and every obsolete slug/revision/action. Ownership requires the importer question naming pattern, image-identification type, expected pack/legacy-unassigned membership, and PneumoniaMNIST asset provenance. Unrecognized/manual questions linked to the practice object stop the sync before writes for human review.

Create-only `--apply` refuses this legacy migration before writing anything: `--update-existing` is required. All writes are draft-only, use current revisions, preserve supported admin edits (annotations, blocks, tags, related/legacy links and verified license), and skip unchanged records. Existing questions can be reactivated safely if a later selection changes; the importer removes the archive relation when restoring them to the practice object.

A client sync consists of separate API requests, not one transaction. A conflict stops it; earlier successful draft writes can remain. Review the next dry-run and rerun safely. It retires old questions before creating new drafts and verifies final practice membership after an apply/update run. It never auto-publishes. Unchanged published records retain their status/review; actually modified records return to draft.

## Manifest and files

PNGs remain in the existing ignored directory:

`apps/web/public/lab-content/medmnist/pneumoniamnist/`

The v2 operational manifest moves to ignored, non-public storage:

`tools/lab-ingest/cache/manifests/pneumoniamnist-v1.json`

It has separate `learning` and `practice` sections, per-class counts and files, source sample index/class/role/split, source MD5, seed/algorithm/config, overlap=0, and retirement plan receipts. Selection is revalidated before export/sync. If a legacy public `manifest.json` exists locally, it is explicitly moved to a checksum-named backup in the private manifest directory. A subsequent normal web build removes its old dist copy. No API/sample metadata additions are exposed to students; existing safe student serializers are unchanged.

Raw NPZ/cache and exported PNGs are not committed. Existing images/records are retained, so changing future seeds may leave unused exported files and detached drafts for a later explicit retention review. Do not delete them automatically.

## CLI

Default remains dry-run. It may download/cache the official Pneumonia archive and export PNGs locally, but makes no PocketBase content writes. Adding `--update-existing` authenticates for a read-only current-content plan.

```bash
python tools/lab-ingest/import_medmnist.py --dry-run --update-existing
python tools/lab-ingest/import_medmnist.py --apply --update-existing
```

Optional flags:

```bash
--learning-per-class 10 --practice-per-class 5 --selection-seed 20261026
```

`--per-class` remains a compatibility alias for **learning only**. Practice values outside 1..5 are rejected before downloads/API access. The current Pneumonia adapter limits learning to 10/class because the existing object schema supports 20 gallery assets; future multi-class adapters must shard larger galleries rather than changing production limits. The generic sampler itself has no 5-image learning cap.

## Local tests

Use Python 3.10+ and the unchanged requirements (NumPy/Pillow). Offline tests use tiny synthetic arrays and a fake API; no dataset/model download:

```bash
python -m unittest discover -s tools/lab-ingest -p test_sampling.py -v
python -m unittest discover -s tools/lab-ingest -p test_pack_resolution.py -v
```

A path-scoped GitHub Actions workflow runs those offline tests on Python 3.10. Existing Lab checks:

```bash
node --test apps/pocketbase/test/lab.test.mjs apps/web/src/features/lab/*.test.mjs
```

API tests require a **disposable localhost PocketBase** with the current migrations, a local test superuser, and an active local MEDCOEL admin account. Never use a production proxy/port-forward as the target:

```bash
PB_URL=http://127.0.0.1:8098 node apps/pocketbase/test/lab-api.test.mjs
PB_URL=http://127.0.0.1:8098 node apps/pocketbase/test/lab-pack-api.test.mjs
MEDCOEL_API_BASE=http://127.0.0.1:8098 \
MEDCOEL_ADMIN_IDENTITY=LOCAL_ADMIN MEDCOEL_ADMIN_PASSWORD=LOCAL_TEST_PASSWORD \
python tools/lab-ingest/test_ingest.py
```

The fixture constructs a published legacy 20-question pack, verifies no-write dry-run/create-only refusal, revision conflict handling, safe retirement, exact 10/5 counts, zero overlap, preserved admin edits, unchanged publication status, idempotence, private sample metadata and canonical publish CLI. Publication happens only inside that disposable test fixture.

### Verification results for this refactor

Pack-resolution follow-up: 10 targeted offline regressions cover noncanonical slugs, exact production-shaped references, reuse/idempotence, publisher resolution, ambiguity/dangling IDs, missing provenance, unrelated content, manual questions, and non-404 API errors. The 15 sampler tests were rerun with this fix; all 25 tests passed. No production calls or frontend changes were made.

- 15 offline Python tests passed, including synthetic export, cap enforcement, 4/8/9-class balance, disjointness, deterministic selection, re-selection, manifest privacy, dry-run writes=0, idempotence and publication status.
- 32 ingestion API checks passed against disposable PocketBase 0.40.5: legacy old20 → retained draft archive, 30 assets / 10 active questions, overlap=0, review/revision preservation and canonical publish flow.
- 32 existing backend/frontend Lab unit tests passed.
- Existing Lab API suites passed: 102 HTTP checks and 106 pack/progress/publishing checks.
- Python sources parse under Python 3.10 grammar. Local execution used Python 3.12 with the existing NumPy 2.3.5/Pillow 12.3.0 runtime; the new CI job targets Python 3.10.
- Frontend build/lint was not rerun: no frontend, schema, hook, dependency, or session-length source changed. Production builds are required later only to serve newly exported practice PNGs.
- No real MedMNIST dataset was downloaded for tests; only synthetic arrays and sample identities were used. No production importer or publisher was executed.

## Later production commands — manual only, not executed by this PR

Only after review and a **manual merge** to `main`. Confirm the checkout path; the existing runbook uses `/opt/medcoel`. No backend schema/service changes are needed for this ingestion-only change. Use the existing `/opt/medcoel-ai/.venv`; requirements are unchanged.

### 1. Pull

```bash
cd /opt/medcoel
git fetch origin
git switch main
git pull --ff-only origin main
source /opt/medcoel-ai/.venv/bin/activate
```

Read admin credentials without putting them into history:

```bash
read -r -p 'Admin MEDCOEL username/email: ' MEDCOEL_ADMIN_IDENTITY
read -r -s -p 'Admin MEDCOEL password: ' MEDCOEL_ADMIN_PASSWORD
echo
export MEDCOEL_ADMIN_IDENTITY MEDCOEL_ADMIN_PASSWORD
export MEDCOEL_API_BASE=https://medcoel.com
```

### 2. Dry-run, then build the newly exported assets

```bash
python tools/lab-ingest/import_medmnist.py --dry-run --update-existing && npm ci && npm run build
```

Inspect the private manifest and all retirement entries. Expected: learning 10/class, practice 5/class, overlap 0, current 20 → target 10, obsolete 20 → retained draft archive. A failed dry-run stops this command chain. `npm ci` first synchronizes the already-declared lockfile dependencies (including `three` used by the existing Lab UI). Build follows export so all new practice PNGs exist before any draft is published. Build is needed only to copy the new static image files; UI source is unchanged. Do not run the general deployment script or reset/restart PocketBase for this task.

### 3. Apply drafts

```bash
python tools/lab-ingest/import_medmnist.py --apply --update-existing
```

Review the 10 new assets/questions and verify licensing/citations in `/admin/lab`; new assets intentionally default to `license.verified=false`. Set verification through the existing admin editor. Alternatively, **only after explicitly checking rights**, rerun with `--license-verified` to mark source licensing verified. That flag never publishes content.

### 4. Validate the plan and pack

```bash
python tools/lab-ingest/import_medmnist.py --dry-run --update-existing
python tools/lab-ingest/publish_pack.py pneumoniamnist --dry-run
```

Expected on the importer rerun: 0 creates/updates/retirements; 10 current practice members. Pack validation must pass after license review. Inspect admin pack counts: assets=30, objects=2, questions=10, pathways=1. The archive and old20 questions must not be members. Drafts are not student-visible until manual publication.

### 5. Publish only after human review

```bash
python tools/lab-ingest/publish_pack.py pneumoniamnist --apply --confirm-reviewed
python tools/lab-ingest/publish_pack.py pneumoniamnist --dry-run
```

Verify `/lab/objek/pneumoniamnist-latihan-klasifikasi` now exposes 10 questions and the learning gallery still has 20 examples. Keep `pneumoniamnist-arsip-ingestion` draft. Do not include retained questions in an unrelated bulk-publish action. Clear credentials:

```bash
unset MEDCOEL_ADMIN_PASSWORD MEDCOEL_ADMIN_IDENTITY
```

No commands in this production section were executed as part of this task. No pack was imported/published on production, and the PR is not merged or deployed automatically.
