# Goals — Wordbound: Crescendo

This file is the task queue for this repo's autonomous hourly dev routine. Jaxon (or
the orchestrator acting on his behalf) adds tasks here. Each run picks the FIRST
unchecked item, does a complete working chunk, checks it off only when fully done AND
verified, and logs to PROGRESS.md.

**WHAT THIS PROJECT IS:** a new "words vs music" game, forked from the Wordbound
engine (sibling repo: descent-of-essence, forked at its v0.42 state). Jaxon's concept,
verbatim intent: bosses are backed by famous operas/classical pieces, normal enemies
by lesser-known pieces; permanent progression is unlocking letters the evil music
faction has stolen; bosses get entrance cutscenes (taunt, flaunt, character); bosses
attack ON THE CRESCENDOS of their music — a real-time pressure element where you get
the best word you can QUICKLY, not the best word possible; submitting your word right
on a crescendo "parries" some incoming damage. It is a SEPARATE GAME in a separate
repo precisely because the engine is expected to diverge — change engine code freely
when the design needs it, no obligation to stay compatible with the sibling.

**STANDING DECISIONS (made by Jaxon or logged by the orchestrator — don't re-litigate):**
- All music is SYNTHESIZED from sequenced note data via the WebAudio engine. NEVER
  use audio recordings (licensing risk + no-external-assets convention). Owning the
  note data is also what makes crescendo timing exact enough to build the
  attack/parry mechanic on.
- PUBLIC-DOMAIN VETTING IS MANDATORY for every piece: composition published before
  1930 AND composer dead 70+ years. (Explicit trap to avoid: Carmina Burana /
  "O Fortuna" is 1936, Orff died 1982 — NOT public domain. Vet each piece and note
  the vetting in PROGRESS.md.)
- Art direction inherits the sibling's inked-woodcut SVG style unless Jaxon says
  otherwise (logged orchestrator default so the two games read as siblings).
- Working title "Wordbound: Crescendo" — a naming pass lives in the theme-bible
  ticket; Jaxon has final say.

**MANDATORY VERIFICATION (inherited from the sibling repo, same reasons):** run
`npm test` (jsdom dom-check) clean before checking off ANY task touching game logic,
wordbound.html, or rendering/event CSS. `npm run test:mobile` (real-browser, 375/414px)
for any CSS layout/panel change. jsdom cannot verify audio, real timing, or
drag-and-drop — for those, verify what you can (state changes, callback wiring, no
errors), use a real headless browser (Playwright is already a devDependency) for
timing-sensitive checks with a mocked/virtual clock where possible, and say plainly in
PROGRESS.md what's confirmed vs. what still needs real ears/hands. Never claim
confidence you don't have.

Rules for the routine:
- Work top to bottom. Blocked → note why in PROGRESS.md, move to the next item.
- Only check `[x]` when complete, working, and verified. Multi-run tasks are fine —
  leave working state + clear notes each run.
- Commit and push every run, even partial progress.
- Real timestamps only (`date -u +%Y-%m-%dT%H:%MZ`).
- Queue empty → check ROADMAP.md's known gaps; still nothing → note idle, stop.
- Version convention: semantic-ish v0.x displayed in the main menu, bump minor per
  completed feature, patch per fix. Start at v0.1.

## Queue

- [x] SCAFFOLD/PRUNE: this repo was seeded as a full copy of the sibling repo's
      working tree. Make it Crescendo's own:
      1. Remove the Descent of Essence game entirely: index.html and every js/css/test
         file that belongs to it (grep before deleting — some js/ modules and tests are
         shared by Wordbound; anything wordbound.html actually loads stays). Rename
         wordbound.html's displayed title/branding to "Wordbound: Crescendo", version
         v0.1.
      2. Make `npm test` (and test:mobile / test:qa where applicable) run CLEAN
         against this pruned tree — delete or fix tests that targeted the removed
         game; keep every Wordbound-engine test green. The full suite passing is this
         ticket's acceptance bar.
      3. Rewrite README.md minimally: what this game is (one paragraph of the concept
         above), that it's engine-forked from descent-of-essence, quickstart, test
         commands. THEME.md still contains the sibling's library lore — leave it; the
         next ticket replaces it.
      4. Sanity-check `npm run build:itch` / `test:itch-build` still work or disable
         them cleanly with a note (they can be revived at launch time).
      VERIFY: full `npm test` clean, `npm run test:qa` clean or explicitly amended,
      game boots and plays a fight in a real browser (Playwright smoke).

- [ ] THEME BIBLE: replace THEME.md with the Crescendo world bible. Premise (Jaxon's,
      keep its spine): an evil music faction has STOLEN THE LETTERS; the player spells
      words to fight musical enemies and win the alphabet back. Name the faction, the
      player role, the setting, in a consistent voice. Design the roster:
      - 3 bosses mapped to FAMOUS pieces (candidates to vet, pick 3 with distinct
        tempo/character: Queen of the Night aria (Mozart), Ride of the Valkyries
        (Wagner), In the Hall of the Mountain King (Grieg), Toccata & Fugue in D minor
        (Bach), Night on Bald Mountain (Mussorgsky), Danse Macabre (Saint-Saëns),
        Flight of the Bumblebee (Rimsky-Korsakov), Moonlight Sonata 3rd mvt
        (Beethoven), Winter/Summer presto (Vivaldi)). Each boss: name, personality
        (for the cutscene ticket), how their piece's dynamics shape their fight.
      - 6-10 regulars mapped to LESSER-KNOWN pieces (Satie Gnossiennes, Bach
        inventions, Grieg lyric pieces, Czerny etudes, a metronome-creature...), each
        with a one-line gimmick.
      - PD vetting noted per piece, per the standing rule.
      Also: settle the game's display name (working title "Wordbound: Crescendo";
      propose alternatives if something better fits — flag for Jaxon either way).
      VERIFY: n/a (design doc) — but keep it consistent with what the engine can do.

