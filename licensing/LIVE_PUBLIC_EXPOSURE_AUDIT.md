# MEDCOEL — public deployment exposure check (read-only)

**Purpose:** replace stale 9 November HTTP observations with a repeatable, current check of the **publicly served** Anatomy assets. This is an engineering/security observation, **not a grant of copyright, proof of the second VPS, or a commercial release approval**.

## What already exists (do not repeat)

- Anatomy source was published in the public repository, with a separated build and web routing.
- The approved mature 3D Anatomy and Anatomy Live 4D Lab UX remain unchanged.
- Known restricted models, thumbnails and derived CT inputs are quarantined in the current repository candidate; the commercial release gate still blocks both products.
- [Rights reconciliation](RIGHTS_GAP_RECONCILIATION_2026-11-10.md) documents existing controls separately from outstanding rights grants.

## What the audit checks

Run from the exact repository checkout:

```bash
npm run audit:live-anatomy
# Optional machine-readable report (local output only):
node scripts/audit-live-anatomy-exposure.mjs --out local-data/live-audit/report.json
```

This makes **read-only requests to the fixed public host https://medcoel.com**; no SSH, tokens, writes, Caddy reloads, deployments or automatic content removal.

The audit compares:

| Endpoint | Decision logic |
| --- | --- |
| `/anatomy/viewer/models/nervous.glb` | Public binary response is **critical**: whole system was withheld |
| `/anatomy/viewer/thumbnails/systems/nervous.webp` | Public response is **critical**: withheld preview |
| `/anatomy/viewer/models/visceral.glb` | SHA-256 compared with *withdrawn* and *current repository candidate* bytes |
| `/anatomy/viewer/models/skeletal.glb` | Same byte comparison |
| `/anatomy/4d-lab/data/atlas/ct.nrrd` | HEAD probe only; an HTML SPA fallback does **not** prove real CT deployment |

The script limits binary downloads to 8 MB each, hashes the received bytes in memory, never stores/re-uploads model binaries, and labels timeouts, failures and ambiguous responses as **unverified** rather than green. A live hash matching the repository candidate is **not commercial approval**. The report describes only responses from the public hostname, **not which physical VM handled them**.

## CI integration

[GitHub Actions read-only exposure workflow](../.github/workflows/anatomy-live-exposure.yml) runs on changes to the audit itself and supports manual re-checks. It writes its observations to the Actions step summary and uploads a 14-day JSON artifact. Network errors and critical exposure are **not hidden**, but the advisory network-dependent step does not block ordinary unit/build CI; the separate commercial release gate remains the enforcing control.

No endpoint observations should be reported as actual until that workflow or the same command genuinely runs successfully with network access. The repository's audit of 9 November is **historic** and cannot be treated as current truth.

## Interpreting outcomes

- **critical:** A withheld model/preview or exact withdrawn original bytes are still publicly served. Raise an immediate owner-directed remediation request, using [the existing reversible exposure and rollback plan](EXPOSURE_AND_ROLLBACK_PLAN.md). Do not directly change production, Caddy or public history without authorization.
- **review/investigate:** A visible model matches only candidate bytes, is unknown, or is unavailable. This establishes neither a verified licence nor the actual origin of the response.
- **unknown:** Access failed or a request could not be verified. Retry with an authorized network vantage point; do not label it safe.
- **not-served:** A specific withheld URL returned 403/404/410. This says nothing about other paths, cached copies, Git history, or rights of other files.

## Next actual legal clearances

1. Identify and obtain all necessary commercial redistribution/adaptation permissions for the original `nqwrc/3d-anatomy` CC BY-NC-SA application code **or** establish genuinely independent code with provenance while preserving the approved UX. Opening the source does not itself relicense third-party NC code.
2. Pin and review original mesh source revisions; verify each retained mesh's provenance, then regenerate previews and the CT/USG derivatives from verified inputs when required.
3. Complete version-specific SBOM, 4D Lab contribution ownership and media attribution audit.
4. Subject the **exact final build** to qualified rights review and release hash approval. Leave `licensing/commercial-release.json` blocked until then.

**No UI changes, dataset modifications, code redistribution policy edits or production writes are part of this audit.**
