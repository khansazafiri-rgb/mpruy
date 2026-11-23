# MEDCOEL — Production exposure containment proposal (23 November 2026)

## Observed evidence

The owner Mac ran the read-only audit: strictExposureCheckPassed=false,
releaseCleared=false. Two unapproved model candidates and one unidentified
Atlas endpoint are still exposed or unverified:

- /anatomy/viewer/models/skeletal.glb — HTTP 200, commercial rights unverified.
- /anatomy/viewer/models/visceral.glb — HTTP 200, commercial rights unverified.
- /anatomy/4d-lab/data/atlas/ct.nrrd — HTTP 200 HEAD, byte identity unknown.
  It may just be HTML from the root website SPA fallback; do not assert
  actual patient CT has been served without body and type validation.

Existing licensing/deploy/withheld-paths.caddy does not block the two
model candidates. The code's strict auditor is performing correctly.

## Proposed repository-only containment

Both deploy/Caddyfile and deploy/anatomy.caddy.snippet now define specific
single-path Caddy handles for skeletal.glb and visceral.glb returning 404,
and a path-prefixed handle for the entire /anatomy/4d-lab/data/atlas/*
family, including ct and labels. Every block sets Cache-Control private,
no-store, max-age=0. This intentionally makes the affected 3D systems
unavailable until licensing is verified, without removing local source
files, changing registry approvals or public application code.

Specific path-based handle declarations sort ahead of the broader
handle_path /anatomy/viewer/* handler; a generic named matcher could sort
behind that file_server and fail to block exposure.

## Tests and decision gate

The following checks are supplied:
- npm run test:production-quarantine
- npm run test:licensing
- CADDY_BINARY=/absolute/path/caddy ANATOMY_DIST=/absolute/dist node scripts/anatomy-caddy-smoke.mjs

The optional real local Caddy smoke now verifies GET, HEAD, and Range
404/no-store for both GLBs and CT/label Atlas paths, plus healthy unrelated
model delivery, static asset caching, main web, redirects, backend and frames.

Production is NOT changed by this PR or by merging it. The effective
VPS configuration might differ from the repository, and a CDN or service
worker could still serve copies.

Only after specific owner approval, Ops should inspect the effective Caddy
config, retain its exact versioned backup, validate the proposed effective
configuration, schedule a brief contained reload, and verify externally
that the three path families return 403, 404, or 410 on GET, HEAD, Range
and conditional requests. Re-run npm run audit:live-rights-strict and
inspect CDN caches, aliases, alternative domains and old release folders.
A strict surface audit can PASS while releaseCleared remains false.

Any needed rollback must be reviewed against the known exposure issue;
do not re-enable unverified mesh files just to restore a 3D UI. Historical
Git copies, upstream hosts and old public screenshots are a separate
ownership/legal review and cannot be withdrawn by a Caddy route.

## Hard limits

This is an owner-review DRAFT only. No production deployment, API
migration, private data installation, rights override, or existing
dataset alteration. All 24 Clinical Studios remain public-release NO-GO
until exact-file rights, medical, privacy and signed build approvals are
separately completed. A proposed 404 rule is not evidence that medcoel.com
already responds with 404.
