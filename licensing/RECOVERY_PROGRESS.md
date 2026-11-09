# MEDCOEL anatomy recovery — implementation and release status

Date: 9 November 2026. This is an engineering record, **not a licence grant or legal opinion**.
The integration base includes merged PRs #156–#160. This branch advances the opt-in independent
viewer candidate while leaving both public staging products blocked.

## Implemented in this branch

- Independent viewer pilot: multi-system rendering, on-demand GLB loading and GPU disposal,
  per-structure hide/isolate/undo, opacity and fade, regional filtering, four camera presets,
  validated share links, keyboard zoom/undo and model retry.
- Renderer-independent state tests and expanded Playwright interaction assertions.
- Machine-readable [`atlas-feature-parity.json`](atlas-feature-parity.json) with explicit gaps.
- Exact-byte [`4d-lab-pilot-local-inventory.json`](4d-lab-pilot-local-inventory.json): 34 files,
  47 version-pinned npm packages and rights-evidence record pointers. Produced by
  `npm run inventory:release -- 4d-lab apps/4d-lab/dist <output.json>`.

## Commercial evidence and blockers

- The third-party `nqwrc/3d-anatomy` application code has an NC-SA licence. The independent
  candidate is a local engineering experiment; the token-overlap screen does not prove legal
  independence. No written commercial grant is available in the repo.
- The official BodyParts3D licence page states CC BY 4.0 for its current database; that does
  not identify which old mesh versions were adapted into the mixed Z-Anatomy GLBs. The six
  retained bundles and all derivatives still need per-source review.
- The exact local candidate inventory marks rights unresolved. The commercial release manifest
  remains `blocked` for Anatomy Viewer and 4D Lab. No pilot route is added to a normal build.
- MEDCOEL host marketing media/voices and external URLs need their own inventory. This branch
  does not certify the rest of the website.

## QA and deployment

- Unit/integration/licensing suites and both 4D Lab build variants were executed. The ordinary
  build excludes `atlas-preview/index.html`; opt-in local build includes it.
- The Playwright Chromium test was attempted but Chromium aborted before opening a page:
  `process_singleton_posix.cc: socket() failed: Operation not permitted` in this container.
  The separate desktop browser could not connect to the container's loopback server.
  **Visual/interaction QA is unrun**, including actual Safari on Apple Silicon and 8 GB memory.
- The live `https://medcoel.com/anatomy/viewer/` route returned the mature viewer UI
  in a cloud browser. That browser reported `THREE.WebGLRenderer: Error creating WebGL context`,
  so the 3D scene could not be visually checked there. The accessible page does not establish
  which release symlink, model files, stale assets or rollback targets are active; those remain
  **unverified**. Other public URLs could not be inspected through the web retrieval tool.
  No Caddy, PocketBase, production file or public route was changed.

## Independent readiness assessment

| Product | Status | Reason |
| --- | --- | --- |
| Mature Anatomy Viewer | **RED — blocked for new commercial distribution** | Imported NC application code; model provenance unresolved. |
| Independent viewer pilot | **YELLOW — local review only** | Feature parity, model rights and Safari QA incomplete; opt-in build only. |
| Anatomy Live 4D Lab | **RED — public staging blocked** | Atlas-derived model/CT source rights and code ownership review incomplete. |
| MEDCOEL host website | **Unassessed** | Media and existing production exposure were not fully inventoried. |

Do not swap `/anatomy/viewer/` to the pilot or promote a Lab build until critical parity,
rights evidence and device QA are complete. Production activation requires a separate exact
candidate and owner approval. Current production state must be checked before planning rollback.
