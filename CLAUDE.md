# MEDCOEL monorepo — notes for Claude Code sessions

- Default/integration branch: `claude/focused-wozniak-1ayrxa` (contains Anatomy Atlas, PocketBase, Hermes). `main` is a separate line. Never push to either without explicit approval.
- Apps: `apps/web` (React/Vite site), `apps/pocketbase`, `apps/hermes-agent`, `apps/anatomy` (Atlas viewer at `/anatomy/viewer/`), `apps/4d-lab` (Anatomy Live 4D Lab at `/anatomy/4d-lab/`, framed by `/anatomy/live`).
- Working on the 4D Lab: read `apps/4d-lab/CLAUDE.md` and `apps/4d-lab/PHASE_STATUS.md` first.
- The 4D Lab loads the Atlas models at runtime from `/anatomy/viewer/models/`, `/anatomy/viewer/draco/` and `/anatomy/viewer/data/atlas-catalog.json`. Keep those paths stable (or update `apps/4d-lab/src/app/atlasLayer.js`); after changing atlas GLBs, rebuild the lab's atlas-derived dataset (`npm run atlas:dataset --prefix apps/4d-lab`).
- Tests: `npm test` (web + pocketbase format), `npm run test:anatomy-integration`, `npm run test:4d-lab`. UI language is Indonesian.
- Never commit secrets, restricted medical datasets (e.g. CTACardio), licence keys or model weights.
