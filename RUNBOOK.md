# RUNBOOK

How to check a change without paying for a full end-to-end browser run every
time. Two different tools for two different kinds of change — use the
cheaper one whenever it can answer the question.

## State / game-logic / economy questions → `tools/debug-run.ts`

Fast-forwards the pure engine (`src/engine/state/run.ts` + `round.ts`, via
the facade) straight to a chosen point — e.g. "what's in the shop after
fight 3 on seed X with 500 starting ink" — with no dev server, no DOM, no
browser. Runs in well under a second. Use this for anything about ink,
items, targets, shop rolls, tier levels, marks, letter unlocks — any
question the pure engine alone can answer.

```bash
bun run debug:shop -- --seed=abc123 --ink=500        # first shop, seed abc123, 500 starting ink
bun run debug:run  -- --seed=abc123 --fights=3       # jump to the shop after the 3rd win
bun run debug:run  -- --seed=abc123 --fights=3 --items=fermata,long_form --bag=strong --json
```

Flags: `--seed`, `--ink` (starting ink, i.e. `tune.START_INK`), `--fights`
(stop at the Nth shop reached — each earlier shop is auto-left with nothing
bought), `--items` (comma-separated starting item ids), `--bag`
(`weak`/`normal`/`strong`), `--json` (machine-readable report instead of the
one-line summary).

It auto-plays every fight along the way with `bestFromRack` (the same
subset word-search the shop's off-by-default word helper uses) picking the
best-scoring word each turn, auto-dismisses letter choices and tile/mark
packs (keeps nothing) so it doesn't stall on a decision, and stops as soon
as `run.shop` is truthy for the Nth time. It prints ink, movement/stage,
held items, and the shop's cards/packs.

**What it can't do:** there is no DOM here, so it is no help at all for
CSS/layout/visual bugs (tooltip clipping, overlap, responsive breakage) —
those still need the real app in a real browser, below. It also only
proves the _pure engine_ transitions correctly; it says nothing about
whether `useFight.ts`/`FightScreen.tsx` wire that engine state to the
screen correctly.

### How it works, if you're extending it

- `createRunFacadeFromOpts` builds a `RunFacade` the same way
  `useFight.ts`'s `start()` does, minus audio/character/crescendo wiring.
- Two legacy globals the engine still reads off `window` have to be primed
  by hand before anything else loads, since this runs in Node with no DOM:
  `js/wordbound/wordlist.js` (populates `window.Wordbound.WORDLIST`) and
  `src/engine/lexicon.ts` (populates `window.Wordbound.Lexicon`). Import
  them for their side effects, in that order, before touching the engine.
- Run it with `vite-node`, not plain `node`/`tsx` — the engine reads
  `import.meta.env.DEV` (`src/engine/state/run.ts`'s `FORCE_WIN_TARGET`
  cheat check), which only exists under Vite's actual transform pipeline.
  Plain esbuild-based runners (`tsx`) leave `import.meta.env` undefined and
  throw.
- `findWords` (anagram-of-everything) is the wrong search for "what can I
  play from this rack" — it requires every given letter used at once.
  `bestFromRack` (subset search) is the one that answers "what's the best
  word I can make," which is what actually clears a round.

## CSS / layout / visual questions → the real app in a browser

Anything about how something looks or is positioned — clipping, overlap,
responsive breakage, animation — needs the actual rendered DOM. The `run`
skill covers spinning up the dev server and driving a headless Chromium
against it (never Jaxon's Firefox — see CLAUDE.md). `@playwright/test` is
already a devDependency; grab a real Chromium with
`npx playwright install chromium` once per environment if it isn't cached.

This is slower and, if you're clicking through actual game turns to reach
a screen (e.g. "open the shop to check a tooltip"), can be flaky — word
tiles and RNG-shaped screens (packs, letter choices) vary by seed and by
what the previous fight happened to draw. Prefer `debug-run.ts` to answer
any state question first; fall back to the browser only for what it can't
see.
