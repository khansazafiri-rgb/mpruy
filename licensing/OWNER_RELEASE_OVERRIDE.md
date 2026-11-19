# Owner release override (4D Lab and Atlas Viewer)

Date: 2026-11-10. Decision of the platform owner (answered in the session): **the release gate for the 4D Lab and the Atlas Viewer may
run**. This file records exactly what that means, so that nobody mistakes it for a rights clearance.

## What it is

- `licensing/commercial-release.json` now carries an `ownerOverride` block for `atlas-viewer` and `4d-lab`:
  `enabled`, `decidedBy`, `decidedOn`, `expiresOn`, `rightsVerified: false`, an exact acknowledgement sentence and the scope.
- `licensing/tools/check-commercial-release.mjs` accepts a blocked product **only** if that block is complete and honest:
  - `rightsVerified` must be `false` (an override cannot claim clearance);
  - the acknowledgement must match the required sentence exactly;
  - it must have a decision date that is not in the future, and an expiry in the future, at most **120 days** after the decision
    (this one: 2026-11-10 → **2027-02-08**).
- When used, staging prints a loud `OWNER OVERRIDE … Rights are NOT verified` warning, and the release record
  (`commercialRights` in the staged release's JSON) contains `ownerOverride: true`, `rightsVerified: false`, the decider, the dates
  and the list of blockers that were overridden.
- There is still no environment-variable bypass: the decision exists only in this committed file.

## What it does not do

- **It does not clear any rights.** `status` stays `blocked`, the blockers stay listed, `approvedBuilds` stays empty, and
  `licensing/commercial-rights-evidence.json` (0 of 14 verified) is untouched. `audit-commercial-evidence --require-clearance`
  still fails, as it should.
- **It does not restore withheld anatomy.** The quarantine (nervous system, kidney, renal pelvis, ossicles) is a separate guard
  (`licensing/quarantine-policy.json`, `check-distribution`) that every build and staging still enforces.
- **It does not change the legal facts**: the Atlas front-end is CC BY-NC-SA 4.0 and the owner has said they do not own it; the
  4D Lab's atlas-derived data has partly inferred provenance. Publishing them on a commercial platform can lead to takedown requests
  or a licence dispute. That risk was accepted by the owner in writing above; it is not mitigated by this change.

## How to turn it off

Any one of these re-blocks both products at the next staging run:
- set `"enabled": false` (or delete the `ownerOverride` block) in `licensing/commercial-release.json`;
- let it expire (2027-02-08): renewing it needs a new, dated decision;
- if rights are later cleared properly, fill `approvedBuilds` and set `status: "cleared"`, and delete the override.

An already staged release stays online until rolled back: `npm run stage:4d-lab -- --rollback` and the viewer's rollback keep
working (rollback of a previous release is re-checked against the same gate).

## Putting the 4D Lab and the Atlas Viewer on the server (not done by this change)

`medcoel-update` only builds `apps/web`. The two apps are separate static builds, installed on the server like this
(nothing below is run by this PR; see `apps/4d-lab/INTEGRATION.md` and `deploy/`):

```bash
cd /opt/medcoel/app                      # the checked-out repo on the server
npm ci --prefix apps/4d-lab && npm run build --prefix apps/4d-lab
LAB4D_DIR=/var/lib/medcoel/4d-lab LAB4D_RELEASE_ID=$(date +%Y%m%d%H%M) npm run stage:4d-lab
bash deploy/install-anatomy-viewer.sh    # builds and stages apps/anatomy under /var/lib/medcoel/anatomy-viewer
```

The Caddy routes (`deploy/4d-lab.caddy.snippet`, `deploy/anatomy.caddy.snippet`) must be present in the live Caddyfile, then
`caddy validate` and a reload; back the Caddyfile up first. The web page `/anatomy/live` checks for the lab and the Anatomi
landing page shows "Segera hadir" until the route exists (PR #181).

## Tests

`scripts/commercial-release.test.mjs` (6) and `scripts/anatomy-release.test.mjs` cover: blocked without an override; the committed
override accepted but never "verified"; incomplete, dishonest, expired, future-dated or too-long overrides refused; staging a Lab
fixture refused without and accepted with an override and recorded in the release. `npm run test:licensing` (36), `test:anatomy-integration`
(10) and `test:4d-lab` (123 + 4) pass.
