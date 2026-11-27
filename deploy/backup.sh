#!/usr/bin/env bash
# Cron-compatible entry point. Requires Python 3 and its SQLite backup API.
# REMOTE='' explicitly selects local-only backup and restore verification.
set -euo pipefail
exec python3 "$(cd -- "$(dirname -- "$0")" && pwd)/backup.py"
