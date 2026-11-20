# MEDCOEL Clinical Studios v2.0

Independent medical learning applications per anatomical region and imaging modality (Brain MRI, Chest CT, Cardiac Echo, …),
hosted by the MEDCOEL web app. Status: **Loop 1 foundation in progress. Nothing here is available to students.**

| Document | Content |
|---|---|
| [00-baseline-audit.md](00-baseline-audit.md) | Verified repository and production state at `2bfe54c` (PR #222), baseline test results |
| [01-architecture-decisions.md](01-architecture-decisions.md) | ADR-001…011, accepted 2026-11-20 |
| [02-feature-compatibility-matrix.md](02-feature-compatibility-matrix.md) | Existing features that must not change, and their guards |
| [03-studio-catalog.md](03-studio-catalog.md) | The 24 studios (+ internal fixture) |
| [04-data-license-matrix.md](04-data-license-matrix.md) | Available, missing, restricted and review-required data |
| [05-contract-specification.md](05-contract-specification.md) | Catalog, availability, launch, module, bridge, adapter, release manifest, typed quiz |
| [06-test-acceptance-plan.md](06-test-acceptance-plan.md) | STUDIO-001…030, folder structure, PR-A…E |

| [10-secure-launch-and-delivery.md](10-secure-launch-and-delivery.md) | WS1: receipts, attestation, authorised delivery |
| [12-MEDCOEL-24-STUDIOS-RESOURCE-MATRIX.md](12-MEDCOEL-24-STUDIOS-RESOURCE-MATRIX.md) | Resource research, acquisition and licence evidence for all 24 studios |
| [13-24-studio-completion-matrix.md](13-24-studio-completion-matrix.md) | Honest per-studio completion status |

Machine-readable: `shared/studios/catalog.v1.json`, `catalog.schema.json`, `frozen-ids.json`.
Check: `npm run test:studios`.

## PR sequence

| PR | Scope | State |
|---|---|---|
| A | Documents + catalog + catalog checks | merged as PR #224 |
| B1 | Resource/catalog contracts and offline clearance validation | Draft implementation; see 07 |
| B2 | Availability resolver (web + PocketBase hook), studios API | not started; separate ACC |
| C | Runtime, template, internal fixture, studio host and route | not started |
| D | Lab Hub section, studio cards | not started |
| E | Security hardening, test consolidation, release docs | not started |

Rules: no merge or deployment without the owner; no PocketBase migration in Loop 1; `deploy/`, `apps/anatomy`, `apps/4d-lab`,
`shared/lab-tracks.json` and lockfiles are not changed; no withheld or restricted data is used.


Resource reconciliation and B1 contracts: [07-resource-reconciliation-pr-b.md](07-resource-reconciliation-pr-b.md).
