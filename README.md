# Wordbound: Crescendo

A "words vs music" browser game: an evil music faction has stolen the alphabet, and
you spell words to fight musical enemies and win it back. Bosses are backed by
famous public-domain classical/opera pieces synthesized live via the Web Audio API,
normal enemies by lesser-known pieces, and bosses attack **on the crescendos of
their music** — a real-time pressure element where getting the best word you can
*quickly* matters more than getting the best word possible, and submitting right on
a crescendo parries incoming damage. Working title; naming is still open (see
GOALS.md).

This is a sibling game to [Wordbound](https://github.com/gidntsquia/descent-of-essence),
engine-forked from that repo at its v0.42 state (word-combat core: dictionary
validation, letter-tile racks, deck-building, the woodcut-SVG art direction). The
engine is expected to diverge from the sibling as Crescendo's design needs it — no
compatibility obligation in either direction. See [THEME.md](THEME.md) for lore and
[ROADMAP.md](ROADMAP.md) for the milestone plan.

## Quickstart — Play Locally

No build step required. Just open `wordbound.html` in your browser.

```bash
# On Mac:
open wordbound.html

# On Windows or Linux:
firefox wordbound.html    # or chrome, safari, etc.
```

Or serve it locally (avoids `file://` CORS quirks in some browsers):

```bash
python -m http.server 8000
# then visit http://localhost:8000/wordbound.html
```

## Development

```bash
npm install         # one-time setup
npm test             # jsdom DOM-verification suite (test/dom-check.js)
npm run test:mobile  # real-browser (Playwright) mobile layout check, 375/414px
npm run test:qa      # real-browser QA smoke run
```

`npm test` is a fast jsdom sanity check — it loads `wordbound.html`, drives game
logic directly, and catches the class of bug that only shows up once code actually
executes in a DOM. It cannot verify audio, real timing, or drag-and-drop; those need
a real browser (Playwright is a devDependency; see `test/verify-*.js` for examples).

Run `npm test` (and `npm run test:mobile` for any CSS/layout change) before
considering any game-logic or rendering change done — see GOALS.md for the full
verification policy this repo's automated dev routine follows.

### Project layout

```
wordbound.html          # the game: all screens, combat UI
js/wordbound/            # game logic — dictionary, combat, tiles, monsters, items...
js/core/                 # shared engine bits: seeded RNG, namespace setup
css/wordbound.css        # styling (inked-woodcut art direction)
test/                    # dom-check.js (jsdom) + verify-*.js (Playwright) suites
tools/                   # build-itch.js (itch.io packaging), ensure-deps.js, etc.
GOALS.md                 # task queue for the automated dev routine
PROGRESS.md              # append-only log of what's been built
ROADMAP.md               # milestones and known gaps
THEME.md                 # world bible / lore (still the sibling's, being replaced)
```

## License

Not currently licensed. The game, code, and design are the creation of Jaxon.
