# MEDCOEL 4D Lab — independence from the third-party NC Atlas Viewer

Date: 2026-11-09 · **Local development only; no commercial clearance granted.**

## Confirmed rights problem

The owner has confirmed that `nqwrc/3d-anatomy` is **not their repository**. Its upstream `LICENSE` explicitly applies **CC BY-NC-SA 4.0 to the application code**, independently of the anatomical GLBs. Merely editing `apps/anatomy/LICENSE`, removing noncommercial models, changing an import URL, or building a separate frontend cannot grant commercial rights to that code.

In MEDCOEL, `apps/anatomy/src/**`, portions of the atlas infrastructure, and contributions adapted from the upstream may require a written permission grant or genuine independent replacement. The exact boundary still needs source-code similarity and contribution review; no assertion of clean-room authorship is made by this PR.

## Concrete engineering isolation in this PR

Before: `apps/4d-lab/src/app/main.js` fetched GLBs/catalog/Draco from `/anatomy/viewer/`, which required a separately hosted application bundle with unresolved NC code rights.

Now:
- Vite builds a **model/data-only package** under `apps/4d-lab/dist/atlas-assets/` with six allowlisted GLBs, catalog, three Draco files, original model licence notice and the 4D Lab atlas adaptation notice.
- The package builder checks **every GLB hash** against `apps/4d-lab/public/data/atlas/anatomy.json → build.sourceModels`. Source model mismatches stop the build.
- A manifest of the package checks **exactly 12 assets**, SHA-256 identities, and denies unlisted files, symlinks and stale/modified bytes.
- The 4D Lab fetches `/anatomy/4d-lab/atlas-assets/**`, not the Atlas Viewer application route. Its independent CT and 3D patient mesh retain their LPS registration.
- The public staging check verifies the entire package and the final exact release digest; rollback still requires commercial approval.
- The local integrated preview can build 4D Lab and MEDCOEL host UI without compiling `apps/anatomy`. If an Atlas Viewer local build already exists it may be browsed separately, but the Lab no longer depends on it.
- Quarantined nervous GLBs and obsolete Atlas Viewer JS/HTML are **not bundled**. Existing quarantine tests and release gate remain in place.

The original Anatomy Viewer is **not altered or relicensed**. Models continue to be sourced from `apps/anatomy/public` in the repository at build time; this does **not** make their provenance or licences more reliable.

## Work that remains before commercial use

1. **Code origin and authorship:** audit `apps/4d-lab/src/app/atlasLayer.js` and related application components against `nqwrc/3d-anatomy`, as well as the entire `apps/anatomy` frontend. Determine which functions, layouts and other expressive elements are adapted. Either obtain written permission from the actual copyright holders or replace independently with evidence of origin. A URL change is not a licence.
2. **Independent models:** validate each retained mesh against an official commercially distributable original, with source version/hashes and individual attribution. Shared Z-Anatomy CC BY-SA notices alone do not prove the entire mixed bundle's provenance. Rebuild derived CT, previews and skin from approved inputs if source assets change.
3. **Software and content audit:** version-specific npm/Draco rights, Wikipedia-derived definitions, other UI imagery and narration, and external runtime assets all require review.
4. **Remediation and QA:** check live old exposure, perform Safari visual testing, full package integrity, first-run tutorial and production deployment procedures. Do not release merely because CI passes.
5. **Rights-holder outreach:** obtain permission for the original NC application code from the upstream copyright holders if continuing to publish Anatomy Viewer. No request is sent by this PR; the suggested request is in `COMMERCIAL_SOURCE_CLEARANCE_PLAN.md`.

## Commands

- `npm run build:4d-lab` — creates the Lab asset pack
- `npm run test:4d-lab` — checks package integrity, quarantine, and stage fixtures
- `npm run test:licensing` — checks commercial gate remains blocked and known quarantined assets stay absent
- `npm run preview:4d-lab` — local preview, not a public release

**Current release state:** `licensing/commercial-release.json` keeps both `atlas-viewer` and `4d-lab` as `blocked`; neither has approved release builds.
