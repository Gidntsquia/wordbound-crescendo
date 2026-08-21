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
