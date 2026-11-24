# MEDCOEL Full Atlas — six-agent execution contract

## Objective and frozen baseline
Expand the ORIGINAL Human Anatomy/Atlas using all eligible real source geometry, not another demo and not 5–10 names per run. Preserve the 4D Lab and every existing interaction, layout, camera, selection, layers, undo and search. Recompute the real baseline from local coverage-report.json. Last observed: 762 private candidate models, 718/2237 legacy labels, 44 additional source labels, 80 HRA GLBs staged but zero mounted. All counts are candidates, not clinical validation. Public release NO_GO.

## Shared source and safety contract
Use native publisher identity (FMA/BP/FJ or equivalent stable source IDs). Import all demonstrably available source-native structures in bulk rather than requiring every candidate to match an old catalogue label. Use explicit exact synonyms, laterality, organ region, part/whole and source hierarchy; no fuzzy promotion. Distinguish geometry, mesh, concept, compound, alias and catalogue row; avoid duplicate surfaces. Never manufacture missing anatomy or infer a source identity from shape alone.

Preserve source file and archive checksums, publisher URL and version, original exact license notice, source/derived hash, geometry bounds and triangle count, source coordinate frame, transform evidence, anatomical/clinical validation status and approvedForDistribution:false. Unknown is null or BLOCKED. Do not weaken release or quarantine gates, copy candidate GLBs into public/dist, restore withheld legacy assets, set approval flags true, or bypass source/code rights review. Maintain per-asset commercial rights evidence. Never process patient identifiers or credentials.

BodyParts3D IS-A and PART-OF: preserve actual source FJ and native-coordinate geometry, identify unused source-native concepts rather than retrying the same legacy-name matching. The two source trees have three shared matching coordinate anchors in the last local run; do not extrapolate this to clinical registration. HRA: 80 GLBs are staged; independently inspect exact organ/substructure IDs, subject/sex, units and coordinates. Keep as isolated reference-organ reviews until a tested registration is supported by independent anatomical landmarks. Never overlay by guessing scale and position. Z-Anatomy: inspect exact publisher version and component rights before use; NC/mixed/unknown stays blocked. No generated meshes.

No remote push, merge into active branch, deployment, secrets, elevated permissions or public distribution. Do not write local source data. All roles share the original GitHub base but own disjoint adapter paths. Controller checkpoints candidate code only. In this local CLI mode network is disabled; source acquisition that needs network must be reported as BLOCKED and proposed for owner-reviewed download. Work mode may perform supported public research without assuming it can access the Mac's archives. No new code is executed in production.

## Role 1 — skeletal-joints
Cover all 109 remaining skeletal and 337 remaining joints catalogue entries from last report, plus source-native labels outside it. Audit spine, ribs, sternum, nasal bones, hand/foot, cartilage, ligaments, capsules and menisci. Distinguish a joint and its constituent tissues. Establish actual source availability, import candidates from available local assets, unit tests and mapping/lineage evidence.

## Role 2 — muscular
Cover 469 remaining muscular catalogue entries, plus source-native anatomy. Separate tendon, fascia, aponeurosis, muscle and head or subdivision; verify left/right and region. Prefer bulk conversion over manual names. Implement reusable adapter and tests.

## Role 3 — nervous
Preserve 42 candidate neural models. Extend CNS, cranial and peripheral nerves, plexus and spinal cord. Do not equate central canal with spinal cord. Parent labels must not duplicate their constituent surfaces. Enumerate source-specific missing neuroanatomy separately.

## Role 4 — visceral-hra
Cover 77 missing original visceral labels and source-native organ structures. Preserve newly staged kidneys, bronchus, oesophagus, bowel and cardiac candidates; do not mix source subjects. Inspect cached HRA manifest and all 80 files if accessible. Implement isolated organ viewing/registration evidence pipeline and test it; do not claim frame alignment from header data.

## Role 5 — cardiovascular-lymphatic
Cover 372 cardiovascular and 155 lymphatic missing labels, plus source-native anatomy. Preserve cardiac additions. Distinguish arteries/veins, laterality, chambers, valves, branch types, nodes and vessels. Use source evidence rather than approximate matches.

## Role 6 — integration & QC
Review every role patch, manifest, test and blocker independently. Integrate only scope-safe candidates into the existing private launcher. Preserve UI and source pipeline; one catalogue with provenance, not six separate viewers. Test candidate loading, ID uniqueness, shared geometry, selection/search/layers, lazy loading, errors, source frame, geometry checksum, policy, performance and regression. Verify actual results rather than simply accepting worker claims. Run applicable existing tests (test:atlas-onepass, test:anatomy, test:4d-lab, test:licensing) if dependencies are available. Record exact exit statuses and missing tests. Reject or send feedback for unsafe or incomplete work. No approval for distribution.

## Output and cycle
Each role returns structured JSON: status PASS/PARTIAL/BLOCKED/FAIL, summary, evidence paths, actual tests, blockers, next actions. Produce concrete code and tests under owned path, not prose alone. PASS means scoped code work/test completed, not clinical or commercial approval. PARTIAL must have concrete evidence. Report missing prerequisites precisely. Controller performs scope and syntax checks, applies eligible non-conflicting patches to a separate review worktree, asks integrator to test, and retains candidate checkpoint only after integrator PASS/PARTIAL. Retry unresolved roles with previous feedback; stop after two no-progress rounds, max rounds, or all role/integration PASS. Owner must review final candidate diff and independently verify local geometry, runtime, licenses, clinical content and release. No auto-deploy.
