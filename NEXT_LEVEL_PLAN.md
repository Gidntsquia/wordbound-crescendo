# Next-level plan — from a good sandbox to a game people finish

Written 2026-09-07, after DIVERGENCE_PLAN.md items 1–4 all shipped in one day;
revised the same day to Jaxon's cuts (below). The build order for what comes
after the divergence work: each stage gated on a played run on the phone,
not a build passing. BALATRO_NOTES.md §3 is still the rule for where to
diverge: copy Balatro on economy, pacing and legibility; diverge on what a
hand is.

Jaxon's decisions, 2026-09-07:

- **No enemy strikes.** The music never attacks. Crescendos stay a reward
  layer (the crescendo quills), never a punishment. The ROADMAP.md
  strike/parry pitch is dropped for the sandbox.
- **Chords are one quill**, not a base mechanic.
- **From run choices, only keys** (difficulty tiers). No movement choice,
  no encore, no daily seed.
- **Quill discovery** is in.
- **Identity and polish, all of it**, minus strike/parry sounds.
- **Delete the old app** (`/app.html`, `wordbound.html`, `css/`, and the
  engine modules only they used).
- **Jaxon is asleep while this is built.** No input is available until he
  wakes. The AI must unblock itself wherever possible: make every routine
  call with the plan's recommendation, write the decision and its reason
  into this file's "Decided overnight" section, and keep going. A stage
  whose gate is a played run is not a stop — build it, verify with a
  headless Chromium driver as in NIGHT_REPORT.md, deploy, and list the feel
  question for the morning. Stop only for something destructive beyond
  the deletion already approved here.

## Stage 1 — Feel pass (before anything new)

Nine quills, premium slots and the letter meta shipped untested. Play three
full runs on the phone, then tune before building on top of it.

- **Crescendo window.** Is 5 s warning enough to hold a word ready? If not:
  8 s countdown, or the card shows "next crescendo in 14 s" at all times
  (`Sandbox.CRESCENDO`, `seq.crescendo()`).
- **Crescendo frequency.** One window per 15–20 s with two crescendo quills
  may be a ×3 every other word. If so, raise the `mag ≥ 0.6` cut or the
  12 s spacing in audioPiece.js.
- **Premium slots.** `PREMIUM_CHANCE/DL/TL/DW`. Does the player actually
  drag a tile onto the slot? If the drag is never used, the slot needs to
  be more visible or the bonus bigger.
- **Locked alphabet.** Is a 20-letter start too easy, and does the boss
  letter-choice screen feel like a prize?
- **Movement II/III difficulty** — still tuned against a solver
  (NIGHT_REPORT.md). `MOVEMENT_BASE_2/3`.
- Write the numbers that change into `ROUND_DEFAULTS` and one line each
  here. Gate: Jaxon says the three shipped systems feel right.
- **Overnight:** this stage is Jaxon's and is skipped. Leave the numbers
  as they are; list every feel question under "For the morning" below.

## Stage 2 — Harmony: the chord quill

BALATRO_NOTES §3.6, as a single quill. **Harmony** (rare): after a play,
if two or three tiles left in the case spell a word, that word's base
points are added as a `chord` step in the cascade (points only, no mult).
Without the quill nothing in the case scores, so the base game is
unchanged.

- `scoreWordPoints` gains the `chord` step after the items, only when an
  item sets `acc.chord`; the cascade narrates it with its own pop.
- The chord is found with the existing anagram map in wordFinder.js over
  the tiles still in the case (longest word wins, ties by points).
- Steel ink (held ×1.2) is its natural partner and needs no change.
- Gate: does a Harmony owner start leaving letters behind on purpose?

## Stage 3 — Keys (difficulty tiers)

Balatro's stakes, named for musical keys. After a first win the title
screen offers the next key; each is the one before plus one rule.

- C major — the base game.
- G major — targets ×1.15.
- D major — one fewer swap per round.
- A minor — the premium slot never appears on boss rounds.
- E minor — shop reroll starts at 7.
- B minor — no skip favours.

`wbc.key` next to `wbc.best`; the end screen shows wins per key; the
tuning panel exposes each key's numbers. Gate: G major is a real step up
and B minor is beatable by Jaxon.

## Stage 4 — Quill discovery

