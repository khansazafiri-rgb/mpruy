# Native nerve and lymphatic source gap work — 2026-11-26

## Z-Anatomy exact source pin
The existing private preview uses revision 3c1679595d89aa508ddffc72cd5e125c5d609a59. The current publisher master observed at 7be0bfc49409b45fda74bf86fc13086fad0f4df2 has the same archive and notice Git blobs:
- Z-Anatomy.zip: f43cabc6f366b2a6058dd2ed4a2b3c7b9b2492cb (86,734,957 bytes).
- License.txt: 4d48d7e83d2b79ba4510314c7612b2c3c0a90f67 (2,754 bytes).
- Repository: https://github.com/Z-Anatomy/Models-of-human-anatomy/tree/3c1679595d89aa508ddffc72cd5e125c5d609a59

Replay now verifies exact archive blob bytes, evaluates source-native surfaces only with upstream autoexec disabled, and records identity, triangle count, source-position hash and native bounds. No geometry export, upload or public route. Mixed-source license review is still required; the bundled notice identifies NC ear and kidney assets and additional brain/white matter provenance. No whole-archive commercial approval.

## Anatomio discovery
https://anatomio.org/en/human/lower-limb/ lists 13 of 14 named lower-limb nerve targets for both sides (26 labels of 28; inferior gluteal nerve not observed in listing). The page credits Z-Anatomy/DBCLS CC BY-SA 4.0 and explicitly notes specialist review pending. This is a discovery listing, not proof of a source mesh, completeness, native alignment or distinct left-side anatomy. No web-scraping of meshes or copying of site content.

## Anatomia Aperta 3D discovery
https://anatomiaaperta.org/sources/ and https://anatomiaaperta.org/licensing-attribution/
Official repository https://github.com/tspiriev/Anatomia-Aperta-3D/tree/175e770618176b0408661610e4bdabd71a83f387
- 3D Models.md describes GLB datasets by system and an external OneDrive download. Exact versioned file, bytes and source node inventory are not yet verified.
- LICENSE.md applies CC BY-SA 4.0 to eligible original contributions/adaptations, explicitly preserving third-party rights and source-version conditions. Commercial use is conditional, not an asset-level approval.
- MODIFICATIONS.md records lumbar plexus and pudendal nerve corrections (entries 8, 10, 11). This is source documentation only, not a verified mesh or claim of 28-target coverage.
- Do not import the entire collection or combine coordinate frames. First identify exact source file/version/hash, source object and contribution lineage; validate only independently selected targets. No public route.

## Other holds
HRA male lung hyoid UBERON:0001685 remains a source-specific held crosswalk, not repaired by separate BP3D hyoid. Neither Z-Anatomy nor Anatomia Aperta proves whole-body lymphatic network continuity. No clinical, rights, registration or release approval.
