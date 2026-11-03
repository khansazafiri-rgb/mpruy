# Approved deployment and rollback runbook

**Review artifact only. None of these production mutations were executed.**
One repository/branch contains main, Hermes and viewer:
`khansazafiri-rgb/mpruy`, `fix/hermes-anatomy-reliability-latest`.
Use the full approved commit SHA from the delivery report as `APPROVED_SHA`.
The branch must be published before server fetches; no force-push is required.

## Production branch prerequisite

Live audit identified `/opt/medcoel`, branch `claude/focused-wozniak-1ayrxa`, and an
installed medcoel-update that explicitly switches to that branch. A human-approved
merge into that branch must precede a permanent normal deployment. Do not merge
automatically, and do not run medcoel-update while it still points at code that
does not include the approved integration. The ancestry gate below intentionally
stops before deployment if that prerequisite is not met (use a merge preserving the
reviewed commit; a squash requires a newly reviewed resulting commit SHA).

## MEDCOEL: prepare without changing traffic

Connect using the existing key, then set the SHA from the reviewed report:

```sh
ssh -i ~/.ssh/medcoel_biznet MEDCOEL@103.58.100.197
set -eu
: "${APPROVED_SHA:?Set the full approved commit SHA from the report}"
node -e 'const [major,minor]=process.versions.node.split(".").map(Number);if(major<22||(major===22&&minor<12))throw Error("Node >=22.12 required")'
test -z "$(git -C /opt/medcoel status --porcelain)"
git -C /opt/medcoel fetch origin
git -C /opt/medcoel merge-base --is-ancestor "$APPROVED_SHA" origin/claude/focused-wozniak-1ayrxa
RELIABILITY_STAMP=$(date -u +%Y%m%dT%H%M%SZ)
RELIABILITY_REVIEW="/opt/medcoel-reviews/$RELIABILITY_STAMP"
sudo install -d -m 0755 -o "$(id -un)" -g "$(id -gn)" "$RELIABILITY_REVIEW"
git clone --single-branch --branch claude/focused-wozniak-1ayrxa https://github.com/khansazafiri-rgb/mpruy.git "$RELIABILITY_REVIEW/source"
git -C "$RELIABILITY_REVIEW/source" switch --detach "$APPROVED_SHA"
test "$(git -C "$RELIABILITY_REVIEW/source" rev-parse HEAD)" = "$APPROVED_SHA"
cd "$RELIABILITY_REVIEW/source"
npm ci
npm ci --prefix apps/anatomy
npm test
npm test --prefix apps/hermes-agent
npm run check --prefix apps/hermes-agent
npm run lint
npm run test:anatomy
npm run lint:anatomy
npm run test:anatomy-integration
npm run build
ANATOMY_BASE=/anatomy/viewer/ npm run build --prefix apps/anatomy
# Stage a separate unserved pointer. Do not activate the production pointer here.
ANATOMY_VIEWER_DIR="$RELIABILITY_REVIEW/viewer-candidate" ANATOMY_RELEASE_ID="$APPROVED_SHA" bash deploy/install-anatomy-viewer.sh --skip-build
sudo cp -a /etc/caddy/Caddyfile "$RELIABILITY_REVIEW/Caddyfile.before"
sudo node scripts/prepare-anatomy-caddy.mjs /etc/caddy/Caddyfile "$RELIABILITY_REVIEW/Caddyfile.candidate"
sudo caddy validate --config "$RELIABILITY_REVIEW/Caddyfile.candidate" --adapter caddyfile
sudo diff -u /etc/caddy/Caddyfile "$RELIABILITY_REVIEW/Caddyfile.candidate" || test "$?" -eq 1
printf 'RELIABILITY_REVIEW=%s\nAPPROVED_SHA=%s\n' "$RELIABILITY_REVIEW" "$APPROVED_SHA"
```

The candidate must preserve api.medcoel.com, /api, the existing PocketBase dashboard
redirect and all unrelated headers/routes. Only the viewer handlers should change.
Do not replace live Caddy with deploy/Caddyfile. Keep the printed review path for
the same-shell activation and rollback commands. Preparation does not restart
anything or apply PocketBase migrations.

## MEDCOEL: approved activation window

The real database path is `/opt/pocketbase/pb_data`. On 3 November the audited
server already ran baseline 3d32ed2 with contentKind installed. The integration
changes no PocketBase files/migrations from that baseline. Default activation
therefore keeps PocketBase running and does not touch its data. If the baseline
gate fails, stop and review missing upstream migrations/backups separately.

