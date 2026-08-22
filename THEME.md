# Wordbound: Crescendo — World Bible

Operatic melodrama, played mostly straight. This is the sibling to Wordbound's
library-pun tone, not a copy of it: where the Boundless Archive's Loose Words are a
nuisance, the Fermata are a real, sneering threat, and the stolen alphabet is a real
loss. Wit is fine (musicians are dramatic people and know it), but the target feeling
is a concert hall gone hostile, not a library with bad manners. This is the single
source of truth for names and flavor text — read it before touching any naming, and
don't invent lore that contradicts it.

## Premise

You're a Junior Lyricist at **the Concert Eternal**, a hall vast enough to stage
every piece of music ever composed, every night, forever — your job is writing the
words that ride the melody: programme notes, surtitles, singable lyrics, whatever the
score calls for. Then **the Fermata**, a cabal of the house's most brilliant and most
bitter performers, staged a coup. Sick of sharing a single bill with mere *words*,
they seized the house lights, silenced the audience, and made off with the alphabet
itself — stole the letters wholesale, so nothing could ever be written, printed, or
subtitled again, and music alone would fill the world forever.

All you have left is your Rack (a case of loose type, still yours) and the stubborn
professional belief that a good word can out-argue a good tune if it lands on the
beat. Every fight from here is a duel: their piece pushes, your word pushes back.
Win enough duels and you win your letters back, one stolen hostage at a time.

## The duel

Every fight is a tug-of-war between two forces, not a turn-by-turn trade:

- **The Volume** — the duel gauge itself. A pun worth keeping: the loudness dial and
  the book both. The enemy's piece pushes the Volume toward you, continuously, in
  real correspondence with the music actually playing — crescendos shove hard, quiet
  passages barely nudge it. You push back by playing words; a good word visibly
  moves the Volume, a great one swings it. (Alternate considered: "the Downbeat" —
  weaker pun, dropped in favor of Volume. Flag for Jaxon either way.)
- **Verses** — your health, ~5 discrete blocks. A verse is a unit of song and a unit
  of poetry at once, which is the whole point: it's yours, not theirs, even though
  the word doubles as musical vocabulary. Lose a duel push (the Volume reaches your
  end) and you lose exactly one Verse, then get a grace window before the music can
  touch you again. (Alternates considered: Stanzas — reads a little dry; Refrains —
  implies repetition, wrong connotation for something you're losing. Verses is the
  pick; flag for Jaxon either way, per the standing naming rule.)
- Losing all your Verses is the run's incident report. No line drafted for it yet —
  low priority, revisit when the combat ticket needs actual game-over copy.

## The Concert Eternal (setting / stage-tier map)

Three floors, mirroring the engine's existing `TOTAL_FLOORS = 3` structure (see
`js/wordbound/floor.js` — unchanged by this ticket, just naming the space it already
divides), each ending on one of the three famous-piece bosses below. The true final
boss sits beyond the third floor, its own stage. This mapping is a proposal for
whichever ticket wires floors to bosses — not a hard requirement of this one.

1. **The Open Rehearsal** — early tier. Public warm-up hall, house lights half up,
   nobody's trying to hurt you yet. Home to the chill, slow-tier regulars.
2. **The Recital Hall** — mid tier. The performances get serious here; a few real
   spikes start showing up in otherwise calm pieces.
3. **The Grand Stage** — late tier. Main hall, full house, frequent and powerful
   crescendos. The regulars here read as boss-adjacent on purpose.
4. **The Podium** — final tier, beyond the third floor. Where the Fermata's true
   leader conducts. One boss, one piece, four movements.

## PD vetting — famous-piece candidates

Per the standing rule: composition published before 1930 AND composer dead 70+
years (checked against 2026). All dates below are composition/premiere dates, not
publication dates, unless noted — vet again before final code lands if a piece's
specific edition matters (arrangement/orchestration years can differ from the
original).

