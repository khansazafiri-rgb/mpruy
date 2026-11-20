# MEDCOEL Clinical Studios — Unified Foundation Work (Draft)

Status: **in progress**. This branch is intentionally not a production release.

## Implemented

- Shared, dependency-free CommonJS availability and launch resolver (`packages/studio-contract/availability.cjs`).
- Deterministic server projection from the canonical 24-studio catalog + internal fixture; integrity checked by `npm run test:studios`.
- Read-only PocketBase GET endpoints:
  - `/api/medcoel/studios`
  - `/api/medcoel/studios/{id}/launch`
- Authentication with existing user rules, per-role/per-campus filtering, no-store serialization, and default deny for every launch.
- MEDCOEL Lab Hub link, status-only Clinical Studio catalog, guarded entry page and manifest-checking first-party iframe host.
- Unit tests for expected catalog visibility, query rejection, path traversal and launch prerequisites.

## Explicitly NOT implemented / NOT approved

- HMAC clearance receipt issuer/verifier and immutable installation attestation.
- Real studio bundles, built viewers, clinical datasets, medical/rights approval or private asset authorization.
- Guided/Challenge evaluator and typed anatomy scoring (prior work only specified contracts).
- Any production secret, migration, Caddy route, dataset download, auto merge or deploy.

## Security invariant

No studio is ready with the current catalog. Missing verified resource receipt, immutable installation and adapters denies launch. Raw catalog flags, a URL or a role override cannot change this. A successful metadata GET is not an asset-access control.

The first-party iframe is not a security boundary against scripts on the same origin. It must never mount unreviewed third-party code, and protected/privately reviewed assets must not be placed in public static storage. Before launch activation, implement and test the Node-to-PocketBase clearance bridge, artifact attestation, protected asset delivery and version-pinned clinical review.

## Tests

Run `npm run test:studios` and `npm test`. The second command includes PocketBase adapter unit checks.
Full browser acceptance, PocketBase HTTP integration and 4D UX regressions require subsequent verification; do not infer their status from unit tests.
