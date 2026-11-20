# 14 — Final WS1–WS5 integration and staging readiness

Date: 2026-11-20. Integration PR: #233 (Draft). No merge, production deployment, medical-data download, clearance approval or public activation is performed by this PR.

## Git reconciliation

- Target: claude/focused-wozniak-1ayrxa at c489f724d7ad926f6b6083f60556ebecbcfa89d6 (#228 / WS1).
- Source: feature/studios-all-24 at 970f6435790b7b1add33467226440ea7b6d840fa.
- Merge base: 9d047551e052fd9de19dbcc1520086a527be891f (WS1).
- The target and merge-base trees are exactly identical: 32fa44f2e49fc6ba767297dd211d571e7257f937.
- Source was four original commits ahead and one merge commit behind. A two-parent merge, with target as first parent, safely reuses source tree 9d920dc16113fe09e20f415315f5851f03abcba9.
- Original WS1–WS5 commits are retained, not cherry-picked or recreated. The nested merge commits from #229–#232 are not required to reproduce their already-ancestral implementation commits.
- Additional integration changes are limited to validation, an API regression assertion, CI and documentation. No engine, viewer or legacy runtime is rewritten.

## What is integrated

| Workstream | Original commit | Contents |
|---|---|---|
| WS1 / #228 | 9d047551e052fd9de19dbcc1520086a527be891f | Signed clearance/attestation, immutable installation, sessions, per-asset authorisation |
| WS2 / #229 | 612b2d63455989a959898d5cecf4e898006db045 | Independent apps/shell, volume engine/NiiVue, Brain MRI, server Challenge |
| WS3 / #230 | 46fbdab5ed2a79e73ad37401f961f4a4660cc20f | Brain Anatomy, 3D engine, Identify/Find/Type, portable server grader |
| WS4 / #231 | 3dca0c6025a470b73c8a7fbbe53a7bbe7bab79d5 | ECG/WFDB and Chest CT, geometry and reader annotations |
| WS5 / #232 | 970f6435790b7b1add33467226440ea7b6d840fa | All 24 apps, generic volume/image2d, region preparation, registry, resource matrices |

Exactly 24 canonical apps: nine anatomy3d, seven volume, seven image2d and one ECG. Each has its own entry, configuration, dist and manifest. The internal foundation-fixture is not a 25th clinical app.

The source completion matrix records 13 private-review data integrations, ten technical-fixture-only studios and one blocked cardiac-ct. Those statements describe the source author's private workspace, not data installed on a server or reproduced in this integration session.

## Repository facts and clearance

The exact committed registry contains **five sources and 35 assets**, not the 34 mentioned in the WS5 PR narrative. This is a documentation reconciliation; do not delete an asset to make the old count match.

- Source status: three VERIFIED_SOURCE, two REVIEW_REQUIRED.
- Rights ledger: 27 records; the 14 legacy records are unchanged; 13 appended studio records are needs-review. Zero verified rights records.
- All 35 assets have pending medical/privacy reviews.
- All 35 currently have sourceFile null and a zero pipelineCommit placeholder. These are incomplete provenance metadata, not acceptable exact-source/processing evidence for release. Recover original acquisition/processing records and exact input/member hashes later; never replace them with invented evidence or label the integration merge commit as the processing commit.
- Canonical catalog, schema and frozen IDs, Atlas/4D release policy, quarantine policy and quarantine hashes are unchanged.
- No receipt is issued for any canonical studio. Test-only engineering receipts do not approve clinical resources.
- B1's strict clearance remains mandatory. A verified publisher/source never implies approved asset, diagnosis key, private installation or commercial release.
- Old quarantined nervous.glb is never used or reactivated.

All 24 studios remain fail-closed for users and admins. The existing test-only catalog cannot activate canonical IDs. No owner override is enabled for new studios.

## Fresh integration validation

The existing CI runs on the integration commit: web, PocketBase units, Studio/B1 contracts, licensing/quarantine, engine units and all builds, Anatomy, 4D units, Hermes, real role/Lab/decks/Study APIs, Studio API, secure API and Challenge API.

New .github/workflows/studios-integration.yml adds:
1. INTEGRATION-001…008: ancestry, untouched catalog/policies/legacy, 14 old rights records, 35 pending assets, 24 apps, exact build manifests/bytes and closed user/admin decisions.
2. Real Chromium fixture smoke for every app in Explore and Guided (48 page loads), plus generic 2D/volume Guided flows.
3. Unmodified 4D UX browser assertions on the target base and integration head, in separate jobs. Their real failures remain failed checks, with JSON/log artifacts. Tracked historical results are deleted before testing; fresh evidence binds the run ID, attempt, checkout SHA, execution time, result hash and actual exit code, and all 16 original assertions must execute.
4. A comparison job rejects missing tests/results or any newly failing 4D assertion. Passing this comparison does not turn raw failed tests green.

The real PocketBase studios-api suite now attempts launch for every visible studio, with both real user/admin accounts, and asserts 409 without a launch URL.

Browser jobs pin Ubuntu 24.04 and Playwright 1.56.1 in RUNNER_TEMP only; no project dependency or lockfile is changed. CI uses labelled generated technical fixtures only, never local-data or medical-data downloads. Artifacts contain logs and inventory metadata, never dist, private data, answer files or secrets.

Actual results live in the PR checks, logs and final PR description. Historical WS results in documents 10/12/13 are not fresh integration results.

The three previously recorded 4D UX failures (tri-planar/pad, pathology/pericardial, keyboard ArrowUp superior) are not removed, skipped or repaired in this integration. Report actual new totals, even if they differ from historical 13/16. Safari/iPad hardware and real GPU coverage are still outstanding. Standalone fixture browser smoke and real secure API tests do not prove every studio viewer renders through the authenticated host under production CSP; this remains a staging acceptance gate.

## Build and resource-manifest consistency

The guard checks each independent build's ID, exact builtFrom commit, safe inventory, SHA-256 and byte length of every file, all-file inventory equality, exact resource-manifest digest and registry content, and explicit fixture data status.

A manifest describes bytes; it is not a clearance grant. Pending registry references in a fixture build cannot make those fixtures approved clinical resources. The build manifest may inventory server-only files, but authenticated delivery refuses server paths; positive delivery/Challenge tests cover this boundary.

No dist or local-data is tracked. A --private build may fall back to fixtures when prepared private data is absent. Therefore an exit code 0 from --private is not proof of actual clinical data installation: inspect each returned dataKind and dataset status, then verify bytes independently against approved provenance.

## Staging prerequisites — not executed here

| Area | Requirement / current state |
|---|---|
| Disk | Re-run df and du on the intended staging VPS first. The old ~21 GB free figure is not verified. |
| Prepared resource bytes | Registry totals 99,505,628 bytes (~94.9 MiB), across 35 files. This is metadata, not proof those files currently exist locally or on the VPS. |
| Full installation size | Add app bundles, all notices/dataset metadata, server-only keys, installed copies, manifests and raw/processing data. CI inventory measures fixture build bytes only. |
| Capacity | Let D be the measured complete installed release set and R be retained raw/processing bytes. Plan at least R + 4D (workspace, active, rollback, independent backup), then add log/cache and free-space headroom. Do not infer D or R from dataset collection size. |
| Runtime | Existing pinned PocketBase 0.40.5; Node compatible with the current lockfiles (CI Node 22). No new PocketBase collection/migration for this integration. |
| Licensing files | PocketBase must read the exact deployed licensing directory and resource/rights/release policy bytes used to issue receipts. A registry edit invalidates old evidence-bound receipts. |
| Private resource root | MEDCOEL_STUDIO_ROOT, normally /var/lib/medcoel/studios; outside all public roots, not writable by learners. Preserve raw resources separately from installed immutable bytes. |
| Secrets | MEDCOEL_STUDIO_KEYS, MEDCOEL_STUDIO_SIGNING_KID for tooling, MEDCOEL_STUDIO_SESSION_KID for server. At least 32-character secrets; server environment/secret storage only; no production keys provisioned here. |
| Licensing root | MEDCOEL_STUDIO_LICENSING_ROOT must point to the correct deployed licensing directory, or default layout must be preserved. |
| Production flags | MEDCOEL_DEV_MODE unset/disabled; no MEDCOEL_STUDIO_TEST_CATALOG; Secure HttpOnly SameSite=Strict session cookies under HTTPS. |
| Caddy | Existing /api/* proxy handles authenticated asset delivery. No new public static /studio-assets mount. Verify effective X-Frame-Options/CSP on staging: the global DENY header may conflict with same-origin frames depending on response-header handling. If a scoped exception is required, obtain approval and test it separately; this PR does not change Caddy. |
| Origin isolation | Same-origin first-party iframe is not protection against hostile studio code reading host storage. A separate studio origin requires owner-approved DNS/Caddy/auth-exchange work before third-party content. |
| Private acquisition | No raw or converted dataset copied by this PR. Locate the authorised private workspace or reacquire only with approval, then verify original hashes and medical/privacy provenance. |
| Stage/receipt/attest | Use existing studio-release.mjs on exact installed bytes; receipt must still fail while rights/provenance/reviews are pending. Do not weaken policies to make staging launch succeed. |
| Operations | Re-attestation timer, revocations, key rotation, service restart procedure, backup and restoration must be prepared and tested separately. |

Do not install local-data wholesale into a public or PocketBase pb_public directory. No clinical resource, raw DICOM metadata, patient identifiers or server answer keys belong in public static delivery.

## Readiness checklist

- [x] One integration PR targets the real integration branch.
- [x] Original WS commits retained; source tree reconciled against the target.
- [x] Catalog and legacy runtime changes are guarded; pending rights are not promoted.
- [x] Fresh integration CI/browser/API checks are defined without clinical data.
- [ ] All fresh checks reviewed against the exact final head; actual 4D failures explicitly reported.
- [ ] Owner approval to merge. This PR is Draft and must not auto-merge.
- [ ] Staging disk, secret provisioning, server paths and private dataset availability verified.
- [ ] Original-file/pipeline provenance, rights, anatomical/clinical/privacy review and exact build approved.
- [ ] Private runtime staging smoke, backups/restoration and operational checks passed.
- [ ] Separate owner approval for production/public activation.

Code integration and production readiness are separate outcomes. Nothing in this checklist authorises merge, deployment, clearance or a public studio.
