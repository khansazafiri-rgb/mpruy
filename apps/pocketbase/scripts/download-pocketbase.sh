#!/usr/bin/env bash
# Mengunduh binary PocketBase versi yang dipakai MEDCOEL ke apps/pocketbase/pocketbase.
# Binary sengaja tidak dicommit (ukurannya ~30 MB dan berbeda per sistem operasi).
set -euo pipefail
VERSION="${PB_VERSION:-0.38.0}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ -x "$DIR/pocketbase" ] && "$DIR/pocketbase" --version | grep -q "$VERSION"; then
  echo "PocketBase $VERSION sudah ada."; exit 0
fi
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "$(uname -m)" in
  x86_64|amd64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) echo "Arsitektur $(uname -m) belum didukung script ini."; exit 1 ;;
esac
URL="https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/pocketbase_${VERSION}_${OS}_${ARCH}.zip"
TMP="$(mktemp -d)"
echo "Mengunduh $URL"
curl -fsSL "$URL" -o "$TMP/pb.zip"
unzip -o -q "$TMP/pb.zip" pocketbase -d "$DIR"
chmod +x "$DIR/pocketbase"
rm -rf "$TMP"
"$DIR/pocketbase" --version
