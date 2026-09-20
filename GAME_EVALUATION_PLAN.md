# Game evaluation and improvement plan

Reviewed: 2026-09-18. Status: implementation in progress.

The opening now explains the objective, character, scoring, swaps, and shop choices in context. The optional practice seed has a fixed three-bookmark first shop; rack shuffle, gradual familiar-word hints, boss-rule previews, same-seed replay, explicit character-unlock progress, and a 30-seed solver audit are available. A versioned active-run save captures the run, random state, current phase, and shop choices. Browser checks covered reloads in the opening fight, after a first-shop purchase, with an opened marginalia pack, after claiming its card, before a boss letter choice, and after claiming a letter; the pack price and boss reward were paid only once. A musical phrase prototype shows upcoming swells without a timing bookmark and grants +2 points before multipliers during the countdown or swell. The old item-only mode is available by setting musical phrase points to 0 in tuning; a browser pass verified its cue stays hidden and GAIT scores its original 90 during the countdown. A fixed-seed mechanical comparison found a mean 3.1% score increase on 60 opening words with or without timing items; Climax increased the absolute bonus on live swells, but not the relative increase. Recording cue coverage is 26–43%, with some waits longer than 30 seconds. Human waiting and enjoyment remain unmeasured. Shop bookmarks and length upgrades replay the latest word through the scoring function to show example impact, with recorded conditions and the upcoming boss limitation identified. A browser pass verified HOUSE examples survived reload and recalculated after a purchase. The end screen estimates the strongest purchased scoring upgrade by replaying each word with it removed, then explains the final encounter limit and suggests a next approach. A browser loss after buying Brass Nib attributed 40 points across four words. Local run records track outcomes, words, swaps, premium-slot score effects, purchases, assistance, the music mode, and each word's decision time, cue phase, and phrase reward; a headless browser pass recorded AGE after 1.0 seconds on a forced live cue with the expected +2 phrase points. An earlier browser run verified a guided, hinted two-encounter loss with one swap and a downloadable record. The 30-seed audit is a feasibility ceiling, not human balance evidence. An opt-in, default-off tile-retention prototype now allows one unused chosen tile to survive a full-rack redraw once per fight; the local record counts its uses. A browser pass kept P through GAIT, showed the remaining use as spent, and restored that state after reload and resume. Its balance and player value remain unmeasured. Daily seed and the proposed human observation remain open. The checklist below remains the full acceptance scope; partially completed items are left unchecked.

## Verdict

**Fun: a promising core, with friction obscuring it.** Finding a useful word, watching bonuses multiply, and buying upgrades is a strong repeatable loop. The reusable character letter and boss-specific word rules give it more potential than a basic anagram game. The most satisfying direction is a relaxed word-building roguelike with musical opportunities. The current opening does not yet communicate that identity or demonstrate enough of its strategic depth.

**Intuitive: the basic gesture is; the surrounding decisions are not consistently clear.** Tapping letters, undoing a selection, and submitting a word are discoverable. Understanding character choice, scoring, rack replacement, upgrades, and the relationship between music and play takes investigation. Fix those before substantially expanding the game.

This is a design assessment informed by browser interaction and source review, not a claim that human players have validated the fun. No numerical fun score is warranted from this sample.

## Evidence and scope

Reviewed the current local source and ran it in isolated headless Chromium at 1280×900 and 375×812. Inspected title, encounter intro, word composition, score resolution, victory, and first shop. No gameplay constants were changed. Two opening passes used E and seed `review-20260918`:

- A dictionary-assisted pass played PAIGEITE for 1,092 against a 310 target. This demonstrates an extreme available play, not normal player skill or typical difficulty.
- A second pass restricted candidate words to a small familiar-word list: GAIT scored 90 and HOUSE scored 272, clearing the target in two plays. This was still assisted, not a blind human playtest.
- Both passes reached the shop without captured JavaScript page errors. The opening had a double-word slot; its success cannot establish balance across seeds.
- The repeatable opening audit found at least one word from the familiar-hint list in 57 of 60 character/rack combinations: 30/30 with E and 27/30 with Z. The three Z openings without one remain valid solver racks and should be watched in human sessions rather than silently discarded.
- Source inspection covered scoring, character abilities, encounter rules, shops, musical timing, and persistence. Later bosses, full-run balance, purchase-to-boss outcomes, real-device touch behavior, and audible musical quality were not playtested.
- README and older plans describe superseded systems. Recommendations below follow the implementation at review time. In particular, characters return after each word; musical timing then affected specific held items. There is no basis here for describing play as an always-on real-time duel.

