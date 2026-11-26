# Read-only workstation pack QC

After an authorized local review, run from the repository root with the existing exact pack name:

```sh
node scripts/audit-atlas-workstation-pack.mjs independent-source-review-<actual-folder>
```

The placeholder is not a real folder. The command requires the local dependencies already used by the private preview, the explicit independent BP3D 4.0 pack, and the eleven BP3D 4.3 plus two HRA staged acquisitions. It verifies the real pack and source receipts with the existing strict loaders, and prints aggregate JSON only (no geometry, local path or model rows). It does not download, mutate, publish, serve, or infer spatial alignment. Missing packs, inconsistent hashes, or ambiguous acquisitions stop the check. The body model count is local-pack coverage, not total human anatomy. Region/layer assignment counts are not clinically validated. Exact raw hash overlap is distinguished from FMA/FJ overlap and incomplete digest indexing.

Cloud tests exercise synthetic input and failure cases only; the actual workstation pack has not been accessible from this GitHub session. Do not mark the full-pack QC passed until its real output is obtained. Do not commit private geometry or raw patient data.
