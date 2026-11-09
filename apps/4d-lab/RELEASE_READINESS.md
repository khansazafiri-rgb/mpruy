# Release readiness — MEDCOEL Anatomy Live 4D Lab (atlas integration)

_Prepared 2026-11-09 against the integration branch `claude/focused-wozniak-1ayrxa` at the PR #136 merge
`58f8769`, plus the preview/QA changes in this branch. **Nothing has been deployed. Production Caddy, PocketBase,
Hermes, quizzes and the live Anatomy Atlas were not touched.**_

| Gate | Status |
|---|---|
| Merged code verified (PR #136 present, tree identical to the reviewed head) | ✅ done |
| Automated tests and builds (CI-equivalent) | ✅ all pass in the cloud container (see §2) |
| Reviewable preview with production URL layout | ✅ local preview (§1); **no isolated staging server exists** for this project |
| Safari on an 8 GB Apple Silicon Mac | ⏳ **not tested**: Safari is not available to the development session. Owner checklist in §3 |
| Clinical / anatomical review | ⏳ open: `MEDICAL_REVIEW_CHECKLIST.md` |
| Licence compliance for non-commercial educational distribution | ✅ verified (§5) |
| Production deployment | ⛔ not started; needs separate approval (§7) |

---

## 1. Open the preview on your Mac (local staging)

The repository contains no isolated staging server, and the development session has no credentials for any server.
So the preview is a **local, read-only server on your Mac** that reproduces the production URL layout and headers:

| URL | What it is | Production equivalent |
|---|---|---|
| `http://127.0.0.1:4190/anatomy/live` | MEDCOEL web page that frames the lab (what students see) | `https://medcoel.com/anatomy/live` |
| `http://127.0.0.1:4190/anatomy/4d-lab/` | the lab on its own (full window) | `/anatomy/4d-lab/` (Caddy `handle_path`) |
| `http://127.0.0.1:4190/anatomy/4d-lab/?dataset=phantom` | the earlier procedural phantom | — |
| `http://127.0.0.1:4190/anatomy/viewer/` | the Anatomy Atlas whose models the lab reuses | `/anatomy/viewer/` (existing) |

The preview has **no backend**. A fixture student is signed in ("Preview lokal · akun contoh"), and `/api/*`
answers from `preview/fixtures.mjs`. Nothing is uploaded anywhere.

### One-time setup
You need macOS with **Safari 16.4 or newer** (Safari → About Safari), **Node.js 22.12+** and git.

```bash
brew install node@22 git
```

(Or install Node 22 from nodejs.org. Check with `node -v`.)

```bash
git clone https://github.com/khansazafiri-rgb/mpruy.git
```

```bash
cd mpruy
```

```bash
git checkout claude/vigilant-cerf-jjc6fj
```

(This is the review branch. After it is merged, use `claude/focused-wozniak-1ayrxa`.)

```bash
npm ci && npm ci --prefix apps/anatomy && npm ci --prefix apps/4d-lab
```

### Start the preview
```bash
npm run preview:4d-lab
```

This builds the Atlas (base `/anatomy/viewer/`), the lab (base `/anatomy/4d-lab/`) and the web app (preview build),
which takes about 1–3 minutes. It then **refuses to start** unless these self-checks pass:
- both bundled datasets are complete and their mesh SHA-256 values match
- the 7 atlas GLBs, the Draco decoder, the catalog and `LICENSE`/`NOTICE`/`License.txt` are present
- the atlas models are **byte-identical** to the ones the lab's CT was generated from

When it prints the URLs, open **Safari → `http://127.0.0.1:4190/anatomy/live`**. Stop it with Ctrl+C.
To restart without rebuilding, run `node scripts/preview-4d-lab.mjs`.

Optional:
- To see console errors and memory: Safari → Settings → Advanced → "Show features for web developers", then
  Develop → Show Web Inspector (Console; Timelines → Memory).
- Activity Monitor → Memory shows the "Safari Web Content" process for this tab.
- **Another device (iPad, a second Mac) on the same Wi-Fi:** run `PORT=4190 node scripts/preview-4d-lab.mjs --lan`
  and open `http://<your-Mac-IP>:4190/anatomy/live`. This is plain http, so not a "secure context"; the lab
  verifies meshes with a built-in SHA-256 in that case (tested). Stop the server afterwards.

### Preview inside this cloud session (convenience only)
During the development session the same preview ran in the cloud container on port 4190 and was announced to the
Claude app. It disappears when the session ends, uses software rendering, and is **not** a Safari test.

---

## 2. Automated test report (2026-11-09, cloud container, Linux x86-64, Node 22.23, Chromium + SwiftShader)

| Suite (command) | Merged head `58f8769` | This branch (preview/QA changes) |
|---|---|---|
| Web lint (`npm run lint`) | ✅ pass | — (web unchanged) |
| Web + PocketBase format tests (`npm test`) | ✅ 140 + 58 | — |
| Web build (`npm run build`) | ✅ | ✅ (`npm run preview:4d-lab` build) |
| Hermes (`check` + tests) | ✅ 67 | — |
| Anatomy release/host integration (`npm run test:anatomy-integration`) | ✅ 7 | — |
| Anatomy Atlas tests + lint (`npm run test:anatomy`, `lint:anatomy`) | ✅ 77 | — (atlas unchanged) |
| Anatomy Atlas build (`ANATOMY_BASE=/anatomy/viewer/`) | ✅ | ✅ |
| 4D Lab unit/integration (`npm test --prefix apps/4d-lab`) | ✅ 45 | ✅ **46** (+ SHA-256 fallback) |
| Staging + preview scripts (`node --test scripts/stage-4d-lab.test.mjs scripts/preview-4d-lab.test.mjs`) | ✅ 1 | ✅ **3** |
| 4D Lab build (`npm run build:4d-lab`) | ✅ | ✅ |
| Browser, phantom (`npm run test:e2e`) | ✅ 14/14 | ✅ 14/14 |
| Browser, atlas (`npm run test:e2e:atlas`) | ✅ 14/14 | ✅ 14/14 |
| `/anatomy/live` in the MEDCOEL web app (`test/e2e/integration.mjs`) | ✅ | ✅ |
| Preview smoke (host page → lab → atlas ready) on `127.0.0.1` and on a LAN IP (non-secure context) | — | ✅ both, no page errors, 484 atlas structures |
| PocketBase live API suite | not run here (needs the PocketBase binary download); covered by GitHub CI | — |

Measured under software WebGL: lab ready ≈ 1 s, atlas layer ready ≈ 4.4–6 s after navigation; JS heap 73 MiB; atlas
mesh deformation 31–83 ms per update (scheduled adaptively). **These are not Safari or Apple-hardware numbers.**

### Safari compatibility (static review, not a Safari test)
| Feature used | Minimum Safari | Handling |
|---|---|---|
| gzip NRRD via `DecompressionStream` | **16.4** | Clear Indonesian message at start-up asking to update Safari |
| Module Web Worker (imaging) | 15 | — |
| WebGL 2 / WebGL | 15 / all | message if WebGL is unavailable |
| `crypto.subtle` (mesh SHA-256) | all, **secure contexts only** | pure-JS SHA-256 fallback for plain-http LAN previews (tested) |
| Web Audio | all (`webkitAudioContext` fallback) | starts only after the "Nyalakan suara" click (autoplay policy) |
| Fullscreen API | 16.4 unprefixed | falls back to the "Perbesar monitor" layout |
| CSS `:has()` | 15.4 | — |
| `performance.memory` | not in Safari | readout says it is unavailable; use Web Inspector / Activity Monitor |

---

## 3. Safari manual acceptance checklist (owner, 8 GB Apple Silicon Mac)

Open `http://127.0.0.1:4190/anatomy/live`. Record pass/fail and notes in a copy of this table.
**Most important (item 2–3): the probe must never feel attached to rings, circles or an orbit around the body.**

| # | Test | How | Expected | Pass / notes |
|---|---|---|---|---|
| 1 | Full-body anatomical view | Camera "Seluruh tubuh"; Anatomi → "Tubuh luar", then "Kulit transparan" | A recognisable whole human on the table; with transparent skin the organs, ribs and spine are inside the body in the right places | |
| 2a | Anterior placement | Camera "Anterior"; click anywhere on the chest and abdomen | The probe lands **exactly where you click**; the readout names the region (e.g. "Kuadran kiri bawah"); the image changes | |
| 2b | Lateral placement | Camera "Kanan"; click the lower lateral chest **below the arm**, then click the arm | Below the arm: "Toraks lateral kanan …". On the arm: "Lengan kanan" (the atlas arms rest on the chest; arm abduction is not available) | |
| 2c | Posterior placement | Camera "Posterior"; click the back | The probe sits on the back with the beam pointing into the body | |
| 2d | Free sliding | Drag the probe diagonally and in zig-zags across the abdomen | It follows the mouse over the surface in **any** direction. No snapping to rings, latitude lines or a circle around the body axis | |
| 2e | Outside the imaging volume | Click the thigh | The probe does not move; a message says the point is outside the CT coverage | |
| 3 | Fixed-contact angulation | Probe tab → Rotasi, Heel–toe, Rock (sliders, ± buttons, typed values; or drag the coloured rings) | The contact point (readout "Kontak (LPS mm)") **stays the same**; only the orientation and the image change; transverse 0° / longitudinal 90° buttons work | |
| 4 | Free 3D reformats | Probe tab → "Free 3D": Aksial, Koronal, Sagital, Oblik; type position/angles; drag the arrows/rings | The CT reformat shows the expected plane through the atlas body; the plane moves freely, independent of the skin; a red banner appears when the plane leaves the CT | |
| 5 | Camera independence | With the image paused (Jeda), orbit/zoom/pan the camera and press every camera preset | The monitor image does **not** change | |
| 6 | Ultrasound follows the probe | Standard windows: Subxifoid, Parasternal, RUQ, Antrum epigastrik, Kandung kemih; then small heel-toe/rock changes | The US image changes with every probe change. Subxiphoid shows the heart, epigastric shows the antrum, suprapubic shows an anechoic bladder. Apical is partly obstructed by lung (known limitation) | |
| 7 | Monitor size and zoom | "Perbesar monitor", "Layar penuh", +/−, Fit, 1:1, drag to pan, scroll to zoom | The image can be viewed large; fullscreen works in Safari (or falls back to the enlarged layout); Esc leaves fullscreen | |
| 8 | Transparent skin and structure selection | Anatomi: display modes; systems + transparency; search "Left ventricle" → Isolasi → Kembali; "Pilih di 3D" then click an organ; Sembunyikan/Tampilkan; Pulihkan tampilan | Each control does what it says; the structure names match the Anatomy Atlas (`/anatomy/viewer/`) | |
| 9 | Physiological motion | Putar (play); Fisiologi tab: heart rate, phase, end-diastole/end-systole, breath depth, breath hold, antral frequency; Anatomi → "Tandai struktur yang digerakkan" | Heart, lungs/diaphragm and antrum move; image and 3D move together; pausing freezes both | |
| 10 | Pathology scenarios | Patologi: HFrEF, Efusi pleura kanan, Motilitas antrum; "Bandingkan dengan normal" | HFrEF: reduced, dilated LV motion (opens the subxiphoid window). Effusion: blue fluid layer at the right posterior base, dark fluid on CT/US. Gastroparesis: slower, weaker antral waves | |
| 11 | Stethoscope sound | Auskultasi: Stetoskop → "Nyalakan suara"; sites mitral, aortic, right posterior base; Diafragma vs Bell; HFrEF S3 | Sound plays after the click; heart sounds are loudest at cardiac sites; S3 is audible with the bell in HFrEF; breath sounds are reduced over the effusion | |
| 12 | Responsiveness and memory | Use the lab for 10 minutes with motion on; load "Otot batang tubuh" and "Saraf batang tubuh"; switch modes repeatedly | Interaction stays usable (no multi-second freezes). Note Activity Monitor memory for the Safari Web Content process before/after loading muscles and nerves. No crash or tab reload | |

Also note: load time to "Atlas MEDCOEL: … struktur dimuat" (Anatomi tab), any console errors (Web Inspector),
and anything that looks anatomically wrong (feed into `MEDICAL_REVIEW_CHECKLIST.md`).

---

## 4. Known limitations (keep visible in any release note)
1. **Synthetic, educational only.** The CT is generated from atlas geometry with textbook HU values. Ultrasound is a
   simplified acoustic model. Motion is procedural. Scenarios are parameter changes. Not patient data, not a medical
   device, not for diagnosis. The on-screen disclaimers ("Simulasi edukatif · bukan alat diagnosis", monitor captions,
   scenario warnings) must stay.
2. **Skin is illustrative.** It is the atlas muscle/bone envelope plus an assumed 8 mm (5 mm on the arms) of fat and
   skin. It is not a scanned body surface.
3. **Arms adducted** (anatomical position, resting on the lateral chest). The mid-axillary contacts sit below the arm;
   abduction would need a rigged model.
4. **Apical window obstructed** by the atlas lingula and anterior lung margins; HFrEF uses the subxiphoid window.
5. **Missing atlas anatomy:** ileum, caecum, rectum, peritoneum, pericardium and breast. The lower abdomen contains
   unlabelled soft tissue.
6. **Atlas organ motion is CPU-bound:** about 100 k vertices per update; it updates less often on slower devices.
7. **Not registered to any real CT.** The atlas is hidden for local CT and for the procedural phantom.
8. Safari performance and memory are **unmeasured** until checklist item 12 is done.
9. Scenario explanation texts are English (UI labels are Indonesian); they need translation and clinical review.

---

## 5. Asset licence compliance (status for non-commercial educational distribution)
| Item | Finding | Status |
|---|---|---|
| Anatomy Atlas models | Loaded from `/anatomy/viewer/` at runtime; **not copied** into the lab build (verified: `apps/4d-lab/dist` contains no GLB or Draco files from the atlas) | ✅ |
| Atlas licence files | `LICENSE`, `NOTICE`, `models/License.txt` present in the atlas build (checked by the preview and by CI) | ✅ |
| Atlas-derived dataset (`/anatomy/4d-lab/data/atlas/`) | CC BY-NC-SA 4.0 derivative. **`NOTICE.txt` now ships next to the files** (attributions, licence, "synthetic" statement); attributions also shown in the Anatomi tab; `stage-4d-lab.mjs` refuses a build without it | ✅ |
| Share-alike | Derived files are offered under the same licence (CC BY-NC-SA 4.0) | ✅ |
| Non-commercial clause | NC kidney (lissiecowley) and NC inner ear in the atlas: MEDCOEL's educational deployment must stay non-commercial | ✅ for the preview; ⚠ before any commercial use, replace the kidney and rebuild (`ASSET_LICENSE_REGISTRY.md`) |
| IT'IS Virtual Population | Not present (repository scan: no ViP files, names or derivatives) | ✅ |
| CTACardio / EchoNet / TotalSegmentator weights | Not present; nothing uploaded; local processing only | ✅ |
| Third-party code | three.js, three-mesh-bvh (MIT); build-only tools glTF-Transform (MIT), draco3dgltf (Apache-2.0) | ✅ |

This is an engineering compliance check, not legal advice.

---

## 6. Rollback
- **Lab (static):** `LAB4D_DIR=/var/lib/medcoel/4d-lab node scripts/stage-4d-lab.mjs --rollback` switches the release
  symlink back to the previous release, re-validating it first. With no previous release, remove the symlink:
  `/anatomy/live` then shows its built-in "not installed" message (it checks for the lab before framing).
- **Caddy:** remove the `deploy/4d-lab.caddy.snippet` block, run `caddy validate`, reload (with approval).
- **Web app:** redeploy the previous `apps/web/dist` (the `/anatomy/live` route is the only web change).
- **Atlas, PocketBase, Hermes:** not modified by this release, so nothing to roll back.

## 7. Production deployment plan (each step needs separate, explicit approval)
1. Owner completes §3 in Safari and the reviewers complete `MEDICAL_REVIEW_CHECKLIST.md`; issues are fixed and
   re-tested.
2. Merge the review branch into `claude/focused-wozniak-1ayrxa` (owner).
3. On the server: confirm `/anatomy/viewer/` is the current atlas release.
4. Build and test:

   ```bash
   npm ci --prefix apps/4d-lab && npm run test:4d-lab && npm run build:4d-lab
   ```

5. Stage the lab:

   ```bash
   LAB4D_DIR=/var/lib/medcoel/4d-lab LAB4D_RELEASE_ID=<id> npm run stage:4d-lab
   ```

   This validates both datasets and their NOTICE, and refuses to activate if the live atlas models differ from the
   dataset's source models.
6. Add `deploy/4d-lab.caddy.snippet` to the medcoel.com site block before the SPA handle, run `caddy validate`, and
   reload **only with approval**.
7. Build and deploy `apps/web` as usual (it contains `/anatomy/live`).
8. Smoke test on medcoel.com in Safari: §3 items 1, 2, 6, 8, 10, 11. Keep the rollback commands ready.