### Musical prototype comparison (implementation audit)

`npm run audit:music` scores the same solver-selected opening word for 30 fixed seeds and both starting characters in item-only mode and with the +2 phrase reward. This isolates the mechanical score change; it does not simulate a person's decision to wait.

| Build and cue                      | Mean extra points | Mean relative increase | Largest relative increase |
| ---------------------------------- | ----------------: | ---------------------: | ------------------------: |
| No timing item, countdown or swell |              13.4 |                   3.1% |                      6.5% |
| Anticipation, countdown            |              17.4 |                   3.1% |                      6.5% |
| Climax, live swell                 |              40.3 |                   3.1% |                      6.5% |

The nine recordings offer a cue for 26–43% of their duration. The first cue may start immediately or after 33 seconds; the longest gap without a cue is 16–36 seconds depending on the recording. The small score increase does not establish that waiting is enjoyable or rare. Observe submission timing in the human sessions, compare item-only and phrase-reward runs, and try a banked opportunity if repeated idle waiting appears.

### Build opportunity audit (implementation ceiling)

`npm run audit:builds` examines the same 30 fixed opening seeds with both starting characters. It adds one representative bookmark to the opening rack, then scores the best qualifying word a solver can find. This is an opportunity check, not a purchase simulation or a claim that a player can discover these words.

| Strategy and representative bookmark    | Racks with a scoring opportunity | Mean item gain when available | One-word target hits |
| --------------------------------------- | -------------------------------: | ----------------------------: | -------------------: |
| Short words · Short Form                |                            60/60 |                           134 |                11/60 |
| Long words · Long Form                  |                            56/60 |                           205 |                56/60 |
| Rare letters · Hard Consonant           |                            30/60 |                            84 |                20/60 |
| Held tiles · Harmony                    |                            60/60 |                            28 |                18/60 |
| Musical timing · Climax on a live swell |                            60/60 |                           971 |                60/60 |

All 30 rare-letter opportunities came from Zed's reusable Z; none appeared with Ee on these opening racks. The large Climax figure assumes the player submits on a live swell, and the one-word hits reflect solver vocabulary. These results flag short-word and held-tile payoff, rare-letter dependence on character, and live-swell strength for observation. They do not justify changing targets or item values yet.

## What to preserve

- The live score preview and “meets the target” feedback reduce trial and error.
- A character letter available every word creates a recognizable build identity.
- Short encounters, shops, and a nine-encounter progression give each word stakes.
- Bookmarks, tile modifications, length upgrades, premium slots, and boss rules already provide substantial content. Expand their interactions before adding another progression currency.
- The scoring cascade can celebrate a large play and already supports tap-to-skip.

## Findings

