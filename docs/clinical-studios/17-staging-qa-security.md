# Staging runbook, QA, security and performance — Clinical Studios (2026-11-20)

## 1. Staging status (Workstream G)

**Preflight result: no isolated staging environment exists that this session can reach.** No VPS, DNS, Caddy or production
PocketBase was touched. What exists instead:

| Need | Provided | Where |
|---|---|---|
| Production-layout local stack | real PocketBase (disposable dir) + `scripts/local-prod-layout-server.mjs` (Caddy route stand-in) + studio installed via stage → receipt → attestation | `scripts/studios-fullstack-e2e.mjs` (`npm run test:studios-fullstack`) |
| Reviewer preview of real (private) data | token-protected, 127.0.0.1-only server, PRIVATE_REVIEW builds only, permanent banner, never serves `server/`, no receipt/attestation (no fake clearance) | `apps/studios/scripts/review-preview.mjs` |
| Review packages | per-studio private packages with exact SHA-256, privacy scan, challenge key, terminology draft, checklist | `node licensing/tools/studio-review.mjs package <id>` → `local-data/…/review-packages/` |

### Runbook for an isolated staging host (owner-run, needs explicit deployment authorisation)
1. **Separate host or container**; never the production PocketBase data directory. Fresh `pb_data`; separate superuser.
2. Deploy the branch: PocketBase hooks + migrations (adds `studio_progress`, migration `1800003300`), web build. The web app
   requires migration `1800003300` (`REQUIRED_MIGRATION`), so update PocketBase **before** the web bundle.
3. Keys: generate fresh studio session/receipt keys and a separate review key **on the staging host only**
   (`MEDCOEL_STUDIO_KEYS`, `MEDCOEL_STUDIO_SESSION_KID`, `MEDCOEL_REVIEW_KEYS`). Never reuse production keys; never commit.
4. Engineering acceptance with synthetic data only: run the full-stack flow against staging with `MEDCOEL_DEV_MODE=1` and a
   `test-` catalog (exactly what `studios-fullstack-e2e.mjs` does locally). Turn dev mode off afterwards.
5. Reviewer access to real data: run `review-preview.mjs` on the staging host bound to 127.0.0.1 and give each reviewer an
   SSH tunnel plus the per-run token. Do not put it behind a public hostname.
6. **Do not** issue receipts for canonical studios: `issueReceipt` refuses anyway until rights are verified and reviews signed.
7. Rollback: stop PocketBase, restore the previous hooks/migrations directory and `pb_data` snapshot; the migration's down
   step deletes only `studio_progress`.

### Dedicated studio origin (Workstream F)
Not configured: it would require new DNS and a Caddy site, which are production changes needing your authorisation. The current
design already isolates studios: iframe served from a release-scoped path under `/api/medcoel/studio-assets/{id}/{release}/`,
HttpOnly SameSite=Strict cookie scoped to that path, per-request CSP and `X-Frame-Options`, assets re-verified against the
signed attestation on every request. A separate origin (e.g. `studios.<domain>`) would add cookie/storage isolation from the
main web app; proposed as an owner decision.

## 2. QA results (this session, Chromium/SwiftShader only)

| Suite | Result |
|---|---|
| `npm test` (web 168 + PocketBase format/API 7 + 84) | pass |
| `npm run test:studios` (catalog, resources, contract, release, review, status check) | 81/81 + review verify + status check |
| `npm run test:licensing` | 40/40 + quarantine, distribution, evidence and code-origin audits |
| `scripts/studio-final-integration.test.mjs` | 8/8 (INTEGRATION-007 requires fixture builds at HEAD) |
| `apps/studios` unit | 16/16 |
| PocketBase secure API + Challenge/progress (real PocketBase) | SEC 12/12, CHAL 10/10 |
| Studio browser smoke (`all-studios.e2e.mjs`) | 24/24 Explore + Guided (incl. 3 new private builds) |
| **Full-stack e2e** (login → hub → host iframe → Explore → Guided → Challenge → progress → re-entry → revocation) | 7/7 |
| Anatomy integration, Anatomy Vitest, 4D Lab unit, Hermes | pass |
| 4D UX e2e | see §4 |
| Cross-browser | **Firefox/WebKit not installed in this environment** (Playwright browsers may not be reinstalled here); Safari/iPad and real GPUs remain open |

## 3. Security notes
- Answer keys: `server/` never delivered (secure route, review preview and static test server all deny it); Challenge items carry
  no answers; per-image annotation files are `challengeRestricted`.
- Progress: written only by the server during grading; first answer per item counts; no per-answer data in any API response;
  collection has no public API rules; cascade delete with the user; admin view is aggregate-only.
- Reviews: decisions are HMAC-signed with an out-of-repo key and bound to SHA-256; hand edits are detected (`verify`).
- Privacy: automated scan (identity keys, dates, DICOM UIDs, NIfTI text fields/extensions, gzip names, PNG text/EXIF chunks,
  tabular/DICOM files). One real finding was handled at the source: AMOS NIfTI `descrip` held an acquisition time and is cleared.
  Burned-in markers on radiographs ("R", corner labels) are listed for the human privacy reviewer.

### npm advisories (no `npm audit fix --force` anywhere)
| Workspace | Advisory | Exposure | Action |
|---|---|---|---|
| `apps/studios` | vite ≤6.4.3 (dev server path traversal), fflate 0.8.2 (ZIP64 unzip loop) | dev server only / `unzipSync` not used (studios use `gunzipSync`) | **fixed**: vite 6.4.6 (patch), fflate 0.8.3 → 0 advisories |
| root (apps/web) | react-router ≤7.17 open redirect via backslash in `<Link>`/`useNavigate` (moderate) | runtime; MEDCOEL navigates only to internal constant paths | fix needs a **major** upgrade (react-router-dom 7.18.6) → owner decision |
| root | vite (dev server `server.fs.deny` bypass, moderate) | dev server only, bound locally | non-forced fix available; legacy toolchain left unchanged pending owner OK |
| `apps/anatomy` | vitest/@vitest/mocker, vite 8, postcss, source-map-js, nanoid, brace-expansion, js-yaml (dev/test tooling); sharp/ndarray-pixels (offline model tooling) | not in the served static bundle | non-forced fixes available; legacy app left unchanged pending owner OK |
| `apps/4d-lab` | none | – | – |

## 4. Performance
- Studio bundles: independent Vite builds; private data sizes: abdomen-ct 19.2 MB (CT 16.8 MB gz), chest-xray 3.1 MB,
  pelvis-ultrasound 0.8 MB; anatomy GLBs 1.4–11.4 MB (mesh compression/LOD still open).
- Full reproducibility run (hash 46 inputs, re-run 16 tools, compare 54 outputs): ~20 s locally.

## 5. 4D Lab camera pixel-hash check
The step "camera is free without any mode switch, and never changes the image" orbits/zooms the 3D patient view and asserts
the CT/US monitor canvas hash is unchanged. Fresh result of this session's run is reported in the final report (the evidence
file `apps/4d-lab/evidence/ux-e2e-results.json` is historical and was restored, not overwritten).