```sh
set -eu
test -n "$RELIABILITY_REVIEW"
test -n "$APPROVED_SHA"
test -z "$(git -C /opt/medcoel status --porcelain)"
test "$(git -C /opt/medcoel branch --show-current)" = claude/focused-wozniak-1ayrxa
test "$(git -C /opt/medcoel rev-parse HEAD)" = 3d32ed2ab094a1c157637bedcf2a9fa8b27317ad
test -z "$(git -C /opt/medcoel diff --name-only HEAD "$APPROVED_SHA" -- apps/pocketbase)"
test -d /opt/pocketbase/pb_data
test -d /opt/medcoel/apps/web/dist
test ! -e /opt/medcoel/apps/web/dist.reliability-next
sudo install -d -m 0700 -o "$(id -un)" -g "$(id -gn)" "$RELIABILITY_REVIEW/backup"
git -C /opt/medcoel rev-parse HEAD > "$RELIABILITY_REVIEW/backup/old-commit"
git -C /opt/medcoel branch --show-current > "$RELIABILITY_REVIEW/backup/old-branch"
sudo caddy validate --config "$RELIABILITY_REVIEW/Caddyfile.candidate" --adapter caddyfile
# Fast-forward only, already gated on human-approved production-branch inclusion.
git -C /opt/medcoel merge --ff-only "$APPROVED_SHA"
sudo install -d -m 0755 -o "$(id -un)" -g "$(id -gn)" /var/lib/medcoel
cd "$RELIABILITY_REVIEW/source"
ANATOMY_DIST="$RELIABILITY_REVIEW/viewer-candidate" ANATOMY_RELEASE_ID="$APPROVED_SHA" bash deploy/install-anatomy-viewer.sh --skip-build
cp -a "$RELIABILITY_REVIEW/source/apps/web/dist" /opt/medcoel/apps/web/dist.reliability-next
mv /opt/medcoel/apps/web/dist "$RELIABILITY_REVIEW/backup/web-dist"
mv /opt/medcoel/apps/web/dist.reliability-next /opt/medcoel/apps/web/dist
sudo install -m 0644 "$RELIABILITY_REVIEW/Caddyfile.candidate" /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
sudo systemctl is-active --quiet pocketbase
sudo systemctl is-active --quiet caddy
ANATOMY_SMOKE_BASE=https://medcoel.com node scripts/anatomy-smoke.mjs
```

The merge --ff-only above is deployment of an already human-merged commit, not an
instruction to merge a PR automatically. If it cannot fast-forward, stop and
inspect the branch; never reset --hard or select one side blindly. Future
medcoel-update now remains on the reviewed production branch. Its Vite build only
replaces apps/web/dist and cannot remove /var/lib/medcoel/anatomy-viewer. Updating
viewer code in a future release uses the same idempotent installer with the new
approved commit ID. Old static releases remain available for rollback.

## MEDCOEL smoke and acceptance

```sh
curl --fail --silent --show-error -I https://medcoel.com/anatomy
curl --fail --silent --show-error -I https://medcoel.com/anatomy/viewer/
curl --fail --silent --show-error -I https://medcoel.com/anatomy/viewer/data/systems.json
curl --fail --silent --show-error -I https://medcoel.com/anatomy/viewer/data/atlas-catalog.json
curl --fail --silent --show-error -I https://medcoel.com/anatomy/viewer/draco/draco_decoder.wasm
curl --fail --silent --show-error -I https://medcoel.com/anatomy/viewer/models/skeletal.glb
curl --silent --show-error -o /dev/null -w '%{http_code}\n' https://medcoel.com/anatomy/viewer/__missing__.glb
# Expected: 200 for real assets, 404 for the fake asset.
curl --fail --silent --show-error -I -H 'Range: bytes=0-11' https://medcoel.com/anatomy/viewer/models/skeletal.glb
# Expected: 206, correct GLB MIME and non-permanent stable-name cache.
```

Check fresh/cached/reload loads, direct structure URLs, picture search, regio/system
cards, all quiz modes, highlight, isolation/hide/fade/focus/restore, mobile bottom
sheet, share/back links and /admin/anatomy. Test actual Safari/iPad hardware and
production WAN timing after approval. Do not run database-writing API fixture tests
against production. Verify materi-import and schema version through the normal
admin flow. The local fake backend restart test does not claim a production restart
has already been performed.

## Hermes: preflight while connectivity is restored

Hermes could not be inspected live. The rollout below is gated on the paths from
the repository service template; if the actual unit/state path differs, stop and
adapt the reviewed runbook to that unit. Never create a fresh empty state directory
as a substitute for the real delivery/import state.

