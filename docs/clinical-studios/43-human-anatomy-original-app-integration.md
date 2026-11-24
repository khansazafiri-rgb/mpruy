# MEDCOEL Human Anatomy — original Atlas + 4D Lab integration

Scope: restore the original MEDCOEL Human Anatomy experience, not a synthetic substitute or static showcase.

## Source-based root causes

1. The public 4D Lab static route is not yet activated. A missing /anatomy/4d-lab/ mount falls through to the main web SPA and returns HTTP 200 HTML, which cannot boot the original 4D app. The production Caddyfile remains byte-identical to its security-reviewed version; the required original Lab route is prepared only in deploy/4d-lab.caddy.snippet and via a review-only Caddy candidate generator.
2. The host viewer checked only whether /anatomy/viewer/ returned HTML. The SPA fallback also returns HTML, leading to false positives. It now verifies real data/atlas-catalog.json too.
3. The host 4D Lab checked only a procedural phantom manifest. It now verifies the original Vite lab HTML and JavaScript, its default Atlas CT manifest and both CT and labels so that blocked/missing data do not look like a working full Lab.
4. A new Caddy candidate script modifies only the 4D route, preserves other live paths, and enforces a 404 for restricted /anatomy/4d-lab/data/atlas/* assets until clearance.

## Test the original app locally (Mac Terminal, not SSH)

    cd ~/mpruy
    git fetch origin
    git switch fix/human-anatomy-live-integration-20261124
    git pull --ff-only origin fix/human-anatomy-live-integration-20261124
    npm run test:anatomy-integration
    npm run test:4d-lab
    npm run preview:4d-lab

Open http://127.0.0.1:4173/anatomy/live for the actual MEDCOEL 4D Lab, not an imitation. The original Atlas is at /anatomy/explore. Private BodyParts3D assets remain on the Mac under local-data/licensing-quarantine; do not copy them to the public site.

## Check the actual public domain, read-only

    npm run audit:human-anatomy-live

The audit checks actual mounted Atlas HTML+JSON, 4D Lab app+JS+CT/label files, and restricted asset HTTP 404, and reports rights separately. No uploads or deployment.

## Prepare a Caddy review candidate only — no activation

On a server checked out to the reviewed integration commit (real checkout may be /opt/medcoel or /opt/medcoel/app):

    node scripts/prepare-4d-lab-caddy.mjs /etc/caddy/Caddyfile /tmp/medcoel-4d-lab-review.Caddyfile
    sudo caddy validate --config /tmp/medcoel-4d-lab-review.Caddyfile --adapter caddyfile
    sudo diff -u /etc/caddy/Caddyfile /tmp/medcoel-4d-lab-review.Caddyfile

Never blindly replace the live Caddyfile; it contains API, PocketBase, unrelated mounts and existing quarantine. The candidate generator never writes to the live server config and never reloads services.

## Release gate remains BLOCKED

The original 4D Lab application and Atlas-derived code/assets have unresolved distribution and commercial-rights evidence in licensing/commercial-release.json. The 702 BodyParts3D review models passed technical GLB/source checks but remain clinically unvalidated and unauthorized for public distribution. Do not bypass scripts/stage-4d-lab.mjs exact-build approval, copy private assets into public dist, or use an owner risk override.

Only after code/asset rights are documented, clinician validation is completed, and the exact build staging check passes should a responsible operator activate the reviewed Caddy candidate and source-pinned original Lab release. A GitHub merge is not a production deployment.

## Full integration acceptance

- Signed-in user can open the real /anatomy learning library, /anatomy/explore original viewer and /anatomy/live original Lab.
- Viewer has real Atlas JSON and rendered anatomy, not the parent SPA fallback.
- 4D Lab has its real JavaScript, default Atlas CT, labels, probe, MPR, US, physiology and learning controls.
- Private 702 GLB review package is preserved and never distributed publicly without separate approval.
- GET/HEAD/Range quarantine and routing checks pass on the live Caddy after approved activation.
