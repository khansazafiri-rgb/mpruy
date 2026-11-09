# MEDCOEL — Commercial Source Rights Evidence: concrete clearance work

As-of investigation: **9 November 2026**. This is a rights-evidence checklist, **not legal advice, permission or release approval**. Local builds/previews can continue. Both public staging products remain blocked.

Machine-readable inventory: [`commercial-rights-evidence.json`](commercial-rights-evidence.json).
Audit command: `npm run audit:commercial-evidence` (returns 0 if the **inventory is well formed**, even when there are unresolved rights); `node licensing/tools/audit-commercial-evidence.mjs --require-clearance` must currently return nonzero.
The gate for actual deployment remains `commercial-release.json`, checked against **exact released bytes** by the staging scripts.

## Confirmed first-party source observations

| Component | Verified observation | What it does NOT prove | Next evidence to acquire |
| --- | --- | --- | --- |
| Atlas frontend code | Source `nqwrc/3d-anatomy`, pinned at `8ca3b7421bcfbe88b85859eb1983d5cf79f21749`, declares **CC BY-NC-SA 4.0** for application code. Local `apps/anatomy/package.json` and `apps/anatomy/LICENSE` maintain NC-SA language. Source: [upstream LICENSE](https://github.com/nqwrc/3d-anatomy/blob/8ca3b7421bcfbe88b85859eb1983d5cf79f21749/LICENSE) | Removing NC anatomical models, renaming package or editing LICENSE **does not** grant commercial code rights. Having pushed a fork doesn't prove ownership. | Identify author(s), their relationship to MEDCOEL and exact contributions; obtain written commercial redistribution/adaptation permission or a independently developed replacement with demonstrable provenance. If the project owner is the exclusive copyright holder, document that authority rather than assuming it. |
| BodyParts3D original | Official [DBCLS database licence page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html) last updated **27 February 2025** states **CC BY 4.0** for the database. | It does **not** retroactively prove that every mesh in the older mixed Z-Anatomy GLB was sourced from that official licensed dataset/version, nor erase Z-Anatomy adaptation rights. | Record exact dataset version, official download URL, source file hashes, mapping to each intended node, and required attribution for whichever version is imported. |
| Z-Anatomy adaptations | The [Z-Anatomy project](https://www.z-anatomy.com/) is described under **CC BY-SA 4.0**, with [SPI project description](https://www.spi-inc.org/projects/z-anatomy/). The [upstream bundled notice](../apps/anatomy/public/models/License.txt) additionally lists Brainder, Dundee inner ear, kidney and other contributions. | One shared notice cannot establish per-node ownership and licence; a clean quarantine scan proves missing known withheld nodes, not provenance of every retained mesh. | Obtain contributor-level attribution or compare each retained mesh with identified original source models; record source hashes and review contentious skull/vascular structures. |
| 4D Lab synthetic CT, labels, skin and images | [`public/data/atlas/NOTICE.txt`](../apps/4d-lab/public/data/atlas/NOTICE.txt) documents derivative processing and excluded inputs. Input SHA-256 integrity is recorded. | Hashes and procedure do not prove the copyright/redistribution rights of all upstream model inputs. | Rebuild from independently verified models, record the exact source licensing chain, then review attribution/ShareAlike and final output hash. |
| Anatomy previews and educational text | Images inherit obligations from rendered models; definitions are attributed mainly to Wikipedia. | The rendered picture does not have independent clearance merely because it is a WebP. Metadata or definitions may have distinct licences. | Re-render from verified input meshes; preserve original-text source revision and attribution/GFDL analysis. |

## Path to clearance (most useful order)

1. **Source-code copyright determination:** determine whether the owner of `nqwrc/3d-anatomy` is MEDCOEL and whether all relevant source contributions are owned or permissively usable. Keep NC-SA code blocked until documented. If permission is needed, request commercial **use, public web redistribution, modification, sublicensing/hosting as applicable**, and reuse of changes in MEDCOEL Anatomy Viewer and 4D Lab.
2. **Model-level provenance:** verify each retained GLB node (all six bundles) from a specific official BodyParts3D or Z-Anatomy source revision. Prioritize skull/foramina, cerebral/renal vessels, and former NC overlap. Do not assert an entire bundle commercially cleared merely because its most common source is CC BY-SA.
3. **Replacement pathway:** if an individual model cannot be proven, replace it using independently licensed official source data (e.g. a BodyParts3D release that expressly permits the intended distribution). Prove coordinate mapping, fidelity and versioned source identity before converting. Keep old unverified bytes quarantined and avoid attempts to evade the safeguard by renaming/re-exporting them.
4. **Derived products:** rebuild previews, registration, anatomy JSON, synthetic CT and labels from verified inputs; preserve CC BY-SA adaptation obligations and change notices.
5. **Software and text audit:** generate and review SBOM for exact npm packages and bundled Draco; resolve source rights for Atlas definitions and translations; keep commercial claims scoped to the actual application.
6. **Full-platform audit:** review the separate MEDCOEL main website, advertisements/announcements, recorded atlas footage, voices and external runtime URLs. The Anatomy/4D Lab gate does not cover these.
7. **Live production exposure remediation:** `EXPOSURE_AND_ROLLBACK_PLAN.md` reported on 2026-11-09 that older quarantined content could still be publicly reachable from some production URLs and Git history. **Recheck live endpoints and obtain authorization** before changing Caddy, deleting backups, altering branch history, or purging public content. A new staging gate does not remove previously deployed files.
8. **Final reviewed release:** update the inventory with rights-holder evidence and exact hashes; receive qualified review; stage only source plus final release with exact approved digests. Maintain two separately approved rollback releases. Test actual public URLs and preserve notices.

## Evidence acceptance standard

To mark an inventory record `verified`, document: named rights holder, qualified reviewer, review date, exact SHA-256 asset identity, commercial use/redistribution/adaptation grants, attribution, ShareAlike duties, and specific supporting URLs or written grant artefacts. For NC-licensed original code an **explicit commercial permission** is required unless independent evidence proves the applicant owns all relevant copyrights and can issue commercial rights.

The inventory validator intentionally refuses `verified` claims based only on a status change or one generic source URL. It **cannot independently determine the legal validity of a submitted document**; manual rights verification is still required.

## Suggested permission-request text (not sent)

**Subject: Commercial licence request for 3d-anatomy source code used in MEDCOEL**

Hello, we are reviewing the attribution and commercial redistribution rights for the interactive browser application based on `nqwrc/3d-anatomy` (specifically its code in `index.html`, `src/`, `tools/`, build configuration and related contributions). The upstream licence states CC BY-NC-SA 4.0. MEDCOEL is an educational platform that may include institutional announcements, partnerships, sponsorships, and paid services.

Could you confirm the applicable copyright holders and whether you can grant MEDCOEL written permission for commercial web use, modification, redistribution, hosting of derived application builds, and continued use in Anatomy Viewer / Anatomy Live 4D Lab? Please specify required attribution and whether the grant covers all project contributors. We will preserve all upstream model-specific licences separately and will not treat this request as granting rights to third-party anatomy meshes.

Thank you.

## No claim of launch readiness

The inventory currently contains **1 explicitly blocked record** (Atlas NC source code) and **13 unresolved review records**. All must be resolved for the relevant product before its commercial distribution can be considered. No asset is approved or served by this worklist.
