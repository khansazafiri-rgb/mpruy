#!/usr/bin/env bash
# Mengunduh binary PocketBase ke apps/pocketbase/pocketbase.
# Versinya diambil dari apps/pocketbase/.pocketbase-version (samakan dengan
# server produksi). PB_VERSION=x.y.z boleh dipakai untuk menimpanya sementara.
# Binary sengaja tidak dicommit (sekitar 30 MB dan berbeda per sistem operasi).
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${PB_VERSION:-$(tr -d '[:space:]' < "$DIR/.pocketbase-version")}"
if [ -x "$DIR/pocketbase" ] && "$DIR/pocketbase" --version | grep -qx "pocketbase version $VERSION"; then
  echo "PocketBase $VERSION sudah ada."; exit 0
fi
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "$(uname -m)" in
  x86_64|amd64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) echo "Arsitektur $(uname -m) belum didukung script ini."; exit 1 ;;
esac
NAME="pocketbase_${VERSION}_${OS}_${ARCH}.zip"
BASE="https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
echo "Mengunduh $BASE/$NAME"
curl -fsSL "$BASE/$NAME" -o "$TMP/$NAME"
curl -fsSL "$BASE/checksums.txt" -o "$TMP/checksums.txt"
# Tolak file yang checksum-nya tidak cocok dengan daftar resmi rilis.
if command -v sha256sum >/dev/null 2>&1; then SHA="sha256sum"; else SHA="shasum -a 256"; fi  # macOS: shasum
( cd "$TMP" && grep " $NAME\$" checksums.txt | $SHA -c - ) || { echo "Checksum $NAME tidak cocok. Dibatalkan."; exit 1; }
unzip -o -q "$TMP/$NAME" pocketbase -d "$DIR"
chmod +x "$DIR/pocketbase"
"$DIR/pocketbase" --version
