# Human Anatomy — integration candidate (PREVIEW ONLY)

No production deployment, server configuration edit, or Hermes service change
has been made. SSH authentication to both supplied hosts was denied.

## Audited source and exact scope

Main source: GitHub khansazafiri-rgb/mpruy, branch
claude/focused-wozniak-1ayrxa, read via connected GitHub on 31 October 2026.
The deployed /opt/medcoel checkout may contain server-only edits and is unverified.
Anatomy source: local V3 from this chat, not a fresh /opt/medcoel-anatomy/app snapshot.

Checkpoint commit: 753c1aa05ae2c54fde1d5c5a0ff28bc5568d6279
Checkpoint branch: checkpoint/anatomy-v3
Working branch: preview/medcoel-anatomy-native
Local Git checkpoint/branch are included in the source archive (.git).

## Recommendation: independently built static atlas, same MEDCOEL origin

Browser /anatomy
  -> existing MEDCOEL React RequireAuth route
  -> HumanAnatomy.jsx full viewport study page (outside ordinary AppShell)
  -> same-origin iframe /anatomy/viewer/
  -> versioned static Anatomy build, served by main web server/CDN.

Keep independent release/build so main three@0.170 and Anatomy three@0.185
never share a dependency tree. The iframe isolates CSS and renderer lifecycle;
return to Lab uses target=_top. No token is copied into URLs, postMessage or
localStorage for authentication. Existing Anatomy study persistence remains.
The source patch adds a Human Anatomy entry to existing desktop/mobile drawer
navigation. It does not expand the crowded mobile bottom navigation.

Why this choice:
- Bundling the engine into React increases dependency/lifecycle risk for this UI pass.
- Reverse proxy to Hermes adds a private-network dependency and uptime requirement
  for an atlas currently consisting entirely of static assets.
- Main-origin static mount gives one URL and releases/rollback independent of
  medcoel-hermes. Hermes can remain a build/asset preparation machine.

HumanAnatomy.jsx belongs at apps/web/src/pages/HumanAnatomy.jsx.
main-web.patch is a proposed patch against the audited files, not applied to
/opt/medcoel. Proposed complete files are provided for review, not blind overwrite.
Build with ANATOMY_BASE=/anatomy/viewer/ (default for this candidate).
Copy dist to a versioned static release and review the example Nginx location.
Never point main SPA fallback at model paths. Missing .glb/.wasm must be 404.
Existing PocketBase, API and medcoel-hermes locations/services remain separate.

## Authentication and access

The existing React RequireAuth protects the user journey, not the public static
files. If assets must require login, choose and implement a validated server-side
cookie/session gate before production. Do not deploy a made-up auth_request URL.
The preview server has NO login or account state and must not be exposed publicly
as the final MEDCOEL application. It binds 127.0.0.1 and offers a simple host-page
preview for /anatomy; the React auth integration is a review candidate only.

## Preview

node serve.mjs
Open http://127.0.0.1:4174/anatomy
PORT=4177 node serve.mjs if that port is already used.
The candidate serves assets from /anatomy/viewer/. Root redirects to /anatomy.
The parent preview HTML is not a clone of the real authenticated main app.

## Before production

1. Obtain fresh server snapshots and checkpoint real server-only changes.
2. Apply/review the candidate on the correct main branch; run main build/tests.
3. Review actual login -> /anatomy -> Lab, expired sessions, role/access policy.
4. Confirm asset gating decision, NC dataset licence, and required attributions.
5. Review CSP frame-src self and frame-ancestors self for the real main origin.
6. Test clipboard permissions, exact asset URLs, MIME, cache/version rollback,
   404 responses, touch controls and low-memory iPad/mobile devices.
7. Verify anatomy behaviours against the actual deployed engine, especially if
   /opt/medcoel-anatomy/app contains features absent from local V3.
8. Run nginx -t and release/rollback checks only in a separately authorized
   deployment step. Do not restart or repoint medcoel-hermes.
