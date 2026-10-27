# MEDCOEL Lab V1 authoring rollout

`shared/lab-taxonomy.json` defines the seven academic roots and the four stable
dataset module identities. Explore uses one filter per academic root. Legacy
domain query links still work. PathMNIST's existing `clinical_pathology` records
are displayed and filtered as Histologi & Histopatologi; stored records, direct
URLs, pathways, and progress are retained.

| Dataset | Root | Topic | Module key |
| --- | --- | --- | --- |
| PneumoniaMNIST | Pencitraan Medis | Chest X-Ray | `cxr-normal-pneumonia-v1` |
| OCTMNIST | Oftalmologi | OCT Retina | `oct-retina-dasar-v1` |
| PathMNIST | Histologi & Histopatologi | Histologi Kolorektal | `histologi-kolorektal-pathmnist-v1` |
| BloodMNIST | Patologi Klinik | Hematologi | `sel-darah-perifer-bloodmnist-v1` |

The published OCT module and its `imaging-retina` child are reused. Once a known
replacement module and its catalog placement are published, Explore prefers
the authored module and excludes its legacy dataset cards before pagination.
Legacy direct URLs and Guided Learning remain accessible. Draft replacements
do not hide legacy material. Empty fields have no fake modules and show a quiet
“segera hadir” message only when selected.

## Offline generators for the remaining three datasets

The generator consumes PR #44's private `authoring-media-*.json` manifests,
plus saved admin media and source inventories. It neither selects new samples
nor downloads/uploads image bytes. `all` means Pneumonia, Blood, and Path;
OCT is deliberately excluded to preserve its existing module.

Save fresh JSON responses from these existing admin endpoints into the private
cache folder (use an authenticated admin session or the existing `MedcoelAPI`
client; never paste tokens into authoring JSON):

- `GET /api/medcoel/admin/lab-authoring/media` → `cache/media-inventory.json`
- `GET /api/medcoel/admin/lab-authoring/records?kind=source` → `cache/source-records.json`

Then run from the repository root:

```sh
python tools/lab-ingest/generate_authoring_bundle.py --dataset all \
  --media-inventory tools/lab-ingest/cache/media-inventory.json \
  --source-records tools/lab-ingest/cache/source-records.json
```

Outputs go to `tools/lab-ingest/cache/authoring-bundles/`, never the web public
directory: bundles contain answer keys. Missing or mismatched registered media,
unsafe practice titles/alt text, changed selection/checksum metadata, or overlap
stop generation. Existing source data from the fresh snapshot is copied intact,
including verification, policies and disclosure. New sources begin unverified;
new module policies require human review. Refresh stale snapshots before use
and inspect the authoring preview for unexpected source changes.

Each bundle has a short sourced orientation, labeled rich learning cards from
the curated class profiles, a secondary comparison table, and a separate
practice bank. Existing adapter options and answer mappings are reused. Teaching
captions describe class features to look for, not reviewed findings on a specific
image. Expected counts are 20/10, 40/24 and 36/18 learning/practice respectively.
With OCT's 20/12, the pool remains 116 learning + 64 practice = 180 unique images.

Import JSON through the existing preview/apply workflow to create drafts, inspect
the student preview, and complete human source/content review before any explicit
publication. Generating a file changes no API records. This PR performs no
deployment, staging, or production publication.
