# Progress log — Wordbound: Crescendo

Append-only. One entry per run: what was done, current state, what's next, what was
actually verified vs. not. Never edit past entries. Real timestamps only
(`date -u +%Y-%m-%dT%H:%MZ`); trust `git log` over self-reported times.

## 2026-08-21T07:30Z — repo created (orchestrator)

Seeded as a full working-tree copy of sibling repo descent-of-essence at its v0.42
state (Wordbound engine: ink system, branching-map work in flight there, woodcut CSS,
audio module with the AudioContext-resume fix, full test harness). GOALS.md holds the
complete ticket arc for the words-vs-music concept; ROADMAP.md the milestones;
standing decisions (synthesized PD music only, woodcut default, naming) are in
GOALS.md's header. Nothing pruned yet — the first ticket is the prune. Next run:
start the SCAFFOLD/PRUNE ticket.

## 2026-08-21T07:35Z — SCAFFOLD/PRUNE complete (orchestrator)

**What was done:** completed GOALS.md's first ticket. Before touching anything,
grepped the whole repo (test/, tools/, js/wordbound/) for references to the Descent
of Essence game's files — confirmed zero test or tool file depends on index.html,
css/style.css, js/core/constants.js, js/core/utils.js, js/data/*, js/systems/*,
js/ui/*, js/game.js, or js/main.js. test/dom-check.js already defaults to
wordbound.html only (its optional CLI arg for index.html is for the itch-build
staging check, which itself renames a copy of wordbound.html to index.html — not the
real Descent index.html). So:
1. Deleted the 21 Descent-only files listed above via `git rm` (index.html,
   css/style.css, js/core/{constants,utils}.js, all of js/data/, js/systems/,
   js/ui/, js/game.js, js/main.js).
2. Trimmed js/core/namespace.js: it stubbed out window.Game.{Constants, Utils,
   Data, Systems, UI, State} for the now-deleted Descent modules; nothing under
   window.Wordbound or in test/tools ever read those keys (grepped to confirm), so
   cut it down to just `window.Game = { RNG: {} }`, which is the one thing
   js/core/rng.js and the Wordbound engine actually use.
3. Renamed wordbound.html's displayed branding: `<title>`, the main-menu `<h1>`
   ("WORDBOUND" → "WORDBOUND: CRESCENDO"), and version-info ("v0.42" → "v0.1"). Left
   the tagline/menu-goal flavor text (Loose Words, the Stacks) alone — that's
   THEME.md-driven lore and the theme-bible ticket owns replacing it, per GOALS.md's
   explicit note.
4. Rewrote README.md: one paragraph on the words-vs-music concept + crescendo/parry
   mechanic, states it's engine-forked from descent-of-essence (with no compat
   obligation), quickstart (open wordbound.html / local server), test commands, a
   trimmed project-layout tree (dropped the Descent-era file list), and a shorter
   license section. Removed the sibling's own itch.io play link, feature list, and
   full how-to-play (not accurate to Crescendo's still-unbuilt mechanics; the theme
   and later tickets will re-add game-accurate copy).
5. Updated package.json: renamed the npm package "wordbound" → "wordbound-crescendo"
   and rewrote its description off the Descent/Wordbound wording. package-lock.json
   picked up the matching name automatically via the ensure-deps installs run during
   verification (not hand-edited).
6. tools/build-itch.js needed NO changes — it already staged Wordbound's exact
   dependency list independent of the real index.html (comment in the file already
   explained this: it copies wordbound.html to a staging index.html itself, it
   never touches the repo's own index.html). Sanity-checked it still works as-is.

**Verified (all green, this run, on the pruned tree):**
- `npm test` (test/dom-check.js, jsdom): ALL CHECKS PASSED, full suite, zero
  console errors.
- `npm run test:qa` (test/orchestrator-qa-boss-reward.js, real Playwright/Chromium):
  ALL CHECKS PASSED — real clicks through character select, a full boss fight with
  its reward flow, at both 375px and full-size viewports, zero page errors. This is
  the "game boots and plays a fight in a real browser" bar from the ticket.
- `npm run test:mobile` (real Playwright): ALL CHECKS PASSED at 375px/414px across
  main menu, combat, tile-reward, and game-over screens, plus touch-mode input.
- `npm run build:itch` + `npm run test:itch-build`: zip built (1.44 MB), the
  unzipped index.html passes the full 16/16 dom-check suite and loads with zero
  404s/errors in a real browser.

**Not verified / not applicable:** no audio-specific check was re-run here (nothing
audio-related changed this ticket; `npm run test:audio` exists and was not touched).
No human playtest of the renamed title — it's a two-string text change, low risk,
but "does it read right" is Jaxon's call same as any copy.

**Current state:** repo is now Crescendo's own — no Descent of Essence code remains,
`npm test`/`test:qa`/`test:mobile`/build:itch all clean on the pruned tree,
wordbound.html displays as "Wordbound: Crescendo" v0.1. THEME.md is untouched
(still the sibling's library lore, as GOALS.md instructed — next ticket replaces
it).

**Next:** THEME BIBLE ticket — replace THEME.md with the Crescendo world bible
(faction name, player role, 3 vetted famous-piece bosses, 6-10 vetted lesser-known
regulars, PD vetting notes, a display-name proposal for Jaxon).