The second meta after stolen letters. New quills are not in the shop or
pack pool until first discovered.

- `wbc.quills` in localStorage, a JSON array like `wbc.letters`; a
  fresh install knows ~10 starting quills (the plain length and mult
  ones), the rest hidden.
- Discovery: felling a boss offers a quill alongside the letter choice
  (one screen, two prizes), and any run reaching Movement III reveals one
  more at random. A lost run never loses a quill.
- shop.js and the packs filter the pool by `wbc.quills`; the gear panel
  gains a quill list with the undiscovered ones hollow, next to the
  alphabet row.
- Gate: run five still shows a quill the player has not seen.

## Stage 5 — Identity and polish

The pass before a build people outside the household play.

- **Delete the old app.** Remove `index.html` + `src/main.jsx`, `src/App.jsx`
  and `src/components/`, `wordbound.html`, `css/`, and the engine modules
  only they used (duel, duelCombat, combat, music + pieces, floor, game,
  monsters, characters, items, intents, traits, bossEntrances,
  shakespeareGuide, shopkeepers, achievements, events, the engine's
  stolenLetters). Keep namespace, rng, wordlist, lexicon, tiles. The
  sandbox becomes the app: `sandbox.html` is renamed `index.html`,
  `dev:sandbox` becomes `dev`, build-site stops moving anything to
  `/app.html`. CLAUDE.md's map shrinks by half.
- **Enemy faces.** One emblem per enemy on the run strip and the target
  card, plus one line in the enemy's voice on the rule card. THEME.md's
  Mountain King / Fiddler / Valkyrie Marshal replace placeholder boss
  names where the recording matches.
- **Title screen.** A name decision (ROADMAP: Jaxon's call), a recording
  playing quietly, the alphabet with its hollow letters and the quill
  count as the progress display.
- **Sound.** A distinct shimmer per premium kind in sfx.js. No strike or
  parry sounds — there are no strikes.
- **Offline.** The seven fetched MP3s are not committed; a service worker
  caching `public/audio/` after first play makes the phone build work
  without signal. `build:site` already fetches them.
- **Itch build.** tools/build-itch.js exists from the sibling repo; point
  it at the sandbox entry and test the zip.

## Order of work (overnight)

1. Stage 5's first item, deleting the old app — first, so nothing new is
   built against dead code. Approved above.
2. Stage 2 (Harmony).
3. Stage 3 (keys) — use the six rules as written; they are the AI's
   proposal and Jaxon can rename or reorder them in the morning.
4. Stage 4 (quill discovery) — starting set: the plain length and mult
   quills, chosen by the AI; hidden: every crescendo and second-axis quill.
5. The rest of stage 5. The name stays "Wordbound: Crescendo" until Jaxon
   changes it.
6. Stage 1 waits for Jaxon.

One commit per stage with the `SANDBOX:` prefix, `npm run deploy` after
each, main pushed. Verification per stage: `npm run build` clean and a
headless driver run at 1280 wide and 390×844 with zero page errors.

## Decided overnight

(The AI appends one line per decision made without Jaxon, with the reason.)

- Stage 2, Harmony's chord price/rarity: rare, 9 gold. Reason: it is a
  build-around that pays off only with steel ink or deliberate leftover
  planning, in line with Double Stop/Fermata's rare pricing.
- Stage 2, chord points formula: the leftover word's tier base points (tune
  `PTS_t*` at level 1) plus its plain letter values -- no ink/item/level
  scaling, no mult. Reason: the plan says "base points... points only, no
  mult"; a simpler number is easier to read in the cascade and keeps Harmony
  from silently compounding with tier levels bought elsewhere.
- Stage 3, the six keys are exactly the plan's proposal (targets ×1.15 / one
  fewer swap / no boss premium / reroll 7 / no skip), applied cumulatively
  as written ("each is the one before plus one rule"). Reason: plan says
  these are the AI's proposal and Jaxon can rename/reorder in the morning;
  no reason to invent a different six overnight.
- Stage 3, key progression: a win on the current highest-unlocked key
  unlocks the next; there is no way to jump ahead or skip down except by not
  yet having won. Reason: mirrors Balatro's stake unlocking and needs no new
  UI beyond a locked/unlocked button row.
