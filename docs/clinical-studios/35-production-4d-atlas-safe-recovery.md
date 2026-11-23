# MEDCOEL production incident — 4D Lab / Atlas viewer safe recovery

2026-11-23, user-reported screenshots: `/anatomy/4d-lab` runtime error `The string did not match the expected pattern`, volume stuck `Memuat volume...`; `/anatomy/viewer` fails mandatory skeletal/visceral GLB. These errors occurred after rights-containment 404 rules in the effective VPS Caddy config.

## Root cause vs uncertainty

- Demonstrated: Caddy denies `/anatomy/viewer/models/{skeletal,visceral}.glb` and `/anatomy/4d-lab/data/atlas/*` (independently verified 9/9 HEAD/GET/Range 404). Existing Atlas frontend requires skeletal by default; 4D Lab attempts Atlas-derived CT by default.
- Therefore the post-containment browser bootstraps are incompatible with the effective asset quarantine. This is a definite outage pathway.
- The exact Safari string-pattern error has not been reproduced with a browser trace; do not attribute it exclusively to the blocked CT. The new fatal fallback is testable, but Safari/WebGL/Worker behavior still needs real-device verification.
- Existing owner-local TotalSegmentator review under `local-data` is a separate offline real CT/MPR workflow, not the older public 4D Lab synthetic CT.

## Scoped recovery patch

1. 4D Lab: On Atlas dataset load rejection, attempt only the already-bundled independent *procedural phantom* in `/data/phantom/`; no reuse or republishing of the blocked Atlas-derived CT/GLB and no patient data. Show explicit operational downgrade and preserve `?dataset=phantom` deep link. If both fail, surface both errors.
2. Atlas Viewer: In the actual public medcoel.com host only, start in an *available muscular-only* view with skeletal/visceral OFF. Ignore old bookmarks/presets that would request withheld sources; show unavailable groups and search scope warnings. This uses already-served public muscular.glb, with no new asset/exposure grant. It is not a replacement skeleton or visceral atlas.
3. Existing Caddy 404 policy is unchanged. No rights database, source quarantine, legal approval, or release gate is changed.

## Release verification (must complete before a production code deploy)

- All PR CI checks and base-vs-integration 4D UX comparisons; `npm run test:4d-lab`, `npm run test:anatomy`, build both artifacts, licensing/distribution checks.
- Inspect actual VPS available build and conduct an authorized staged release with backup, atomic switch and rollback plan. Never assume git merge changed the served Vite assets.
- `curl -sSI https://medcoel.com/anatomy/4d-lab/data/phantom/ct.nrrd` should return 200 with actual NRRD bytes, not SPA HTML. Check `registration.json`, `labels.nrrd`, `skin.glb`, `organs.glb` likewise.
- After deployment: visit 4D Lab in Safari with no query and `?dataset=phantom`. Verify render, probe, tri-planar, sliders, worker, and the warning; check browser console and Safari WebGL. The public default should recover to phantom if Atlas stays 404.
- Visit Atlas 3D in Safari with old saved bookmark and fresh session. Verify at least muscular scene, search, camera, and limited-mode notice; ensure it never requests the withheld skeletal/visceral GLBs.
- Re-run `npm run audit:live-rights-strict`, verify `strictExposureCheckPassed:true` and releaseCleared:false; also exercise HEAD/GET/Range 404 on the three quarantined paths.
- If phantom raw bytes or other assets are missing: fail closed, do not lift the Atlas 404; recover the approved original phantom distribution under deployment controls or keep a clear maintenance notice.

## Non-claims

No proof that public muscle geometry has final commercial approval. The incident change does not approve it or any other resource. A limited viewer is not the full Atlas and has no diagnostic use. Public CT/Atlas-derived assets remain withheld until exact-file rights and clinical/privacy approvals are recorded.
