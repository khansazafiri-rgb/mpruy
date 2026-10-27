# Reusable MedMNIST authoring media

`stage_authoring_media.py` selects the same test-split examples as the existing
MedMNIST adapters and registers PNGs as **draft** `lab_media`. It does not create
legacy Lab records, publish sources or media, or alter existing reviewed sources.

Run from the repository root with the Lab Python requirements installed:

```sh
python tools/lab-ingest/stage_authoring_media.py --dataset all
```

The default is a dry run. It downloads and checksum-verifies missing official
NPZ files, exports selected PNGs only under the private
`tools/lab-ingest/cache/authoring-media/` directory, and writes private manifests
under `tools/lab-ingest/cache/manifests/`. It makes no API writes. With admin
credentials in `MEDCOEL_ADMIN_IDENTITY` and `MEDCOEL_ADMIN_PASSWORD`, the dry run
also reports how many media keys already exist.

After reviewing the counts and source metadata, staging can be explicitly
requested with `--apply`:

```sh
python tools/lab-ingest/stage_authoring_media.py --dataset all --apply
```

The command supports `pneumoniamnist`, `bloodmnist`, `pathmnist`, `octmnist`, or
`all`. Expected selections are 30, 64, 54, and 32 respectively: 116 learning,
64 practice, 180 unique images, and zero overlap. Existing media with the same
key and source are skipped. A key owned by another source stops the run. Existing
source records are only read, so prior human review and publication state are
preserved. A missing source is created as an unverified draft. Staged media
still require ordinary source/license and content review before publication.

The private manifests record source indices, internal labels, roles, checksum,
selection version, and media keys. They must not be copied into
`apps/web/public` or served to students. Practice media titles, alt text, keys,
and uploaded filenames are generic; answers remain in authoring data only.

For authored learning galleries, `gallery` blocks may continue using `assets`,
or use `items` with an asset key, optional title, and plain-text caption.
`authoring_gallery.gallery_items()` builds these cards from selected learning
rows and the existing curated class profiles for all four datasets. Captions
describe class-level features to look for; they are not image-level findings.
