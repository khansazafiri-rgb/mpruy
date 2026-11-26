# Cross-version official source identity audit

Compare 376 retained exact 4.3 publisher/mirror receipts against the two official 4.0 publisher ZIP archives and four exact tables pinned in dbcls-full-geometry-audit-20261125.json. Every archive and table is checked by size and SHA-256. A FJ filename match alone is not geometry or anatomical identity. Exact raw OBJ digest, unique FMA/BP/name and concept membership are distinct gates; exact matches also reproduce the retained triangle count. Different raw bytes remain unresolved, without rescaling or estimating a coordinate transform. No claim of completeness of a source concept or the local workstation inventory. No release approval. Publisher audit result recorded below; per-ID classification replay pending.

This is independent of audit-atlas-native-overlap.mjs, which compares actual GLB position arrays on the local verified body pack. No geometry is copied into Git, and the CI runner removes its temporary copies.
## Completed publisher audit (2026-11-26)

GitHub Actions [45783767619](https://github.com/khansazafiri-rgb/mpruy/actions/runs/45783767619), job 139785306358, commit 474add2fa30a207d1eddc1c182339cb67d79366f: 376 references compared; ISA archive 2234 elements, PARTOF archive 1258 elements. 153 FJ IDs absent from both pinned archives, 223 shared FJ IDs with different raw bytes, zero exact raw-byte matches. These classifications concern the pinned OBJ 99 archives only, not all possible 4.0 geometry sources. A byte difference does not establish geometric inequality. No coordinate transform inferred; native local body overlap remains outstanding. No medical or commercial clearance.

## Native coordinate extension (pending execution)

`node scripts/audit-bp3d-cross-version-publisher.mjs --compare-native-private` requires all 17 verified local 4.3 acquisitions. Compares each pinned 4.0 archive separately only with exact FMA/BP/name and FJ membership, using actual native float32 triangle arrays, with no transforms or tolerance. Exact unordered equality ignores winding and ordering, and is not a registration claim. Different tessellation does not prove misalignment. The full regression workflow reuses its private acquisition and removes the temporary comparison archive/report. Logs include only aggregate classification counts. No clinical or license approval.
