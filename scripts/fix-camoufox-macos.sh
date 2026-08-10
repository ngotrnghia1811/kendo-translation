#!/usr/bin/env bash
#
# scripts/fix-camoufox-macos.sh
#
# Workaround for an upstream bug in camoufox (npm package, confirmed on
# v0.1.19 as of 2026-08-10) on macOS: its `loadProperties()` function looks
# for `properties.json` next to the resolved launch executable, i.e. inside
#   <install-dir>/Camoufox.app/Contents/MacOS/
# but the file actually ships inside
#   <install-dir>/Camoufox.app/Contents/Resources/
#
# Without this fix, ANY Camoufox() launch on macOS throws:
#   Error: ENOENT: no such file or directory, open
#     '.../Camoufox.app/Contents/MacOS/properties.json'
#
# This script creates a symlink so the file is discoverable from both
# locations. It is idempotent and safe to re-run any time (e.g. after
# `npx camoufox fetch` re-downloads/updates binaries, which will wipe any
# prior symlink since it lives inside the downloaded bundle, not the repo).
#
# Usage:
#   ./scripts/fix-camoufox-macos.sh
#
# Automatically run as part of `npm run test:install` on macOS (see
# package.json). No-op on non-macOS platforms.

set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[fix-camoufox-macos] Not on macOS, nothing to do."
  exit 0
fi

INSTALL_DIR="${CAMOUFOX_INSTALL_DIR:-$HOME/Library/Caches/camoufox}"
APP_DIR="$INSTALL_DIR/Camoufox.app/Contents"
SRC="$APP_DIR/Resources/properties.json"
DEST="$APP_DIR/MacOS/properties.json"

if [[ ! -f "$SRC" ]]; then
  echo "[fix-camoufox-macos] $SRC not found — has 'npx camoufox fetch' been run yet?"
  echo "[fix-camoufox-macos] Skipping (this is expected before first fetch; re-run after fetch)."
  exit 0
fi

if [[ -e "$DEST" || -L "$DEST" ]]; then
  # Already a valid symlink to the right place — nothing to do.
  if [[ -L "$DEST" && "$(readlink "$DEST")" == "$SRC" ]]; then
    echo "[fix-camoufox-macos] Symlink already correct at $DEST"
    exit 0
  fi
  echo "[fix-camoufox-macos] Replacing stale file/symlink at $DEST"
  rm -f "$DEST"
fi

ln -s "$SRC" "$DEST"
echo "[fix-camoufox-macos] Created symlink: $DEST -> $SRC"
