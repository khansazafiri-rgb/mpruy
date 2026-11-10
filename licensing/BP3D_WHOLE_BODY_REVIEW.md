# MEDCOEL BodyParts3D assembled-body review (isolated)

**Status:** Development-only / private review. Not production-deployable, not complete clinical anatomy, not CT/USG registered. No changes to existing `apps/anatomy`, `apps/web` or `apps/4d-lab/src` runtime.

## What this does

The bulk official DBCLS source workflow already emits 470 individual GLBs and `inventory.json`. Instead of centering each structure independently, the new `body.html` loads **multiple source meshes in their unmodified global coordinates** in the same Three.js scene. It opens with skeletal candidates for lower memory usage; each other available system can be enabled, with original geometry (no invented missing mesh), tissue-class color, source-neutral mode, alpha, high-contrast, search/focus, and fit visible anatomy.

This is a **partial composite**, not a fully verified complete body surface. The 1,767 other Atlas names still require reconciliation, and BodyParts3D's own coverage and hierarchy may not map one-to-one onto that catalog. Even a coherent outline does not establish correct units, bone landmarks, native-coordinate origin, clinical identity, or patient alignment. The viewer must retain all provenance warnings. Safari/iPad visual and GPU memory tests are required before any release.

## Rebuild and inspect locally

```sh
npm ci --prefix apps/4d-lab
npm run audit:bodyparts3d -- --download
npm run batch:bodyparts3d -- --all
python3 -m http.server 4783 --bind 127.0.0.1 --directory local-data/licensing-quarantine/bp3d-batch
# http://127.0.0.1:4783/body.html
```

Or download the CI artifact `bp3d-bulk-review-unapproved`, extract it, serve its root with an HTTP server, and visit `body.html`. GitHub artifact ZIP files expire and are **not** deployment storage.

Both `index.html` (single structure) and `body.html` (multi-system assembly) are static local output in gitignored `local-data`. Neither is linked from the MEDCOEL production host. They use the existing official 470 review models and MIT Three.js library from the build.

## How to get it onto the MEDCOEL website safely

A real web launch needs a **persistent, access-controlled review build**, not a temporary GitHub Actions artifact or an unreviewed upload into `apps/web/public`. Keep this new app independent of the third-party CC BY-NC-SA Atlas frontend and CT/USG derivatives. Verify allowed official DBCLS BodyParts3D model use and reproduce its CC BY 4.0 attribution; independently verify every other bundled dependency. Review exact build hashes, data provenance, site licensing obligations, page access restrictions, performance and rollback plan. Do not turn off `licensing/commercial-release.json` gates or assume that a free student login makes NC upstream code commercially licensed.

After reviewer approval, the host can serve a dedicated **restricted** review location using the build output and HTTP access controls without altering `/anatomy/viewer/` or `/anatomy/4d-lab/`. Public deployment or inclusion in the normal student site requires its own documented legal and product clearance. No server access or production deployment is performed by this branch.

## Minimum acceptance

- [ ] All converted candidates load without missing asset requests.
- [ ] Multiple named body systems share original source coordinates without ad-hoc transformations; inspect both left and right sides.
- [ ] The geometry looks spatially coherent under full-body orbit, zoom, and side views; photograph Safari before/after.
- [ ] All muscles/bones preserve consistent tissue colors; switch to neutral and high contrast.
- [ ] Search/focus and fitting work while systems toggle on/off.
- [ ] Memory remains usable on target Safari Mac/iPad (start skeleton-only, progressive load max 3).
- [ ] No removed, hidden, duplicated, or fabricated anatomy.
- [ ] Existing public Anatomy and 4D Lab data, code and release gates unchanged.
- [ ] Rights and exact-hash release gates cleared **before public rollout**.