| Piece | Composer | Composed | Composer died | PD? |
|---|---|---|---|---|
| In the Hall of the Mountain King (*Peer Gynt*) | Grieg | 1875 | 1907 (119y) | Yes |
| Danse Macabre | Saint-Saëns | 1874 | 1921 (105y) | Yes |
| Ride of the Valkyries (*Die Walküre*) | Wagner | 1851–56 | 1883 (143y) | Yes |
| Symphony No. 5 in C minor | Beethoven | 1808 | 1827 (199y) | Yes |
| Toccata and Fugue in D minor, BWV 565 | Bach (disputed — poss. J.L. Krebs) | c. 1704 | Bach 1750 / Krebs 1780 | Yes either way |
| Night on Bald Mountain | Mussorgsky (rev. Rimsky-Korsakov) | 1867 / rev. 1886 | 1881 / 1908 | Yes either way |
| Flight of the Bumblebee (*Tsar Saltan*) | Rimsky-Korsakov | 1899–1900 | 1908 (118y) | Yes |
| Queen of the Night aria (*Die Zauberflöte*) | Mozart | 1791 | 1791 (235y) | Yes — **reserved, unused this pass** |
| Moonlight Sonata, 3rd mvt | Beethoven | 1801 | 1827 (199y) | Yes — **reserved, unused this pass** |
| The Four Seasons, "Summer"/"Winter" | Vivaldi | 1725 | 1741 (285y) | Yes — **reserved, unused this pass** |

The three reserved pieces are fully vetted and free to use for future boss/regular
expansion (see ROADMAP.md milestone 2) — held back only to keep this pass's roster a
tight, distinct set instead of nine bosses' worth of famous names competing for
attention.

## The three floor bosses

Each below: name, personality (for the entrance-cutscene ticket), how their piece's
real dynamics shape the fight, and a proposed hostage letter (see "Stolen letters"
below — proposal only, the meta-progression ticket owns the real decision).

