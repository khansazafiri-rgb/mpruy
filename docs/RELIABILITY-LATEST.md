# MEDCOEL latest reliability integration — review only

No production deployment, merge to main/production, force-push, production service
restart, Caddy edit or PDF delivery was performed. The final branch is
`fix/hermes-anatomy-reliability-latest` in `khansazafiri-rgb/mpruy`.

## Baselines and consolidation

- Main: `3d32ed2ab094a1c157637bedcf2a9fa8b27317ad`, fetched from
  `claude/focused-wozniak-1ayrxa` after PR #106. Includes #99/#101 UI, #103/#104 materi/Hermes, and #105/#106 PDF-derived titles and per-PDF question sections. The baseline was advanced again on 3 November after the interrupted session.
- Viewer: `2e4fb05ac5953ae4d68ea01c1285edfe38571f86` from
  `handoff/anatomy-visual-learning`, including PR #100.
- Ported fixes: main `0eec0d7d5919319558c0d6a9589838a7479b5f76`, viewer
  `7e40cee1d11c7b4a639cbd573e7b387b20d26926`.
- All remote branch refs were fetched. The two upstream layouts are consolidated
  in ONE integration branch: main remains at root; complete viewer source is at
  `apps/anatomy`. Dependencies/build output are not committed. Both frontends have
  their own package-lock files. Do not merge the old standalone root over main.

The final integration commit records both upstream heads as parents, while its
review diff against the main baseline adds the viewer under `apps/anatomy`.
`apps/anatomy/INTEGRATION-PROVENANCE.json` records the source provenance.

## Semantic conflicts and preservation

Nine files required manual reconciliation:

| File | Resolution |
|---|---|
| `apps/hermes-agent/src/index.mjs` | Independent delivery worker plus latest kindOf/materi-specific instructions; preserve ImportPlanFlow. |
| `apps/hermes-agent/src/notify.mjs` | Retain SOAL/PPT MATERI labels and slide instructions; distinguish available Drive links from delivery and processing estimates. |
| `apps/web/src/features/anatomy/LibraryViewer.jsx` | Retain back props/localized text, add interactive handshake and study query, keep target-specific acknowledgement. |
| `apps/web/src/features/anatomy/hostProtocol.mjs` | Latest withBackLink plus bounded lifecycle messages, exact frame/origin checks and health probe. |
| `apps/web/src/features/anatomy/hostProtocol.test.mjs` | Retain both back-link and reliability regression cases. |
| `apps/web/src/pages/AnatomyLibrary.css` | Keep all new UI rules and append only non-covering status banner. |
| `apps/web/src/pages/HumanAnatomy.jsx` | Latest back prop/single-header flow plus visible iframe, ping/progress/error handling. |
| `apps/anatomy/src/atlas/ui.js` | Latest region picker, bottom systems bar, infobox, pictured search, Indonesian text; optional indexing/previews run independently after UI. |
| `apps/anatomy/src/main.js` | New atlas-v3 CSS and bootstrap conventions plus skeleton-first/non-blocking startup and lifecycle. |

Other overlapping changes were also inspected: the API client retains
`importDeckSubmission`; default layers retain Indonesian labels and the latest
superficial-muscle layer preference when muscles are enabled. The PDF queue stores
contentKind and passes it to the latest describeFile so materi PDFs retain
`_MATERI_PDF-...` naming and PPT MATERI captions.

The later #105/#106 update overlapped index.mjs and notify.mjs again. Their pdfCount-aware /put instructions were combined with the delivery ledger; latest import-plan/json-paste, title selection, backend/UI changes and migrations were retained unchanged. Annotation host consumers explicitly wait for legacy ready, so loading/interactive cannot reset an annotation session or initialize it twice.

