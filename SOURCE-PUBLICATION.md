# MEDCOEL Anatomy — reviewed Work mode source

This branch contains the complete standalone Anatomy frontend at the repository root.
It is intentionally independent of the MEDCOEL main frontend directory layout.

Reviewed integration-preview source: `da3588ac175ecea4846c73213e307815bd074dc2`.
MEDCOEL UI checkpoint: `b89d529a6b4b069431dde19aa75286aa656d2b8b`.
Original local checkpoint: `753c1aa05ae2c54fde1d5c5a0ff28bc5568d6279`.
This is not the older Hermes manual checkout `c3952c3` / upstream `8ca3b74`.

Publication adds this provenance record, a SHA-256 file inventory, complete lint
coverage for Node scripts/tests, and error/standalone host protocol tests.
The reviewed UI, runtime engine, model files, catalogs, and host implementation
remain byte-identical to the reviewed preview source.

## Build without deployment

Node >=22.12.0 is required. Use the committed package-lock.json.

```sh
npm ci
npm run lint
npm test
ANATOMY_BASE=/anatomy/viewer/ npm run build
```

Build output is `dist/`. Building does not publish, restart services, or modify Caddy.
No production service configuration is applied by this branch. The inherited
GitHub Pages workflow only deploys on pushes to `master` or manual invocation;
do not invoke it for this review source.

The source includes seven GLB models, Draco decoder, catalogs, branding, styles,
Three.js engine source, tests, and the Vite/npm lockfile. Dependencies are installed
with npm ci; node_modules and dist are intentionally not committed. Blender
originals are not required to run/build the atlas and remain excluded.

## Host integration

- `src/integration/host.js`: same-origin, version 1 ready/error events.
- `src/main.js`: reports `medcoel:anatomy-ready` or `medcoel:anatomy-error`.
- `src/atlas/ui.js`: embedded sharing points to `/anatomy#atlas=...`.
- Vite defaults to `/anatomy/viewer/` for builds; ANATOMY_BASE overrides it.

`SOURCE-MANIFEST.json` records SHA-256 hashes of every other tracked source file
at publication. Verify these before using the checkout on a server.
