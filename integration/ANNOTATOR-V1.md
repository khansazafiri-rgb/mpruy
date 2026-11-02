# Human Anatomy Annotator v1 — companion frontend

Route: `/admin/anatomy`, nested under the existing `RequireAuth admin` guard.
Menu: Konten belajar -> Human Anatomy. No PocketBase schema, API or question-bank
changes are needed. The editor stores versioned annotation JSON in local browser
storage (account + source scoped) and downloads JSON on Save JSON.

Use with the companion Anatomy source on branch `feature/anatomy-annotator-v1`,
not the older viewer bundle: it adds the optional same-origin bridge loaded by
`/anatomy/viewer/?annotator=1`. Existing `/anatomy` remains the normal atlas.
`/anatomy?landmarks=Humerus.r` reads published static annotation JSON in a read-only
study view. Admin drafts do not appear to students until explicitly reviewed,
exported and committed into the Anatomy public annotations directory.

The six initial landmarks have null geometry and NOT_MAPPED status. QA screenshot
regions are disposable drafts, not reviewed anatomical locations. VERIFIED is an
explicit manual action, requiring reviewer name and checkbox confirmation.

Schema/protocol copies in `src/features/anatomy/` mirror Anatomy pure modules.
Keep the schema identical and the protocol identical except its schema import path.
The original ready/error protocol remains in hostProtocol.mjs.

## Local preview only

```sh
# In the companion Anatomy checkout, Node >=22.12:
npm ci
ANATOMY_BASE=/anatomy/viewer/ npm run build

# In this main checkout:
npm ci
npm run build --prefix apps/web -- --config vite.anatomy-preview.config.js
PORT=4182 ANATOMY_DIST=/absolute/path/to/anatomy/dist npm run preview:anatomy
```

Open `http://127.0.0.1:4182/admin/anatomy?admin=1`. The explicit preview Vite config
uses a fake local account; `?admin=1` only selects its role in that preview build.
The normal production build uses the unchanged real AuthContext and ignores this
flag. Preview APIs are static read-only fixtures, with a visible preview badge.
Do not copy the preview build to production.

## Checks

```sh
npm run lint
npm run test --prefix apps/web
npm run build
npm run test:anatomy-integration
```

The checkout is the frontend integration snapshot; full PocketBase runtime tests
must be run in the complete main repository's CI before any eventual merge.
The three existing route/layout files modified here were verified byte-identical
at their base to upstream `bb210d935071703130a58c423afba5c4befc8d81` before changes.
These changes are additive; do not replace the complete main repository tree with
the standalone Anatomy tree or this frontend snapshot. PR #84 must not be merged.

No deployment, Caddy edits, production service restart or main-branch merge is
part of this work. See ANNOTATOR-REVIEW.md for final local commits and test evidence.
