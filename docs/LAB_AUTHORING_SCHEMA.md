# MEDCOEL Lab Authoring Schema V1

Use this file with [the machine-readable JSON Schema](LAB_AUTHORING.schema.json) to generate ordinary Lab content without changing application code. The [complete example](LAB_AUTHORING_EXAMPLE.json) can be pasted directly into **Admin → MEDCOEL Lab → Import / Edit Lab JSON**. The admin workflow is **Paste → Validate & Preview Changes → Apply as Draft → human review → Publish**. No import publishes automatically.

## Bundle and stable keys

Top level: `{ "schemaVersion": 1, "records": [{ "kind": "module", "data": { ... } }] }`. `records` can hold `source`, `guide`, `catalog`, `module`, and `placement`. Every record and nested chapter, section, block, bank, question and pathway has a stable lowercase hyphenated `key`. The key controls upsert; a title can change without moving the identity. One bundle may create linked records together. At most 100 records per import; split larger work into batches.

`catalog` has `key`, `title`, optional `parent`, `summary` and `order`. Parent is another catalog key; there is no fixed subject/chapter/topic depth. `placement` has `key`, `title`, `module`, `catalog` and optional `order`. Multiple placements can point at the same module without copying lessons or questions. Publish parent catalogs and the module before placements. A circular parent chain is rejected.

`module` has `key`, `title`, optional `summary`, `sources`, `chapters`, `questionBanks`, `pathways`. A chapter has `key`, `title`, `sections`; a section has `key`, `title`, `blocks`. A pathway has `key`, `title`, `sections` (section keys in suggested order). Section keys are unique across a module. Use medical subject names for student-facing titles; dataset names belong in asset provenance and attribution.

## Blocks

Every block has `key`, `type` and optional `title`. Currently supported types:

| Type | Required fields | Purpose |
| --- | --- | --- |
| `text` | `text` | Paragraphs, safely rendered as text |
| `image` | `asset` | One registered image key |
| `gallery` | `assets` | Ordered image keys, up to 50 |
| `compare` | `left`, `right` | Two different registered images |
| `identification_guide` | `guide` | Reusable guide key |
| `identification_table` | `columns`, `rows` | Text-only table; every row matches column count |
| `callout` | `text`, optional `tone` | Info, tip or warning |
| `source_disclosure` | `sources` | Show source keys, citation and licence |
| `practice` | `bank` | Render a question bank as a practice session |

Future `hotspot`, `layer_explorer`, `exploded_view`, `model_3d`, `image_stack`, `dicom_stack`, `waveform` and `question_bank` need a registered validator and renderer before use. V1 rejects them explicitly. This protects students from silently blank sections or executable HTML.

## Questions and guides

`questionBanks` contains banks with `key`, `title`, `questions` (up to 100 per bank). Each question has `key`, `type` (`single_best_answer` or `image_identification`), `prompt`, 2–8 distinct labelled `options`, `answer` matching a label, optional `explanation`, `asset`, `sources`, `tags` and `difficulty` (`intro`, `intermediate`, `advanced`). `image_identification` requires an asset. Answers and explanations stay on the server until a student submits a response. A `practice` block refers to a bank key within the same module.

`guide` has `key`, `title`, `subject`, `scope` (`module`, `chapter` or `section`), `steps` with `title` and `text`, and optional `sources`. A module can reuse the same guide in multiple sections. Existing MedMNIST class guides continue through their current compatibility path; this library is for newly authored modules and does not rewrite them.

## Media and sources

Authoring JSON contains asset keys, never filesystem paths or Google `lh3` URLs. Register a `source` first: `key`, `title`, `role` (`asset` or `reference`), HTTPS `url`, `license` (`name`, HTTPS `url`, `citation`, `verified`, `commercialUse`, `redistribution`, optional `attributionRequired`), optional `ingestionAllowed`, `datasetReviewRequired`, `policies`, `disclosure`. A reference-only source cannot authorize image ingestion. An asset source must be published, verified, permitted for ingestion, commercial use and redistribution before media can be published. If dataset-specific review is required, add an explicitly reviewed policy for each module using it. `policies` entries have `collection` (module key), `allowed`, `reviewed` and `note`. A policy can restrict the base licence, never grant missing rights.

Use the admin asset form to upload a PNG/JPEG/WebP image (20 MB maximum) or register an existing HTTPS image. Give it a unique `key`, `title`, `alt` and `sourceKey`. The server returns the stable key and serves uploaded media from PocketBase. A JSON block uses that key in `asset`, `assets`, `left`, `right` or question `asset`. Replacing an image requires a new key. A ZIP/media pack importer is not part of V1; individual upload is the supported path. The server never downloads a remote URL during JSON import.

## Upsert, validation, export

A new module needs its full title and content. An update may send only `{ "kind": "module", "data": { "key": "ecg", "chapters": [{ "key": "rhythm", "sections": [{ "key": "af", "title": "Atrial Fibrillation", "blocks": [{ "key": "intro", "type": "text", "text": "..." }] }] }] } }`. The importer merges chapters, sections, blocks, banks, questions and pathways by key. Omitted siblings remain. Updated nested items still need all required fields for their own type. `op: "delete"` is rejected; V1 offers no deletion operation. Existing published data stays visible until a reviewed draft is manually published.

Validation checks type and size caps, unique keys, structural references, existing media, source role and publication dependencies, unsupported types, and question answers. Preview lists CREATE/UPDATE/UNCHANGED and changed paths. A stale preview token or changed revision prevents apply. Import is transactional and idempotent. The admin can export a module with its placements and referenced source, guide and catalog records in the same bundle format; uploaded media are separate and remain referenced by stable key.
