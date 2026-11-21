# BodyParts3D — exact source-chain audit for nine MEDCOEL Anatomy Studios

**21 November 2026 · Technical evidence collection; NOT a legal opinion, rights grant, approval, completed review or permission to publish.**

This stage advances real evidence for **all nine independent Anatomy Studios**, without opening any studio, changing a CC license in the canonical registry, automatically promoting rights or depending on a reply from DBCLS. Keep all MEDCOEL core features free; optional future paid question-explanation videos remain a separate product with separate rights.

## Source rights and exact releases

1. Official DBCLS [licensing page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), updated 27 February 2025, specifies **CC BY 4.0** and exact credit `BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International`.
2. Historical OBJ headers retained in Release 4.0 ZIP `isa_BP3D_4.0_obj_99.zip` were recorded as **CC BY-SA 2.1 Japan**. [Creative Commons' BY-SA 2.1 Japan deed](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en) permits commercial and noncommercial reuse, with attribution, ShareAlike and no additional restrictions. **Current page versus historical header does not automatically establish which grant covers every exact OBJ byte.** Do not simply relabel the old derivative files CC BY 4.0 or CC BY-SA 4.0 without evidence, particularly if contributor rights differ.
3. Archive SHA-256 (must match before reading any member):
   `40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e`.
4. Internal source tables SHA-256 and per-OBJ SHA evidence are checked by the script. All original raw assets are private and gitignored; no redistribution is authorized by merely passing a technical hash check.

## Nine independent studio targets

`brain-anatomy`, `head-neck-anatomy`, `spine-anatomy`, `thorax-anatomy`, `heart-anatomy`, `abdomen-anatomy`, `pelvis-anatomy`, `upper-limb-anatomy`, `lower-limb-anatomy`.

These use a **separate Three.js renderer** under `apps/studios/engines/anatomy3d`, rather than importing the legacy `apps/anatomy` frontend. The source guard checks the independent studio engine, shell and entrypoint trees for forbidden legacy Atlas code paths and model URLs. Passing this guard confirms a **specific static boundary**, not proof of original authorship, no dynamic dependencies, or full license clearance. A separate SBOM/dependency and contributor ownership audit remains necessary.

## How to audit the real private assets

Requires the legitimately obtained official ZIP and two source tables, and the previously generated `provenance.json` and `data/` in all nine private studio directories. Data should already be present from the prior data acquisition workflow, but the GitHub repository **does not** include the raw files.

```bash
# Runable on any repo clone; checks only static source boundaries and CI tests.
npm run check:bodyparts3d-code-origin
node --test scripts/studio-bodyparts3d-lineage.test.mjs

# Run only on the authorized development machine with source ZIP,
# official FMA -> FJ tables and all nine generated private studio builds.
npm run audit:bodyparts3d-studios
```

The private audit reads:
- `local-data/licensing-quarantine/bp3d-4.0/isa_BP3D_4.0_obj_99.zip`
- `local-data/licensing-quarantine/bp3d-4.0/isa_element_parts.txt`
- `local-data/licensing-quarantine/bp3d-4.0/isa_parts_list_e.txt`
- `local-data/studio-resources/build/<studio-id>/{provenance.json,data/*,server/challenge.json}`

The tool verifies:
- Pinned archive and table digests, canonical **FMA concept to every FJ source OBJ**, exact per-member hashes, no missing or unaccounted members.
- Source provenance, actual GLB and JSON output file hashes, basic credit/changes in the generated notice, and correct withheld `structures.json` Challenge behavior.
- The applicable source header notices found in the selected exact archive OBJ files as either `CC-BY-SA-2.1-JP`, `CC-BY-4.0`, or `UNCLEAR_REVIEW_REQUIRED`. An unknown header is **not** silently promoted to a permissive license.
- Legacy NC Atlas frontend source-import and runtime URL references are absent in the nine standalone studios' tracked source trees.
- Kidney/renal-pelvis/ossicle concept names (already quarantined in MEDCOEL) are not reintroduced.

The report is written locally to:
`local-data/studio-resources/evidence/bodyparts3d-nine-studios-origin-review.json`

**Do not commit this evidence file or raw ZIP/OBJ/GLB assets to GitHub, share patient-related or restricted data, or put it in public/VPS storage.** Its per-studio map links every FMA concept to exact source OBJ hashes and output hashes. If any source/derivative digest changes, rerun and review.

## Legal, medical and software acceptance checklist

- [ ] Confirm which exact Release 4.0 OBJ files are licensed by the current DBCLS CC BY 4.0 declaration, or document a lawful historical **CC BY-SA 2.1 JP** path. A request for *special* permission is not the same as the original CC license grant, and a refusal of an exception does not necessarily nullify a valid CC license.
- [ ] Have a qualified rights reviewer verify origin/ownership of selected mesh parts, exact license, author and attribution duties, adaptation notices, ShareAlike copy/distribution obligations, and any no-additional-restrictions issues.
- [ ] Produce a valid human-reviewed `NOTICE`, license link and derivative license choice **for each exact studio release**; the current generated notice is a draft, not a fully approved attribution statement.
- [ ] Audit dependencies, reused code and contributor ownership. The legacy Atlas code remains marked **CC BY-NC-SA 4.0 and blocked**; the separate studio engine avoids known direct imports but does not automatically clear legacy Atlas Viewer or 4D Lab.
- [ ] Have a medical/anatomy/terminology reviewer verify each model's names, left-right, completeness, body model limitations (adult male, no female pelvic structures), and all assessment answer keys.
- [ ] Recheck any privacy/public-distribution restrictions and the exact file/GLB hashes.
- [ ] Complete signed human review decisions through `licensing/tools/studio-review.mjs`, then separately pass the existing B1 release gates including qualified reviewer rights evidence, receipt and attestation. Do not manually set `verified` or `publishable`.

**Result now: technical audit tool and tests only.** Canonical source `bodyparts3d-dbcls` and its 9 studio rights remain `REVIEW_REQUIRED` / `needs-review`. No student access or public release is approved.

## Independent external references

- DBCLS official license: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- CC BY-SA 2.1 JP summary and legal code: https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en
- CC ShareAlike explanation: https://creativecommons.org/faq/
- CC compatibility list: https://creativecommons.org/compatible-licenses/
