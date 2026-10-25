#!/bin/bash
# Build a clean, deploy-ready source zip of the Devora AI website.
# Excludes: secrets (.env), local test DB, build artifacts, VCS, internal agent files.
set -euo pipefail

PROJ=/home/z/my-project
STAGE="$PROJ/.zipstage"
NAME="devora-ai-website"
OUT="$PROJ/download/${NAME}.zip"

rm -rf "$STAGE"
mkdir -p "$STAGE/$NAME"

# Copy whitelist of deployable source + docs
rsync -a \
  --exclude '.env' \
  --exclude 'db/' \
  --exclude 'node_modules/' \
  --exclude '.next/' \
  --exclude '.next-isolated/' \
  --exclude '.git/' \
  --exclude '.zscripts/' \
  --exclude 'skills/' \
  --exclude 'examples/' \
  --exclude 'mini-services/' \
  --exclude 'tool-results/' \
  --exclude 'upload/' \
  --exclude 'download/' \
  --exclude 'tests/' \
  --exclude 'Caddyfile' \
  --exclude 'dev.log' \
  --exclude 'tsconfig.tsbuildinfo' \
  --exclude 'worklog.md' \
  --exclude '.zipstage/' \
  "$PROJ/" "$STAGE/$NAME/"

mkdir -p "$PROJ/download"
rm -f "$OUT"
(cd "$STAGE" && zip -qr "$OUT" "$NAME")

rm -rf "$STAGE"
echo "--- ZIP CREATED: $OUT ---"
du -h "$OUT"
echo "--- CONTENTS (top level) ---"
unzip -l "$OUT" | head -40
echo "--- FILE COUNT ---"
unzip -l "$OUT" | tail -1
echo "--- SECURITY CHECK: no .env / custom.db / node_modules inside ---"
unzip -l "$OUT" | grep -E '\.env$|custom\.db|node_modules|\.git/' && echo "!!! LEAK FOUND !!!" || echo "CLEAN: no secrets or artifacts inside"
