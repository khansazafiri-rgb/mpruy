# Public exposure, stop-delivery steps, rollback and Git-history assessment

Nothing in this document has been executed against production. This PR changes only the repository.
Production (medcoel.com, Caddy, release folders) was **only read**, using `HEAD` requests on
2026-11-09. Every step below is for the owner, or someone the owner authorises, to run.

## 1. Live exposure found (read-only HEAD checks, 2026-11-09)

| URL | Status | Content |
|---|---|---|
| `https://medcoel.com/anatomy/viewer/models/nervous.glb` | **200**, 3,802,588 B | **Withheld file is live** (same size as the original) |
| `https://medcoel.com/anatomy/viewer/models/visceral.glb` | **200**, 1,844,996 B | **Original with the NC kidney is live** |
| `https://medcoel.com/anatomy/viewer/models/skeletal.glb` | **200**, 1,863,828 B | **Original with the ossicles is live** |
| `https://medcoel.com/anatomy/viewer/thumbnails/systems/nervous.webp` | **200** | Withheld preview is live; the 590 structure previews are presumably live too (same release) |
| `https://medcoel.com/anatomy/viewer/LICENSE` | 200, 4,828 B | Old licence text (declares CC BY-NC-SA) |
| `https://medcoel.com/anatomy/4d-lab/data/atlas/{ct,labels}.nrrd`, `NOTICE.txt` | 200 `text/html`, 1,333 B | The **web SPA fallback**. The 4D Lab is **not deployed** in production, so the old atlas-derived CT is **not** exposed there. |
| `https://nqwrc.github.io/3d-anatomy/models/nervous.glb`, `visceral.glb` | **200**, same sizes | External GitHub Pages copy of the upstream atlas (not this repository); see LEGAL_REVIEW #10 |
| `https://github.com/khansazafiri-rgb/mpruy` (public), raw and blob URLs on branches that contain commit `2d9f2ee` (2026-11-03) or later | Public | Every withdrawn binary remains downloadable **from Git history** (section 4) |

Pages that **load** the withheld files: `/anatomy/viewer/` (when the nervous or organ systems are
switched on), `/anatomy` pages that embed it (`/anatomy/explore`, `/anatomy/study`, library pages
with previews), and `/anatomy/structure/<nervous or kidney structure>` previews.

## 2. Immediate stop-delivery options (pick one; all reversible)

**Option A — targeted block, viewer keeps working (recommended first step, minutes).**
`licensing/deploy/withheld-paths.caddy` is generated from the withdrawn-file list. It returns 404
with `no-store` for `nervous.glb`, both system previews and all 590 withheld structure previews.

1. On the server, back up the live config: `sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-licence`
2. Paste the snippet **inside** the medcoel.com site block, **before** the
   `handle_path /anatomy/viewer/*` block.
3. `sudo caddy validate --config /etc/caddy/Caddyfile` then `sudo systemctl reload caddy`
   (or `caddy reload`).
4. Verify: `curl -sI https://medcoel.com/anatomy/viewer/models/nervous.glb` → `404`.

**Limit:** the original `visceral.glb` (kidney) and `skeletal.glb` (ossicles) are still served,
because blocking them would remove the whole skeleton and organs. They stop when Option B is done.
The snippet was generated, not run through `caddy validate` (no Caddy binary in this session).

**Option B — stage the cleared Atlas release (after this PR is reviewed).**
1. Check out the reviewed commit on the build host.
2. Run `deploy/install-anatomy-viewer.sh`.
   - It runs `npm ci` and builds with `ANATOMY_BASE=/anatomy/viewer/`. The build itself fails if
     withheld content is present, and `emptyOutDir` prevents a stale `dist/`.
   - `scripts/stage-anatomy.mjs` then rescans and atomically switches the
     `/var/lib/medcoel/anatomy-viewer` symlink to a new release folder.
3. Verify:
   - `npm run check:licensing-dist -- /var/lib/medcoel/anatomy-viewer`
   - `curl -sI …/models/nervous.glb` → `404`
   - `curl -sI …/models/visceral.glb` → `Content-Length: 1815064`
