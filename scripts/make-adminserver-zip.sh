#!/bin/bash
# Builds the updated admin-server source zip (server + admin panel) after the
# "website management + audit clean" work. Excludes build outputs, node_modules
# and local stores — the owner rebuilds/deployes via Dockerfile / npm scripts.
set -euo pipefail

SRC="/home/z/my-project/upload/adminserver"
STAGE="$(mktemp -d)"
OUT="/home/z/my-project/download/devora-adminserver-updated.zip"

mkdir -p "$STAGE/devora-adminserver"

# Server: source + build config + migrations + scripts + docs (.env secrets EXCLUDED, .env.example kept)
rsync -a \
  --exclude 'node_modules' --exclude 'dist' --include='.env.example' --exclude='.env*' \
  "$SRC/server/" "$STAGE/devora-adminserver/server/"

# Admin: source + build config + entry (.env secrets EXCLUDED, .env.example kept)
rsync -a \
  --exclude 'node_modules' --exclude 'dist' --include='.env.example' --exclude='.env*' \
  "$SRC/admin/" "$STAGE/devora-adminserver/admin/"

# Top-level docs we wrote for the owner (if present)
for f in CHANGES.md README.md; do
  [ -f "$SRC/$f" ] && cp "$SRC/$f" "$STAGE/devora-adminserver/" || true
done

( cd "$STAGE" && zip -qr "$OUT" devora-adminserver )

# Safety scan: never leak node_modules, build outputs, stores or real .env files
# (.env.example is the intentional placeholder template and must be present).
echo "--- safety scan ---"
# One listing; grep -q + pipefail + SIGPIPE would otherwise misreport, so we grep a variable.
ZIP_LIST=$(unzip -l "$OUT")
echo "DEBUG: env entries in zip: $(printf '%s\n' "$ZIP_LIST" | grep -c 'env.example' || true)"
LEAKS=$(printf '%s\n' "$ZIP_LIST" | grep -E "node_modules/|/dist/|custom\.db" || true; printf '%s\n' "$ZIP_LIST" | grep -E "[.]env([.]|$)" | grep -v '[.]env[.]example' || true)
if [ -n "$LEAKS" ]; then
  echo "$LEAKS"
  echo "LEAK DETECTED — aborting"; rm -f "$OUT"; exit 1
fi
if ! printf '%s\n' "$ZIP_LIST" | grep '[.]env[.]example' >/dev/null; then
  echo "MISSING .env.example — aborting"; rm -f "$OUT"; exit 1
fi
echo "scan clean"

FILES=$(unzip -l "$OUT" | tail -1 | awk '{print $2}')
SIZE=$(du -h "$OUT" | cut -f1)
echo "OK: $OUT ($SIZE, $FILES files)"
rm -rf "$STAGE"
