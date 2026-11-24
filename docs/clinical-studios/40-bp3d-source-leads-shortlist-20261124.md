# MEDCOEL BP3D — 18 specific publisher-OBJ source leads (NOT APPROVED)

Source: user-exported private `official-source-leads.csv`, 24 November 2026, 848 rows. This file documents **suggestions**, NOT clinician-approved mappings. Do not use it directly as a reviewed mapping manifest or release authorization.

All 18 rows below have `completeOBJ=TRUE`, blank warning field and unique FMA/BP in the supplied source-leads CSV. The source archive, FJ geometries, body-frame coordinates, finer anatomy (especially *opponens digiti minimi* of foot) and rights still require independent checks.

| Existing Atlas catalogue identity | Publisher name lead | FMA | BP | FJ |
|---|---|---|---|---|
| Abductor digiti minimi of hand.l | abductor digiti minimi of left hand | FMA37397 | BP8737 | FJ1466M |
| Abductor digiti minimi of hand.r | abductor digiti minimi of right hand | FMA37396 | BP7569 | FJ1466 |
| Flexor digiti minimi of hand.l | flexor digiti minimi brevis of left hand | FMA37399 | BP8516 | FJ1470M |
| Flexor digiti minimi of hand.r | flexor digiti minimi brevis of right hand | FMA37398 | BP4858 | FJ1470 |
| Opponens digiti minimi muscle of hand.l | opponens digiti minimi of left hand | FMA37401 | BP8204 | FJ1482M |
| Opponens digiti minimi muscle of hand.r | opponens digiti minimi of right hand | FMA37400 | BP4860 | FJ1482 |
| (Opponens digiti minimi muscle of foot).l | opponens digiti minimi of left foot | FMA86035 | BP9018 | FJ1399M |
| (Opponens digiti minimi muscle of foot).r | opponens digiti minimi of right foot | FMA86034 | BP5046 | FJ1399 |
| Abductor digiti minimi of foot.l | abductor digiti minimi of left foot | FMA37464 | BP9182 | FJ1390M |
| Abductor digiti minimi of foot.r | abductor digiti minimi of right foot | FMA37463 | BP5056 | FJ1390 |
| Flexor digiti minimi of foot.l | flexor digiti minimi brevis of left foot | FMA37472 | BP8065 | FJ1391M |
| Flexor digiti minimi of foot.r | flexor digiti minimi brevis of right foot | FMA37471 | BP5050 | FJ1391 |
| Manubrium of sternum | manubrium | FMA7486 | BP8562 | FJ3290 |
| Ethmoid bone | ethmoid | FMA52740 | BP8991 | FJ3199 |
| Nasal septal cartilage | septal nasal cartilage | FMA59503 | BP8657 | FJ2557 |
| Pineal gland | pineal body | FMA62033 | BP5525 | FJ1795 |
| Seminal gland.l | left seminal vesicle | FMA19388 | BP9064 | FJ3137 |
| Seminal gland.r | right seminal vesicle | FMA19387 | BP8530 | FJ3143 |

## Known dangerous false positives in the same CSV

- `Liver` → `segment of liver`: organ ≠ segment, despite tokenScore 1.
- `Meso-appendix` → `appendix`: appendicular mesentery ≠ appendix.
- `Free taenia` → `muscle of free lower limb`: a coincidental use of “free”, not a digestive taenia.
- `Vertebra C3` → `vertebra` or `cervical vertebra`: generic aggregate FJ lists must not substitute for a single level; look for exact ordinal `third cervical vertebra` in official tables, requiring verification.
- `Anterior cells of ethmoid bone.l/.r` → whole `ethmoid`: no left/right cell division substantiated.
- `Lateral process of nasal septal cartilage.l/.r` → `left/right lateral nasal cartilage`: related terminology but part identity still needs manual review.

## Review gates

1. Verify the source package checksum, official FMA/BP name and **complete FJ identity** for each candidate in the Mac's original archive, then inspect the actual mesh and body orientation. No model identity is approved by text matching alone.
2. Anatomist verifies hand-versus-foot, left-versus-right, muscle function and attachments; reviews foot opponens separately as a potentially variable muscle.
3. Convert only into a **private**, individually labeled provisional GLB set after the source identity review. Keep 584 existing GLBs unchanged and inspect structure selection/isolation in MEDCOEL's original Atlas UI.
4. Do not release new or existing BP3D geometry publicly until rights for exact archive and Atlas application code and clinical suitability are resolved. No production deploy.

The score field `375` in six user CSV bronchial-tree rows is not a valid 0–1 similarity score; the local source discovery script must recompute ranking from publisher tables rather than trusting these exported values.
