# MEDCOEL Anatomy Library v1

This feature builds on the local Annotator v1 checkpoint. The existing admin
editor remains under RequireAuth admin at /admin/anatomy; its code and annotation
files are not changed. No PocketBase/question-bank/service changes are involved.

Routes (all retain the main app's existing RequireAuth guard):
- /anatomy — product overview, search, region/system indexes, library and study.
- /anatomy/library — searchable, filtered, paginated registry.
- /anatomy/structure/:id — one component for every existing mesh ID.
- /anatomy/region/:regionId — automatic system groups for the selected region.
- /anatomy/system/:systemId — seven actual source systems.
- /anatomy/study — identify, find in 3D, guess system and guess region.
- /anatomy/explore — the original 3D atlas.
- /anatomy/explore?structure=... — registry-validated 3D contextual selection/highlight/focus (isolation is optional).
- /anatomy#atlas=... and the earlier landmarks query retain compatibility.

## Registry / nomenclature

LibraryData fetches the static data from /anatomy/viewer/data/ on the same origin.
registry.mjs joins mesh IDs in systems.json to the existing atlas catalog, lexicon,
definitions and synonyms. Latin and descriptions are shown only when present.
Source URLs are HTTP(S) validated and descriptions render as plain text.

All 2827 IDs remain addressable; all have matching catalog entries. Three names
in the source are placeholders (?x.l, ?x.r, ????????). They are labelled Unlabelled
structure, remain available in 3D, sort after named structures and never become
quiz targets/distractors. No names are invented and the source files are untouched.

The region catalog is the existing curated study-region metadata, not a newly
asserted anatomical ontology. Related structures share the source system/region;
contralateral equivalents and actual atlas bounding-box proximity rank first.
No direct anatomical relationship is fabricated from alphabetical similarity.

Indonesian and future language aliases are isolated as locale dictionaries in
library-reference.json. That reference file is generated from the existing atlas
aliases; the registry already accepts additional locale dictionaries. Existing
Italian synonyms are also used. No full Indonesian translation is claimed.

## 3D / study

LibraryViewer owns the iframe lifecycle and exact source/origin/version/request
validation. The viewer bridge reuses its existing mesh registry and selection,
visibility, system/region and camera code. The old lifecycle and Annotator protocols
are independent and preserved. No screen-space annotations or GLB edits are used.

Identify distractors prefer the same system + region, then source system, then
region. Opposite-side equivalents are excluded to avoid visually ambiguous answer
pairs. Region questions exclude every other valid region of multi-region targets
from distractors. Whole body is a browsing scope, not a false region distractor.
Find uses actual same-group structures as the visual answer context and returns
picks from the existing selection subscriber. Feedback reveals the correct target.
During quiz setup, the iframe is masked and label-bearing viewer elements are
hidden; only the camera controls and structures remain. It is a learning tool,
not a secure/proctored examination system.

## Local progress boundary

libraryProgress.mjs contains pure progress reducers/validation and a separate
createLocalProgressRepository(storage,userId) adapter. The key includes account,
schema and spatial-source commit. States: NOT_STUDIED, LEARNING, MASTERED.
Answers update counters; three consecutive correct answers on a structure mark
it Mastered, a miss returns it to Learning. A learner may set status on the detail
page. Quiz session score resets on reload; structure progress persists locally.

This data is unrelated to Annotator REVIEWED/VERIFIED. It is not written to
PocketBase. Storage errors are surfaced and the session can continue in memory.
A future server repository should reuse the progress schema/reducers and adapt
hook loading/saving to asynchronous account-scoped persistence. No backend endpoint,
migration, token forwarding or automatic cloud sync is introduced in v1.

## Local preview

Build the companion Anatomy dist with /anatomy/viewer/ base, then:

npm run build --prefix apps/web -- --config vite.anatomy-preview.config.js
PORT=4188 ANATOMY_DIST=/absolute/path/to/anatomy/dist npm run preview:anatomy

Open http://127.0.0.1:4188/anatomy. To inspect the preserved admin editor, use
/admin/anatomy?admin=1 in this opt-in example-account preview only. The production
build keeps the real AuthContext; the preview account never enters that bundle.

Refresh on .r/.l structure IDs must reach the main SPA. The local preview server
has an explicit Anatomy-page fallback before treating an extension as an asset.
The /anatomy/viewer/ asset handler remains separate; missing assets return 404,
not HTML. Verify this same routing order on staging before any production rollout.
No Caddy or production service was changed for this feature.

Run npm run lint; npm run test --prefix apps/web; npm run build;
npm run test:anatomy-integration. Full backend CI is a separate check in the complete
main repository; this frontend snapshot does not contain the PocketBase runtime.

Do not replace the main repository root with the standalone Anatomy source or
merge PR #84. No push, merge or deployment is authorized by this feature work.