| Priority | Finding                                                                                                                                                                                               | Why it affects enjoyment                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| P0       | First-run hints arrive together and disappear. The 375px screenshot clipped the character hint at the left edge.                                                                                      | Essential instructions are easy to miss precisely when they are needed.                                                 |
| P0       | Shop item names appeared very dark on dark cards; effects required inspection rather than appearing on the face.                                                                                      | The central reward decision is difficult to read and compare.                                                           |
| P0       | Title and shop hints say “gold” and “quills”; the actual UI says “ink” and “bookmarks.”                                                                                                               | Players have to guess whether these are different resources.                                                            |
| P0       | GAIT's history displayed “15 pts × 3” beside a 90 total, omitting the double-word slot.                                                                                                               | Correct underlying arithmetic still looks untrustworthy when the explanation is incomplete.                             |
| P1       | Character selection shows letters; details rely on native title tooltips. Locked letters do not show their unlock requirements. Z is the initial default; E's description includes development notes. | Players choose before understanding the consequences, particularly on touchscreens.                                     |
| P1       | Every played word replaces the entire ordinary rack, including unused tiles.                                                                                                                          | A player expecting to save a letter for the next word will be surprised. Keep this rule if intentional, but explain it. |
| P1       | The early encounter is mainly a target, rack, and background music. Crescendo polling is gated by owning a timing item.                                                                               | The game's musical identity may remain mechanically invisible until the right upgrade appears.                          |
| P1       | Ordinary five- and six-letter words gain steep length bonuses; seven-plus gets another jump. Short-word builds exist, but their appeal needs to be demonstrated.                                      | “Find the longest word” risks dominating early decisions. This is a balance hypothesis, not an established defect.      |
| P1       | Mobile combat leaves a large empty middle area while tile values and status text are small; character buttons are 34px square.                                                                        | The screen uses little of its space to teach or support the active decision.                                            |
| P2       | Persistence stores records/unlocks, but no in-progress run snapshot is present.                                                                                                                       | A reload can interrupt an otherwise good session.                                                                       |

## Implementation sequence

### 1. Make the existing game understandable — small effort, highest priority

- [x] Standardize visible terminology: ink, bookmarks, tile upgrades, length upgrades. Pair musical terms such as étude with a plain-language description.
- [x] Fix shop foreground/background colors and put the effect, price, and ownership duration on each card. Tapping should expand details without buying.
- [x] Derive preview, cascade, and history explanations from the same complete breakdown. Include premium slots, character bonuses, and all multipliers. Keep the compact view readable and the expanded view exact.
- [x] Replace competing introductory toasts with one persistent contextual instruction at a time. Ensure it fits phone widths and can be dismissed or replayed.
- [x] Explain the objective before play: reach the target within four words; swaps replace selected letters; submitting redraws the ordinary rack; your character letter returns each word. Reflect encounter-specific word counts.
- [x] Show the selected character's actual bonus and locked characters' unlock requirements inline. Recommend E for a first run while retaining Z as an explicit choice.
- [x] Group score, remaining target, words left, and swaps where players can scan them together. Improve touch targets, text size, focus visibility, and reduced-motion behavior. Check 320–430px widths and short landscape screens.

Acceptance: a new player can explain the goal, choose a character, compose and undo a word, use a swap, and explain an offered upgrade without outside help. Every displayed scoring equation reconciles with its total. No instruction or essential control clips on the checked sizes. `npm run audit:contrast` checks normal-text token pairs against WCAG AA instead of relying on a visual guess.

Primary locations: `src/ui/meta/TitleScreen.tsx`, `CharacterSelect.tsx`, `src/ui/chrome/Callout.tsx`, `src/ui/fight/PlayBoard.tsx`, `Stick.tsx`, `InputRow.tsx`, `src/ui/shop/CardSlot.tsx`, `Shop.tsx`, `src/ui/quills/cardCopy.ts`, and shared style tokens.

### 2. Deliver a good first five minutes — medium effort

- [x] Add an optional, replayable guided first encounter with a deterministic rack containing familiar words. Teach one normal play, the character letter, and a swap through actions rather than a rulebook.
- [x] Guide the first shop with three comprehensible alternatives: reliable scoring, a conditional build, and a musical-timing item. Let the player make the choice and see its payoff in the next fight.
- [x] Add a free rack shuffle that only changes letter order. Distinguish it clearly from a limited swap.
- [x] Add a gradual hint option: suggest a word length or starting letter before revealing a whole word. Retain the existing full solver as a clearly labeled assistance setting.
- [x] Explain rejected words next to the composition area. Distinguish dictionary rejection, missing letters, and encounter restrictions; rejection must not consume a play.
- [x] Add a browsable length-bonus guide and an explanation of the current premium slot.

Acceptance: in an initial five-person observation session, aim for at least four to finish the guided opening and choose an upgrade without coaching. Record hesitation and misinterpretations; this is a usability gate, not a statistically reliable retention estimate.

