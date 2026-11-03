# Anatomy inside the MEDCOEL integration branch

This directory contains the complete PR #100 viewer source, with startup/host
reliability fixes applied. See INTEGRATION-PROVENANCE.json for exact source commits.
Models and visual assets are unchanged; no manual landmark mapping is required.

From the repository root (Node >=22.12.0):

```sh
npm ci --prefix apps/anatomy
npm run test:anatomy
npm run lint:anatomy
ANATOMY_BASE=/anatomy/viewer/ npm run build --prefix apps/anatomy
```

The viewer is a separate Vite application, not bundled into the React app. Both
sources now travel in one Git branch. Serve its dist through the persistent
`/var/lib/medcoel/anatomy-viewer` release symlink and `/anatomy/viewer/` Caddy mount.
Never copy its only served copy into apps/web/dist. The inherited standalone
publication documents describe historical source layouts; current rollout is in
`../../docs/RELIABILITY-LATEST.md` and `../../docs/RELIABILITY-DEPLOYMENT.md`.
