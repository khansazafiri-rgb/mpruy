# Anatomy quiz deployment — run only after approval

This document contains future commands. No production commands were run for this
change. Do not use the older first-install Caddy runbook: the existing persistent
viewer mount is already configured and must remain unchanged.

Review branch: `fix/anatomy-quiz-find-ux` in `khansazafiri-rgb/mpruy`.
Deploy **both frontends** from the same approved release. No Hermes/PocketBase
restart, database migration or Caddy edit/reload is needed for this patch.

## Before activation

A human first reviews the branch, merges it into the actual production branch and
approves the resulting production release SHA. This task does not perform that
merge. Use the final quiz commit SHA from the delivery report as QUIZ_SHA, and the
approved production merge/release SHA as RELEASE_SHA. These may be different.
Do not set RELEASE_SHA to an arbitrary unreviewed remote head. Do not force-push,
reset --hard, or run a general updater that might restart unrelated services.

Connect from your Mac:

```sh
ssh -i ~/.ssh/medcoel_biznet MEDCOEL@103.58.100.197
```

Run the following **on MEDCOEL**, filling the two full 40-character approved SHAs.
Confirm PRODUCTION_BRANCH against your actual server; the value below is the last
read-only audited production branch, not an instruction to change branches.

```sh
set -eu
export QUIZ_SHA=FILL_FINAL_QUIZ_COMMIT_FROM_REPORT
export RELEASE_SHA=FILL_APPROVED_PRODUCTION_RELEASE_SHA
export PRODUCTION_BRANCH=claude/focused-wozniak-1ayrxa
node -e 'for(const k of ["QUIZ_SHA","RELEASE_SHA"])if(!/^[a-f0-9]{40}$/.test(process.env[k]||""))throw Error("Fill approved "+k);const [a,b]=process.versions.node.split(".").map(Number);if(a<22||(a===22&&b<12))throw Error("Node >=22.12 required")'
test "$(git -C /opt/medcoel branch --show-current)" = "$PRODUCTION_BRANCH"
test -z "$(git -C /opt/medcoel status --porcelain)"
test -L /var/lib/medcoel/anatomy-viewer
git -C /opt/medcoel fetch origin
git -C /opt/medcoel merge-base --is-ancestor "$QUIZ_SHA" "$RELEASE_SHA"
git -C /opt/medcoel merge-base --is-ancestor "$RELEASE_SHA" "origin/$PRODUCTION_BRANCH"
git -C /opt/medcoel merge-base --is-ancestor HEAD "$RELEASE_SHA"
# Stop if this release would also change backend code: review that separately.
test -z "$(git -C /opt/medcoel diff --name-only HEAD "$RELEASE_SHA" -- apps/pocketbase apps/hermes-agent)"
QUIZ_REVIEW="/opt/medcoel-reviews/anatomy-quiz-$RELEASE_SHA"
sudo install -d -m 0755 -o "$(id -un)" -g "$(id -gn)" "$QUIZ_REVIEW"
# A fresh review directory is intentional. If it exists, inspect it before resuming.
test ! -e "$QUIZ_REVIEW/source"
git -C /opt/medcoel worktree add --detach "$QUIZ_REVIEW/source" "$RELEASE_SHA"
cd "$QUIZ_REVIEW/source"
npm ci
npm ci --prefix apps/anatomy
npm run lint
npm run lint:anatomy
npm test
npm run test:anatomy
npm run test:anatomy-integration
npm run build
npm run build:anatomy
# Validate/install a separate, unserved candidate; the live symlink is untouched.
ANATOMY_VIEWER_DIR="$QUIZ_REVIEW/viewer-candidate" ANATOMY_RELEASE_ID="$RELEASE_SHA" bash deploy/install-anatomy-viewer.sh --skip-build
printf 'Prepared %s\n' "$QUIZ_REVIEW"
```

