# Wordbound: Crescendo — World Bible

READ_SLOWLY_PLAN.md stage B replaces the old Concert Eternal / Fermata
premise below with this one. This is the single source of truth for names
and flavour text — read it before touching any naming, and don't invent
lore that contradicts it.

## Premise

We are **wordsmiths** in a world that has stopped reading. Everyone is
rushing, scrolling, shouting, or bored. Each fight is a person (or a
crowd) caught in that rush; we spell words at them until they slow down,
look up, and pick up a book. The antagonists are not villains so much as
_tempos_: the Doomscroll, the Deadline, the Loudspeaker, the
Nothing-To-Do. The bosses are the only ones with actual music, because a
boss is the moment the rush becomes a full orchestra. Beating a boss is a
chapter read to the end.

There is no theft, no coup, no cabal. Nobody stole the alphabet — some of
its letters are just **lost**, forgotten from disuse, the way a language
loses a word nobody says anymore. Winning a fight brings a letter back
into use. There is no villain to defeat, only rooms to bring back to
quiet.

## The fight

A fight is a person caught in a tempo, resolved the same way as before —
spell words to reach a target ("attention needed") within a handful of
plays and swaps — but framed as reading to someone, not duelling them.
Nine antagonists across three chapters (READ_SLOWLY_PLAN.md B2 has the
authoritative list and per-enemy flavour text; `src/engine/content/
enemies.ts` is the code source of truth and must match it). Three chapters:

1. **The Commute** — a commuter lost to a phone, then a desk, then a
   knock at the door.
2. **The Square** — a crowd with nothing to do, a rally that thinks for
   them, a parade that never stops.
3. **The Tower** — a waiting room, a hall repeating a podium, and the
   long noisy night before a sunrise.

Bosses are the only enemies with an actual recording — the moment the
rush becomes a full orchestra. Small and Pressure enemies are silent;
only a Finale plays music. Beating a boss is a chapter read to the end,
and the sun comes up on someone reading.

## Vocabulary (on-screen; code ids are unchanged — see CLAUDE.md's Map)

| Old (code / old screen)   | On screen now                                        |
| ------------------------- | ---------------------------------------------------- |
| Movement I/II/III         | Chapter 1/2/3                                        |
| Enemy kind small/big/boss | Distraction / Pressure / Finale                      |
| Target score              | Attention needed                                     |
| Quills                    | Bookmarks                                            |
| Inks (tarots)             | Marginalia                                           |
| Études                    | Rereads                                              |
| Tempo marking (boss rule) | Reading condition                                    |
| Keys (stakes)             | Editions (First Edition … Sixth)                     |
| Stolen letters            | Lost letters ("the alphabet is being forgotten")     |
| Skip for a bonus          | Walk past (for a favour)                             |
| Gold                      | Ink (the currency — distinct from Marginalia, above) |

## Tone

Quiet, generous, a little wry. Nobody in this world is a villain, just
tired or distracted — the wordsmith's job is patience, not conquest. Avoid
combat language ("defeat", "strike", "enemy") in favour of reading
language ("reach them", "the room goes quiet", "they look up"). Keep the
per-enemy flavour text short (one or two sentences) and concrete: what the
person is doing, not what they represent.
