FILE_CMD="node test/verify-<thing>.js"   # or: npx vitest run <path>
CHANGED_CMD="npm run test:react:changed"
FAST_CMD="npm run test:gates:fast"
FULL_CMD="npm run test:gates && npm run test:react"
DEFAULT_IS_FAST=1  # `npm test` here is dom-check.js, already a single narrow gate