### The Mountain King *(In the Hall of the Mountain King — Grieg, floor 1)*
Impish and mocking at first — low, plodding, almost funny. He's not scared of a
Junior Lyricist. But the piece is a single unbroken accelerando: it gets faster and
louder in one long ramp with no cool-down, and so does he, until "mocking" turns to
"actually closing in." This is the game's first real boss on purpose — it teaches
the core lesson (watch the ramp, don't panic, land your word before it peaks)
through the structure of the music itself, not a tutorial pop-up. Hostage letter
proposal: **K**.

### Death, the Fiddler *(Danse Macabre — Saint-Saëns, floor 2)*
A skeletal fiddler who tunes his instrument to a tritone (the "devil's interval")
before he'll even acknowledge you — theatrical, unhurried, savoring it. The piece
alternates long stretches of danceable, almost graceful melody with sudden sharp
stings; the fight should feel the same, lulling before it bites. Hostage letter
proposal: **X**.

### The Valkyrie Marshal *(Ride of the Valkyries — Die Walküre, Wagner, floor 3)*
A thundering warrior-general leading a squadron of shrieking brass and sopranos
into battle — no theatrics, no taunting pause, just relentless forward pressure from
the first note. The most continuously aggressive of the three floor bosses by
design: this is the last thing standing between the player and the Podium, and the
piece barely lets up long enough to breathe. Hostage letter proposal: **V**.

## The Maestro *(final boss — Symphony No. 5 in C minor, Beethoven, the Podium)*

The Fermata's true leader, and the personification of the piece's own legend: the
famous opening four-note motif (short-short-short-LONG) has been called "Fate
knocking at the door" since Beethoven's own lifetime, and the Maestro plays that
motif completely straight — as a threat, not a metaphor. Calm, absolute, utterly
certain of the outcome. The symphony's four movements are the natural fight-phase
structure (implementing run's call on exact mechanics, per the combat ticket) — each
movement changes the shape of the pressure, not just its intensity, ending on the
finale's triumphant major-key turn as the last phase. Hostage letter proposal: **Z**
— the last letter recovered closes the alphabet.

## The regulars (9, three per tier)

Lesser-known pieces per the standing rule, one-line gimmick each. Tier is a proposed
value for the music engine's `stage-tier` field (early/mid/late/final).

### Early tier — chill, gentle, rare weak crescendos

| Name | Piece | Composer | PD | Gimmick |
|---|---|---|---|---|
| **The Gymnopédiste** | Gymnopédie No. 1 | Satie (1888, d.1925, 101y) | Yes | Barely moves. Barely attacks. A warm-up in every sense. |
| **The G String** | Air ("Air on the G String"), *Orchestral Suite No. 3* | Bach (c.1730, d.1750) | Yes | One long, gentle, unbroken legato line. Telegraphs nothing because there's nothing to telegraph. |
| **Morning Mood** | "Morning Mood," *Peer Gynt Suite No. 1* | Grieg (1875, d.1907, 119y) | Yes | Wakes up slowly over the whole fight. Starts nearly harmless, ends only mildly less so. |

### Mid tier — a few real spikes in otherwise calm pieces

| Name | Piece | Composer | PD | Gimmick |
|---|---|---|---|---|
| **The Gnossienne** | Gnossienne No. 1 | Satie (1890, d.1925, 101y) | Yes | Deliberately off-kilter, no time signature to read — the spikes land where you don't expect them. |
| **The Invention** | Invention No. 4 in D minor, BWV 775 | Bach (c.1720–23, d.1750) | Yes | Two contrapuntal voices fighting each other as much as you — brief crossed-line surges. |
| **The Metronome** | *School of Velocity*, Op. 299 No. 1 | Czerny (1834, d.1857, 169y) | Yes | Mechanical, relentless, perfectly even — no surprise crescendos, just unceasing pressure that never actually stops to breathe. |

### Late tier — frequent, powerful crescendos, boss-adjacent pressure

| Name | Piece | Composer | PD | Gimmick |
|---|---|---|---|---|
| **The Swarm** | Flight of the Bumblebee (*Tsar Saltan*) | Rimsky-Korsakov (1899–1900, d.1908, 118y) | Yes | Frantic, chromatic, constant — no single big crescendo, just relentless high-frequency pressure. |
| **The Sabbath** | Night on Bald Mountain | Mussorgsky/rev. Rimsky-Korsakov (1867/1886) | Yes | Huge crescendo waves, each bigger than the last, building toward a false dawn. |
| **The Organist** | Toccata and Fugue in D minor, BWV 565 | Bach, disputed (c.1704) | Yes | Gothic, cathedral-scale swells alternating with virtuosic quiet runs — the biggest single spikes of any regular in the game. |

## Stolen letters (proposal, for the meta-progression ticket)

Not this ticket's decision to make, but worth flagging while the roster's fresh:
the four hostage letters proposed above — **K, V, X, Z** — line up exactly with
GOALS.md's own suggested starting-stolen set ("J K Q V X Z + 2-3 mid-tier
letters"). If the meta-progression ticket adopts these hostages, the four
boss-guarded letters and four of the six starting-stolen letters are the same
letters, which reads well (the bosses hold the worst of what's missing). The
meta-progression ticket still owns picking the remaining 2-3 mid-tier stolen
letters and whether achievement-only recoveries exist.

## The guide and the shopkeepers

The words side needs faces too — not every voice in this game should belong to
the Fermata. Written for GOALS.md's "SHAKESPEARE GUIDE + AUTHOR SHOPKEEPERS"
implementation ticket, per that ticket's own step 0 instruction — this section
is that ticket's source of truth.

### William Shakespeare — the guide

Not a shopkeeper, not a combatant — the one who sends the player out. He
speaks the way the popular imagination remembers him speaking: grandiose,
compulsively punning, quoting himself before anyone else gets the chance,
utterly certain that whatever is happening right now is the most important
thing that has ever happened to the English language. Underneath the bluster
he's genuinely alarmed — the alphabet is HIS medium too, and the Fermata took
it from everyone, him included — but he'd rather perform confidence than
admit fear, which is itself very in character.

**Quest-setting beats** (for the intro sequence — GUIDE INTRO, step 1 of the
implementation ticket): short, three beats, matching the boss-entrance
cutscene's own brevity bar (a title-card-and-a-few-lines shape, not a full
scene):

1. **The theft, told as an outrage against HIM personally as much as the
   world.** He was mid-soliloquy — mid-*sentence* — when the house lights
   went out and the Fermata walked off with every letter in the building.
   "Not a comma left to finish my thought with, and they call THAT an
   encore."
2. **Why the player.** He doesn't pick the Junior Lyricist because they're
   the chosen one — he picks them because they're standing there with a full
   Rack and nothing better to do, and Shakespeare has never once let modesty
   (his own or anyone else's) get in the way of a good recruitment pitch.
   "You have your letters still, which by my count makes you the last armed
   man in the building. Fortune, it seems, has volunteered you."
3. **The send-off, which is also the tutorial's whole thesis in one line.**
   Not "go fight monsters" — "go OUT-ARGUE them." The duel gauge, the
   pressure, the whole game, compressed into a boast: "A tune can fill a
   room. A WORD, well-placed, can end the argument. Go and place a few."

Sample lines (voice reference, not locked final copy — same "worth Jaxon's
read for tone" flag every cutscene-copy section of this bible has gotten):
- "Out, out, brief candle — no, wait, wrong play, wrong mood, disregard that,
  the point stands: they took the LETTERS, every last one, and left me
  reciting in mime."
- "I have written kings, ghosts, a fellow who argues with a skull — I have
  NEVER written a villain so petty as one who steals the alphabet rather
  than simply learn to use it better."
- "Go on. Give them a piece of your mind — spelled correctly, if you can
  manage it under pressure. I never could, and look how far I got."

### The shopkeeper roster (six famous authors)

Per the ticket's candidate list, picked for the widest spread of era and
voice available in six long-dead, public-domain figures — deliberately not
six variations on "witty 19th-century novelist":

| Author | Era | Voice | Shop QUIRK concept | Exclusive item concept(s) |
|---|---|---|---|---|
| **Homer** | Ancient Greek (epic) | Booming, formulaic, everything an epithet — the player is never just "you," always "sacker of sour chords" or similar earned-on-the-spot title. Speaks of a 3-gold purchase like it's a fleet launching. | Bard's Largesse: his shop always stocks one EXTRA consumable slot beyond the game's usual guaranteed one (per game.js's `rollShopOptions`, which currently guarantees exactly one consumable slot — Homer's shops guarantee two). | *The Wine-Dark Litany* (consumable: a word played while it's active gets a flat bonus, framed as "the muse briefly attends you") · *Rhapsode's Girdle* (item: reading directly off `rollShopOptions`'s consumable-guarantee logic, this is the flavor text home for whatever numeric bonus lands there, not a separate mechanic — see the ITEMS ticket for the real numbers). |
| **Miguel de Cervantes** | Spanish Golden Age | Grandiloquent, self-aware, narrates his own shop like a chivalric quest gone slightly wrong — sells you the item AND a wry commentary on why buying it is either brilliant or delusional, never tells you which. | Tilt at Windmills: rerolling his shop's offer (if/when a shop reroll mechanic exists — coordinate with the ITEMS ticket) costs less than the game's default reroll price; framed as "the windmill spins for less, if you insist it's a giant." | *Rocinante's Last Furlong* (item: a "runs out of steam" effect — strong early in a fight, tapers — matching a tired old warhorse given one more ride) · *The Ingenious Gentleman's Ledger* (item: rewards a long, ambitious word over a short safe one — a bonus that scales with word length past the usual length-bonus curve). |
| **Jane Austen** | Regency England | Deadpan social wit — every sentence a compliment with a blade folded inside it. Prices are "quite reasonable, all things considered" right up until you notice they aren't. Comments on the player's build the way she'd comment on a bad match at a ball. | Sense and Sensibility: a straight percentage discount on one whole item CATEGORY per shop visit (the ticket's own "category discount" example) — which category discounts is picked per-shop (see the "per-shop or per-run" note below), read as "whichever she's decided you actually need this week." | *A Truth Universally Acknowledged* (item: a passive that rewards NOT playing the same word twice — codifying the existing repeat-word penalty into a bonus rather than just an absence of penalty) · *Persuasion's Turn* (item: a cheap, common-tier confidence-builder for an early build, in her own words "a modest start to a very good match"). |
| **Emily Dickinson** | 19th c. America (reclusive, compressed) | Terse to the point of cryptic — sentences broken by dashes, never explains a joke or a price twice, and somehow still says more per word than anyone else at the counter. Doesn't haggle; doesn't need to. | Circumference — (extra tile stock): her shop's premium variant-tile offer (`Tiles.rollVariantTile`, gated today by `SHOP_VARIANT_TILE_CHANCE`) is guaranteed to appear, not a coin-flip — "the Tile — does not — hide — from me." | *A Certain Slant of Ink* (item: an ink-economy effect, since ink is her natural pun — reduced Overcharge/Rewrite cost) · *I Dwell in Possibility* (item: a rare passive that unlocks a small extra choice somewhere else in the run — tile reward, treasure pick — "one more door, where there was one"). |
| **Edgar Allan Poe** | 19th c. America (gothic) | Obsessive, ornate, faintly threatening in a way that's clearly theater — every item comes with a backstory implying it's cursed, which he delivers with obvious relish and zero remorse if you buy it anyway. | Nevermore: a steep discount specifically on RARE-and-above items — "the finer things come cheap, here, to those who don't ask why." | *The Tell-Tale Meter* (item: a Vampiric-style heal-on-play effect, themed as a heartbeat that won't stop) · *Quoth* (consumable: a one-time word-repeat IMMUNITY — play the same word twice with no penalty, once, "just this once — nevermore after"). |
| **Oscar Wilde** | Victorian/Edwardian | Epigrammatic, paradoxical, faintly bored by his own genius — every shop line is a reversible aphorism ("I can resist anything except a good discount"), and he treats the whole transaction as beneath him right up until you actually buy something, at which point he's delighted. | The Importance of Being Earnest (about pricing): a flat, unconditional discount on every CONSUMABLE in his shop — "the only honest markdown I've ever offered; consider it my one sincere act this week." | *A Portrait in the Attic* (item: a build-warping rare — a cost/downside now for a large payoff later in the run, matching the painting-takes-the-damage premise) · *An Ideal Word* (item: rewards playing an unusually SHORT word well — a small bonus tuned to the opposite end of the curve from Cervantes' long-word item, so the roster's mechanics don't all point the same direction). |

**Per-shop vs. per-run pick, and why (for the implementation ticket's own
"document whether the pick is per-shop or per-run" instruction):** this
bible recommends **per-shop**, seeded off `(runSeed, shop node id)` rather
than `runSeed` alone — a single author for the whole run would make one
quirk (e.g. Austen's category discount) either dominate an entire run's
economy or never come up at all, whereas rotating per shop lets the player
meet several voices per run (closer to how `rollShopOptions` and
`rollShopTileOffer` already reroll fresh per shop visit) while staying fully
seed-reproducible for sims/tests, per the ticket's own requirement. Flag for
Jaxon either way — this is the bible's proposal, not a locked call.

### Portraits

Same "worth a future art pass" gap this bible's boss section and BOSS
ENTRANCE CUTSCENES already flagged: no woodcut/illustration asset pipeline
exists yet in this repo (confirmed by grep before this section was written).
Shakespeare and all six authors need a shared-style woodcut portrait
eventually; until that pipeline exists, the implementation ticket's own
portrait step should reuse whatever placeholder convention BOSS ENTRANCE
CUTSCENES already established (a framed glyph, not a blocked ticket) rather
than invent a second placeholder convention.

## Display name

Working title stands: **Wordbound: Crescendo**. "Crescendo" is doing real
mechanical work (it's the actual game verb, not just a mood word) and the
title keeps the sibling-game naming pattern intact. Alternatives considered and
set aside, for the record — not proposing any of these over the working title,
just showing the search happened:

- *Wordbound: Fermata* — names the villains instead of the mechanic; less
  inviting to a player who hasn't read this bible yet.
- *Volume Up* — clean pun on the duel-gauge name, but reads as a UI tip, not a
  title.
- *The Concert Eternal* — strong as a setting name, weak as a game title (loses
  the "Wordbound" sibling-branding link entirely).

Flag for Jaxon either way, per the standing rule — this section is a proposal,
not a decision.

## Applying this

A later ticket wires these names into the actual game files (piece data, boss
data, cutscene copy, UI labels). This document is the reference; don't duplicate
these tables into code comments, point back to THEME.md instead.
