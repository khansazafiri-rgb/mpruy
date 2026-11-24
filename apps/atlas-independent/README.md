# Independent Atlas publication preparation

Status: PRIVATE PROTOTYPE / NO_GO for production. This branch does not change Caddy, the current viewer, production routes, the release gate or any approved build. No anatomy model is committed here.

## Rehearsal (owner's Mac)

Use the existing completed local preview folder, e.g. `z-anatomy-native-preview-Vf8Y1E` as reported in the owner's export log. No Blender re-export is required.

```sh
npm ci --prefix apps/atlas-independent --ignore-scripts
npm test --prefix apps/atlas-independent
node scripts/preview-independent-atlas.mjs z-anatomy-native-preview-Vf8Y1E
```

Only loopback port 4186 serves the candidate model allowlist. The prototype build and rights report live in licensing-quarantine, not a public directory. The inventory explicitly rejects non-loopback hosts. The independent app uses Three.js and its own newly authored UI and source module; do not characterize this as a completed clean-room or legal origin review. A pinned lockfile and browser-module audit are prepared; actual npm ci, build and independent ownership/legal review remain required.

## Rights review

`prepare-atlas-publication-review.mjs` verifies each existing candidate's GLB checksum, geometry and lineage, then produces a local per-object review inventory. It does not grant rights or modify the candidate inventory. No object is approved by default. The pinned publisher notice is https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/3c1679595d89aa508ddffc72cd5e125c5d609a59/License.txt .

The publisher describes CC BY-SA 4.0 and names underlying BodyParts3D CC BY-SA 2.1 Japan, Brainder/white matter, Dundee cranial nerves and foramina CC BY 4.0, Dundee inner ear CC BY-NC-SA 4.0, and kidney by Lissie Cowley CC BY-NC 4.0. A blanket commercial approval is not justified. Record exact object/source hashes, copyright holder, licence, attribution, adaptation/ShareAlike obligations and evidence for each included object. Exclude known NC or unresolved items from public builds.

## Release gates still required

- Review new app code origin and dependency licences; complete feature parity and real browser/performance tests using the owner pack.
- Obtain qualified review of model-level provenance and exact redistribution/adaptation rights; preserve notices and source links. No HRA or private candidate may be redistributed automatically.
- Build a separate approved-artifact pipeline with validated manifest and exact digest, not a renamed private export. Keep existing commercial-release and quarantine safeguards; do not modify them until review and release-specific evidence support a change.
- Verify anatomy and honest coverage disclosure (no lymphatic vessel network in the current export). No clinical use claim.
- Test staging and rollback against separately approved builds, review production integration and obtain owner authorization for cutover. No production operation is part of this branch.

The independent app now implements system/region filters, layers, organ representations, search, isolation, navigation and a separate HRA reference mode. HRA remains source-native and private. Reference skin, translated definitions, full feature parity and actual browser/performance validation remain open. The optional main web preview serves /anatomy/explore with same-origin framing if the existing host build passes quarantine checks; no legacy Atlas/4D Lab fallback is exposed. Production routes and deployment remain unchanged.

## Consolidated evidence and staging checks

Run `scripts/run-atlas-publication-evidence.mjs` with the existing native and independently sourced BP3D private folder names to generate the consolidated evidence report without launching a browser. After an actual named rights review, `scripts/assemble-atlas-distribution-review.mjs` accepts an explicit reviewed selection and local evidence hashes. `scripts/validate-independent-atlas-staging.mjs` checks the resulting private review package, exact file membership, SHA-256 and attributions; it reports the existing commercial gate without activation. These commands cannot produce a public release or rollback approval. The existing public stage script only accepts the legacy layout and is intentionally not changed to promote private candidates.
