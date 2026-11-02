# MEDCOEL Anatomy — coordination handoff for Claude

Repository: https://github.com/khansazafiri-rgb/mpruy

| Checkout | Branch | Project location |
| --- | --- | --- |
| Anatomy | handoff/anatomy-visual-learning | repository root; src/, public/, package.json |
| Main MEDCOEL | handoff/medcoel-anatomy-visual-learning | apps/web |

Anatomy final publication commit: 982dae673e2f761ae9e8a08235df6122a040317e.
Main publication commit: the HEAD of this branch; run git rev-parse HEAD.
Reviewed local UI checkpoints: Anatomy 57f941d5e319f9c09bede31bca3b7bd629a91583, main c5b0af3e8ee2e5c0723751b081e8ca46bb5050f4. Publication commits differ because they preserve remote history and include handoff provenance. Anatomy publication also fills missing optional native dependency lock entries so npm ci succeeds on Linux. No GLB or runtime engine/UI source was changed for publication.

## Retrieve in two separate folders

```sh
git clone --single-branch --branch handoff/anatomy-visual-learning https://github.com/khansazafiri-rgb/mpruy.git ~/medcoel-anatomy-handoff
git clone --single-branch --branch handoff/medcoel-anatomy-visual-learning https://github.com/khansazafiri-rgb/mpruy.git ~/medcoel-web-handoff
```

Create new feature branches from these handoff branches for further edits. The standalone Anatomy checkout is not the main MEDCOEL monorepo. The older preview/anatomy-workmode-source commit a874a3d is retained as historical spatial provenance; use the handoff branch above for current code. integration/anatomy-host.patch is historical and must not be applied over this complete source.

## Verify and preview, without deployment

Use Node >=22.12.0.

```sh
cd ~/medcoel-anatomy-handoff
npm ci
npm run lint
npm test
npm run build -- --base=/anatomy/viewer/

cd ~/medcoel-web-handoff
npm ci
npm run lint
npm run test --prefix apps/web
npm run build
npm run build --prefix apps/web -- --config vite.anatomy-preview.config.js
PORT=4188 ANATOMY_DIST=../medcoel-anatomy-handoff/dist npm run preview:anatomy
```

Open http://127.0.0.1:4188/anatomy. The special preview build uses a local example account; normal builds retain the existing MEDCOEL authentication. These commands do not start PocketBase, change Caddy, restart Hermes, or deploy.

## Editing brief

Continue MEDCOEL Human Anatomy Library and visual learning. Preserve the actual 3D cover, all 2,827 isolated mesh previews, the region → system → structures flow, guided interactive quiz setup, contextual fade plus target glow, all existing atlas selection/camera/Hide/Fade/Restore/Isolate controls, and /admin/anatomy Annotator. Do not map new landmarks as the main task. Do not change GLBs, PocketBase, question bank or medcoel-hermes. Do not merge or deploy production. After editing, run tests/lint/build, verify responsive layouts, and create a preview.

## Validation and scope

The reviewed local builds passed 55 Anatomy tests, 127 web tests, one routing test, lint and both builds; 49 actual preview URL/assets were checked. Anatomy was additionally assembled and tested in Linux GitHub Actions; all expected files and preview hashes were verified. The full Anatomy source tree contains 2,953 files, including models, engine, data, host integration, Annotator, and all previews. The temporary source-assembly workflow removes itself and the packed transport files after successful publication; it performs no deployment.

This main branch starts at current remote main snapshot cde6116ac50c542192afc2f5a5becf52a0595ed7 and adds only scoped Anatomy/frontend/preview/documentation changes. Other main web and PocketBase files remain on that remote snapshot. The admin navigation edits are applied to the current remote AdminLayout, preserving unrelated current behavior.
