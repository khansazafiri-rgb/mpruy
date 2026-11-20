# Human review workflow (medical · privacy · terminology), bound to SHA-256

Tool: `licensing/tools/studio-review.mjs`. Tests: `scripts/studio-review.test.mjs` (REVIEW-001…007, in `npm run test:studios`).

## Principles
- **No approval without a real person.** Reviewers are added only by the owner to `licensing/reviews/reviewers.v1.json`
  (`id`, `kinds` ⊂ medical/privacy/terminology, `credentialRef` to the owner's own records, optional `revokedAt`). The file is
  committed **empty**; the tool never creates reviewers and nobody was invented.
- **Signed, append-only decisions.** `licensing/reviews/decisions.v1.json` (committed empty). Each entry is HMAC-SHA256-signed
  with a key held outside the repository (`MEDCOEL_REVIEW_KEYS="kid:secret"`, secret ≥ 32 chars). An entry edited by hand
  fails its signature and has no effect.
- **Bound to exact bytes.** A decision names `target` (`asset:<id>` or `terminology:<studioId>`) and its `sha256`. Any byte
  change (new pipeline output, edited terminology pack) makes the decision inapplicable → status falls back to `pending`.
- **Revoke / invalidate.** `revoke --decision <id>` appends a signed revocation. A later decision supersedes an earlier one. A
  **rejected parent** (official raw input) blocks approval of every derived asset that depends on it. Removing a reviewer
  (`revokedAt`) invalidates their decisions made after that time.
- **Single source of truth.** `apply` projects effective decisions onto `licensing/resources.v1.json` review fields;
  `verify` fails if the registry differs from the projection (hand-edited approvals are detected). CI runs
  `verify --structural` (no key in CI: checks structure, reviewer authority and drift; signatures are checked on the release
  machine). The B1 inspector additionally requires `reviewedSha256 === asset.sha256` and the intended-use scope.
- **Typed quiz stays inactive** until a terminology pack (`review/terminology.draft.json` in the private build, status
  `proposed`, Indonesian/Latin forms empty) is completed by a terminology reviewer and its exact bytes approved; only then may it
  be installed as `server/terminology.json` with `status: approved` (the server checks this and the installation snapshot).

## Commands
```bash
node licensing/tools/studio-review.mjs package <studioId>      # private package: assets+sha, parents, challenge key, privacy scan, terminology draft, checklist (ID)
node licensing/tools/studio-review.mjs privacy-scan [studioId]  # automated checks (identity keys, dates, DICOM UIDs, NIfTI descrip/aux/extensions, gzip FNAME/mtime, GLB names, CSV/DICOM shipped)
node licensing/tools/studio-review.mjs decide --target asset:<id> --kind medical --decision approved --reviewer <id> --scope private-review --evidence <ref> --reason "<text>"
node licensing/tools/studio-review.mjs revoke --decision <id> --reviewer <id> --reason "<text>"
node licensing/tools/studio-review.mjs apply && node licensing/tools/studio-review.mjs verify
```

## State on 2026-11-20
- Review packages built for the 13 studios with private data (`local-data/studio-resources/review-packages/<id>/`, never
  committed); 11 include a terminology draft (anatomy regions, brain MRI, spine MRI).
- Automated privacy scan: 0 findings on all 13 private builds. This is evidence for a reviewer, **not** a privacy sign-off
  (burned-in text and re-identification risk need a human).
- Reviewers registered: 0 · decisions: 0 · approved assets: 0.
