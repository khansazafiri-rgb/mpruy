# MEDCOEL — All Anatomy Systems Exact-Source Private Expansion

## Scope

This follows verified **626 BodyParts3D GLBs out of 2,237 Atlas catalogue names** on the owner's Mac (screenshot 24 November 2026), including the now-visible spine. This is still a *source-inventory* measurement, not a clinical correctness score or proof of model completeness.

This stage inspects **all 2,237 names across every existing catalogue system**, not only skeletal/visceral and not only 132 highlighted missing targets.

## One command for the full private source attempt

```sh
cd ~/mpruy
git fetch origin
git switch feat/bp3d-all-systems-exact-source-private-20261124
git pull --ff-only origin feat/bp3d-all-systems-exact-source-private-20261124
npm run qc:bodyparts3d-all-systems:preview
```

The tool verifies the local original official OBJ archive, hashes, and integrity of the **prior 626-model private vertebral batch**, then reconstructs the original 626 source references. It only selects **additional sources** for unmatched catalogue identities if all conditions hold:

- Catalogue and official publisher match by **exact, full tokens** (with publisher/Latin term normalization and punctuation / word order ignored; `of`, `the` do not carry structural identity)
- Source identity has **exactly one** FMA/BP representation and an unchanged, nonempty official FJ element set with every OBJ file present
- No FMA/BP or FJ collision with existing 626 GLBs or another newly proposed model
- Laterality, hand versus foot, tissue type, vertebral level and complete-organ versus subpart distinctions are preserved
- No model is copied from the old Atlas source or fabricated

Any name-only mismatch remains unconverted. These exact matches are **only candidate meshes for private inspection**, not anatomically or clinically validated. The tool does not claim to reach 2,237 converted GLBs; real count is known **only after local Mac conversion + full FMA/BP/FJ audit**.

The same one command runs 4D Lab, Atlas and licensing tests, builds the new GLBs (not the 626 cached models), audits every converted GLB, then writes the independent private inventory and launches the unchanged Atlas UI with **`?models=bp3d`** (every available system, not just skeletal/visceral).

## Where to find the concrete results

- `local-data/licensing-quarantine/bp3d-all-systems-onepass-review/readiness.json` — model totals, number newly added, release gate
- `local-data/licensing-quarantine/bp3d-all-systems/all-systems-source-review.json` — **each new accepted identity** and **every remaining rejected name with reason**, plus counts per system
- `local-data/licensing-quarantine/bp3d-completeness-all-systems/full-audit.json` — FMA/BP/FJ, source integrity, mesh geometry review
- `local-data/licensing-quarantine/bp3d-completeness-all-systems/focus-gaps.md` — current hand/foot digiti minimi, nasal bones, spine, sternum, visceral report

`npm run audit:bodyparts3d-full:all-systems` rechecks the result without rerunning GLB conversion. Nothing is uploaded or deployed to medcoel.com.

## Explicit safe failure

No new safe source matches, mismatched archive, modified cached geometry, missing FJ, clinical source conflict, and any conversion/audit failure must STOP the package's promotion. The 470, 584, 602 and 626 old private packages are preserved. No attempt is made to hide gaps with generic vertebrae, adjacent structures or liver segments in place of a whole organ.

**NO-GO to public deployment** remains mandatory: source archive terms and the existing NC Atlas application code's commercial permission have not been resolved, and anatomical identity has not been clinically verified. CI success cannot override these gates.
