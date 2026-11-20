# 01 — Architecture decisions

Status: **accepted by the owner on 2026-11-20** (ACC for PR-A with the 24-studio list in `03`). ADR-007…011 below are
accepted as recommended; the open questions at the end were answered by that ACC.

ADR-001…006 from the specification are accepted as written. Below: how each maps onto the real code, plus the decisions the
specification leaves open (ADR-007…011), each with a recommendation for the owner.

| ADR | Mapping onto the repository |
|---|---|
| 001 Independent studios | Each studio = its own directory under `apps/studios/<id>/`, its own `vite.config.mjs`, own `dist/`, own release ID. Same pattern as `apps/anatomy` and `apps/4d-lab` today. |
| 002 Shared host | `apps/web` keeps auth, nav, availability and launch; studio code never imports from `apps/web/src`. |
| 003 Capabilities | Capability names are an enum in `packages/studio-contract/capabilities.mjs`; a capability is executable only when the registry entry, the adapter and the asset check all agree. |
| 004 Learning engines | Loop 1 ships interfaces + tests only; no "Guided works" claim. |
| 005 Fail-closed | Server decides availability (ADR-008); client can only narrow, never widen. |
| 006 Backward compatibility | No existing route, collection, track key or step key changes; regression suites listed in `06`. |

## ADR-007 — Hosting model: same-origin iframe by default (recommended)

Studios run inside a dedicated same-origin `<iframe>` created by `StudioHost`, and inside the frame a tiny loader calls the
studio's `mountStudio({ element, launch, bridge })`. The bridge is a `MessageChannel` port handed over once after a validated
handshake.

- Why: STUDIO-009/010 (crash and leak isolation) and WebGL context cleanup are guaranteed by removing the frame; global CSS
  cannot leak into the green Atlas or the host; it is the model the Atlas and the 4D Lab already use (`X-Frame-Options SAMEORIGIN`).
- Trade-off: a same-origin frame can read `localStorage` (the PocketBase token). Therefore **only first-party, reviewed
  studio code** is allowed (same rule as today's Atlas and 4D Lab). Third-party code would need a sandboxed cross-origin frame
  with CORS on studio assets; out of scope for Loop 1.
- An in-document `module` integration type stays in the contract (for tiny tools) but is not used in Loop 1.

## ADR-008 — Authoritative availability on the server, without a migration

`shared/studios/catalog.v1.json` is the versioned source. A PocketBase hook (`pb_hooks/studios.pb.js` + `lib/studios.js`,
holding a copy kept byte-identical by a test, exactly like `labTracks.js` ↔ `shared/lab-tracks.json`) answers:

- `GET /api/medcoel/studios` → per user: `{ id, title, region, modality, state, reason }` (no asset URLs for non-launchable studios);
- `GET /api/medcoel/studios/{id}/launch?mode=&case=` → only when `state = ready` (or `review` for admins/reviewers): `{ releaseId, entry, launch }`.

Release facts (which release is installed) come from server environment/config (e.g. `MEDCOEL_STUDIO_RELEASES`), never from
the client. No PocketBase collection is created in Loop 1 (spec 1.11).

## ADR-009 — Asset verification

A studio release is valid only if `GET /studio-assets/<id>/<releaseId>/studio-manifest.json` returns 200, `application/json`,
the expected `schema`, `id` and `releaseId`. This defeats the SPA fallback (production answers `200 text/html` for missing
paths today). Same technique as `checkLiveLab`.

## ADR-010 — Packages without new npm dependencies

`packages/studio-contract` and `packages/studio-runtime` are dependency-free ESM (JSDoc types), consumed by relative import /
Vite alias and tested with `node --test`. The fixture builds with the hoisted Vite already in the root `node_modules`.
Root `workspaces` and `package-lock.json` therefore need **no change in Loop 1**. (Alternative: add `packages/*` and
`apps/studios/*` to workspaces → lockfile churn and CI install changes; recommend deferring.)

## ADR-011 — Region vocabulary

Studio `region` is a new key set (`brain, headNeck, spine, thorax, heart, abdomen, pelvis, upperLimb, lowerLimb`) with an
explicit mapping to Atlas regions/systems for the anatomy adapter. `brain` maps to Atlas `headNeck` + system `nervous`,
which is quarantined, so any brain-anatomy studio starts `blocked`.

## Decisions taken with the ACC (2026-11-20)

1. The 24-studio list in `03` is confirmed.
2. ADR-007 accepted (iframe default, first-party code only).
3. ADR-008 (server hook + env release map, no migration) and ADR-010 (no workspace/lockfile change) accepted.
4. `review` state is visible to admins only during Loop 1.
