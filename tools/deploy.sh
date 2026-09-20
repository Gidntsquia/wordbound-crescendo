#!/usr/bin/env bash
# Builds the app and publishes dist/ as the root of the gh-pages branch
# (orphan commit, force-push). Live link: https://gidntsquia.github.io/wordbound-crescendo/
set -euo pipefail
cd "$(dirname "$0")/.."
bun run build >/dev/null 2>&1 || { bun run build 2>&1 | tail -15; echo "deploy: build failed"; exit 1; }
src=$(git rev-parse --short HEAD)
tmp=$(mktemp -d)
cp -R dist/. "$tmp"/
touch "$tmp/.nojekyll"
git -C "$tmp" init -q -b gh-pages
git -C "$tmp" add -A
git -C "$tmp" -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" \
  commit -qm "deploy $src"
git -C "$tmp" push -qf "$(git remote get-url origin)" gh-pages:gh-pages
rm -rf "$tmp"
echo "deployed $src -> https://gidntsquia.github.io/wordbound-crescendo/"
