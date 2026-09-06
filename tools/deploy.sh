#!/usr/bin/env bash
# tools/deploy.sh -- the LIVE DEPLOY in one quiet call (see CLAUDE.md).
# Stages dist/site via build:site, publishes its CONTENTS as the root of an
# orphan gh-pages commit, force-pushes. Prints one line on success.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build:site >/dev/null 2>&1 || { echo "deploy: build:site failed"; npm run build:site 2>&1 | tail -15; exit 1; }
src=$(git rev-parse --short HEAD)
tmp=$(mktemp -d)
git -C "$tmp" init -q -b gh-pages
cp -R dist/site/. "$tmp"/
git -C "$tmp" add -A
git -C "$tmp" -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" \
  commit -qm "deploy $src"
git -C "$tmp" push -qf "$(git remote get-url origin)" gh-pages:gh-pages
rm -rf "$tmp"
echo "deployed $src -> https://gidntsquia.github.io/wordbound-crescendo/"
