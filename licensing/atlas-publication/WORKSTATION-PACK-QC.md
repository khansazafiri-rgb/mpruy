# Read-only workstation pack QC

After an authorized local review, run from the repository root with the existing exact pack name:

```sh
node scripts/audit-atlas-workstation-pack.mjs independent-source-review-<actual-folder>
```

The placeholder is not a real folder. The command requires the local dependencies already used by the private preview, the explicit independent BP3D 4.0 pack, and the eleven BP3D 4.3 plus two HRA staged acquisitions. It verifies the real pack and source receipts with the existing strict loaders, and prints aggregate JSON only (no geometry, local path or model rows). It does not download, mutate, publish, serve, or infer spatial alignment. Missing packs, inconsistent hashes, or ambiguous acquisitions stop the check. The body model count is local-pack coverage, not total human anatomy. Region/layer assignment counts are not clinically validated. Exact raw hash overlap is distinguished from FMA/FJ overlap and incomplete digest indexing.

Cloud tests exercise synthetic input and failure cases only; the actual workstation pack has not been accessible from this GitHub session. Do not mark the full-pack QC passed until its real output is obtained. Do not commit private geometry or raw patient data.

## Identity and display diagnostics

The aggregate `identityEvidence` counters distinguish identical raw bytes with matching FMA (and, more strictly, FJ), identical bytes associated with a different FMA, reused FJ with a different FMA, and concepts absent from the local body index. Counts may overlap. A different FMA association is a review candidate, not proof that either source is incorrect. An incomplete digest index cannot establish missing geometry. No counter establishes new anatomy, spatial registration or clinical correctness.

The independent BP3D 4.0 loader deliberately emits only `whole` region and no layer; `wholeOnly` and `withoutLayer` expose that limitation explicitly. These counters are not a region-classification success metric. Actual pack results remain required.

## Extended evidence profile
For an existing, explicitly named private body pack, append `--include-expansion` to the same QC command. This requires 17 exact BP3D acquisitions (376 elements / 368 distinct source concepts) and the 2 HRA acquisitions (9 files). `--include-hyoid` alone selects 248 elements. Baseline is unchanged. No automatic download or modification; a missing or ambiguous receipt blocks the audit. The actual workstation is not accessible from cloud CI, so the body-level result remains pending.
