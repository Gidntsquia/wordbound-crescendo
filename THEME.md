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