```sh
ssh -i ~/.ssh/tencent_automation_ed25519 ubuntu@100.70.251.71
set -eu
: "${APPROVED_SHA:?Set the full approved integration commit SHA}"
sudo systemctl show medcoel-hermes -p ActiveState -p WorkingDirectory -p User -p Group -p FragmentPath -p DropInPaths
test "$(systemctl show medcoel-hermes -p WorkingDirectory --value)" = /opt/medcoel-hermes/app/apps/hermes-agent
test -f /opt/medcoel-hermes/hermes.env
sudo test -f /opt/medcoel-hermes/data/state.json
# Verify HERMES_STATE_DIR is this actual data directory; do not print the env file.
# Confirm Telegram chat/backlog before activating a new delivery worker.
HERMES_REVIEW="/opt/medcoel-hermes/releases/$APPROVED_SHA"
sudo install -d -m 0755 -o "$(id -un)" -g "$(id -gn)" "$HERMES_REVIEW"
git clone --single-branch --branch fix/hermes-anatomy-reliability-latest https://github.com/khansazafiri-rgb/mpruy.git "$HERMES_REVIEW/source"
git -C "$HERMES_REVIEW/source" switch --detach "$APPROVED_SHA"
test "$(git -C "$HERMES_REVIEW/source" rev-parse HEAD)" = "$APPROVED_SHA"
cd "$HERMES_REVIEW/source/apps/hermes-agent"
npm run check
npm test
node scripts/pdf-queue-dry-run.mjs
```

First activation can process every eligible antre/diproses submission. Review
MC261102-XM8L and any PDFs already sent manually. Announced is not a delivery
acknowledgement, so do not mark those delivered automatically. If a historical
delivery is confirmed, reconciliation requires the actual Telegram message_id and
matching Drive file/admin chat; do not invent confirmation records. Do not send
multiple real test PDFs while diagnosing an uncertain outcome.

### Hermes approved activation (template paths must match preflight)

```sh
set -eu
test -n "$HERMES_REVIEW"
sudo test -f /opt/medcoel-hermes/data/state.json
test ! -e /etc/systemd/system/medcoel-hermes.service.d/90-reliability.conf
sudo systemctl stop medcoel-hermes
sudo cp -a /opt/medcoel-hermes/data "$HERMES_REVIEW/state.before"
sudo install -d -m 0755 /etc/systemd/system/medcoel-hermes.service.d
sudo tee /etc/systemd/system/medcoel-hermes.service.d/90-reliability.conf >/dev/null <<EOF
[Service]
WorkingDirectory=$HERMES_REVIEW/source/apps/hermes-agent
ExecStart=
ExecStart=/usr/bin/node $HERMES_REVIEW/source/apps/hermes-agent/src/index.mjs
Environment=HERMES_STATE_DIR=/opt/medcoel-hermes/data
TimeoutStopSec=360
EOF
sudo systemctl daemon-reload
sudo systemctl start medcoel-hermes
sudo systemctl status medcoel-hermes --no-pager
```

This preserves the existing service user, sandbox and EnvironmentFile. Observe
journal locally for picked → Drive → sending → sent(message_id) → completed; do not
publish raw logs or credentials. After the fake dry run, explicitly select one
non-sensitive real test if needed, then verify the document and ledger before
testing more. On uncertain, inspect the chat before /retryfiles. Do not restore an
old state snapshot after confirmed new deliveries.

## Rollback MEDCOEL

Use the exact saved review path, not a guessed latest directory. Never reset --hard
or rewind/delete current database data automatically.

```sh
set -eu
test -n "$RELIABILITY_REVIEW"
test -d "$RELIABILITY_REVIEW/backup/web-dist"
test -z "$(git -C /opt/medcoel status --porcelain)"
OLD_RELIABILITY_COMMIT=$(cat "$RELIABILITY_REVIEW/backup/old-commit")
git -C /opt/medcoel switch --detach "$OLD_RELIABILITY_COMMIT"
mv /opt/medcoel/apps/web/dist "$RELIABILITY_REVIEW/web-dist.failed"
mv "$RELIABILITY_REVIEW/backup/web-dist" /opt/medcoel/apps/web/dist
sudo cp -a "$RELIABILITY_REVIEW/Caddyfile.before" /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
# If a previous persistent viewer release exists:
cd "$RELIABILITY_REVIEW/source"
node scripts/stage-anatomy.mjs --rollback
```

First installation has no previous viewer release; rollback safely refuses in that
case, and restoring old Caddy/web removes the new mount. Keep all viewer release
files for inspection. PocketBase files and data are unchanged by this rollout, so code rollback does
not restart PocketBase or undo migrations. Never restore an old database snapshot
over live/new writes; database recovery requires its own reviewed maintenance plan.
Normal updater is intentionally blocked by the detached rollback checkout until
the production branch/rollout is reconciled.

## Rollback Hermes without duplicating PDFs

```sh
set -eu
test -n "$HERMES_REVIEW"
sudo systemctl stop medcoel-hermes
sudo cp -a /opt/medcoel-hermes/data "$HERMES_REVIEW/state.after-preserved"
sudo mv /etc/systemd/system/medcoel-hermes.service.d/90-reliability.conf "$HERMES_REVIEW/90-reliability.conf.disabled"
sudo systemctl daemon-reload
# Keep old Hermes stopped until current acknowledgements are reconciled.
```

Old code neither uses nor preserves pdfJobs. Restarting it blindly or restoring
state.before can erase delivery history and resend documents. Prefer a forward fix
retaining the ledger. After review, restore the saved drop-in and start the
corrected worker; never discard acknowledged deliveries.
