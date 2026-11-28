# Human Anatomy private rehearsal and release boundary

This checkpoint preserves the original UI in a loopback-only review. It grants no
commercial rights. Production deployment and database changes have not occurred.

## Evidence required before release

Pin one reviewed commit. Every included source and derivative must have reviewed
commercial distribution scope, attribution, provenance and applicable privacy
clearance. The original UI's NC/code-origin hold remains independent of model
licensing. Resolve clinical identity, laterality and registration holds as well.
Blank review templates and a successful CI run cannot approve release.

Run the integrated WS6/WS7 workflow. Its 436 BP3D / 24 HRA browser test uses real
publisher reference files with an engineering body fixture; it does not establish
rendering of the local 1,016-model body pack. Run that separately on a permitted
workstation, retaining browser reports and screenshots for visual review:

```sh
node scripts/launch-atlas-private-workstation.mjs --pack=independent-source-review-P5BhfB --include-audited-expansion --broad-recovery --launch-private
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node scripts/audit-atlas-local-system-browser.mjs http://127.0.0.1:4186/
PLAYWRIGHT_MODULE=/absolute/path/to/playwright node scripts/audit-atlas-local-recovery-browser.mjs http://127.0.0.1:4186/
```

The explicit pack name is workstation-specific; select the verified existing pack.
Do not bind the review to a public address or copy its geometry into public/dist.
Measure loading and JS/GPU/process memory on the full pack and actual mobile
hardware before accepting product performance. The six-reload heap check in CI
is only an engineering regression, with a 32 MiB retained-growth ceiling.

## Database rehearsal

The backup wrapper now requires Python 3 with SQLite support. It snapshots data.db
and optional auxiliary.db, decompresses and reopens each snapshot, verifies every
storage archive member and emits a SHA-256 manifest with private permissions.
A corrupt auxiliary DB or failed configured upload returns failure; no old backup
is removed before that failure. Legacy flat backups are retained untouched.

```sh
python3 scripts/backup-rehearsal.test.py
PB_DATA=/path/to/staging/pb_data BACKUP_DIR=/separate/path/to/staging-backups REMOTE='' bash deploy/backup.sh
```

This command has been tested with engineering databases, not the production DB.
A live DB snapshot and storage archive are not one cross-resource transaction.
For cutover, pause application writes and background jobs first, take a fresh
backup, verify its manifest, restore it into an empty private staging directory,
then run the pinned PocketBase binary there without production network access.
Check schema, representative record counts and storage references. Preserve the
previous PocketBase binary, exact code SHA, full data directory and active Caddy
configuration. Confirm available disk space and record the rollback point.

## Rollback and health procedure (not executed on production)

Keep the previous release artifact ready for an atomic docroot switch. With writes
still paused, test the staged host pages, API health/authentication and private
asset GET/HEAD/Range denials. Validate Caddy configuration before any reload.

If the health checks fail before writes resume, switch back to the previous
artifact and Caddy configuration and recheck health. Database restoration, if
required, must occur while PocketBase is stopped and into an empty directory;
verify hashes and integrity, restore storage and the matching previous binary,
then restart and check health before resuming writes. Never restore an old schema
under a new binary or overwrite a running database. A rollback after new writes
requires an explicit recovery decision because restoring the pre-cutover snapshot
would discard those writes.

No production commands should run until exact asset/legal, security, clinical,
rehearsal and release approvals are present. Do not use deploy/update.sh to bypass
these requirements. The only PR from this checkpoint is a draft integration.
