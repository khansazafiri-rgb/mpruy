# MEDCOEL Clinical Studios v2.0

24 independent clinical applications over shared anatomy3d, volume/NiiVue, ECG and image2d engines.
**No canonical studio is eligible for learner launch.**

Latest QC: [23 November 2026 — all 24 studios](32-final-end-to-end-qc-2026-11-23.md), with [machine-readable per-studio evidence](final-qc-2026-11-23.json). Six source-compatible private pipelines pass bounded engineering checks; no studio has release approval. Historical statements below are not a fresh full-registry reproduction or current clearance.
Integration history: WS1–WS5 were consolidated by merged PR #233. Git integration does not install private medical resources on a server.

| Document | Content |
|---|---|
| [00-baseline-audit.md](00-baseline-audit.md) | Historical baseline at PR #222 |
| [01-architecture-decisions.md](01-architecture-decisions.md) | Architecture decisions |
| [02-feature-compatibility-matrix.md](02-feature-compatibility-matrix.md) | Legacy feature preservation |
| [03-studio-catalog.md](03-studio-catalog.md) | Canonical 24 studios and internal fixture |
| [04-data-license-matrix.md](04-data-license-matrix.md) | Original resource/license gap matrix |
| [05-contract-specification.md](05-contract-specification.md) | Catalog, availability, launch, adapters and quiz |
| [06-test-acceptance-plan.md](06-test-acceptance-plan.md) | Foundation acceptance plan |
| [07-resource-reconciliation-pr-b.md](07-resource-reconciliation-pr-b.md) | B1 contracts and offline clearance |
| [10-secure-launch-and-delivery.md](10-secure-launch-and-delivery.md) | WS1 receipts, attestation and authorised delivery |
| [12-MEDCOEL-24-STUDIOS-RESOURCE-MATRIX.md](12-MEDCOEL-24-STUDIOS-RESOURCE-MATRIX.md) | Source-workstream resource research and acquisition notes |
| [13-24-studio-completion-matrix.md](13-24-studio-completion-matrix.md) | Source-workstream per-studio status and coverage limits |
| [14-final-integration-readiness.md](14-final-integration-readiness.md) | Final Git reconciliation, fresh test coverage, provenance gaps and staging prerequisites |
| [19-free-core-licensing-validation.md](19-free-core-licensing-validation.md) | Verified source-level licensing research, free core vs optional video boundary, and unresolved exact-file/rightsholder clearance | 

## Integration status

| PR | Scope | Verified state at preparation of #233 |
|---|---|---|
| #224 | Canonical catalog and architecture | Merged |
| #226 | B1 resource contracts / offline clearance | Merged |
| #227 | Unified foundation: availability API, host/fixture and typed quiz contract | Merged |
| #228 | WS1 secure launch, receipts, installation and delivery | Merged into claude/focused-wozniak-1ayrxa |
| #229–#232 | WS2–WS5, 24 apps/engines and resource registry | Merged into stacked feature bases; original commits consolidated by #233 |
| #233 | Final WS1–WS5 integration and fresh verification | Merged into claude/focused-wozniak-1ayrxa |
| (this PR) | Master execution: provenance lineage + reproducibility, review workflow, learner progress, full-stack e2e, PTX-498/HC18/AMOS, legal packages, reviewer preview, computed status | Draft; not merged or deployed |

Canonical sources remain shared/studios/catalog.v1.json, licensing/resources.v1.json and the existing commercial rights/release/quarantine ledgers. After the master-execution PR the registry contains **eight sources, 46 official raw inputs and 54 derived assets** (lineage + real processing commit, reproduced byte-for-byte), all with pending medical/privacy review. The 14 original rights records remain unchanged; 25 appended studio records: 24 needs-review and 1 blocked (LPBA40, LONI non-commercial licence). Status per studio: [`studio-status.v1.json`](studio-status.v1.json).

New documents: [15 — human review workflow](15-human-review-workflow.md), [16 — licensing & legal packages](16-licensing-legal-packages.md), [17 — staging, QA, security](17-staging-qa-security.md).

Run npm run test:studios and npm run test:licensing. The integration browser workflow also builds all 24 fixture apps before running scripts/studio-final-integration.test.mjs. Actual CI and browser results are attached to the PR, not inferred from historical reports.

Legacy Atlas, 4D Lab, Lab Hub, Study Planner, Hermes, production configuration and existing lockfiles are preserved. The legacy UX harness uses explicit navigation and mode transitions: it exits Tri-planar through the visible return-to-probe control and selects probe mode before checking probe shortcuts. Additional keyboard assertions cover Free CT and Tri-planar without moving the probe contact. All original assertions and case bodies are guarded unchanged after reversing the reviewed setup/cleanup additions; target and integration use the same harness. The separate apps/studios lockfile comes from WS2. New private studio datasets are not tracked; local-data presence in a private workspace does not imply VPS installation. No clearance bypass, automatic merge or production deployment is authorised.

## Harvard–Oxford atlas alternative (private, not cleared)

See [21-harvard-oxford-private-candidate.md](21-harvard-oxford-private-candidate.md) for a SHA-pinned private importer that requires a licensed aligned MRI underlay and refuses mismatched atlas geometry. No FSL software, LPBA40 bytes, rights upgrade or public release.

## Nine-studio BodyParts3D exact provenance (private audit)

See [22-bodyparts3d-nine-studio-source-chain.md](22-bodyparts3d-nine-studio-source-chain.md) to verify official Release 4.0 OBJ/FMA/FJ provenance and code independence from the legacy NC Atlas frontend; this only prepares evidence and does not grant clearance.

## Consolidated clearance and reviewer execution (all 24 studios)

Run a single private worklist + review preparation batch rather than separate per-dataset PRs: [23-consolidated-clearance-execution.md](23-consolidated-clearance-execution.md). The summary remains preliminary and does not approve any source, medical content, privacy claim or release.

## Official private-data recovery from a fresh Mac clone

[24-one-shot-official-data-recovery.md](24-one-shot-official-data-recovery.md) describes the single-batch, checksum-pinned download and local preparation of five official verified-source-license dataset subsets. Optional BodyParts3D / SRI24 tissue-only paths remain private-review candidates; no license, medical or public release approval is implied.