4. Option A can then be removed (it matches nothing).
5. Cache: models are served with a 3600 s cache, so browsers and intermediaries may keep the old
   files for up to an hour. Purge any CDN in front of medcoel.com.

**Option C — most conservative (if legal advice requires zero exposure now).** Temporarily
answer `/anatomy/viewer/*` with a 503 "maintenance" page until Option B is done. This takes the
3D atlas and the embedded study features offline.

**4D Lab:** not deployed, so nothing to stop. Do **not** deploy any 4D Lab build made before this
PR. `scripts/stage-4d-lab.mjs` now refuses such a build.

## 3. Rollback

- **Code / build rollback** (e.g. the cleared viewer misbehaves):
  `node scripts/stage-anatomy.mjs --rollback` switches back to the previous release. **By design it
  refuses a pre-quarantine release** (`Licence quarantine: Anatomy viewer release contains
  withheld content`), so a rollback cannot re-publish withheld files. To roll back to an older but
  cleared build, stage that commit with a new `ANATOMY_RELEASE_ID`.
- **Option A rollback:** remove the snippet (or restore `Caddyfile.bak-licence`), validate and reload.
- **Option C rollback:** remove the 503 handler, validate and reload.
- **Re-enabling an item after legal clearance:** edit `licensing/quarantine-policy.json` in a reviewed PR,
  restore the original from `local-data/` or history (`node licensing/tools/restore-originals.mjs`),
  re-run `node licensing/tools/apply-quarantine.mjs` (adapted) and `npm run atlas:dataset --prefix apps/4d-lab`.

## 4. Git history and old PRs (no rewriting done — FLAGGED for the owner)

- The withdrawn files were committed to this **public** repository in `2d9f2ee` (2026-11-03,
  atlas GLBs and previews) and `c222340` (2026-11-08, 4D Lab atlas dataset). They are reachable from (these are the earliest commits visible in the shallow clone used here; older history may contain them too):
  - the integration branch `claude/focused-wozniak-1ayrxa`;
  - every branch created from it since then;
  - the merged PRs #136 (4D Lab atlas integration), #138 and #139;
  - the PRs that brought the Atlas into the monorepo.

  List the affected branches with a full clone:
  `git fetch --unshallow && git branch -r --contains 2d9f2ee`.
- Deleting the files in this PR **does not** remove them from history, forks, clones, the GitHub
  PR "Files changed" views or GitHub's caches.
- Options that **change history or visibility** have significant operational consequences and
  **were not taken** (instruction: no history rewrite, no force-push, no automatic privatisation):

| Option | Effect | Consequences to weigh |
|---|---|---|
| Leave history as is; rely on removal from the tip and from production | Files remain downloadable by anyone digging into history | Lowest disruption; a residual legal exposure that counsel should assess |
| Make the repository private | Stops casual public access to history | Breaks public links and any GitHub Pages; forks stay public; collaborators and CI tokens unaffected |
| Rewrite history (`git filter-repo` on all branches) + force-push | Removes the blobs from the canonical repo | Invalidates every clone, branch, open PR and commit SHA (release IDs and the `ANATOMY_RELEASE_ID` journal reference SHAs); GitHub still keeps cached PR refs until GitHub Support purges them; forks keep the data |
| GitHub Support request to purge cached views and PR refs | Needed after any rewrite for completeness | Manual process, takes time |
| Takedown or permission request upstream | Not needed for MEDCOEL's own exposure | — |

## 5. Server-side leftovers (FLAGGED, not touched)

The previous Atlas release folder under `/var/lib/medcoel/anatomy-viewer-releases/<id>/` still holds
the withdrawn files on disk after Option B. It is not served once the symlink moves, but:

- it is the `previousTarget` in `deployment.json` (rollback to it is refused by the guard);
- any backup or rsync of `/var/lib/medcoel` carries it.

Deleting production files was explicitly excluded from this task. The owner should decide whether
to archive the folder privately or delete it.