- Stage 4, starting (discovered-from-install) quill set: brass_nib,
  second_ink, short_form, long_form, lead_weight, gilded_edge, half_note,
  double_stop, fermata, miser (10, matching the plan's "~10"). Hidden: every
  crescendo quill, every second-axis quill (libretto, dissonance, notation,
  bard, rhyme, palindrome), vowel_song, hard_consonant, refrain, coda,
  anagram, and Harmony. Reason: "plain length and mult" read as flat
  points/mult with no word-kind, position, or scaling condition; vowel_song/
  hard_consonant (letter-kind) and refrain/coda/anagram (conditional/
  scaling) are closer in spirit to the second-axis quills the plan says to
  hide than to the flat ones it says to keep.
- Stage 4, "two prizes, one screen" after a boss: implemented as a spoken
  line ("The boss also yields a new quill: ...") alongside the existing
  letter-choice screen, not a second pick-one-of-three UI. Reason: the plan
  says discovery just happens (no player choice described, unlike the
  letter pick which explicitly offers three) -- only the letter choice is a
  choice; the quill is a reveal. Building a second choice widget would have
  been scope well past what stage 4 asks for.
- Stage 5 order: did the app deletion first (already true of the working
  tree when this session started), then stages 2-4, then the rest of stage
  5, matching "Order of work" exactly.
- Stage 5, itch build: rewrote tools/build-itch.js to run the real `vite
build` and zip dist/app/ directly instead of hand-staging a dependency
  list against the now-deleted wordbound.html. Reason: the old script's
  entire premise (two different games sharing a repo, itch wanting the
  other one) no longer holds now that the sandbox is the only app.
- Stage 5, offline: scoped the service worker to public/audio/*.mp3 only,
  never index.html or the hashed JS/CSS bundle. Reason: caching the app
  shell itself risks silently serving a stale build after a deploy, which
  conflicts with the LIVE DEPLOY rule (Jaxon watches the live link and
  expects to see what was just pushed); the audio is large, slow to fetch,
  and never changes once fetched, so it's the one thing worth caching hard.
- Stage 5, title screen background recording: not implemented. See "For the
  morning."

## For the morning

(The AI appends every feel question here, most important first.)

- Stage 1 (feel pass) is still untouched, as instructed -- the crescendo
  window/frequency, premium slot visibility, locked-alphabet difficulty and
  Movement II/III tuning all still need your played-on-the-phone judgement
  before anything else gets tuned against them.
- Keys (stage 3): does G major's ×1.15 target actually feel like "a real
  step up," and is B minor beatable? These were picked from the plan's own
  proposal, completely untested against a real run -- they may need
  softening or sharpening once you've played a few.
- Quill discovery (stage 4): does felling a boss ever feel like it front-
  loads too much (a letter AND a quill on the same screen, same beat)? If
  it's too much at once, the Movement III reveal could move earlier/later
  to spread the "new thing" moments out instead.
- Title screen: I did not add background music autoplay. Browsers block
  audio before a user gesture, so a silently-failing autoplay attempt
  seemed worse than none -- the title screen still shows the alphabet and
  the new quill-discovery row as the progress display the plan asked for,
  just no recording. If you want music there, the cleanest option is
  probably starting it muted and unmuting on the first tap anywhere on the
  page, but that's a design call, not just an implementation one.
- Title/name: still "Wordbound: Crescendo" per your explicit instruction not
  to decide this overnight.
- The itch zip (`npm run build:itch`) could not be tested end-to-end in
  this environment -- the `zip` CLI isn't installed here. The script itself
  is straightforward (build, then zip dist/app/'s contents) and dist/app/
  builds clean, but please run `npm run build:itch` once on your machine
  and sanity-check the zip uploads/plays on itch before relying on it.
- Harmony (stage 2) is a rare, 9-gold quill with a fairly narrow payoff
  window (needs exactly 2-3 leftover tiles that spell something). It's
  untested against a real run for whether that's fun or just fiddly --
  worth a specific look during your Stage 1 pass since it changes what
  "leaving letters behind" means for the first time.

Not doing, on purpose: enemy strikes or any punishment tied to the music,
chords as a base mechanic, movement choice, encore, daily seed, vouchers
and editions, an overworld map, multiplayer, and any recording that is
not public domain or already logged as an exception.
