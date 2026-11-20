# 05 — Contract specification

All shapes are JSDoc-typed plain objects, validated by `packages/studio-contract/validation.mjs`. Validators return
`{ ok: true, value }` or `{ ok: false, errors: [{ path, code, message }] }`; they never throw on bad input.

## 1. Catalog entry (`shared/studios/catalog.v1.json`, schema in `catalog.schema.json`)

```text
schemaVersion  1 (integer, required)
id             ^[a-z][a-z0-9-]{2,40}$, unique, immutable (a separate frozen id list is checked in tests)
title          string 1..80;   titleId (Indonesian) string 1..80
region         enum brain|headNeck|spine|thorax|heart|abdomen|pelvis|upperLimb|lowerLimb|internal
modality       enum anatomy3d|ct|mri|xray|ultrasound|ecg|none (none = internal fixture only)
runtime        { type: "iframe"|"module", entry: string|null, releaseId: string|null }
capabilities   array of capability enum, unique; each must have an adapter registered to become executable
learningModes  { guided, challenge, typedQuiz } each "planned"|"building"|"available"|"none"
datasets       [{ id, kind, provenance, licence: "verified"|"unverified"|"restricted", protected: boolean }]
access         { roles: ["user"|"admin"], campuses: [] (empty = all) }
review         { clinical: "pending"|"approved"|"not-required", anatomical: same, approvedBy?, approvedOn? }
licensing      { status: "verified"|"unverified"|"blocked", ref?: path in licensing/ }
release        { status: "planned"|"building"|"review"|"publishable" }
blockers       [{ kind: "licence"|"clinical"|"data"|"technical", reason }]   (shown to users)
plannedCapabilities  capabilities the studio is meant to get later (documentation only, never executable)
reuses         string|null: existing MEDCOEL engine/asset it intends to reuse (documentation only)
internal       true only for internal technical studios (region "internal", modality "none", admin-only)
```
Dataset `kind` enum: `mesh`, `ct-volume`, `mri-series`, `xray-image`, `ultrasound-scenario`, `terminology`, `test-content`.
The JSON Schema is `shared/studios/catalog.schema.json`; `scripts/studio-catalog.test.mjs` validates the catalog against it
(dependency-free subset validator) and checks the invariants a schema cannot express.

## 2. Availability resolver (`studioAvailability.mjs`, mirrored in `pb_hooks/lib/studios.js`)

Pure function `resolve(entry, { user, installedRelease, adapters })` → `{ state, reason }`, evaluated in this order (first match wins):

1. invalid entry → `blocked` (technical)
2. `blockers` non-empty or `licensing.status = blocked` or any dataset `restricted` → `blocked`
3. user not in `access` → not listed at all (not "blocked": no information leak)
4. `release.status = planned` → `planned`; `building` → `building` (admins only, else not listed)
5. no `installedRelease` matching `runtime.releaseId`, or asset check failed → `planned` for students, `failed` for admins if a release was expected
6. `release.status = review` → `review` (admins only; students: not listed)
7. `publishable` AND `licensing.status = verified` AND review `approved|not-required` for both AND every declared capability has an adapter → `ready`
8. anything else → `blocked`

A runtime crash reported by the host after launch → `failed` for that session (client-side display only).

## 3. Launch context (host → studio)

```text
{ studioId, releaseId, mode: "guided"|"challenge"|"explore", caseId: ^[a-z0-9-]{1,48}$ | null,
  language: "id"|"en", a11y: { reducedMotion, highContrast, fontScale: 1|1.25|1.5 },
  user: { displayName (first name + initial, as the leaderboard does), role: "user"|"admin" },
  capabilities: { <name>: <approved config object, ≤ 2 KB> } }
```
Never included: tokens, user id, email, campus id, any record. Unknown keys are dropped; invalid `mode` → `explore`; invalid `caseId` → `null` (STUDIO-012).

## 4. Studio module (studio → host)

```js
export async function mountStudio({ element, launch, bridge }) -> { unmount(): Promise<void>, operations?: { [name]: fn } }
```
Rules: render only inside `element`; no writes to `document.documentElement`/`body` styles outside the frame; `unmount` must
release WebGL contexts (`renderer.dispose()` + `forceContextLoss()`), listeners, workers, observers, timers; must resolve
within 2 s. `operations` keys must be declared capabilities.

## 5. Bridge events (studio → host, over the MessageChannel port)

Envelope `{ v: 1, type, at (ms), payload }`, JSON-serialisable, ≤ 8 KB, payload strings ≤ 500 chars, no HTML.

| type | payload |
|---|---|
| `studio.ready` | `{ releaseId, capabilities: [] }` |
| `studio.error` | `{ code: "dataset-unavailable"|"webgl"|"internal", message }` |
| `studio.action` | `{ capability, action, ok: boolean }` |
| `studio.answer` | `{ itemId, correct: boolean, attempt: 1..10 }` (no free text in Loop 1) |
| `studio.lessonCompleted` | `{ lessonId, steps: n }` |
| `studio.exit` | `{}` |

Host → studio: `host.command { name, args }` only for declared capability operations. Rate limit: 50 events/s, excess dropped
and one `studio.error` logged. Loop 1: events go to an in-memory log for tests only, never to PocketBase.

Handshake: host creates the frame `src=/studio-assets/<id>/<release>/index.html`, waits for `{ type: "studio.hello", v: 1 }`
from `event.source === frame.contentWindow` with `event.origin === location.origin`, then transfers a `MessageChannel` port
with the launch context. Anything else is ignored (STUDIO-017). The same check function will wrap the Live 4D frame when
it gets a bridge (Loop 2, needs a change inside `apps/4d-lab`, separately approved).

## 6. Capability adapter

```js
{ name, version, available(): { ok, reason }, inputSchema, outputSchema, run(op, input) -> Promise<{ ok, value } | { ok: false, code }> }
```
Unknown capability or op → `{ ok: false, code: "unsupported" }` (STUDIO-005). Deterministic error codes: `unsupported`,
`unavailable`, `invalid-input`, `failed`. Loop 1 implements only `fixture-echo` (test) and stubs that always return `unavailable`
for real capabilities; no clinical behaviour is claimed.

## 7. Studio release manifest (`/studio-assets/<id>/<release>/studio-manifest.json`)

`{ schema: "medcoel.studio.v1", id, releaseId, entry: "index.html", builtFrom: <git sha>, files: [{ path, sha256 }] }`;
staged by a script like `stage-4d-lab.mjs` (atomic switch, rollback, licence distribution scan). Loop 1 builds and stages
**locally only**.

## 8. Typed anatomy quiz (interface only in Loop 1)

`checkTypedAnswer(input, target, terminology) -> { verdict: "correct"|"accepted-typo"|"wrong", matched, canonical, language }`
with normalisation (`registry.normalise`), language sets id/en/la, synonyms, Damerau–Levenshtein ≤ 1 for terms ≥ 6 chars
(≤ 2 for ≥ 12), and a deny-list so that confusable pairs (e.g. *ulna/ulnar*, left/right) are never "typo-accepted".
Terminology source: a reviewed dataset (not yet existing for Indonesian). Existing Identify/Find remain unchanged.
