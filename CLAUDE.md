# CLAUDE.md — Wordbound: Crescendo

Repo map and rules. Keep this file true when you add or move structure.

Standing rules

- Verify by running: `bun run play` for rules/economy questions (no browser); a real browser for anything visual.
- **Never open anything in Jaxon's Firefox** — no launching it, no tabs, no `--open` on the dev server. Browser checks run headless in a separate Playwright Chromium.
- No test suite (deliberate). Don't add one unless Jaxon asks.
- `bun run typecheck`, `lint`, `format:check` stay clean. No `any` in app code.
- Music must be public domain or one of the two logged Pixabay recordings.
- After a change lands, `bun run deploy` (Jaxon watches the live link from a phone).
- Look: Victorian-gothic (lacquer black, gilt, parchment) by restyling the shadcn tokens in `globals.css`; two `@fontsource` fonts; PD engravings only. Animation is CSS only (no library), must respect `prefers-reduced-motion`. Copy is short, dry, human: no exclamation marks, no "embark/unleash/journey/masterpiece/embrace".
- Conventions and where new code goes: `docs/conventions.md`.

## Commands

`bun run dev` · `build` · `preview` · `play` (headless seeded run: `--seed=N --bot=greedy|lazy|noshop --composer=beethoven|bach|mozart`) · `typecheck` · `lint` · `format:check` · `deploy` (builds, force-pushes `dist/` to `gh-pages`).

## Getting the old game back

Tag `pre-rebuild` / branch `legacy` hold the full game as it was before the 2026-09-20 rebuild: `git checkout pre-rebuild && bun install && bun run dev`.

## Map

- `index.html`, `src/main.tsx` — entry; mounts `app/app.tsx`.
- `src/app/app.tsx` — loads the dictionary, shows the screen for the run's phase.
- `src/game/` — rules, pure TypeScript (composers, work tiles and quills' twists live here as data + rules) (no React/DOM/timers): `types.ts`, `rng.ts` (seeded RNG as data), `dictionary.ts`, `score.ts`, `fight.ts` (deal/play/swap), `shop.ts` (roll/buy), `run.ts` (a run: fight → shop → fight), `content/` (letters and bag, composers, fights/chores, modifiers, quills, marks tables), `data/words.txt`.
- `src/features/fight/`, `shop/`, `run/` (reducer hook, header, end screen), `audio/` (per-composer fight music, recordings + licence records in `tracks.ts`), `art/` (public-domain engravings + `credits.ts`), `run/title-screen.tsx` (composer pick).
- `src/components/` — shared UI (`tile-face.tsx`); `src/components/ui/` — shadcn primitives (button, card, badge).
- `src/lib/utils.ts` — `cn`. `src/styles/globals.css` — Tailwind + stock shadcn tokens.
- `tools/play-run.ts` — headless bot run; `tools/deploy.sh` — live deploy.
- `docs/conventions.md` — adopted conventions, each with source.

Persisted state: none (no `localStorage`).

## Copied from the old game (`pre-rebuild`)

| New                                                               | Origin                           | What was taken                                              |
| ----------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------- |
| `src/game/data/words.txt`                                         | `js/wordbound/wordlist.js`       | words of 3–7 letters, A–Z only, deduplicated, sorted        |
| `src/features/audio/tracks/fur-elise.mp3`, `moonlight-sonata.mp3` | `public/audio/`                  | the two committed recordings                                |
| `src/features/audio/tracks.ts`                                    | `tools/audio-manifest.json`      | licence and source records                                  |
| `src/game/rng.ts`                                                 | `src/engine/rng.ts`              | the mulberry32 algorithm (rewritten as state-in, state-out) |
| `src/game/content/letters.ts`                                     | `src/engine/content/tileBags.ts` | the "house case" bag idea, re-counted to 36 tiles           |
| `.prettierrc.json`, `.husky/`                                     | same paths                       | unchanged                                                   |
| `src/components/ui/*`                                             | `src/ui/primitives/*`            | regenerated with the shadcn CLI, same base-nova style       |
| `tools/deploy.sh`                                                 | `tools/deploy.sh`                | same gh-pages publish, simplified build step                |

Everything else is new code. Check with `git diff --stat pre-rebuild main`.
