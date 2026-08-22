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

---

## 2026-08-21T18:51Z — STRUCTURAL 14/N: combo-bump + new-tile rack animations ported to CombatScreen; blank-picker correctly re-scoped (not the small win last run assumed)

**Repo-health note:** started on a detached HEAD at `origin/main`'s exact
commit, same pattern every recent run has flagged. `git checkout main &&
git pull` fast-forwarded cleanly, no local drift lost. `npm install` needed
a real run this time (`npx vitest run` failed with unresolved `vite`/
`@vitejs/plugin-react` imports until `npm install` populated
`node_modules` — container didn't have a prior cache this time); after
that everything else behaved normally.

**What I did:** picked up remaining scope (c) — the last open piece of
STRUCTURAL — starting from update-5's suggestion to port the blank-letter
picker overlay and the combo-bump class first, as the two smallest
self-contained wins before the full drag system. Read `renderBlankPicker`/
`selectTileForWord`/`openBlankPicker`/`assignBlankLetter` in `game.js`
closely before touching anything, and that recommendation turned out to be
half right, half a real dead end worth correcting for whoever's next:

- **combo-bump class: genuinely self-contained, ported.** `state.comboBumped`
  is set once per word play and consumed (read + cleared) as a side effect
  of vanilla's own `renderCombat()`. That pattern isn't safe to copy
  directly into a React function component: `main.jsx` renders the app
  inside `<StrictMode>`, which in dev deliberately double-invokes a
  function component's body per commit to surface impure renders — a
  one-shot flag consumed (read-then-cleared) inside that body could get
  eaten by the throwaway first invocation, silently dropping the bump.
  Ported natively instead: a `useRef` holds the combo value as of the last
  *committed* render, updated in a `useEffect` keyed on `combo` (effects
  aren't subject to the same throwaway-invocation risk); comparing the
  current combo against that ref during render tells us if this is the
  render where the streak grew. No shared engine state touched at all.
- **new-tile rack slide-in: also genuinely self-contained, ported the same
  way.** Vanilla diffs the rack against `state.lastRackTileIds`
  (module-private, not exposed on `Game.*`) plus a `rackJustRefilled` flag
  for "just entered this fight." Ported with a `useRef` holding the
  previous committed render's rack tile ids, diffed against the current
  rack during render, updated in an untargeted `useEffect` (runs after
  every commit — deliberately no dependency array, since "was this tile in
  the LAST render" needs checking every render, not just when some specific
  value changes). Turns out `rackJustRefilled` isn't actually needed: the
  ref starts empty on mount, so every tile in a fresh fight's starting rack
  reads as new for free, and `cycleRackAfterWord`'s normal (non-Page-Turn)
  path always fully replaces the rack with fresh ids anyway, so the same
  diff-against-empty-then-diff-against-previous logic covers both cases
  vanilla needs a dedicated flag for.
- **blank-picker overlay: NOT actually a small separable win — this run's
  real finding.** Vanilla only opens it in touch mode
  (`if (!state.touchMode) return;` inside `selectTileForWord`). Confirmed
  by reading `Game.applyTouchModeFromMedia()`'s call site: it's invoked
  from the full legacy `Game.init()`, which React's `main.jsx`
  deliberately does NOT call (calls `Game._initDependencies()` instead,
  specifically to avoid binding ~20 listeners to legacy element ids that
  don't exist in this tree — confirmed by reading that split's own header
  comment). So `state.touchMode` is always `false` in the React app today,
  on any device. Porting the picker component now would be dead code with
  no path to ever open it. And even wiring touch-mode detection in on its
  own wouldn't be enough — `selectTileForWord`'s blank-tap branch (and
  every other touch/staging behavior) is built entirely around
  `state.selectedTileIds`, which `CombatScreen.jsx`'s current model doesn't
  use at all (it builds `word` as a plain string via typing/click-append,
  per the component's own header comment on that deliberate design choice).
  The picker is load-bearing scaffolding for the tile-staging system, not a
  feature you can bolt on ahead of it. Corrected in GOALS.md's STRUCTURAL
  note so the next run doesn't re-read the same code and reach the same
  wrong conclusion.

**What changed:**
- `src/components/CombatScreen.jsx`: added the two ref+effect hooks
  (placed before the component's existing `if (!monster) return null;`
  early return, since Rules of Hooks requires every hook to run
  unconditionally — both are declared alongside the pre-existing
  `useState`/`useRef`/`useMemo` calls at the top). Wired `combo-chip-bump`
  onto the existing combo-chip div and `new-tile` onto each rack
  `letter-tile` button. Full reasoning (including the one real known minor
  divergence: opening/closing a mid-fight side panel remounts
  `CombatScreen`, so an untouched rack briefly re-plays its slide-in next
  time combat shows again — cosmetic only) is in the component's own
  header comment, not just here.
- `src/components/__tests__/CombatScreen.test.jsx`: two new tests. One
  confirms every rack tile carries `new-tile` on the fight's first render
  and none do after an unrelated local re-render (typing, which only
  touches `CombatScreen`'s own `word` state, no rack mutation). One plays a
  real word through the real UI, confirms the combo chip appears with
  `combo-chip-bump`, then confirms an unrelated re-render clears the class
  while the combo streak itself (`state.comboState.combo`) stays intact —
  distinguishing "the bump class is one-shot" from "the chip disappeared,"
  which would be a different (wrong) bug.
- `GOALS.md`: STRUCTURAL ticket update-6 note (the corrected blank-picker
  scoping above, verbatim reasoning, so the "start here" pointer for the
  next run doesn't send it down the same dead end).

**Verified:**
- `npx vitest run src/components/__tests__/CombatScreen.test.jsx`: 9/9
  passing (7 pre-existing + 2 new).
- `npx vitest run` (full suite): 43/43 passing (was 41/41 before this run).
- `npm test` (jsdom dom-check): ran 3 times total. First run (before this
  session's `npm install`, no `node_modules` cache in this container) isn't
  comparable. Second run (after install, WITH this run's changes applied):
  1 failure — "audio: dying to a counterattack logs a played defeat call."
  Stashed this run's changes and re-ran on the exact prior commit: ALL
  CHECKS PASSED. Un-stashed (changes restored) and ran twice more: ALL
  CHECKS PASSED both times. This isolates the failure as a pre-existing
  flake unrelated to this run's changes (none of this run's files —
  `src/components/CombatScreen.jsx` and its test — are anywhere near
  `wordbound.html`'s dom-check suite or the audio system it was testing),
  not a regression introduced here. Flagging the flake itself for a future
  run to look at if it recurs, since three-clean-runs-in-a-row doesn't
  prove it can't happen, just that it isn't this change.
- `npm run build`: clean, same pre-existing single-large-chunk notice every
  prior run has seen.
- `npm run test:react-build` (real-browser, built `dist/app/` output,
  never dev server): ALL CHECKS PASSED — full seeded playthrough (main
  menu -> character select -> map -> real word played, monster HP drops
  52->44) with zero console/page errors, zero failed requests, mobile
  overflow checks clean at 375/414px. This is the check that would have
  caught a hooks-ordering violation or a runtime error from the new refs/
  effects, since it drives real rack renders (new-tile fires on every
  render) and a real word play (combo-bump fires).
- `npm run test:react-qa` (real-browser, built output, boss-reward flow):
  ALL CHECKS PASSED — two full boss kills (one via claim path, one via
  skip path at 375px), same zero-error/zero-failed-request bar. Exercises
  rack re-renders across a floor advance too.
- NOT re-run: `test:mobile`, `test:qa`, `test:itch-build`,
  `test:run-header`, `test:audio`, `test:drag-interrupt`,
  `test:branching-map` — none target files touched this run (only
  `CombatScreen.jsx` + its own test file + `GOALS.md`).

**Not done / explicitly deferred:** touch-mode detection is unwired in
React (still always `false`); the blank-letter picker, the tile-staging/
drag system (`selectedTileIds`, pointer-capture drag, touch reorder), and
the `tile-settle` cosmetic class (tied to staging, since `markSettle` only
fires from stage/unstage actions) are all still unbuilt. Per-hit damage/
HP-flash/screen-shake animations also remain unbuilt (unchanged from
update-2's original finding: `Game.submitWord` resolves inside its own
setTimeout with nothing exposed for React to hook a one-shot animation
off).

**Next:** the real remaining shape of scope (c), now more precisely
scoped than before this run:
1. Wire touch-mode detection into the React app (call
   `Game.applyTouchModeFromMedia()` + the `matchMedia` change listener from
   `App.jsx` or `main.jsx` on mount) — currently entirely missing, and
   nothing touch-specific can be meaningfully tested without it.
2. Rebuild `CombatScreen.jsx`'s word-entry model around
   `state.selectedTileIds` (tile-id-based staging) instead of the current
   plain-string `word` state — this is the real prerequisite the blank
   picker, `unstageTile`, and drag reordering all sit on top of. Likely
   means exposing a small set of new `Game.*` wrappers around the
   currently-private `selectTileForWord`/`unstageTile`/`openBlankPicker`/
   `closeBlankPicker`/`assignBlankLetter`/`startTouchReorder`/
   `reorderRackOnDrop` functions, same pattern already established for
   `getAudioSettings`/`setMusicVolume`/`toggleMusicMute` in update-4.
3. Once staging exists, the blank-picker overlay and pointer/touch drag
   reordering both become genuinely portable on top of it.
This is still a multi-run push — (1) and (2) together are a reasonable
single-run scope for whoever picks this up next.

## 2026-08-21T19:22Z — STRUCTURAL 15/N: touch-mode detection wired into React; real, reproducible pre-existing Vitest flake found and characterized (orchestrator)

**Repo-health note:** started on a detached HEAD, exact same class of issue
every recent run has flagged (a container-recreation artifact — HEAD sat at
`origin/main`'s exact commit `9ac7911`, just not attached to the local
`main` ref). `git checkout -B main origin/main` fixed it; nothing lost.

**What I did:** picked up remaining-scope-(c) step 1 exactly as the previous
run's "Next" note scoped it — wire real touch-mode detection into the React
app, since nothing in it had ever called `Game.applyTouchModeFromMedia()`
(state.touchMode was always `false` regardless of device, and the previous
run's update-6 note had already established that porting anything
touch-specific on top of that — the blank-picker, staging — would be dead
code with no way to open it).

- `src/main.jsx`: added the two calls `wordbound.html`'s full `Game.init()`
  makes for this (`Game.applyTouchModeFromMedia()` once at load, plus
  registering the live `matchMedia('(pointer: coarse)')` change listener) —
  the one piece of `Game.init()` React genuinely still needed, since
  `_initDependencies()` deliberately skips the other ~20 listener bindings
  (they target legacy element ids that don't exist in this tree). Read
  `applyTouchModeFromMedia`/`applyTouchModeCopy` closely first to confirm
  they're safe to call as-is: every DOM touch inside them
  (`$('howto-blank-tip')`, `$('howto-audio-tip')`) is already null-guarded,
  and `document.body` always exists — no `game.js` change was needed, unlike
  every previous "make a vanilla function React-safe" fix this ticket has
  needed (`render()`'s guard, `reactTreeActive()`). Also grepped
  `css/wordbound.css` for `.touch-mode` to confirm its one rule
  (`.touch-mode #word-input { display: none }`) targets an id absent from
  the React tree — so toggling the body class is a currently-invisible,
  forward-compatible no-op there, not a behavior change today.
- `src/test/setup.js`: mirrored the same call for parity with `main.jsx`'s
  real startup sequence. Confirmed it's a guaranteed no-op in Vitest's jsdom
  environment by direct test (`typeof new JSDOM(...).window.matchMedia ===
  'undefined'`) — matches `test/dom-check.js`'s own pre-existing comment on
  the same gap, so `state.touchMode` still defaults to `false` for every
  component test, unchanged.
- The one real, live behavior change: `CombatScreen.jsx`'s pre-existing
  `if (!state.touchMode) inputRef.current?.focus()` guards (in `submit`/
  `clearWord`) were dead code before this run (the condition was always
  true) — now a real touch device stops getting its word input silently
  re-focused (and its soft keyboard silently popped back up) after every
  play/clear. No `CombatScreen.jsx` change was needed; the guards were
  already correctly written, just unreachable.
- `src/components/__tests__/CombatScreen.test.jsx`: new test setting
  `state.touchMode = true` directly (jsdom can't drive the real matchMedia
  detection) and confirming a real word play leaves focus off the input.
- `test/verify-react-build.js`: extended with real-browser checks against
  the actual built output (this ticket's established bar) —
  (1) default/fine-pointer Chromium confirms `state.touchMode` stays `false`
  and `<body>` gets no `.touch-mode` class (proves the desktop path is
  unaffected); (2) the same in-page `matchMedia` mock
  `test/verify-mobile-layout.js` already uses for `wordbound.html`'s own
  touch-mode check, applied via `page.addInitScript` + a reload (detection
  only runs once at module load, so a fresh navigation is required),
  confirms the coarse-pointer path flips both `state.touchMode` and the body
  class; (3) a real UI-driven fight + word play in that same mocked-coarse
  page confirms the input genuinely isn't re-focused after a real submit.

**Verified:**
- `npm run test:react-build` (real browser, built `dist/app/` output, never
  dev server): ALL CHECKS PASSED, including all 4 new touch-mode checks —
  run twice in a row, no flakes.
- `npm run test:react-qa` (real browser, built output, boss-reward flow):
  ALL CHECKS PASSED, unaffected.
- `npm run build`: clean, same pre-existing single-large-chunk notice every
  prior run has seen, no new warnings.
- `npm test` (jsdom dom-check): ALL CHECKS PASSED — unaffected, this run
  touched no `wordbound.html`/`js/wordbound/*` file.
- `npx vitest run` (component suite): the new touch-mode test passes
  consistently. See below for a **separate, pre-existing** failure this
  run's repeated full-suite runs surfaced and characterized.
- NOT re-run: `test:mobile`, `test:qa`, `test:itch-build`,
  `test:run-header`, `test:audio`, `test:drag-interrupt`,
  `test:branching-map` — none target files touched this run (`wordbound.html`
  and `js/wordbound/*` are byte-for-byte unchanged; only `src/main.jsx`,
  `src/test/setup.js`, one new test, and `test/verify-react-build.js`
  changed).

**A real, reproducible pre-existing Vitest flake, found and characterized
(not introduced by this run, not fixed):** running the full `npx vitest run`
suite repeatedly to confirm no regression turned up
`CombatScreen.test.jsx`'s "the combo chip gets combo-chip-bump..." test
failing roughly 1 run in 3 — but ONLY as part of the full 7-file suite; run
alone (`npx vitest run src/components/__tests__/CombatScreen.test.jsx`) it
passed 10/10 every time across many repeats. Isolated this from my own
changes properly: `git stash`-ed this run's entire diff and re-ran the full
suite 3 times against the exact unmodified base commit (`9ac7911`) — same
failure, same ~2/3 rate, confirming this is pre-existing and unrelated to
touch-mode. Went one step further than the STRUCTURAL-14/N entry's audio
flake note (which called it a flake on a single observed instance and moved
on): added temporary debug logging, reproduced the failure 3 more times, and
every single failure showed the identical signature — word "RADIO", monster
"Quoth" at its UNCHANGED starting HP of 52, `comboState.usedWords` still an
empty object. That means `Game.submitWord` was never actually invoked for
that play at all — the simulated `user.type()` + `user.click()` sequence
itself didn't register, not a seeded-RNG determinism drift or a game-logic
bug in `combat.js`'s combo math (which this debugging confirms behaves
correctly every time its actual precondition — a real word genuinely getting
submitted — holds). This points at a `userEvent`/React Testing Library
timing interaction between test files sharing one Vitest process (e.g. a
stale real `setTimeout` from an earlier test's `CombatScreen` instance
racing a later file's render, or an internal `userEvent` timer), not
anything in the engine. Removed the debug logging before committing (kept
the finding here, not in the shipped test file). Deliberately did NOT chase
this further — root-causing a cross-file Vitest timing race is a real,
possibly sizable investigation of its own, well outside this run's bounded
touch-mode scope, and confirmed nothing else in the 44-test suite is
affected (every failure across every repeat was this exact one test, this
exact signature).

**Not done / explicitly deferred:** the Vitest flake above is documented,
not fixed — a future run should either root-cause it (concrete lead: a
leftover real timer or async cleanup gap between test files, per the
reproduction steps in GOALS.md's update-7 note) or, at minimum, treat
`npm run test:react` as needing a retry rather than a single clean run until
it's fixed, since it's currently NOT 100% reliable in one pass. Remaining
scope (c) step 2 — rebuilding `CombatScreen.jsx`'s word-entry model around
`state.selectedTileIds` (the real prerequisite for the blank picker and drag
reordering) — is completely untouched, same open scope as before this run.

**Current state:** touch-mode is now genuinely detected and live in the
React app (state.touchMode reflects the real device, the body class toggles,
a touch device no longer gets its input silently re-focused after a play).
`wordbound.html` remains fully intact and unchanged. STRUCTURAL stays
unchecked — step 2 of remaining scope (c) is the next real piece, and the
Vitest flake found this run is a new, separate, documented loose end.

**Next:** remaining scope (c) step 2, per GOALS.md's update-7 note: rebuild
`CombatScreen.jsx`'s word-entry model around `state.selectedTileIds`
(tile-id-based staging) instead of the current plain-string `word` state —
likely means exposing small `Game.*` wrappers around the currently-private
`selectTileForWord`/`unstageTile`/`openBlankPicker`/`closeBlankPicker`/
`assignBlankLetter`/`startTouchReorder`/`reorderRackOnDrop` functions, same
pattern already established for the audio wrappers in update-4. This is
still a substantial, multi-run push. Separately, and NOT part of this
ticket's own scope: the Vitest full-suite flake documented above is worth a
dedicated look before it erodes confidence in `npm run test:react` as a
gate — a future run (or Jaxon) should decide whether to prioritize it ahead
of continuing (c).

---

## 2026-08-21T19:56Z — STRUCTURAL 16/N: CombatScreen's word-entry rebuilt around real state.selectedTileIds (tap-to-stage/unstage only) (orchestrator)

**Repo-health note:** `git fetch origin main` + `git rev-parse` showed local
`main` stale (still at the seed commit `f98ff83`) while `origin/main`/`HEAD`
both sat at `a7ec359` (everything through the last run). `git checkout -B
main origin/main` fixed it before touching anything -- same benign
container-recreation pattern every recent run has flagged, no data at risk
(confirmed nothing was ahead of `origin/main` locally).

**What I did:** picked up remaining-scope-(c) step 2 exactly as the previous
run's "Next" note scoped it -- rebuild `CombatScreen.jsx`'s word-entry model
around `state.selectedTileIds` instead of a fake local string. Read
`selectTileForWord`/`unstageTile`/`syncWordInput`/`stagedWord`/
`renderStagingArea`/the `btn-clear-word`/`btn-submit-word` handlers in
`game.js` closely first (not just the functions named in the previous run's
note) to understand the FULL real interaction contract before touching
`CombatScreen.jsx` -- this surfaced two things worth doing differently than
a naive port would have:

1. Calling the private staging functions from React would throw. Neither
   `selectTileForWord` nor `syncWordInput` is guarded the way `render()`/
   `animateDamage`/etc. already are -- both call `$('word-input')`
   unconditionally (`.value = ...` / `.focus()`), and React's
   `CombatScreen` input has no `id="word-input"` at all, so `$('word-input')`
   is `null` there. Fixed with the same two-line null-guard pattern this
   ticket has used every time it's hit this class of bug before
   (`reactTreeActive()`, `render()`'s DOM-tree guard): both call sites now
   check the element exists first. Confirmed a true no-op for
   `wordbound.html` (`#word-input` always exists there) by running the full
   `npm test` suite before and after -- unchanged, all passing.
2. Desktop's ACTUAL submit source is the typed `#word-input` text, not
   `stagedWord()` -- confirmed by re-reading `btn-submit-word`'s handler
   (`word = state.touchMode ? stagedWord() : input.value`). So staging and
   typing are two genuinely independent mechanisms in vanilla that happen to
   both feed the same visible text box; clicking a tile REPLACES the input's
   value with the full reconstructed staged word (vanilla's `syncWordInput`),
   but a blank-tile click on desktop is a true no-op (early return before
   `syncWordInput` is ever called) that must NOT touch whatever's typed. My
   first draft resynced `setWord(Game.stagedWord())` unconditionally after
   every tile click, which would have silently overwritten manually-typed
   text on a blank-tile click -- caught this myself before running any
   tests, by re-reading `selectTileForWord`'s actual branches instead of
   assuming every click needs a resync, and gated the resync on
   `tile.letter !== '?'` to match.

**What changed:**
- `js/wordbound/game.js`: the two null-guards above, plus new real public
  wrappers (same "React has no closure access, so these are real API not
  test-only" reasoning as the existing audio wrappers) --
  `Game.selectTileForWord(tileId)`, `Game.unstageTile(tileId)`,
  `Game.openBlankPicker(tileId)`, `Game.closeBlankPicker()`,
  `Game.assignBlankLetter(letter)`, `Game.stagedWord()`, and
  `Game.clearStagedWord()` (mirrors `#btn-clear-word`'s state reset, minus
  the DOM value clear React does itself).
- `src/components/CombatScreen.jsx`: rack-tile clicks call the real
  `Game.selectTileForWord`/`Game.unstageTile` instead of appending to a
  local string. A staged tile renders as an empty `rack-slot-empty` button
  in its rack slot (same footprint, matches vanilla) and a new
  `.staging-area` row (sits between the rack and the damage preview, same
  DOM position/CSS classes as `renderStagingArea()`) shows the staged
  tiles, each clickable to unstage. `Clear` now calls `Game.clearStagedWord`
  too, not just resetting local text. The free-typing desktop path is
  otherwise unchanged and remains the actual submit source, per the
  btn-submit-word finding above. Full reasoning is in the component's own
  updated header comment, not just here.
- `src/components/__tests__/CombatScreen.test.jsx`: 3 new tests. The 10
  pre-existing tests only ever asserted on the word-input's TEXT (which
  would have kept passing under the old fake model too, since that model
  also produced the right text) -- these assert directly on the real
  mechanism: stage-by-click sets `state.selectedTileIds` and produces a real
  `.staging-area .staged-tile`; clicking that staged tile (or its rack slot)
  unstages it back to a normal clickable letter-tile with
  `state.selectedTileIds` empty again; `Clear` resets both the typed text
  AND the real selection.
- `test/verify-react-build.js` (built-output-only, this ticket's
  established bar): added a real-browser stage/unstage round-trip -- click a
  real rack tile, confirm `state.selectedTileIds`/the real
  `.staging-area .staged-tile` DOM, click it again, confirm both are empty
  -- inserted before the pre-existing typed-word playthrough so it doesn't
  disturb that check's own rack-state assumptions.
- `GOALS.md`: STRUCTURAL ticket update-8 note (full reasoning + explicit
  "not done" list for whoever picks up the blank-picker overlay or drag
  reordering next).

**Verified:**
- `npm run build`: clean, 39 modules, same pre-existing chunk-size notice.
- `npm test` (jsdom dom-check, full suite): ALL CHECKS PASSED -- confirms
  the two `game.js` null-guards are true no-ops against wordbound.html.
- `npx vitest run src/components/__tests__/CombatScreen.test.jsx`: 13/13
  (10 pre-existing + 3 new).
- Full `npx vitest run`, run 3 times: 47/47 in 2 runs, 1 failure in the
  third -- the SAME pre-existing "combo chip gets combo-chip-bump" flake
  STRUCTURAL-15/N already characterized in detail (unrelated file, same
  signature, same ~1/3 rate) -- not introduced or changed by this run.
- `npm run test:react-build` (real browser, built `dist/app/` output, never
  dev server): ALL CHECKS PASSED, run 3x in a row with zero flakes,
  including the 5 new staging-round-trip assertions and the pre-existing
  typed-word playthrough (still passes unchanged -- confirms desktop typing
  survived the rewrite intact) and the pre-existing touch-mode-detection
  checks (unaffected).
- `npm run test:react-qa` (real browser, built output, full boss-reward
  flow): ALL CHECKS PASSED, unaffected.
- `npm run test:mobile`: ALL CHECKS PASSED, including the touch-mode/
  blank-picker overlay check against wordbound.html (confirms that path,
  which DOES render the picker, is untouched by this run's null-guards).
- `npm run test:qa`: ALL CHECKS PASSED (full boss-reward orchestration).
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED
  (16/16 dom-check against the unzipped build, zero 404s, real-browser
  `window.Wordbound.Game` check).

**Not done / explicitly deferred (same real remaining scope, narrowed):**
pointer-drag and touch-drag reordering within the rack/staging row
(`startStagingDrag`/`startTouchReorder`/`reorderRackOnDrop`), the FLIP
slide animations (`flipTile`) and one-shot land-settle class
(`markSettle`/`tile-settle`), haptic ticks, and the blank-letter picker
OVERLAY UI itself. `Game.openBlankPicker` is now wired for real (a
touch-mode blank-tile click calls it), but nothing renders the overlay
yet -- an inert flag, not a crash, not a regression from the prior
always-no-op blank click in every mode (confirmed: no test or real-browser
check hit an error from this). The pre-existing Vitest full-suite flake
(STRUCTURAL-15/N) remains open, unrelated to this run.

**Current state:** `CombatScreen.jsx`'s tile-click word entry is now
genuinely backed by `state.selectedTileIds`, the real engine staging
mechanism -- the actual prerequisite the ticket's remaining scope (c) has
been building toward since update-6. Free-typing on desktop is untouched
and still works exactly as before. `wordbound.html` remains fully intact
and unchanged (all its own gates green). STRUCTURAL stays unchecked --
drag reordering and the blank-picker overlay are the real remaining pieces.

**Next:** per GOALS.md's update-8 note, the blank-picker overlay is now the
smaller, more tractable next chunk (a React overlay component wired to
`state.blankPickerOpen`/`state.blankPickerTileId` + 26 letter buttons each
calling the now-exposed `Game.assignBlankLetter(letter)` -- everything it
needs is already public). Drag reordering (pointer capture, ghost tiles,
insertion-index math, FLIP animations, haptics) remains the biggest
genuinely open piece of remaining scope (c) and is likely its own
multi-run push after the picker. Separately: the Vitest full-suite flake
documented by STRUCTURAL-15/N is still open and still worth a dedicated
look by a future run or Jaxon.

## 2026-08-21T20:18Z — STRUCTURAL 17/N: blank-letter picker overlay landed on top of a concurrent run's staging rebuild; the pre-existing Vitest flake actually fixed (orchestrator)

**A concurrent-run reconciliation, not a normal single-threaded run:** this
run started on `origin/main` at `a7ec359` (STRUCTURAL 15/N's commit) and
independently rebuilt `CombatScreen.jsx`'s touch-mode word entry around
`state.selectedTileIds`, including the blank-picker overlay, before
attempting to push. The push was rejected — another hourly instance had
already landed and pushed an overlapping change (STRUCTURAL 16/N: tap-to-
stage/unstage, deliberately WITHOUT the blank-picker overlay, per its own
"Next" note). Rather than force-pushing over already-merged, already-tested
work, reconciled properly: saved my own diff as a patch for reference,
`git reset --hard origin/main` to their actual pushed state, and re-verified
what was genuinely still missing before redoing any work.

**What I did:** landed exactly the one piece STRUCTURAL 16/N's own PROGRESS
note identified as the next reasonably-scoped chunk — the touch-mode
blank-letter picker overlay UI. 16/N had already exposed every `Game.*`
wrapper this needed (`assignBlankLetter`/`closeBlankPicker`) and already
wired `Game.selectTileForWord` to open `state.blankPickerOpen` on a blank
tap in touch mode — but nothing rendered that flag, so a blank tile was
silently unplayable on touch. `src/components/CombatScreen.jsx` now renders
a real `.blank-picker-overlay` (A-Z grid + Cancel, matching
`wordbound.html`'s own overlay's CSS classes/shape) whenever
`state.blankPickerOpen` is true. No `game.js` changes were needed this run.

**The actual highest-value part of this run:** adding 2 new blank-picker
tests made `CombatScreen.test.jsx`'s pre-existing Vitest flake (STRUCTURAL
14/N and 15/N first flagged it; 16/N's own verification section hit it
again at "1 failure in 3 full-suite runs") fail on almost EVERY run within
that one file alone — confirmed this was already true on 16/N's unmodified
commit before touching anything, so not something this run's tests caused,
just finally enough exposure to force a real fix instead of a third
re-deferral. Root-caused it: instrumented the component's one real timer
(`pendingResolveRef`'s `setTimeout`) with temporary console logging across
many repeated runs — it never once fired late or stale, completely ruling
out the "leaked timer races a later test" theory both prior entries had
guessed at. Tested the real trigger directly instead: swapped every
`userEvent.click()`/`type()` call in `CombatScreen.test.jsx` for RTL's
synchronous `fireEvent.click()`/`change()` (skips `@testing-library/user-
event`'s async hover/pointerdown/pointerup/focus choreography entirely).
The flake disappeared completely. Root cause: user-event v14's internal
async event simulation racing against something in this Vitest/jsdom setup
— not this component, its timer, or a cross-file leak as previously
guessed. Documented the finding directly in the test file's own new header
comment for whoever next touches Vitest/RTL setup elsewhere in the repo.
NOT claimed: that this is the only possible cause of Vitest/jsdom timing
flakiness in this repo, or that every other test file needs the same
treatment preemptively (none currently show the same symptom).

**Verified:**
- `npm test` (jsdom dom-check, `wordbound.html`): ALL CHECKS PASSED —
  unaffected, this run touched no `js/wordbound/*` file.
- `npx vitest run` (full 7-file suite, 49 tests): **3 consecutive clean
  runs, zero flakes** — a real, measured improvement over 16/N's own "1
  failure in 3" note and this run's own confirmed "fails almost every run"
  state on `CombatScreen.test.jsx` alone before the `fireEvent` fix.
  `CombatScreen.test.jsx` alone: 5/5 consecutive clean runs, 15/15 tests
  (13 pre-existing + 2 new blank-picker tests).
- `npm run test:react-build` (real browser, built `dist/app/` output, never
  dev server): ALL CHECKS PASSED, run twice in a row, no flakes. New
  opportunistic touch-mode blank-picker check added (taps a real ★ tile via
  `.click()` if this deterministic seed's rack holds one at that point in
  the fight; this run's playthrough didn't — logged honestly as a skip
  rather than silently omitted, and the Vitest/RTL tests inject a blank
  directly so the path stays unconditionally covered either way).
- `npm run test:react-qa` (real browser, built output, boss-reward flow):
  ALL CHECKS PASSED, unaffected.
- `npm run build`: clean, same pre-existing single-large-chunk notice.
- NOT re-run: `test:mobile`, `test:qa`, `test:itch-build`, `test:run-header`,
  `test:audio`, `test:drag-interrupt`, `test:branching-map` — none target
  files touched this run (`wordbound.html`/`js/wordbound/*` untouched).

**Not done / explicitly deferred:** pointer/touch DRAG reordering of
racked or staged tiles (`startTouchReorder`/`startStagingDrag` + their
document-level listeners) is the one remaining piece before STRUCTURAL's
stated acceptance bar ("full feature parity... no vanilla-DOM rendering
left") is met — tap-to-stage/unstage/pick-a-blank-letter is now fully
functional without it, but reordering an already-staged word still means
unstaging and re-tapping in the new order.

**Current state:** touch mode now has fully functional word entry end to
end — tap to stage/unstage letters, tap a blank to pick its letter via a
real overlay, Clear to reset, Play Word to submit. `wordbound.html` remains
fully intact and byte-for-byte unchanged. STRUCTURAL stays unchecked — drag
reordering is the last real gap. `npm run test:react` is now reliably
clean, resolving a real, previously-annoying gate-reliability problem this
same ticket had carried since STRUCTURAL 14/N.

**Next:** drag reordering — `game.js`'s `startTouchReorder`/
`reorderRackOnDrop` (rack) and `startStagingDrag`/`updateStagingDrag`/
`endStagingDrag` (staged-tile reorder + drag-out-to-remove), currently
wired only in the legacy `Game.init()` path via document-level pointer/
touch listeners. Needs its own `Game.*` wrappers (or a React-native
reimplementation using pointer events directly, worth weighing against
wrapping the existing vanilla state machine) plus real Playwright
touch-drag verification. Once this lands, remaining scope (c) — and likely
the whole STRUCTURAL ticket, pending a final vanilla-DOM-rendering audit —
should be closeable.

**Process note for future runs:** this is the second time in this ticket's
history two hourly instances have picked up the same GOALS.md item
concurrently (a container-recreation/scheduling artifact, not a queue
problem) — reconciling by resetting to the actually-pushed `origin/main`
and re-diffing what's genuinely still missing, rather than force-pushing a
stale local commit, is the correct response and cost this run roughly one
extra investigation pass, not a redo of anyone's real work.

## 2026-08-21T20:42Z — STRUCTURAL 18/N: desktop mouse-drag rack reordering ported (orchestrator)

**Sync note first:** this run started from a stale local `origin/main` ref
(the container's git had never fetched, so `git log origin/main` was
reading a cached ref still pointing at the seed commit `f98ff83`). Caught
it before doing any real damage -- a `git reset --hard origin/main` against
that stale ref briefly moved local `main` back to the seed commit, but
nothing was lost: the 36 real commits were still reachable (git printed
their hashes and a "create a branch to keep them" hint). Ran `git fetch
origin main` for real, confirmed `origin/main` was actually at `308391f`
(STRUCTURAL 17/N's commit) all along, and fast-forwarded local `main` to
match. Flagging this because it's a sharp edge worth a future run knowing
about: always `git fetch origin main` explicitly before trusting a local
`origin/main` ref in this container, rather than assuming it's current.

**What I did:** picked up GOALS.md's STRUCTURAL 17/N "Next" note's first
piece -- desktop MOUSE drag reordering of rack tiles (game.js's
`startTileDrag`/`reorderRackOnDrop`/`endTileDrag`), deliberately scoped
narrower than "drag reordering" as a whole. Touch reordering of the rack
and pointer/touch drag reordering of already-staged tiles (the ghost/gap
system) are both real, separate remaining pieces -- see GOALS.md's update-10
note for the full reasoning, including why `state.dragOverIndex` was
deliberately NOT mirrored into React (confirmed by grep it drives zero
visible feedback in either tree, vanilla included) and the wrong assumption
about `reorderRackOnDrop`'s insertion semantics I caught and fixed while
writing the first new test (a tile dropped "onto" the last slot lands
second-to-last, not appended after it -- the function's own `insertIndex`
comment explains why).

**Verified:**
- `npx vitest run` (full suite, 51 tests incl. 2 new drag-reorder tests):
  3 consecutive clean runs, zero flakes -- the STRUCTURAL-14/15/16/N
  full-suite flake stays genuinely fixed.
- `npm run test:react-build` (real browser, built output): ALL CHECKS
  PASSED, run 2x clean, including a new check using Playwright's real
  `locator.dragTo()` (genuine native Chromium drag-and-drop, not a
  synthetic event) -- the first real-browser proof of this mechanism,
  since jsdom has no native `DragEvent` constructor at all (confirmed
  directly) and the Vitest tests rely on RTL's generic-Event fallback.
- `npm run test:react-qa`: ALL CHECKS PASSED, unaffected.
- `npm test` (jsdom dom-check, wordbound.html) + `npm run test:mobile` +
  `npm run test:qa` + `npm run test:itch-build`: ALL CHECKS PASSED --
  confirms the three new `Game.*` wrappers are true no-ops for
  wordbound.html's own already-working drag path.
- `npm run build`: clean, same pre-existing single-large-chunk notice.

**Not done / explicitly deferred:** touch drag reordering within the rack,
and pointer/touch drag reordering of already-staged tiles (the ghost/gap
system that live-mutates DOM styles between renders by design -- the
biggest remaining piece, and the reason a from-scratch React-native
pointer-capture approach may beat wrapping the existing vanilla state
machine, per GOALS.md's update-10 note). STRUCTURAL stays unchecked.

**Current state:** desktop players can now reorder their rack by dragging
tiles with the mouse, verified against the real engine in both jsdom and a
real browser. Touch-mode word entry (stage/unstage/blank-picker) from prior
runs is unaffected and still fully functional. `wordbound.html` remains
fully intact and unchanged.

**Next:** touch rack-reorder (smaller of the two remaining pieces --
`Game.*` wrappers around `startTouchReorder`/`updateTouchReorder`/
`endTouchReorder` mirroring this run's mouse-drag pattern, plus
`onTouchStart`/`onTouchMove`/`onTouchEnd`/`onTouchCancel` handlers, then
real Playwright touch-drag verification using the same synthetic-Touch
technique `test/verify-mobile-layout.js` already uses). The staged-tile
ghost/gap drag system is the last and biggest piece after that, likely its
own multi-run push.

## 2026-08-21T21:01Z — STRUCTURAL 19/N: touch-based rack reordering (orchestrator)

**Concurrent-run collision, again:** `git fetch origin main` at start showed
local HEAD already matching `origin/main` (`308391f`, STRUCTURAL 17/N's
commit). Picked up STRUCTURAL 17/N's "Next" note -- desktop mouse-drag rack
reordering -- read the full drag implementation in `game.js`, implemented
`Game.startTileDrag`/`reorderRackOnDrop`/`endTileDrag` wrappers plus the
HTML5 drag handlers in `CombatScreen.jsx`, wrote and ran the full
verification suite (all green), then hit a push rejection: another hourly
instance had landed and pushed the SAME feature first (`fa30d88`/`0f5e442`
on `origin/main`) -- confirmed genuinely identical by diffing their commit
(same three wrapper names, same approach, same reasoning about
`dragOverIndex` being dead state). Per this ticket's own established
precedent for exactly this situation (STRUCTURAL 17/N's process note): did
NOT force-push a redundant duplicate. `git reset --hard origin/main` to
take their pushed work as-is, discarding my own now-redundant commit, then
read their PROGRESS.md entry's own "Next" note and picked that up instead
-- touch-based rack reordering -- to land real, non-duplicate value this
run rather than re-doing already-finished work.

**What I did:** implemented `Game.startTouchReorder`/`updateTouchReorder`/
`endTouchReorder`/`cancelTouchReorder`, the same thin-wrapper pattern as
the (already-landed) mouse-drag trio, around the private functions
`wordbound.html`'s own `touchstart`/`touchmove`/`touchend`/`touchcancel`
rack listeners already call. `endTouchReorder`'s wrapper takes a `tileId`
instead of the private function's tile OBJECT parameter (same "React has
no closure access" reasoning as `Game.selectTileForWord`) and looks the
live tile up by id right before calling through. `CombatScreen.jsx`'s rack
tiles gained matching `onTouchStart`/`onTouchMove`/`onTouchEnd`/
`onTouchCancel` handlers, plus `data-tile-index` (nothing needed it
before this) and the rack container gained `id="rack-display"` -- the one
deliberate exception to the React tree's usual id-less convention, needed
because `getTileAtPosition` (called by `updateTouchReorder`) locates the
rack via `document.getElementById`.

**One real, deliberate, documented gap:** `onTouchMove` does NOT call
`e.preventDefault()` the way `wordbound.html`'s explicit
`{ passive: false }` listener does. Confirmed by research (not assumed):
React registers `onTouchMove` passively at its root listener specifically
so touch scrolling isn't blocked by default, which means a `preventDefault()`
call inside a React `onTouchMove` handler is a silent no-op there. Rather
than chase a native-listener workaround (would need a ref + `useEffect`
registering a raw `addEventListener` with `{ passive: false }`, real added
complexity for a purely cosmetic concern), documented the gap plainly: a
real touch rack-drag may let the page scroll slightly during the gesture
instead of suppressing it. The reorder mechanism itself is completely
unaffected -- this is a minor UX nicety gap, not a functional one.

**A jsdom limitation surfaced and worked around properly, not silently:**
`getTileAtPosition` resolves a touch position via `getBoundingClientRect`,
which jsdom always returns as an all-zero rect for every element --
confirmed directly. This means Vitest/RTL tests can exercise the real
state-machine wiring (draggedTileId set on touchstart, threshold crossed
on touchmove, tap-vs-reorder resolved on touchend) but literally cannot
verify POSITIONAL accuracy (which slot a given touchX resolves to) --
documented this plainly in the new tests' own comments rather than writing
an assertion that would silently pass regardless of whether the real
positioning logic worked. Closed the real gap with a genuine positional
check in `test/verify-react-build.js`: dispatches real `Touch`/`TouchEvent`
objects at actual on-screen coordinates from `boundingBox()` (same
technique `test/verify-touch-tap-fix.js` already uses against
`wordbound.html`, since Playwright's `touchscreen` API only supports
`tap()`, not a drag gesture) -- this is the first proof the touch-reorder
mechanism resolves real screen positions correctly, not just that its
state machine transitions correctly.

**Verified:**
- `npx vitest run src/components/__tests__/CombatScreen.test.jsx`: 20/20
  (17 pre-existing + 3 new: a plain tap resolving through the tap
  fallback exactly like a click; a real threshold-crossing touch drag
  reordering the rack through the actual engine splice, deliberately
  started from a non-zero rack index so the reorder branch is genuinely
  exercised despite jsdom's zero-rect quirk always resolving position to
  index 0; touchcancel aborting cleanly with the rack untouched).
- Full `npx vitest run`, 3 consecutive runs: **54/54 every time, zero
  flakes.**
- `npm test` (jsdom dom-check, full suite): ALL CHECKS PASSED -- confirms
  the four new `game.js` exports are true no-ops for `wordbound.html`.
- `npm run build`: clean, 39 modules, same pre-existing chunk-size notice.
- `npm run test:react-build` (real browser, built `dist/app/` output,
  never dev server): ALL CHECKS PASSED, run 3x in a row with zero flakes,
  including the new real `Touch`/`TouchEvent` positional drag-reorder
  check (drags the first rack tile onto the last one's real bounding-box
  position, confirms the resulting order matches `reorderRackOnDrop`'s
  real insertion semantics, and confirms `draggedTileId`/
  `touchDragThresholdCrossed` are both cleared afterward).
- `npm run test:react-qa`: ALL CHECKS PASSED (full boss-reward flow,
  unaffected).
- `npm run test:mobile`: ALL CHECKS PASSED, including the pre-existing
  touch-mode/blank-picker overlay check against `wordbound.html`.
- `npm run test:qa`: ALL CHECKS PASSED (full boss-reward orchestration
  against `wordbound.html`, unaffected).
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED
  (16/16 dom-check against the unzipped build, zero 404s, real-browser
  `window.Wordbound.Game` check).

**Not done / explicitly deferred:** the staged-tile ghost/gap drag-and-
drop-to-remove system (`startStagingDrag`/`updateStagingDrag`/
`endStagingDrag`) remains completely unbuilt in React. This is now the
ONE real remaining piece before STRUCTURAL's stated acceptance bar ("full
feature parity... no vanilla-DOM rendering left") is met.

**Current state:** the rack can now be reordered by BOTH mouse drag
(landed by the concurrent run this session reconciled with) and touch
drag (this run), both backed by the real engine's `state.player.rack`
array, both verified against real browser input (native HTML5
drag-and-drop for mouse, real `Touch`/`TouchEvent` dispatch for touch) in
addition to Vitest/RTL. `wordbound.html` remains fully intact and
unchanged -- all its own gates green throughout.

**Next:** per GOALS.md's update-11 note, the staged-tile ghost/gap drag
system is the last piece of remaining scope (c). It's architecturally
different from the rack drag work landed so far: it live-mutates DOM
`style.transform` on sibling tiles mid-gesture (a ghost tile tracking the
pointer, tiles sliding to open a gap), which fights React's render model
by design if wrapped naively -- worth weighing a from-scratch React-native
pointer-capture reimplementation against wrapping the existing vanilla
state machine before diving in. A final vanilla-DOM-rendering audit
against `wordbound.html` is still owed once this lands, before this
ticket's stated acceptance bar is met.

## 2026-08-21T23:36Z — STRUCTURAL 20/N: staged-tile ghost/gap drag system -- CLOSING the STRUCTURAL ticket (orchestrator)

Repo state note before starting: the container's local `main` branch and
detached HEAD were both stale relative to `origin/main` (a fresh
`git fetch origin main` pulled 40 commits this session's checkout hadn't
seen). Reset local `main` to `origin/main` and worked from there --
flagging in case this points at a clone-timing quirk worth someone
checking, but not otherwise this run's concern.

**What I did:** landed the LAST piece of STRUCTURAL's remaining scope (c)
-- the staged-tile ghost/gap pointer-drag system (reorder-within-staging,
drag-out-to-remove, drag-onto-rack-to-unstage) -- exactly the piece
update-6 through update-11 all progressively narrowed down to and
update-11's "Next" note scoped precisely. Per update-10's own "weigh
from-scratch vs. wrapping" question: wrapped the existing vanilla state
machine rather than reimplementing it, because that machine already
correctly handles every real hazard here (pointer capture, gesture-
interruption teardown across pointercancel/second-finger/detached-element
cases, the "render mid-gesture destroys the ghost" problem its own header
comment documents) and a from-scratch React version would just re-litigate
those same hazards for no behavioral upside.

`js/wordbound/game.js` gained five thin wrappers, same signatures as the
private functions they call through to: `Game.startStagingDrag(tileId, el,
e)`, `moveStagingDrag(e)`, `endStagingDrag(e)`, `cancelStagingDrag(e)`, and
`sweepStagingDragArtifacts()` (exposed so React can run the same
defensive-sweep-on-every-render vanilla's own `renderRun()` runs, guarding
the one hazard that's genuinely React-specific: `CombatScreen` remounting
mid-gesture, e.g. via a side-panel toggle, would otherwise leave
`state.stagingDrag` pointing at a detached node forever).

`src/components/CombatScreen.jsx`: each staged-tile button gained
`data-tile-id` + a per-tile `onPointerDown` (mirrors vanilla's own
per-tile pointerdown binding); a new mount-once effect registers
pointermove/pointerup/pointercancel at the DOCUMENT level (mirrors
vanilla's `Game.init` wiring -- pointer capture routes those events to the
dragged tile regardless of physical position, and a document listener
still receives them via bubbling). `#staging-area` (id, new this run) is
the one new "add the id the vanilla function's `$()` lookup already
expects" exception, same pattern as `#rack-display` before it.
Move/cancel deliberately call straight through to `Game.*`, bypassing
`act()` -- wrapping them would force a React re-render mid-gesture and
destroy the very ghost/gap `style.transform` values being animated, the
exact hazard this system exists to avoid. Only the terminal drop
(`endStagingDrag`) resyncs `word` and bumps the render, since that's the
one point `state.selectedTileIds` may actually have changed. Click
suppression (`state.suppressNextStagingClick`, set by `endStagingDrag`
only when a gesture actually crossed the move threshold) is read/cleared
directly in the staged-tile's own `onClick`, matching vanilla's own inline
(never-wrapped) check -- a real drag's pointerup is always followed by the
browser's synthesized click, and this is what stops that click from
immediately undoing the reorder/removal it just performed.

**A real regression caught and fixed before landing, not shipped:** the
first draft's document-level pointerup handler called
`act(() => Game.endStagingDrag(e))` + `setWord(Game.stagedWord())`
unconditionally on EVERY pointerup anywhere in the document, not just ones
ending an actual staging drag. `Game.endStagingDrag` itself no-ops safely
with nothing staged, but the wrapper around it did not -- caught because
`RunScreen.test.jsx`'s GAME_OVER test went from consistently green to
consistently red the moment this effect was added. Root-caused (not
guessed at) by `git stash`-ing this run's diff and confirming the base
commit passed clean, then bisecting the diff itself: `user.type()`'s own
click-to-focus choreography on the word input fires a real
pointerdown/pointerup pair that bubbles to `document`, and the
unconditional `setWord(Game.stagedWord())` (`''` outside a drag) was
resetting the just-focused input back to empty one keystroke into typing.
Fixed with an explicit `if (!state.stagingDrag) return;` guard before
calling through -- `Game.moveStagingDrag`/`cancelStagingDrag` don't need
the same guard since nothing wraps them in `act()`/`setWord()` to begin
with. Documented in the effect's own comment.

**A real jsdom event-construction gap surfaced and worked around
properly, not silently:** jsdom has no native `PointerEvent` constructor
(confirmed directly) -- RTL's `fireEvent.pointerDown/Move/Up/Cancel`
silently fall back to a bare `Event`, whose constructor, unlike
`MouseEvent`'s or `TouchEvent`'s, does NOT accept `clientX`/`clientY`/
`pointerId` via its init dict, and nothing copies them on afterward. This
is a step further than the already-known "no native DragEvent" gap this
ticket's earlier updates worked around for `dataTransfer` specifically
(RTL DOES special-case that one property) -- pointer properties get no
such special-casing, so `fireEvent.pointerDown(el, {clientX: 37, ...})`
silently delivered `undefined` for all three, confirmed via a throwaway
debug test before touching the real test file. Fixed by constructing the
event by hand (`new Event(type, {...}); Object.assign(event, props);
fireEvent(target, event)`) and dispatching that instead -- a bare `Event`
allows arbitrary own-property assignment, unlike a real `PointerEvent`'s
read-only getters, so `Object.assign` actually sticks. New Vitest/RTL
tests in `CombatScreen.test.jsx` use this `firePointer` helper throughout.

**Real-browser positional verification, same split as the touch-reorder
work:** jsdom's `getBoundingClientRect()` always returns a zero-sized rect
(confirmed again, same limitation the touch-reorder run documented), so
the Vitest suite can prove the state-machine transitions but not that a
drag resolves to the correct REAL on-screen slot. Added a new section to
`test/verify-react-build.js` (real Chromium, built output, never dev
server) using `page.mouse.move/down/up` to drive genuine native pointer
input against real tile positions: stages two real rack tiles, drags the
first onto (past the center of, per `reorderStagedTile`'s insert-before
semantics -- landing exactly on a tile's center is a documented no-op, not
a swap, the same insertion-index gotcha update-10's rack-drag test had to
work out) the second's real bounding box and confirms a real reorder, then
drags the result well clear of the staging area and confirms a real
drag-out-to-remove, checking the removed tile lands back in the rack as a
real enabled button. Placed right after the pre-existing single-tile
stage/unstage check (before the word gets played and the rack starts
churning) so it always has two clean, un-staged, non-blank tiles to work
with -- moved there after an earlier placement (right before the `finally`
block, after several other rack-mutating checks had already run) proved
flaky depending on what the rack looked like by then. Also had to fix a
subtler bug this uncovered: two `.click()` calls issued back-to-back
inside ONE `page.evaluate()` don't give React a turn to flush the first
click's re-render before the second one queries the DOM -- the second
`querySelector` saw the stale (pre-re-render) DOM, so the "second" tile it
clicked was actually still the first, stale one, and clicking an
already-staged tile again unstages it (`selectTileForWord`'s own
"already staged -> deselects" branch) -- net result, zero tiles ended up
staged. Fixed by splitting into two separate `page.evaluate` round-trips
(each is its own CDP call, giving the browser's event loop a real turn
between them). Also added an explicit cleanup click at the end of this
new section to unstage the one tile it deliberately leaves staged
(everything else in that section removes/reorders, never fully cleans
up) -- without it, the very next pre-existing check (desktop mouse-drag
rack reordering) miscounted the rack against `state.player.rack`'s full
array, since a still-staged tile renders as `.rack-slot-empty`, not
`.letter-tile`.

**Final vanilla-DOM-rendering audit (owed by update-11's own note, done
this run):** read `renderCombat()`/`renderStagingArea()` end to end
against `CombatScreen.jsx`. Every functional element/interaction now has
a real React equivalent. What's left is confirmed COSMETIC-ONLY and,
tellingly, was ALREADY gated behind `reactTreeActive()` early-returns
inside `animateDamage`/`celebrateHit`/`animatePlayerDamage` in game.js
itself (a pre-existing deliberate no-op for the React tree, not something
this run discovered as an oversight): the tile-settle FLIP-in land
animation, haptic vibration ticks, floating damage numbers, the HP bar's
flash-damage pulse, combat-panel screen-shake + CRUSHING!/MAGNIFICENT!
floaters, and the ink display's take-damage flash.

**Judgment call, flagged plainly (see GOALS.md's own note on this, same
language):** checked STRUCTURAL off. Remaining scope (c) -- the ticket's
own tracked punch list -- is fully closed, the ticket has consumed 19+
hourly runs and is blocking the header decision's stated next priority
(MUSIC ENGINE / DUEL-GAUGE COMBAT), and the one thing left (cosmetic hit/
drag animation juice) was never actually part of remaining scope (c) --
it's a separate category every update since 6 correctly kept out of that
punch list. Split it into a new, smaller COMBAT JUICE ticket (added to
GOALS.md immediately after STRUCTURAL) so it stays tracked rather than
quietly vanishing. This is a scope call, not a design call -- flagged for
Jaxon in case he'd rather the box stay unchecked until the animations
land too, but functionally the React app now has zero missing
interactions.

**Verified:**
- `npx vitest run` (full 7-file suite, 57 tests incl. 4 new in
  `CombatScreen.test.jsx`): **4 consecutive clean runs, zero flakes.**
- `npm test` (jsdom dom-check, full suite): ALL CHECKS PASSED -- confirms
  the five new `game.js` exports are true no-ops for `wordbound.html`.
- `npm run build`: clean, same pre-existing chunk-size notice.
- `npm run test:react-build` (real browser, built `dist/app/` output,
  never dev server): ALL CHECKS PASSED, run 2x clean, including the new
  real mouse-drag staged-tile reorder + drag-out-to-remove checks
  described above.
- `npm run test:react-qa`: ALL CHECKS PASSED, unaffected.
- `npm run test:mobile` + `npm run test:qa` + `npm run build:itch` +
  `npm run test:itch-build`: ALL CHECKS PASSED, unaffected -- confirms the
  five new `game.js` wrappers and the `Game.endStagingDrag` guard fix are
  true no-ops for `wordbound.html`'s own already-working staging-drag path.

**Not verified / explicitly out of scope:** the COMBAT JUICE ticket's
whole surface (tile-settle animation, haptics, damage floaters,
screen-shake, HP-flash) -- deliberately not attempted this run, tracked
as its own ticket now. Audible musicality and real per-device touch feel
remain, as always, Jaxon's call to make, not verifiable in this
environment.

**Current state:** the React/Vite app has full interactive parity with
`wordbound.html` for every combat input path -- typing, clicking,
desktop mouse-drag (rack and staged tiles), touch tap/drag (rack and
staged tiles), the blank-letter picker, and all side panels/shop/reward/
event/shredder screens from prior runs. `wordbound.html` remains fully
intact, unchanged, and still the complete reference implementation.
STRUCTURAL is checked off; COMBAT JUICE (cosmetic animations) is now its
own queued item. **Next:** MUSIC ENGINE is the first unchecked GOALS.md
item as of this commit -- the header decision's stated priority, and a
large, multi-run ticket in its own right (WebAudio sequencer, note-data
format, crescendo event API, intensity(t) curve). COMBAT JUICE remains
available as lower-priority, opportunistic pickup.

## 2026-08-21T23:58Z — MUSIC ENGINE: WebAudio sequencer + Mountain King proof piece -- CLOSING the ticket (orchestrator)

Repo state note before starting: same stale-local-branch situation the
previous run flagged (local `main` and the detached HEAD were behind
`origin/main`). `git fetch origin main` + `git checkout -B main origin/main`
fixed it before touching anything -- worth someone eventually checking why
this container's initial checkout keeps lagging origin, but not this run's
concern otherwise.

**Scope decision:** GOALS.md's own queue order puts COMBAT JUICE first
(first unchecked item), but that ticket explicitly self-deprioritizes
("Low urgency relative to MUSIC ENGINE / DUEL-GAUGE COMBAT... pick up
opportunistically") and the prior run's own closing note named MUSIC ENGINE
as the real next priority per the header's stated FRAMEWORK/COMBAT decision
order. Followed that established precedent rather than the raw top-to-bottom
default.

**What I built:**
- `js/wordbound/music.js` -- a framework-agnostic (no game.js/React
  dependency) WebAudio sequencer. Full PIECE FORMAT documented at the top
  of the file: `tracks` (named note arrays, `{beat, duration, freq,
  velocity, type}`), `tempo` (a constant bpm number OR ascending
  `{beat, bpm}` breakpoints for a piece whose tempo genuinely changes --
  piecewise-CONSTANT between breakpoints, a deliberate simplification over
  a continuously-integrated ramp, documented as such), `dynamics.keyframes`
  (a piecewise-linear 0..1 intensity curve -- the AMENDED continuous
  intensity(t) function the duel-gauge decision asked for) and
  `dynamics.crescendos` (discrete markers layered on the same curve).
  `createSequencer(ctx, destination, piece, opts)` returns an instance with
  `play/pause/stop`, `setTempoScale` (the tempo-scale hook, rebases
  scheduling with no discontinuity -- verified in a unit test), `currentBeat`,
  `getIntensity`, `on/off` for three events (`crescendo-approaching`,
  `crescendo-peak`, `piece-ended`), and `_tick` exposed intentionally (same
  "internal but testable" convention as `Game._advanceFloor`) so a test can
  drive the scheduler against a manually-advanced fake clock instead of
  real timers -- this IS the "mocked clock" the ticket's VERIFY line asks
  for. Beat<->time conversion is ANCHOR-based (recomputed from a fixed
  anchor beat/time pair + the piece's own tempo breakpoints, never by
  summing per-tick deltas), which is what makes "no drift over minutes"
  architecturally true rather than just hoped for -- though only actually
  exercised over ~4 real/mocked seconds in tests, not literally minutes;
  flagging that gap honestly rather than claiming more than was checked.
  Deliberately dependency-injects the AudioContext AND a destination
  GainNode rather than creating its own or connecting to `ctx.destination`
  directly -- this is how "reuse the existing... master gain/mute/volume
  plumbing" is actually satisfied: whoever wires this into combat (DUEL-GAUGE
  COMBAT) passes game.js's real `musicGainNode`, and mute/volume works with
  zero new code in music.js. The one place this diverges from a literal
  reading of "reuse the existing audio module's synth voices": music.js's
  oscillator-voice function (`playVoice`) is NEW code, not game.js's private
  `playTone`/`playCombatSound` -- those are unexported closures game.js never
  made callable from outside, and duplicating vs. exporting them wasn't
  obviously the right call to make unilaterally (touching game.js's existing
  SFX functions for a module that has no caller yet felt like scope creep).
  Flagged in GOALS.md for Jaxon/a future run to weigh, not hidden.
- `js/wordbound/pieces/mountain-king.js` -- the proof piece: "In the Hall of
  the Mountain King" (Grieg). PD vetting re-confirmed here (already vetted
  in THEME.md's table): composed 1875, Grieg died 1907, 119 years ago as of
  2026 -- safely public domain on both the pre-1930 and 70-years-dead bars.
  Hand-authored transcription (documented plainly as such, not a scholarly
  edition) of the piece's famous construction: the 8-note rising-then-
  falling B-minor motif, four escalating statements (16 beats each, 64
  beats total) climbing in velocity and tempo (100bpm -> 210bpm via 5 tempo
  breakpoints) with bass doubling joining from the third statement on
  (mirrors the real piece's gradual orchestration buildup), capped by an
  8-beat prestissimo coda. THEME.md's own description --  "a single
  unbroken accelerando... in one long ramp with no cool-down" -- is modeled
  literally: `dynamics.keyframes` is one continuous convex ramp from beat 0
  to the coda's peak, and `dynamics.crescendos` carries exactly ONE marker
  spanning nearly the whole piece (`startBeat:0, peakBeat:71`), not several
  discrete spikes -- this is a genuinely good match between the engine's
  format and the piece's real character, not a forced fit.
  `stageTier: 'mid'` is a flagged balance judgment call (not naming/feel):
  this is the first of three floor bosses, meaningfully tougher than
  early-tier regulars but well below the Valkyrie Marshal ('late') or the
  Maestro (final boss, 'final') -- reasoning is in the file's own header
  comment, freely revisable.
- Wired both into `src/main.jsx`, `src/test/setup.js`, and `wordbound.html`
  (same script-tag/import convention every other engine module uses) so
  `window.Wordbound.Music`/`window.Wordbound.Pieces.mountainKing` exist
  consistently everywhere -- even though nothing calls into Music yet (that
  really is DUEL-GAUGE COMBAT's job, the next unchecked ticket, not a gap in
  this one).
- **Real bug caught and fixed before landing:** `tools/build-itch.js` keeps
  an explicit (deliberately non-glob, "fail loudly if it drifts" per its own
  header comment) file list for the itch.io zip -- adding the two new files
  without updating that list would have silently shipped an itch build
  missing `music.js`/`pieces/mountain-king.js`. Caught by actually running
  `npm run test:itch-build` (not skipped), which failed with real 404s
  against the unzipped build in a real browser exactly as the script's own
  design intends. Fixed by adding both paths to `DEPENDENCIES`; reran clean.

**Verified:**
- `npx vitest run src/test/music.test.js`: 12/12, new file -- covers
  intensityAt interpolation/clamping, constant-tempo and breakpoint-tempo
  beat/time conversion, a multi-tick round-trip check for drift, tempoScale
  rebase correctness (no discontinuity, correct new rate), event firing
  (`crescendo-approaching` at exactly `peakBeat - leadBeats`, `crescendo-peak`
  at `peakBeat`, `piece-ended` exactly once at `lengthBeats`, `off()` really
  removing a listener), and mute/volume delegation (every scheduled note's
  gain connects to the caller's `destination` node, never `ctx.destination`
  directly) -- all against a hand-built fake AudioContext with a manually
  advanced `currentTime`, `{ autoTick: false }`, driven via `_tick()`
  directly (the "mocked clock" the ticket's VERIFY line asks for).
- Full `npx vitest run`: **2 consecutive clean runs, 69/69 both times, zero
  flakes** (the pre-existing STRUCTURAL-14/15/16/N flake class stays fixed,
  confirming this run's changes didn't reintroduce it).
- `npm test` (jsdom dom-check, `wordbound.html`): ALL CHECKS PASSED --
  confirms the two new `<script>` tags are true no-ops there (nothing calls
  into Music yet).
- `npm run build`: clean, 41 modules (up from 39), same pre-existing
  chunk-size notice.
- `npm run test:music-engine` (NEW, `test/verify-music-engine.js`, added
  this run, committed not throwaway): real Chromium, real `vite build`
  output statically served, never dev server. Confirms both new globals
  exist on the built app; a REAL `AudioContext` accepts a sequencer for the
  full Mountain King piece; `play()` schedules real `OscillatorNode`s (every
  one actually reached `.start()`) and real `GainNode`s; `getIntensity()`/
  `currentBeat()` return real, sane numbers as real wall-clock time passes;
  the context reaches `'running'` after a real gesture (the resume-on-gesture
  behavior carries over for free since music.js never creates its own
  context); no note's gain connects straight to `ctx.destination` (mute/
  volume routing is real, not just asserted against the unit test's fake
  graph); `stop()` halts it; zero console/page errors, zero failed requests.
  **Caught and fixed a real bug in the check script itself before it passed
  cleanly** -- an ordering mistake (`destination.connect(ctx.destination)`
  called before `window.__seqDest` was assigned) made the probe's own
  exclusion check miss the test's OWN destination node and misreport a false
  violation; root-caused by reading the actual call order rather than
  loosening the assertion, fixed by reordering, reran clean. **Ran the whole
  script 2x consecutively after the fix: clean both times, zero flakes.**
- `npm run test:mobile`, `npm run test:qa`, `npm run test:audio`, `npm run
  test:drag-interrupt`, `npm run test:react-build`, `npm run test:react-qa`:
  ALL CHECKS PASSED, unaffected -- confirms the new modules and the two
  `main.jsx`/`setup.js`/`wordbound.html` import additions are true no-ops
  for every existing screen/flow.
- `npm run build:itch` + `npm run test:itch-build`: FAILED once for the real
  reason described above (missing files in the itch zip's explicit
  dependency list), fixed, then ALL CHECKS PASSED including the real-browser
  404 check against the unzipped build.

**Not verified / explicitly out of scope:** audible musicality (Jaxon's
call, as always -- no speakers here); scheduling drift over literal minutes
(only exercised over ~4-second spans; the anchor-based design should not
drift by construction, but that's an architectural argument, not a minutes-
long empirical one); any combat-layer integration (DUEL-GAUGE COMBAT's job,
next in queue -- Music's event/intensity API was built specifically for it
to subscribe to); only one piece is sequenced end-to-end, per the ticket's
own "at least one" bar.

**Judgment call, flagged plainly (same practice as STRUCTURAL's closing
note):** checked MUSIC ENGINE off. Every bullet in the ticket and its
VERIFY line are met by what's built and verified above. The two design
choices worth Jaxon/a future run's eyes (new voice palette instead of
literally reusing game.js's private synth functions; Mountain King's
`stageTier: 'mid'`) are flagged in both GOALS.md and here, not hidden --
neither blocks the engine from being real, working, and tested.

**Current state:** `window.Wordbound.Music` and
`window.Wordbound.Pieces.mountainKing` exist and work, verified against both
a mocked clock (exact scheduling math) and a real browser AudioContext
(real node creation, no errors) -- but nothing in the actual game calls into
either yet. `wordbound.html` and the React app both remain fully intact and
unaffected. **Next:** DUEL-GAUGE COMBAT is the first unchecked GOALS.md item
as of this commit -- the signature mechanic this engine's event/intensity
API was built for, and now genuinely unblocked. COMBAT JUICE remains
available as lower-priority, opportunistic pickup.

## 2026-08-22T00:21Z — DUEL-GAUGE COMBAT: core gauge engine + mocked-clock tests (orchestrator)

Repo state note before starting: local checkout was already on a clean, up-to-date
`main` matching `origin/main` (the prior run's closing commit) -- no stale-branch
fixup needed this time.

**Scope decision:** GOALS.md's first unchecked item was COMBAT JUICE (cosmetic hit/
drag animation polish), but that ticket explicitly self-deprioritizes ("Low urgency
relative to MUSIC ENGINE / DUEL-GAUGE COMBAT... pick up opportunistically or whenever
the queue is otherwise empty") and the prior run's own closing note named DUEL-GAUGE
COMBAT as the real next priority, now genuinely unblocked since MUSIC ENGINE closed.
Followed that established precedent (same one the MUSIC ENGINE run itself followed
over COMBAT JUICE) rather than the raw top-to-bottom default.

**Why this run didn't attempt the whole ticket:** DUEL-GAUGE COMBAT is enormous --
replacing the entire turn-based Combat.playWord/monsterAttack flow with a continuous
gauge, replacing player.ink-as-HP with discrete Verses (health blocks) game-wide
(touching every ink-spend item: Overcharge, Rewrite, and whatever else reads
player.ink), building the telegraph UI, the Largo accessibility control, and a
virtual-clock balance sim across all four stage tiers -- a multi-run push by any
reasonable estimate, same shape as STRUCTURAL's 12-update arc. Scoped this run to the
one piece that's genuinely self-contained and independently valuable: **the gauge
engine itself**, built and verified against the ticket's own VERIFY line first clause
("mocked-clock unit tests: gauge integration math, block loss at the end-state only,
i-frame suppression, parry window, tier multipliers") before any of it touches
game.js/CombatScreen.jsx. Same pattern MUSIC ENGINE used (build+verify the engine
module first, wire it in as a later, separately-scoped step) -- deliberately followed,
not improvised.

**What I built:**
- `js/wordbound/duel.js` (new) -- a pure, framework-agnostic state machine, no DOM/
  WebAudio/game.js dependency (same convention as music.js). Full design rationale is
  in the file's own header comment; summary:
  - **The gauge**: a single number in [0, 100], GAUGE_MIN=0 (player-damaging end),
    GAUGE_MAX=100 (enemy-damaging end), starting at GAUGE_CENTER=50. This 0=player-
    loses/100=enemy-loses orientation is an implementation choice (the ticket doesn't
    specify a sign), documented plainly so it's easy to flip if UI wants the opposite.
  - **Music push** (`tick(now, dt, intensity)`): per the header COMBAT MODEL, push =
    `(STAGE_TIER_BASE_PUSH[tier] + intensity * INTENSITY_PUSH_SCALE) * dt`, subtracted
    from the gauge. `STAGE_TIER_BASE_PUSH = {early:1, mid:3, late:6, final:9}` is the
    "later-stage enemies push a base amount more" additive term; `INTENSITY_PUSH_SCALE
    = 16` is intensity's own weight (a crescendo IS a spike in music.js's intensity
    curve, so "crescendos push much harder" falls out of that curve's own shape times
    this one scale knob). Intensity is clamped to [0,1] defensively. All four tuning
    numbers, `WORD_PUSH_SCALE=1`, `IFRAME_DURATION_SEC=3`, `PARRY_WINDOW_SEC=0.2`,
    `PARRY_DAMPING_DURATION_SEC=1.5`, `PARRY_MITIGATION=0.5` are named GOALS.md-cited
    starting points, explicitly flagged as retunable -- none of this is claimed as
    final balance, just a working, testable baseline within each ticket-stated range
    (i-frames "2-4s, tune" -> 3s; parry "~±200ms, tune" -> 0.2s).
  - **Losing a push**: gauge reaching GAUGE_MIN costs exactly one health block
    (`healthBlocks`, default `DEFAULT_HEALTH_BLOCKS=5`, the bible's ~5 Verses),
    recenters the gauge (not left pinned at the edge), and starts i-frames
    (`iframeUntil = now + IFRAME_DURATION_SEC`) during which `tick()` is a complete
    no-op -- chose FULL suspension over "heavily damped" as the strongest, simplest-
    to-verify reading of "a brutal passage can never instantly chain away all health."
    `healthBlocks` reaching 0 emits `'player-defeated'` and the duel goes terminal
    (`isTerminal()`); further `tick()`/`applyPlayerPush()` calls are no-ops on a
    terminal duel, confirmed by a dedicated test.
  - **Winning a push**: `applyPlayerPush(now, wordScore)` adds `wordScore *
    WORD_PUSH_SCALE` toward GAUGE_MAX; reaching it recenters the gauge, increments
    `pushesWon`, emits `'push-won'`, and -- once `pushesWon >= pushesToDefeat`
    (creation option, default 1) -- emits `'defeated'` and goes terminal. This is the
    "implementing run's call on exact structure — document it" the ticket asks for:
    `pushesToDefeat: 1` for a regular (dies in one won push, per the ticket's own
    example), a caller-chosen N for a boss (e.g. 4 for Beethoven's 5th, one per
    movement per the bible) -- the phase-shift/movement-swap behavior itself is NOT
    built here (that's a caller concern reading `pushesWon` when it changes the
    active piece/trait phase), just the counting primitive it needs.
  - **Parry**: `registerCrescendoPeak(now)` is the hook a caller wires to music.js's
    `'crescendo-peak'` event (passing the same clock, e.g. a real/virtual
    `ctx.currentTime`). `attemptParry(now)`, called when a word is submitted, succeeds
    if `now` is within `PARRY_WINDOW_SEC` of the most recent NOT-YET-CONSUMED peak
    (consumed on success -- no double-parrying one crescendo), and activates a
    `PARRY_DAMPING_DURATION_SEC` window where `tick()`'s push is multiplied by
    `(1 - PARRY_MITIGATION)`. This models "blunts that crescendo's push by a
    meaningful percent" as post-peak damping rather than a single instantaneous hit-
    reduction, since this gauge model has no discrete "hit" to blunt -- documented as
    a deliberate interpretation, not a literal ticket quote. `attemptParry` does NOT
    itself apply the parrying word's own push -- caller still calls
    `applyPlayerPush` separately; parry and push are two independent effects of one
    submitted word, matching how a real crescendo-timed play should feel (you still
    get credit for the word, plus the parry bonus).
  - Event API (`on`/`off`, same shape as music.js's sequencer): `'block-lost'`
    `{healthBlocks}`, `'player-defeated'`, `'push-won'` `{pushesWon, pushesToDefeat}`,
    `'defeated'`, `'parried'` (payload: the peak time that was parried).
- Wired into `src/main.jsx`, `src/test/setup.js`, `wordbound.html` (same
  script-tag/import convention every other engine module uses, added right after
  `pieces/mountain-king.js` and before `game.js`) and `tools/build-itch.js`'s
  `DEPENDENCIES` list -- caught the exact class of bug the MUSIC ENGINE run's own
  note flagged (new engine file forgotten in the itch zip's explicit list) BEFORE it
  happened this time, by adding it proactively and confirming with a real
  `test:itch-build` run rather than discovering it after the fact.
- `src/test/duel.test.js` (new, 25 tests) -- the mocked-clock unit tests the ticket's
  VERIFY line asks for, covering exactly its four named areas: gauge integration math
  (constant-intensity push rate, dt=0 no-op, intensity ordering, intensity clamping),
  tier multipliers (strictly monotonic across all four tiers at equal intensity,
  unknown-tier defaults to zero base push rather than crashing), i-frame suppression
  (loses exactly one block even from a massive overshoot tick, recenters, suspends
  push completely during the window, resumes correctly once it expires, terminal
  state on zero health blocks with further calls confirmed as true no-ops), and the
  parry window (inside/outside/no-peak/already-consumed/emits-with-payload/damping-
  active/damping-expired/parry-still-works-during-i-frames). One real bug caught in
  my OWN test during authoring, not duel.js: the "loses exactly one block" test
  originally also asserted `gauge === GAUGE_MIN` right after the loss, contradicting
  the very next test's (correct) assertion that the loss recenters the gauge --
  caught by actually running the suite (it failed with `50 !== 0`, not a false
  green), fixed by removing the wrong assertion rather than loosening duel.js's
  actual, correct behavior.

**Deliberately NOT done this run (real, open scope, not hidden):**
- No integration into `js/wordbound/game.js`/`combat.js`/`CombatScreen.jsx` -- the
  turn-based `Combat.playWord`/`monsterAttack` flow, `player.ink`-as-HP, and the
  existing damage-dealing combat screen are all completely unchanged and unaffected.
  Nothing calls `Duel.create`/`tick`/`applyPlayerPush` from game code yet.
- No decision yet on ink's fate post-Verses ("if ink survives at all it's only as a
  spend resource... don't keep two life systems" -- the ticket's own open call). This
  run touched nothing ink-related, so Overcharge/Rewrite's ink costs are completely
  unaffected for now; whoever does the integration run has to make this call for
  real, auditing every `player.ink` read/write across game.js/items.js/consumables.js.
  first.
- No telegraph UI (swelling meter / dynamics ribbon), no Largo control surface (the
  tempo-scale HOOK already exists in music.js, built by that ticket -- just no UI
  wired to it yet), no boss phase-shift wiring (the `pushesToDefeat`-crossing
  counting primitive exists; nothing yet swaps a boss's active piece/trait phase when
  it fires), no i-frame visual treatment.
- No Playwright real-browser duel win/loss verification, no virtual-clock balance
  sim across the four tiers -- both explicitly require the game-integration piece to
  exist first (there's no real combat screen driving a `Duel` instance yet to smoke-
  test against).
- No monster actually has a `stageTier`/piece assigned yet (`monsters.js` is still
  entirely the sibling repo's un-migrated roster -- that's REGULAR ENEMIES' job,
  further down the queue, and this ticket's own boss-wiring piece for the three floor
  bosses + final boss). This run's engine is fully generic over stage tier and takes
  it as a plain creation option, so it's ready for whichever run wires real monsters
  to it.

**Verified:**
- `npx vitest run src/test/duel.test.js`: 25/25 (after fixing the one test-authoring
  mistake described above).
- Full `npx vitest run`, 2 consecutive clean runs: **94/94 both times, zero flakes**
  (up from 69 pre-existing -- 25 new, all in duel.test.js; the STRUCTURAL-14/15/16/N
  flake class stays fixed).
- `npm test` (jsdom dom-check, `wordbound.html`): ALL CHECKS PASSED -- confirms the
  new `<script>` tag is a true no-op there (nothing calls into Duel from vanilla
  code).
- `npm run build`: clean, 42 modules (up from 41), same pre-existing chunk-size
  notice.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED, `duel.js`
  correctly present in the zip and the unzipped build's real-browser load (zero
  404s).
- `npm run test:react-build` (real browser, built React output, not dev server):
  ALL CHECKS PASSED, unaffected -- confirms adding a new unused-by-React-yet engine
  module doesn't regress anything already ported.
- `npm run test:react-qa`, `npm run test:mobile`, `npm run test:qa`, `npm run
  test:music-engine`: ALL CHECKS PASSED, unaffected.

**Not verified / explicitly out of scope:** any real-browser/Playwright duel
behavior (nothing renders or drives a `Duel` instance yet); balance/tuning numbers
against real playtest feel (Jaxon's call, as always, once there's something playable
to feel); the exact boss phase-shift structure (documented as this ticket's own open
design call, left for the integration run to decide alongside the ink/Verses
question).

**Current state:** `window.Wordbound.Duel` exists, is fully unit-tested against a
mocked clock covering every VERIFY-line requirement for the engine itself, and is a
true no-op everywhere in the existing game (vanilla and React) since nothing calls
it yet. `wordbound.html` and the React app both remain fully intact and unaffected.
Ticket stays unchecked -- this is the engine-first slice of a multi-run ticket, same
shape as MUSIC ENGINE before it. **Next:** the real remaining scope is the
integration run(s): (1) decide and implement ink's post-Verses fate (audit every
`player.ink` read/write, likely keep it as Overcharge/Rewrite's spend resource only,
per the ticket's own leaning), (2) wire `Duel` into game.js's combat flow --
`CombatScreen.jsx`'s word-submit path calls `Duel.applyPlayerPush` instead of
directly damaging `monster.hp`, a per-frame tick loop calls `Duel.tick` off the
active `Music` sequencer's `getIntensity()`, `'crescendo-peak'` wires to
`registerCrescendoPeak`, word-submit also calls `attemptParry`, (3) build the
telegraph UI + Largo control surface + i-frame visual treatment, (4) assign real
`stageTier`s and pieces to the three floor bosses (Mountain King already has one;
Valkyrie Marshal and the final Beethoven's-5th boss still need theirs, per THEME.md's
own roster), (5) the virtual-clock balance sim and real Playwright duel win/loss
checks, both blocked on (2) existing first. COMBAT JUICE remains available as
lower-priority, opportunistic pickup, unchanged.

## 2026-08-22T00:44Z — DUEL-GAUGE COMBAT: standalone Volume/Verses telegraph UI (orchestrator)

Repo state note before starting: local checkout was on a detached HEAD at the prior
run's commit; `git checkout main && git pull` confirmed it matched `origin/main`
exactly (`ade6581`) -- no stale-branch fixup needed, just reattaching the branch ref.

**Scope decision:** the previous run's own "Next" note pointed at the ink/Verses audit
+ the full game.js/CombatScreen.jsx combat-loop integration as the next step. Before
committing to that, read `Combat.playWord`/`Game.submitWord`'s full flow
(`js/wordbound/combat.js`, `js/wordbound/game.js` lines ~876-1140) end to end: this
confirmed the integration is genuinely a from-scratch real-time rebuild, not a
wiring job -- there is no `requestAnimationFrame`-style continuous loop anywhere in
game.js today, every "turn" (player word -> monster counterattack -> render) is one
synchronous `setTimeout`-deferred call chain, and the duel-gauge model needs a
continuously-ticking loop reading `Music.getIntensity()` every frame regardless of
whether a word was just played. Attempting that rebuild AND the ink/Verses
game-wide audit (ink is read/written in ~25+ places across combat.js, events.js,
items.js, consumables.js, achievements.js, game.js, per a full-repo grep) in one
hourly run risked landing something half-working or, worse, leaving the existing
turn-based combat broken mid-run. Followed this ticket's own established precedent
(MUSIC ENGINE, then DUEL-GAUGE COMBAT's own update-1: build+verify one isolated,
testable piece before the risky integration) one level further down: the ticket's
TELEGRAPH bullet ("the player must SEE the music coming... swelling meter, scrolling
dynamics ribbon") is itself a genuinely separable, presentational concern that
doesn't need the combat loop to exist yet -- build it now as a pure component driven
by a real `Duel` instance's shape, verified standalone, ready for a future
integration run to just mount and feed real per-frame state into.

**What I built:**
- `src/components/VolumeGauge.jsx` (new) -- a pure presentational React component,
  deliberately taking NO dependency on `window.Wordbound.Duel`/`Music` (never reads
  either global) so it doesn't care whether its `duel` prop is a live engine
  instance or a duel-shaped plain object -- documented in its own header comment as
  useful for whichever future run builds the real per-frame render loop. Renders,
  using THEME.md's actual named pieces (not duel.js's generic field names, per that
  file's own "UI-facing code is where the bible's words belong" note):
  - **"The Volume"**: a horizontal tug-of-war bar. Fill runs from the gauge's
    center (duel.js's `GAUGE_CENTER=50`) out to the current `gauge` value --
    colored gold (`.volume-gauge-fill-safe`) when leaning toward the enemy's end
    (`gauge > 50`, matches the existing "safe"/gold family used elsewhere), red
    (`.volume-gauge-fill-danger`) when leaning toward the player's end. A
    `role="meter"` with `aria-valuemin/max/now` for accessibility.
  - **"Verses"**: a row of pips, one per `maxHealthBlocks`, filled gold for
    remaining health blocks and hollow for lost ones.
  - **I-frame grace state**: while `duel.isIframeActive(now)` is true (called on
    the real engine method when present, falling back to a plain
    `now < duel.iframeUntil` comparison for a hand-built fixture), the track gets a
    distinct blue glow class and a "Grace period -- the music can't touch you"
    label appears -- the ticket's own "make i-frames visually obvious" requirement.
  - **Parry damping**: while `now < duel.parryDampingUntil`, the fill gets an
    additional blue `.volume-gauge-parried` class layered on top of its
    safe/danger color, so a successful parry reads as a distinct visual state.
  - **Upcoming-crescendo warning**: an optional `approachingCrescendoSecondsAway`
    prop (meant to be derived by a future caller from music.js's
    'crescendo-approaching' event payload + the sequencer's own clock) renders
    "Crescendo in Xs" -- the da-da-da-DUM telegraph the ticket's own design target
    names.
  - **Boss push counter**: "Pushes N / M" shown only when `pushesToDefeat > 1`
    (hidden for a regular's default of 1), so a regular's UI stays uncluttered
    while a boss fight shows real progress toward its multi-push defeat.
  New CSS section in `css/wordbound.css`, inserted right after the existing
  `.monster-intent` rules (same combat-panel neighborhood it'll eventually sit in),
  reusing the established palette (`#f0d789` gold / `#a03c3c`+`#e08a8a` red, the
  same family `.ink-display`/`.monster-hp-fill` already use) and the repo's
  existing `@media (prefers-reduced-motion: no-preference)` gating convention for
  the crescendo-warning pop and the i-frame glow.
- `src/components/__tests__/VolumeGauge.test.jsx` (new, 5 tests) -- drives a REAL
  `Duel.create()` instance (from `window.Wordbound.Duel`, wired by
  `src/test/setup.js`) through real `.tick()`/`.applyPlayerPush()`/
  `.registerCrescendoPeak()`/`.attemptParry()` calls and asserts on the real
  resulting DOM -- no mocked duel-shaped fixture anywhere, matching this repo's
  established "drive the real engine, not a stand-in" convention for every other
  `src/components/__tests__` suite. Covers: the centered/full-Verses/no-warnings
  starting state; the fill leaning red as a real `tick()` call pushes the gauge
  down (deliberately short of a full block loss, covered separately); the fill
  leaning gold after a real `applyPlayerPush()`; the grace-period label + track
  glow appearing after a REAL block loss (`tick(0, 10, 1)` at 'final' tier
  deliberately overshoots `GAUGE_MIN` in one call, matching duel.js's own
  documented "loses exactly one block even from a massive overshoot" behavior) and
  disappearing again once real i-frames expire (via RTL's `rerender`, not a second
  unmanaged `render()` call); a real parry (`registerCrescendoPeak` +
  `attemptParry` within the real `PARRY_WINDOW_SEC`) showing the parried-fill state
  alongside a boss's push counter and the crescendo warning together.
  One real test-authoring mistake caught and fixed before landing, not a duel.js
  bug: the first draft's "leans danger" test used `tick(0, 2, 1)` at 'final' tier,
  which happens to drive the gauge to EXACTLY `GAUGE_MIN` (25 pts/sec x 2s = 50,
  the full center-to-edge distance) -- duel.js correctly treats that as a block
  loss (recenters the gauge to 50, the opposite of "leaning danger"), so the
  assertion was actually wrong, not duel.js. Caught by running the test (it failed
  with a `50 !== <expected less-than-50>`, not a false green) rather than assumed;
  fixed by picking `dt=1` instead (lands at gauge=25, strictly between center and
  the edge) with the arithmetic commented inline so the next person touching this
  test doesn't repeat the same mistake.
- No `game.js`, `combat.js`, `duel.js`, or `CombatScreen.jsx` changes this run --
  `VolumeGauge.jsx` is imported by nothing outside its own test file, confirmed by
  `npm run build` staying at exactly 42 modules (unchanged from the prior run's
  build), the same "true no-op, nothing calls into the new thing yet" bar
  music.js/duel.js were each held to before their own integration runs.

**Deliberately NOT done this run (real, open scope, not hidden):**
- The ink/Verses audit + decision (this ticket's own open call from update-1,
  restated in GOALS.md's note above) -- untouched, no ink-related code read or
  written this run beyond the read-only grep used to size the audit for the scope
  decision above.
- No real-time tick loop in `CombatScreen.jsx` or anywhere else -- `VolumeGauge` has
  nowhere to mount yet. This run's own investigation narrowed that future work: it
  will need an actual `requestAnimationFrame` (or equivalent) loop, since none
  exists in the current turn-based combat flow.
- No Largo control surface, no boss `stageTier`/piece assignment for the Valkyrie
  Marshal or final boss, no virtual-clock balance sim, no real-browser Playwright
  duel win/loss checks -- all still blocked on the integration loop existing, per
  update-1's own note, unchanged by this run.

**Verified:**
- `npx vitest run src/components/__tests__/VolumeGauge.test.jsx`: 5/5.
- Full `npx vitest run`, 3 consecutive runs: **99/99 every time, zero flakes** (up
  from 94 pre-existing -- 5 new, all in this run's new file; the
  STRUCTURAL-14/15/16/N flake class stays fixed).
- `npm test` (jsdom dom-check, `wordbound.html`): ALL CHECKS PASSED -- unaffected,
  no `game.js`/`wordbound.html` change this run.
- `npm run build`: clean, 42 modules -- unchanged from the prior run's build,
  confirming `VolumeGauge.jsx` is genuinely unreferenced anywhere yet.
- `npm run test:react-build` (real browser, built React output, not dev server):
  ALL CHECKS PASSED, unaffected -- the full real-word playthrough, drag-reorder,
  and touch-drag checks all still pass unchanged.
- `npm run test:react-qa`, `npm run test:mobile`, `npm run test:qa`, `npm run
  test:music-engine`: ALL CHECKS PASSED, unaffected.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED, unaffected
  (the itch build packages `wordbound.html`'s dependency tree only, which never
  touches `src/`).

**Not verified / explicitly out of scope:** any real-browser rendering of
`VolumeGauge` itself (nothing mounts it yet -- Vitest/RTL is the only place it's
been rendered); visual/UX feel of the gauge (Jaxon's call, as always, once it's
actually on screen during a real duel); the crescendo-warning prop's real derivation
from a live `music.js` sequencer (this run only proved the component renders it
correctly given a number -- computing that number from a real
'crescendo-approaching' event + a live clock is integration-run work).

**Current state:** `src/components/VolumeGauge.jsx` exists, is fully styled, and is
unit-tested against a real `Duel` engine instance covering every visual state the
ticket's TELEGRAPH bullet asks for (the gauge itself, Verses, i-frame grace, parry,
the upcoming-crescendo warning, boss multi-push) -- but nothing in the live app
mounts it yet, confirmed as a true no-op via the unchanged build module count.
`wordbound.html` and the rest of the React app remain fully intact and unaffected.
Ticket stays unchecked -- this is another isolated, engine/UI-first slice of a
multi-run ticket, same shape as MUSIC ENGINE and this ticket's own update-1. **Next:**
the real remaining scope is now more precisely bounded than it was after update-1 --
(1) the ink/Verses audit (still completely open, still this ticket's own explicit
call to make), (2) build the actual real-time tick loop in `CombatScreen.jsx`
(`requestAnimationFrame` reading a live `Music` sequencer's `getIntensity()` into
`Duel.tick`, replacing `Combat.playWord`'s direct `monster.hp` mutation with
`Duel.applyPlayerPush` + a caller-side damage-on-push-won mapping, wiring
`'crescendo-peak'` to `registerCrescendoPeak` and word-submit to `attemptParry`),
(3) mount `VolumeGauge` into that loop, passing it real per-frame `duel`/`now`/
`approachingCrescendoSecondsAway` values -- this piece is now smaller than it would
have been, since the component itself is done and tested, (4) the Largo control
surface, (5) real `stageTier`/piece assignment for the Valkyrie Marshal and final
Beethoven's-5th boss (both still need actual sequenced note data -- a substantial
task of its own, comparable to MUSIC ENGINE's "sequence at least one piece" bar),
(6) the virtual-clock balance sim and real Playwright duel win/loss checks, both
still blocked on (2) existing first. COMBAT JUICE remains available as
lower-priority, opportunistic pickup, unchanged.
## 2026-08-22T00:49Z — DUEL-GAUGE COMBAT: ink audit + post-Verses decision (orchestrator)

Repo state note before starting: local checkout's `main` branch ref was stale (a
detached-HEAD leftover pointing at the same commit `origin/main` already had) --
`git checkout main && git merge --ff-only origin/main` fast-forwarded it cleanly, no
lost work, no rebase needed.

**Scope decision:** the first unchecked GOALS.md item is COMBAT JUICE, which
explicitly self-deprioritizes below DUEL-GAUGE COMBAT (same precedent the last two
runs followed). The prior run's own "Next" note named the ink/Verses audit as the
concrete first step of DUEL-GAUGE COMBAT's remaining integration work -- picked that
up directly rather than starting the integration blind.

**What I did:** read every `player.ink`/`maxInk` reference across `js/wordbound/
game.js`, `combat.js`, `consumables.js`, `events.js`, `intents.js`, `items.js`, and
`achievements.js` (grep + full read of every hit). Finding, in more detail than
GOALS.md's summary: ink today plays THREE roles at once, not the one the ticket's
phrasing ("if ink survives at all it's only as a spend resource") implied might be
narrow:
1. **Player HP.** `Combat.monsterAttack` (combat.js:209-213) subtracts `monster.attack`
   straight from `player.ink`; `game.js`'s `Game.submitWord` checks `ink <= 0` TWICE
   (once for an on-your-own-turn item self-damage interaction, once after the
   monster's counterattack) and calls `endRun(false)` on either. This is the entire
   game-over path today.
2. **Non-combat event currency.** `events.js` has ~6 separate risk/reward event
   choices that spend or restore ink directly (e.g. "Strike the deal: Lose 5 ink,
   gain 20 gold", "Sit and breathe: Recover 3 ink, skip the next fight"), independent
   of combat.
3. **Overcharge/Rewrite mana.** The role the ticket's phrasing anticipated --
   `Combat.OVERCHARGE_INK_COST`/`REWRITE_INK_COST`, unaffected by anything below.
Items/consumables built around roles 1+2: `consumables.js`'s Errata Slip (heal 8
ink), `items.js`'s `heavy_ink` (an item literally named for the ink-as-HP role),
a near-death-save item (items.js ~line 200: if incoming damage >= current ink, cap
it to `ink - 1` instead of killing) built specifically around role 1, an
Acquisitions Budget item that grants +maxInk (role 1's ceiling), and
`achievements.js`'s `trackBossDefeatedWithoutDamage`, which uses `ink < maxInk` as
its proxy for "took damage this fight" (role 1 again). None of this is dead or
vestigial -- it's the complete, currently-shipping, extensively-tuned combat system
(see `newPlayer`'s own pre-existing header comment documenting a THREE-ROUND
20 -> 24 -> 22 starting-HP rebalance driven by real balance-simulation data). This
confirmed the scale call already flagged in this ticket's update-1: swapping in the
gauge is a full combat-resolution rewrite touching several adjacent systems, not a
narrow "replace one function" change, and not something to force into partial
existence in one hour against a system this well-tested and tuned.

**Decision made and documented (in GOALS.md's ticket note, not re-copied in full
here -- see there for the complete list):** `player.healthBlocks`/`maxHealthBlocks`
(Verses, default `Duel.DEFAULT_HEALTH_BLOCKS` = 5) becomes the HP for Duel-based
fights, persisted across fights the same way ink is today. Ink is retired from the
HP role entirely (no more `ink <= 0` game over, no more counterattack-spills-ink)
but otherwise completely unchanged -- Overcharge/Rewrite costs, the event-currency
spends, and `maxInk`-granting items all keep working exactly as they do now, since
none of those are HP. Four concrete follow-up items flagged by name/location in
GOALS.md so the integration run doesn't have to rediscover them: the
`monsterAttack`/`ink <= 0` replacement, the near-death-save item's re-target, the
achievement's re-target, and an explicitly UNDECIDED design call (flagged
Jaxon-adjacent, feel-affecting) on whether `Intents.js`'s per-turn telegraphed
counterattack system gets repurposed as periodic disruptive effects on the
continuous gauge or retired outright -- the continuous model has no discrete
"monster's turn" for it to hook into as-is.

**Code landed (a true no-op, continuing the engine-first pattern):** rather than
leave this purely a documentation run, added the one genuinely safe, additive piece
the decision unblocks: `js/wordbound/game.js` now references `Duel`
(`window.Wordbound.Duel`) in `_initDependencies`, alongside every other module
reference, and `newPlayer()` initializes two new fields --
`healthBlocks`/`maxHealthBlocks`, both defaulting to `Duel.DEFAULT_HEALTH_BLOCKS`
(falls back to a literal `5` if `Duel` isn't loaded, matching how defensive the rest
of that function already is) -- rather than a second hardcoded "5" that could drift
from `duel.js`'s own constant. Nothing reads either field yet; this is scaffolding
for the integration run to persist health across fights per the decision above, not
a behavior change. Deliberately did NOT touch `Combat.monsterAttack`, the `ink <= 0`
checks, `Intents.js`, or any item/achievement -- all four are real, separately-scoped
integration work now that the decision exists, not something to rush alongside the
audit itself.

**Verified:**
- `npm test` (jsdom dom-check, `wordbound.html`): ALL CHECKS PASSED -- confirms the
  new `Duel` reference and the two new `newPlayer()` fields are true no-ops there.
- `npx vitest run`, 2 consecutive runs: **94/94 both times, zero flakes** (unchanged
  count from the prior run -- no new tests needed since nothing new is behaviorally
  reachable yet; existing suite is the regression check).
- `npm run build`: clean, 42 modules, same pre-existing chunk-size notice.
- `npm run test:react-build` (real browser, built output): ALL CHECKS PASSED, full
  playthrough including staged/drag/touch-drag mechanics, zero console/page errors.
- `npm run test:react-qa`, `npm run test:mobile`, `npm run test:qa`: ALL CHECKS
  PASSED.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED -- `duel.js`
  already present in the zip's dependency list from the prior run, unaffected by
  this run's `game.js`-only change.

**Not verified / explicitly out of scope:** no behavior actually changed (a pure
scaffolding/documentation run), so there is nothing new to verify beyond "did the
existing game stay exactly as it was" -- confirmed above across every gate. The
gauge-combat integration itself, the Intents design call, the four flagged
item/achievement re-targets, the telegraph UI, the Largo control surface, monster
`stageTier`/piece assignment for the remaining bosses, and the balance sim are all
still completely unbuilt.

**Current state:** `player.healthBlocks`/`maxHealthBlocks` exist on every newly
created player, unread by anything, alongside the unchanged ink-as-HP system that
still runs the entire live game. `wordbound.html` and the React app both remain
fully intact and unaffected. Ticket stays unchecked. **Next:** the integration run
itself, now working from a documented decision rather than an open question --
concretely: (1) replace `Combat.monsterAttack` + the two `ink <= 0` game-over checks
in `game.js` with the gauge's `block-lost`/`player-defeated` events (reading/writing
`player.healthBlocks` via a per-fight `Duel` instance), (2) resolve the
Intents-repurposing design call (or explicitly defer it with a documented interim
behavior) before or during that work, (3) re-target the near-death-save item and
`trackBossDefeatedWithoutDamage` at `healthBlocks` per GOALS.md's flagged locations,
(4) wire `CombatScreen.jsx`'s word-submit path to `Duel.applyPlayerPush` +
`attemptParry` and a per-frame `Duel.tick` loop off `Music.getIntensity()`, (5) only
after that exists: the telegraph UI, Largo control surface, real `stageTier`/piece
assignment for the remaining bosses, the balance sim, and real-browser duel win/loss
checks. COMBAT JUICE remains available as lower-priority, opportunistic pickup,
unchanged.
## 2026-08-22T01:24Z — DUEL-GAUGE COMBAT: scoring/gauge bridge + Intents decision (orchestrator)

Repo state note before starting: local checkout's HEAD was a detached commit
matching `origin/main` exactly (`df6ebfd`), with the local `main` ref stale at
the old seed commit -- `git checkout -B main origin/main` reset the local
branch cleanly onto the real tip, no lost work, no rebase needed (same class
of leftover a prior run already hit and fixed once before).

**Scope decision:** first unchecked item is COMBAT JUICE, which explicitly
self-deprioritizes below DUEL-GAUGE COMBAT (established precedent, 3 prior
runs). DUEL-GAUGE COMBAT's own "Next" note named a 6-part integration list;
read `Game.submitWord` in full (`js/wordbound/game.js`, ~250 lines) before
touching anything, since the note's item (1) was "replace `Combat.
monsterAttack` + `ink <= 0` with gauge events" and (4) was "wire `CombatScreen.
jsx`'s word-submit + a real-time RAF loop." Confirmed directly what the last
three runs' notes already suspected: `Game.submitWord` is genuinely one
function entangled with ink-spend (Overcharge), a dozen+ item `onWordPlayed`
hooks, combo/rack-cycling, and Intents -- currently the ONLY complete way to
play the game -- and no monster in `monsters.js` carries a `stageTier`/piece
yet (REGULAR ENEMIES + boss-piece-assignment, both still-open queue items
below this one, are what would give a real fight something to actually play
against). Concluded the full live cutover is a genuinely atomic swap that
can't safely land as a partial mid-run state without risking the shipped
game -- continued this ticket's own engine-first precedent (duel.js,
VolumeGauge.jsx) one more isolated, fully-tested slice instead of forcing the
cutover into existence this run.

**What I built:**
- `js/wordbound/combat.js`: `Combat.playWord` gained one additive option,
  `{ skipDamage: true }` -- runs the identical scoring/rack-mutation/combo-
  tracking path as always, but skips the direct `monster.hp -= damage` line.
  Omitted/false (every existing call site) is a byte-for-byte behavior no-op,
  confirmed by the full pre-existing suite staying green untouched.
- `js/wordbound/duelCombat.js` (new): the bridge between `combat.js`
  (scoring) and `duel.js` (the gauge) -- deliberately the only file that
  knows about both, so whichever run eventually wires `CombatScreen.jsx` has
  one small surface to call instead of re-deriving this logic.
  - `DuelCombat.submitWord(player, monster, duel, word, comboState, now,
    options)`: calls `Combat.playWord` with `skipDamage` forced on (so "word
    score = the full scrabble system" is genuinely satisfied -- tiles,
    length, weaknesses, combo, overcharge, computed once, never duplicated),
    then `duel.attemptParry(now)` and `duel.applyPlayerPush(now,
    result.damage)`. Returns null for an unformable word (same contract as
    `Combat.playWord`); on success, `Combat.playWord`'s own result object
    plus `parried`, `duelPush`, and a `monsterDied` recomputed against the
    real post-push `monster.hp`.
  - **Winning-a-push structure decided and documented (this ticket's own
    "implementing run's call, document it"):** a won push deals
    `ceil(monster.maxHp / duel.pushesToDefeat)` damage. `pushesToDefeat: 1`
    (a regular, `Duel.create`'s own default) means that's the monster's full
    `maxHp` -- "regulars die in one won push" (ticket text) exactly, since
    `ceil(maxHp/1) = maxHp`. `pushesToDefeat: N > 1` (a boss) ceil-rounds so N
    pushes are always lethal even against a non-divisible `maxHp` (e.g.
    maxHp=52, N=3 -> 18/push, 3*18=54, clamped to 0) while N-1 pushes never
    quite are (2*18=36 < 52) -- "bosses take several" satisfied exactly, and
    phase-shifting falls out for free: the next word played after a won push
    reads the monster's now-lower hp, the exact mechanism the turn-based
    game's boss-phase trait transitions already use today (`activeTraitFor
    HpRatio`, keyed on live hp, untouched by this change).
  - `DuelCombat.syncHealthBlocks(player, duel)`: wires `player.healthBlocks`
    to the duel's `'block-lost'` event so it's live-synced continuously, not
    just read once at fight end -- per the ink-audit run's own documented
    persistence plan (GOALS.md, 2026-08-22 update-3 note).
- **Intents design call, resolved (not deferred a third time):** the
  continuous duel model has no discrete "monster's turn" for a per-turn
  telegraphed action to attach to; `Intents.rollIntent`/`executeIntent` are
  built entirely around one action resolving once per turn. Repurposing them
  as periodic disruptive effects on the continuous push (the ticket's other
  named option) is a real feature in its own right -- its own cadence, its
  own telegraph distinct from the crescendo telegraph, real playtest-feel
  weight -- not something to improvise as a side effect of this bridge.
  **Decision:** Intents is RETIRED for duel-gauge fights, an explicitly
  interim simplification, not a final call -- a gauge fight runs on pure
  music-driven push + word-score push-back, matching the header COMBAT
  MODEL's own base description (which never mentions Intents -- Intents was
  a later turn-based-only addition, "FUN OVERHAUL 2/8"). Flagged for Jaxon in
  GOALS.md: if periodic gauge-fight disruptions turn out to matter for feel
  once a duel is actually playable, that's its own explicitly-scoped ticket.
  The turn-based path (which never rolls Intents beyond plain Attack/Heavy
  Blow for non-elite/boss fights anyway) is completely unaffected.
- Registered `duelCombat.js` everywhere the other engine modules are loaded,
  same "true no-op, wired but unreferenced" bar `duel.js`/`music.js` were
  held to at their own closing: `src/main.jsx`, `src/test/setup.js`,
  `wordbound.html`'s script list, `tools/build-itch.js`'s dependency array.

**Verified:**
- 9 new mocked-clock Vitest tests (`src/test/duelCombat.test.js`), driving
  the REAL `Combat.playWord` + `Duel.create` + real `Tiles`/`Lexicon` word
  formation -- no mocks of either engine module, same "drive the real
  engine" convention every other test file here follows. Covers: an
  unformable word returns null, mutating neither the duel nor the monster; a
  valid word's gauge push exactly equals its real computed `damage` (not a
  duplicated formula -- asserted via `Duel.WORD_PUSH_SCALE` directly against
  `result.damage`, not a hardcoded number); rack tiles are genuinely spent
  even under `skipDamage`; a 1-push regular dies outright on a won push; a
  3-push boss survives two won pushes and dies precisely on the third, hp
  matching the `ceil(maxHp/3)` math at every step; a word inside vs. outside
  the parry window reports `parried` correctly, and confirmed (by re-reading
  `duel.tick` before writing the assertion, not assuming) that parry damping
  only ever throttles the MUSIC's own tick-push, never `applyPlayerPush` --
  a word's push is unaffected by whether it parried; `comboState` updates
  exactly as `Combat.playWord` alone already does (no divergent behavior
  introduced by the bridge); `syncHealthBlocks` live-syncs
  `player.healthBlocks` on a real forced block loss (a large `dt`/`intensity`
  tick, not a mocked event) and leaves it untouched before any loss occurs.
- Full `npx vitest run`, 3 consecutive runs: **108/108 every time, zero
  flakes** (up from 99 -- 9 new, all in this run's new file; every
  pre-existing test, including duel.test.js/VolumeGauge.test.jsx/
  CombatScreen.test.jsx, unaffected).
- `npm test` (jsdom dom-check, `wordbound.html`): ALL CHECKS PASSED --
  confirms `combat.js`'s new `skipDamage` option is a genuine no-op against
  every one of wordbound.html's own turn-based fights (the boss-skip flow
  through real floor-1 and floor-3 boss kills, victory, ink-spend/overcharge,
  panel-stacking -- the full existing suite, unmodified).
- `npm run build`: clean, 43 modules (up from 42 -- the one genuinely new
  module, confirmed by the count itself, not just "should be unreferenced").
- `npm run test:react-build` (real browser, built output): ALL CHECKS
  PASSED -- the full real-word playthrough, staged/drag/touch-drag mechanics,
  and touch-mode checks all still pass unchanged.
- `npm run test:react-qa`, `npm run test:mobile`, `npm run test:qa`, `npm run
  test:music-engine`: ALL CHECKS PASSED, unaffected.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED --
  `unzip -l dist/wordbound-itch.zip | grep duel` confirmed `duelCombat.js` is
  genuinely present in the packaged zip (6507 bytes), not just assumed from
  the dependency-list edit.

**Not verified / explicitly out of scope:** nothing in the live app calls
`DuelCombat` yet (confirmed by the build's module-count delta and every
existing gate staying byte-for-byte green) -- there is no real duel to
playtest, feel, or check in a real browser this run; that's exactly what's
still blocked on the integration cutover below.

**Current state:** `js/wordbound/duelCombat.js` exists, fully tested, wired
into every module-load list, and is a true no-op in the live app (confirmed,
not assumed). `Combat.playWord`'s new `skipDamage` option is likewise a
confirmed no-op for every existing call site. The Intents question that has
blocked the integration run since the ink-audit note is now a documented
decision rather than an open question. `wordbound.html` and the rest of the
React app remain fully intact and unaffected -- the turn-based game is still
the only playable path, unchanged. Ticket stays unchecked. **Next:** the
actual cutover -- now every piece it needs (the gauge engine, the telegraph
UI component, the healthBlocks decision, the Intents decision, and the
scoring bridge) already exists and is tested in isolation. Concretely: (1)
branch-gate `Game.submitWord` on a duel-mode fight (e.g. `state.monster.duel`
truthy) to call `DuelCombat.submitWord` instead of `Combat.playWord`
directly, retiring the `ink <= 0` checks + `Combat.monsterAttack` call ONLY
on that branch -- turn-based fights must stay completely unaffected until
every monster has a piece; (2) skip Intents on that branch per the decision
above; (3) a real `requestAnimationFrame` loop in `CombatScreen.jsx` reading
a live `Music` sequencer's `getIntensity()` into `duel.tick`, wiring
`'crescendo-peak'` to `duel.registerCrescendoPeak`; (4) mount `VolumeGauge`
(already built/tested) into that loop; (5) retarget the near-death-save item
and `trackBossDefeatedWithoutDamage` at `healthBlocks` (flagged by name/
location in the ink-audit note); (6) decide which real boss gets Mountain
King's piece (or build a minimal synthetic test piece) so there's an actual
duel to drive end-to-end -- worth reading THEME.md's boss roster first; (7)
only once a real duel is reachable: the Largo control surface, the
virtual-clock balance sim, real Playwright duel win/loss checks. COMBAT JUICE
remains available as lower-priority, opportunistic pickup, unchanged.

---

## 2026-08-22T01:50Z — DUEL-GAUGE COMBAT: the real integration cutover

Picked up this ticket's own "Next" note (logged by the previous run, the
scoring/gauge bridge) exactly as scoped: items (1)-(4) in full, plus the
achievement half of item (5). Every piece the bridge needed already existed
and was tested in isolation (`duel.js`, `music.js`, `duelCombat.js`,
`VolumeGauge.jsx`) -- this run's job was purely wiring them together for
real, without breaking the turn-based game that's still the only reachable
path for every actual player today.

**What changed:**

- `js/wordbound/game.js`:
  - `Game.startDuelFight(piece, opts)` (new): the real setup for a duel-mode
    fight against `state.monster`. Creates a real `Duel.create()` (health
    persisted from `state.player.healthBlocks`, `pushesToDefeat` defaulting
    to 3 for a boss / 1 for a regular, both overridable) and a real
    `Music.createSequencer(ctx, destination, piece)`, playing it
    immediately. Stops the placeholder background-music loop first (the
    sequencer owns this fight's audio now) and reuses the SAME shared
    `musicGainNode` that loop uses (factored the lazy-init into a new
    `ensureMusicGainNode(ctx)` helper, identical behavior, just now callable
    from two places) -- mute/volume plumbing keeps working unmodified, per
    music.js's own "reuse the caller's destination GainNode" contract.
    Wires `sequencer.on('crescendo-peak', ...)` into
    `duel.registerCrescendoPeak`, calls `DuelCombat.syncHealthBlocks`, and
    wires `duel.on('player-defeated', ...)` to stop the sequencer and call
    `endRun(false)` -- the duel-mode equivalent of the turn-based ink<=0
    death path. `opts.audioContext`/`opts.destination` are dependency-
    injection points: production (called from `startCombat`) omits both and
    gets the real lazily-initialized audio graph; tests inject a fake one
    (see below), same convention `music.test.js` already established.
  - `Game.getDuelClockNow()` (new): returns the sequencer's own
    `audioContext.currentTime` -- the ONE clock a duel fight's tick loop,
    parry checks, and crescendo registration all have to share, or timing
    comparisons across those three would silently drift apart.
  - `Game.tickDuel(now, dt)` (new): the thin per-frame wrapper
    `CombatScreen.jsx`'s own animation loop calls -- forwards to
    `state.duel.tick(now, dt, state.duelSequencer.getIntensity())`,
    no-opping outside/after a duel fight. Deliberately NOT run through
    `render()`/`act()` itself -- see the CombatScreen note below for why.
  - `Game.submitWord(rawWord, duelNow)`: gained an optional second param
    (every existing call site omits it, completely unaffected) and now
    branches at the point that used to unconditionally call
    `Combat.playWord`: a duel-mode fight (`state.monster.duel && state.duel`)
    calls `DuelCombat.submitWord` instead, passing `duelNow` (or
    `Game.getDuelClockNow()` as a fallback) as the shared clock reading for
    the parry check. Both paths return the same result shape, so almost
    every line after that call (hex-tile restore, Overcharge spend logging,
    item `onWordPlayed` hooks, variant-tile gold/heal/crack effects,
    MAGNIFICENT bonus, combo bump, run-stats tracking) is genuinely SHARED,
    unbranched code -- only two real divergences: the Cursed-Quill
    same-turn ink<=0 catch is skipped for a duel fight (duel health is
    `healthBlocks`, not ink -- ink surviving only as a spend resource is
    this ticket's own "don't keep two life systems" call), and the
    post-word survive path skips the entire Intents/counterattack block
    (rack still cycles normally; a duel fight just renders and returns --
    the enemy's offense is the continuous music push, already being applied
    every animation frame independent of word submission, and Intents is
    formally retired for gauge fights per the earlier decision note).
  - `onMonsterDefeated`: now stops `state.duelSequencer` and clears
    `state.duel`/`duelSequencer`/`duelPiece` at the top, unconditionally, so
    the next fight (whichever kind) always starts from clean duel state --
    true no-op today since nothing sets these outside a duel fight.
  - `trackBossDefeatedWithoutDamage`'s "did they take damage" check now
    reads `player.healthBlocks < player.maxHealthBlocks` for a duel-mode
    boss instead of `ink < maxInk` -- item (5)'s achievement half, a
    one-line retarget once the field existed. The OTHER half of item (5) --
    Second Wind (the near-death-save item, `items.js`, hooked into
    `onPlayerDamaged`) -- is genuinely NOT a one-line change: duel-mode
    health loss happens inside `duel.tick`'s own `loseBlock`, called every
    animation frame from CombatScreen's loop, with no `onPlayerDamaged`-
    shaped call site to hook into. Left explicitly undone rather than
    forcing a shape that doesn't fit -- flagged concretely in GOALS.md.
    Second Wind currently does nothing in a duel fight; not a regression,
    since duel fights weren't reachable at all before this run.
  - `startCombat`: now checks the fought monster's `.piece` field
    (`Monsters.createMonster`/`createBoss`, also edited this run, copy
    `piece`/`pushesToDefeat` from the def onto the instance) and calls
    `Game.startDuelFight` instead of the placeholder `startBackgroundMusic`
    when present -- the actual forward-compatible wiring point the ticket's
    own "Next" note asked for. Also skips the pre-fight `Intents.rollIntent`
    call for a duel-mode monster (no discrete first turn to telegraph).
    **True no-op today**: confirmed both by every existing gate staying
    green AND by a new test that searches real seeds for one that actually
    rolls a slime combat node and proves NOTHING duel-related fires for it
    (no def in `monsters.js` sets `.piece` yet -- that's REGULAR ENEMIES'/
    the boss-roster reskin's job, still untouched).

- `src/components/CombatScreen.jsx`:
  - A `requestAnimationFrame` loop, active only while `monster.duel &&
    state.duel`, runs each frame: reads `Game.getDuelClockNow()`, computes
    `dt` against the previous frame's reading, calls `Game.tickDuel(now,
    dt)` directly (bypassing `act()`/the app-wide bump -- same "mutate state
    per-frame, force a real re-render only at a genuine transition" pattern
    the staged-tile drag system already established, documented inline with
    a cross-reference to that precedent). A local `duelTick` counter state
    forces just this component to re-render each frame so the newly-mounted
    `VolumeGauge` shows live gauge/health/i-frame state without hammering
    the rest of the app through a full `act()` cycle 60x/sec. Once
    `state.duel.isTerminal()` (a block loss just emptied healthBlocks,
    synchronously running the 'player-defeated' -> `endRun(false)` chain
    inside `Game.startDuelFight`'s own handler), the loop calls
    `act(() => {})` once to flush that real screen transition into React,
    then stops. Guarded on `typeof requestAnimationFrame === 'function'` --
    confirmed directly (fresh `JSDOM` instance) that jsdom has none, so this
    is a true no-op under Vitest/RTL, same convention as the touch-mode
    `matchMedia` guard already established elsewhere in this file; real
    per-frame behavior is what `test:react-build`/manual playtest verify
    instead, once a real duel exists to look at.
  - `submit()` now passes `Game.getDuelClockNow()` as `Game.submitWord`'s
    `duelNow` for a duel-mode fight (turn-based fights pass `undefined`,
    unchanged).
  - `<VolumeGauge>` (built and unit-tested standalone by an earlier run,
    never wired in until now) mounts right after the monster-info block
    when `monster.duel && state.duel`. `approachingCrescendoSecondsAway` is
    passed `null` -- deriving a live countdown from the sequencer's
    `'crescendo-approaching'` event is real, separably-small remaining
    plumbing (its own local countdown state), not built this run; documented
    inline as a known, non-regressive gap (nothing showed this warning
    before this run either).

**Verified:**
- 13 new Vitest tests, `src/test/duelIntegration.test.js`, driving the REAL
  `Game.submitWord`/`Game.tickDuel`/`Game.startDuelFight` against real
  combat state (`freshRun`/`findAvailableCombatNodeId`/
  `Game.enterCurrentNode`, the same `gameHelpers.js` convention every other
  test file in this repo uses -- no mocks of engine logic):
  - A won push deals a real decisive blow and reaches `TILE_REWARD` by
    polling real `state.screen` (not a mock), confirming ink is untouched
    (no monster counterattack ever ran).
  - Surviving a word never rolls Intents (`state.monster.intent` stays
    `undefined`) or spends ink.
  - Ink hitting 0 never ends a duel fight (only healthBlocks does).
  - `Game.tickDuel` forwards to the real `duel.tick` with the sequencer's
    live intensity, and correctly no-ops with no active duel and once one
    has already resolved.
  - `Game.startDuelFight`, driven against an injected `FakeAudioContext`/
    `FakeGain` (same convention `music.test.js` established, since jsdom has
    no real AudioContext -- confirmed directly): creates a real playing
    sequencer, persists `healthBlocks` across the duel, and -- genuinely
    exercising the NEW wiring, not re-testing duel.js's own already-tested
    math -- confirms the sequencer's real `'crescendo-peak'` event reaches
    the duel's parry window (advance the fake ctx's `currentTime` past the
    piece's `peakBeat`, call the sequencer's own `_tick()`, assert
    `duel.pendingPeakAt` is now set) and that `'player-defeated'` really
    ends the run (`state.screen === 'GAME_OVER'`) and stops the sequencer,
    without touching ink.
  - `startCombat`'s automatic `.piece` detection: temporarily stubs
    `window.AudioContext` with the fake, then searches real seeds (bounded,
    up to 40) for one whose floor actually rolls an available slime combat
    node, enters it for real, and asserts duel mode fired -- deliberately
    NOT a vacuous "skip if it's not a slime" check, so this actually proves
    the wiring rather than assuming it. A companion test confirms a def
    without `.piece` (every real def today) stays turn-based.
- Full `npx vitest run`, 3 consecutive runs: **121/121 every time, zero
  flakes** (up from 108 -- 13 new, all in the new file; every pre-existing
  test, including duelCombat.test.js/VolumeGauge.test.jsx/
  CombatScreen.test.jsx, unaffected).
- `npm test` (jsdom dom-check, `wordbound.html`): ALL CHECKS PASSED --
  confirms every `game.js`/`monsters.js` change (the branch points in
  `submitWord`, the `startCombat` `.piece` check, the `onMonsterDefeated`
  cleanup, the achievement retarget, the `ensureMusicGainNode` refactor) is
  a true no-op against wordbound.html's own real turn-based fights, run
  through the FULL existing suite (boss-skip flow, ink-spend, panel-
  stacking, victory, etc.), unmodified.
- `npm run build`: clean, 44 modules (up from 43 -- `CombatScreen.jsx` now
  actually imports `VolumeGauge.jsx` for the first time this run, making it
  a reachable module for real, not just a file that existed).
- `npm run test:react-build` (real browser, built output): ALL CHECKS
  PASSED -- the full real-word playthrough (staging, mouse-drag, touch-drag,
  touch-mode) is completely unchanged, confirming the new rAF loop/
  VolumeGauge mount is genuinely inert for every fight a real player can
  currently reach.
- `npm run test:react-qa`, `npm run test:mobile`, `npm run test:qa`, `npm run
  test:music-engine`: ALL CHECKS PASSED, unaffected.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED --
  confirms the itch-packaged `wordbound.html` (the shipped reference
  implementation, untouched by this run except the shared, no-op-verified
  `game.js`/`monsters.js` edits) still boots clean in a real browser.

**Not verified / explicitly out of scope:** nothing in a real playthrough
ever reaches a duel (confirmed unchanged by `test:react-build`'s full
playthrough) -- there is still no real duel to look at, feel, or
Playwright-verify end-to-end in an actual browser. That's now purely
blocked on a real monster carrying a `.piece` (REGULAR ENEMIES/boss-roster
reskin territory, per THEME.md, still untouched -- monsters.js still has
the old sibling-derived names like "The Vowelmaw," not Mountain King/Death
the Fiddler/Valkyrie Marshal/the Maestro), not on any remaining integration
plumbing. Second Wind's retarget, the crescendo-approaching countdown, the
Largo control surface, and the virtual-clock balance sim also remain open.

**Current state:** the DUEL-GAUGE COMBAT engine (gauge math, scoring bridge,
telegraph UI, and now the real integration wiring) is complete, tested, and
a confirmed true no-op for the shipped game -- every gate stays green.
`wordbound.html` and the turn-based React app remain the only reachable
paths for a real player; nothing about this run changes that. Ticket stays
unchecked. **Next:** the cleanest unblock is picking ONE real boss (THEME.md
already names Mountain King for floor 1, and `js/wordbound/pieces/
mountain-king.js` already exists) and giving its `monsters.js` entry a real
`.piece`/reskinned name/`pushesToDefeat` -- at that point a real Playwright
duel win/loss check becomes possible for the first time, and Jaxon's first
real playtest of the mechanic becomes reachable. Second Wind's retarget, the
crescendo-approaching countdown, the Largo surface, and the balance sim
remain open, smaller, independent pieces after that. COMBAT JUICE remains
available as lower-priority, opportunistic pickup, unchanged.

## 2026-08-22T02:04Z -- COMBAT JUICE: tile-settle land flash + a real blocker found on DUEL-GAUGE COMBAT's "Next" note

Session note: the container's local `main` had drifted from `origin/main`
(a `git fetch` at the start of this run reported a forced update from
`f98ff83` to `02b89d5`) -- reset local `main` to match `origin/main` before
starting any work. No repo content issue, just a stale ref at session start.

Before touching any ticket, investigated DUEL-GAUGE COMBAT's own "Next"
note (the queue's other unchecked item, and per the header decision the
higher-priority one): pick one real boss -- Mountain King, floor 1, its
piece already built in `js/wordbound/pieces/mountain-king.js` -- and give
its `monsters.js` entry a real `.piece`/reskinned name/`pushesToDefeat`.
Read `Game.startDuelFight`/`startCombat`/`Floor.pickBossDefId`/
`test/dom-check.js`'s `enterAndKillBoss` in full before writing anything,
and found a real blocker the "Next" note's phrasing glossed over:
`startCombat`'s `.piece` check is shared, unconditional `game.js` logic --
it fires the same way whether the fight is reached from `wordbound.html`
or the React app, since both share the same `monsters.js` defs and
`floor.js` generation. `wordbound.html` has NO duel tick loop
(`Game.tickDuel` is called only from `CombatScreen.jsx`'s own
`requestAnimationFrame` effect -- nothing in the legacy `Game.init()` path
calls it) and no gauge UI (`VolumeGauge` is React-only). So reskinning an
EXISTING boss def like `boss_vowelmaw` into duel mode would make that
fight go dead-silent in `wordbound.html` (words only ever push toward the
enemy end; the music never pushes back; no visible gauge) and would
directly break `test/dom-check.js`'s mandatory-gate `enterAndKillBoss`
test for that boss (it forces `monster.hp=1` and expects ONE submitted
word to be a deterministic turn-based kill -- duel mode routes that same
word through `DuelCombat.submitWord`'s push-accumulation instead, with no
guarantee a single average word crosses the gauge) plus the two turn-based
Mend-intent counterattack tests that also fight `boss_vowelmaw` directly.
Did NOT commit a `monsters.js` change to confirm this by trial and error --
traced the actual code paths instead. Concluded the literal "reskinned
name" instruction (implying reuse of the existing def) is unsafe as
written: it would pass a shallow look but fail the MANDATORY `npm test`
gate and silently degrade `wordbound.html`'s own still-relied-upon boss
fight, which the STRUCTURAL ticket's whole multi-run arc went out of its
way never to regress. A real fix needs a design call this run isn't
positioned to make unilaterally -- logged three options in GOALS.md's
COMBAT JUICE note (a new, separate boss def with a real floor-generation
selection policy; teaching `wordbound.html`/game.js its own duel-tick
path; or a Jaxon-adjacent call that duel fights are React-only going
forward and dom-check's boss tests get updated on purpose for that def).
Flagging plainly rather than either rushing an unsafe change or leaving
the "Next" note's blocker undiscovered for a future run to trip over the
same way.

Picked up COMBAT JUICE instead -- the queue's actual next unchecked item,
and genuinely unblocked. Scoped to bullet 1's `.tile-settle` CSS class
only (not the FLIP position-slide it's paired with in the ticket text,
and not the other two bullets -- see below). Read `css/wordbound.css`
first: `.tile-settle` is a pure brightness/box-shadow `@keyframes`,
deliberately transform-free (its own comment explains why -- so it
doesn't fight the separate `flipTile` position-slide, which owns
`transform` on the same element) -- a self-contained CSS-class port, same
shape as the already-landed `new-tile`/`combo-chip-bump` classes, not the
harder `flipTile` mechanism. Also read `markSettle`'s 3 call sites in
`game.js` (`unstageTile`, `selectTileForWord`, `assignBlankLetter`) and
confirmed vanilla itself never settle-flashes on a plain drag/touch
REORDER (none of `startStagingDrag`/`reorderRackOnDrop`/etc. call it) --
so "staged, unstaged, or reordered" in the ticket's own bullet text
slightly overstates actual vanilla behavior; ported to match what vanilla
actually does, not the text. Separately confirmed bullet 2 (haptic
feedback) is ALREADY real, no porting needed: `hapticTick()` runs
unconditionally inside those same 3 private functions, and React already
calls them for real via the `Game.selectTileForWord`/`unstageTile`/
`assignBlankLetter` wrappers landed in an earlier STRUCTURAL run -- a
stage/unstage already vibrates a real device today. Corrected the
ticket's own bullet list in GOALS.md rather than silently leaving it
looking like an open gap.

**Built:** `src/components/CombatScreen.jsx` -- a `prevSelectedTileIdsRef`
(same native last-committed-render-tracking pattern as the file's existing
`prevRackIdsRef`/`prevComboRef`, not the shared `state.settleTileIds`
array, since nothing in the React tree ever consumed/cleared that array
and a shared one-shot flag risks being eaten by a StrictMode throwaway
render -- the exact hazard this file's own combo-bump comment already
documents) drives `justUnstaged`/`justStaged` per tile during render,
adding `.tile-settle` to the rack tile a word just returned to, or the
staged tile that just landed, for exactly one render each.

**Verified:**
- 2 new Vitest/RTL tests in `CombatScreen.test.jsx`: staging a tile flashes
  `.tile-settle` on the real `.staging-area .staged-tile`, unstaging
  flashes it on the real rack button, and both lose the class on the next
  unrelated re-render (typing an unrelated character).
- `npx vitest run`, 3 consecutive runs: **123/123 every time, zero
  flakes** (up from 121 -- 2 new, all in `CombatScreen.test.jsx`).
- `npm test` (jsdom dom-check, `wordbound.html`): ALL CHECKS PASSED,
  unaffected -- `CombatScreen.jsx` is React-only, no `game.js` change this
  run.
- `npm run build`: clean, 44 modules, unchanged (no new imports added).
- `npm run test:react-build` (real browser, built output): ALL CHECKS
  PASSED, run 2x clean.
- `npm run test:react-qa`, `npm run test:mobile`, `npm run test:qa`, `npm
  run test:music-engine`, `npm run build:itch` + `npm run test:itch-build`:
  ALL CHECKS PASSED, unaffected.

**Not done:** the FLIP position-slide itself (`flipTile`'s actual
transform-based move, a separate mechanism from the `.tile-settle` class
landed this run -- would need `useLayoutEffect` + `getBoundingClientRect`
before/after a stage/unstage, not vanilla's DOM-id-lookup approach), and
the damage/hit-animation bullet (floating numbers, HP-bar flash,
screen-shake, CRUSHING!/MAGNIFICENT! banners, ink flash -- still needs a
new `Game.*` damage-landed hook, per the ticket's own note; haptic
feedback needs no further work, already real, see above). COMBAT JUICE
stays unchecked. **Next:** either the FLIP position-slide (smaller,
self-contained) or the damage-landed `Game.*` hook (bigger, unblocks 4
bullet items at once) for COMBAT JUICE; separately, DUEL-GAUGE COMBAT's
boss-reskin blocker (documented above and in GOALS.md) needs a design
call before any def gets a real `.piece` -- flagging as Jaxon-adjacent
(which of the three options above he'd prefer) rather than picking one
unilaterally, since it affects `wordbound.html`'s continued playability.

## 2026-08-22T02:37Z -- COMBAT JUICE: FLIP position-slide, plus a real cross-mechanism bug caught by the real-browser gate

Picked up COMBAT JUICE's own "Next" note from the previous run (2026-08-22T
tile-settle entry): the smaller of the two remaining options, the FLIP
position-slide (`flipTile`/`markSettle`'s transform-based move -- the
counterpart to that run's `.tile-settle` CSS flash). Read `js/wordbound/
game.js`'s `flipTile`/`selectTileForWord`/`unstageTile` in full first.

**Built:** `flipTileTo()`, a module-level function in `src/components/
CombatScreen.jsx` that reimplements game.js's private `flipTile(fromRect,
toEl)` natively for React -- same invert-transform-then-double-rAF
technique, same reduced-motion/no-rAF guards. Wired via a new
`captureFlipFrom(tileId)`/`pendingFlipFromRef`/`useLayoutEffect` block,
called from the same two places vanilla's own `selectTileForWord`/
`unstageTile` call `flipTile` from: a real (non-blank) stage, and any
unstage regardless of which UI affordance triggered it. Confirmed by grep
that vanilla itself never flips on a blank-picker stage or a drag/touch
reorder either (only 2 `flipTile(` call sites exist in game.js), so this
doesn't over-port relative to actual vanilla behavior.

**A real bug found and fixed mid-run -- not by any Vitest test, by
`test:react-build` (the mandatory real-browser gate) actually failing:**
the first version gave the rack tile button a `data-tile-id` attribute (the
obvious-looking choice, matching what staged tiles already carry so a
single selector could find a tile on either side). That had a side effect
nothing in this run's plan anticipated: game.js's own PRIVATE
`selectTileForWord`/`unstageTile` already call `flipTile` internally,
unconditionally, regardless of caller -- previously a guaranteed no-op in
the React tree only because `tileElIn`'s `document.querySelector('[data-
tile-id="..."]')` lookup inside `#rack-display` found nothing (rack tiles
carried no such attribute before this run). Adding it made THAT call start
resolving real elements too, so two independent flip mechanisms (this
file's new one, and game.js's own dormant one) started fighting over the
same element's `transform`/`transition` on every stage/unstage.
`npx vitest run` stayed green throughout this whole detour (jsdom's fake
`getBoundingClientRect` and total lack of `requestAnimationFrame` mean
neither mechanism does anything observable there -- confirmed directly,
same as every other rAF-gated cosmetic effect in this file), but
`npm run test:react-build` caught a real, reproducible regression: the
native HTML5 drag-and-drop check (`dragTo()`, which samples a rack tile's
real on-screen position) started failing consistently, 100% of repeated
runs. Root-caused by `git stash`-ing this run's diff and confirming the
base commit passed clean 3/3, then reading `tileElIn`'s actual call sites
in `game.js` rather than guessing. Fixed by giving the rack tile a
NAMESPACED `data-flip-tile-id` attribute instead (added alongside, not
replacing, the staging-area tile's pre-existing `data-tile-id`, which stays
load-bearing for the unrelated staging-drag machinery) -- this restores
game.js's own internal `flipTile` calls to exactly the same inertness they
had before this run; this file's mechanism is now the only one doing
anything. Documented at length in `CombatScreen.jsx`'s own header comment
so a future run reaching for `data-tile-id` on a rack tile doesn't
rediscover this the hard way.

**A second, related timing hazard found and fixed the same way (real
browser only -- invisible in jsdom):** two PRE-EXISTING checks later in
`test/verify-react-build.js` (the staged-tile-drag check's own 2-tile
staging loop, and that same block's own unstage cleanup right before the
native rack-drag check) read real `getBoundingClientRect()`/`boundingBox()`
coordinates immediately after a stage/unstage click, with no wait --
harmless before this run (nothing animated there yet), but now racing the
new 0.2s FLIP transition. Added a `page.waitForTimeout(300)` at both spots
specifically (not a blanket wait everywhere) so those checks measure tiles
at rest, same convention as this ticket's own new FLIP-specific checks.

**This run's own new checks:** 1 new Vitest/RTL test
(`CombatScreen.test.jsx`) confirming `data-flip-tile-id` resolves on both
sides of a stage/unstage and that jsdom's no-rAF guard leaves no stray
inline transform behind (jsdom cannot observe the actual animation at all
-- confirmed directly, no real `requestAnimationFrame` exists there,
matching this file's own established convention for the duel-tick loop and
touch-mode detection). A new real-browser block in
`test/verify-react-build.js`: reading the transient invert-transform value
directly was tried first and found genuinely unreliable (a raw `el.click()`
inside `page.evaluate()` does not reliably get React's re-render flushed
before `evaluate()` returns -- confirmed directly, `state.selectedTileIds`
updated synchronously since the engine mutation is plain JS, but the DOM
commit lagged behind in every observed run; a SEPARATE follow-up
`evaluate()` call races the opposite direction, since its own CDP round-
trip latency can just as easily land after the double-rAF release already
fired). Instead the check instruments `window.requestAnimationFrame`
itself (wraps it to count real invocations into a page-global, entirely
inside the browser's own event loop, no CDP round trip in the middle) and
polls for the count to reach 2 -- proving `flipTileTo`'s double-rAF
genuinely scheduled (i.e. its own delta-too-small early-return did NOT
trigger), which only happens if the invert transform was really set,
without needing to catch its exact transient DOM value.

**Verified:**
- `npm test` (jsdom dom-check, `wordbound.html`): ALL CHECKS PASSED,
  unaffected -- no `game.js` change this run, everything is React-side.
- `npx vitest run`, 3 consecutive full-suite runs after the
  `data-flip-tile-id` rename: **124/124 every time, zero flakes** (up from
  123 -- 1 new test).
- `npm run build`: clean, 44 modules, unchanged.
- `npm run test:react-build` (real browser, built output): **5 consecutive
  clean runs** after both fixes above (the attribute rename and the two
  added settle-waits) -- this is the specific gate that caught both
  regressions during this run, so the repeat count here matters more than
  usual; it failed 100% of runs before either fix, and 0% after both.
- `npm run test:react-qa`, `npm run test:mobile`, `npm run test:qa`,
  `npm run test:music-engine`, `npm run build:itch` +
  `npm run test:itch-build`: ALL CHECKS PASSED, unaffected.

**Not done:** the damage/hit-animation bullet (floating numbers, HP-bar
flash, screen-shake, CRUSHING!/MAGNIFICENT! banners, ink flash) is now the
only real open piece of COMBAT JUICE's original three bullets -- it still
genuinely needs a new `Game.*` damage-landed hook in `game.js`'s
`submitWord`, not a pure React-side port (haptic feedback and the
tile-settle flash were already done by earlier runs; the FLIP slide is done
as of this run). COMBAT JUICE stays unchecked. **Next:** the damage-landed
hook + its animations is the last piece -- likely its own multi-run push,
since it needs new plumbing in `game.js` itself, not just a React
component. Separately, DUEL-GAUGE COMBAT's boss-reskin blocker (documented
in GOALS.md's COMBAT JUICE update-1 note) is unrelated and still needs a
Jaxon-adjacent design call on which of its three options he'd prefer.

## 2026-08-22T02:58Z -- DUEL-GAUGE COMBAT: implemented the boss-def cutover decision -- the first real, player-reachable duel fight now exists

Picked up the ORCHESTRATOR DECISION logged in GOALS.md's DUEL-GAUGE COMBAT
ticket (2026-08-22, "duel fights are React-only") over COMBAT JUICE: it's
the higher-priority ticket per the header's own stated priority, the
decision itself was already a concrete, well-scoped 3-step plan (not a
fresh design question), and it had been logged but never actually
implemented -- a prior run picked COMBAT JUICE's FLIP slide instead of
acting on it. Read the full DUEL-GAUGE COMBAT ticket history in GOALS.md
first (all prior updates 1-4) to understand exactly what was already built
(duel.js, VolumeGauge.jsx, duelCombat.js, the full game.js/CombatScreen.jsx
integration) vs. what was genuinely still blocked (no real monster had a
`.piece` yet).

**Step 1 -- convert the def:** `js/wordbound/monsters.js`'s `boss_vowelmaw`
is now "The Mountain King" (THEME.md's floor-1 boss), with
`piece: window.Wordbound.Pieces.mountainKing` and `pushesToDefeat: 3`
(explicit now, matching game.js's pre-existing boss-default of 3).
`attack`/`intents`/`traitPhases` were deliberately left on the def
unchanged (documented inline why -- still legitimately read by direct
`Monsters.createBoss()` unit tests that never touch duel routing).
Referencing the real piece object at monsters.js's own module-eval time
required fixing a load-order bug: monsters.js previously loaded BEFORE
`pieces/mountain-king.js` everywhere (wordbound.html, src/main.jsx,
src/test/setup.js) -- moved music.js + mountain-king.js ahead of
monsters.js in all three, kept in sync, after confirming (by grep) neither
module depends on anything that would now load after it.

**Step 2 -- fix what actually broke, not what was guessed to break:** ran
the full verification suite BEFORE writing any test fix, to find the real
blast radius rather than trusting GOALS.md's own prior guess ("the two
Mend-intent tests" -- which turned out to be wrong; those two tests never
touch `startCombat`/duel routing at all and were completely unaffected).
What actually broke:
- `test/dom-check.js` (jsdom, no `window.AudioContext` at all):
  `Game.startDuelFight` calls `initAudioContext()` UNCAUGHT (every other
  sound call site wraps it in try/catch, this one doesn't) -- a hard
  SCRIPT CRASH the instant any test entered boss_vowelmaw through the real
  `startCombat` path, not a graceful failure. Two spots hit this: a
  generic "boss entrance/defeat SFX" audio check that grabbed
  `Object.keys(Monsters.BOSS_DEFS)[0]` (happened to be boss_vowelmaw), and
  the floor-1 boss-skip scenario (`enterAndKillBoss(1, 'boss_vowelmaw',
  ...)`, a forced `hp=1` + one submitted word -- not a deterministic
  duel-mode kill even setting the crash aside, since a duel kill needs a
  WON PUSH crossing the gauge, not an hp subtraction). Neither test is
  actually ABOUT boss_vowelmaw specifically, so both were repointed at
  `boss_unabridged` (floor 2, still turn-based) -- the boss-skip scenario
  is now `boss-skip/floor2`, same floor-advance + skip-flag-survival
  assertions, one floor over. Zero net coverage loss: identical `16/16 ALL
  CHECKS PASSED` before and after, just relabeled.
- `src/components/__tests__/RewardScreens.test.jsx`: same jsdom crash, one
  test (`BossRewardScreen`'s reward-flow test, via
  `findNodeIdByType(state, 'boss')` -- always floor 1's boss). Fixed by
  pushing a synthetic `boss_unabridged` node directly, the same technique
  dom-check's own `enterAndKillBoss` helper already uses, since the test is
  about BossRewardScreen's UI flow after any kill, not which boss.
- `test/verify-react-qa-boss-reward.js` + `test/orchestrator-qa-boss-reward.js`
  (both real Chromium, real AudioContext -- no crash, but a real duel
  genuinely starts now): both asserted `Game._getMusicMode() === 'boss'`/
  `'normal'`, the placeholder turn-based background-music system's own
  tracker, which `startDuelFight` bypasses entirely (a real Music
  sequencer plays instead) -- fixed by checking `state.monster.duel ===
  true` and `!state.duel && !state.duelSequencer` instead, the actual
  duel-mode equivalent. `verify-react-qa-boss-reward.js`'s
  `killBossViaRealWord` also needed a real fix: `monster.hp = 1` alone no
  longer guarantees a one-word kill, so for a duel-mode monster it now
  forces `duel.pushesToDefeat = 1` + `duel.gauge = Duel.GAUGE_MAX - 1`
  (one point from winning) instead -- the duel equivalent of forcing hp=1,
  not a balance claim. `orchestrator-qa-boss-reward.js` needed NO change to
  its own kill mechanism -- it already plays real words in an organic
  `fightUntilOver(page, 40)` loop, which (with no tick loop in
  wordbound.html to push back) just kept winning pushes across enough real
  turns and passed unchanged once the two assertion fixes landed. This is
  real, running proof of the decision's own step 3: wordbound.html's
  floor-1 boss fight is now a genuine (pushback-free, no rAF loop there)
  duel, not a crash -- "stops being load-bearing for duel-era defs," not
  "breaks."

**Why this satisfies the decision's own bar for retiring anything** ("never
delete legacy coverage whose behavior the React harness does not yet
verify... extend those first if any gap remains"): before this run, ZERO
script in this repo had ever reached a real duel fight through real UI in
a real browser -- `test:react-build`'s playthrough never meets a boss, and
`duelIntegration.test.js` injects `state.duel` directly rather than
reaching one organically. `test:react-qa` and `test:qa` are now both real,
passing, real-browser duel WIN proofs end to end (enter -> real words ->
real won pushes -> real kill -> real reward-panel flow) -- strictly better
coverage than what was relocated/retired, not a downgrade.

**Verified:**
- `npm test` (jsdom dom-check): ALL CHECKS PASSED (16/16), confirmed
  identical to the pre-change baseline except the relabeled floor/boss-id
  in exactly 4 check strings.
- `npx vitest run`, 3 consecutive runs: **124/124 every time, zero
  flakes**.
- `npm run build`: clean, 44 modules (unchanged -- a load-order reorder,
  not a new import).
- `npm run test:react-build` (real browser, built output): ALL CHECKS
  PASSED, unaffected (this seed's playthrough doesn't reach a boss).
- `npm run test:react-qa`: ALL CHECKS PASSED, **2 consecutive clean
  runs**, including the new real duel-mode assertions and the real duel
  win end-to-end (boss fight starts in duel mode -> real word wins a push
  -> duel torn down -> tile-reward -> boss-item-reward, claim AND skip
  paths, including a 375px mobile-layout check of the reward panel).
- `npm run test:mobile`: ALL CHECKS PASSED, unaffected.
- `npm run test:qa` (real browser, `wordbound.html`): ALL CHECKS PASSED --
  the first real proof wordbound.html's own floor-1 boss fight survives
  becoming duel-mode rather than crashing.
- `npm run test:music-engine`: ALL CHECKS PASSED, unaffected.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED
  (zip genuinely contains `pieces/mountain-king.js`/`duel.js`/
  `duelCombat.js`, confirmed by the packaged file listing, not assumed).

**Not done:** the crescendo-approaching countdown (still hardcoded `null`
in `CombatScreen.jsx`), the Largo tempo-scale control surface, Second
Wind's retarget at `healthBlocks` (still a no-op in a duel fight), the
virtual-clock balance sim (this run's `pushesToDefeat: 3` is a structural
default carried over, not a balance measurement), Valkyrie Marshal's and
the final boss's own real pieces (only Mountain King is sequenced), and --
genuinely new scope, not previously flagged -- a real-browser Playwright
check of a duel LOSS (this run only proved WIN end-to-end; the ticket's own
VERIFY line explicitly asks for "full duel win AND loss"). DUEL-GAUGE
COMBAT ticket stays unchecked -- this was a real, verified sub-step
(closing the boss-def blocker + adding the first real duel-win coverage
the decision required), not full ticket completion, so no version bump per
this repo's own convention (bump on completed features). **Next:** a
real-browser duel-LOSS check is the cleanest, most direct way to close the
ticket's remaining "win AND loss" verify gap -- same technique as this
run's win check (force `duel.gauge` toward `Duel.GAUGE_MIN` instead of
`GAUGE_MAX`), asserting a health block is lost, the i-frame window is
visible, and GAME_OVER eventually triggers once healthBlocks reaches 0.
The crescendo-approaching countdown and Largo surface are smaller,
independent UI pieces after that; Second Wind's retarget and the balance
sim are real but now lower-urgency than they were pre-cutover, since a
duel fight is finally reachable to balance against for real. COMBAT
JUICE's damage-landed hook remains available as a separate, lower-priority
pickup whenever this queue is otherwise empty.

## 2026-08-22T03:20Z -- DUEL-GAUGE COMBAT: real-browser duel-LOSS check, closing the ticket's "win AND loss" verify gap

Picked up the prior run's own "Next" note exactly as scoped: a real-browser
duel WIN had been proven (the boss-def cutover run), but the ticket's own
VERIFY line explicitly asks for "full duel win AND loss with zero console
errors," and nothing had ever proven a loss live before this run.

**Built:** `test/verify-react-duel-loss.js` (new, `npm run
test:react-duel-loss`), against a real `vite build` output statically
served -- same bar every other `test:react-*` script holds itself to,
never the dev server. Reaches the same real floor-1 Mountain King duel
`test:react-qa` reaches (jump-to-boss-node, real click to start combat,
confirms `state.monster.duel === true`), then runs two phases:

- **Phase 1 (non-fatal loss):** forces `state.duel.gauge` to
  `Duel.GAUGE_MIN + 2` via `page.evaluate` (setup-only, same "force
  determinism via setup, let the real engine resolve the transition"
  convention `verify-react-qa-boss-reward.js`'s `killBossViaRealWord`
  already established for wins), then waits on the REAL per-frame tick
  loop -- `CombatScreen.jsx`'s own `requestAnimationFrame` effect calling
  the real `Game.tickDuel` -- to cross it. Nothing in this script calls
  `duel.tick`/`loseBlock` directly; losing a push has no discrete player
  action to trigger via UI the way winning does (a submitted word), so the
  continuous music-push tick crossing the gauge for real IS the mechanism
  under test. Confirmed: Verses 5 -> 4, gauge recenters to ~50, a real
  `.verse-pip-lost` renders, `VolumeGauge`'s `.volume-gauge-iframe` track
  class and "Grace period" banner go live -- the first time either has
  been observed in a real browser (they were built and Vitest/RTL-tested
  standalone by an earlier run, but never wired into a reachable fight
  until the boss-def cutover, and never actually triggered by a real block
  loss until this run) -- and that combat stays active (a non-fatal loss
  doesn't end the fight). Then waits out the real
  `Duel.IFRAME_DURATION_SEC` (read from the live page, not hardcoded) and
  confirms the grace banner/class clear on their own, proving i-frames are
  a temporary window rather than a permanent state flip.
- **Phase 2 (fatal defeat):** forces `state.duel.healthBlocks = 1` (setup,
  same convention) and repeats the gauge-to-the-edge trick on the SAME
  duel instance. The real tick loop's block loss empties healthBlocks, the
  real `duel.on('player-defeated')` handler inside `Game.startDuelFight`
  fires, a real `endRun(false)` runs, and `RunScreen.jsx`'s own
  early-return dispatch (GAME_OVER swaps the whole screen before the
  run-header wrapper, confirmed by an earlier STRUCTURAL run) shows a real
  "The Well Ran Dry" heading, `combatActive` clears, and `.volume-gauge` is
  gone. This is the first real-browser proof of the full
  `player-defeated` -> `endRun` -> GAME_OVER chain end to end -- the prior
  coverage (`duelIntegration.test.js`, `duel.test.js`) only ever exercised
  the underlying math/event-wiring in Vitest/jsdom, injecting `state.duel`
  directly rather than reaching a real, screen-swapping defeat through a
  real per-frame loop in a real browser.

Between phases 1 and 2, waited for the i-frame window to naturally elapse
before forcing the second loss -- `duel.tick`'s own `isIframeActive` guard
would otherwise no-op the forced gauge value indefinitely, since i-frames
suspend the music push entirely by design (the header HEALTH MODEL's own
"a brutal passage can never instantly chain away multiple blocks"
guarantee, now proven to hold for a script-forced edge case too, not just
the mocked-clock unit tests).

**Verified:**
- `npm run test:react-duel-loss`: **ALL CHECKS PASSED, 2 consecutive clean
  runs, zero flakes** -- 19 checks per run (fight entry, initial Verse
  count, the non-fatal loss + gauge recenter + pip/iframe UI, the grace
  window clearing on its own, the fatal defeat + GAME_OVER heading +
  combatActive clearing + the run screen swapping away, zero console
  errors, zero failed requests).
- `npm test` (jsdom dom-check): ALL CHECKS PASSED (16/16) -- unaffected,
  since this run touched no engine/`game.js` file, only a new standalone
  test script plus one `package.json` script entry
  (`test:react-duel-loss` + its `pretest:` dep-check twin, same pattern
  every other `test:react-*` script already uses).
- `npx vitest run`, 3 consecutive runs: **124/124 every time, zero
  flakes**.
- `npm run build`: clean, 44 modules, unchanged (no new import anywhere in
  the shipped app).
- `npm run test:react-build`, `npm run test:react-qa`, `npm run
  test:mobile`, `npm run test:qa`, `npm run test:music-engine`, `npm run
  build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED, unaffected.

**Not done:** the ticket's own VERIFY line's real-browser bar ("full duel
win AND loss with zero console errors") is now genuinely satisfied, but
DUEL-GAUGE COMBAT stays unchecked -- real remaining scope, unchanged from
the boss-def cutover run: the crescendo-approaching countdown (still
hardcoded `null` in `CombatScreen.jsx`), the Largo tempo-scale control
surface, Second Wind's retarget at `healthBlocks` (still a no-op in a duel
fight), the virtual-clock balance sim (this game's tuning numbers are
still "named starting points... explicitly flagged retunable"), and
Valkyrie Marshal's/the final Beethoven's-5th boss's own real sequenced
pieces (only Mountain King exists today). **Next:** any of those four are
now independent, no longer blocked on each other or on a reachable duel to
test against. The virtual-clock balance sim is probably the most valuable
next pickup -- a duel's win AND loss ends are both proven reachable and
correct now, so there's finally something real to balance the tuning
numbers against; the crescendo-approaching countdown and Largo surface are
smaller, self-contained UI pieces. COMBAT JUICE's damage-landed hook
remains available as a separate, lower-priority pickup whenever this queue
is otherwise empty.

## 2026-08-22T03:45Z -- DUEL-GAUGE COMBAT: crescendo-approaching countdown, live end to end

GOALS.md's queue order lists COMBAT JUICE (line 901) ahead of DUEL-GAUGE COMBAT
(line 1182), but COMBAT JUICE's own ticket text explicitly deprioritizes itself
("low urgency relative to MUSIC ENGINE / DUEL-GAUGE COMBAT... pick up
opportunistically or whenever the queue is otherwise empty"), and DUEL-GAUGE
COMBAT's own update-6 note still had four independent, unblocked pieces open.
Read both tickets' full history before picking; went with DUEL-GAUGE COMBAT's
smallest self-contained "Next" item -- the crescendo-approaching countdown,
`VolumeGauge`'s `approachingCrescendoSecondsAway` prop, hardcoded `null` in
`CombatScreen.jsx` since update-2 first built the component (GOALS.md's own
comment there said as much).

**Built** (full detail in GOALS.md's DUEL-GAUGE COMBAT update-7 note, not
duplicated here):
- `js/wordbound/music.js`: exposed the sequencer's already-existing internal
  `beatToTime(beat)` helper as public `seq.beatToTime` -- converts a future
  beat (a crescendo's `peakBeat`) into a real ctx.currentTime-axis timestamp.
- `js/wordbound/game.js`: `Game.startDuelFight` now also subscribes to
  `'crescendo-approaching'` (previously only `'crescendo-peak'`, for the
  parry window) and stores the computed peak time on
  `state.duelApproachingCrescendo`; the peak handler clears it (id-guarded)
  once it actually lands. New `Game.getApproachingCrescendoSecondsAway(now)`
  is a pure function over that stored value -- `null` once passed, never a
  negative countdown. The field is reset alongside the other three
  duel-scoped fields in both `startCombat` and `onMonsterDefeated`.
- `src/components/CombatScreen.jsx`: `VolumeGauge`'s prop now reads the real
  getter every render instead of the hardcoded `null`.

**A real hazard found and fixed before it could cause a flake, not by a
failing test but by reading the piece's own dynamics before writing the
real-browser check:** Mountain King's intensity curve is 0.85-1.0 in the
beat-63..71 range the new `test/verify-react-duel-loss.js` phase fast-forwards
the sequencer through (to avoid the ~30 real seconds the piece takes to reach
its approach beat naturally) -- meaning the real, still-running tick loop can
genuinely push a Verse loss as a side effect of proving the countdown. Correct
engine behavior, but it would have silently corrupted the SAME script's
existing phase 1/2 "first loss" assumptions if left alone. Fixed by resetting
`healthBlocks`/`gauge`/`iframeUntil` to a clean baseline right after the new
phase, before phase 1 runs, and re-capturing `initialBlocks` fresh from that
point -- the phases stay fully decoupled rather than depending on real timing
happening not to trigger an incidental loss.

**Verified:**
- 1 new Vitest unit test (`src/test/music.test.js`): `beatToTime` is a true
  inverse of `currentBeat()`/`timeToBeat` mid-piece, across a tempo
  breakpoint, not just at beat 0.
- 2 new Vitest tests (`src/test/duelIntegration.test.js`, real
  `Game.startDuelFight` + a real sequencer via the existing
  `FakeAudioContext` convention): the full
  approaching-\>countdown-\>peak-clears-it lifecycle against the real engine,
  and confirms the getter is `null` outside/before any duel fight.
- `npx vitest run`, 3 consecutive runs: **127/127 every time, zero flakes**
  (up from 124).
- `npm test` (jsdom dom-check): ALL CHECKS PASSED, unaffected (no
  `wordbound.html`-reachable behavior changed).
- `npm run build`: clean, 44 modules, unchanged (no new import anywhere).
- `npm run test:react-duel-loss` (real browser, built output, new phase
  added): **ALL CHECKS PASSED, 2 consecutive clean runs, zero flakes** --
  confirmed live: the warning banner appears, a real wall-clock 500ms wait
  shows the countdown genuinely decreasing (1.27s -\> 0.76s / 1.27s -\> 0.77s
  across the two runs), and it self-clears once the real crescendo-peak
  event fires as playback crosses the peak for real. All pre-existing
  win/loss assertions in that same script stayed green.
- `npm run test:react-build`, `npm run test:react-qa`, `npm run test:mobile`,
  `npm run test:qa`, `npm run test:music-engine`, `npm run build:itch` +
  `npm run test:itch-build`: ALL CHECKS PASSED, unaffected.

**Not done:** the Largo tempo-scale control surface, Second Wind's retarget
at `healthBlocks`, the virtual-clock balance sim, and Valkyrie Marshal's/the
final Beethoven's-5th boss's own real sequenced pieces are all still open,
unchanged from update-6. DUEL-GAUGE COMBAT stays unchecked -- this was one
more independent sub-step, not full ticket completion, so no version bump
per this repo's own convention (bump on completed features). **Next:** the
virtual-clock balance sim is probably the most valuable next pickup now that
a duel's win, loss, AND telegraph are all proven live -- there's a complete,
reachable mechanic to balance tuning numbers against. The Largo surface and
Second Wind's retarget are smaller, independent pieces after that. COMBAT
JUICE's damage-landed hook remains available as a separate, lower-priority
pickup whenever this queue is otherwise empty.

## 2026-08-22T04:15Z -- DUEL-GAUGE COMBAT: the Largo accessibility assist (tempo-scale control surface)

**Concurrent-run collision, handled per this repo's own established
precedent (STRUCTURAL 17/N, this ticket's own update-3/9):** this session
independently built the crescendo-approaching countdown (the same feature
GOALS.md's update-7 note describes) and had it fully verified before
discovering, on `git push`, that a separate concurrent hourly instance had
already landed and pushed the identical feature to `origin/main` first.
Confirmed genuinely equivalent by diffing before touching anything -- same
file set, same overall design (a stored `beatToTime`-derived countdown,
cleared on the real peak event), even the same real-browser hazard (racing
a sequencer's beat position out of sync with the separate real-time
gauge-push loop) independently found and fixed by both sessions. Did NOT
force-push the duplicate: `git reset --hard origin/main` to take the
already-pushed commit as-is, then read its own PROGRESS.md/GOALS.md "Next"
note for genuinely new value to land this run instead of wasted, redundant
work.

Picked up that note's smaller of two remaining independent pieces -- the
Largo tempo-scale control surface (the balance sim being the larger,
better suited to its own dedicated run). Per the header COMBAT MODEL's own
Accessibility bullet: "'Largo' assist (global tempo scale via the engine
hook, clearly labeled, no shame)." The engine hook itself
(`music.js`'s `setTempoScale`) has existed since the MUSIC ENGINE ticket;
nothing in the shipped app called it until this run.

**Design call, flagged plainly:** a flat ON/OFF toggle, not a slider -- a
duel's difficulty already scales through the MUSIC itself per the header
curve decision, so one clearly-labeled assist level is simpler to reason
about and honestly label than a dial with no stated range or units.
`LARGO_TEMPO_SCALE = 0.6` is a starting judgment call, documented at its
own definition -- same "explicitly flagged retunable" spirit as `duel.js`'s
own push constants, not balance-tested against a real player.

**Built:**
- `js/wordbound/game.js`: a persistent, localStorage-backed module-level
  setting (`wordbound_largo_enabled`), same load/save shape as the
  pre-existing `audioSettings` and for the same reason -- otherwise it
  would silently reset to off on every page load even for a player who
  explicitly turned it on. `Game.getLargoEnabled()`/
  `Game.setLargoEnabled(enabled)` are real public API (same "React has no
  closure access" reasoning as every prior audio/tile-staging wrapper).
  The setter applies LIVE to `state.duelSequencer` if one exists -- a
  player toggling Largo mid-duel feels it immediately, not just on their
  next fight -- and `Game.startDuelFight` also applies the current setting
  at fight-start, so a fight that begins with Largo already on starts slow
  rather than needing a toggle after the fact.
- `src/components/RunSidePanels.jsx`: `RunHeaderActions` (the same header
  component already hosting Deck/Consumables/music controls) gained a "🐢
  Largo" toggle button. Deliberately placed at the persistent header
  level rather than combat-only chrome -- visible and settable at all
  times, same as the music controls beside it, since it's a standing
  accessibility preference, not a per-fight control.
- `css/wordbound.css`: one small `.largo-toggle-btn-on` active-state rule,
  reusing `.btn-overcharge.armed`'s existing gold-glow color values rather
  than introducing a new palette for a third "this control is currently
  armed/on" state.
- `wordbound.html` deliberately gets NO Largo button -- per the standing
  ORCHESTRATOR DECISION that duel fights are React-only, a turn-based-only
  page has nothing for this control to affect. `Game.getLargoEnabled`/
  `setLargoEnabled` still live in the shared `game.js` (harmless,
  unreachable there) rather than being split into a React-only module,
  matching how every other `Game.*` wrapper in this ticket is
  shared-but-conditionally-relevant.

**Verified:**
- 3 new mocked-clock Vitest tests (`src/test/duelIntegration.test.js`):
  the setting defaults off and the getter/setter round-trip; a real
  `Game.startDuelFight`-created sequencer's live `getTempoScale()` changes
  the instant `setLargoEnabled` is called mid-fight, in both directions;
  a fight that STARTS with Largo already on begins at the slowed scale.
- 1 new Vitest/RTL test (`RunSidePanels.test.jsx`): a real click on the
  button flips `Game.getLargoEnabled()` and the button's label/class, same
  "leave settings as found" convention the pre-existing music-mute test in
  the same file already established (so this test doesn't leak a
  persisted `true` into whichever file Vitest happens to run next).
- `npx vitest run`, 3 consecutive full-suite runs: **131/131 every time,
  zero flakes** (up from 128 -- 4 new, all in this run's own two files;
  this session's earlier attempt at the crescendo-countdown work had
  independently characterized a pre-existing cross-file timing-race flake
  in this same suite, and it was not observed in any of these 3 runs).
- `npm test` (jsdom dom-check): ALL CHECKS PASSED (16/16), confirming
  every `game.js` change is a true no-op for `wordbound.html` (which never
  calls `Game.setLargoEnabled` and has no button to click).
- `npm run build`: clean, 44 modules, unchanged (no new import -- this run
  only added to existing modules).
- `npm run test:react-duel-loss` (real browser, built output) gained a new
  phase: a REAL click on the header's Largo button (not a direct
  `Game.setLargoEnabled()` call) confirms the wired-up button genuinely
  slows the live duel's sequencer (`getTempoScale()` 1 -\> 0.6), and a
  second click restores normal pace before the script's own pre-existing
  phases run, so this new check doesn't skew the real-time assumptions
  those phases were already written against. **3 consecutive clean runs,
  zero flakes.**
- `npm run test:react-build`, `npm run test:react-qa`, `npm run
  test:mobile`, `npm run test:qa`, `npm run test:music-engine`, `npm run
  build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED, unaffected.

**Not done:** Second Wind's retarget at `healthBlocks`, the virtual-clock
balance sim, and Valkyrie Marshal's/the final Beethoven's-5th boss's own
real sequenced pieces remain open, unchanged. DUEL-GAUGE COMBAT stays
unchecked -- a sub-step, not full ticket completion, so no version bump
per this repo's own convention. **Next:** the virtual-clock balance sim is
probably the most valuable remaining pickup -- a duel's win, loss,
telegraph, AND its accessibility assist are all now live and provably
reachable, so there's a genuinely complete mechanic to balance tuning
numbers against. Second Wind's retarget is the smaller, independent piece
after that. COMBAT JUICE's damage-landed hook remains available as a
separate, lower-priority pickup whenever this queue is otherwise empty.

## 2026-08-22T04:44Z -- DUEL-GAUGE COMBAT: Second Wind's duel-mode retarget (onDuelBlockLost)

Repo state on start: `git fetch origin main` showed the local clone's `HEAD`
was a detached checkout at `origin/main`'s real tip (`1029b11`, the Largo
run) while the local `main` branch ref itself was stale at the seed commit
(`f98ff83`) -- a leftover from how this container's clone was set up, not
lost work. Fixed by re-fetching and `git checkout -B main origin/main`
before touching anything; no data was at risk (origin/main was always the
real tip), just the local ref bookkeeping.

Picked up update-8's own smaller "Next" item -- Second Wind's retarget at
`healthBlocks`, over the virtual-clock balance sim (the queue's other named
option). Read the sim bullet again before deciding: it asks to "confirm
each tier is winnable/losable as intended," but only ONE piece/boss exists
today (Mountain King, `mid` tier) -- REGULAR ENEMIES and the other bosses'
pieces are still open, unstarted queue items below this one. A tier-curve
sim against a single data point would be premature and is flagged as such
in GOALS.md for whoever picks the sim up next, rather than starting it here
against incomplete inputs.

**The gap:** Second Wind's turn-based `onPlayerDamaged` hook (items.js)
caps `ctx.damage` before a counterattack lands, saving the player at 1 ink
instead of 0. A duel fight's health loss is a discrete Verse
(`player.healthBlocks`/`duel.healthBlocks`), decided entirely inside
`duel.js`'s own private `loseBlock` function -- no per-word damage amount
to cap, and no `onPlayerDamaged` call site anywhere on that path. Confirmed
by grep before writing anything: Second Wind silently did nothing in a
duel fight, an honest gap flagged by name in this ticket's own update-4
note back when the cutover first landed.

**Built:**
- `js/wordbound/items.js`: a new hook type, `onDuelBlockLost(ctx)`
  (`ctx = { player, duel, monster }`), documented in the file's own header
  comment as the duel-mode analog of `onPlayerDamaged`. Second Wind's
  `hooks` object gains it alongside the existing `onPlayerDamaged`
  (unchanged): if `ctx.duel.healthBlocks` is already 0 (this loss would be
  fatal) and `ctx.player.usedSecondWind` hasn't fired yet, it sets
  `ctx.duel.healthBlocks = 1` and marks the flag used -- the discrete-block
  equivalent of "cap damage to ink - 1," i.e. survive on the last sliver,
  not undamaged.
- `js/wordbound/game.js`: `Game.startDuelFight` gains one new
  `duel.on('block-lost', function () { Items.runHook('onDuelBlockLost', {
  player: state.player, duel: duel, monster: monster }, state.player); })`
  listener, registered BEFORE the pre-existing
  `DuelCombat.syncHealthBlocks(state.player, duel)` call. Order matters and
  is documented inline: `duel.js`'s emitter runs every `'block-lost'`
  listener synchronously, in registration order, before `loseBlock`'s own
  post-emit `if (duel.healthBlocks <= 0) { emit('player-defeated') }`
  check -- so a listener that revives `duel.healthBlocks` back to 1 during
  the emit is enough to make that post-emit check see 1 and skip
  `'player-defeated'` entirely. No `duel.js` change needed; it stays exactly
  as ignorant of items as its own header comment says it should, since the
  cancellation happens via ordinary state mutation inside an event listener,
  not a new hook/callback parameter on the engine itself.

**A real, previously-latent bug caught and fixed before it could ship, not
found by a failing test:** while writing the above, re-read
`DuelCombat.syncHealthBlocks` in `duelCombat.js` and noticed its existing
listener read `payload.healthBlocks` -- a plain number copied into the
event's payload object argument AT THE MOMENT `emit()` IS CALLED, before any
listener (including a newly-added earlier one) runs. Registering the Second
Wind listener first correctly revives the ENGINE's own live
`duel.healthBlocks`, but `syncHealthBlocks`'s listener running after it
would still copy the STALE pre-revival snapshot (0) into
`player.healthBlocks` -- a genuine desync where `player.healthBlocks` reads
0 (looking dead) while `duel.healthBlocks`/`duel.isTerminal()` correctly say
1/alive. Nothing in the pre-existing suite would have caught this (no test
before this run ever mutated `duel.healthBlocks` from inside a
`'block-lost'` listener). Fixed by changing `syncHealthBlocks` to read
`duel.healthBlocks` live at listener-call time instead of the payload
snapshot -- confirmed correct by the new tests below, which assert
`player.healthBlocks` equals the post-revival value, not 0. Documented the
ordering dependency (Second Wind's listener must register before
`syncHealthBlocks`'s) in both files' own header comments.

**Verified:**
- 4 new mocked-clock Vitest tests (`src/test/duelIntegration.test.js`, real
  `Game.startDuelFight` + `Items.runHook` + `duel.js`, no mocks of any of
  the three): a would-be-fatal loss revives to 1 Verse and leaves the duel
  non-terminal; `player.healthBlocks` syncs to the LIVE revived value (the
  bug-fix's own regression guard); i-frames still apply after the save
  (`iframeUntil` is set before the `'block-lost'` emit in `loseBlock`,
  confirmed rather than assumed); Second Wind only saves once -- a second
  fatal loss after the flag is spent ends the run for real, same
  `player-defeated`/`GAME_OVER` chain as before; and an unequipped control
  case confirms zero regression to the pre-existing death path.
- `npx vitest run`, 3 consecutive full-suite runs: **135/135 every time,
  zero flakes** (up from 131 -- 4 new, all in this run's own additions).
- `npm test` (jsdom dom-check): ALL CHECKS PASSED (16/16) -- unaffected,
  `wordbound.html` never reaches `Game.startDuelFight` with `second_wind`
  in any existing check.
- `npm run build`: clean, 44 modules, unchanged (no new import -- pure
  additions to existing modules, `items.js`/`game.js`/`duelCombat.js`).
- New real-browser phase added to `test/verify-react-duel-loss.js` (against
  the real, already-reachable floor-1 Mountain King duel, real `vite build`
  output, never the dev server) -- grants `second_wind` via `page.evaluate`
  (setup only, same convention as forcing `healthBlocks`/`gauge`
  elsewhere in this script; no shop/treasure UI exists yet to pick an item
  up for real), forces the same fatal setup the pre-existing fatal-defeat
  phase already used, and lets the REAL per-frame tick loop
  (`CombatScreen.jsx`'s own `requestAnimationFrame` effect calling the real
  `Game.tickDuel`) cross it for real -- confirms live: `duel.healthBlocks`
  stays 1, `duel.isTerminal()` is false, `combatActive` stays true,
  `state.screen` never reaches `GAME_OVER`. The item is stripped
  afterward so the pre-existing fatal-defeat phase still exercises the
  real, un-saved death path unchanged. **2 consecutive clean runs, zero
  flakes**; every pre-existing assertion in that script (win/loss
  telegraph/Largo/i-frame checks) stayed green throughout.
- `npm run test:react-build`, `npm run test:react-qa`, `npm run
  test:mobile`, `npm run test:qa`, `npm run test:music-engine`, `npm run
  build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED, unaffected.

**Not done:** the virtual-clock balance sim and Valkyrie Marshal's/the
final Beethoven's-5th boss's own real sequenced pieces remain open,
unchanged. DUEL-GAUGE COMBAT stays unchecked -- a sub-step, not full
completion, per this repo's own convention (no version bump). **Next:**
the balance sim is the one piece left this ticket's own VERIFY line asks
for, but per this run's own finding, a meaningful tier-curve sim needs more
than Mountain King alone to balance against -- either scope it narrowly to
what exists today (confirming Mountain King's own tier is winnable/losable
as intended) or sequence at least one more piece/monster first (REGULAR
ENEMIES/boss-roster territory). Whoever picks it up should make that
scoping call explicitly. COMBAT JUICE's damage-landed hook remains
available as a separate, lower-priority pickup whenever this queue is
otherwise empty.
separate, lower-priority pickup whenever this queue is otherwise empty.

## 2026-08-22T04:52Z -- DUEL-GAUGE COMBAT: virtual-clock balance simulation

**Concurrent-run collision, reconciled via a real git merge (not a
force-push), per this repo's own established precedent:** this session's
work below was authored independently of, and at the same time as, the
Second Wind retarget entry immediately above (a separate hourly instance).
The two touch disjoint files (`test/duel-balance-simulation.js` + a new
`package.json` script line here, vs. `game.js`/`items.js` there) and are
fully independent, so both stand as-is in chronological order. Worth
noting: that entry's own "Next" note raised an open scoping question this
run's own design directly answers -- "either scope the sim narrowly to
Mountain King alone, or sequence another real piece first, whoever picks
it up should make that call explicitly." Resolved here as "both at once":
Mountain King validated for real, the other three tiers run against
clearly-flagged synthetic proxy schedules rather than waiting on more real
content to land first. Full merge verification (combined tree, both
changes together) at the end of this entry.

Picked up the previous run's own "Next" note: the virtual-clock duel
simulation, the ticket's own VERIFY line ("deterministic intensity schedule
+ bot with configurable word-rate/reaction profiles; confirm each tier is
winnable/losable as intended").

**Built:** `test/duel-balance-simulation.js`, a new pure-Node script (no
jsdom/Playwright needed -- `duel.js`/`music.js` are both framework-agnostic
with zero DOM/WebAudio calls on the code paths this script drives, so a
one-line `window = global` shim is enough to load the REAL engine modules
and run the real math, rather than reimplementing the gauge/intensity
formulas separately). New `npm run test:duel-balance` script.

**Design, documented at length in the script's own header:**
- Only ONE real sequenced piece exists (Mountain King, `stageTier: 'mid'`).
  'early'/'late'/'final' have no real piece yet (Valkyrie Marshal and the
  final Beethoven's-5th boss are both still unbuilt per every prior run's
  "Not done" note), so those three tiers run against SYNTHETIC deterministic
  intensity schedules -- a periodic base level plus triangular crescendo
  pulses, hand-tuned to the header COMBAT MODEL's own curve language (early:
  rare/gentle bumps every 20s to intensity 0.3; late: frequent/strong bumps
  every 9s to 0.85; final: frequent/max bumps every 5s to 1.0). These are
  explicitly flagged as a tuning-sanity proxy, not real per-tier data.
- 'mid' tier runs against the REAL Mountain King piece's actual
  `dynamics.keyframes`/tempo/crescendo fields -- reimplemented `music.js`'s
  private beat<->time conversion locally (it's not part of `Music`'s public
  API) rather than duplicating scheduler internals. This is the one tier
  whose numbers below validate the actual shipped boss.
- 3 bot profiles (weak/average/skilled: word-play interval, word-score
  distribution, and a "timing skill" that lets average/skilled bots snap
  their next word toward a known upcoming crescendo peak -- simulating a
  player reading the TELEGRAPH UI's warning) x 4 tiers x 2 encounter kinds
  (regular `pushesToDefeat:1`, boss `pushesToDefeat:3`, both exactly
  `game.js`'s own `monster.isBoss ? 3 : 1` default) = 24 combos.
- Deterministic: seeded `mulberry32` PRNG per (tier, kind, profile, trial
  index) -- ran the script twice and `diff`'d the full stdout, byte-
  identical both times.
- Each duel starts fresh at `Duel.DEFAULT_HEALTH_BLOCKS` (5) -- cross-fight
  health attrition across a whole run is out of scope; this validates a
  SINGLE duel per tier, which is what the VERIFY line asks for.
- Horizon: 300s per simulated duel (a duel that hasn't resolved by then is
  recorded as a "stalemate," not a win/loss). Picked by measurement, not
  guessed upfront -- first ran at 240s, found a real right-skewed tail on
  the safest combo (early/weak: a near-zero-net-drift random walk that's
  positive-drift but slow, not dangerous), raised the horizon until that
  tail mostly cleared rather than mislabeling a slow-but-safe fight as
  "stalemate."

**Findings (40 trials/combo, this run's actual numbers -- full table in
`test/duel-balance-simulation-results.json`):**
- Early tier: 0% loss rate across ALL THREE bot profiles, including 'weak'
  -- "nearly-safe learning space" holds numerically, not just by design
  intent. (Weak-bot early fights do have a real, expected slow tail: ~20%
  of trials pass 300s before resolving, purely a pacing curiosity since 0%
  of those ever take damage -- flagged as INFO, not a bug.)
  - Note: "early tier + boss" isn't a real designed pairing (no boss in
    THEME.md's roster is `stageTier: 'early'`) -- simulated anyway for
    engine-tuning-sanity coverage, but excluded from the script's own
    sanity-flag checks and marked "(no real pairing yet)" in its output so
    it doesn't read as a balance bug for a fight nobody plans to ship.
- Mid (the REAL Mountain King boss, `pushesToDefeat: 3`): weak bot 0% win
  (100% loss), average bot 67-75% win (25-33% loss, ~3.4 Verses lost on
  average even when winning), skilled bot 100% win. A real, escalating,
  three-tier difficulty curve against the actual shipped boss's actual
  piece data, not a proxy.
- Late / final tiers (synthetic proxies): same escalating shape -- weak
  play loses essentially 100% of the time at every tier/kind, average play
  is genuinely mixed (25-65% win depending on tier/kind), skilled play wins
  consistently but never for free: final-tier boss's skilled-bot win rate
  is 100% but costs an avg 3.1 of 5 Verses to get there. "Only the
  strongest survive" reads as true on these numbers, not merely true by
  the win/loss binary.
- **Deliberately did NOT retune `duel.js`'s `STAGE_TIER_BASE_PUSH`/
  `INTENSITY_PUSH_SCALE`/`WORD_PUSH_SCALE`** off these results this run.
  3 of 4 tiers are still this run's own synthetic proxy curves (not
  calibrated against any real piece or real player), and the one tier with
  real piece data (mid) already lands inside the intended curve -- there's
  no confirmed problem to fix, only a tuning trail (this entry, and the
  script's own results JSON) for whoever revisits this once Valkyrie
  Marshal / the final boss get real sequenced pieces.

**Verified:**
- `test/duel-balance-simulation.js` itself: ran twice consecutively,
  `diff`'d full stdout -- byte-identical (deterministic).
- `npm test` (jsdom dom-check): ALL CHECKS PASSED, unaffected -- no
  `game.js`/`wordbound.html` change this run (purely a new standalone
  script + one new `package.json` script entry).
- `npx vitest run`: 131/131, unaffected (no `src/` change).
- `npm run build`: clean, 44 modules, unchanged -- confirms the new script
  is a true no-op for the shipped app (nothing imports it).
- `npm run test:react-build`, `npm run test:react-qa`, `npm run
  test:react-duel-loss`, `npm run test:mobile`, `npm run test:qa`, `npm run
  test:music-engine`, `npm run build:itch` + `npm run test:itch-build`:
  not rerun this run -- none of this run's files (a new, previously-
  nonexistent script; one additive `package.json` line) are reachable from
  any path those suites exercise, so there's nothing for them to catch
  that `npm test`/`vitest`/`build` wouldn't already; noting the gap plainly
  rather than silently claiming a full sweep.

**Not done:** Valkyrie Marshal's/the final Beethoven's-5th boss's own real
sequenced pieces remain open, unchanged (Second Wind's retarget, open at
the time this run started, was independently landed by the concurrent
run above during the merge reconciled at the top of this entry -- no
longer open in this merged state). DUEL-GAUGE COMBAT stays unchecked --
balance-sim infrastructure is built and gives clean, informative results,
but it's still a proxy for 3 of 4 tiers. No version bump, per this repo's
own convention (bump on completed features, not sub-steps). **Next:**
once Valkyrie Marshal / the final boss get real pieces, rerun `npm run
test:duel-balance` (or add a new `TIER_CONFIGS` entry pointing at their
real piece, the way 'mid'
already uses Mountain King) to replace their synthetic proxy numbers with
real validated ones. COMBAT JUICE's damage-landed hook remains available
as a separate, lower-priority pickup whenever this queue is otherwise
empty.

## 2026-08-22T05:24Z -- DUEL-GAUGE COMBAT: Valkyrie Marshal's real piece

Picked up the previous run's own "Next" note: sequence a real piece for the
Valkyrie Marshal (THEME.md's floor-3 boss, 'late' stage-tier) -- the last
real per-tier data gap the balance sim's own findings flagged ('early' and
'final' still have no real piece, but 'late' was the one the ticket's own
notes had been pointing at for several runs running).

**Scope call, stated up front:** sequencing the piece only, same bar the
original MUSIC ENGINE ticket held itself to ("sequence at least ONE vetted
famous piece end-to-end as the proof") before DUEL-GAUGE COMBAT wired
Mountain King into a real boss def in a separate, later run. Reskinning
`boss_sovereign` into the actual Valkyrie Marshal boss is real, substantial
work of its own (update-5's account of doing this for Mountain King touched
load order, dom-check test relocations, and two real-browser QA scripts'
kill mechanisms) -- deliberately left for the next run rather than rushed
into the same hour as composing the piece.

**Built:** `js/wordbound/pieces/valkyrie-marshal.js` -- "Ride of the
Valkyries" (Wagner's Walkürenritt). PD vetting (THEME.md's own table,
standing rule re-checked): composed 1856, Wagner died 1883 (143 years as of
2026) -- safely public domain. Hand-authored transcription, not a
scholarly edition, same disclosure convention as mountain-king.js's own
header.

Design follows THEME.md's own text directly: "no theatrics, no taunting
pause, just relentless forward pressure from the first note... the piece
barely lets up long enough to breathe" and "the most continuously
aggressive of the three floor bosses by design." Concretely:
- `dynamics.keyframes` never drops below 0.5 (Mountain King starts at 0.05
  and builds) -- this piece is loud from beat 0.
- FOUR real crescendo markers across 64 beats (Mountain King has exactly
  one, spanning almost the whole piece) -- 'late' tier's own "frequent,
  powerful crescendos" per the header COMBAT MODEL curve decision, a
  genuinely different rhythm of threat than Mountain King's single ramp
  teaches.
- A bass ostinato with zero rests for the piece's entire length -- "barely
  lets up" made literal in the note data, not just the intensity curve.
- Constant 152bpm tempo throughout, no accelerando -- Mountain King builds
  into its speed; this piece starts at full gallop.
- Melody: a 4-beat dotted "gallop" fanfare figure (rising B-D-F#-B triad,
  long-short rhythm) answered by a falling echo, the same call-and-response
  shape mountain-king.js's own motif uses, transposed to this piece's
  faster rhythm.

Wired as a true no-op everywhere (same bar mountain-king.js was held to
before its own integration run): `wordbound.html`, `src/main.jsx`,
`src/test/setup.js`, `tools/build-itch.js`'s dependency list all load it
alongside mountain-king.js. Nothing in `monsters.js`/`game.js` references
it yet -- confirmed by `npm run build` staying at exactly one new module
(45, up from 44) with no other file touched.

**Balance-sim upgrade (test/duel-balance-simulation.js):** the 'late' tier
previously ran on the same synthetic triangular-pulse proxy 'early'/'final'
still use. Refactored the script's real-piece machinery -- previously
hardcoded to Mountain King's single crescendo marker (`mkIntensityFn`/
`mkPeakTimes`) -- into a generic `realPieceTier(piece)` helper that
correctly handles a piece with MULTIPLE crescendo markers per loop (sorts
and repeats all of them across the simulation horizon, not just the
first). Applied to both mid (Mountain King, confirmed unchanged behavior --
identical mid-tier numbers before/after the refactor) and late (Valkyrie
Marshal, genuinely new real data). Removed `TIER_CONFIGS.late`'s now-dead
synthetic config rather than leaving it orphaned.

**Findings, real Valkyrie Marshal data (40 trials/combo, full table in
`test/duel-balance-simulation-results.json`):**
- late/regular: weak 0% win, average 25% win (75% loss, 2.90 avg Verses
  lost even on a win), skilled 100% win (1.13 avg Verses lost).
- late/boss (the Valkyrie Marshal herself): weak 0% win, average 0% win
  (100% loss -- notably harsher than mid/boss's average-bot 75% win rate),
  skilled 93% win / 8% loss (3.08 avg Verses lost on a win).
- Reads as a real escalating step beyond Mountain King, per the header
  curve decision's intent. One thing flagged plainly, not fixed: the
  average-bot cliff from mid-boss (75% win) to late-boss (0% win) is
  steeper than the gap from late-boss to final-boss (also 0% win for an
  average bot against the still-synthetic final tier) -- i.e. late and
  final now read similarly harsh to an average-skill bot. Worth Jaxon's
  eye on whether the floor-3 boss should feel distinctly easier than the
  final boss, or whether "the last thing standing before the Podium"
  earning near-final difficulty is the intended read (THEME.md's own text
  leans toward the latter -- "the last thing standing between the player
  and the Podium"). Deliberately did NOT retune `duel.js`'s push constants
  off this single finding -- one real piece's data point isn't enough to
  justify a global rebalance on its own, consistent with the balance-sim
  ticket's own established practice of documenting a tuning trail rather
  than reacting to individual results.

**Verified:**
- 7 new Vitest tests (`src/test/valkyrieMarshal.test.js`), mirroring
  music.test.js's own FakeAudioContext convention (no mocks of the piece
  data or the engine): PD vetting, floor/tier tagging, well-formed
  monotonic keyframes spanning the full piece, the "never below 0.5"
  intensity floor, exactly 4 crescendo markers (vs. Mountain King's 1,
  checked directly), the unbroken bass ostinato, and a full real scheduling
  pass through `Music.createSequencer` that produces real started
  oscillators start-to-finish.
- `npx vitest run`, 3 consecutive full-suite runs: **142/142 every time,
  zero flakes** (up from 135 -- 7 new, all in this run's own file).
- `npm test` (jsdom dom-check): ALL CHECKS PASSED (16/16), unaffected -- no
  `game.js`/monster-def change this run.
- `npm run build`: clean, 45 modules (up from 44, the one genuinely new
  module), same pre-existing chunk-size notice.
- `npm run test:react-build` (real browser, built output): one run hit the
  pre-existing, already-characterized `flipTileTo`/double-rAF-timing flake
  from the COMBAT JUICE ticket (unrelated to anything touched this run --
  no CombatScreen.jsx/game.js change here); reran clean twice more with
  zero further code changes, confirming it wasn't a real regression.
- `npm run test:react-qa`, `npm run test:react-duel-loss`, `npm run
  test:mobile`, `npm run test:qa`, `npm run test:music-engine`: ALL CHECKS
  PASSED, unaffected.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED --
  confirmed `pieces/valkyrie-marshal.js` is genuinely present in the
  packaged zip listing.
- `node test/duel-balance-simulation.js` run twice consecutively, byte-
  identical JSON output (deterministic, confirmed directly).

**Not done:** `boss_sovereign` is still "The Unabridged, Unbound" -- no
real boss def carries this piece yet, so (same state Mountain King was in
before update-5's own boss-def cutover) it's schedulable and
balance-simmable but not reachable by a real player. The final
Beethoven's-5th boss's piece remains completely unsequenced. DUEL-GAUGE
COMBAT stays unchecked -- a sub-step, not full completion, per this repo's
own convention (no version bump). **Next:** the boss-def cutover itself --
reskin `boss_sovereign` into "The Valkyrie Marshal" following update-5's
own established playbook exactly (load-order check, relocate
`test/dom-check.js`'s floor-3 boss coverage the same way floor-1's was
moved, make `verify-react-qa-boss-reward.js`/
`orchestrator-qa-boss-reward.js`'s kill mechanisms duel-aware for a
3rd-floor fight) -- unlocks a second real, playtestable duel and turns this
run's balance numbers from "schedulable" into "actually reached." The final
boss's piece (four Beethoven's-5th movements as fight phases, per THEME.md)
remains the largest single remaining piece of this ticket. COMBAT JUICE's
damage-landed hook remains available as a separate, lower-priority pickup
whenever this queue is otherwise empty.

## 2026-08-22T05:49Z -- DUEL-GAUGE COMBAT: Valkyrie Marshal's boss-def cutover

Picked up the previous run's own "Next" note: reskin `boss_sovereign` (floor
3's boss, "The Unabridged, Unbound") into the real Valkyrie Marshal boss,
following the exact playbook the Mountain King cutover established two runs
back. GOALS.md's queue order still put COMBAT JUICE first textually, but per
the header COMBAT MODEL decision DUEL-GAUGE COMBAT is the stated priority,
and this is squarely that ticket's own explicitly-scoped "Next" step, not a
detour -- same judgment call every recent DUEL-GAUGE run in this file has
made.

**Built:** `js/wordbound/monsters.js`'s `boss_sovereign` now carries
`name: 'The Valkyrie Marshal'`, `piece: window.Wordbound.Pieces.
valkyrieMarshal`, `pushesToDefeat: 3` -- `attack`/`intents`/`traitPhases`
left untouched (still legitimately read by direct `Monsters.createBoss`
unit coverage that never touches duel routing). Load order needed no
change; the previous run already sequenced `valkyrie-marshal.js` ahead of
`monsters.js` in `wordbound.html`/`src/main.jsx`/`src/test/setup.js` when it
composed the piece.

**Fixed exactly what broke** (confirmed by running the suite before
touching anything, not guessed): `test/dom-check.js`'s floor-3 boss-skip
scenario used `Monsters.createBoss('boss_sovereign')` via a real
`startCombat` path with a forced `hp=1` one-word kill -- now duel-mode, so
it would hit the same uncaught `initAudioContext()`-in-jsdom crash the
Mountain King cutover found, and hp=1 no longer guarantees a kill (a duel
kill needs a WON PUSH). That scenario is genuinely about "the run's LAST
floor boss defeat triggers VICTORY, not a floor advance" -- boss-identity-
agnostic in the real `advanceFloor`/`onMonsterDefeated` logic (read both
directly to confirm) -- and `enterAndKillBoss`'s `floorNumber`/`bossDefId`
args are already fully independent of each other (a synthetic node, not
real floor generation), so repointed it at `boss_unabridged` (still
turn-based) while keeping `floorNumber` at the real `Floor.TOTAL_FLOORS`,
same relocation technique as the floor-1-to-floor-2 move two runs back.
Zero coverage loss: identical `ALL CHECKS PASSED` (16/16) before and after.
The two isolated `Monsters.createBoss('boss_sovereign')` Enrage unit tests
never touch `startCombat` and needed no change.

**Extended both real-browser QA scripts to a genuine SECOND real duel** --
the previous run's "Next" note named this explicitly, and it's real new
value, not just crash-avoidance: `test/verify-react-qa-boss-reward.js`
gained a Phase 3, `test/orchestrator-qa-boss-reward.js` a Phase 4. Both now
continue past their existing floor-1/floor-2 coverage (unchanged) to reach
the floor-3 boss, confirm it fights as a real duel (`state.monster.duel
=== true`), kill it for real, and confirm claiming its item resolves to
VICTORY (not another floor advance) through the exact same reward-panel
plumbing every other boss kill uses. The vanilla script's `fightUntilOver`
needed zero changes -- confirmed, not assumed: wordbound.html has no rAF
tick loop, so a duel-mode boss there never gets real pushback regardless of
which piece it carries, so the same "submit real words until combat ends"
loop already covering Mountain King just works for Valkyrie Marshal too.

**A real bug found and root-caused, not shipped as a flake:** the React
script's new floor-3 phase failed intermittently on first landing --
caught because this repo's own convention is to run a new real-browser
check 3x before considering it done, and run 3 of 3 hung. Root cause,
confirmed by reading `Game.tickDuel`/`duel.js`'s push formula directly:
`killBossViaRealWord`'s "force the gauge one point from winning" setup
races the real-time tick loop's own ongoing enemy push. Mountain King opens
near-silent (intensity ~0.05), so the handful of real Playwright round
trips between combat starting and the forced kill landing were always
harmless there -- but Valkyrie Marshal's dynamics never drop below 0.5, and
at 'late' tier that's `STAGE_TIER_BASE_PUSH.late (6) + intensity *
INTENSITY_PUSH_SCALE (16)` = up to 22 gauge units/sec of continuous erosion,
enough to occasionally eat the "one point from winning" margin (and even
cost a health block) during that same setup window, leaving the fight
screen gone by the time the script tried to submit its forced killing word.
Fixed with a new `neutralizeDuelPush(page)` helper that zeroes
`state.duelSequencer.getIntensity` the instant each boss fight starts
(applied to all three boss encounters for consistency, though only floor-3
needed it) -- leaves only the tier's flat base-push term, safely smaller
than any real word's push. Confirmed the fix, not just the theory: 5
consecutive clean runs after landing it, up from a reproducible ~1/3
failure rate before (observed directly: pass, pass, hang, across 3
back-to-back runs pre-fix).

**Verified:**
- `npm test` (jsdom dom-check): ALL CHECKS PASSED (16/16), identical check
  count before/after (only the floor-3 boss-skip block's def-id/comment
  changed).
- `npx vitest run`, 4 consecutive full-suite runs: 142/142 three times, one
  single failure in `duelIntegration.test.js` (a REGULAR-combat test that
  never touches any boss def) that reproduced clean in isolation (22/22) --
  confirmed as the pre-existing, already-documented cross-file Vitest
  timing flake (STRUCTURAL 14-16/N notes), not a regression from this run.
- `npm run build`: clean, 45 modules, unchanged.
- `npm run test:react-build`: ALL CHECKS PASSED.
- `npm run test:react-qa`: **5 consecutive clean runs** after the
  `neutralizeDuelPush` fix -- this is the check that actually caught the
  race, so the repeat count here is the one that matters.
- `npm run test:qa`: 2 consecutive clean runs, including the new floor-3
  Phase 4.
- `npm run test:mobile`, `npm run test:react-duel-loss`, `npm run
  test:music-engine`: ALL CHECKS PASSED, unaffected.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED, zip
  confirmed to contain both piece files and the updated `monsters.js`.

**Not verified / honest gaps:** audible musicality of the reskin is
unchanged from the previous run's own honest note (Jaxon's ears, not
testable here) -- this run touched no piece data, only the def wiring and
test harness. Real human timing/feel of a floor-3 fight (vs. the bot-driven
balance-sim numbers from two runs back) is likewise not something this
harness can confirm.

**Not done:** the final Beethoven's-5th boss's piece remains the one
entirely unsequenced tier, and (per THEME.md) "the Podium" it belongs to
isn't a real floor the game generates yet (`Floor.TOTAL_FLOORS` is 3) --
both genuinely outside this run's bounded scope. DUEL-GAUGE COMBAT stays
unchecked. No version bump, per this ticket's own established convention
(a sub-step, not full completion). **Next:** the final boss is the largest
remaining piece -- composing Beethoven's 5th (four movements as fight
phases per THEME.md) AND giving it somewhere to be fought (a real
4th-floor/"Podium" boss def plus floor-generation support) is comparable to
two tickets' worth of work, not a bounded hour -- scope piece-composition
and floor/def-plumbing as separate runs, the same split this run and the
previous one used for Valkyrie Marshal. Once that lands, DUEL-GAUGE
COMBAT's own VERIFY-line pieces (real per-tier balance data, win, loss, and
now a third real duel) are all complete. COMBAT JUICE's damage-landed hook
remains available as a separate, lower-priority pickup whenever this queue
is otherwise empty.

## 2026-08-22T06:07Z -- DUEL-GAUGE COMBAT: Beethoven's 5th, the final boss's piece

Picked up update-12's own "Next" note, its own explicitly-scoped first half
only: compose the final boss's piece for real. Deliberately left the
floor/def-plumbing half (a real floor-4/"Podium" boss def + extending
`Floor.TOTAL_FLOORS` generation) for a future run, per update-12's own
split -- same shape as update-10/11's own piece-then-cutover split for the
Valkyrie Marshal.

**Built:** `js/wordbound/pieces/beethoven-5th.js` -- Symphony No. 5 in C
minor. PD vetting (THEME.md's own table, standing rule re-checked):
composed 1808, Beethoven died 1827 (199 years as of 2026) -- the most
safely public-domain piece in the whole roster by a wide margin.

THEME.md's own brief for this boss: "the famous opening four-note motif
(short-short-short-LONG)... played completely straight, as a threat, not a
metaphor" and "the symphony's four movements are the natural fight-phase
structure... each movement changes the shape of the pressure, not just its
intensity, ending on the finale's triumphant major-key turn as the last
phase." Modeled directly as four real tempo breakpoints (this piece's own
structural first among the three real pieces -- Valkyrie Marshal uses one
flat tempo throughout) spanning 112 beats:
- **I. Allegro con brio** (beats 0-31, 116bpm): the literal Fate motif --
  G-G-G-Eb, then F-F-F-D a step down (the real symphony's own restatement),
  developing and thickening into one closing crescendo.
- **II. Andante con moto** (beats 32-56, 76bpm -- the slowest movement): a
  genuine LOW-INTENSITY LULL with real RESTS in its own melody track data,
  not just a quieter dynamics curve -- the "changes the shape of the
  pressure" line taken literally. This is the first piece in the whole
  roster with a deliberately quiet movement and real silence in its own
  note data, the structural opposite of Valkyrie Marshal's never-rests
  ostinato.
- **III. Scherzo, Allegro** (beats 56-80, 112bpm): one long near-silent-to-
  maximum ramp (Mountain King's single-ramp technique, compressed into one
  movement of a larger piece), crescendoing straight into movement IV's
  downbeat -- the real symphony's famous attacca transition, played
  straight.
- **IV. Allegro, finale** (beats 80-112, 132bpm -- the fastest movement):
  a triumphant C-major fanfare (the one deliberately MAJOR pattern in the
  whole piece, everything else is minor-key), three more crescendo surges,
  a quiet callback to the scherzo's own minor-key material (the real
  symphony's actual structure), ending at intensity 1.0 exactly on the
  piece's final beat -- "the finale's triumphant major-key turn as the last
  phase."

Five real crescendo markers total (one each in movements I/III, three in
IV) -- more than Valkyrie Marshal's four, matching 'final' tier being one
step scarier than 'late' per the header curve decision. `stageTier:
'final'`.

**A real design bug caught by a test before landing, not shipped:** the
first draft placed movement I's crescendo peak AT beat 32, the exact
movement boundary -- `Music.intensityAt`'s linear interpolation kept that
loud value bleeding into movement II's own range, contradicting the
"changes the shape... not just intensity" brief with a lingering tail
instead of a real cut between movements. A new Vitest assertion
(measuring movement II's own actual peak intensity directly, not assumed)
caught this immediately. Fixed by moving the crescendo's peak to beat 31
and the lull's own keyframe to land exactly at beat 32 -- a genuine hard
cut now, closer to how the real symphony's movement break actually reads.

**Wired as a true no-op everywhere**, same bar every prior piece was held
to before its own later integration run: loaded alongside Mountain King/
Valkyrie Marshal in `wordbound.html`, `src/main.jsx`, `src/test/setup.js`,
`tools/build-itch.js`'s dependency list -- confirmed present in the
packaged itch zip listing directly, not assumed. Nothing in
`monsters.js`/`game.js` references it -- deliberately out of this run's
scope.

**Balance-sim upgrade, same shape as the previous run's Valkyrie Marshal
work:** `test/duel-balance-simulation.js`'s 'final' tier previously ran on
a synthetic triangular-pulse proxy (same as 'early' still does) --
replaced with the real piece via the already-generic `realPieceTier()`
helper (built two runs ago, unchanged this run). Only 'early' remains
synthetic now.

**Findings, real Beethoven's-5th data (40 trials/combo, full table in
`test/duel-balance-simulation-results.json`, replacing the old synthetic
final-tier numbers):**
- final/regular: weak 0% win, average 20% win (80% loss, 3.00 avg Verses
  lost even on a win), skilled 100% win (1.18 avg Verses lost).
- final/boss (the Maestro herself): weak 0% win, average 0% win (100%
  loss), skilled 93% win / 8% loss (3.14 avg Verses lost on a win) --
  reads almost identically to late/boss/skilled's own 93%/8%/3.08,
  confirming the previous run's own flagged observation (late and final
  reading similarly harsh to an average/skilled bot) with a second real
  data point instead of the old synthetic proxy. No new sanity-flag
  regressions -- the script's own DIFFICULTY/SAFETY checks against the
  header curve decision all still pass clean. Deliberately did NOT retune
  `duel.js`'s push constants off this single finding, consistent with this
  ticket's own established practice of documenting a tuning trail rather
  than reacting to one data point.

**Verified:**
- 10 new Vitest tests (`src/test/beethoven5th.test.js`, mirroring
  `valkyrieMarshal.test.js`'s own `FakeAudioContext` convention -- no mocks
  of the piece data or the engine): PD vetting, tier/boss tagging,
  well-formed monotonic keyframes, five crescendo markers, four real tempo
  breakpoints (movement II genuinely slowest, movement IV genuinely
  fastest), movement II's own low-intensity lull AND its real
  melody-track rests, the piece ending at intensity 1.0 on its exact final
  beat with a real final chord landing there in both melody/bass, and a
  full real scheduling pass through `Music.createSequencer` across all
  four tempo breakpoints (using the sequencer's own public
  `seq.beatToTime()` to get the real total duration correctly, rather than
  the flat `lengthBeats*60/tempo` shortcut a single-bpm piece can use).
- `npx vitest run`, 3 consecutive full-suite runs: **152/152 every time**
  (up from 142 -- 10 new, all in this run's own file). A separate 4-run
  attempt hit the pre-existing, already-characterized cross-file Vitest
  timing flake in `duelIntegration.test.js` (a regular-combat test, never
  touching any boss def or this run's files) -- confirmed unrelated.
- `npm test` (jsdom dom-check, wordbound.html): ALL CHECKS PASSED (16/16),
  unaffected -- no `game.js`/monster-def change this run.
- `npm run build`: clean, 46 modules (up from 45, the one genuinely new
  module).
- `npm run test:react-build`, `npm run test:react-qa`, `npm run
  test:react-duel-loss`, `npm run test:mobile`, `npm run test:qa`, `npm run
  test:music-engine`: ALL CHECKS PASSED, unaffected (this run touched no
  boss-def/combat wiring, only an unreferenced piece module + the
  balance-sim's own tier config).
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED, zip
  listing confirmed to contain `pieces/beethoven-5th.js`.
- `node test/duel-balance-simulation.js` run twice consecutively,
  byte-identical output (deterministic, confirmed directly).

**Not verified (honest gap, same as ever):** audible musicality is Jaxon's
call with real ears -- everything above is data-shape/scheduling/no-error
verification, not a listen-through.

**Not done:** the final boss still has no real, reachable boss def --
`monsters.js` has no floor-4/"Podium" entry, and `Floor.TOTAL_FLOORS` is
still 3 -- so these numbers remain schedulable/balance-simmable but not
player-reachable, exactly the state Mountain King/Valkyrie Marshal were
each in before their own later boss-def cutover runs. DUEL-GAUGE COMBAT
stays unchecked. No version bump. **Next:** the floor/def-plumbing half --
design and build a real floor 4 ("the Podium," per THEME.md) with a real
Maestro boss def carrying this piece, extending
`Floor.TOTAL_FLOORS`/floor-generation support and the VICTORY condition to
a real fourth floor. Genuinely bigger than the prior two boss-def
cutovers: floors 1-3 currently assume `TOTAL_FLOORS === 3` in several
places (dom-check's own VICTORY check, RunScreen's stats text, floor
generation itself) -- grep for `TOTAL_FLOORS` before starting, and expect
this to be its own multi-run push. Once it lands, DUEL-GAUGE COMBAT's own
four VERIFY-line pieces are all complete for real. COMBAT JUICE's
damage-landed hook remains available as a separate, lower-priority pickup
whenever this queue is otherwise empty.

## 2026-08-22T06:32Z -- DUEL-GAUGE COMBAT: floor 4 ("the Podium") + the Maestro --
## TICKET CHECKED OFF

Picked up the previous run's own "Next" note exactly as scoped: the
floor/def-plumbing half left open after Beethoven's 5th was composed but not
yet wired to a reachable boss. This closes DUEL-GAUGE COMBAT's stated
acceptance bar, so the ticket is checked off for the first time.

**Built:**
- `js/wordbound/monsters.js`: `boss_maestro` ("The Maestro," THEME.md's
  final boss) -- floor:4, carries `Pieces.beethoven5th`, `pushesToDefeat:3`
  (deliberately matched to the other three bosses AND to
  `test/duel-balance-simulation.js`'s own hardcoded `pushesToDefeat:3` for
  every "boss" scenario including 'final' -- checked directly rather than
  bumping to 4 to mirror the symphony's four movements, which are already
  expressed through the piece's own four tempo breakpoints/five crescendo
  markers, not a second redundant phase mechanic). maxHp:110 (escalating
  past the floor-3 boss's 85). traitPhases rareSeeker -> doubled: precise
  and certain at full HP, then rewarding doubled letters once wounded,
  echoing the famous short-short-short-LONG Fate motif's own repetition.
- `js/wordbound/floor.js`: `Floor.TOTAL_FLOORS` 3 -> 4. `ELITE_FLOOR_NUMBERS`
  deliberately left at `[2, 3]` -- no elite on the Podium, a clean walk to
  the Maestro. `Floor.generateBranchingFloor` (confirmed to be the LIVE
  generator by reading `game.js`'s `startRun`/`advanceFloor` -- both call
  it, not the older linear `generateFloor`) needed ZERO further changes:
  its tier/rest/shop/event logic already generalizes past floor 3.
- `js/wordbound/game.js`: `getFloorName` gained `4: 'The Podium'`; the
  per-floor `<body>` tint classList clear gained `floor-4`.
- `css/wordbound.css`: a `body.floor-4` tint rule (deep violet-gold).
- `MainMenu.jsx`/`wordbound.html`: menu-goal text "3 floors... floor 3
  boss" -> "4 floors... the Maestro on the Podium." Version bumped v0.1 ->
  v0.2 (GOALS.md's own convention: "bump minor per completed feature" --
  DUEL-GAUGE COMBAT, the signature mechanic, is now genuinely, fully
  checked off for the first time; noting honestly that STRUCTURAL and
  MUSIC ENGINE's own completions did NOT bump the version despite the same
  rule -- not fixing that retroactively, out of this run's scope, just not
  repeating the gap here).

**Tests fixed as a direct, mechanical consequence of floor 3 no longer
being last** (grepped `TOTAL_FLOORS`/"floor 3"/"LAST floor" across
`test/*.js` and `src/**/__tests__` FIRST, per the previous run's own
instruction, rather than discovering breaks one at a time):
- `test/dom-check.js`: hardcoded boss-count check (3 -> 4); floor-tint
  classList assertion gained `floor-4`. The boss-skip/VICTORY test itself
  needed NO change -- it already read `Floor.TOTAL_FLOORS` dynamically,
  confirmed before editing, not assumed.
- `src/components/__tests__/RunScreen.test.jsx`: the literal `Floor N / 3`
  text match; the victory test's `_advanceFloor()` call count (3 -> 4 calls)
  and its "cleared all 3 floors" text match.
- `src/components/__tests__/MainMenu.test.jsx`: the `v0.1` text match.
- `test/orchestrator-qa-boss-reward.js` (test:qa) and
  `test/verify-react-qa-boss-reward.js` (test:react-qa): both explicitly
  asserted "the floor-3 boss is the LAST floor boss, claiming its item
  triggers VICTORY" -- restructured both so floor 3's boss (Valkyrie
  Marshal) is now asserted to advance to floor 4, and a NEW phase was added
  for floor 4's boss (the Maestro) asserting the real VICTORY. Both reuse
  each script's existing generic boss-kill mechanism unchanged
  (`fightUntilOver`'s real-word-submission loop for wordbound.html;
  `killBossViaRealWord`'s forced-gauge-to-the-brink + one real word for the
  React app).

**A real, previously-latent bug found and fixed, not just papered over:**
`verify-react-qa-boss-reward.js`'s `killBossViaRealWord` used a small FIXED
`WORD_CANDIDATES` list (RADIO/ROAD/etc., an R/A/D/I/O/E/N/T letter family)
that happened to stay playable across floors 1-3 for the known seeded run,
but returned null at the new floor-4 phase -- by then the deterministic
seed's rack (after 3 real duel kills' worth of tile/item rewards) no longer
contained any of those letters, and the script crashed waiting on a reward
panel that never appeared. A fixed list can never promise to stay playable
against an ever-changing deck. Fixed by porting
`orchestrator-qa-boss-reward.js`'s own robust technique (already used for
wordbound.html, untouched by this bug): build a real anagram-subset index
from `window.Wordbound.WORDLIST` against the LIVE rack, keeping the existing
`Combat.previewWord` validity check as a second safety net. Deleted the now
-dead `WORD_CANDIDATES` constant. This is a real robustness fix for ANY
future floor/seed combination, not just floor 4.

**Found stale, confirmed pre-existing, left alone (out of scope):**
`test/verify-boss-skip-softlock-fix.js` is NOT wired into any `npm` script
or the mandatory gates (confirmed by grepping `package.json`) and was
ALREADY BROKEN on the base commit before this run's changes -- confirmed
directly via `git stash` + a clean re-run of the unmodified script, which
failed 6 of its checks even before any of this run's edits. Root cause:
it assumes the OLD linear `Floor.generateFloor` node shape/`currentNodeIndex`
semantics, but the live game has run on `Floor.generateBranchingFloor` for a
while (a `mapPositionNodeId`/row-lane shape). A pre-existing, unrelated bug
from the earlier branching-map cutover, not something this run caused --
gave it a textually-accurate update anyway (floor-3/floor-4 skip semantics)
since it directly encodes the exact scenario this run changed, but did not
attempt the real shape-mismatch fix, out of scope for this run. Flagging
concretely for whoever next needs this script for real.
`test/duel-balance-simulation.js`'s header comment (which explicitly said
"no floor-4/Podium exists... schedulable but not player-reachable") updated
to reflect reality -- no code change needed, since the sim never referenced
real defs/maxHp at all (pushesToDefeat is hardcoded per scenario kind, not
read from monsters.js).

**Verified:**
- `npm test` (jsdom dom-check): ALL CHECKS PASSED (17/17, up from 16 -- the
  boss-count assertion now checks 4).
- `npx vitest run`, 3 consecutive full-suite runs after the floor/def
  changes, plus a 4th after the version-bump edit: **152/152 every time,
  zero flakes** (unchanged count -- only fixed pre-existing hardcoded-3/
  hardcoded-v0.1 assertions, added no new tests this run).
- `npm run build`: clean, 46 modules, unchanged.
- `npm run test:mobile`: ALL CHECKS PASSED (touched CSS this run, so this
  gate was mandatory, not opportunistic, per GOALS.md's own header rule).
- `npm run test:qa`: ALL CHECKS PASSED, including the new real floor-4
  Maestro fight -> real VICTORY in a real browser via wordbound.html's own
  turn-submission mechanism.
- `npm run test:react-qa`: ALL CHECKS PASSED, including the new real
  floor-4 Maestro duel -> real VICTORY in the React app, and the fixed
  word-finder (confirmed working across all 4 real boss fights in this
  run's own test output, including the newly-robust 2-letter words like
  "AR"/"ST"/"DE"/"AE" it now finds instead of failing).
- `npm run test:react-build`: ALL CHECKS PASSED, run clean (full
  playthrough + staging/drag/touch suite, unaffected).
- `npm run test:react-duel-loss`: ALL CHECKS PASSED (Largo/i-frames/parry/
  Second Wind/GAME_OVER, unaffected).
- `npm run test:music-engine`: ALL CHECKS PASSED.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED, zip
  listing confirmed to contain `pieces/beethoven-5th.js`.
- `node test/duel-balance-simulation.js`: same numbers as the previous
  run's own findings (final/boss/skilled 93% win/8% loss, deterministic,
  confirmed unchanged since the sim's math never referenced the new def).

**Not verified (honest gap, same as ever):** the Maestro's audible
musicality and real duel feel are Jaxon's call with real ears/hands --
everything above is data-shape/scheduling/no-error/real-click-driven-flow
verification, not a listen-through or hands-on playtest.

**DUEL-GAUGE COMBAT ticket checked off** -- all four VERIFY-line pieces
(mocked-clock unit tests: `duel.test.js`/`duelCombat.test.js`/
`duelIntegration.test.js`; Playwright real-browser full duel win AND loss
with zero console errors: `test:qa`/`test:react-qa`/`test:react-duel-loss`;
the full migrated `npm test` suite) are real, passing, and confirmed this
run. **Genuinely-Jaxon-only, flagged per this routine's own guardrails
rather than blocking further engine work:** the VERIFY line's own "Real
feel: Jaxon's playtest" -- every fight (all 4 bosses, both directions of a
duel) is now real, playable, and mechanically verified end-to-end, but not
yet felt out by an actual human with real ears/hands/timing.

**Not done, correctly out of scope:** BOSS ENTRANCE CUTSCENES and STOLEN
LETTERS META-PROGRESSION (the Maestro's hostage letter proposal, **Z**, per
THEME.md) are separate, already-queued tickets -- this run only made the
Maestro real/reachable/beatable, not cinematic or meta-progression-
integrated yet. **Next:** the queue's next unchecked item top-to-bottom is
COMBAT JUICE's damage-landed `Game.*` hook (floating damage numbers, HP-bar
flash, screen-shake, CRUSHING!/MAGNIFICENT! banners, ink flash -- the one
remaining piece of that ticket's original three bullets), unless a future
run judges BOSS ENTRANCE CUTSCENES or STOLEN LETTERS META-PROGRESSION higher
priority now that DUEL-GAUGE COMBAT is done and the header's own stated
priority order (MUSIC ENGINE / DUEL-GAUGE COMBAT first) no longer applies.

## 2026-08-22T06:58Z -- COMBAT JUICE: damage-landed hook (floating numbers,
## HP flash, shake, CRUSHING/MAGNIFICENT, ink flash) -- TICKET CHECKED OFF

Repo-health note first (not a code change, but worth recording): this run
started with a detached HEAD and a stale local `main` whose root commit
didn't match `origin/main`'s real history at all (`git merge-base` found no
common ancestor -- "unrelated histories"). `origin/main` (confirmed via
`git ls-remote`, not just the locally cached ref) is unambiguously the real,
current, 60+-commit project history matching GOALS.md/PROGRESS.md's own
content; local `main` was just a stale pointer. Fixed with `git fetch` +
`git reset --hard origin/main` (a local-only fix, origin untouched) rather
than force-pushing anything. Flagging in case this recurs -- several earlier
PROGRESS.md entries mention similar "detached-HEAD fetch fix" housekeeping,
so this may be a recurring container-startup quirk worth a future run's
attention if it keeps happening.

Picked up the queue's first unchecked item (GOALS.md's own "Next" note from
the DUEL-GAUGE COMBAT closing entry): COMBAT JUICE's last remaining piece,
the damage/hit-animation bullet (floating damage numbers, HP-bar flash,
screen-shake, CRUSHING!/MAGNIFICENT! banners, ink-display flash) -- the
tile-settle FLIP and haptic-feedback bullets were already done by earlier
runs.

**Built:**
- `js/wordbound/game.js`: two new pub/sub hooks --
  `Game.onDamageLanded(callback)` (fires when a word's damage lands on the
  monster) and `Game.onPlayerDamaged(callback)` (fires when a turn-based
  counterattack lands on the player), each returning an unsubscribe
  function. Wired at the exact points vanilla's own `animateDamage`/
  `celebrateHit`/`animatePlayerDamage` already run from inside
  `Game.submitWord`'s setTimeout: the killing-blow branch, the turn-based
  survive branch, and (new) the duel-mode survive branch -- previously a
  true no-op past `render()`, so a duel word now "hits" every time even
  when its push doesn't cross the gauge, matching every other combat mode.
  Also `Game._emitDamageLanded`/`Game._emitPlayerDamaged` test-only
  exposures, same "doesn't depend on landing an exact big hit" reasoning as
  the pre-existing `Game._celebrateHit` -- confirmed by direct exploration
  (not assumed) that the fixed vitest seed's 8-tile rack (`ARDONIUE`) can't
  reach the 25-damage CRUSHING threshold or a 7-letter MAGNIFICENT word even
  with Overcharge.
- `src/components/CombatScreen.jsx`: subscribes once on mount. A real hit
  renders a floating `.damage-number` and a `.crushing-floater`/
  `.magnificent-banner` as plain React state (self-removing via their own
  setTimeouts, same jitter/scale math and durations as vanilla), while
  `.monster-hp-fill`'s flash and `.combat-panel`'s shake use the SAME
  remove/reflow/add direct-DOM technique as vanilla (ref-based, not React
  state -- a plain class toggle can't restart a CSS animation mid-flight,
  same reasoning the pre-existing FLIP/tile-settle code already established
  for one-shot browser-timeline choreography). The shake also respects
  `prefers-reduced-motion`, matching vanilla's `celebrateHit`.
- `src/components/RunScreen.jsx`: subscribes to `Game.onPlayerDamaged`,
  flashes `.ink-display` the same way -- lives here (not CombatScreen.jsx)
  since the ink display is part of the always-visible run header.

**A real bug found and fixed before it shipped, by test:react-build (not
Vitest, which stayed green throughout since these are React-state-driven and
jsdom doesn't distinguish a genuine bug from a test artifact here):** the
first draft of the CRUSHING/reduced-motion real-browser check was itself
flaky -- firing a second (reduced-motion) crushing hit immediately after the
first (non-reduced) one, with no wait, let the FIRST hit's still-live
`.combat-shake` class (320ms duration) make the second check trivially pass
regardless of what it actually did. Fixed by polling for the first hit's
shake/floater to fully clear before emulating reduced motion, not by
loosening the assertion -- confirmed by re-running clean twice after.

**A real (harmless) flake observed and honestly logged, not chased
further:** one `npx vitest run` (full 14-file suite) out of roughly 7
consecutive runs failed the pre-existing `duelIntegration.test.js`
"surviving a word in duel mode..." test (a flat `await new Promise(r =>
setTimeout(r, 260))` against a 220ms internal timeout -- a razor-thin 40ms
margin under full-suite parallel CPU load). Isolated via `git stash` (4/4
clean on the unmodified base commit, confirming it predates this run) then
5/5 clean on this run's own changes immediately after -- not confidently
attributable to this run's change, more likely the same kind of
environment-driven timing flakiness this repo's history has already
characterized elsewhere (STRUCTURAL 14/15/16/N, root-caused there to
`userEvent`'s async choreography, a different mechanism than this file's
flat sleep). Not fixed this run (unrelated test file, outside this ticket's
actual scope) -- flagged here for a future run in case it recurs. This run's
own new duel-mode test (`a surviving (non-decisive) duel push still fires
Game.onDamageLanded...`) polls instead of sleeping a fixed duration,
specifically to avoid adding a second instance of the same fragile pattern.

**Verified:**
- `npm test` (jsdom dom-check): ALL CHECKS PASSED -- added a new COMBAT
  JUICE block driving a real surviving word play + a forced real
  counterattack through `Game.submitWord`, confirming both hooks fire with
  the correct payload in the vanilla tree too, not just React.
- `npx vitest run`, 5 consecutive full-suite runs after the new tests
  landed: **158/158 every time, zero flakes** (up from 152 -- 6 new tests:
  4 in `CombatScreen.test.jsx` covering the real-hit/crushing/magnificent/
  zero-damage cases, 1 in `duelIntegration.test.js` for the duel-survive
  case, 1 in `RunScreen.test.jsx` for the ink flash).
- `npm run build`: clean, 46 modules, unchanged.
- `npm run test:react-build` (real browser, built output): **2 consecutive
  clean runs** after the reduced-motion timing fix, including new checks
  for the real floating damage number + hp-flash on the existing RADIO
  playthrough, CRUSHING+shake, the MAGNIFICENT banner, and the
  reduced-motion variant (floater still shows, shake suppressed).
- `npm run test:mobile`: ALL CHECKS PASSED (touched CSS-adjacent rendering,
  so mandatory per GOALS.md's own header rule).
- `npm run test:qa`, `npm run test:react-qa`, `npm run test:react-duel-loss`,
  `npm run test:music-engine`, `npm run build:itch` + `npm run
  test:itch-build`: ALL CHECKS PASSED, unaffected.

Version bumped v0.2 -> v0.3 per GOALS.md's own "bump minor per completed
feature" convention (`MainMenu.jsx`/`wordbound.html`/`MainMenu.test.jsx`).

**COMBAT JUICE ticket checked off** -- all three original bullets
(tile-settle FLIP-in land animation, haptic feedback, and now the
damage/hit animations) are real, wired, and verified.

**Not verified (honest gap):** the actual FEEL/timing/juiciness of these
animations in real hands is Jaxon's call, same as every other combat-feel
item in this repo's history -- everything above is DOM-structure/class/
real-browser-driven verification, not a playtest.

**Genuinely-Jaxon-only, flagged rather than blocking further work:** none
new this run beyond the pre-existing "real feel" playtest gap already
flagged for DUEL-GAUGE COMBAT.

**Next:** per GOALS.md's own header priority note, DUEL-GAUGE COMBAT and
MUSIC ENGINE are both done now -- the queue's remaining unchecked items, top
to bottom, are BOSS ENTRANCE CUTSCENES, STOLEN LETTERS META-PROGRESSION,
SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS, ITEMS, and REGULAR ENEMIES. No
strong ordering signal between them beyond file order; a future run should
just pick the first one top-to-bottom unless something makes a different
one clearly higher-value.

## 2026-08-22T07:46Z -- BOSS ENTRANCE CUTSCENES: title card + taunts, both apps -- TICKET CHECKED OFF

**Concurrent-run collision, resolved per established precedent first:** this run's own
independent COMBAT JUICE implementation (the damage-landed hook) lost a push race to
another hourly instance that had already landed and pushed an equivalent, independently-
built version (`Game.onDamageLanded`/`onPlayerDamaged` pub/sub vs. this run's
`lastMonsterHitEvent`/`lastPlayerHitEvent` polling -- different shape, same real fix,
same two bugs found: the duel-mode survive-branch gap and the killing-blow timing race).
Did NOT force-push a redundant duplicate, per this repo's own established precedent
(STRUCTURAL 17/N, DUEL-GAUGE update-11): `git reset --hard origin/main` to take their
already-pushed, verified-clean commit as-is, then picked up the next unchecked queue item
instead of re-doing the same ticket.

Picked up BOSS ENTRANCE CUTSCENES, the queue's next item after COMBAT JUICE. Built
end-to-end in both apps -- see this ticket's own closing note in GOALS.md for the full
design/verification account. Summary:

- `js/wordbound/bossEntrances.js` (new): taunt content sourced directly from THEME.md's
  own "personality (for the entrance-cutscene ticket)" paragraphs, for the three real
  bosses that currently have BOTH a THEME.md personality AND a real `.piece` (Mountain
  King, Valkyrie Marshal, the Maestro). Floor 2's boss (`boss_unabridged`) deliberately
  gets none -- still the original engine-fork's generic placeholder, never reskinned to
  THEME.md's own proposed "Death, the Fiddler," so inventing cutscene content for it
  would be writing lore, not implementing it. `getEntrance` returns null for it and any
  other unlisted defId; both apps treat null as "no cutscene, straight to the fight."
- Vanilla (`js/wordbound/game.js`/`wordbound.html`): `showBossEntrance`/
  `hideBossEntrance`, a new `#boss-entrance-overlay` (same overlay/z-index convention as
  the existing `.blank-picker-overlay`) -- title card ("NAME -- epithet," the ticket's
  own example format) then each taunt line, auto-advancing or skippable instantly via
  the Skip button or Escape/Enter/Space.
- React (`src/components/BossEntranceOverlay.jsx`, new): a native reimplementation
  (its own step-timer effect, not a call into the vanilla DOM functions), mounted from
  `CombatScreen.jsx` whenever a boss has real entrance content and hasn't seen it yet
  this fight (`monster._entranceSeen`, a plain field on the monster instance itself --
  no new shared `state` field needed).
- Portrait: a large crown glyph in a framed, inked-texture circle (reusing `.panel`'s
  own turbulence-noise SVG background) -- not bespoke per-boss illustration. This repo
  has no woodcut SVG asset pipeline at all yet, confirmed by grep before writing this;
  real per-boss portraits are a future art pass, not this ticket's own budget.

**Fight state is genuinely unaffected, not just visually covered:** `Game.submitWord`
is a real no-op while a vanilla entrance is active (a new `bossEntranceActive` module
flag), and React's `submit()`/Overcharge/Rewrite check the same `showEntrance` local
state -- belt-and-suspenders against a real edge case the overlay's own
`position:fixed` doesn't cover alone: a focused `#word-input` still receives real
keydown events regardless of what's drawn on top of it.

**Three real bugs found and fixed while wiring this, not shipped blind:**
1. A duel fight's continuous gauge push (`Game.tickDuel`, driven by `CombatScreen.jsx`'s
   own rAF loop) needed pausing while the entrance shows, or the player would take real
   push damage during a cutscene they can't respond to. Fixed by gating the `tickDuel`
   call on `!showEntrance` (frame-delta ref still updates every frame, so no catch-up
   push banks once the entrance ends).
2. The first cut of that fix ALSO skipped the loop's `setDuelTick()` re-render bump
   while showing, which stopped `CombatScreen` from re-rendering at all during the
   cutscene -- `VolumeGauge`'s live crescendo-approaching countdown (driven by the
   sequencer's own still-running `setInterval`, independent of `tickDuel`) kept
   updating in `state` but never got read into a fresh render, so the warning banner
   silently never showed during an entrance. Caught by `test:react-duel-loss` failing
   ("VolumeGauge shows the live 'Crescendo in...' warning banner"), not assumed
   correct -- root-caused by re-reading that test's own comment on what it expects.
   Fixed by always bumping `setDuelTick()`, gating only the `tickDuel()` call itself.
3. `npm run test:itch-build` 404'd on the new `bossEntrances.js` -- `tools/build-itch.js`
   carries its own hand-maintained file manifest (NOT auto-derived from
   `wordbound.html`'s `<script>` tags), and the new file was never added. Fixed by
   adding it in alphabetical order, matching the list's own convention. This is exactly
   the class of bug GOALS.md's own mandatory-verification-list rule exists to catch --
   would have shipped silently broken on the itch build if only the "obviously
   relevant" gates had been run.

**Verified:**
- 11 new `test/dom-check.js` checks drive the real overlay/skip/`Game.submitWord`-guard
  mechanism directly via two new test-only exposures, `Game._showBossEntrance`/
  `_hideBossEntrance` (same pattern as the pre-existing `Game._celebrateHit`) --
  necessary because every def with real entrance content also carries a `.piece`,
  which routes through `Game.startDuelFight` -> `initAudioContext()`, a hard jsdom
  crash (no `window.AudioContext` there), the exact hazard `enterAndKillBoss`'s own
  header comment already documents at length.
- 4 new Vitest/RTL tests (`CombatScreen.test.jsx`): title card renders + blocks a real
  word play until skipped, Escape dismisses, a regular fight or a boss with no entrance
  content never shows one, and an already-seen fight doesn't replay it.
- `npx vitest run`: 5 consecutive full-suite runs, **162/162 in 4 of them, 1
  pre-existing flake** in a different, unrelated test (this repo's own long-documented
  cross-file Vitest/jsdom timing flake -- not reproduced a second time, ruled out as
  this run's own code by elimination).
- `npm test` (jsdom dom-check): ALL CHECKS PASSED. `npm run build`: clean, 48 modules
  (up from 46). `npm run test:mobile`: ALL CHECKS PASSED (mandatory -- new CSS).
- Real-browser Playwright, the VERIFY line's own "click-through" bar, against all
  three real bosses in BOTH apps: `npm run test:qa` (new checks confirm the overlay is
  up right after entering floor 1's real duel fight, names the real boss, and a real
  Skip click hides it before the fight proceeds -- floor 3/4's own entrances pass
  through via genuine unassisted auto-dismiss, a real bonus proof the timer chain
  works unattended) and `npm run test:react-qa` (`killBossViaRealWord`'s shared helper
  now dismisses whichever entrance is up before every boss kill; new checks confirm
  floor 1's overlay + title specifically). Both ran clean 2x. `npm run test:react-build`,
  `npm run test:react-duel-loss` (the script that caught bug #2), `npm run
  test:music-engine`: ALL CHECKS PASSED. `npm run build:itch` + `npm run
  test:itch-build`: ALL CHECKS PASSED after bug #3's fix.
- Version bumped v0.3 -> v0.4 (a second completed feature this session), all three
  version-string locations updated together.

**Not done, honest gaps (none block this ticket's own VERIFY line, which is fully met
for every boss that currently has real entrance content):** floor 2's boss has no
entrance content (a content gap -- needs a reskin + real piece assignment first, not
this ticket's own scope); portraits are a placeholder glyph, not bespoke woodcut
illustration (no asset pipeline exists yet for that); copy tone (mocking-then-menacing /
terse-and-martial / calm-and-absolute, per THEME.md's own descriptions) is a first pass
worth Jaxon's read, same flag THEME.md itself got when written.

**Next:** the queue's next unchecked item top-to-bottom is STOLEN LETTERS
META-PROGRESSION, followed by SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS, ITEMS (Jaxon's
four + batch), and REGULAR ENEMIES.

## 2026-08-22T08:48Z -- STOLEN LETTERS META-PROGRESSION: built and verified end
## to end -- ticket checked off, v0.4 -> v0.5

Repo-health note first: pushing this run's FIRST ticket (BOSS ENTRANCE
CUTSCENES) hit a real push race -- another hourly instance had already landed
and pushed an independent, equally-complete implementation of the same
ticket (`js/wordbound/bossEntrances.js` + `BossEntranceOverlay.jsx`, gating
the cutscene overlay ON TOP of an already-mounted CombatScreen with the duel
gauge explicitly paused, vs. this run's own now-discarded approach of not
mounting CombatScreen at all until dismissed) -- both independently converged
on the same 3-of-4-bosses scope (floor 2 excluded, same reasoning) and the
same `tools/build-itch.js` gap. Followed this repo's own established
precedent (STRUCTURAL 17/N, DUEL-GAUGE COMBAT update-11): did NOT force-push
a redundant duplicate. `git fetch` + `git reset --hard origin/main` to take
their pushed, already-verified, already-checked-off commit as-is, then picked
up their own "Next" note (STOLEN LETTERS META-PROGRESSION, the queue's next
unchecked item) to land genuinely new value this run instead.

Read THEME.md's roster/hostage proposals and characters.js's starting decks
before writing anything, and found a real design tension worth resolving
deliberately rather than by accident: THEME.md's own suggested starting-
stolen set (J K Q V X Z + 2-3 mid-tier) includes K/X/Z, and the Scribe's
starting deck (characters.js) already carries K/X/Z as its ENTIRE designed
rare-letter identity ("every rare/powerful letter that defines the
character"). Filtering starting decks against the stolen set would have
gutted one specific character's design, disproportionate to the other two
(archivist/keeper's decks carry none of these letters at all). Resolved by
NOT filtering starting decks at all -- THEME.md's own premise ("All you have
left is your Rack... still yours") reads those tiles as kept property
predating the theft, not part of the world supply the Fermata raided -- and
confirmed this needed zero special-case code anyway: `createCharacterDeck`
never routes through the frequency-pool function this ticket filters.
Separately, X (Death, the Fiddler's proposed hostage) is deliberately
EXCLUDED from the starting-stolen set this run picked: that boss is floor 2's
still-unreskinned placeholder (`boss_unabridged`), so stealing X now would
make it permanently unrecoverable until a future run gives floor 2 its real
bible identity -- worse than not stealing it yet. Final set: K/V/Z (the 3
real bosses' hostages) + C/H/J/Q/W (recovered via achievements.js's 5
existing achievements instead, the ticket's own "optional extra recoveries"
bullet, arbitrary pairing). Full reasoning lives in
`js/wordbound/stolenLetters.js`'s own header comment.

**Built:**
- `js/wordbound/stolenLetters.js` (new): the module described above --
  `STARTING_STOLEN`, `isStolen`/`getStolenLetters`/`getRecoveredLetters`,
  `recoverByBossDefId` (boss-hostage mapping), `syncFromAchievements`
  (idempotent, safe to call liberally rather than needing before/after
  unlock-state diffing), `loadProgress`/`saveProgress`/`reset`, localStorage
  key `wordbound_stolen_letters_v1` -- same pattern as achievements.js, per
  the ticket's own instruction.
- `js/wordbound/tiles.js`: `getLetterFrequencyPool` split into a memoized
  `getBaseLetterFrequencyPool` (the static Scrabble-frequency table) and a
  fresh-every-call `getAvailableLetterFrequencyPool` (filters out whatever's
  currently stolen) -- both `rollRewardOptions` (post-fight/shop tile
  rewards) and `rollVariantTile` (the shop's premium tile) already funneled
  through the one function, so this was the single choke point for "stolen
  letters never appear in racks/shops."
- `js/wordbound/game.js`: `onMonsterDefeated` recovers a boss's hostage
  letter on a boss kill and syncs achievement-paired recoveries
  unconditionally (a regular kill can unlock one of the 5 paired
  achievements too); `endRun` also syncs on victory specifically (`clear_a_
  run` can only unlock there, after the run's actual last boss kill already
  resolved to TILE_REWARD). New `renderAlphabetDisplay` (all 26 letters,
  stolen ones struck-through/dimmed, recovered ones gold) wired into
  `renderMainMenu`.
- `wordbound.html` + `css/wordbound.css`: `#alphabet-display` markup + a
  13-column grid of letter chips, reusing the achievements-display's
  border-top "menu footer stats" look.
- `src/components/MainMenu.jsx`: a React `AlphabetDisplay` component doing
  the identical render off the same real `window.Wordbound.StolenLetters`
  module (no reimplemented logic).

**Two real bugs found and fixed, not papered over:**
1. `achievements.js`'s own `reset()` called `localStorage.removeItem`
   UNGUARDED -- unlike its sibling `loadProgress`/`saveProgress`, which both
   already guard `typeof localStorage === 'undefined'`. A real, previously-
   latent crash risk in jsdom/private-browsing/storage-disabled contexts,
   just never hit before because nothing in this repo's test suite ever
   called `Achievements.reset()` until this ticket's own dom-check.js block
   did. Fixed with the same guard its siblings already use.
2. `tools/build-itch.js`'s hardcoded dependency list needed
   `stolenLetters.js` added -- the EXACT same class of gap the previous
   BOSS ENTRANCE CUTSCENES run had to discover the hard way via a failing
   `test:itch-build`. Learned from that: ran `build:itch`/`test:itch-build`
   proactively this time, before considering the ticket verified, and caught
   it before it ever failed.

**A real timing bug found and fixed while stabilizing the new dom-check.js
block, not a flake papered over with a bigger sleep number:** the two new
fight-and-recover sequences initially used a flat `setTimeout(800)` --
matching this file's own dominant convention, and the same ~720ms
(TILE_PLAY_ANIM_MS + MONSTER_DEATH_BEAT_MS) baseline every other block uses.
Passed 3 consecutive runs, then failed. Root-caused instead of just widening
the sleep: `state.screen` was left at `'TILE_REWARD'` from an EARLIER kill
inside the SAME block, never reset to `'RUN'` before entering the next
node (unlike the established pattern elsewhere in this file) -- so the
SECOND kill's own `setTimeout` wait was racing against a screen value that
was ALREADY (stale-)correct before the real kill had finished resolving.
Fixed two ways: added the missing `state.screen = 'RUN'` reset (the actual
fix), and replaced the flat sleep with a small local `waitForScreen` poll
helper (mirroring `src/test/gameHelpers.js`'s own Vitest-side one), so the
wait is correct-by-construction rather than tuned to a hopefully-big-enough
number. 5 consecutive clean full-suite runs after.

Also needed a second, narrower jsdom workaround: every REAL cutscene/hostage
boss (`boss_vowelmaw`/`sovereign`/`maestro`) carries a `.piece` and crashes
jsdom via `Game.startDuelFight`'s uncaught `initAudioContext()` (no
`window.AudioContext` there) -- the same hazard this whole file has
documented and routed around for over a dozen prior boss-related blocks.
Proved `onMonsterDefeated`'s real wiring (not just the hostage-mapping table
in isolation) by temporarily monkey-patching the exported
`StolenLetters.recoverByBossDefId` function itself to redirect the
audio-safe `boss_unabridged` onto the real `boss_vowelmaw` mapping for the
duration of one real kill, then restoring it -- same "boss-identity-
agnostic, use the audio-safe boss" convention this file's existing boss-skip
block already established, adapted from a data table to a function since
this module's mapping has no per-test registration hook the way cutscene
data does.

**Verified:**
- `npm test` (jsdom dom-check): ALL CHECKS PASSED across a much larger
  sample after the timing fix -- 31 clean runs out of 32 total attempts (the
  5 right after the fix, then 26 more while double-checking). The one
  failure never repeated on immediate re-runs and its own FAIL line wasn't
  captured (a `tail`-piped invocation truncated it before I could inspect
  which check it was) -- given the fix above converted a previously
  consistent/reproducible failure into this much rarer (~3%) residual, this
  reads as the same general CPU-load timing sensitivity this large,
  real-timer-heavy file already has elsewhere (documented flakes exist for
  other blocks too), not a re-emergence of the root-caused bug. Flagged
  honestly rather than claimed as fully flake-free; worth a future run's
  attention if it recurs with a capturable signature.
  New block: fresh state has exactly the 8 designed stolen letters; E is
  never stolen; 600 reward/shop rolls never produced a stolen letter; the
  Scribe's deck still carries K/Z (exemption confirmed real); the hostage
  mapping and the real `onMonsterDefeated` wiring both recover the right
  letter; a recovered letter reappears in fresh rolls; an unlocked
  achievement recovers its paired letter on the next kill's sync;
  `saveProgress`/`loadProgress` are safe no-ops under jsdom's real `file://`
  environment (confirmed directly: no `window.localStorage` there at all,
  same limitation achievements.js already documents -- real persistence
  proven in Vitest instead, below).
- `npx vitest run`, several consecutive full-suite runs: 165/165 (up from
  162 -- 3 new tests in `MainMenu.test.jsx`, including a REAL localStorage
  round-trip across a simulated reload, since Vitest's jsdom environment has
  a genuinely working `localStorage`, confirmed directly, unlike dom-check's
  `file://` one). One run hit the pre-existing, already-characterized
  `duelIntegration.test.js` full-suite timing flake (COMBAT JUICE's own
  note) -- confirmed unrelated.
- `npm run build`: clean, 50 modules (up from 48).
- `npm run test:mobile`: ALL CHECKS PASSED (new CSS + main-menu DOM,
  mandatory) -- no overflow at 375/414px with the 26-letter grid visible.
- `npm run test:qa` + `npm run test:react-qa`: ALL CHECKS PASSED, full
  real-browser runs start-to-VICTORY across all 4 floors -- **this is the
  ticket's own "sim check... confirm the game is winnable pre-recovery"
  satisfied for real**: every tile reward/shop offer across both complete
  playthroughs drew from the real 8-letter-filtered pool, and both runs
  won. Honestly NOT a bulk multi-seed statistical bot sim --
  `test/balance-simulation.js` (the only script built for that) is confirmed
  PRE-EXISTING BROKEN, unrelated to this ticket (crashes on
  `Game.startDuelFight`'s `initAudioContext()` in jsdom, reproduced on the
  unmodified base commit before touching anything -- the same real-duel-
  boss/no-AudioContext hazard this whole repo's test suite already routes
  around everywhere else). Flagged plainly as real, separate, out-of-scope
  work rather than silently left for a future run to rediscover.
- `npm run test:react-build`, `npm run test:react-duel-loss`, `npm run
  test:music-engine`: ALL CHECKS PASSED, unaffected.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED after
  the dependency-list fix above (tested proactively this time).

Version bumped v0.4 -> v0.5 per GOALS.md's own convention (`MainMenu.jsx`/
`wordbound.html`/`MainMenu.test.jsx`).

**STOLEN LETTERS META-PROGRESSION ticket checked off.**

**Not done / honest gaps:** the achievement-letter pairing (C/H/J/Q/W) is
arbitrary flavor, not thematically justified -- worth a better pairing if
Jaxon has one. No multi-seed statistical winnability proof exists yet
(blocked on the pre-existing broken balance-simulation.js noted above) --
only the two real single-seed full playthroughs described above. Whichever
run reskins floor 2's boss into its bible identity (Death, the Fiddler /
Danse Macabre) should add X to the stolen set and its hostage mapping
together, per this ticket's own scope note -- the natural next step for
BOTH this ticket's remaining gap and BOSS ENTRANCE CUTSCENES's own.

**Next:** the queue's remaining unchecked items, top to bottom: SHAKESPEARE
GUIDE + AUTHOR SHOPKEEPERS, ITEMS (Jaxon's four + batch), REGULAR ENEMIES.
Also worth a future run's attention, not queue items themselves: reskinning
floor 2's boss (unblocks a real gap in both this ticket and BOSS ENTRANCE
CUTSCENES at once), and `test/balance-simulation.js`'s AudioContext crash
(blocks real multi-seed winnability sims for any future balance work, not
just this ticket).

## 2026-08-22T09:21Z -- SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS: bible section + guide intro (steps 0-1 of 4) -- ticket still open

**Concurrent-run collision, resolved per established precedent first:** this run's own
independent STOLEN LETTERS META-PROGRESSION implementation lost a push race to another
hourly instance that had already landed and pushed an equivalent, independently-built
version (`e9132b9`, "permanent alphabet recovery" -- 8 letters, achievement-recovery for
the 5 non-hostage ones, which my own build had left explicitly out of scope). Did NOT
force-push a redundant duplicate, per this repo's own established precedent (BOSS
ENTRANCE CUTSCENES, STRUCTURAL 17/N, DUEL-GAUGE update-11): `git reset --hard
origin/main` to take their already-pushed, verified-clean commit as-is, then picked up
the next unchecked queue item instead of re-doing the same ticket. (My own scoped sim
script, `test/stolen-letters-sim-check.js`, and the `git-stash`-confirmed discovery
that `test/balance-simulation.js` now crashes on any run reaching a boss node, are
lost with the discarded commit -- flagging here since the other run's own PROGRESS.md
entry independently found and flagged the SAME `balance-simulation.js` gap, which is
good cross-confirmation it's real, not a fluke of my own environment.)

Picked up SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS, the queue's next item after STOLEN
LETTERS. A large, explicitly multi-part ticket (bible amendment, guide intro, shopkeeper
system, portraits) -- treated this run's scope as steps 0-1 (a complete, working,
verified chunk), leaving 2-3 open with a documented next-step note, per GOALS.md's own
"multi-run tasks are fine" rule. Full account is in this ticket's own GOALS.md
ORCHESTRATOR NOTE (2026-08-22); summary here:

**Step 0 (bible amendment):** THEME.md gained a new "The guide and the shopkeepers"
section (between "Stolen letters" and "Display name"). Shakespeare's voice (grandiose,
punning, quoting himself) + 3 quest-setting beats for the intro (the theft told as a
personal outrage, why the player specifically, the send-off as the game's own thesis
compressed into a boast). A 6-author shopkeeper roster -- Homer, Cervantes, Austen,
Dickinson, Poe, Wilde -- picked for the widest spread of era/voice the candidate list
allows (deliberately not six variations on "witty 19th-century novelist"), each with a
personality paragraph, sample shop lines, ONE mechanical quirk concept (category
discount, extra stock, guaranteed premium-tile roll, reroll discount, rare-tier
discount, consumable discount -- one apiece, matching the ticket's own examples), and
1-2 exclusive-item concepts. Also recommends per-shop (not per-run) seeding, with
reasoning (a single author for a whole run would make one quirk either dominate the
run's economy or never appear at all).

**Step 1 (guide intro), both apps:**
- `js/wordbound/shakespeareGuide.js` (new): `ShakespeareGuide.INTRO`, the `{name,
  epithet, taunts}` shape `BossEntrances.getEntrance` already uses, content sourced
  directly from THEME.md's own 3 beats.
- Vanilla (`wordbound.html`/`game.js`): a new `#guide-intro-overlay`, reusing the
  boss-entrance overlay's own CSS classes and step timing (title card, then each taunt
  line, auto-advance or Escape/Enter/Space/Skip-button dismiss) on separate element
  ids -- NOT a direct call into `showBossEntrance` itself, since this needs its own
  persistent "seen once ever" flag (`wordbound_seen_guide_intro` in localStorage, same
  pattern as the pre-existing `HOWTO_SEEN_KEY`) rather than a per-fight
  `monster._entranceSeen`. Called from `Game.startRun` right after `render()`, so the
  map is real underneath (matching the boss-entrance convention). Deliberately does
  NOT gate `Game.submitWord` the way `bossEntranceActive` does -- there's no fight (and
  no focused `#word-input`) to protect at run start, confirmed by direct reasoning
  before writing the code, not assumed.
- **A real design question resolved by direct testing rather than guessing:** this
  harness's jsdom instance has no `window.localStorage` at all (confirmed by the
  STOLEN LETTERS ticket's own prior discovery, re-confirmed here), so
  `hasSeenGuideIntro()` is unconditionally false in `test/dom-check.js` --  meaning
  EVERY `Game.startRun()` call across that whole 3400+-line suite now triggers
  `showGuideIntro()`. Rather than assume this was safe, made `showGuideIntro` provably
  idempotent (clears any still-running timer/listener from a prior un-dismissed call
  before starting fresh, so repeated `startRun()` calls can't stack duplicate keydown
  listeners or leak timers), deliberately did NOT gate `submitWord` (so it can never
  block an existing test's combat interaction), and then ran the FULL `npm test` suite
  to confirm empirically -- clean, zero regressions, before writing my own new checks.
- React (`RunScreen.jsx`): reuses `BossEntranceOverlay.jsx` UNMODIFIED (it was already
  a pure `{entrance, onDismiss}` component with zero combat coupling -- confirmed by
  reading it before deciding this, not assumed) via a new optional `portraitGlyph` prop
  (default unchanged, `👑`; Shakespeare gets `🪶`). Local `guideIntroOpen` state via a
  lazy `useState` initializer reading `Game.hasSeenGuideIntro()` once per RunScreen
  mount -- correctly re-evaluates per run since `App.jsx` fully unmounts/remounts
  `RunScreen` between runs. `Game.hasSeenGuideIntro`/`markGuideIntroSeen` newly exposed
  as public `Game.*` methods (mirroring `Game._showBossEntrance`'s test-exposure
  pattern) so React can read/write the flag without touching the vanilla-only DOM
  functions (`showGuideIntro` itself is a no-op in the React tree via the existing
  `reactTreeActive()` guard).

**Verified:**
- `npm test` (jsdom dom-check): ALL CHECKS PASSED -- content-module checks, overlay
  mechanics via new `Game._showGuideIntro`/`_hideGuideIntro` test-only exposures
  (mirrors `_showBossEntrance`'s reasoning, though this one has no AudioContext hazard
  to dodge), an idempotent-re-show check (two `_showGuideIntro()` calls before dismiss
  still fully clears on ONE Escape), and a real end-to-end check that a genuine
  `Game.startRun()` call shows the overlay (true by construction in this
  no-real-localStorage harness, made explicit and asserted on rather than left
  implicit).
- `npx vitest run`: 4 new tests in `RunScreen.test.jsx` (shows-when-unseen,
  hidden-when-already-seen, Skip dismisses + persists `hasSeenGuideIntro()`, the real
  run map is present underneath). Since Vitest's jsdom DOES have real localStorage that
  persists across every test in a file (confirmed by `MainMenu.test.jsx`'s own prior
  comment on the same property), added a file-level `beforeEach` that calls
  `markGuideIntroSeen()` so the OTHER, unrelated RunScreen tests in this file don't
  suddenly render an unexplained Shakespeare overlay on every existing test's DOM; the
  new guide-intro describe block has its own nested `beforeEach` that clears the flag
  back to unseen specifically for its own tests. **4 consecutive full-suite runs:
  169/169 every time, zero flakes.**
- `npm run build`: clean, 50 modules (up from 49 -- the new module).
- `npm run test:mobile`, `npm run test:branching-map`, `npm run test:run-header`,
  `npm run test:audio`, `npm run test:drag-interrupt`: ALL CHECKS PASSED.
- `npm run test:qa`, `npm run test:react-qa`, `npm run test:react-build`, `npm run
  test:react-duel-loss`: ALL CHECKS PASSED -- these all start a real run via real
  Playwright clicks and click into the node map almost immediately afterward. Confirmed
  (not assumed) this doesn't hard-block: a real browser DOES respect the overlay's
  `position:fixed` coverage, but Playwright's own default click actionability check
  retries until the target becomes clickable, which happens naturally once the ~5s
  auto-advance (or, in practice, whatever incidental delay the script already has)
  clears it -- genuine default behavior, not a script accommodation added for this.
- `npm run test:music-engine`: ALL CHECKS PASSED, unaffected.
- `npm run test:duel-balance`: same pre-existing stalemate FLAG as before this run
  (confirmed unrelated), exit code 0.
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED --
  `shakespeareGuide.js` confirmed present in the zip listing (checked directly this
  time, learned from the itch-build-manifest surprise two tickets back).

Version NOT bumped -- partial completion of a multi-run ticket, not a finished
feature; stays at v0.5 until steps 2-3 land and the box is actually checked.

**Not done, honest gaps (real remaining scope, not corners cut):** step 2 (per-shop
author quirks + exclusive items -- needs ITEMS ticket coordination for the exclusives
pool, per this ticket's own instruction) and step 3 (author portraits -- no
woodcut/illustration asset pipeline exists in this repo yet, the same gap already
flagged for boss portraits). Neither is implemented; THEME.md's new section is the
design spec for whichever future run picks them up.

**Genuinely-Jaxon-only, flagged rather than blocking further work:** the exact
6-author roster pick (Homer/Cervantes/Austen/Dickinson/Poe/Wilde) and each one's quirk/
exclusive-item concept are this run's own creative call, same "worth Jaxon's read"
flag every casting/naming decision in this bible gets. Shakespeare's specific intro
copy is a first pass, not locked.

**Next:** SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS stays the queue's first unchecked
item (steps 2-3 remain) -- a future run should pick up step 2 (shopkeeper quirks),
likely in tandem with or right before the ITEMS ticket given the explicit coordination
requirement, or step 3 if an art pipeline lands first. If skipped for a fresher item,
the queue's other unchecked tickets are ITEMS (Jaxon's four + batch) and REGULAR
ENEMIES.

## 2026-08-22T09:59Z — SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS: shopkeeper quirks (step 2, quirk half) — ticket still open

Picked up this ticket exactly where the prior run's own PROGRESS.md "Next" note left
it: steps 0-1 (bible section + guide intro) were already done, step 2 (shopkeepers)
and step 3 (portraits) were open. Scoped this run to step 2's QUIRK half — the
per-shop seeded author pick and 5 of the 6 mechanical quirks — leaving exclusive items
(step 2's other half, explicitly told to coordinate with the still-unstarted ITEMS
ticket) and portraits (step 3, blocked on the same missing woodcut pipeline already
flagged for bosses/Shakespeare) open. Full account is in GOALS.md's own new
ORCHESTRATOR NOTE (2026-08-22, update) on this ticket; summary here.

**What was built:** new `js/wordbound/shopkeepers.js` — the 6-author roster
(Homer/Cervantes/Austen/Dickinson/Poe/Wilde, matching THEME.md's own table) with
name/epithet/sample lines (this run's own first-pass copy — THEME.md wrote full
dialogue only for Shakespeare, not the six, so these are originated here, same "worth
Jaxon's read" flag every cutscene-copy module gets), a seeded `pickShopkeeper`/
`pickRarityFocus`/`pickLine` (all from `state.rng` at shop entry, the same per-visit
mechanism `rollShopOptions`/`rollShopTileOffer` already use — satisfies THEME.md's own
"per-shop, seeded" recommendation without a separate node-id hash), and a single
`effectivePrice` helper both the real gold charge and both UIs' displayed price read.

Quirks landed for real, each with an actual mechanical hook: **Homer**'s Bard's
Largesse (shop guarantees 2 consumable slots, not 1), **Dickinson**'s Circumference
(the premium variant-tile offer always appears, not a coin-flip), **Poe**'s Nevermore
(rare/legendary items 25% off), **Austen**'s Sense and Sensibility (one rarity tier,
re-rolled each visit, 20% off), **Wilde**'s Importance of Being Earnest (every
consumable 20% off). `js/wordbound/game.js`: `rollShopkeeper()` (new, called at shop
entry before `rollShopOptions`/`rollShopTileOffer` so both can see the keeper),
`rollShopOptions`/`rollShopTileOffer` both read the current keeper's quirk flags,
`Game.buyItem` charges `effectiveShopPrice()` instead of raw `def.shopPrice`,
`Game.getShopItemPrice` exposed for React. `renderShop()` (vanilla) and
`RewardScreens.jsx`'s `TreasureOrShopScreen`/`ShopChoices` both gained a
`.shop-keeper-banner` (name/epithet, sampled line, quirk name+description) and switched
their price display to the same helper, showing a struck-through original price next
to a discount. `renderTreasure()` explicitly clears the banner too (TREASURE and SHOP
share `#treasure-panel`) — a real bug caught by writing the regression test, not a
hypothetical: a first draft only ever set the banner, never cleared it, and the test
failed against that draft before the fix.

**A real judgment call, documented rather than silently resolved:** THEME.md's own
cells for Austen ("category discount") and Cervantes ("reroll discount, if/when a shop
reroll mechanic exists") both name substrates that don't exist in this codebase —
confirmed by grep before writing anything: items carry no `category` field anywhere
(rarity is the only classification axis an item has), and no shop-reroll mechanic
exists at all anywhere in this game (an earlier grep hit that looked promising was a
false-positive substring match inside wordlist.js's giant dictionary string, re-confirmed
with a clean file-scoped grep). Resolved Austen by reading "category" as rarity TIER
(the one axis THEME.md's own "which category discounts is picked per-shop" line
implies varies visit to visit, and mechanically distinct from Poe's fixed rare-only
discount since hers rotates and can land on any tier) — a defensible, documented
interpretation, not a locked call, flagged for Jaxon like every other casting/copy
decision in this bible. Cervantes's quirk was deliberately NOT given a substitute
mechanic — inventing one would mean re-deciding his bible concept rather than
implementing it, and THEME.md's own phrasing already hedges this exact gap with
"if/when." Landed `quirkInert: true` on his def and wired zero price logic to it:
building a discount against a purchase path that doesn't exist would be dead code with
nothing to attach to, the same reasoning STRUCTURAL's blank-picker note (update-6)
already established for this repo. Revisit when/if a reroll mechanic lands (most
likely the ITEMS ticket or later).

**A real gap caught by the mandatory `test:itch-build` gate, not shipped:**
`tools/build-itch.js` keeps an explicit per-file manifest for the itch zip
(deliberately not a glob, per its own header comment) — `shopkeepers.js` was missing
from it on the first pass. `npm run test:itch-build` caught this for real: a 404
loading the unzipped build in a real browser, then a `Shopkeepers`-undefined crash
running dom-check against that same unzipped copy — not something noticed by
inspection. This is the same class of gap an earlier run's PROGRESS.md entry already
named "the itch-build-manifest surprise" and said to check directly rather than
assume; this run hit it again for real, which is exactly the mandatory-gate discipline
working as intended. Fixed with one added line; reran clean.

**Verified:**
- `npm test` (jsdom dom-check): ALL CHECKS PASSED, including 21 new checks — module
  load, seeded determinism of keeper/rarity-focus/line (same seed twice → identical
  results), all 6 authors reachable across 60 seeded rolls (not weighted toward a
  subset), each of the 5 real quirks' mechanical effect verified in isolation via the
  new `Game._setShopkeeperForTesting` test-only hook, Cervantes's confirmed inertness,
  `Game.buyItem` charging the real discounted price end-to-end (not just the pricing
  helper in isolation), the banner rendering real DOM text for a real shop screen, and
  the TREASURE-hides-banner regression test. Pre-existing shop-odds/variant-tile checks
  unchanged and still passing — confirms Homer's guaranteed-slot rewrite is
  byte-for-byte equivalent to the old logic whenever no shopkeeper quirk applies.
- `npx vitest run`: 171/171 (up from 169) — 2 new `RewardScreens.test.jsx` tests (the
  banner rendering a forced keeper's name/quirk/line; a forced Poe discount showing
  both the struck-through original and the real discounted price on a real shop
  button). Also fixed `src/test/setup.js`, which mirrors `main.jsx`'s import list but
  had NOT been updated with the new `shopkeepers.js` import — both new tests failed on
  first run (`Shopkeepers` undefined in the Vitest jsdom environment specifically, even
  though the identical dom-check-side checks passed) until this was caught and fixed. A
  real, caught-before-commit gap in keeping the two import lists in sync, not a flake.
  Also updated the pre-existing "buying an affordable item" shop test to assert against
  `Game.getShopItemPrice` rather than raw `def.shopPrice`, since a seeded shop visit can
  now legitimately roll a keeper who discounts that exact item. **5 consecutive
  full-suite runs: 1 failure in 2 of them, both times the SAME pre-existing,
  already-characterized `duelIntegration.test.js` timing flake** (COMBAT JUICE's own
  note) — re-confirmed unrelated by reproducing on the unmodified base commit too (5/5
  clean there), meaning it's genuinely intermittent cross-file Vitest timing noise, not
  something this run's changes make more likely (this run's diff touches shop code
  only, never duel.js/duelCombat.js).
- `npm run build`: clean, 51 modules (up from 50 — the new module).
- `npm run test:mobile`: ALL CHECKS PASSED, including a NEW shop-screen section (forces
  Homer, the longest quirk description of the six, and confirms the banner doesn't
  overflow/clip at 375/414px) — this ticket's own "shop layout with portrait +
  dialogue" mobile bar (portrait itself still step 3's separate, unblocked-by-this-run
  scope).
- `npm run test:qa`, `npm run test:react-qa`, `npm run test:react-build`, `npm run
  test:react-duel-loss`, `npm run test:music-engine`, `npm run test:branching-map`,
  `npm run test:run-header`, `npm run test:audio`, `npm run test:drag-interrupt`: ALL
  CHECKS PASSED, all unaffected (none of these flows touch a shop node).
- `npm run test:duel-balance`: same pre-existing early/regular/weak stalemate flag as
  every prior run's own note, exit code 0, unrelated (this sim never enters a shop).
- `npm run build:itch` + `npm run test:itch-build`: ALL CHECKS PASSED after the
  manifest fix above (confirmed `shopkeepers.js` present in the zip listing directly).

Version NOT bumped — still a partial completion of a multi-run ticket; stays at v0.5
until exclusive items (step 2's other half) and portraits (step 3) both land and the
ticket's box is actually checked.

**Not done, honest gaps:** exclusive items (1-2 per author — needs ITEMS ticket
coordination, unstarted as of this entry) and author portraits (blocked on the same
missing woodcut/illustration pipeline already flagged for bosses and Shakespeare).
Cervantes's quirk is real bible content but mechanically inert until a reroll
mechanic exists anywhere in this game — neither cut nor faked.

**Genuinely-Jaxon-only, flagged rather than blocking:** each author's `lines` copy
(this run's own first-pass dialogue, not bible-sourced verbatim the way Shakespeare's
was) and the specific discount percentages (20%/25%, chosen for round, mutually
distinguishable numbers — not tuned against a balance sim). Austen's "category =
rarity tier" reading is also a documented judgment call, not a locked interpretation.

**Next:** exclusive items are the more self-contained of the two remaining pieces
(each author's 1-2 concepts are already spec'd in THEME.md's table; landing them
alongside or right after the ITEMS ticket, per this ticket's own coordination
instruction, is the natural next chunk for whoever picks this back up). Portraits
likely wait for a shared art-pipeline decision across all three tickets that need one
(bosses, Shakespeare, this roster). If SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS is
skipped for a fresher item, the queue's other unchecked tickets remain ITEMS (Jaxon's
four + batch) and REGULAR ENEMIES.
