#!/usr/bin/env bash
# MEDCOEL research showcase: additive public HTML only. Not a model release.
# Execute as the authorized production operator with APPROVED_SHA set to
# the reviewed, complete integration commit SHA.
set -euo pipefail
: "$APPROVED_SHA"
[[ "$APPROVED_SHA" =~ ^[a-f0-9]{40}$ ]] || { echo "Expected full 40-character approved SHA"; exit 2; }

REPO=""
for p in /opt/medcoel /opt/medcoel/app; do
  if git -C "$p" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    REPO="$p"
    break
  fi
done
test -n "$REPO" || { echo "Existing MEDCOEL Git checkout not found"; exit 1; }
echo "Repository: $REPO"
git -C "$REPO" fetch --no-tags origin claude/focused-wozniak-1ayrxa
git -C "$REPO" cat-file -e "$APPROVED_SHA^{commit}"
git -C "$REPO" merge-base --is-ancestor "$APPROVED_SHA" origin/claude/focused-wozniak-1ayrxa \
  || { echo "Approved SHA is not in the production integration branch"; exit 1; }

CADDY=/etc/caddy/Caddyfile
test -r "$CADDY" || { echo "Existing Caddyfile unreadable; stop"; exit 1; }
DOCROOT=""
for d in /opt/medcoel/apps/web/dist /opt/medcoel/app/apps/web/dist; do
  if test -f "$d/index.html" && grep -Fq "$d" "$CADDY"; then
    DOCROOT="$d"
    break
  fi
done
test -n "$DOCROOT" || {
  echo "No matching MEDCOEL public docroot in active Caddyfile + index.html"
  exit 1
}
echo "Document root: $DOCROOT"

TEMP=$(mktemp)
trap 'rm -f "$TEMP"' EXIT
git -C "$REPO" show "$APPROVED_SHA:apps/web/public/medcoel-research-preview.html" > "$TEMP"
test "$(wc -c < "$TEMP")" -gt 12000
grep -Fq '<title>MEDCOEL — Clinical Learning Research Preview</title>' "$TEMP"
grep -Fq 'PRIVATE QC' "$TEMP"
# No third-party model, preview image, hosted script, or clinical data content.
if grep -Eiq '(<img|<iframe|<script[^>]+src=|<link[^>]+href=|<video|<audio|/bp3d/|/models/|/data/atlas/)' "$TEMP"; then
  echo "Unexpected external asset or model dependency; publication blocked"
  exit 1
fi

NAME=medcoel-research-preview.html
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_DIR=/var/lib/medcoel/release-backups/research-preview
sudo install -d -m 0750 "$BACKUP_DIR"
if test -e "$DOCROOT/$NAME"; then
  sudo cp -p "$DOCROOT/$NAME" "$BACKUP_DIR/$NAME.before-$STAMP"
fi
sudo install -m 0644 "$TEMP" "$DOCROOT/.$NAME.pending-$$"
sudo mv -f "$DOCROOT/.$NAME.pending-$$" "$DOCROOT/$NAME"
sudo cmp -s "$TEMP" "$DOCROOT/$NAME" || {
  echo "Final file bytes mismatch"; exit 1
}
echo "PUBLISHED SHOWCASE: https://medcoel.com/$NAME"
echo "Never changed: 702 BodyParts3D models, Anatomy Atlas, 4D Lab, Caddy or PocketBase."
