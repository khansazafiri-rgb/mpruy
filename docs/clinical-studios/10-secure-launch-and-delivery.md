# 10 — Secure launch, clearance receipt and authorised asset delivery (WS1)

Status: implemented and tested in a test environment. **No studio is cleared**: no receipt has been issued for any of
the 24 canonical studios, and none can be issued while the committed rights ledger has no verified records for them.

## Chain of trust

```
build (independent Vite app) ──► scripts/build-studio-manifest.mjs   (inventory: path, bytes, sha256 + bound resource-manifest.json)
        │
        ▼
licensing/tools/studio-release.mjs stage    copy into <root>/<studio>/<release>/files (immutable; refuses overwrite,
        │                                    unmanifested/changed bytes, symlinks) + install.json (random installationId)
        ▼
studio-release.mjs receipt                  runs the B1 inspector on the INSTALLED bytes (owner override disabled);
        │                                    only if eligible: HMAC-SHA256 receipt bound to studio, release, installation,
        │                                    build digest, resource-manifest digest, evidence revision, quarantine policy
        ▼
studio-release.mjs attest                   full byte re-hash against the manifest, then a signed size+mtime snapshot
        │
        ▼
PocketBase (pb_hooks/lib/studio-runtime.js) every list/launch: canonical catalog + verified receipt + verified attestation
                                            + live snapshot check; every asset request: session cookie + live user +
                                            availability + manifest membership + snapshot check of that file
```

- **Build digest** = SHA-256 over every delivered file (`path`, `bytes`, `sha256`, sorted) and the resource-manifest digest.
- **Evidence revision** = SHA-256 over the exact bytes of `commercial-rights-evidence.json`, `resources.v1.json` and
  `commercial-release.json`. Any ledger edit invalidates every receipt until it is re-issued against the new ledger.
- **Quarantine binding**: SHA-256 of `quarantine-policy.json`.
- **Receipt lifetime** ≤ 90 days (default 30); attestation ≤ 14 days (default 7, re-attest by timer); session ≤ 30 minutes.
- **Revocation**: `<root>/revocations.json` (`receipts`, `releases`, `kids`), checked on every request. Revoking a release
  also ends live sessions.
- **Constant-time** comparison: `crypto.timingSafeEqual` (Node), `$security.equal` (PocketBase) on equal-length hex.
- **Keys**: `MEDCOEL_STUDIO_KEYS` (`{"kid":"secret ≥ 32 chars"}`), `MEDCOEL_STUDIO_SIGNING_KID` (tools),
  `MEDCOEL_STUDIO_SESSION_KID` (server). Server environment only; weak or malformed keys are dropped (fail closed).
  Key rotation: add a new kid, re-issue, then list the old kid under `revocations.json.kids`.

## Delivery

Assets are served by PocketBase at `/api/medcoel/studio-assets/<studio>/<release>/<path>`, which the existing Caddy
`/api/*` block already proxies: **no Caddy change**. There is no public static path for studio data, so a guessed URL,
an alternative release ID, `..`/encoded traversal, dot files, unmanifested files, server-only files (`<release>/server/`,
e.g. answer keys) and files whose size or mtime differs from the signed snapshot all return 401/404 without detail.
Symlinks are refused at staging, at attestation and at delivery (every path component is checked with `readDir`, since the
JSVM has no `lstat`).

Headers: `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, `Cross-Origin-Resource-Policy: same-origin`,
`X-Frame-Options: SAMEORIGIN`; HTML additionally gets a strict CSP (`script-src 'self' 'wasm-unsafe-eval'`, `connect-src 'self'`,
`object-src 'none'`, `frame-ancestors 'self'`).

The launch response sets `medcoel_studio=<token>; Path=<exact release path>; HttpOnly; SameSite=Strict; Secure` (Secure is
omitted only in `MEDCOEL_DEV_MODE`). The token carries no secret data; it is an HMAC over
`kid, sid, userId, studio, release, installationId, mode, issuedAt, expiresAt`. The user record is re-read on every request,
so a disabled account loses access immediately.

## Origin isolation (evaluated)

| Option | Isolation from the host's PocketBase token (`localStorage`) | Cost |
|---|---|---|
| Same-origin iframe (current) | **None against hostile code.** Mitigated: only first-party, attested, CSP-restricted bytes can run; no third-party origins; token never passed to the studio; asset cookie is HttpOnly | none |
| Sandboxed iframe (`allow-scripts` without `allow-same-origin`) | Strong, but module scripts and data fetches become cross-origin from an opaque origin: needs CORS on delivery and `SameSite=None` cookies (third-party cookie restrictions) | medium; brittle in Safari |
| Dedicated studio origin (e.g. `studio.medcoel.com`) with a launch-token exchange | Strong; the browser separates storage | needs DNS/Caddy/TLS and an owner decision |

Decision for now: same-origin with the mitigations above; **a dedicated studio origin is recommended before any studio runs
third-party or user-supplied content**. This is an owner decision (DNS + Caddy), not done here.

## Test-only catalog

`MEDCOEL_STUDIO_TEST_CATALOG` is honoured only when `MEDCOEL_DEV_MODE=1`, and only adds studios whose id starts with `test-`
and that are not in the canonical catalog. Canonical studios cannot be modified or activated through it (test SEC-007).

## Operations (server, not CI)

```bash
node scripts/build-studio-manifest.mjs --dist <dist> --studio <id> --release <release> --capabilities <a,b>
node licensing/tools/studio-release.mjs stage   --studio <id> --release <release> --build <dist> --root /var/lib/medcoel/studios
node licensing/tools/studio-release.mjs receipt --studio <id> --release <release> --root /var/lib/medcoel/studios
node licensing/tools/studio-release.mjs attest  --studio <id> --release <release> --root /var/lib/medcoel/studios
node licensing/tools/studio-release.mjs verify  --studio <id> --release <release> --root /var/lib/medcoel/studios
node licensing/tools/studio-release.mjs revoke  --studio <id> --release <release> --root /var/lib/medcoel/studios
```
The catalog entry must also name that `releaseId` (a reviewed catalog change). `receipt` exits 1 with the B1 blockers when the
release is not eligible.

## Tests

| Suite | Result |
|---|---|
| `packages/studio-contract/test/clearance.test.mjs` (CLEAR-001…009) | 9/9 |
| `scripts/studio-release.test.mjs` (RELEASE-001…007) | 7/7 |
| `apps/pocketbase/test/studios-secure-api.test.mjs` on a real PocketBase 0.40.5 (SEC-001…012) | 12/12 |

SEC covers: unauthenticated access, scoped HttpOnly session, strict headers, direct URL / tampered / duplicate / foreign
tokens, traversal and encoded traversal, server-only answer keys, campus spoofing, admin of another campus, unsupported modes,
catalog spoofing, private metadata leaks, changed installed bytes, invalid HMAC, expired receipt, evidence change, release
revocation (including live sessions), disabled accounts, and canonical studios staying closed.

## Not covered / remaining

- Periodic re-attestation timer (systemd) and key rotation runbook on the VPS: documented, not installed.
- A dedicated studio origin (see above).
- Production deployment: not done and not authorised.