Preservation verification compared the complete packaged viewer with its upstream
tree: 2,859 protected viewer files (models, thumbnails, branding, HTML, atlas-v3 CSS,
selection glow) are byte-identical. All PocketBase tracked files are unchanged
from the latest main baseline, including PR #103/#105 migrations and APIs. Latest
import-plan/files/json-paste, deck tests, AnatomyLibrary page, study and question-kind
logic are also unchanged. Reliability changes do not add or alter GLB geometry,
landmarks, question-bank content, or PocketBase migrations.

## Real production audit (read-only)

SSH to MEDCOEL succeeded. On 2 November the checkout was clean, on
`claude/focused-wozniak-1ayrxa`, commit `cde6116ac50c542192afc2f5a5becf52a0595ed7`.
On 3 November a new read-only check found the server independently updated to
`3d32ed2ab094a1c157637bedcf2a9fa8b27317ad`, clean on the same branch, with both
services active. That update was not performed by this task.
The installed `/usr/local/bin/medcoel-update` explicitly fetches/pulls that branch,
builds `apps/web`, and restarts PocketBase. The GitHub default/latest commit is
therefore not proof that production has updated.

Caddy and PocketBase were active. Live Caddy served `/anatomy/viewer/*` from
`/opt/medcoel/apps/web/dist`, without stripping the prefix. No viewer existed at
the inspected dist path or either proposed persistent path. Its no-slash redirect
also omitted the wildcard matcher before the destination; the candidate fixes it.
The live route still returned viewer/metadata/Draco/GLB 404 during the audit.

PocketBase is 0.40.5, Caddy is 2.11.7. PocketBase's real ExecStart uses
`--dir=/opt/pocketbase/pb_data`, hooks and migrations from `/opt/medcoel/apps/pocketbase`.
Back up `/opt/pocketbase/pb_data`, not a guessed folder inside the repo.

A targeted read-only query on 3 November confirmed `MC261102-XM8L` is still `antre`, with 5 PDFs and contentKind=soal. The field was absent on 2 November but is now installed. A fresh HTTP probe still returns viewer/metadata/Draco/GLB 404. No student contact
details, PDF contents or credentials were read for that query. The latest #103
migration is preserved for the eventual approved application rollout.

Hermes `ubuntu@100.70.251.71` still timed out. Its real service version, logs,
Telegram polling errors, Drive credentials/access and delivery ledger could not be
audited. Do not claim the bot is fixed in production or that a real file was sent.

## Root causes and fixes

Hermes previously coupled notification and relay, pre-marked announced in /terima,
and marked announced even after relay errors. Drive IDs only indicated metadata.
The separate PDF loop now persists a per-submission/admin/file ledger with started,
sending, delivered(message_id) and completed states. Announced is notification-only.
Queue reads are time-bounded; retries respect Telegram retry_after and exponential
backoff; Drive refresh, permission/PDF/size checks, streaming limits, serialized
fsynced atomic state writes and a process lock protect recovery. /put, /plan,
/confirm, /change, drilling-import and materi-import remain intact. Capacity/day
estimates refer to human processing/import work and do not delay Telegram delivery.

