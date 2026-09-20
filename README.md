# Wordbound: Crescendo

Spell words from a hand of letter tiles to beat a target score before you run out of plays, while a recording of a classical piece plays. Between fights you spend gold on quills (passive scoring items) and marks (tile upgrades). Win all five fights to win the run.

Live: https://gidntsquia.github.io/wordbound-crescendo/

## Quickstart

```sh
bun install
bun run dev        # http://localhost:5173
bun run play       # a bot plays a whole seeded run in the terminal, no browser
```

Other commands: `bun run build`, `typecheck`, `lint`, `format:check`, `deploy` (publishes to the live link).

## How it plays

- **Fight:** tap tiles to spell a word (3+ letters, must be in the dictionary), then Play. Points = chips × mult: chips are the letter values, mult grows with length. 4 plays and 3 swaps per fight. Reach the target to win it; run out of plays below it and the run is lost.
- **Shop** (after each won fight but the last): gold buys quills and marks. Marks are stamped on one tile of your deck.
- **Music:** a recording plays during a fight (after your first tap) and stops in the shop.

## Getting the old game back

The whole pre-rebuild game is kept as the tag `pre-rebuild` and the branch `legacy` (both on origin).

```sh
git checkout pre-rebuild   # or: git switch legacy
bun install
bun run dev
```

Go back with `git switch main`.

## Layout

See [CLAUDE.md](CLAUDE.md) for the repo map and [docs/conventions.md](docs/conventions.md) for the conventions and where new code goes.

## Size: old game vs this one

|                                                             | Old (`pre-rebuild`)         | New                                                                              |
| ----------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------- |
| Files tracked                                               | 136                         | 44                                                                               |
| Files in `src/`                                             | 93                          | 29                                                                               |
| Source lines (`src/`, ts/tsx/css, excluding generated JSON) | 16,729                      | 1,546 (incl. `tools/`)                                                           |
| Direct dependencies (prod + dev)                            | 11 + 18                     | 8 + 14                                                                           |
| JS bundle                                                   | 9,957 kB (2,680 kB gzip)    | 276 kB (87 kB gzip) + 1,091 kB word list, loaded after first paint (393 kB gzip) |
| CSS                                                         | 87 kB                       | 24 kB                                                                            |
| Word list                                                   | 15 MB source, in the bundle | 152,681 words of 3–7 letters, 1.1 MB                                             |
| Recordings shipped                                          | 9                           | 2                                                                                |
| Built site (`dist/`)                                        | 43 MB                       | 16 MB (14.5 MB of it is the two recordings)                                      |

The old numbers come from building the `pre-rebuild` tag; the new ones from `bun run build` on `main`.

## Licences

Recordings: Für Elise and Moonlight Sonata are Pixabay tracks (Pixabay Content License; compositions are public domain). Details in `src/features/audio/tracks.ts`. Word list: derived from public-domain and open sources listed in the old game's `js/wordbound/wordlist.js` (see `git show pre-rebuild:js/wordbound/wordlist.js | head -40`).
