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

## 2026-08-21T08:49Z — THEME BIBLE complete (orchestrator)

**What was done:** completed GOALS.md's THEME BIBLE ticket, rewriting THEME.md as
the Crescendo world bible (design doc only — no code touched).

- **Premise:** player is a Junior Lyricist at the Concert Eternal (a concert hall
  vast enough to stage every piece ever written, mirroring the sibling's Boundless
  Archive naming pattern); the antagonist faction is the Fermata, who staged a coup
  and stole the alphabet so music alone would fill the world. Tone note up top:
  operatic melodrama played mostly straight, explicitly contrasted with the
  sibling's whimsical library-pun tone so future sessions don't default to the
  wrong voice.
- **Duel-gauge naming** (per the header's amended combat model): the gauge itself
  is named **the Volume** (loudness dial / book pun); health blocks are named
  **Verses** (song unit and poetry unit at once). Both are flagged as proposals
  for Jaxon per the standing rule, with the alternates I considered and rejected
  noted so the reasoning isn't lost.
- **3 floor bosses + 1 final boss**, each with a name, personality tied directly to
  their piece's actual dynamics (not generic flavor), and a proposed hostage
  letter: The Mountain King (Grieg, accelerando as the mechanic-teaching first
  boss), Death the Fiddler (Saint-Saëns' Danse Macabre, lull-then-sting structure),
  the Valkyrie Marshal (Wagner, continuous late-tier pressure), and the Maestro
  (Beethoven's 5th — ties the boss's "Fate knocking" personality straight to the
  symphony's own historical nickname for its opening motif; four movements =
  four proposed fight phases, per the header's final-boss note).
- **9 regulars, 3 per tier** (early/mid/late), each a lesser-known piece with a
  one-line gimmick tied to its real musical structure (e.g. the Metronome/Czerny
  for the "metronome-creature" GOALS.md suggested, the Organist/Bach Toccata &
  Fugue for late-tier's biggest single spikes).
- **PD vetting table** covering all 9 GOALS.md-suggested famous-piece candidates
  (not just the 3 used) — composer death year and years-since for each, so the
  3 unused ones (Queen of the Night, Moonlight 3rd mvt, Vivaldi Summer/Winter) are
  pre-vetted and ready for milestone-2 roster expansion instead of needing
  re-vetting later. Noted the Toccata & Fugue's disputed-authorship trivia
  explicitly since it doesn't change the PD verdict either way.
- **Display name:** proposed keeping "Wordbound: Crescendo" (mechanic is in the
  title, keeps the sibling-branding pattern), listed 3 alternatives considered and
  set aside with reasons, flagged for Jaxon per the standing rule — did NOT touch
  wordbound.html's branding, that's Jaxon's call same as the SCAFFOLD ticket left
  it.
- **Stolen letters:** added a proposal section (not this ticket's job, but useful
  for the next meta-progression ticket) noting the four hostage letters (K, V, X,
  Z) all fall inside GOALS.md's own suggested starting-stolen set (J K Q V X Z),
  which reads well thematically — flagged explicitly as the meta-progression
  ticket's decision to accept or override.
- **Concert Eternal floor map:** proposed names for the existing 3-floor structure
  (Open Rehearsal / Recital Hall / Grand Stage / the Podium for the final boss),
  explicitly noted as a proposal for whichever ticket wires floors to bosses, not
  a requirement of this one — `js/wordbound/floor.js`'s `TOTAL_FLOORS = 3` was not
  touched.

**Verified:** `npm test` (jsdom dom-check) still ALL CHECKS PASSED after the edit
— expected, since this ticket only touched THEME.md, no game code or DOM. Per the
ticket's own VERIFY line ("n/a, design doc — but keep it consistent with what the
engine can do"): cross-checked every naming/mechanic reference in the new THEME.md
against what GOALS.md's header decisions and the existing engine (floor.js's
3-floor structure) actually support — no invented mechanics beyond what's already
decided or already-ticketed.

**Not verified / not applicable:** nothing here is code, so `test:mobile`/`test:qa`
don't apply and weren't run. All naming proposals (display name, Volume, Verses,
hostage letters) are explicitly flagged for Jaxon per GOALS.md's guardrail on
naming/feel calls — none of them are final.

**Current state:** THEME.md fully replaced, GOALS.md's THEME BIBLE box checked.
Full roster (3 floor bosses + 1 final boss + 9 regulars, all PD-vetted) plus core
naming (Volume, Verses, Concert Eternal, the Fermata, Junior Lyricist) exists for
future tickets to consume. `npm test` clean.

**Next:** STRUCTURAL ticket — migrate to React + Vite, per the header FRAMEWORK
decision. This is explicitly sequenced before the music engine and duel-UI work so
those get built React-native. Multi-run ticket; expect this to span several
sessions. Read the ticket's 5 sub-steps in GOALS.md closely before starting,
especially the requirement to update GOALS.md's MANDATORY VERIFICATION header in
the same commit that changes what `npm test` means (Vitest/RTL replacing the
jsdom dom-check harness) — future runs depend on that header staying accurate.

## 2026-08-21T09:49Z — STRUCTURAL 1/5: Vite + React scaffold (orchestrator)

**What was done:** started the multi-run STRUCTURAL ticket (React + Vite migration,
GOALS.md header FRAMEWORK decision). This run is scoped to sub-step 1 only
("scaffold Vite + React in this repo") — no screen porting yet, box stays
unchecked.

- Housekeeping first: local `main` was 3 commits behind `origin/main` (session
  started with HEAD detached at the stale tip). Fast-forwarded to origin/main
  before doing anything — no data was lost, just a stale local ref.
- Added `vite`, `@vitejs/plugin-react` (devDependencies) and `react`, `react-dom`
  (real dependencies, since they ship in the built bundle).
- `vite.config.mjs` (`.mjs` extension, not `.js`, so Vite's native ESM config
  loader is happy without setting `"type": "module"` in package.json — that
  would have broken every existing CommonJS `require()`-based test/tool script,
  so deliberately avoided). `base: './'` for portable static hosting (itch zip
  or a GitHub Pages subpath, deploy itself still deferred per the ticket).
  `build.outDir: 'dist/app'` — NOT bare `dist/`, because `tools/build-itch.js`
  already writes `dist/wordbound-itch.zip` and Vite's default `emptyOutDir`
  would silently wipe it on the next `vite build`. Verified both builds now
  coexist in `dist/` without collision.
- Root `index.html` (Vite's entry-point convention) + `src/main.jsx` +
  `src/App.jsx`. `App.jsx` is an explicit, honestly-labeled placeholder (not a
  fake screen) stating the React port is in progress and that `wordbound.html`
  is still the playable game meanwhile — screens get ported in one at a time
  in follow-up runs per the ticket's own "port screen by screen, keep commits
  working" instruction.
- `npm run dev` / `build` / `preview` scripts added. `wordbound.html`, `css/`,
  `js/wordbound/*`, `js/core/*`, and `test/*` are completely untouched this run.

**Verified:**
- `npm run build`: clean, no warnings, `dist/app/index.html` + hashed JS bundle
  produced.
- Real-browser check (Playwright, chromium via `/opt/pw-browsers/chromium`):
  served the built output with `npm run preview`, loaded it in a real page,
  confirmed the React root actually rendered ("Wordbound: Crescendo" text
  present) with ZERO console/page errors. Deleted the throwaway script after.
- `npm test` (jsdom dom-check, 100+ assertions): ALL CHECKS PASSED, unaffected
  by the scaffold — expected, since no game file changed.
- `npm run test:qa` (Playwright, boss-reward flow + 375px viewport): ALL CHECKS
  PASSED, zero console/page errors.
- `npm run test:mobile` (Playwright, 375/414px + touch-mode input): all layouts
  OK, touch-mode OK.
- `npm run build:itch` + `npm run test:itch-build`: itch zip still builds
  (1.44 MB), still passes the full 16/16 dom-check suite unzipped + loads with
  zero 404s in a real browser — confirmed this AFTER adding the outDir fix, so
  the collision I found never actually shipped.

**Not verified / not applicable:** no React component has real game behavior
yet, so there's nothing gameplay-shaped to Playwright-test on the React side
beyond "did it render and stay error-free," which is what was checked. GOALS.md's
MANDATORY VERIFICATION header is intentionally NOT updated yet — the ticket says
to update it "in the same commit that changes what `npm test` means," and
`npm test` still means the same jsdom dom-check it always has; that header edit
lands with the Vitest/RTL migration (ticket sub-step 3), not this one.

**Current state:** repo now has two coexisting toolchains: the untouched
vanilla `wordbound.html` (still the actual playable game, still what `npm test`
covers) and a fresh Vite+React scaffold (`index.html` at root, `src/`) that
boots but has no real screens yet. `dist/` stays gitignored as before. All
pre-existing gates green.

**Next:** continue the STRUCTURAL ticket's sub-step 1/2 — port the first real
screen (main menu is the simplest: static content, one seeded-run and one
how-to-play button, no combat state) into a React component that reads from
`window.Wordbound` data modules, proving the "game logic stays framework-
agnostic plain JS, import it from React" pattern before tackling anything
stateful like the combat screen. That'll likely require converting at least
the specific modules the main menu touches (achievements display, character
data if the button leads there) toward an ES-module-friendly shape without
breaking the global-namespace pattern `wordbound.html`'s script tags still
depend on — worth thinking through carefully rather than rushing, since a
half-converted module could break the still-live vanilla game. After the
main-menu proof of concept, continue screen by screen per the ticket order;
Vitest/RTL test migration (sub-step 3) can start once there's real component
behavior worth testing.

## 2026-08-21T10:49Z — STRUCTURAL 2/5: main menu + how-to-play ported to React (orchestrator)

**Housekeeping first:** session started with local `main` detached at HEAD
(5 commits ahead of the local `main` ref but matching `origin/main`, which
was already at 114bf57 — the detached state was a purely local artifact from
how the previous session's environment was torn down, no data was at risk).
Fast-forwarded local `main` to match; `git push` correctly reported
"Everything up-to-date". No repo damage, just confirming for the record since
a detached HEAD is exactly the kind of thing worth double-checking before
doing anything else.

**What was done:** continued the multi-run STRUCTURAL ticket (React + Vite
migration) per the previous run's "Next" note — ported the first two real
screens instead of just the scaffold:
- `src/components/MainMenu.jsx`: React port of `#screen-main-menu` (title,
  version, tagline, goal text, New Run / How to Play buttons, achievements
  progress line). Achievement data comes from the EXISTING
  `js/wordbound/achievements.js` — imported once in `src/main.jsx` as a
  side-effecting import (it's a self-contained IIFE with no dependency on
  the rest of the engine, still attaching to `window.Wordbound.Achievements`
  exactly as it does for `wordbound.html`) and read directly by the
  component. Nothing in achievements.js was touched or rewritten — this is
  the concrete first proof of GOALS.md's "game logic stays framework-
  agnostic plain JS, import it from React" instruction.
- `src/components/HowToPlayOverlay.jsx`: React port of `#howto-overlay`,
  desktop-copy only. The vanilla version swaps in touch-mode wording and an
  iOS ringer-switch tip via pointer-coarse media-query detection; that
  input-mode logic lives with the combat screen's touch handling (a later
  sub-step) and was NOT ported here — said so directly in the component's
  comment rather than faking touch copy with no way to actually detect
  touch yet.
- `src/components/CharacterSelectPlaceholder.jsx` + `src/App.jsx` (now holds
  `screen`/`howToPlayOpen` state instead of being a static placeholder):
  "New Run" needed to lead somewhere, and character select isn't ported yet
  (that's the natural next sub-step). Rather than a dead click or a faked
  screen, it's an honestly-labeled placeholder panel pointing at
  `wordbound.html` for an actual playable run, with a working Back button.
  This keeps every commit "working" per the ticket's own instruction without
  jumping ahead to build character select before its turn.
- Wired `css/wordbound.css` into `src/main.jsx` (global import) instead of
  writing new CSS — the existing class names (`.main-menu-panel`,
  `.game-title`, `.btn`, `.btn-primary`/`.btn-secondary`,
  `.character-select-panel`, `.howto-overlay`, etc.) already do exactly what
  the ported markup needs, and reusing them is also what keeps Crescendo's
  React screens visually identical to the sibling's ink-woodcut style
  without any extra design work.
- Deliberately did NOT port the `#dictionary-loading-indicator`: the
  wordlist-loading logic it reflects isn't wired into the React tree yet
  (that's a `js/wordbound/wordlist.js` concern, not touched this run), and a
  perpetually-visible "Loading dictionary..." with nothing to ever hide it
  would be worse than honestly leaving it out. Also skipped the decorative
  `#wb-ambient-bg` backdrop to keep this run's diff scoped to the two actual
  screens; it's cheap to add back in a later pass.

**Verified:**
- `npm run build`: clean (20 modules, no warnings).
- Real-browser check (Playwright, `/opt/pw-browsers/chromium`, served build
  via `npm run preview`): title/version/tagline render correctly;
  achievements line reads "Achievements unlocked: 0 / 5" (correct — fresh
  localStorage); How to Play opens the overlay and Got It closes it
  (`.hidden` class toggles correctly); New Run navigates to the character-
  select placeholder and Back to Menu returns; ZERO console/page errors
  across the whole click-through. Throwaway script deleted after.
- `npm test` (jsdom dom-check, 100+ assertions): ALL CHECKS PASSED —
  unaffected, since `wordbound.html`/`js/wordbound/*` weren't touched.
- `npm run test:mobile`: all layouts OK (375/414px), touch-mode input OK.
- `npm run test:qa`: ALL CHECKS PASSED, zero console/page errors.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED
  (16/16 dom-check against the unzipped build, zero 404s in a real browser).
  Note: hit one flaky failure on a `test:itch-build` run where a leftover
  `vite preview` process was still holding a port from my own manual
  Playwright check moments earlier — killed it and re-ran clean twice in a
  row after; confirmed via `git stash` that the baseline (pre-this-run) also
  passes cleanly, so this was a local port-contention flake in my own
  session, not a regression from this run's changes.

**Not verified / not applicable:** no Vitest/RTL migration yet (ticket
sub-step 3 — still deferred, so GOALS.md's MANDATORY VERIFICATION header is
correctly still untouched); no component-level unit tests added for
MainMenu/HowToPlayOverlay since that test harness doesn't exist yet — full
real-browser click-through is what's covering them for now, same as the
scaffold run.

**Current state:** two toolchains still coexist. `wordbound.html` is
untouched and remains the actual playable game. The Vite+React app (root
`index.html` → `src/`) now has two real, tested screens (main menu,
how-to-play) plus an honest placeholder for character select; `npm test`
and friends are all green. `dist/` still gitignored, itch build unaffected.

**Next:** continue the STRUCTURAL ticket — port character select for real
next (replace `CharacterSelectPlaceholder.jsx`), which will need
`js/wordbound/characters.js` pulled in the same side-effect-import way
achievements.js was this run, plus the seed-input field and a real "start
run" action. That's naturally the next screen in `wordbound.html`'s own
flow. After that, the run screen (combat/map/panels) is the big one — it's
where `game.js`'s ~3400 lines of intertwined state and DOM manipulation
live, and it'll likely need its own state-shape design pass (what becomes
React state vs. what stays a plain-JS module function) before porting
starts, worth thinking through up front rather than mid-port. Vitest/RTL
test migration (sub-step 3) can reasonably start once there's real
stateful behavior worth testing — the character-select run-start flow is
probably the first candidate.

## 2026-08-21T11:47Z — STRUCTURAL 3/5: character select ported to React (orchestrator)

**Housekeeping first:** session started with local `main` detached (HEAD
matched the tip of the previous run's push, but the local `main` ref was 7
commits behind `origin/main`). Same benign pattern as the last two runs —
purely a local artifact of how the environment container was recreated, no
data at risk. `git checkout main && git merge --ff-only` fast-forwarded the
ref to match; nothing was rewritten or lost.

**What was done:** continued the STRUCTURAL ticket (React + Vite migration)
per the previous run's "Next" note — ported the real character-select
screen:
- `src/components/CharacterSelect.jsx`: React port of
  `#screen-character-select` (title, seed input, character cards, Back to
  Menu). Character roster comes from the EXISTING `js/wordbound/characters.js`
  — a self-contained IIFE with zero engine dependencies, imported once in
  `src/main.jsx` as a side effect (same pattern as `achievements.js` last
  run) and read directly via `window.Wordbound.Characters`. Cards are real
  buttons (`role="button"`, `tabIndex`, Enter/Space handling) instead of the
  vanilla version's plain click-only `<div>`, since React gave a natural
  chance to make them keyboard-accessible for free — the only behavior not
  a strict 1:1 port, and a strict improvement.
- `src/components/RunPlaceholder.jsx` (replaces
  `CharacterSelectPlaceholder.jsx`, deleted): picking a character can't
  start a real run yet — `Game.startRun` in `js/wordbound/game.js` drives
  the run/combat/map screen, which is `game.js`'s ~3400-line state machine
  and is NOT ported (that's the next, much bigger STRUCTURAL sub-step, not
  this one). Rather than a dead click or a faked run, `App.jsx` now routes
  to an honestly-labeled placeholder that echoes back the picked character's
  name and the trimmed seed, proving the selection was actually read, and
  points at `wordbound.html` for an actual playable run — same "keep every
  commit working, don't jump ahead" approach as the main-menu run's
  character-select placeholder.
- `src/App.jsx`: added `pendingRun` state (`{ characterName, seed }`) and a
  `run-placeholder` screen, wired `CharacterSelect`'s `onSelect` to resolve
  the character name via `Characters.getCharacter` before handing off.
- `src/main.jsx`: added the `characters.js` side-effect import alongside
  the existing `achievements.js` one.
- Reused existing CSS classes (`.character-select-panel`,
  `.seed-input-row`, `.character-choices`, `.character-option`,
  `.character-name`, `.character-description`) — no new styling needed, same
  visual-parity approach as the main-menu port.

**Verified:**
- `npm run build`: clean (22 modules, no warnings). Had to `npm install`
  first — the session's `node_modules` wasn't present at start (fresh
  container), installed clean with 0 vulnerabilities.
- Real-browser check (Playwright, `/opt/pw-browsers/chromium`, served build
  via `npm run preview`): New Run → character-select renders exactly 3 cards
  with the correct names (Archivist, Scribe, Keeper); typed a seed, clicked
  the Scribe card → landed on the run placeholder with "The Scribe" as the
  heading and the typed seed echoed in the body text; Back to Menu from both
  the placeholder and character-select itself correctly returns to the main
  menu; ZERO console/page errors across the whole click-through. Throwaway
  script deleted after.
- `npm test` (jsdom dom-check, 100+ assertions): ALL CHECKS PASSED —
  unaffected, `wordbound.html`/`js/wordbound/*` weren't touched (only a new
  side-effect import of an already-untouched module).
- `npm run test:mobile`: all layouts OK (375/414px), touch-mode input OK.
- `npm run test:qa`: ALL CHECKS PASSED, zero console/page errors.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED
  (16/16 dom-check against the unzipped build, zero 404s, `window.Wordbound.
  Game` present in a real browser).

**Not verified / not applicable:** no Vitest/RTL migration yet (ticket
sub-step 3, still correctly deferred — GOALS.md's MANDATORY VERIFICATION
header stays untouched until that lands); no component-level unit tests for
`CharacterSelect`/`RunPlaceholder` since that harness doesn't exist yet —
full real-browser click-through covers them for now, same as the previous
two screens.

**Current state:** three real screens now port complete (main menu,
how-to-play, character select) plus an honest run-screen placeholder that
carries the player's actual pick through; `wordbound.html` remains untouched
and is still the actual playable game; `npm test` and friends all green.

**Next:** the run screen (combat/map/panels) is the ticket's big remaining
piece — `game.js`'s ~3400 lines of intertwined state (RNG, floor generation,
combat resolution, item hooks, achievements tracking, DOM rendering all
interleaved) backing `#screen-run`. Per the previous run's note, this
deserves a state-shape design pass BEFORE porting starts: what becomes React
`useState`/`useReducer` state vs. what stays a plain-JS module function
Game.* calls into. Given the size, it's worth landing incrementally — e.g.
first get `Game.startRun` wired to real state without any UI (prove the
plain-JS/React boundary holds for the stateful case), then the map, then
combat panel, then the reward panels — rather than one giant run. Vitest/RTL
test migration (sub-step 3) is overdue to start alongside this, since the
run screen is exactly the kind of stateful behavior worth real component
tests rather than only Playwright click-throughs.

## 2026-08-21T12:55Z — STRUCTURAL 4/5: Game.startRun wired to real React state, node map ported (orchestrator)

**Housekeeping first:** same benign pattern as every previous run — local
`main` started 9 commits behind `origin/main` (container-recreation
artifact, HEAD wasn't even detached this time, just stale). `git fetch` +
`git checkout main && git merge --ff-only origin/main` fast-forwarded
cleanly; nothing rewritten or lost.

**What was done:** continued the STRUCTURAL ticket per the previous run's
"Next" note (state wiring first, then the map, then combat panel, then
reward panels). This run did the first two:

- **The real blocker, found by reading `Game.init`/`render()` closely:**
  `Game.startRun` (and every other `Game.*` action) ends by calling the
  internal `render()`, which immediately does `$('howto-overlay')
  .classList...` — `$('howto-overlay')` is `document.getElementById`, which
  is `null` in the React tree (React renders its own `#root`, not
  wordbound.html's `#screen-*` markup), so calling `Game.startRun` from
  React would throw on the very first line of `render()`. Fixed with a
  one-line guard: `render()` now returns immediately if
  `#screen-main-menu` isn't in the DOM. Traced through every function
  `Game.startRun` and `Game.enterCurrentNode` call (newPlayer,
  createCharacterDeck, Floor.generateBranchingFloor, startBackgroundMusic,
  startCombat, rest/treasure/shop/event entry) to confirm none of them
  touch the DOM directly outside of `render()` — they don't; the *only*
  other DOM-touching code lives in post-render animation calls
  (`animateDamage`, called from `Game.submitWord`) which are NOT yet safe
  to call headlessly. That's the real reason this run stops at the map and
  doesn't attempt the combat panel: submitWord's damage-number/screen-shake
  code assumes real DOM nodes render() would have created, and none of
  that plumbing exists in the React tree yet.
- `js/wordbound/game.js`: split `Game.init` into `Game._initDependencies()`
  (just the module reference assignments: Lexicon, Floor, RNG, Characters,
  etc.) called first, then the rest (20+ `$(id).addEventListener` calls
  assuming wordbound.html's exact markup). React calls only the former.
  Added the `render()` DOM-tree guard described above. Added a defensive
  `state.combatActive = false; state.monster = null;` reset inside
  `startRun` — needed because React's run screen adds a "Back to Menu" that
  can abandon a run mid-fight (no such escape exists in the vanilla UI, so
  `startRun` never had to guard against stale mid-combat state before);
  without this a second run in the same session would render stuck on the
  "Fighting: ..." placeholder instead of a fresh map. Exposed
  `Game._availableNodeIds()` (same test-exposure pattern as the existing
  `Game._advanceFloor` etc.) so React's map reuses the exact node-traversal
  logic `renderNodeMap()` uses instead of re-deriving it.
- `src/main.jsx`: extended the side-effect import list from just
  achievements.js/characters.js to the FULL engine dependency chain, in
  wordbound.html's own `<script>` order (namespace, rng, wordlist, lexicon,
  tiles, traits, monsters, intents, combat, items, achievements,
  consumables, events, characters, floor, game), then calls
  `Game._initDependencies()` once at module load. Confirmed by grep that
  every one of those files except achievements.js (localStorage only) is
  DOM-free — game.js's own header comment ("the only Wordbound file
  allowed to touch the DOM") holds.
- `src/components/RunScreen.jsx` (replaces the old `RunPlaceholder.jsx`,
  deleted): a real run header (ink/gold/floor/seed pulled live from
  `Game._state`) and a real, clickable branching-map view, ported from
  `renderNodeMap()` — same edge-line SVG math, same `.node-pill`/
  `.branch-edge` classes, same boss/elite trait-hint labels, so it's
  visually equivalent to wordbound.html's map, not a redesign. Clicking an
  available node calls the real `Game.enterCurrentNode`. Deliberately did
  NOT build dedicated treasure/shop/event/rest screens this run: floor.js
  always makes row 0 `'combat'`, so with no combat panel yet, nothing
  behind ANY node type is actually reachable through this screen except
  the honest "fight started, not ported yet" state — building untestable
  UI for screens nothing can currently reach would be exactly the kind of
  unverified "done" GOALS.md's verification discipline exists to prevent.
  So entering any node shows one generic, honest placeholder reflecting
  the real resulting state (monster name/HP for a fight, the raw screen
  name otherwise) with a "Back to Menu" escape.
- `src/App.jsx`: character select now calls the real `Game.startRun`
  (previously it only echoed the pick back) and routes to `RunScreen`.
- Uses a `useReducer`-based force-update (`bump()`) as the React/imperative-
  singleton bridge: `Game._state` stays the one mutable object the engine
  already mutates in place (not duplicated into React state); every action
  call re-renders by bumping a counter, then RunScreen reads `Game._state`
  fresh. Documented inline why (avoids maintaining a parallel copy of a
  3000+ line state machine's state shape).

**Verified:**
- `npm test` (jsdom dom-check, 100+ assertions incl. the full boss-skip/
  victory/audio/ink-spend/panel-stacking suites): ALL CHECKS PASSED —
  confirms the `game.js` refactor (Game.init split, render() guard,
  startRun's defensive reset, the new `Game._availableNodeIds` export) is
  behavior-preserving for wordbound.html; none of dom-check's assertions
  changed.
- `npm run test:mobile`: all layouts OK (375/414px), touch-mode input OK.
- `npm run test:qa`: ALL CHECKS PASSED (full boss-reward orchestration
  flow), zero console/page errors.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED
  (16/16 dom-check against the unzipped build, zero 404s, real-browser
  `window.Wordbound.Game` check).
- `npm run build`: clean, 36 modules. Bundle jumped to ~6.3MB (Vite's
  500kB-chunk warning fired) because `js/wordbound/wordlist.js` (a 7MB
  static dictionary array) is now part of the bundle for the first time —
  this is NOT a regression from this run (wordbound.html already ships the
  same 7MB synchronously via a plain `<script>` tag, same total bytes
  either way) and it isn't yet lazy/async in EITHER build (grepped for
  `fetch`/`import(`/`async` in wordlist.js/lexicon.js — none). GOALS.md's
  STRUCTURAL ticket already flags "the wordlist's load strategy may need a
  Vite-friendly import... keep it lazy/async" as a named concern — leaving
  that for the run that actually needs to address it (it's an existing gap
  in both builds, not something introduced here) rather than scope-creeping
  it into this one.
- Real-browser check (Playwright, `/opt/pw-browsers/chromium`, served the
  build via `vite preview`): New Run → character select (3 cards) → typed
  a seed, picked a character → landed on a REAL run screen: header showed
  live `Floor 1 / 3`, `Ink 22 / 22`, and the exact typed seed; the map
  rendered 18 real node pills (a real generated branching floor) with 3
  correctly marked available (row 0); clicked an available node → the
  fight actually started (`Game._state.combatActive === true`,
  `Game._state.monster` a real monster object) and the honest placeholder
  named the REAL monster ("Fighting: The Consonant Constrictor (56 / 56
  HP)"); clicked Back to Menu, started a SECOND run with a different
  character → confirmed the defensive reset worked: the new run showed a
  fresh 19-pill map, NOT stuck on the old "Fighting: ..." placeholder.
  ZERO console/page errors across the whole flow. Throwaway script deleted
  after.

**Not verified / not applicable:** combat panel, treasure/shop/event/rest
screens — genuinely not reachable yet (explained above), so nothing to
verify there; that's next run's actual porting work, not a gap in this
run's testing. No Vitest/RTL migration yet (ticket sub-step 3, still
correctly deferred — GOALS.md's MANDATORY VERIFICATION header stays
untouched until it lands).

**Current state:** `wordbound.html` remains untouched and is still the
actual full playable game (all gates green, zero behavior change from the
refactor). The Vite+React app now has a real menu → character-select →
run flow: `Game.startRun` executes for real with real seeded RNG and a
real generated branching floor, the map is fully real and clickable, and
entering any node triggers real engine state changes — the only thing not
yet real is what a fight/shop/treasure/event LOOKS like once you're in one
(the generic placeholder covers that honestly).

**Next:** the combat panel is the natural next STRUCTURAL sub-step, and
now unblocks everything else transitively (treasure/shop/event/rest all
sit behind clearing at least the row-0 fight). Before porting it, the
in-combat animation functions (`animateDamage`, `celebrateHit`,
`animatePlayerDamage`, the drag/touch staging handlers) need the same
"does this touch the DOM outside of render()?" audit this run did for
startRun/enterCurrentNode — `animateDamage` in particular calls
`$('monster-hp-fill')`/`$('monster-info')` directly and is NOT null-guarded
(confirmed by reading it this run), so it WILL throw if `Game.submitWord`
is called from React as-is. The likely shape: either (a) guard those
functions the same way `render()` was guarded (skip the DOM-manipulation
parts, keep the pure state-mutation), or (b) have React own the actual
tile-rack/staging/drag interactions as native React state+handlers (a
rewrite, not a port, per the previous run's note that this is "worth a
state-shape design pass") while still calling the pure `Game.submitWord`
for scoring/state. Worth deciding explicitly next run rather than
discovering it mid-port. After combat: treasure/shop/event/rest panels
(each is a small, self-contained render function — same pattern as
main-menu/character-select), then Vitest/RTL test migration (sub-step 3),
which is increasingly overdue now that there's real stateful behavior
(startRun, enterCurrentNode, the defensive reset) worth unit-testing
directly instead of only through Playwright click-throughs.

## 2026-08-21T13:55Z — STRUCTURAL (5/5-ish): combat panel React port

**What was done:** ported wordbound.html's `#combat-panel` to a real React
component (`src/components/CombatScreen.jsx`), the next STRUCTURAL
sub-step flagged by the previous run. Combat is now genuinely playable
end-to-end through the Vite/React app, not just reachable.

- Decided the "how" the previous run's note left open (option a vs b) as a
  **hybrid**, after reading the actual call graph rather than guessing:
  - Word input/scoring: **(b), React-native.** Confirmed by reading
    `combat.js`/`lexicon.js` that `Combat.playWord`/`Lexicon.formWord` match
    a submitted word against the rack **by letter**, not by pre-selected
    tile id (blanks auto-fill for any letter not otherwise in the rack) —
    so a plain typed/clicked-together word string is sufficient and needs
    no tile-staging state machine. `CombatScreen` keeps its own local
    `word` string (typed via a text input, or built by clicking rack
    tiles — each click appends that tile's letter) and calls the real
    `Game.submitWord(word)` with it — the exact function the dom-check
    suite already drives headlessly. The touch-mode drag/tap-to-play
    staging system (`selectTileForWord`/`startTouchReorder`/staging-area
    pointer-drag handlers, ~500 lines of `game.js`) is explicitly **NOT**
    ported — real drag-reordering is its own feature (pointer capture,
    ghost tiles, insertion-index math) and out of this run's bounded
    scope. Flagged as a known gap in the component's own header comment,
    not silently dropped.
  - Animation side effects: **(a), guard at the source.** Found a real bug
    while wiring this up that the previous run's audit hadn't caught yet:
    `animateDamage`/`celebrateHit`/`animatePlayerDamage` aren't only called
    from `render()` (which already had the `#screen-main-menu` DOM-tree
    guard) — `Game.submitWord` itself calls all three **unconditionally**,
    so calling the real `submitWord` from React threw
    `Cannot read properties of null (reading 'classList')` the first time
    it actually ran in a browser (caught by this run's own Playwright
    check, not by `npm test` — jsdom's dom-check suite only ever exercises
    `submitWord` against wordbound.html's real DOM, where these elements
    exist, so it had no way to catch this). Fixed by adding a shared
    `reactTreeActive()` guard (mirrors `render()`'s own
    `!document.getElementById('screen-main-menu')` check) to the top of
    all three functions in `js/wordbound/game.js` — a 16-line, purely
    additive change; wordbound.html always has that element, so this is a
    guaranteed no-op there. This is *why* CombatScreen's own animations
    (floating damage numbers, hp-flash, screen-shake, CRUSHING!/
    MAGNIFICENT! banners) are the piece explicitly NOT re-implemented in
    React this run: `Game.submitWord` resolves the counterattack inside
    its own `setTimeout` and never returns or exposes the intermediate
    `result`, so there's nothing for React to hook a one-shot animation
    off without reaching back into `game.js` internals — a real design
    question for a later pass, not an oversight. The message log and HP
    bar both update for real, so the fight is fully legible without the
    juice, just quieter.
- `src/components/CombatScreen.jsx` (new): monster name/tier glyph/HP bar/
  weakness hint/intent line/combo chip (direct reads off `state.monster`/
  `state.comboState`, same values `renderCombat()` computes, via the same
  `Traits.activeTraitForHpRatio`/`Intents.describeIntent`/
  `Intents.isSignatureIntent` calls), a clickable rack (bonus/variant/
  hexed styling ported 1:1), a live damage preview (`Combat.previewWord`,
  same logic as `updateDamagePreview()`), word input + Play/Clear buttons,
  and the overcharge/rewrite ink-spend buttons (`Game.toggleOvercharge`/
  `Game.rewriteRack` — both synchronous, no special handling needed).
  Handles `Game.submitWord`'s async counterattack resolution explicitly:
  `Combat.playWord` mutates `state.monster.hp` synchronously (confirmed by
  reading `combat.js`), so the immediate `act()` bump already shows new
  HP, but the counterattack (ink loss, next intent) resolves inside
  `submitWord`'s own `setTimeout` (220ms, +500ms more on a killing blow) —
  a second, debounced bump is scheduled past that delay so the ink/intent
  update actually reaches the screen once it lands.
- `src/components/RunScreen.jsx`: wires `CombatScreen` in for
  `state.combatActive` (replacing the generic placeholder for that one
  case — other unported screens, e.g. `TILE_REWARD`/`GAME_OVER`/`SHOP`,
  still get the honest placeholder), adds an "abandon run" escape hatch
  next to it (same `Game.returnToMainMenu` path the map screen's back
  button already used), and adds a real message-log component
  (`MessageLog`, a direct port of `renderRun()`'s log block including
  auto-scroll-to-bottom) — needed as the primary combat feedback channel
  now that the flashy per-hit animations aren't ported.

**Verified:**
- `npm test` (jsdom dom-check, full suite incl. the ink-spend/boss-skip/
  audio/panel-stacking assertions that directly exercise
  `celebrateHit`/`animateDamage` via `Game._celebrateHit` and real combat):
  ALL CHECKS PASSED both before and after the `reactTreeActive()` guard —
  confirms the guard is a true no-op against wordbound.html's real DOM
  (`#screen-main-menu` always present there), not a behavior change.
- `npm run test:mobile`: all layouts OK (375/414px) incl. combat/
  tile-reward/game-over screens and touch-mode input — wordbound.html
  only, unaffected by this run's changes, run anyway since `game.js` was
  touched.
- `npm run test:qa`: ALL CHECKS PASSED (full boss-reward orchestration,
  zero console/page errors) — same reasoning.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED
  (16/16 dom-check against the unzipped build, zero 404s, real-browser
  `window.Wordbound.Game` check).
- `npm run build`: clean, 37 modules.
- Real-browser Playwright checks against the built Vite app (`vite
  preview`), throwaway script deleted after — this is what actually
  caught the `reactTreeActive()` bug, not any of the above:
  - **Loss path** (seed `smoketest-combat-full-fight`): started a fight,
    played 6 real words through the actual UI (text input + Play Word
    click, picking from a candidate list filtered by `Combat.previewWord`
    each turn), watched HP/ink drop turn over turn including a correctly
    -detected repeat-word penalty ("The Archive has heard that one
    before.") and a weak-point multiplier hit; ink hit 0 and the game
    correctly transitioned to `GAME_OVER` (`combatActive: false`). Zero
    console/page errors.
  - **Win path** (seed `smoketest-combat-win-attempt`): same setup against
    a weaker monster, 5 words including a combo chain (log showed
    "Combo x3!"/"Combo x4!" with the right damage-bonus percentages),
    monster HP hit 0, screen correctly transitioned to `TILE_REWARD`
    (`combatActive: false`), defeat message with the real overkill-gold
    formula logged. Zero console/page errors.
  - Both runs used `Combat.previewWord` from inside the page (the same
    function the live damage-preview UI element reads) to pick a
    real-dictionary word the current rack could actually form each turn —
    not a scripted/mocked word list — so this exercised the real
    `Lexicon`/`Combat` matching path, not a stub.

**Not verified / not applicable:** the drag/tap-to-play tile-staging
system (explicitly deferred, see above — desktop typing/clicking is the
only input path ported); the per-hit animations (floating damage numbers,
hp-flash, screen-shake, CRUSHING!/MAGNIFICENT! banners — also explicitly
deferred, needs a `Game.submitWord` API change to expose its result before
it can be done cleanly); no Vitest/RTL migration yet (ticket sub-step 3,
still correctly deferred). Audio (background music/SFX during a React
fight) was not specifically checked this run — the existing
`initAudioContext`/`playCombatSound` calls inside `submitWord` are
unguarded but only touch the Web Audio API, not the DOM, so they should be
unaffected by the React tree the same way the state-mutation logic is; not
directly confirmed by ear or by inspecting `AudioContext` state this run.

**Current state:** a full fight is playable start-to-finish through the
Vite/React app — enter a combat node from the map, type or click words,
watch the monster's HP drop and your own ink drop from its counterattack,
win (→ tile reward, not yet ported, shows the honest placeholder) or lose
(→ game over, same). `wordbound.html` remains fully intact and unchanged
(all its gates still green) as the actual complete playable game in the
meantime.

**Next:** treasure/shop/tile-reward/boss-item-reward/event/rest panels are
now the only things standing between "you can fight" and "you can play a
full run" in React — each is a small, mostly self-contained render
function in `game.js` (`renderRun()`'s `treasure-panel`/`tile-reward-
panel`/`boss-reward-panel`/`event-panel`/`shredder-panel` blocks), same
shape as main-menu/character-select, and TILE_REWARD in particular is
reachable on literally every single fight (not just bosses) so it's the
highest-value one to port next — right now winning any fight in React
dead-ends at the generic placeholder. After that: the tile-staging/drag
system (deferred above) and the per-hit animations are both real, scoped
follow-up tickets in their own right, not just polish. Vitest/RTL
migration (sub-step 3) keeps getting more overdue as more real interactive
behavior (submitWord's async resolution timing, in particular) accumulates
that's currently only checked by ad-hoc Playwright throwaway scripts
instead of a committed, repeatable test.

## 2026-08-21T14:55Z — STRUCTURAL (6/N): treasure/shop/tile-reward/boss-reward panels ported to React (orchestrator)

**Repo-health fix before any feature work:** found this session's `HEAD` in a
detached state, ten commits ahead of local **and** remote `main`
(`f98ff83`..`f6b6136`, the entire STRUCTURAL 1-5 React-port sequence from
prior runs). Those commits existed only on the detached HEAD — not reachable
from any branch — meaning they were never actually pushed and were one
container reclaim away from being lost, despite PROGRESS.md and the git log
both looking complete. Confirmed it was a clean fast-forward
(`git merge-base --is-ancestor f98ff83 f6b6136` → yes), reset local `main` to
that commit (`git checkout -B main f6b6136`), and pushed — `origin/main` now
correctly carries all prior work. Root cause not investigated (likely a prior
run/container checked out a bare commit instead of `main`); flagging so a
future run watches for this — **check `git branch`/`git status` for a
detached HEAD before starting work**, not just `git log`.

**What was done:** ported the four "pick from a list" screens from
`game.js`'s `renderTreasure()`/`renderShop()`/`renderTileReward()`/
`renderBossReward()` to React, per the previous run's own "Next" note
(TILE_REWARD flagged as highest-value: reachable after literally every
fight, not just bosses').
- `src/components/RewardScreens.jsx` (new): `TreasureOrShopScreen` (handles
  both `TREASURE` and `SHOP` — same underlying panel in the vanilla markup,
  differing only in heading/options/a trailing "Leave Shop" button and the
  optional premium-tile offer row), `TileRewardScreen`, `BossRewardScreen`.
  All four call the real, synchronous `Game.*` action functions
  (`pickTreasureItem`, `buyItem`, `buyShopTile`, `leaveShop`,
  `pickTileReward`, `skipTileReward`, `pickBossItemReward`,
  `skipBossItemReward`) — confirmed by reading `game.js` that none of these
  resolve inside a `setTimeout` (unlike `submitWord`), so no async-bridging
  was needed, unlike `CombatScreen`'s counterattack handling.
- `src/components/RunScreen.jsx`: routes `state.screen === 'TREASURE' |
  'SHOP' | 'TILE_REWARD' | 'BOSS_ITEM_REWARD'` to the new components ahead
  of the generic `NodePlaceholder`, and updated its own header comment.
  `EVENT` (choices carry a live `disabledReason(state)` check — a different
  shape than a static def-id list) and `SHREDDER` (multi-select-then-confirm)
  are explicitly NOT ported this run — both still fall through to the
  placeholder.

**Verified:**
- `npm test` (jsdom dom-check, full suite): ALL CHECKS PASSED — unaffected,
  since this run only touched React components, no `game.js`/`wordbound.html`
  changes.
- `npm run build`: clean, 38 modules.
- Real-browser Playwright (`vite preview` against the built app, throwaway
  script deleted after): scripted a real player through `New Run` → combat
  (forced the monster to 1 HP before each fight to guarantee a fast,
  reliable kill — combat's own damage math/win-loss paths were already
  verified by the previous run's smoke test, so this run only needed a
  dependable way to *reach* the reward screens) → clicking real node-map
  pills and real buttons throughout. Across a few runs against random
  (unseeded) floors: confirmed **TILE_REWARD** (3 tile choices rendered,
  picking one correctly resolves back to the map, `combatActive` false),
  **TREASURE** (3 item choices, picking one advances the map), and in one
  run that happened to route through both, **SHOP** (4 item/consumable
  choices + "Leave Shop" button, correctly re-enabled/disabled by
  affordability) and **BOSS_ITEM_REWARD** (3 item choices + a working
  "Skip" button) — all reached via real node-map clicks, all resolved
  correctly, zero console/page errors in every run.
- Not itself modified, so not re-run: `test:mobile`/`test:qa`/`test:itch-
  build` (these target `wordbound.html`, which this run didn't touch).

**Not verified:** the shop's premium variant-tile offer row (`shopTileOffer`
— rolls at a fixed 40% chance, didn't come up in the runs that reached SHOP);
EVENT/SHREDDER remain unported, not attempted.

**Current state:** a full run's core loop — fight, get a tile reward,
find treasure, shop, beat a boss for an item reward — is now playable
start-to-finish through the Vite/React app for every path that doesn't
cross an EVENT or SHREDDER node. `wordbound.html` remains fully intact and
unchanged as the complete reference implementation.

**Next:** EVENT and SHREDDER are the last two `renderRun()` sub-panels
standing between "most of a run is playable" and "all of it is" — EVENT
needs per-choice `disabledReason(state)` evaluation (a small but genuinely
different pattern from the other four), SHREDDER needs multi-select-then-
confirm state (a local "picked tile ids" set, mirrored against
`state.shredderSelection`/`Game.toggleShredderTile`/a confirm action). After
those: GAME_OVER/VICTORY screens (`renderGameOver()`/`renderVictory()`,
currently unreached in React since `render()`'s early-return means React
never even calls them — worth confirming what currently happens when a
React-driven run's player dies or wins the last floor, since neither screen
has a React component or route yet), the tile-staging/drag system, and the
per-hit animations remain the same real, scoped follow-ups noted by the
last two runs. Vitest/RTL migration (STRUCTURAL sub-step 3) is now
significantly overdue — every run since scaffold has added more real
interactive behavior verified only by throwaway Playwright scripts instead
of a committed, repeatable test; strongly consider making it the very next
pick over further screen ports.

## 2026-08-21T15:24Z — repo-health check + STRUCTURAL sub-step 3: Vitest/RTL stood up (orchestrator)

**Repo-health check before starting:** `git status` showed HEAD detached
again (same class of issue the STRUCTURAL 6/N run hit and fixed). This time
it was benign: local `main` was just stale in this fresh container (it
pointed at the very first seed commit, `f98ff83`), while `origin/main` (after
`git fetch`) and detached `HEAD` both already sat at the same, correct
commit (`21ef9fe`, everything through the last two orchestrator tickets).
Confirmed with `git merge-base --is-ancestor` both ways before touching
anything, then `git checkout -B main origin/main` to reattach HEAD and fix
the local branch pointer — no lost work, nothing to re-push. Flagging the
general pattern again for future runs: always `git fetch origin main` and
diff against the fetched ref, not just the locally-cached `origin/main`,
before concluding local state is stale or ahead.

**What was done:** picked up the orchestrator's own note (previous entry)
making Vitest/RTL migration (GOALS.md STRUCTURAL sub-step 3) the next chunk.
Stood up Vitest + React Testing Library and wrote real, repeatable tests for
every screen ported so far, replacing what had only ever been verified by
throwaway Playwright scripts:

- `npm install`-ed `vitest`, `@testing-library/react`,
  `@testing-library/jest-dom`, `@testing-library/user-event`,
  `@vitest/coverage-v8` (installed but coverage not wired into a script —
  available for a future run to use) as devDependencies; bumped `jsdom` to
  satisfy the new peer range.
- `vite.config.mjs`: added a `test` block (jsdom environment, `globals:
  true` so React Testing Library's automatic per-test `afterEach` cleanup/
  unmount just works, `setupFiles`).
- `src/test/setup.js` (new): imports the vanilla engine modules for their
  `window.Wordbound.*` side effects in the EXACT SAME ORDER `src/main.jsx`
  uses, then calls `Game._initDependencies()` — this is what lets every
  component test drive the REAL engine (real `Game.startRun`, real
  `Combat.previewWord`, real seeded `Floor` generation) instead of a mock.
- `src/test/gameHelpers.js` (new): `freshRun(seed, characterId)` (calls the
  real `Game.startRun`, returns the live `Game._state` object every
  component reads directly); `pickPlayableWord` (validates a candidate word
  against the CURRENT rack via `Combat.previewWord` rather than hardcoding
  one word that could silently go stale if wordlist.js or the seeded rack
  ever drift — throws loudly if none of the candidates are playable, so a
  drift breaks tests instead of silently testing nothing);
  `findNodeIdByType`/`findAvailableCombatNodeId` (see the bug this fixed,
  below); `defeatCurrentMonster` (forces the current monster to 1 HP, plays
  a real valid word, polls the real state for the async TILE_REWARD
  transition instead of a fixed sleep).
- 30 tests across 6 files (`src/components/__tests__/*.test.jsx`):
  `MainMenu` (renders, button callbacks, real achievement-count read),
  `CharacterSelect` (real roster from `window.Wordbound.Characters`, click +
  keyboard-Enter selection, seed passthrough, Back), `HowToPlayOverlay`
  (hidden-class toggle, close callback), `RunScreen` (real header/map
  render, only-available-nodes-clickable + entering one starts a REAL fight
  via the real engine, mid-fight abandon → `Game.returnToMainMenu`, screen
  routing to TREASURE/SHOP/unported-placeholder), `CombatScreen` (rack
  render, click-to-build-word, live damage preview, `Play Word` calling the
  real `Game.submitWord` and dropping monster HP SYNCHRONOUSLY — same fact
  the previous run's Playwright script relied on, now asserted in a
  committed test — Overcharge arming with the real multiplier constant,
  Rewrite spending ink and dealing a fresh rack), `RewardScreens`
  (Treasure pick, Shop afford/disable gating + real purchase + Leave Shop,
  TileReward pick-adds-to-deck and Skip, BossReward reached via a REAL boss
  kill → tile-reward skip → boss-item pick advancing the floor). All of
  these exercise the real engine end to end (real RNG, real word validation,
  real combat math, real shop economy) — no mocked `Game`/`Combat`/`Items`.
- `package.json`: added `pretest:react` (same `tools/ensure-deps.js`
  fresh-sandbox auto-install pattern every other test script uses) and
  `test:react` (`vitest run`).
- GOALS.md: added an ADDED-2026-08-21 note under MANDATORY VERIFICATION —
  `npm run test:react` is now also mandatory for any `src/components/*.jsx`
  change, alongside (not replacing) `npm test`, since `wordbound.html`
  remains the complete reference implementation until the port reaches full
  parity. Updated the STRUCTURAL ticket's own orchestrator note to reflect
  sub-step 3 being done for ported screens, and flagged what's still
  missing (Playwright's `test:mobile`/`test:qa`/`test:itch-build` still only
  target `wordbound.html`, not the Vite/React app — that's real remaining
  sub-step-3 scope, not finished by this run).

**A real bug this caught, in the test harness, not the app:** the first
version of the RewardScreens tests crashed with `Cannot read properties of
null (reading 'map')` — `state.tileRewardOptions`/`state.bossRewardOptions`
read `null` inside the component's render despite being confirmed non-null
moments earlier in the same synchronous test code. Root-caused by adding a
temporary `console.log` inside the component itself (not just the test):
the naive test harness kept re-rendering the SAME screen component
unconditionally on every `bump()`, including AFTER the user clicked a
choice — which calls the real `resolveTileReward()`/equivalent that legally
nulls those fields once the screen resolves. Real `RunScreen.jsx` never hits
this because it ROUTES AWAY to a different component the instant
`state.screen` changes; the test harness didn't mirror that guard. Fixed by
making the harness route the same way (render `null` once `state.screen` no
longer matches the screen under test) instead of forcing the real component
to render stale, now-nulled options — this was a test-only bug, not a
product bug, but worth logging since it looked exactly like a real crash
until traced.

**A second real bug this caught, in the FIRST test-writing pass, not the
app:** hardcoded node ids (`'node1'`, `'node6'`, `'node11'`, ...) taken from
a one-off manual `node -e` script broke the moment those same tests ran
inside Vitest, because `js/wordbound/floor.js`'s node-id counter (`var
nextNodeId = 1`) is a plain module-level variable that is NEVER reset
between runs — so which literal id a "floor-1 boss node" gets depends on how
many floors any EARLIER test in the same run already generated. Fixed by
adding `findNodeIdByType`/`findAvailableCombatNodeId` to look nodes up by
TYPE off the freshly generated `state.floor.nodes` every time, never by a
literal id — the same "test scenario setup" convention `game.js`'s own
comments already document for `Game.enterCurrentNode`'s zero-arg re-entry
form, just applied consistently. Documented in both `gameHelpers.js` and a
header comment on `RunScreen.test.jsx` so a future run doesn't reintroduce
literal ids.

**Verified:**
- `npx vitest run`: 30/30 passing, run 3 times in a row (including once
  immediately after the two bugs above were fixed) with no flakes — the
  suite mixes real async waits (`defeatCurrentMonster`'s real-timer poll for
  Game.submitWord's ~720ms kill-resolution delay) with synchronous
  assertions, so repeat runs were worth the time to rule out timing
  flakiness before calling it done.
- `npm test` (jsdom dom-check, full suite): ALL CHECKS PASSED, unaffected —
  this run touched no `game.js`/`wordbound.html`/CSS.
- `npm run build`: clean, 38 modules (unchanged from the last build-touching
  run — this run added no new `src/` production code, only test
  infrastructure and `src/test/*`, which Vite's build doesn't bundle since
  nothing imports it from `src/main.jsx`).
- NOT re-run (this run touched no CSS, no `game.js`, no `wordbound.html`):
  `test:mobile`, `test:qa`, `test:itch-build`, `test:branching-map`,
  `test:audio`. Consistent with prior runs' own reasoning for skipping
  suites whose target tree wasn't touched.

**Current state:** every React screen ported so far (MainMenu,
HowToPlayOverlay, CharacterSelect, RunScreen's map + routing, CombatScreen,
all four reward/shop panels) now has a committed, repeatable Vitest/RTL
test alongside it, driving the real engine — not just a one-time Playwright
script that gets deleted after the run that wrote it. `wordbound.html`
remains the complete, unmodified reference implementation; the React app's
feature set is unchanged by this run (test-only, zero `src/components/*.jsx`
behavior changes).

**Next:** resume the actual STRUCTURAL screen ports — EVENT (per-choice
`disabledReason(state)` checks) and SHREDDER (multi-select-then-confirm)
are the last two `renderRun()` sub-panels, then GAME_OVER/VICTORY (currently
unreached in React at all, per the STRUCTURAL 6/N run's note) — with a
Vitest/RTL test landing alongside each one this time, per this sub-step's
now-established pattern (`gameHelpers.js`'s `freshRun`/`findNodeIdByType`/
`defeatCurrentMonster`, look up node ids by type not literal value). Also
still open for a future run: port Playwright's `test:mobile`/`test:qa`/
`test:itch-build` (or an equivalent) to actually exercise the Vite/React
app rather than only `wordbound.html` — real sub-step-3 scope this run
did not attempt. The tile-staging/drag system and the per-hit animations
remain the same real, scoped follow-ups noted by earlier runs.

---

## 2026-08-21T15:38Z — STRUCTURAL 8/N: EVENT + SHREDDER screens ported to React

Continuing the STRUCTURAL ticket (React/Vite migration). Picked up exactly
where the last run's PROGRESS note left off: EVENT and SHREDDER were the
last two `renderRun()` sub-panels without a React port (RunScreen.jsx had
been routing both to the generic "not ported yet" placeholder).

**What changed:**
- `src/components/RewardScreens.jsx`: added `EventScreen` and
  `ShredderScreen`, direct ports of `game.js`'s `renderEvent()`/
  `renderShredder()` (same `treasure-panel`/`treasure-choices` CSS classes
  the already-ported Treasure/Shop/TileReward/BossReward panels use — no new
  CSS needed).
  - `EventScreen`: renders `state.currentEvent`'s name/text and one button
    per choice, live-evaluating each choice's optional `disabledReason(state)`
    (events.js) on every render — a disabled choice greys out and shows its
    reason instead of being clickable, same live re-check `game.js`'s own
    `chooseEventOption` does server-side before applying an effect.
  - `ShredderScreen`: the deck-viewer made pickable, with the exact same
    remaining-picks cap math as `game.js`'s internal `shredderRemainingPicks()`
    (mirrored inline rather than imported — that function only exposes a
    test-only inspection hook, `Game._shredderRemainingPicks`, per its own
    comment, so production UI code shouldn't depend on it). An already-picked
    tile stays clickable (to un-pick) even once the pick budget is spent,
    matching the vanilla behavior.
- `src/components/RunScreen.jsx`: routes `state.screen === 'EVENT'`/
  `'SHREDDER'` to the two new components; updated the header comment (GAME_OVER
  and VICTORY are now the only two remaining unported `renderRun()` screens).
- `src/components/__tests__/RunScreen.test.jsx`: two new tests driving the
  REAL engine (no mocks):
  - EVENT: seed `vitest-fixed-seed-1`'s floor-1 event node deterministically
    resolves to `forbidden_tome` (verified by generating that floor headlessly
    before writing the test, since `events.js`'s event pick is itself
    seed-derived RNG). Asserts the enabled "Read it anyway" choice is
    clickable (fresh run owns none of the rule-changer items yet, so its
    `disabledReason` is null), that clicking it runs the real effect (an item
    granted, ink actually spent), and that the node resolves back to `RUN`.
  - SHREDDER: had to find a DIFFERENT seed (`vitest-shredder-seed-5`) whose
    floor-1 FIRST event node resolves to `the_shredder` specifically (a floor
    can carry more than one event node, and `findNodeIdByType` returns the
    first match) — found by generating floors headlessly for candidate seeds
    until one matched, same "seed hunting" the existing SEED constant already
    represents. Clicks "Feed it" (routes to SHREDDER via the real
    `{hold: 'SHREDDER'}` effect), picks one real deck tile, confirms, and
    asserts the deck actually shrank by exactly one and the node resolved
    back to `RUN`.
  - Also fixed the pre-existing "falls back to the honest not-ported-yet
    placeholder" test, which had hardcoded `state.screen = 'EVENT'` as its
    example of an unported screen — now uses `GAME_OVER` (a real screen name
    from `game.js`, confirmed by grep), since EVENT is ported as of this run.
- `GOALS.md`: updated the STRUCTURAL ticket's orchestrator note (32 tests now,
  not 30; GAME_OVER/VICTORY are the only remaining unported `renderRun()`
  screens) and `RewardScreens.jsx`'s header comment.

**Verified:**
- `npx vitest run`: 32/32 passing, run 3 times in a row with no flakes.
- `npm test` (jsdom dom-check, full suite): ALL CHECKS PASSED — this run
  touched no `game.js`/`wordbound.html`/CSS, so unaffected as expected.
- `npm run build`: clean, 38 modules, no new build warnings beyond the
  pre-existing single-chunk-size notice (unrelated to this change).
- Real-browser Playwright check (throwaway script, not committed — same
  "verify what you can, use a real browser for what jsdom can't" approach
  earlier runs used): booted the actual Vite dev server, clicked through
  New Run → character select in a real Chromium tab (confirming the new
  `EventScreen`/`ShredderScreen` imports don't break module resolution or
  the production bundle), then drove `Game.enterCurrentNode`/
  `chooseEventOption`/`toggleShredderTile`/`confirmShredder` directly via
  `page.evaluate` on both seeds above and confirmed: zero console/page
  errors, the EVENT choice's real effect landed (item granted) and the node
  resolved to `RUN`, and the SHREDDER flow's real deck mutation landed
  (`deck.length` dropped by exactly 1) and also resolved to `RUN`.
- NOT verified in the real browser: the actual EVENT/SHREDDER *rendered DOM*
  (headings, choice buttons, disabled/greyed styling) — the Playwright pass
  above only confirmed the underlying engine calls resolve correctly with no
  errors, not the on-screen React render, because reaching those non-start
  map nodes through genuine UI clicks (as opposed to direct engine calls)
  would require walking the full node path through intervening
  combat/treasure/shop nodes first, which was out of scope for a smoke check.
  The actual rendered DOM (real CSS classes, `getByRole`/`getByText` queries
  against the true JSX output) IS covered, repeatably, by the Vitest/RTL
  tests above — this is the same bar the Treasure/Shop/TileReward/BossReward
  panels were verified to in the prior run, which also relied on Vitest/RTL
  alone for DOM correctness (no dedicated Playwright script), since none of
  these panels involve timing, drag-and-drop, or audio — the things jsdom
  genuinely can't verify.
- NOT re-run (this run touched no CSS, no `game.js`, no `wordbound.html`):
  `test:mobile`, `test:qa`, `test:itch-build`, `test:branching-map`,
  `test:audio`.

**Current state:** every `renderRun()` sub-panel except GAME_OVER and
VICTORY now has a real React port with a committed Vitest/RTL test driving
the real engine. `wordbound.html` remains the complete, unmodified reference
implementation.

**Next:** GAME_OVER and VICTORY are the last two screens for STRUCTURAL
sub-step 1 (screen porting). Once those land, the remaining STRUCTURAL scope
is: porting Playwright's `test:mobile`/`test:qa`/`test:itch-build` (or
React-app equivalents) to actually exercise the Vite/React app rather than
only `wordbound.html`, verifying the built (not just dev-server) output in a
real browser end-to-end, and the tile-staging/drag system + per-hit
animations noted as open by earlier runs.

---

## 2026-08-21T15:55Z — STRUCTURAL 9/N: GAME_OVER + VICTORY screens ported to React (repo-health note first)

**Repo-health note:** this run started on a detached HEAD, several commits
ahead of the local `main` branch pointer but level with `origin/main` (`git
ls-remote origin` confirmed the remote's real `main` matched HEAD exactly —
local `main` was just stale/unfetched from an earlier run, not a lost-push
situation). Fixed with `git fetch origin main && git checkout -B main
origin/main` before starting any work. No data was at risk, but flagging the
pattern again since at least one earlier run's PROGRESS entry already
mentions a "detached-HEAD check" — worth a future run adding a guard/note to
whatever wrapper starts these sessions if this keeps recurring.

Continuing the STRUCTURAL ticket (React/Vite migration). GAME_OVER and
VICTORY were the last two `renderRun()`-family screens without a React port
per the last run's note.

**What changed:**
- `src/components/RunScreen.jsx`: added `GameOverScreen`, `VictoryScreen`,
  and a shared `RunStatsSummary` (direct ports of game.js's
  `renderGameOver()`/`renderVictory()`/`renderRunStats()`). Reused the
  existing `run-stats-summary`/`run-stat-row`/`run-stat-label`/
  `run-stat-value` CSS classes (already in `css/wordbound.css`, no new CSS
  needed) and the plain `.panel`/`.btn.btn-primary` classes the vanilla
  screens use.
  - Important layout fix caught by re-reading the vanilla markup before
    porting: GAME_OVER/VICTORY are NOT sub-panels of `#screen-run` the way
    TREASURE/SHOP/EVENT/etc. are (those stay visible under the run header +
    message log). They're genuinely separate top-level screens in vanilla —
    `render()`'s dispatch (`if (state.screen === 'GAME_OVER') { show(...);
    renderGameOver(); return; }`) swaps `#screen-run` out entirely, so the
    ink/gold/floor header and message log disappear. My first draft routed
    GAME_OVER/VICTORY through RunScreen's normal ternary chain (which stays
    wrapped in the run-header div) — caught this via a plain read of
    `wordbound.html`'s markup before writing the browser check below, and
    restructured RunScreen to `return <GameOverScreen .../>` /
    `return <VictoryScreen .../>` BEFORE the run-header wrapper, matching
    vanilla exactly.
  - The "Main Menu" button on both screens calls RunScreen's existing
    `backToMenu` (same one the mid-combat "abandon run" button uses): a real
    `Game.returnToMainMenu()` call plus the `onBackToMenu` callback so App's
    own screen state also leaves "run" — vanilla's `#btn-gameover-continue`/
    `#btn-victory-continue` just call `Game.returnToMainMenu` directly since
    there's no separate App-level router to also flip.
- `src/components/__tests__/RunScreen.test.jsx`: two new tests driving the
  REAL engine (no mocks), plus one existing test fixed:
  - GAME_OVER: enters a real combat node, sets `state.player.ink = 0`
    directly, then types and submits a real playable word through the
    actual `CombatScreen` UI. game.js's own player-death check
    (`state.player.ink <= 0`, right after a word is scored, BEFORE the
    monster's counterattack even rolls — see the "Cursed Quill" comment
    above that check in game.js) fires synchronously, so this is
    deterministic regardless of monster intent RNG and needs no fake
    timers. Asserts the real screen transition, the stats/seed text, that
    the run-header ink display and message log are genuinely gone (not just
    that the game-over text is present), and that clicking "Main Menu"
    really returns to `MAIN_MENU`.
  - VICTORY: calls the already-exposed `Game._advanceFloor()` test hook
    three times (`Floor.TOTAL_FLOORS` is 3; the 4th advance is the real
    `endRun(true)` condition) before the first render — mutating state
    before mounting sidesteps a React re-render gap described below.
    Asserts the real heading/stats/seed text and the absent run-header, and
    that "Main Menu" works here too.
  - Fixed the "falls back to the honest not-ported-yet placeholder" test,
    which had hardcoded `state.screen = 'GAME_OVER'` as its example of an
    unported screen — GAME_OVER is ported now, so there is no genuine
    unported `renderRun()` screen left to demonstrate the fallback with.
    Switched to a synthetic `'NOT_A_REAL_SCREEN'` value with a comment
    explaining why, since the test's real point (the defensive fallback
    branch itself still works for an unrecognized value) doesn't need a
    real screen name.
- `GOALS.md`: updated the STRUCTURAL ticket's orchestrator note (sub-step 1,
  screen porting, is now fully done) and documented a re-render gotcha this
  run hit directly (below) for whoever tackles the still-open Playwright
  port sub-step.

**Verified:**
- `npx vitest run`: 34/34 passing, run 3 times in a row with no flakes.
- `npm test` (jsdom dom-check, full suite): ALL CHECKS PASSED — this run
  touched no `game.js`/`wordbound.html`/CSS, unaffected as expected.
- `npm run build`: clean, 38 modules, same pre-existing single-chunk-size
  notice as prior runs, no new warnings.
- Real-browser Playwright check (throwaway script, not committed): booted
  the real Vite dev server, played through New Run → character select →
  clicked a real "Foe" pill on the map (through the actual UI, not a direct
  engine call, so React genuinely re-rendered into CombatScreen), zeroed
  `state.player.ink` directly, typed and submitted a real word via the real
  input + "Play Word" button. Confirmed for real: `state.screen` became
  `GAME_OVER`, "The Well Ran Dry" rendered, the run-header ink display was
  genuinely NOT visible (confirming the layout fix above), and clicking the
  real "Main Menu" button both returned `state.screen` to `MAIN_MENU` and
  showed the real main menu — zero console/page errors throughout.
- NOT verified live in the real browser: VICTORY's rendered DOM on an
  already-mounted page. Calling `Game._advanceFloor()` three times via
  `page.evaluate` on an already-mounted RunScreen DID flip `state.screen` to
  `VICTORY` for real (confirmed by reading the engine state directly), but
  the on-screen DOM stayed stale — no React re-render happened, because
  `page.evaluate` calls the engine directly, bypassing the UI's `act`/`bump`
  cycle (`bump` is the ONLY thing that triggers a RunScreen re-render, and
  it only runs from inside a real click handler — see RunScreen.jsx's own
  header comment). This is a test-harness gap, not a product bug: real
  gameplay only ever reaches `advanceFloor()` through
  `Game.enterCurrentNode()`, itself always called from a real UI click
  already wrapped in `act()`. The Vitest/RTL test for VICTORY sidesteps this
  by mutating state BEFORE the component's first `render()` call (valid for
  a fresh test render, confirmed 3x stable above) rather than after an
  already-mounted one — so VICTORY's actual rendered DOM (heading, stats,
  seed, absent header, working Main Menu button) IS genuinely verified,
  just not via a live already-mounted browser page. Documented the gap in
  GOALS.md's orchestrator note so whoever ports the Playwright suites next
  drives VICTORY through a real boss-kill-on-floor-3 UI path instead of a
  direct hook call.
- NOT re-run (this run touched no CSS, no `game.js`, no `wordbound.html`):
  `test:mobile`, `test:qa`, `test:itch-build`, `test:branching-map`,
  `test:audio`.

**Current state:** every `renderRun()`-family screen (map, combat,
treasure/shop/tile-reward/boss-reward, event, shredder, game-over, victory)
now has a real, committed React port with a repeatable Vitest/RTL test
driving the real engine. `wordbound.html` remains the complete, unmodified
reference implementation. STRUCTURAL's sub-step 1 (screen-by-screen port)
is done; the ticket itself stays unchecked — sub-steps 3-5 (Playwright
suite ports, built-output verification, touch/drag re-verification) are
real remaining scope, unchanged from what earlier runs already flagged.

**Next:** the actual remaining STRUCTURAL work is porting Playwright's
`test:mobile`/`test:qa`/`test:itch-build` (or React-app equivalents) to
exercise the Vite/React app instead of only `wordbound.html`, verifying the
BUILT output (not just the dev server) end-to-end in a real browser, and the
tile-staging/drag system + per-hit animations noted open by several earlier
runs. See this entry's GOALS.md note for the re-render gotcha to design
around when writing those Playwright scripts (drive real UI paths to
terminal states like VICTORY, don't call internal `Game._*` test hooks
directly on an already-mounted page and expect the DOM to follow).

---

## 2026-08-21T16:23Z — STRUCTURAL 10/N: `test:react-build`, first real-browser check against the BUILT React app (repo-health note first)

**Repo-health note:** same detached-HEAD-but-level-with-origin pattern the
last two runs flagged. `git rev-parse HEAD` (`9951d83...`) matched
`origin/main` exactly after `git fetch origin main`; local `main` was just
stale. Fixed with `git checkout -B main origin/main` before starting, same
fix as before. Flagging again since this is now the third consecutive run
hitting it — whatever starts these sessions should probably fetch/reset
`main` itself before handing off, but that's outside this repo's own scope
to fix.

Continuing the STRUCTURAL ticket. Per the last two runs' PROGRESS notes, the
real remaining scope after screen-porting (sub-step 1, done) was: (a) port
`test:mobile`/`test:qa`/`test:itch-build` or equivalents to the Vite/React
app, (b) real-browser verification on the BUILT output (not dev server) —
every prior check was a throwaway, uncommitted script against the DEV
server — and (c) tile-staging/drag + per-hit animations. Picked up (a)+(b)
together since they're the same missing piece: nothing in this repo had
ever loaded the actual `vite build` output in a real browser and clicked
through it.

**What changed:**
- `test/verify-react-build.js` (new, committed — not a throwaway script):
  builds the app fresh (`vite build`), serves `dist/app/` over a local
  static HTTP server (same pattern as `verify-itch-build.js`'s scratch-dir
  server), and in one real Chromium pass:
  1. Asserts zero failed requests / 404s loading the built bundle — the
     same "real static-serve, not dev server, not jsdom" bar
     `verify-itch-build.js` holds `wordbound.html` to, now covered for the
     React tree.
  2. Drives a genuine UI-only playthrough: real `.click()`/`.fill()` calls
     for New Run → character select (seed `vitest-fixed-seed-1` + "The
     Archivist", the same known-good combo `src/test/gameHelpers.js`'s
     `freshRun` already relies on, so the seeded rack is proven-deterministic)
     → click a real `.node-pill.node-combat.node-current` map node → read
     the live rack via `Combat.previewWord` (read-only query, same approach
     `gameHelpers.js`'s `pickPlayableWord` uses) to find a real playable word
     from the same candidate list the Vitest suite uses → type it into the
     actual input and click the actual "Play Word" button → confirm
     `state.monster.hp` genuinely drops. Deliberately never calls a
     `Game.*`/`Combat.*` mutator via `page.evaluate` to force state — only
     the read-only `previewWord` query is called that way — because
     STRUCTURAL 9/N's PROGRESS entry already documented that a direct hook
     call bypasses RunScreen's `act`/`bump` re-render cycle and leaves the
     DOM stale; this script always changes state the same way a real player
     would, so what it observes in the DOM is never stale.
  3. Checks horizontal overflow at 375px/414px (test:mobile's own widths)
     at each screen reached along that same real playthrough — main menu,
     character select, run map, mid-fight combat — the first mobile-layout
     check of any kind against the React component tree's actual CSS
     classes (`test:mobile` itself only ever targeted `wordbound.html`).
  4. Asserts zero console/page errors across the whole pass.
- `package.json`: added `pretest:react-build` (playwright ensure-deps, same
  pattern as the other Playwright scripts) / `test:react-build` npm scripts.
- `GOALS.md`: added an orchestrator note (update 3) on the STRUCTURAL ticket
  documenting exactly what's now covered vs. still open.

**Verified:**
- `node test/verify-react-build.js`: ALL CHECKS PASSED, run twice in a row
  with no flakes (17 checks each run, identical results both times,
  including the actual HP delta logged: `52 -> 44` from playing RADIO on
  the seeded rack).
- `npm test` (jsdom dom-check, full suite): ALL CHECKS PASSED — this run
  touched no `game.js`/`wordbound.html`, unaffected as expected.
- `npx vitest run`: 34/34 passing — this run touched no `src/components/*`,
  unaffected as expected.
- `npm run build`: clean, same pre-existing single-large-chunk notice as
  every prior run (unrelated, not this ticket's scope), no new warnings.
- NOT run (untouched by this change): `test:mobile`, `test:qa`,
  `test:itch-build`, `test:run-header`, `test:audio`, `test:drag-interrupt`,
  `test:branching-map` — all target `wordbound.html`, which this run did not
  touch.

**Current state:** the React/Vite app now has a real, committed,
repeatable, real-browser check against its actual BUILT output (not the dev
server), covering boot, a full UI-driven fight action, and mobile layout at
both of `test:mobile`'s widths. Combined with the existing 34 Vitest/RTL
tests (screen-level DOM correctness) and `npm test`'s 
`wordbound.html`-side coverage, remaining-scope items (a) and (b) are now
substantively covered for the "does the built app boot and play" bar.

**Not done / explicitly out of scope this run:**
- `test:qa`'s deeper boss-reward-flow coverage (multi-floor progression,
  reward panel edge cases) has no React equivalent yet — this run's script
  proves one fight-start action works end-to-end, not the full run loop.
- `test:itch-build` was intentionally left untouched: it packages
  `wordbound.html` specifically (itch.io ships the vanilla reference, not
  the React app, until full parity per the STRUCTURAL header's own note) —
  not this ticket's remaining scope.
- (c) tile-staging/drag system + per-hit animations: still genuinely
  unbuilt. `CombatScreen.jsx`'s own header comment (read again this run
  before writing the word-submit step above) documents this directly — word
  entry is type-or-click-to-append only, no drag/reorder, no floating-damage
  or screen-shake feedback. Real remaining feature work, not a test gap.

**Next:** either (a) a React equivalent of `test:qa`'s deeper multi-floor/
boss-reward flow, or (c) the tile-staging/drag system, are the two
substantive pieces left before STRUCTURAL can be checked off. Given (c) is
a real UI feature (pointer capture, ghost tiles, insertion-index math) while
(a) is "more of the same kind of check just added," a future run should
probably tackle (c) next since it's the more product-shaped gap — but either
is legitimate next work.

---

## 2026-08-21T16:55Z — STRUCTURAL 11/N: items-owned/deck-viewer/item-inspector/consumables-panel + music controls React port (repo-health note first)

**Repo-health note:** started detached at HEAD (matched `origin/main` exactly
after `git fetch origin main` — same stale-local-`main` pattern the last
three runs flagged). Fixed with `git checkout main && git merge --ff-only
origin/main` (24 commits fast-forwarded cleanly, nothing local to lose).

**What I looked at first:** GOALS.md's own recommendation for this run was
(c) tile-staging/drag system or (a) a React `test:qa` equivalent. Before
picking one, I re-read `CombatScreen.jsx`'s header comment (documents (c)'s
scope precisely: pointer capture, ghost tiles, insertion-index math, a whole
feature in its own right) and then audited what `js/wordbound/game.js`'s
`renderRun()` actually renders beyond the `state.screen`-keyed panel family
RunScreen.jsx already dispatches on (map/combat/treasure/shop/tile-reward/
boss-reward/event/shredder/game-over/victory). That turned up a real,
previously-unflagged gap: `renderRun()` ALSO unconditionally renders
`#items-owned` (a chip per owned item) and toggles three more side panels —
`#deck-viewer-panel`, `#item-inspector-panel`, `#consumables-panel` — opened
from the run-header's Deck/Consumables buttons, independent of
`state.screen`. Grepped `src/` for `item-chip`/`deck-viewer`/
`consumablesPanelOpen`/`itemInspectorOpen`/`btn-view-deck`: zero hits in any
of them. Concretely: a player in the React app who picked up an item from a
treasure/shop/boss-reward screen (all of which DO work — `state.player.items`
gets pushed to correctly) had literally no UI to ever see what they owned,
view their deck, or use a consumable mid-fight. The existing Vitest suite
never caught this because it only asserts `state.player.items` mutated
correctly, never that anything renders it (confirmed by grepping the test
files too). Also found: `setMusicVolume`/`toggleMusicMute` are PRIVATE
closures inside `game.js`, wired directly to `wordbound.html`'s own
`#btn-toggle-music`/`#music-volume` DOM listeners — not exposed on `Game.*`
at all, so React had no way to reach them even in principle.

Picked this over both (a) and (c): it's a correctness/parity bug (a whole
feature invisible to the React player, not just untested-but-built or
known-and-flagged-unbuilt like (c)), the fix pattern was already established
by the reward/shop family (`.treasure-panel`/`.treasure-choices`, which
`#deck-viewer-panel` etc. already reuse verbatim in `wordbound.html`'s own
markup), and it's cleanly bounded — unlike (c)'s pointer-capture/ghost-tile
system, which is genuinely its own multi-hour ticket.

**What changed:**
- `js/wordbound/game.js`: added `Game.getAudioSettings()` / `setMusicVolume()`
  / `toggleMusicMute()` — thin public wrappers around the pre-existing
  private `setMusicVolume`/`toggleMusicMute` functions + a `render()` call
  (which already no-ops when the legacy `#screen-main-menu` DOM doesn't
  exist, per its own STRUCTURAL-ticket comment — confirmed this guard before
  relying on it, so calling `render()` from the React app is safe). Zero
  behavior change for `wordbound.html`: its own DOM listeners still call the
  private functions directly, untouched.
- `src/components/RunSidePanels.jsx` (new): direct ports of
  `renderItemsOwned()` (`ItemsOwnedStrip` — chips, click-to-inspect, the
  proc-flash-once behavior via a `useEffect` that clears
  `state.proccedItemIds` after commit instead of mutating during render, so
  React's render-purity rule isn't violated while still landing "flashes for
  exactly one render"), `renderDeckViewer()` (`DeckViewerPanel`), 
  `renderItemInspector()` (`ItemInspectorPanel`), `renderConsumablesPanel()`
  (`ConsumablesPanel` — real mid-combat-only enablement, matching
  `Game.useConsumable`'s own guard), and the header's Deck/Consumables/
  music-toggle/music-volume controls (`RunHeaderActions`).
- `src/components/RunScreen.jsx`: wires all of the above in. Added
  `RunHeaderActions` to the run-header and `ItemsOwnedStrip` right below it
  (matching `renderRun()`'s DOM order exactly). Computed `sidePanelOpen =
  state.deckViewerOpen || state.itemInspectorOpen ||
  state.consumablesPanelOpen` and gave it precedence over the existing
  combat/reward/map branch chain — same "one side panel wins over
  everything else, openable mid-combat too" rule `renderRun()`'s own
  `sidePanelOpen` boolean enforces.
- `src/components/__tests__/RunSidePanels.test.jsx` (new, 6 tests): renders
  the real `RunScreen` (not a harness) and drives it through real
  `userEvent` clicks — item chip renders + opens the real inspector (and
  closes), Deck button opens a real deck listing (every real deck tile's
  letter is asserted present) and hides the node map, then restores it on
  close; a real consumable (`errata_slip`) is disabled outside combat and,
  once a real fight is entered, actually usable (asserts real ink
  restoration, not just that a button exists); both music controls assert
  against `Game.getAudioSettings()` (mute toggle flips + restores the
  original value so it doesn't leak into other test files via
  `localStorage`; volume set/restored the same way).

**Verified:**
- `npx vitest run`: 40/40 passing (34 pre-existing + 6 new), no flakes.
- `npm test` (jsdom dom-check, full suite): ALL CHECKS PASSED — untouched by
  this change (no `game.js` render-path logic changed, only new `Game.*`
  wrappers added), confirmed unaffected.
- `npm run build`: clean, 39 modules (was 38 — the one new file), same
  pre-existing single-large-chunk notice, no new warnings.
- `node test/verify-react-build.js` (real Chromium against the fresh
  `vite build` output): ALL CHECKS PASSED, including the existing full
  playthrough + zero-console-errors + 375/414px overflow checks at every
  screen it already covers (main menu, character select, run map, mid-fight
  combat) — the run-map check's viewport now includes the new
  `RunHeaderActions` row and showed no overflow, so the new header controls
  don't break mobile layout at either of `test:mobile`'s widths.
- A throwaway (uncommitted, deleted after the run) real-browser Playwright
  script specifically exercising the NEW surfaces against the same built
  `dist/app/` output: starting item chip renders (1, matching the
  archivist's real `startingItems`), Deck button opens a real deck listing
  and hides the map, Consumables button opens a real (empty, for this
  character) consumables panel, clicking the item chip opens a real
  inspector showing "Spare Satchel", and a real click on the music-mute
  button flips `Game.getAudioSettings().muted` — zero console/page errors
  throughout. All 8 checks passed.
- NOT re-run (untouched by this change): `test:mobile`, `test:qa`,
  `test:itch-build`, `test:run-header`, `test:audio`, `test:drag-interrupt`,
  `test:branching-map` — none target `src/`, and `wordbound.html`/`css/` are
  unchanged this run.

**Current state:** the React app now has full rendering parity for
items-owned/deck/item-inspector/consumables + music controls — every piece
of state a player can accumulate during a run (items, deck contents,
consumables) is now visible and usable in the React UI, and music mute/
volume has a real control surface for the first time in that tree. This
closes a genuine, previously-invisible feature gap, not just a test gap.

**Not done / explicitly out of scope this run:** (a) `test:qa`'s deeper
multi-floor/boss-reward-flow React equivalent and (c) the tile-staging/drag
system + per-hit animations remain exactly as open as before — this run
found and fixed a separate, higher-priority parity bug instead of advancing
either. STRUCTURAL stays unchecked.

**Next:** (a) and (c) are still the two flagged remaining pieces; (c) is
still probably the more product-shaped one to tackle next, per the last two
runs' reasoning (unchanged by this run's detour). A future run doing a
similar "what does `renderRun()`/`render()` actually touch that RunScreen.jsx
doesn't" audit for the MAIN_MENU/CHARACTER_SELECT screens and the
`howToPlayOpen`/blank-picker overlays might be worth a quick pass too, given
this run's find — I did not have time to do that audit this run, flagging it
as a possible next check rather than a confirmed gap.

---

## 2026-08-21T17:06Z — STRUCTURAL 12/N: MAIN_MENU/CHARACTER_SELECT parity audit (clean) + real blank-tile bug found and fixed in CombatScreen

**Repo-health note:** started detached at `origin/main`'s exact commit
(same pattern the last several runs flagged, no local drift to lose). Ran
`git checkout main && git reset --hard origin/main` to get onto a proper
branch tracking origin cleanly. `npm install` was needed first — a fresh
container, `node_modules` wasn't present.

**What I did:** last run's "Next" note suggested a quick audit of whether
`MAIN_MENU`/`CHARACTER_SELECT`'s React ports are missing anything `render()`
actually touches for those screens, given the same style of audit had just
turned up the items/deck/consumables gap. Did that first (cheap, bounded):
read `renderMainMenu()`/`renderCharacterSelect()` in `game.js` line by line
against `MainMenu.jsx`/`CharacterSelect.jsx` — both are full parity already
(achievements block, seed input, character cards, back button all present
and correctly wired). Also checked `render()`'s two screen-independent
pieces (`howto-overlay` via `state.howToPlayOpen`, `renderBlankPicker()` via
`state.blankPickerOpen`) against `src/`: `howToPlayOpen` IS wired
(`HowToPlayOverlay.jsx` + `App.jsx`), but `blankPickerOpen`/
`blankPickerTileId`/`blankAssignments` have ZERO hits anywhere in `src/` —
the touch-mode blank-letter picker overlay has no React port at all. This is
squarely inside CombatScreen.jsx's own already-documented gap (c), the
tile-staging/drag system — touchMode isn't implemented in React at all yet,
so a standalone blank-picker port would be inconsistent with everything else
in that screen. Correctly deferred to (c) as a whole, not a new separate
finding.

While reading `game.js`'s blank-tile handling to understand that gap
(`selectTileForWord`'s comment: on desktop, clicking a blank tile is a
NO-OP — the player types the letter they want and `Lexicon.canFormFromRack`
resolves it from the rack, preferring a real letter tile over a blank), I
checked what `CombatScreen.jsx`'s own rack-tile `onClick` did for a blank
tile and found a real, live bug: `setWord((w) => w + tile.letter)` had no
guard at all, so clicking a blank tile (`tile.letter === '?'`) appended the
literal `?` character to the word field — a string `Lexicon.canFormFromRack`
can never resolve (`?` isn't a real letter a played word can contain), so
the word would just never validate. Vanilla's equivalent path is explicitly
a no-op for this exact case. Confirmed by grep that no existing Vitest test
exercised a blank-tile click at all (the fixed test seed's starting rack
happens to have no blank), so this had zero coverage and could ship
unnoticed.

**What changed (`src/components/CombatScreen.jsx`):**
- The rack-tile `onClick` now guards `tile.letter !== '?'` before appending,
  matching `selectTileForWord`'s desktop no-op exactly (a comment explains
  why, referencing the same vanilla function).
- The tile's `title` tooltip now explains blanks ("type the letter you
  want, it fills in automatically") instead of falling through to
  `variant`/`bonus` text — ordered AFTER the `isHexed` check so a hexed
  blank still shows "Hexed" (checked this ordering explicitly after an
  earlier pass got it backwards).

**New test (`src/components/__tests__/CombatScreen.test.jsx`):** since the
fixed seed's starting rack has no blank tile, one is injected directly via
`Tiles.createTile('?', null)` (the same helper `items.js` itself uses to add
blanks to a draw pile) pushed onto the real `state.player.rack`, then a real
`userEvent.click()` on the rendered blank tile's button (found by its `★`
glyph) — asserts the word input stays empty afterward. This is a regression
test for the exact bug found, not a coverage-padding test.

**Verified:**
- `npx vitest run`: 41/41 passing (40 pre-existing + 1 new), no flakes, ran
  twice (once before the title-ordering fix, once after) to confirm both
  changes independently.
- `npm test` (jsdom dom-check, full suite): ALL CHECKS PASSED — unaffected,
  `CombatScreen.jsx` isn't in that suite's tree.
- `npm run build`: clean, 39 modules, same pre-existing single-large-chunk
  notice as every prior run, no new warnings.
- `node test/verify-react-build.js` (real Chromium against a fresh `vite
  build` output): ALL CHECKS PASSED — full seeded playthrough (main menu →
  character select → run map → real fight, "RADIO" dropping monster HP
  52→44), zero console/page errors, no mobile overflow at 375/414px at any
  screen along the path. This run's fix doesn't touch that script's own
  playthrough path (its seed's starting rack has no blank either), so it
  doesn't directly exercise the fix, but confirms no regression from the
  edit.
- NOT re-run (untouched by this change): `test:mobile`, `test:qa`,
  `test:itch-build`, `test:run-header`, `test:audio`, `test:drag-interrupt`,
  `test:branching-map` — none target `src/`, and `wordbound.html`/`css/` are
  unchanged this run.

**Current state:** MAIN_MENU/CHARACTER_SELECT are confirmed full parity (no
action needed). A real, previously-invisible correctness bug in
CombatScreen's blank-tile handling is fixed and covered by a regression
test. STRUCTURAL's remaining open scope is unchanged and still exactly:
(a) `test:qa`'s deeper multi-floor/boss-reward-flow React equivalent, and
(c) the tile-staging/drag system (which now also subsumes the touch-mode
blank-letter picker port, confirmed missing this run) — no progress on
either this run, this was a separate audit+fix. Ticket stays unchecked.

**Not done / explicitly out of scope this run:** touch-mode input as a
whole is still entirely unported in React (confirmed again this run via the
blank-picker gap) — CombatScreen.jsx only implements the desktop type-or-
click path. (a) and (c) remain exactly as open as before.

**Next:** (c) the tile-staging/drag system is the most product-shaped
remaining piece and now has a slightly larger confirmed scope (touch-mode
staging AND the blank-letter picker together, since they're the same
touchMode-gated system in vanilla) — a future run should probably start
there. (a)'s `test:qa` React equivalent remains the other legitimate option.
Given three runs in a row have now done "audit what render()/renderX()
touches vs. what's actually ported" and found something each time
(items/deck/consumables, then this blank-tile bug), a similar audit pass
specifically over `renderCombat()`'s OWN full body (not just the
click-to-append substitute CombatScreen.jsx already documents as
deliberate) might be worth one more targeted look before committing to the
full drag-system build — flagging as a possible cheap check, not a
confirmed gap, since I did not have time to do it this run.

---

## 2026-08-21T18:31Z — STRUCTURAL 13/N: renderCombat() audit (clean, no new gap) + test:react-qa closes remaining scope (a)

**Repo-health note:** started on a detached HEAD at `origin/main`'s exact
commit (same pattern flagged by several prior runs). `git checkout main`
put it on a proper branch tracking origin; already up to date, no local
drift to lose, no `git reset --hard` needed. `npm install` was already
satisfied (node_modules present from a prior run's cache in this
container).

**What I did:** last run's "Next" note flagged a possible cheap audit —
read `renderCombat()` in `js/wordbound/game.js` line by line (lines
2949-3096) against `CombatScreen.jsx` to see if the same "audit turns up a
real gap" pattern that hit three runs running would repeat a fourth time.
It didn't: every difference found (touch-mode drag/tap-to-play tile
staging via `startTouchReorder`/`reorderRackOnDrop`, the blank-letter
picker overlay (`renderBlankPicker`/`state.blankPickerOpen`), per-hit
damage/HP-flash/screen-shake animations, the combo chip's one-shot
`comboBumpClass` pop, and the rack's `new-tile`/`tile-settle` cosmetic
classes) is already known and already correctly filed under STRUCTURAL's
remaining scope (c) — CombatScreen.jsx's own header comment and the last
run's update-4 note both already say so. A clean audit is itself a useful
result: it confirms this particular angle (render-body diffing) is now
exhausted for CombatScreen specifically, not that nothing is left overall.

Moved on to remaining scope (a): `test:qa`
(`test/orchestrator-qa-boss-reward.js`) drives wordbound.html's boss-kill
-> tile-reward -> boss-item-reward panel flow with real Playwright clicks;
nothing exercised that flow against the React/Vite app. Added
`test/verify-react-qa-boss-reward.js` (new, committed script, wired to
`npm run test:react-qa` + a matching `pretest:react-qa` ensure-deps
entry in `package.json`, same pattern as `test:react-build`), built
against a real `vite build` output statically served (never the dev
server — same bar `verify-react-build.js` established).

Deliberately narrower in scope than `test:qa` itself, for a documented
reason: real-word combat play is already double-covered by
`verify-react-build.js`'s full UI playthrough and
`CombatScreen.test.jsx`'s RTL suite, so re-proving "a real word drops real
HP" here would be redundant. Instead this script sets `monster.hp = 1` as
setup (the exact same convention `src/test/gameHelpers.js`'s
`defeatCurrentMonster` helper already uses and the Vitest suite already
relies on) and lands the actual kill via ONE real word typed into the
real input and submitted via a real click on the real Play Word button —
the thing genuinely under test is the reward-PANEL sequencing after that
kill, not the fight itself.

**A second real instance of the React re-render gotcha (found and worked
around, not just re-flagged):** the vanilla `test:qa` script forces a
re-render after jumping the run's map position to the boss node by calling
`window.Wordbound.Game.openDeckViewer(); window.Wordbound.Game.closeDeckViewer();`
directly via `page.evaluate` — in vanilla, any state-mutating `Game.*` call
triggers `render()` internally, so this is a legitimate "force a redraw"
trick there. I initially wrote this script the same way and it silently
produced a stale DOM: `RunScreen.jsx`'s `act()` (the only thing that calls
`bump()`, the useReducer-based force-update) is a local closure defined
inside the component, unreachable from `page.evaluate` — calling
`Game.openDeckViewer()` directly mutates `state.deckViewerOpen` but nothing
ever re-renders React to read it. Confirmed this by reading
`RunSidePanels.jsx`/`RunScreen.jsx` again before writing the fix: every
control in that file routes through `act(...)`, never a bare `Game.*` call.
Fixed by replacing the `page.evaluate` trick with a REAL UI click on the
run-header's "Deck" button (opens, via a real actionability-checked click
routing through the genuine `act()` cycle) then "Close" (closes the same
way) — this is the same "real UI-driven path forces the real re-render"
rule STRUCTURAL's update-2 note already established for a different case
(the VICTORY-screen re-render check), now applied to a second, independent
spot that would otherwise have shipped a script asserting against a stale
map.

**What changed:**
- `test/verify-react-qa-boss-reward.js` (new): builds `dist/app/` fresh,
  serves it statically on port 9883, then in one real-browser pass: reaches
  a deterministic run (seed `vitest-fixed-seed-1` + The Archivist, same
  known-good seed the rest of the React suite already relies on), jumps to
  floor 1's boss (setup, via the fixed re-render trick above), kills it via
  a real submitted word, asserts the tile-reward panel appears and the
  boss-reward panel does NOT (sequential, never stacked), real-clicks a
  tile choice, asserts the boss-reward panel appears with only rare/
  legendary options (`Items.ITEM_DEFS[id].rarity`, read-only query),
  real-clicks a claim, asserts the item chip count grows by exactly one and
  the floor advances by exactly one. Then repeats the boss-jump-and-kill at
  a 375px viewport for floor 2's boss, this time real-clicking Skip on both
  the tile reward and the boss reward, and checks the boss-reward panel's
  layout at that width (zero horizontal overflow, panel's right edge fits
  the viewport, every button's rendered height >=36px) — the first
  mobile-layout check of any kind against `RewardScreens.jsx`'s
  `.treasure-panel` shape. Asserts zero console/page errors and zero failed
  requests across the whole run throughout.
- `package.json`: added `pretest:react-qa` (`ensure-deps.js @playwright/test`,
  matching every other Playwright script's pattern) and `test:react-qa`.

**Verified:**
- `npm run test:react-qa`: ALL CHECKS PASSED, run twice in a row back to
  back with no flakes (both full 24-check passes identical) — confirms the
  re-render fix is solid, not a lucky single run.
- `npm test` (jsdom dom-check, full suite): ALL CHECKS PASSED — unaffected,
  none of this run's files are in that suite's tree.
- `npx vitest run`: 41/41 passing — unaffected (no `src/components/*.jsx`
  files were touched this run, only a new top-level test script + a
  `package.json` script entry).
- `npm run build`: clean, same pre-existing single-large-chunk notice every
  prior run has seen, no new warnings — confirms the new script's own
  internal `vite build` calls (it runs one fresh each invocation, like
  `verify-react-build.js` does) aren't masking a real build regression.
- NOT re-run (untouched by this change): `test:mobile`, `test:qa`,
  `test:itch-build`, `test:run-header`, `test:audio`, `test:drag-interrupt`,
  `test:branching-map`, `test:react-build` — none target the files touched
  this run (a new standalone script + one `package.json` block); the engine
  files (`js/wordbound/game.js`) and existing `src/` components are
  byte-for-byte unchanged.

**Current state:** STRUCTURAL's remaining scope (a) (`test:qa`'s React
equivalent) is now DONE. The only piece left before the ticket's own
stated acceptance bar ("full feature parity with the pruned v0.1 game, all
migrated gates green, no vanilla-DOM rendering left") is met is (c): the
tile-staging/drag system, which this run's audit reconfirmed also
subsumes touch-mode reordering, the blank-letter picker, and the hit/
combo-bump animation juice — all still unbuilt in React. Ticket stays
unchecked.

**Not done / explicitly out of scope this run:** (c) is completely
untouched — this run was audit + a new test script, not combat-UI work.
`test:itch-build` remains intentionally out of scope (packages
`wordbound.html`, not the React app, per GOALS.md's own note).

**Next:** (c) the tile-staging/drag system is now the ONLY item standing
between STRUCTURAL and full parity. It's a genuinely large, self-contained
build (pointer-capture-based drag, ghost-tile rendering, insertion-index
math, the touch-reorder finger-tracking state machine, the blank-letter
picker overlay, and the animation/combo-bump juice game.js's renderCombat()
already implements) — a future run should treat it as this ticket's last
multi-run push rather than trying to land it in one hour, and should
probably start by porting the blank-picker overlay and combo-bump class
first (small, self-contained, already fully read and understood by this
run's audit) before tackling full pointer-based drag reordering.