### 3. Make music matter without forcing players to hurry — medium effort, prototype first

Recommended direction: preserve unlimited thinking time. Offer musical timing as an opportunity for a modest bonus, introduced early, while keeping existing timing items as stronger specializations.

- [x] Prototype a visible upcoming phrase/crescendo cue with an explicit reward and accessible non-audio equivalent. Teach it in the guided encounter.
- [x] Compare the current item-only design against the prototype before committing to a global timing rule. Do not stack a new base reward with existing ×3 effects without checking balance.
- [ ] Avoid long waits for an optimal submission: evaluate cue spacing, generous timing windows, and whether banking one opportunity per word works better than waiting for the recording.
- [x] Give each encounter a legible musical presence with restrained reactive visuals and a clear victory beat. Build around the current composition-based opponents; do not automatically restore the older narrative/sprite plan.
- [x] Explain boss modifiers before entering and allow the next boss rule to be inspected from the run path, so shop choices can prepare for it.

Acceptance: players can explain how music affects a decision, can use the cues muted, and do not routinely sit idle waiting for a bonus. Compare timed and untimed play for enjoyment; abandon or revise the prototype if it mostly adds waiting.

### 4. Strengthen build decisions and fairness — medium to large effort

- [ ] Evaluate at least 30 fixed seeds using both characters, including human sessions across vocabulary skill levels. Use solver results only as feasibility ceilings.
- [x] Track first-fight success, first-boss reach, loss location, words/swaps used, premium-slot influence, purchase choices, and run length. Separate assisted play.
- [ ] Check that short-word, long-word, rare-letter, held-tile, and musical builds each offer a viable path. Add targeted support where measurements show a gap; avoid blanket target increases based on solver wins.
- [x] Preview upgrade impact using a player's recent word where relevant, explicitly identifying conditions and whether the example applies to the upcoming boss.
- [x] Audit starting racks for accessible words. Explain the dictionary policy; prioritize familiar words in hints while preserving the satisfaction of valid unusual discoveries.
- [x] Prototype one limited way to retain a tile or improve the bag if players find full-rack redraws too arbitrary. Treat this as a substantial balance change, not an automatic fix.

Acceptance: losses are usually explainable through decisions or known rules, rather than unreadable effects or unexpectedly impossible racks. Set difficulty targets after observing the intended audience. Do not infer overall balance from the one favorable opening reviewed here.

### 5. Make returning worthwhile — medium effort, after the loop works

- [x] Save and resume the active run, including RNG state, inventory, pending shop/pack choices, and progression. Handle reloads during scoring without duplicate rewards.
- [x] Add an end-of-run explanation: most useful upgrade, strongest word, decisive restriction, and one relevant suggestion. The existing summary already has best word, items, progress, and sharing; extend it.
- [x] Offer replay of the same seed alongside a fresh run, and show unlock progress before and after a run.
- [ ] Add a daily shared seed once fairness is established. Keep scoring modifiers and assistance visible in shared results; start without accounts or a public leaderboard.

Acceptance: reloading at each decision point resumes consistently, rewards cannot duplicate, and a returning player can identify a concrete new strategy or unlock to pursue.

## Validation and scope control

Ship phases 1 and 2 before expanding the content pool. Then use the musical prototype and observed play to choose between phases 3 and 4. Phase 5 follows once sessions are worth preserving.

For implementation, use the repository's existing typecheck, lint, formatting, and build checks plus targeted isolated browser verification and real-phone observation. The repository currently has no test suite and explicitly asks not to reintroduce one; this plan does not require creating one. Documentation-only delivery does not need a game deployment.

Initial human study: five people with mixed word-game experience, first five minutes without coaching, then continue voluntarily. Ask what they are trying to do, why their last score happened, what their purchase will change, and whether they want another run. Observe whether they actually start again. Use failures to revise the plan; expand the sample before making retention or difficulty claims.

Defer multiplayer, accounts, leaderboards, additional currencies, a large story campaign, and a major art expansion. The next meaningful milestone is a clear opening, a readable shop, and an upgrade that makes the next encounter feel different.
