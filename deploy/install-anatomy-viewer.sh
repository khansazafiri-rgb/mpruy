#!/usr/bin/env bash
# Build/install static Anatomy only. Does not edit Caddy, Git, databases or services.
set -euo pipefail
ANATOMY_REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
case "${1:-}" in
  --skip-build) ;;
  '') npm ci --prefix "$ANATOMY_REPO_ROOT/apps/anatomy"
      ANATOMY_BASE=/anatomy/viewer/ npm run build --prefix "$ANATOMY_REPO_ROOT/apps/anatomy" ;;
  *) echo 'Usage: install-anatomy-viewer.sh [--skip-build]' >&2; exit 2 ;;
esac
# One deterministic ID per approved commit; repeat runs verify content and do not
# reset the previous-release journal. A changed build under the same ID is rejected.
export ANATOMY_RELEASE_ID="${ANATOMY_RELEASE_ID:-$(git -C "$ANATOMY_REPO_ROOT" rev-parse HEAD)}"
export ANATOMY_DIST="${ANATOMY_DIST:-$ANATOMY_REPO_ROOT/apps/anatomy/dist}"
exec "${ANATOMY_NODE_BINARY:-node}" "$ANATOMY_REPO_ROOT/scripts/stage-anatomy.mjs"
