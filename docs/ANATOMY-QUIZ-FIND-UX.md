# Anatomy Quiz v1: two modes and explicit answers

Branch: `fix/anatomy-quiz-find-ux` (from `fix/hermes-anatomy-reliability-latest`,
`2d9f2ee4633ab001d171ac228c0fb5b8393ca034`). No production deployment or merge.

## UI and scoring

Only **Kenali Struktur** (`identify`) and **Temukan di 3D** (`find`) are public.
Landing copy and mode counts use these two modes. Old `system`/`region` query
parameters fall back to identify; generation, scope validation and iframe commands
reject these modes. Region/system selectors remain learning-scope filters.

Identify retains four unique, similarly ranked structure-name options, one attempt
and existing progress scoring. The target is highlighted with faded contextual
anatomy, never automatically isolated. Names, structure panels and callouts inside
the quiz iframe remain hidden. Rotate, zoom and pan work; selecting the canvas or
hovering cannot move the question highlight to another structure.

Find prepares the **participant's chosen region/system**, not the target's group,
bounds or inferred region. All layers of that scope are restored, plus skeletal
context. There is no automatic selection, highlight, ghosting, focus or isolation.
Axial clipping is disabled in find, preserving complete structures that cross a
regional boundary. Region membership still controls which structures are shown.
A scope change frames the scope, never the answer; subsequent questions retain the
participant's camera position and orientation. Prior saved atlas selections are
ignored at study startup.

Tap/click selects a structure and opens contextual controls. This selection is for
exploration. Only **Pilih sebagai jawaban** submits an answer. A manually selected
mesh has the existing selection glow; it is independent of the hidden answer.
Hide, unhide, show all, camera operations and focus on a participant-selected mesh
never submit. Multiple structures may be hidden sequentially. Find does not ghost
all other structures on selection.

A wrong explicit find attempt gives short feedback and permits retry without
revealing, framing or isolating the answer, or offering a revealing structure link.
Each explicit attempt counts in the displayed **percobaan** score and existing
local-first progress. Correct attempts lock scoring for that question and offer
Next. The manually selected correct structure already has a selection glow; the
camera and visibility are not changed after success. Question numbers use the
round serial, not the attempt count. Identify retains its existing one-attempt rule.

Next restores all hidden/faded parts for the selected scope. Restart, mode, system
and region changes unmount the study frame, so the next session gets fresh study
visibility. Restart also clears session score and round numbering. The ordinary
atlas's saved scene is not overwritten by study changes. Normal Library explore
links keep the existing reveal behavior and do not reset visibility unnecessarily.

## Protocol and visibility reuse

`libraryProtocol.mjs` and viewer `library/protocol.js` are identical. Find commands
require a valid `region` and `system` supplied by the host. Version stays 1;
origin, iframe source, request ID, mode and structure ID validation remain intact.
Answer events use `medcoel:anatomy-library-pick` plus `intent: 'answer'`. Events
without that explicit intent, with visibility intents or from stale/foreign frames
are rejected. Lifecycle ready/error/interactive and Annotator channels are unchanged.
Deploy web and viewer together; a host updated without its viewer will safely reject
legacy automatic pick events, so the old viewer cannot grade visibility actions.

The study controller keeps only selected/context-menu IDs and a list of explicit
hide actions for the unhide picker. Mesh visibility is always changed through the
existing atlas/visibility functions (`hideSelected`, `showPart`, `restoreScene` and
`prepareStudy` using `commit`/`restoreAllParts`). There is no second visibility
engine. Focus acts on the mesh chosen by the participant, never the quiz target.

## Desktop, tablet, phone

Desktop and landscape tablet retain the current side-by-side layout. Portrait
tablets up to 1000px use a single large model column. Phones show the question
above a 70dvh model and place the question/feedback card below it, never over it.
The iframe's context sheet appears on tap, with 44px-or-larger action areas and a
clear Tampilkan semua button. After hide, selection controls collapse and the
unhide picker becomes available. The sheet's measured height is reserved outside
the actual canvas; it cannot cover meshes. Narrow viewports use horizontal camera
controls at the top and view presets at the lower edge of the canvas. Nothing
requires hover or a long press. The single-finger tap classifier rejects drags,
pinches, canceled gestures and long presses; OrbitControls retains those gestures.

Verified locally with WebKit at desktop 1280x720, tablet landscape 1180x820,
tablet portrait 820x1180 and phone 390x844. Actual iPad hardware, physical multi-touch
and production-network performance require acceptance after review; viewport
checks are not a claim of hardware certification.

## Validation and files

- Web suite: 138 tests, including registry, search, filters, routing, both public
  modes, four identify choices, no duplicate distractors, find answer identity,
  hidden-mode rejection, explicit intent and find retry/lock semantics.
- Viewer suite: 77 tests, including actual Three.js visibility, reset across
  questions, camera retention, selection versus answer, multiple hides, unhide,
  show all, invalid structures, study scope, touch gesture classification, ordinary
  atlas, GLB/thumbnail provenance, host and Annotator regressions.
- Persistent release/routing suite: 7 tests; run from the repository root.
- Hermes suite: 52 tests; PocketBase unit suite: 58 tests. Neither backend changed.
- Lint web: clean. Viewer lint: zero errors, 11 existing console warnings.
- Production web build, fixture preview build, viewer base `/anatomy/viewer/` build.
- Local persistent installer promotion and idempotent repeat; HTTP asset smoke.

Runtime files: `apps/web/src/features/anatomy/{study.mjs,LibraryViewer.jsx,
libraryProtocol.mjs}`, `apps/web/src/pages/AnatomyLibrary.{jsx,css}`;
`apps/anatomy/src/atlas/engine.js`, `apps/anatomy/src/library/{bridge.js,protocol.js,
selection.js,session.js,study.css}`, `apps/anatomy/src/viewer/{selection.js,tap.js}`.
Tests are adjacent web library tests and viewer `atlas-engine`, `library`,
`study-session`, `tap` tests. `SOURCE-MANIFEST.json` records the full updated viewer.

No GLB, atlas metadata, thumbnail, Hermes, PocketBase, Caddy or installer changes.
Existing persistent path remains `/var/lib/medcoel/anatomy-viewer`.

Deployment and rollback commands: [ANATOMY-QUIZ-DEPLOYMENT.md](ANATOMY-QUIZ-DEPLOYMENT.md).
