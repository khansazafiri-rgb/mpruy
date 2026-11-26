# Source and nomenclature review queue

Run `node scripts/build-atlas-review-queue.mjs` to print a reproducible JSON review packet from the current pinned evidence. It contains 239 FMA concepts and their proposed ID/EN/Latin labels, source element identifiers, identity digests and laterality/level/source-qualifier review flags. It also contains 246 BP3D and 9 HRA object-specific rights rows, with raw and derived hashes or source DOI/metadata/crosswalk identifiers.

FIPAT TA2 is a publication under CC BY-ND 4.0; its front matter states that individual terms are public domain. This queue does not redistribute the official terminology publication or assert an official match. Use TA2/TNA to review each qualified candidate. Verify all synonyms separately if intended for release. Only an appropriately qualified reviewer can supply the official term identifier and clinical review decision. The script never creates an approval. The source rights rows are equally unapproved: source family-level eligibility and pinned geometry are insufficient to approve a release. No clinical review, registration or commercial release was performed.

Sources: https://ifaa.net/committees/anatomical-terminology-fipat/fipat-ifaa-terminologies/ ; https://cdn.dal.ca/content/dam/dalhousie/pdf/library/FIPAT/TA2/FIPAT-TA2-Front-Matter.pdf ; https://ta2viewer.openanatomy.org/ .