The ancestry and backend gates deliberately stop if the live code differs from the
expected release. Inspect that difference; do not bypass them blindly. Confirm the
existing Caddy `/anatomy/viewer/` mount still points at
`/var/lib/medcoel/anatomy-viewer`, and that the account performing activation can
write its existing release directory. Resolve ownership in the established server
setup; do not relocate the viewer into web dist.

## Approved activation window

Use the same server shell and the prepared review directory. Keep this short
activation window so the updated web and viewer are published together. A small
mixed-version interval remains between filesystem swaps; reloading an existing
quiz tab after activation obtains the matching pair. Old automatic pick events
are rejected by the new host because they lack explicit answer intent.

```sh
set -eu
: "${QUIZ_REVIEW:?Use the preparation shell and review path}"
: "${RELEASE_SHA:?Use the approved release SHA}"
test "$(git -C "$QUIZ_REVIEW/source" rev-parse HEAD)" = "$RELEASE_SHA"
test -z "$(git -C /opt/medcoel status --porcelain)"
test -d /opt/medcoel/apps/web/dist
test ! -e /opt/medcoel/apps/web/dist.quiz-next
mkdir "$QUIZ_REVIEW/backup"
git -C /opt/medcoel rev-parse HEAD > "$QUIZ_REVIEW/backup/old-commit"
readlink -f /var/lib/medcoel/anatomy-viewer > "$QUIZ_REVIEW/backup/old-viewer-target"
cp -a /opt/medcoel/apps/web/dist "$QUIZ_REVIEW/backup/web-dist"
cp -a "$QUIZ_REVIEW/source/apps/web/dist" /opt/medcoel/apps/web/dist.quiz-next
# Local checkout advances only to the already human-approved production release.
git -C /opt/medcoel merge --ff-only "$RELEASE_SHA"
cd "$QUIZ_REVIEW/source"
ANATOMY_DIST="$QUIZ_REVIEW/viewer-candidate" ANATOMY_RELEASE_ID="$RELEASE_SHA" bash deploy/install-anatomy-viewer.sh --skip-build
mv /opt/medcoel/apps/web/dist "$QUIZ_REVIEW/backup/web-dist.active"
mv /opt/medcoel/apps/web/dist.quiz-next /opt/medcoel/apps/web/dist
ANATOMY_SMOKE_BASE=https://medcoel.com node scripts/anatomy-smoke.mjs
```

No Caddy reload or service restart is required for these static files. The installer
retains hashed viewer assets and a previous release pointer. Keep a backup of the
old web dist for rollback; existing web tabs may require refresh after the swap.
Acceptance: desktop, iPad landscape/portrait, phone; only two modes; find starts
unselected and unframed to target; hide/unhide/show all do not score; an explicit
wrong answer permits retry; a correct answer offers next; next/restart clear hides;
identify has four choices and no target label in the model; Explore/search/library
and Annotator still work. Verify API and Hermes service health without restarting.

## Rollback both static frontends

From the same review checkout/shell, while its installer journal still records this
release as active:

```sh
set -eu
: "${QUIZ_REVIEW:?Use the activation review path}"
test -d "$QUIZ_REVIEW/backup/web-dist.active"
test ! -e /opt/medcoel/apps/web/dist.quiz-failed
cd "$QUIZ_REVIEW/source"
ANATOMY_VIEWER_DIR=/var/lib/medcoel/anatomy-viewer node scripts/stage-anatomy.mjs --rollback
mv /opt/medcoel/apps/web/dist /opt/medcoel/apps/web/dist.quiz-failed
cp -a "$QUIZ_REVIEW/backup/web-dist.active" /opt/medcoel/apps/web/dist
ANATOMY_SMOKE_BASE=https://medcoel.com node scripts/anatomy-smoke.mjs
```

This restores served artifacts without rewriting Git history or touching backend
state. The checkout remains at the approved release; pause routine frontend updates
until a reviewed revert commit is merged, or they will rebuild the changed quiz.
If another release has since been installed, stop and inspect its deployment
journal before rolling back. Preserve backups and failed artifacts for review.
