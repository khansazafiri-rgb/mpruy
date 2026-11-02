# MEDCOEL Human Anatomy Annotator v1

Pilot: Z-Anatomy `skeletal / Humerus.r`, six unmapped landmarks.
Spatial baseline: `a874a3dcb111d5b4de543c5be6253f5013416f4d`.
GLB files are unchanged. External terminology never supplies coordinates.

## Main frontend integration

The companion MEDCOEL main frontend adds `/admin/anatomy` beneath the existing
`RequireAuth admin` route and a Human Anatomy entry under Konten belajar.
It embeds this atlas at `/anatomy/viewer/?annotator=1` on the same origin.
The ordinary `/anatomy` viewer keeps its existing interface and behavior.
Optional read-only published study mode: `/anatomy?landmarks=Humerus.r`.

Anatomy bootstrap only dynamically imports `src/annotations/annotator.js` when
embedded with `annotator=1`. The scene, renderer, GLB loader and controls are
reused. Small guards prevent normal picking and atlas-session persistence in
annotator mode. Reset reframes the pilot without restoring unrelated anatomy.

## Geometry and spatial integrity

`surfaceAnchor.js` computes triangle barycentric weights from the raycast hit in
mesh-local space. Every anchor stores part ID, primitive identity, deterministic
SHA-256 of decoded positions and post-BVH indices, triangle count, face index,
barycentric weights, local point, captured world point and local surface normal.
UUIDs and screen coordinates are not persisted identities. Local/world points
are audit snapshots; reconstruction uses face + barycentric + current matrixWorld.

The model SHA-256 is checked against the fetched skeletal GLB on entry. Imported
anchors must pass both schema and actual mesh validation. A changed topology or
source is rejected rather than silently relabelled. The decoded index identity
is tied to the committed npm lockfile (Three 0.185.1 / mesh-bvh 0.9.13).

POINT saves one surface anchor. SURFACE_REGION stores sorted facet IDs, with a
connected, similarly facing world-space brush (radius in mm) and a leader anchor
that remains on a selected face after erasing. SURFACE_LINE stores individual
anchors; preview joins them using a shortest path along mesh edges, including
segments within the endpoint triangles. It is surface-constrained, not a smooth
clinical centreline or a straight chord through the bone. This pilot supports
one primitive per region/line; do not scale to multi-part annotations yet.

The overlay is parented to the original mesh. Point/region/line geometry follows
its transforms; a render-loop callback projects a reconstructed surface anchor
for the screen label and SVG leader. Resize, orbit, zoom, pan and isolation use
that same anchor. Overlay geometries/materials are disposed on replacement.

## Persistence and review

`public/data/annotations/registry.json` indexes the pilot JSON at
`skeletal/humerus.r.json`. All six shipped landmarks are NOT_MAPPED with null
geometry. There are no fabricated landmarks or automatically verified entries.
English/Latin names are supplied; external terminology IDs are left empty until
confirmed from an authoritative registry.

The admin host stores JSON drafts locally, scoped to account ID and source commit.
Save JSON downloads a schema-versioned, revision-named JSON file. Reload restores
the local draft; Import JSON validates in the viewer before persistence. Imports
advance the local revision so an older file does not reuse an earlier revision.
A blocked/quota-limited browser storage displays an error; export remains usable.
Local drafts are not shared between computers and are not PocketBase records.

Review workflow is ordered: NOT_MAPPED -> DRAFT -> ANNOTATED -> REVIEWED -> VERIFIED.
Complete geometry is required from ANNOTATED onwards. REVIEWED records a named
reviewer and timestamp. VERIFIED requires a reviewer, explicit checkbox action,
and manual decision metadata. Geometry/representation changes clear review metadata
and return to DRAFT (or NOT_MAPPED when cleared). Undo is per active viewer session;
reloading keeps the current JSON but starts a fresh undo history.

To publish an approved annotation later, an admin must export JSON, manually
review it and commit it to the matching `public/data/annotations/skeletal/` file.
The student study view reads published JSON only, never admin browser drafts.
Draft status remains visible in student preview; no production publication is
performed by the editor. The bundled JSON stays empty until real manual mapping.

## Protocol

Version 1 messages require exact same origin and `event.source` (parent in the
viewer, iframe contentWindow in the host). A per-iframe session rejects stale
responses. Known message names and payloads are allowlisted and validated.
Viewer commands are serialized, including asynchronous loading and camera focus.
The viewer does not treat a message as authentication: access is controlled by
the main app's existing admin guard, and the bridge has no server-write capability.
Existing `medcoel:anatomy-ready` / `medcoel:anatomy-error` remain unchanged.

The schema/protocol pure modules are mirrored in the two independently built
frontends. Keep these copies byte-identical except the schema import path;
publication checks verify equality. A shared package can replace this after the
pilot without coupling the two Three.js versions now.

## Validation and preview

Node >=22.12.0. Run npm ci, npm run lint, npm test, then:

```sh
ANATOMY_BASE=/anatomy/viewer/ npm run build
```

The main companion preview composes this dist with MEDCOEL, without backend writes.
No service, Caddy config, production branch or GLB is changed by the annotator work.
See the delivered ANNOTATOR-REVIEW.md for exact commits, test results, local preview
URL and QA evidence. Screenshots with colored regions are disposable QA drafts,
not reviewed anatomical mappings.
