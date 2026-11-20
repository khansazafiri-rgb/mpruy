# PR-B1 - Resource contracts and offline clearance validation

Authorized scope: implementation and Draft PR only. Base: `c0ec47f09c29e290e8717c0025853c07b4b26196`
on `claude/focused-wozniak-1ayrxa` (PR #224 and #225 merged). No runtime, hooks, route, migration, viewer,
dependency, medical dataset, production configuration or deployment change. PR-B2 remains unauthorized.

## Ownership of facts

| Fact | Authority |
|---|---|
| Studio identity, access, modality, declared datasets | Existing `shared/studios/catalog.v1.json` (24 + internal fixture) |
| Official dataset/release and source verification | `licensing/resources.v1.json.sources[]` |
| Exact source file, exported bytes, lineage, medical/privacy metadata | `resources.v1.json.assets[]` |
| Commercial/redistribution/adaptation rights, attribution and ShareAlike | Existing `commercial-rights-evidence.json` |
| Exact product build approval | Existing `commercial-release.json` |
| Withheld content | Existing quarantine policy, hashes and distribution scanner |

The resource index starts with **empty sources/assets**. It contains neither a duplicate studio catalog nor a second
rights-approval flag. `VERIFIED_SOURCE` describes source evidence, never acquisition or clearance of an asset. Legacy
14 evidence records and the two product policies are unchanged. Synthetic approval exists only inside test temp dirs.

## Contracts

Dependency-free ESM/JSDoc lives in `packages/studio-contract`. Catalog tests now use the same validators as the offline
inspector. Validators return `{ok:true,value}` or `{ok:false,errors:[{path,code,message}]}`. This is a documented JSON
Schema subset, not a complete 2020-12 implementation: unsupported keywords fail closed rather than being silently ignored.

Source fields: `id`, `publisher`, `officialUrl`, publisher `datasetId`, `release`, `doi`, `licenseId`, `status`, `evidence[]`.
Each evidence entry binds URL/local reference, release, checked date and retained evidence snapshot SHA-256.

Asset fields: `id`, `version`, catalog `datasetId`, `sourceRef`, `kind`, `dataNature`, `format`, relative build `path`,
`bytes`, `sha256`, `protected`, `rightsEvidenceRef`, `attributionRef`, `notice`, `dependsOn`, `derivation`, `sourceFile`,
`geometry`, `medicalReview`, `privacyReview`. `sourceFile` identifies the original URL, archive member and SHA-256.
Changed source bytes require a parent asset and an explicit operation/tool/version/pipeline/parameters chain.

Pending metadata may have null bytes/hashes, but is never eligible. Clinical/signal/spatial data needs geometry metadata;
the `details` field is a metadata attestation, not a DICOM/NIfTI/WFDB parser. Reviews bind reviewer/date/hash/use. N/A is
accepted only for reviewed technical code/dependency/test content, with a reason. This conservative pilot policy can be
extended later after medical/privacy review; there is no automatic N/A for public or CC0 data.

An asset's rights reference joins the existing ledger. Exact source license/release must agree with that record. Unknown,
NC, inferred, unverified or quarantined inputs cannot be eligible. The initial supported source-license allow-list is
CC0, CC BY 3/4, CC BY-SA 3/4, MIT, BSD-2/3 and Apache-2. Other grants need a separately reviewed policy change.
ShareAlike pilot derivatives retain the exact original SA version; the tool does not decide broader license compatibility.

## Offline release inspection

`node licensing/tools/inspect-studio-resources.mjs <studio-id> [build-root]`

The CLI only reads local files and prints JSON; it performs no fetch, write, stage, mount or approval. With committed
empty data, `brain-mri` exits **1** and remains ineligible. The exact studio release manifest must bind:

```json
{
  "schema": "medcoel.studio.v1",
  "id": "existing-catalog-id",
  "releaseId": "reviewed-release",
  "entry": "index.html",
  "builtFrom": "exact-40-character-git-sha",
  "files": [{"path": "resource-manifest.json", "sha256": "exact-sha256"}],
  "assetRefs": [{"assetId": "exact-asset-id", "version": "pinned-version", "sha256": "exact-sha256"}],
  "resourceManifestSha256": "exact-resource-manifest-sha256"
}
```

This is a shape illustration, not a valid approval or clinical sample. Every actual file except the self manifest is
enumerated; code and dependency bytes need rights coverage too. `resource-manifest.json` is included in the inventory
and bound to the inspected registry. Actual asset/notice hashes and byte counts must match. Traversal, URLs as build
paths, symlinks, reserved metadata, duplicate and unmanifested files are denied before scanning content.

The inspector joins the dependency closure, checks original source evidence and obligations, invokes the existing
quarantine scanner and calls `assertCommercialReleaseReady(..., {allowOwnerOverride:false})`. That helper's **default
remains true for legacy compatibility**, and still reports `rightsVerified:false` on an owner override. No existing
Atlas/4D approval is upgraded. New `studio:<id>` evidence scopes are admitted only from canonical catalog IDs supplied
by the inspector. Unrelated blocked legacy products do not prevent a genuinely independent, fully reviewed fixture.

No runtime or staging process consumes this inspector yet. B2/PR-C must wire the validated decision before a studio
can launch or be staged. Passing B1 does not establish end-to-end production enforcement, medical validity, consent,
copyright ownership, legal sufficiency, correct pixels, or safe behavior of executable third-party code. Human-reviewed
evidence remains essential; an offline checker cannot prove that an attested grant or screenshot is authentic.

## Acceptance evidence

`npm run test:studios` includes all 20 RESOURCE cases, eight original catalog tests, a trusted-base history check,
schema tests and additional mutation/quarantine/product-scope tests. All fixture data is neutral engineering content.

| ID | Covered behavior |
|---|---|
| RESOURCE-001 | Existing 24 studios + internal fixture remain closed |
| RESOURCE-002 | Unknown studio/source/dataset references denied |
| RESOURCE-003 | Verified source does not approve absent/pending assets |
| RESOURCE-004 | Catalog flags do not replace original rights evidence |
| RESOURCE-005 | NC/unknown/unverified/conflicting source/SA terms denied |
| RESOURCE-006 | Protected assets/data denied even with verified flags |
| RESOURCE-007 | Evidence, duplicate IDs, dates, hashes, unsupported schema fail closed |
| RESOURCE-008 | Unknown/self/multi-node lineage cycles denied |
| RESOURCE-009 | Parent hash/version/review/transform mismatch denied |
| RESOURCE-010 | Original source identity and privacy-review requirements |
| RESOURCE-011 | Annotation geometry and retained source evidence required |
| RESOURCE-012 | Signal metadata cannot bypass clinical review |
| RESOURCE-013 | Inferred provenance and undisclosed changed imagery denied |
| RESOURCE-014 | Traversal/URLs/symlink/duplicate/unmanifested file rejection |
| RESOURCE-015 | Strict studio override rejection and honest legacy behavior |
| RESOURCE-016 | Exact build/notice/product policy required |
| RESOURCE-017 | Fully bound neutral fixture positive path; legacy still closed |
| RESOURCE-018 | Empty registry valid metadata; every studio ineligible; CLI read-only |
| RESOURCE-019 | Public planning summary excludes keys/private docs/paths |
| RESOURCE-020 | Joint edits to catalog/frozen IDs cannot remove historical IDs |

`STUDIO-001 history` reads the trusted PR base SHA from CI, or the previous push commit. Checkout depth 2 supplies those
parents. If the base is unavailable, the test fails instead of skipping. For offline text snapshots only, callers may
provide `STUDIOS_BASE_IDS_FILE`; CI deliberately ignores that escape hatch. No catalog or frozen-ID file is rewritten.

Required regression: `test:licensing`, web test/lint/build, PocketBase unit/API on disposable CI data, anatomy integration,
Anatomy and 4D unit/build suites. No new install/download action is added by B1. The existing CI's locked installs and
PocketBase test binary setup remain unchanged.

## Baseline failures and next boundary

PR #225 records 4D UX e2e **13/16**, with open tri-planar/pad selector, pathology/pericardial state, and keyboard
`ArrowUp superior` failures. B1 does not edit, skip or claim those tests pass. Those browser tests are distinct from the
4D unit/build CI step. Any later browser rerun must report the actual result and investigate failures separately.

Stop at Draft PR-B1. No merge/deploy. B2 (server resolver/API), C (runtime/fixture/host/staging), D (Lab Hub), and E
(hardening) require their own authorized work. Do not activate a studio or copy legacy withheld assets into any fixture.
