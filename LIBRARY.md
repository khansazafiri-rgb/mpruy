# MEDCOEL Anatomy Library v1 — viewer companion

Spatial baseline: a874a3dcb111d5b4de543c5be6253f5013416f4d.
Built on the locally reviewed Annotator v1 source, without changing its landmarks,
annotation JSON, tools or protocol. All seven GLBs remain byte-identical.

The main MEDCOEL frontend generates its registry by joining existing systems.json,
atlas-catalog.json, lexicon.json and definitions.json. It also loads synonyms.it.json
and library-reference.json, which the prebuild script exports deterministically
from existing atlas REGIONS and ALIASES. No manual structure pages, extra anatomy
coordinates or manual annotation are required.

## Version 1 library bridge

`src/library/protocol.js` is mirrored byte-for-byte in the main frontend's
libraryProtocol.mjs. Commands require version 1, exact parent source and origin,
a bounded request ID, a bounded mesh ID, and an allowlisted mode.

Parent -> viewer: medcoel:anatomy-library-select
- requestId, structureId, mode: explore | identify | find | system | region.

Viewer -> parent:
- medcoel:anatomy-library-result (same requestId, ok + ID, or bounded error).
- medcoel:anatomy-library-pick (same requestId, selected mesh ID, find mode only).

Commands are serialized. Metadata must contain an own entry for the mesh ID;
unknown IDs are rejected before scene mutation. Explore/identify/system/region
reuse reveal(), isolateSelected() and the existing camera framing. Find reuses
viewGroup() + chooseRegion(), with a whole-body fallback if axial clipping would
cut off the target. It does not reveal or isolate the answer before the learner
chooses. Picks come from the existing selection registry/subscriber.

`study.css` hides label-bearing atlas panels/callouts only in study mode. The
existing camera controls remain usable. The parent masks the iframe while a
question is being prepared. Study changes do not overwrite normal atlas session
storage. Find feedback can reveal the correct isolated structure after an answer.

Library commands are ignored in the annotator iframe (`?annotator=1`). Existing
ready/error messages and hosted share URLs are unchanged. `/anatomy#atlas=...`
still opens the existing viewer through the main frontend compatibility entry.

## Build and tests

Node >=22.12. npm ci; npm run lint; npm test;
ANATOMY_BASE=/anatomy/viewer/ npm run build.
Prebuild regenerates library-reference.json from existing metadata constants.
Serve this complete dist under the main origin's /anatomy/viewer/ prefix.

No production configuration, service, GLB or annotation mapping is modified here.
Main frontend routes, local progress architecture and final test/preview evidence
are documented in the delivered LIBRARY-REVIEW.md.