Telegram has no sendDocument idempotency key. Ambiguous outcomes are quarantined,
not blindly retried: inspect the chat before /retryfiles CODE number. Ordinary
/files cannot resend uncertain or acknowledged files. Initial migration of old
announced-only state cannot infer which PDFs were manually sent; reconcile backlog
before enabling the worker. Never erase acknowledgements or restore an old ledger
after new deliveries. See [sendDocument](https://core.telegram.org/bots/api#senddocument)
and [Drive downloads](https://developers.google.com/workspace/drive/api/guides/manage-downloads).

Anatomy is installed as a static release symlink outside the entire checkout:
`/var/lib/medcoel/anatomy-viewer` → `anatomy-viewer-releases/<commit>`.
The idempotent installer builds apps/anatomy; validation checks metadata, complete
GLBs, Draco and structure previews before atomic activation. Repeating the same
release verifies all source file hashes without changing the rollback journal;
different content under an existing ID is rejected. Prior hashed JS chunks remain
reachable for open tabs. Neither npm/Vite web build nor the inspected medcoel-update
script removes /var/lib/medcoel. Caddy serves the viewer directly; Hermes is not
required for 3D asset delivery.

Caddy candidate generation preserves unrelated live API/PocketBase routes. The
candidate adapted/validated locally against a copy of the actual live config.
HTML/data revalidate, existing hashed JS/CSS get one-year immutable cache, stable
GLB/Draco/thumbnail URLs get one-hour revalidation cache, MIME is correct and fake
assets return 404. No SPA fallback is used for viewer assets. Do not overwrite the
live Caddyfile with the whole repository template.

Fresh startup loads skeleton first; saved/shared scenes retain their systems.
Optional lexicon/definitions/synonyms/previews and idle BVH are outside the initial
interactive gate. Preview rendering does not wait for synonym indexing. Normal
BVH uses the same default index ordering; Annotator deliberately stays eager before
exposing hashes/face IDs. Pixel ratio is capped at 1.5, Draco workers at two, Safari
16 is a build target. The existing highlight animation, controls and UI remain.
Loading/interactive/ready/error lifecycle plus ping prevent a late ready event from
covering a healthy iframe. Study becomes answerable only after target selection.

## Validation

- Main web: 135 tests, lint and production/fixture builds pass.
- Hermes: 52 tests and syntax check; includes the latest deck/title-flow cases and a real
  agent process with fake API/Drive/Telegram proving announced/diproses delivery,
  per-file ack, and PPT MATERI filename/caption. Five-PDF safe dry run passes.
- PocketBase: 58 unit tests plus format checks. Isolated real PocketBase fixtures:
  materi API 15 steps; general API 55 steps pass. An initial shared-fixture run had
  two incorrect empty-state assumptions after deck fixtures populated Drilling;
  rerunning on a separate fresh database passes without changing production code.
- Viewer: 61 tests; lint 0 errors, 11 inherited console warnings; base build passes.
- Integration/release: 7 tests, including idempotence/rollback and promotion from a preview symlink without self-hashing the install journal. Installer run twice
  on the real built output reports unchanged on the second run.
- Real local Caddy: 200/MIME/length, gzip, immutable/revalidation headers, ETag304,
  range206, redirect, missing404, frame policy, dist wipe/recreation, Caddy restart
  and fake backend outage/restart pass. Production services were not restarted.
- HTTP smoke: index, systems, catalog, WASM and skeletal GLB 200; fake GLB 404.

Startup metrics are duration-only opt-in performance marks/measures (`?perf=1`).
The PR #100 baseline and new viewer were profiled on local WebKit. Cold samples:
interactive 1,827 ms baseline → 1,140 ms optimized. Baseline synchronous BVH took
479 ms; optimized skeletal registry 2 ms and BVH ran after interactive (143 ms).
These are small local samples with intentionally different default systems, not a
production WAN/p95 benchmark. GLTF timings combine network/Draco/parsing; first
render timing is CPU dispatch, not GPU-present timing. Actual GPU heap/physical
iPad testing and a complete native Safari acceptance run remain outside this local validation. Build entry-size details and
screenshots are in the delivered report; >500 kB entry advisory remains.

CI now also installs/tests/lints/builds the embedded viewer, runs Hermes and release tests, and runs the materi API suite on its own temporary database. The workflow is prepared; no GitHub CI run is claimed before publication.

## Review and deployment

Use [RELIABILITY-DEPLOYMENT.md](RELIABILITY-DEPLOYMENT.md). Commands are provided
for an approved rollout only; they were not executed. The current server already runs the latest backend baseline. This patch changes no PocketBase files or migrations, so default rollout leaves its service and data untouched. Older targets require a separately reviewed upstream migration/backup step. Hermes rollout is separately gated on real
service/state-path verification because the server is currently unreachable.

The normal production branch must receive the reviewed integration through a
human-approved merge before medcoel-update is used for a permanent rollout. No
automatic main merge or deployment is part of this task.
