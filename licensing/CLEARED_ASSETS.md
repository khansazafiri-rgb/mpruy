# Candidate assets with commercially usable source licences (subject to release review)

The sources identified here have licences that permit commercial use, or are described as MEDCOEL's own
work. **This is not approval for a public release.** Individual provenance remains partly inferred
(`PROVENANCE_REPORT.md` §5), and the Atlas application code is described as CC BY-NC-SA 4.0.
The release gate in `commercial-release.json` therefore blocks both products pending documented rights review.
Attribution is required wherever these are shown: `apps/anatomy/NOTICE` and
`apps/4d-lab/public/data/atlas/NOTICE.txt`.

| Asset | Licence | Attribution / notice |
|---|---|---|
| `apps/anatomy/public/models/muscular.glb`, `joints.glb`, `cardiovascular.glb`, `lymphatic.glb` (unchanged) | CC BY-SA 4.0 | BodyParts3D (DBCLS) + Z-Anatomy |
| `apps/anatomy/public/models/skeletal.glb` (271 structures) and `visceral.glb` (114 structures): MEDCOEL lossless adaptations | CC BY-SA 4.0 | As above, plus the modification notice embedded in `asset.extras` and written in NOTICE §2 |
| 2,237 structure previews, 5 system previews, 8 region previews and the hero image in `apps/anatomy/public/thumbnails/` | CC BY-SA 4.0 (renders) | As above |
| `apps/anatomy/public/data/*` (catalogue, systems, lexicon, translations, synonyms, annotations, library reference, quarantine list) | Facts / BY-SA / MEDCOEL | — |
| `apps/anatomy/public/data/definitions.json` | CC BY-SA 3.0 + GFDL | Wikipedia contributors |
| `apps/anatomy/public/draco/` | Apache-2.0 | Google Draco / three.js |
| `apps/4d-lab/public/data/atlas/*` (rebuilt 2026-11-09) | CC BY-SA 4.0 | `NOTICE.txt` next to the files |
| `apps/4d-lab/public/data/phantom/*`, `apps/4d-lab/legacy/v0.9/assets/*` | MEDCOEL original (synthetic) | — |
| `apps/4d-lab/evidence/atlas-*.jpg` (regenerated), phantom evidence | BY-SA (atlas content) / MEDCOEL | — |
| MEDCOEL application code (`apps/web`, `apps/4d-lab`, `apps/pocketbase`, `apps/hermes-agent`, scripts) | MEDCOEL | Third-party npm packages under their own licences |
| MEDCOEL educational content, exam questions, mascot artwork, promotional media, ElevenLabs narration | Owner-authorised (owner confirmation 2026-11-09) | — |
