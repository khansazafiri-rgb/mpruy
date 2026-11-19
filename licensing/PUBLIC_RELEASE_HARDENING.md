# Commercial release hardening — exact bytes at activation

## What changed

The Atlas Viewer and Anatomy Live 4D Lab **public staging** pipelines now require commercial clearance twice:

1. The *source build* is scanned for withheld assets and approved against its exact SHA-256 release digest.
2. The *installed release directory* is revalidated and approved against its exact SHA-256 release digest **after copying** and **before** changing the public release symlink.

Rollback is a form of public distribution. Both staging scripts validate and check commercial clearance for the **actual rollback target** before reactivating it. They reject a release if the current policy is blocked, the release has no recorded approval, its files have changed since review, or a new byte has been added.

This does **not** clear any content. The default `licensing/commercial-release.json` still blocks both products until a qualified rights review confirms commercial rights, redistribution, attribution, ShareAlike, and provenance.

## What happens to old hashed assets?

Historically `stage-anatomy.mjs` copies assets from the previous release to preserve JavaScript chunks referenced by open browser tabs. Such assets may be outside the new source build.

**These additional assets are never implicitly cleared.** If copied assets change the final digest, staging stops and leaves the currently active symlink intact. To preserve legacy chunks legally:

1. Prepare the candidate directory containing every old hashed chunk that must continue being served.
2. Scan the *whole* candidate directory for withdrawn bytes and licence obligations.
3. Obtain a rights approval for the exact candidate digest, listing those legacy chunks and all other assets.
4. Stage the exact approved candidate. The post-copy final digest must match the approval. Any mismatch fails closed.

Do not bypass the final gate, patch the manifest with fictional evidence, or reuse a previous approval for different bytes.

## Rollback and operational notes

- Emergency rollback to an older **unapproved or modified** release is denied. Pre-clear and retain at least two immutable, independently approved releases before enabling public distribution.
- If no previously approved release exists, keep the product disabled rather than automatically reactivating the previously withheld code.
- `.release-source.json` is excluded from the digest as a staging journal, not an application asset; it must not include application scripts or executable resources.
- Existing deployment mechanisms do **not** reload Caddy; stage scripts only switch symlinks after their checks pass.
- This protects the built directories under the staging workflow. It cannot certify rights to external resources dynamically loaded at runtime, historic public Git blobs, or another web route that serves stale data. Those require separate full-platform audits and live-host remediation.

## Required regression tests

- `npm run test:licensing`
- `npm run test:anatomy-integration`
- `npm run test:4d-lab`
- `node --test scripts/anatomy-release.test.mjs scripts/stage-4d-lab.test.mjs scripts/commercial-release.test.mjs`

The fixture approval helper is **test-only**, retaining distinct hashes to simulate legitimately approved multiple versions. It does not modify the real blocked commercial-release manifest.

No public staging, production configuration, or distribution authorization is performed by this change.