- [ ] MUSIC ENGINE: a WebAudio sequencer the whole game builds on. Requirements:
      - A note-data format for a piece: tracks (melody/bass at minimum), tempo,
        note events, and a DYNAMICS track with explicit crescendo markers
        (timestamp/beat, ramp duration, peak intensity). Store pieces as plain JS
        data modules.
      - Playback through the existing audio module's synth voices (reuse its
        palette + master gain/mute/volume plumbing — the AudioContext resume-on-
        gesture fix from the sibling MUST carry over intact).
      - Solid scheduling (lookahead pattern, no drift over minutes), a tempo-scale
        hook (an item will slow enemy music later — build the hook now), pause/stop.
      - An event API the combat layer subscribes to: 'crescendo-approaching' (lead
        time configurable), 'crescendo-peak', 'piece-ended'. This API is what makes
        boss attacks and the parry window possible — its TIMING ACCURACY is the
        acceptance bar.
      - Sequence at least ONE vetted famous piece end-to-end as the proof.
      VERIFY: unit tests with a mocked clock proving events fire at the right
      musical positions (±1 scheduler tick), tempo-scale correctness, mute/volume
      integration; real-browser Playwright check that a piece schedules real nodes
      without errors. Audible musicality: flag for Jaxon's ears, honestly.

- [ ] BOSS CRESCENDO COMBAT + PARRY: the signature mechanic. Boss fights become
      real-time-pressured: the boss's piece plays during the fight and the boss
      ATTACKS AT ITS CRESCENDOS (not on a turn counter). Requirements:
      - A visible telegraph: the player must SEE a crescendo coming (a swelling
        meter, a scrolling score ribbon — implementing run's design call) with
        enough lead time to react. Attack lands at the peak with existing damage/
        spill flow.
      - PARRY: submitting a valid word within a tight window around the peak
        (start ~±200ms, tune from there) reduces incoming spill by a meaningful
        percent (tune; make the parry feel earned — distinct SFX/visual).
      - The player can still play words freely between crescendos (word play stays
        the core verb; the clock pressure changes WHICH word you go for — that's
        Jaxon's stated intent, preserve it).
      - Regular (non-boss) fights stay turn-based; their pieces are ambience (that
        wiring belongs to the regulars ticket, not here).
      - Accessibility: a "Largo" assist setting (global tempo scale via the engine
        hook, clearly labeled, no shame) so real-time pressure doesn't lock players
        out entirely.
      - Balance: the sim can't play real-time — add a virtual-clock simulation mode
        for boss fights (deterministic crescendo schedule + a bot with configurable
        reaction time) and sanity-check boss fights are winnable/losable across
        reaction profiles. Document the chosen numbers.
      VERIFY: mocked-clock unit tests (attack fires at peak; parry window math;
      no attack while piece paused), Playwright real-browser run of one full boss
      fight with a scripted fast bot (zero console errors, fight completes both
      ways), `npm test` full suite. Real-feel: Jaxon.

- [ ] BOSS ENTRANCE CUTSCENES: each boss gets a short, SKIPPABLE entrance — their
      woodcut portrait plate, 2-3 taunt lines in their distinct voice (from the
      theme bible), their piece striking up underneath, a title card ("THE QUEEN OF
      NIGHT — she of the burning coloratura"), then the fight. Text/CSS/SVG only,
      reduced-motion gated, skippable with one tap/keypress, never blocks input for
      more than ~600ms before skip is available.
      VERIFY: `npm test` (cutscene elements render, skip works, fight state
      unaffected by skipping), `npm run test:mobile`, Playwright click-through.

- [ ] STOLEN LETTERS META-PROGRESSION: the permanent progression. The faction has
      stolen part of the alphabet; recover letters permanently across runs.
      - Starting stolen set: curated so early runs are playable but visibly
        incomplete (start by stealing e.g. J K Q V X Z + 2-3 mid-tier letters —
        tune; stealing E would be miserable, don't).
      - Recovery: beat a boss → recover a specific letter (their "hostage",
        themed in the bible); optional extra recoveries via achievements.
      - Stolen letters: never appear in racks/shops; visibly locked (chained tile?)
        in a menu "Alphabet" display showing recovered vs. stolen.
      - Persistence via localStorage (follow the achievements system's pattern,
        distinct key). Word validation itself is UNCHANGED (the dictionary doesn't
        shrink — your tile SUPPLY does).
      - Sim check: bot runs with the starting alphabet confirm the game is
        winnable pre-recovery.
      VERIFY: `npm test` (stolen letters absent from draws, recovery persists
      across a simulated reload, display correct), sim sanity, `npm run test:qa`.

- [ ] ITEMS, Jaxon's four + batch: implement Jaxon's four exactly, then round out
      to 8-12 with music-space designs. His four (names are placeholders, use the
      bible's voice):
      1. RITARDANDO: slows ALL enemy music (global tempo-scale via the engine
         hook) — crescendos arrive later, more time to build words.
      2. POETIC LICENSE: any 3-letter combination scores as a word (validity
         bypass for exactly-3-letter plays; keep base scoring low so it's a
         floor-raiser, not a degenerate optimum — sim-check this).
      3. FORTISSIMO: ALL scores doubled, but tiles render at double size and the
         rack holds HALF as many (rack capacity + layout change — test:mobile
         mandatory; interaction with Rewrite/rack cycling must be defined).
      4. THE INVERTED SCORE: flips all tiles upside-down; a word is playable ONLY
         if it reads as a real word upside-down. Define the flip mapping
         conservatively (u↔n, m↔w, b↔q, d↔p, o/s/x/z/i self-flip; letters without
         a clean flipped form make a word unplayable) and remember upside-down
         reading REVERSES letter order. Precompute or check via the mapping +
         dictionary. This is a build-warping rare — cost/rarity accordingly.
      Plus 4-8 more leaning into crescendo/parry/tempo/letter-recovery space.
      Each item: real hook-level `npm test` assertions, seeded-shop appearance
      check, sim band sanity. VERIFY as the sibling's item batches did.

- [ ] REGULAR ENEMIES: build the 6-10 regulars from the bible — turn-based fights
      (no crescendo pressure), but each with their lesser-known piece sequenced and
      playing as their battle ambience (quiet mix, under the SFX), plus their
      one-line gimmick implemented. Woodcut portraits in the shared style.
      VERIFY: `npm test` per-enemy, `npm run test:mobile`, Playwright fight
      smoke per enemy tier, PD vetting noted per piece.
