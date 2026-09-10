// The fight's entire state machine -- title, live play, shop, pack, letter
// choice, end -- as one hook. Extracted verbatim from FightScreen.tsx's
// RoundSandbox() function body (READ_SLOWLY_PLAN.md A4 "FightScreen becomes
// a fight screen"): App.tsx is the phase router (already routed on `phase`
// before this move), and each screen under ui/meta/ui/shop/ui/fight already
// takes its slice of this as props, same as before -- what moved is WHERE
// the ~25 useState/useReducer hooks and their callbacks live, out of a
// component that also returned JSX and into a hook that returns props.
// This file is long (it owns one fight's worth of tightly-coupled state --
// fight.current, the scoring cascade, drag reorder, shop/pack/ink actions --
// most of which references several of the others in the same closure) and
// splitting it further into independent pieces would mean either passing
// a dozen refs/setters between hooks or a real state-management rewrite;
// with no test suite and a live app, that is a separate, larger change than
// this item's move-not-redesign scope.

import {
  KEYS as STORAGE_KEYS,
  readRaw,
  writeRaw,
  readWonLetters,
  readDiscoveredQuills,
  writeDiscoveredQuills,
  readUnlockedCharacters,
} from '../../app/persistence';
import { createRunFacadeFromOpts, fromSeed } from '../../engine/state/facade';
import type { RunFacade, RoundFacade } from '../../engine/state/facade';
import { MOVEMENTS, KIND_LABEL, enemyAt } from '../../engine/content/enemies';
import {
  CHARACTERS,
  CHARACTER_DEFS,
  unlockedCharacters,
  unlockNext,
} from '../../engine/content/characters';
import { DEFAULT_KNOWN_QUILLS } from '../../engine/meta/quillDiscovery';
import { RECORDINGS } from '../../engine/content/recordings';
import {
  ROUND_DEFAULTS,
  KEYS,
  KEY_DEFS,
  FAVOUR_DEFS,
  TIER_DEFS,
  PACK_KINDS,
  priceOf,
} from '../../engine/content/round';
import { ITEMS, ITEM_DEFS } from '../../engine/content/items';
import { MARK_DEFS, VOWELS } from '../../engine/content/marginalia';
import { TILE_BAGS, createBagDeck } from '../../engine/content/tileBags';
import { availableLetters, isAvailable } from '../../engine/meta/stolenLetters';
import {
  bestFromRack,
  findWords,
  isWordMakerReady,
  warmWordMaker,
} from '../../engine/content/wordFinder';
import { CRESCENDO } from '../../audio/recordingPlayer';
import { prefetchChapterArt } from '../../art/prefetchArt';
import * as copy from '../copy';
import { useCrescendo } from '../hooks/useCrescendo';
import { useDragReorder } from '../hooks/useDragReorder';
import { useSfx } from '../hooks/useSfx';
import { useAudio } from '../hooks/useAudio';
import {
  gearReducer,
  seenReducer,
  readSeen,
  keyUnlockedReducer,
  readKeyUnlocked,
  bestReducer,
  readBest,
  refreshReducer,
  runFightAction,
  recordRun,
  runLength,
} from '../../app/store';
import type { Fight, FightEffect, BestState } from '../../app/store';
import type { Tile } from '../../engine/tiles';
import type { Breakdown, Step } from '../../engine/content/round';
import type { WordScore } from '../../engine/content/wordFinder';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';

declare global {
  interface Window {
    __round?: unknown;
    __run?: unknown;
    // Debug-only mirror of the running recording, same purpose as
    // __round/__run above -- lets a headless verification script fake a
    // crescendo window without waiting on a real surge in the audio.
    __seq?: unknown;
  }
}

// Plain FLIP: record where the tile was,
// let React move it, slide it in from the old spot. Nothing else may set
// `transform` on .sb-tile.
function flipTileTo(fromRect: DOMRect | null, toEl: HTMLElement | null) {
  if (!fromRect || !toEl || typeof toEl.getBoundingClientRect !== 'function')
    return;
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return;
  if (typeof window.requestAnimationFrame !== 'function') return;
  const toRect = toEl.getBoundingClientRect();
  const dx = fromRect.left - toRect.left;
  const dy = fromRect.top - toRect.top;
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
  toEl.style.transition = 'none';
  toEl.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      toEl.style.transition = 'transform 190ms cubic-bezier(0.2, 0.9, 0.3, 1)';
      toEl.style.transform = '';
    });
  });
}

// THE SCORING CASCADE's timings (DEMO_PLAN_2 Phase 4), all in one place.
// Every duration is multiplied by SMALL_SPEED..1 as `intensity` goes 0..1,
// so a three-letter word is a tap and a seven-letter word with items is a
// two-to-three second cascade.
const CASCADE = {
  LOCK_MS: 110, // stick tiles snap up, brief freeze
  TIER_MS: 160, // the tier's base pts x mult land
  LETTER_MS: 95, // per tile, left to right
  ITEM_MS: 260, // per item that fired
  RULE_MS: 320, // the tempo marking
  HOLD_MS: 200, // a steel tile held, a tile's own x-mult
  TOTAL_MS: 620, // pts x mult collapse into the total, meter fills, board shakes
  CLEAR_MS: 320, // tiles fly to the plays list, rack refills
  SMALL_SPEED: 0.5, // duration factor at intensity 0
  SHAKE_TIERS: 3, // .sb-board.is-hit-1..3
};
// One knob for how big a play FEELS, in [0, 1]: shake, hit volume, chord
// size, total scale and step timing all read it. A play worth the whole
// target is 1; a fifth of it is about 0.3.
function intensity(total: number, target: number) {
  return Math.max(0, Math.min(1, Math.pow(total / Math.max(1, target), 0.7)));
}

// HeldRow/Shop and their shared card-copy helpers moved to src/ui/
// (READ_SLOWLY_PLAN.md A4, mechanical extraction). cardName is still used
// below for the shop-buy narration strings.

// Keys (stage 3): the title screen offers the next key once the current
// highest-unlocked one has been won at least once. wbc.keyUnlocked is the
// index of the highest key on offer (now ../app/store.ts's keyUnlockedReducer,
// READ_SLOWLY_PLAN.md A3); wbc.key is the player's current pick, still local.
function readKeyChoice(unlocked: number, SB: SandboxTables) {
  const saved = readRaw(STORAGE_KEYS.key);
  if (saved && SB.KEY_DEFS[saved] && SB.KEY_DEFS[saved].index <= unlocked)
    return saved;
  return SB.KEYS[0]!.id;
}
function writeKeyChoice(id: string) {
  writeRaw(STORAGE_KEYS.key, id);
}
function randomSeed() {
  const words = [
    'sonata',
    'cadenza',
    'fugue',
    'rondo',
    'largo',
    'vivace',
    'minuet',
    'coda',
    'aria',
    'canon',
  ];
  return (
    words[Math.floor(Math.random() * words.length)] +
    '-' +
    Math.floor(Math.random() * 9000 + 1000)
  );
}

// One-time CALLOUTS (Phase 2): short hints that appear in context and go
// away on the action they describe. wbc.seen holds the ids already shown --
// see src/app/store.ts's seenReducer/readSeen (READ_SLOWLY_PLAN.md A3).
const LIVE_URL = 'https://gidntsquia.github.io/wordbound-crescendo/';
// The Balatro-style text summary friends can paste back.
function shareText(run: RunFacade, won: boolean, seed: string) {
  const total = runLength(run);
  const lines = ['Wordbound: Crescendo'];
  lines.push(
    won
      ? 'Won — all ' + total + ' enemies felled'
      : 'Felled ' +
          run.felled.length +
          ' of ' +
          total +
          ' — lost to ' +
          (run.enemy?.name ?? 'unknown'),
  );
  if (run.bestPlay)
    lines.push(
      'Best word: ' +
        run.bestPlay.word +
        ' for ' +
        run.bestPlay.breakdown.total,
    );
  lines.push(
    run.wordsPlayed +
      ' words · ' +
      run.ink +
      ' ink' +
      (run.items.length
        ? ' · ' + run.items.map((id) => ITEM_DEFS[id]!.name).join(', ')
        : ''),
  );
  lines.push('Seed ' + seed + ' · ' + LIVE_URL);
  return lines.join('\n');
}

// EndScreen moved to src/ui/meta/EndScreen.tsx (READ_SLOWLY_PLAN.md A4).

// The score flies from the stick to the readout: its own element, never the
// tile (the FLIP owns .sb-tile's transform).
function flyScore(total: number) {
  if (typeof document === 'undefined') return;
  const from = document.querySelector('.sb-stick');
  const to = document.querySelector('.sb-dyn-mark');
  if (!from || !to) return;
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const el = document.createElement('div');
  // Tailwind port of .sb-score-fly (sandbox.css A6 slice 6) -- a plain DOM
  // node outside React, so the utility classes are just a literal string;
  // Tailwind's content scan still picks them up from this file.
  el.className =
    'fixed z-[55] pointer-events-none [transform:translate(-50%,-50%)_scale(1.15)] font-[var(--figure)] text-[30px] font-bold text-[var(--brass-hot)] opacity-100 [text-shadow:0_2px_8px_rgba(0,0,0,0.7)] [transition:transform_640ms_cubic-bezier(0.2,0.8,0.2,1),opacity_640ms_ease-in]';
  el.textContent = '+' + total;
  el.style.left = a.left + a.width / 2 + 'px';
  el.style.top = a.top + a.height / 2 + 'px';
  document.body.appendChild(el);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      el.style.transform =
        'translate(calc(-50% + ' +
        dx +
        'px), calc(-50% + ' +
        dy +
        'px)) scale(0.6)';
      el.style.opacity = '0';
    }),
  );
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 800);
}

// The shop/card/gear child components (Shop.jsx, HeldRow.jsx, GearMeta.jsx,
// TuningPanel.jsx, TitleScreen.jsx) still take an `SB`-shaped bag of tables/
// helpers as a prop, same as when it came off window.Wordbound.Sandbox
// (READ_SLOWLY_PLAN.md A2's Sandbox-namespace globals are gone as of this
// pass) -- built once here from real ES imports instead, so its identity
// stays stable across renders like the old global did. Splitting these
// components off SB entirely is READ_SLOWLY_PLAN.md A4's job.
const SB = {
  ROUND_DEFAULTS,
  KEYS,
  KEY_DEFS,
  FAVOUR_DEFS,
  TIER_DEFS,
  PACK_KINDS,
  priceOf,
  ITEMS,
  ITEM_DEFS,
  MARK_DEFS,
  VOWELS,
  TILE_BAGS,
  createBagDeck,
  availableLetters,
  isAvailable,
  bestFromRack,
  findWords,
  isWordMakerReady,
  warmWordMaker,
  CRESCENDO,
  CHARACTERS,
  unlockedCharacters: () => unlockedCharacters(readUnlockedCharacters()),
  unlockNext,
  enemyAt,
};
type SandboxTables = typeof SB;

export interface Selecting {
  from: string;
  index: number;
  price?: number;
  name: string;
  ink: { targets: number } & Record<string, unknown>;
  hand?: unknown;
  ids: string[];
  vowel: string | null;
}
export interface Inking {
  index?: number;
  adhocId?: string;
  ink: { targets: number } & Record<string, unknown>;
  ids: string[];
  vowel: string | null;
}

export interface FloatItem {
  key: number;
  on: string | number | undefined;
  text: string | undefined;
  tone: string | undefined;
}
export interface ScoringState {
  word: string;
  tiles: readonly Tile[];
  steps: Step[];
  breakdown: Breakdown;
  rackBefore: readonly Tile[];
  scoreBase: number;
  pts: number;
  mult: number;
  tier: Step | null;
  litTile: string | null;
  litItem: string | null;
  litSlot: string | null;
  floats: FloatItem[];
  total: number | null;
  hit: number;
  k: number;
  crossed: boolean;
  cleared: boolean;
}

export { SB };
export type { SandboxTables };

export function useFight() {
  const W = window.Wordbound;
  const fight = useRef<Fight | null>(null);
  // The round the player has actually entered -- fight the enemy, or skip
  // it, from the pre-fight card. A fresh round object (a new stage, from
  // start() or after a skip/win) never matches this, so the card reappears
  // automatically with no extra bookkeeping at the call sites.
  const readyRound = useRef<unknown>(null);
  // A3: replaces the old useState(0) counter + forceRender((n) => n + 1)
  // with a reducer per the plan's "delete forceRender" instruction; still a
  // plain re-render nudge, not a model of fight.current's actual state (see
  // src/app/store.ts's header).
  const [, dispatchRefresh] = useReducer(refreshReducer, 0);
  // A3 (remainder): run/round mutation call sites routed through a data-only
  // action dispatched into store.ts's runFightAction, which mutates the
  // facade in place (same as before) and returns a FightEffect[] describing
  // the side effects to run -- applyFightEffect below runs them in order
  // against this component's own closures, then bumps the refresh counter.
  // Deliberately a plain function, not useReducer: this keeps effect
  // application perfectly synchronous, preserving the exact say/sfx/cascade
  // ordering the feel-sensitive scoring system depends on.
  function applyFightEffect(effect: FightEffect) {
    switch (effect.kind) {
      case 'say':
        say(effect.message);
        return;
      case 'sfx':
        sfx(effect.name);
        return;
      case 'markSeen':
        markSeen(effect.id);
        return;
      case 'setWord':
        setWord(effect.value);
        return;
      case 'setSuggestions':
        setSuggestions(effect.value as WordScore[]);
        return;
      case 'setPhase':
        setPhase(effect.phase);
        return;
      case 'setSelecting':
        setSelecting(effect.value as Selecting | null);
        return;
      case 'setInking':
        setInking(effect.value as Inking | null);
        return;
      case 'startStage':
        startStage(effect.run);
        return;
      case 'warm':
        warm(effect.movement, effect.stage);
        return;
      case 'refreshDiscovered':
        refreshDiscovered();
        return;
      case 'recordRun':
        setBest(recordRun(effect.run, effect.won));
        return;
      case 'unlockNextKey':
        unlockNextKey(effect.run);
        return;
      case 'runCascade':
        runCascade(
          effect.round,
          effect.res,
          effect.rackBefore,
          effect.scoreBefore,
        );
        return;
      default:
        return;
    }
  }
  function dispatchFight(action: Parameters<typeof runFightAction>[0]) {
    const effects = runFightAction(action);
    effects.forEach(applyFightEffect);
    refresh();
  }
  // Mirror of the volume state for the zero-dep resume effect below, which
  // needs the LATEST value without re-subscribing on every change.
  const volumeRef = useRef(0.4);
  // idle | live | won (round, run continues) | shop (between fights) | lost | run-won
  const [phase, setPhase] = useState('idle');
  // READ_SLOWLY_PLAN.md E3: the wordsmith sprite's transient pose --
  // `write` for the brief moment a word is being scored, `flourish` on a
  // round win (persists through the won-banner beat), `idle` otherwise.
  // Driven entirely off runCascade/startStage below, no new fight state.
  const [wordsmithPose, setWordsmithPose] = useState<
    'idle' | 'write' | 'flourish'
  >('idle');
  const [, setLog] = useState<string[]>([]);
  const [word, setWord] = useState('');
  const [seed, setSeed] = useState('sandbox');
  // The word-maker helper (suggestions, Best play, fuzzy Play) -- off by default.
  const [helper, setHelper] = useState(false);
  const [bagId, setBagId] = useState('normal');
  const [volume, setVolume] = useState(0.4);
  volumeRef.current = volume;
  // Input sounds (sfx.js), on by default, remembered in wbc.sfx.
  const { sfxOn, setSfxOn, sfxOnRef, sfx } = useSfx(fight);
  const [tune, setTune] = useState(() => ({ ...SB.ROUND_DEFAULTS }));
  const [discovered, setDiscovered] = useState(
    () => new Set(readDiscoveredQuills(DEFAULT_KNOWN_QUILLS)),
  );
  const refreshDiscovered = useCallback(() => {
    setDiscovered(
      new Set(
        fight.current?.run?.discoveredQuills ??
          readDiscoveredQuills(DEFAULT_KNOWN_QUILLS),
      ),
    );
  }, []);
  const [keyUnlockedState, dispatchKeyUnlocked] = useReducer(
    keyUnlockedReducer,
    { index: 0 },
    () => ({ index: readKeyUnlocked() }),
  );
  const keyUnlocked = keyUnlockedState.index;
  const [key, setKey] = useState(() => readKeyChoice(readKeyUnlocked(), SB));
  // READ_SLOWLY_PLAN.md stage D: the chosen playable letter character. Its
  // passive is threaded into createRun's `items` list, and its permanent
  // tile (D1) is threaded into createRunFacadeFromOpts's `characterId`.
  const [characterId, setCharacterId] = useState(
    () => unlockedCharacters(readUnlockedCharacters())[0] || 'zed',
  );
  // A win on the highest-unlocked key offers the next one (stage 3).
  const unlockNextKey = useCallback(
    (wonRun: RunFacade) => {
      const wonIndex = wonRun.key ? (SB.KEY_DEFS[wonRun.key]?.index ?? 0) : 0;
      dispatchKeyUnlocked({
        type: 'keyUnlocked/wonAtIndex',
        wonIndex,
        keyCount: SB.KEYS.length,
      });
    },
    [SB],
  );
  // Sample items, read at Start (a mid-round swap would half-apply).
  const [itemIds, setItemIds] = useState<Set<string>>(() => new Set());
  const [suggestions, setSuggestions] = useState<WordScore[]>([]);
  const [bestState, dispatchBest] = useReducer(bestReducer, {}, readBest);
  const best = bestState;
  const setBest = useCallback(
    (value: BestState) => dispatchBest({ type: 'best/set', value }),
    [],
  );
  // Narrow screens keep the setup bar, starting items and tuning behind a gear.
  const [gearState, dispatchGear] = useReducer(gearReducer, { open: false });
  const gearOpen = gearState.open;
  // Which quill/consumable's tap-tooltip is open (mobile has no hover, so
  // `title` never shows -- tapping the icon toggles this instead).
  const [tip, setTip] = useState<string | null>(null);
  useEffect(() => {
    if (!tip) return undefined;
    const close = (e: Event) => {
      if (!(e.target as HTMLElement).closest('.sb-card, [data-slot="card"]'))
        setTip(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [tip]);
  // Which one-time callouts have been shown (see readSeen).
  const [seenState, dispatchSeen] = useReducer(seenReducer, undefined, () => ({
    ids: readSeen(),
  }));
  const seen = seenState.ids;
  const markSeen = useCallback((id: string) => {
    dispatchSeen({ type: 'seen/mark', id });
  }, []);
  const [indexing, setIndexing] = useState(false);
  // THE SCORING CASCADE (Phase 4): while a word scores, phase is 'scoring'
  // and this narrates breakdown.steps -- the stick still shows the played
  // tiles (from `tiles`), the case shows `rackBefore` with hollows, the
  // header shows `scoreBase` until the total lands. Any tap skips ahead.
  const [scoring, setScoring] = useState<ScoringState | null>(null);
  // The soundtrack's crescendo window, polled while a crescendo quill is held
  // (audioPiece.js `crescendo()`): { phase: 'idle' | 'soon' | 'live', secs }.
  const cres = useCrescendo(phase, fight, SB.ITEM_DEFS, sfx);
  // Returns audioPiece.js's own crescendo state ({ phase, mag?, ... }) or
  // null with no recording playing -- round.js reads .phase and .mag off it
  // (Climax/Fortissimo need 'live', Anticipation needs 'soon').
  const crescendoNow = useCallback(() => {
    const s = fight.current?.seq;
    return s && s.crescendo ? s.crescendo() : null;
  }, []);
  const skipRef = useRef(false);
  const waitRef = useRef<(() => void) | null>(null);
  const skipCascade = useCallback(() => {
    skipRef.current = true;
    if (waitRef.current) waitRef.current();
  }, []);

  const pendingFlipFromRef = useRef<Record<string, DOMRect>>({});
  function captureFlipFrom(tileId: string) {
    if (typeof document === 'undefined') return;
    const el = document.querySelector('[data-flip-tile-id="' + tileId + '"]');
    if (el && el.getBoundingClientRect)
      pendingFlipFromRef.current[tileId] = el.getBoundingClientRect();
  }
  useLayoutEffect(() => {
    const pending = pendingFlipFromRef.current;
    const ids = Object.keys(pending);
    if (!ids.length) return;
    ids.forEach((tileId) => {
      const fromRect = pending[tileId];
      delete pending[tileId];
      flipTileTo(
        fromRect ?? null,
        document.querySelector('[data-flip-tile-id="' + tileId + '"]'),
      );
    });
  });

  const say = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, 60));
  }, []);
  const {
    openAudio,
    playPiece,
    warm: warmPiece,
  } = useAudio(fight, volumeRef, sfxOnRef, say);
  const refresh = useCallback(() => dispatchRefresh({ type: 'refresh' }), []);

  // The dictionary index is only built once the helper is switched on.
  useEffect(() => {
    if (!helper || SB.isWordMakerReady()) return undefined;
    let alive = true;
    setIndexing(true);
    SB.warmWordMaker(() => {
      if (alive) setIndexing(false);
    });
    return () => {
      alive = false;
    };
  }, [helper, SB]);

  // Volume slider reaches the running soundtrack directly.
  useEffect(() => {
    const f = fight.current;
    if (f && f.gain) f.gain.gain.value = volume;
    if (f && f.sfx) f.sfx.setLevel(volume);
  }, [volume]);

  // The AudioContext/gain/sfx/seq lifecycle (opening the device, mobile
  // suspend/close rebuild, visibility/gesture resume) lives in useAudio.

  // Warm the recording for an enemy (bytes only; the decode waits for the
  // fight). Nine excerpts are ~25 MB, too much to pull up front on a phone,
  // so only the enemy on stage and the one after it are warmed.
  const warm = useCallback(
    (movement: number, stage: number) => {
      const def = enemyAt(movement, stage);
      warmPiece(def ? RECORDINGS[def.recorded] : undefined);
    },
    [warmPiece],
  );
  const warmAhead = useCallback(
    (run: RunFacade) => {
      warm(run.movement, run.stage);
      const m = run.movements[run.movement];
      if (!m) return;
      if (run.stage + 1 < m.enemies.length) warm(run.movement, run.stage + 1);
      else warm(run.movement + 1, 0);
    },
    [warm],
  );
  // READ_SLOWLY_PLAN.md E4: while the player is in the shop, prefetch the
  // next chapter's backdrop the same way warmAhead prefetches its audio
  // bytes above -- a no-op today since it's still SVG (bundled in the JS,
  // nothing to fetch); it starts doing real work once it's sourced as a
  // PNG (see prefetchArt.ts).
  useEffect(() => {
    if (phase !== 'shop') return;
    const run = fight.current?.run;
    if (!run) return;
    const nextChapter = Math.min(3, Math.max(1, run.movement + 2));
    prefetchChapterArt([`backdrop_chapter_${nextChapter}`]);
  }, [phase]);
  useEffect(() => {
    warm(0, 0);
    warm(0, 1);
  }, [warm]);

  // Start the soundtrack for the run's current enemy.
  const startStage = useCallback(
    (run: RunFacade) => {
      const def = run.enemy;
      const f = fight.current;
      if (!def || !f || !f.ctx || !f.gain) return;
      const hadMusic = !!f.seq;
      if (hadMusic) {
        if (f.seq!.dispose) f.seq!.dispose();
        else f.seq!.stop();
      }
      const piece = RECORDINGS[def.recorded]!;
      // Take the stage under the previous enemy's last breath, not over it.
      // The first fight of a run starts clean so the opening notes are heard.
      const seq = playPiece(
        f.ctx,
        f.gain,
        piece,
        hadMusic ? { fadeIn: 0.4 } : undefined,
      );
      const round = run.round;
      warmAhead(run);
      fight.current = { ...f, run, round, seq, def, piece };
      window.__round = round;
      window.__run = run;
      window.__seq = seq;
      setWord('');
      setSuggestions([]);
      setPhase('live');
      setWordsmithPose('idle');
      say(
        copy.chapterLabel(MOVEMENTS[run.movement]!.numeral) +
          ' · ' +
          KIND_LABEL[def.kind] +
          ' — ' +
          def.name +
          ' takes up ' +
          piece.title +
          '. ' +
          copy.targetHint(round!.target) +
          '.',
      );
      if (def.flavour) say(def.glyph + ' "' + def.flavour + '"');
      if (run.movementIIIQuillFound) {
        say(
          'Chapter 3: you discover ' +
            SB.ITEM_DEFS[run.movementIIIQuillFound]!.name +
            '.',
        );
        run.movementIIIQuillFound = null;
        writeDiscoveredQuills(run.discoveredQuills);
        refreshDiscovered();
      }
      if (def.rule) setTimeout(() => markSeen('boss'), 6000);
    },
    [say, W, SB, warmAhead, markSeen, refreshDiscovered, playPiece],
  );

  const start = useCallback(
    (seedOverride?: string) => {
      const useSeed = typeof seedOverride === 'string' ? seedOverride : seed;
      if (useSeed !== seed) setSeed(useSeed);
      const rngState = fromSeed(useSeed);

      let ctx = fight.current?.ctx;
      let gain = fight.current?.gain;
      let sfxNode = fight.current?.sfx;
      if (ctx && ctx.state === 'closed') {
        ctx = undefined;
        gain = undefined;
        sfxNode = undefined;
      }
      if (!ctx) {
        const opened = openAudio();
        if (!opened) {
          say('Could not open the audio device.');
          return;
        }
        ({ ctx, gain, sfx: sfxNode } = opened);
      }
      if (ctx.state !== 'running') {
        ctx.resume().catch(() => {});
        setTimeout(() => {
          if (fight.current?.ctx === ctx && ctx.state !== 'running') {
            say('Sound is blocked — tap anywhere to enable it.');
          }
        }, 400);
      }
      gain!.gain.value = volume;
      sfxNode!.setLevel(volume);
      sfxNode!.setEnabled(sfxOn);

      const characterDef = CHARACTER_DEFS[characterId];
      const wonLetters = readWonLetters();
      const discoveredQuillsAtStart =
        readDiscoveredQuills(DEFAULT_KNOWN_QUILLS);
      const run = createRunFacadeFromOpts(
        {
          deck: SB.createBagDeck(bagId, wonLetters),
          tune,
          items:
            characterDef && characterDef.itemId
              ? [...itemIds, characterDef.itemId]
              : [...itemIds],
          crescendo: crescendoNow,
          key,
          wonLetters,
          discoveredQuills: discoveredQuillsAtStart,
          characterId: characterDef ? characterId : undefined,
          extendCrescendo: (extraSec: number) => {
            const s = fight.current?.seq;
            if (s && s.extendCrescendo) s.extendCrescendo(extraSec);
          },
        },
        rngState,
      );
      run.character = characterId;
      fight.current = {
        ...(fight.current || {}),
        ctx,
        gain,
        sfx: sfxNode,
        seq: fight.current?.seq,
      };
      setLog([]);
      if (itemIds.size) {
        say(
          'Carrying ' +
            [...itemIds].map((id) => SB.ITEM_DEFS[id]!.name).join(', ') +
            '.',
        );
      }
      startStage(run);
    },
    [
      seed,
      bagId,
      volume,
      sfxOn,
      tune,
      itemIds,
      key,
      characterId,
      say,
      startStage,
      SB,
      crescendoNow,
      openAudio,
    ],
  );

  // After a won round: bank the gold and move to the next enemy, or end the run.
  const nextStage = useCallback(() => {
    dispatchFight({ type: 'fight/nextStage', fight, phase });
  }, [phase]);

  // Take a letter offered after a boss, then resume into the shop or the win screen.
  const pickLetter = useCallback(
    (letter: string) => {
      dispatchFight({ type: 'fight/pickLetter', fight, phase, letter });
    },
    [phase],
  );

  // Leave the shop and go on to the next enemy.
  const leaveShop = useCallback(() => {
    dispatchFight({ type: 'fight/leaveShop', fight, phase });
  }, [phase]);

  // Walk past a small or big enemy for its favour.
  const skipFight = useCallback(() => {
    dispatchFight({ type: 'fight/skip', fight, phase });
  }, [phase]);
  const copySeed = useCallback(() => {
    try {
      navigator.clipboard.writeText(seed).then(
        () => say('Seed copied.'),
        () => say('Seed: ' + seed),
      );
    } catch (e) {
      say('Seed: ' + seed);
    }
  }, [seed, say]);
  const copyResult = useCallback(() => {
    const run = fight.current?.run;
    if (!run) return;
    const text = shareText(run, run.state === 'won', seed);
    try {
      navigator.clipboard.writeText(text).then(
        () => say('Result copied — paste it anywhere.'),
        () => say(text),
      );
    } catch (e) {
      say(text);
    }
  }, [seed, say]);

  // Every shop action funnels through here so the log and the render agree.
  const act = useCallback(
    (
      label: string | null,
      res: { ok?: boolean; reason?: string } | boolean | null | undefined,
      sound?: string,
    ) => {
      const r = typeof res === 'boolean' ? undefined : res;
      if (!res || !r?.ok) {
        say(r?.reason ? r.reason : 'Nothing happened.');
        sfx('thud');
        return false;
      }
      if (label) say(label);
      if (sound) sfx(sound);
      refresh();
      return true;
    },
    [say, refresh, sfx],
  );

  // INKING (mid-round, from a held consumable): unchanged -- `inking` picks
  // tiles for run.useConsumable.
  const [inking, setInking] = useState<Inking | null>(null);
  // SELECTING (shop/pack): clicking a marginalia card doesn't spend anything
  // yet. It draws a hand right away (run.drawMarkHand -- free, just a
  // preview of the deck to tap) and offers Buy (shop.buy/run.pick, then
  // run.saveMark -- straight to the inventory) or Apply (same purchase, then
  // run.useAdhocMark on the tiles picked here) so the tile choice happens
  // before ink moves.
  const [selecting, setSelecting] = useState<Selecting | null>(null);
  const buyCard = useCallback((i: number) => {
    dispatchFight({ type: 'fight/buyCard', fight, index: i });
  }, []);
  const pickCard = useCallback((i: number) => {
    dispatchFight({ type: 'fight/pickCard', fight, index: i });
  }, []);
  const commitSelecting = useCallback(
    (apply: boolean) => {
      dispatchFight({ type: 'fight/commitSelecting', fight, selecting, apply });
    },
    [selecting],
  );
  const cancelSelecting = useCallback(() => setSelecting(null), []);
  const toggleSelectTile = (id: string | null, vowel?: string) => {
    setSelecting((k) => {
      if (!k) return k;
      if (vowel !== undefined) return { ...k, vowel };
      if (id === null) return k;
      const ids = k.ids.includes(id)
        ? k.ids.filter((x) => x !== id)
        : k.ids.length >= k.ink.targets
          ? [...k.ids.slice(1), id]
          : [...k.ids, id];
      return { ...k, ids };
    });
  };
  const useInk = useCallback((i: number) => {
    dispatchFight({ type: 'fight/useInk', fight, index: i });
  }, []);
  const applyInk = useCallback(() => {
    dispatchFight({ type: 'fight/applyInk', fight, inking });
  }, [inking]);
  const toggleInkTile = (id: string, vowel?: string) => {
    setInking((k) => {
      if (!k) return k;
      if (vowel !== undefined) return { ...k, vowel };
      const ids = k.ids.includes(id)
        ? k.ids.filter((x) => x !== id)
        : k.ids.length >= k.ink.targets
          ? [...k.ids.slice(1), id]
          : [...k.ids, id];
      return { ...k, ids };
    });
  };

  const f = fight.current;
  const run = f ? f.run : null;
  const round = f ? f.round : null;
  const rackLetters = round ? round.rack.map((t) => t.letter).join('') : '';
  const letters = word.toUpperCase().replace(/[^A-Z?]/g, '');

  // Which rack tile (or the permanent character tile, READ_SLOWLY_PLAN.md
  // D1) stands in each position of the stick.
  const characterTile = run ? run.characterTile : null;
  const slots: (Tile | null)[] = (() => {
    if (!round || !letters) return [];
    const pool: Tile[] = characterTile
      ? round.rack.concat([characterTile])
      : (round.rack as Tile[]);
    const out: (Tile | null)[] = new Array(letters.length).fill(null);
    const used = new Set<string>();
    for (let i = 0; i < letters.length; i++) {
      const t = pool.find((x) => !used.has(x.id) && x.letter === letters[i]);
      if (t) {
        out[i] = t;
        used.add(t.id);
      }
    }
    for (let i = 0; i < letters.length; i++) {
      if (out[i]) continue;
      const t = pool.find((x) => !used.has(x.id) && x.letter === '?');
      if (t) {
        out[i] = t;
        used.add(t.id);
      }
    }
    return out;
  })();
  const pickedIds = new Set(
    slots.filter((t): t is Tile => !!t).map((t) => t.id),
  );
  const playedIds = new Set(scoring ? scoring.tiles.map((t) => t.id) : []);
  const formable = !letters || pickedIds.size === letters.length;

  const finish = useCallback(
    (r: RoundFacade) => {
      const run = fight.current?.run;
      if (r.state === 'won') {
        setPhase('won');
        // The piece simply stops; no death sound.
        fight.current?.seq?.stop?.();
        say(
          'Target met — ' +
            r.score +
            ' against ' +
            r.target +
            '. ' +
            r.playsLeft +
            ' word' +
            (r.playsLeft === 1 ? '' : 's') +
            ' left → ' +
            r.ink +
            ' ink' +
            (run!.interestPreview()
              ? ' + ' + run!.interestPreview() + ' interest'
              : '') +
            '.',
        );
      } else if (r.state === 'lost') {
        setPhase('lost');
        say(
          'Out of words at ' +
            r.score +
            ' — ' +
            (r.target - r.score) +
            ' short.',
        );
        if (run) {
          run.next();
          setBest(recordRun(run, false));
        }
      }
    },
    [say, SB],
  );

  const runCascade = useCallback(
    async (
      r: RoundFacade,
      res: ReturnType<RoundFacade['playWord']>,
      rackBefore: RoundFacade['rack'],
      scoreBefore: number,
    ) => {
      const b = res.breakdown!;
      const steps = b.steps || [];
      const k = intensity(b.total, r.target);
      const speed = CASCADE.SMALL_SPEED + (1 - CASCADE.SMALL_SPEED) * k;
      skipRef.current = false;
      const wait = (ms: number) =>
        new Promise<void>((resolve) => {
          const id = setTimeout(
            () => {
              waitRef.current = null;
              resolve();
            },
            skipRef.current ? 0 : ms * speed,
          );
          waitRef.current = () => {
            clearTimeout(id);
            waitRef.current = null;
            resolve();
          };
        });
      const play = r.plays[r.plays.length - 1]!;
      const st: ScoringState = {
        word: res.word!,
        tiles: play.tiles,
        steps,
        breakdown: b,
        rackBefore,
        scoreBase: scoreBefore,
        pts: 0,
        mult: 0,
        tier: null,
        litTile: null,
        litItem: null,
        litSlot: null,
        floats: [],
        total: null,
        hit: 0,
        k,
        crossed: scoreBefore < r.target && r.score >= r.target,
        cleared: false,
      };
      let n = 0;
      const show = () => setScoring({ ...st });
      const float = (
        on: string | number | undefined,
        text: string | undefined,
        tone: string | undefined,
      ) => {
        st.floats = [...st.floats.slice(-6), { key: n++, on, text, tone }];
      };
      setPhase('scoring');
      setWordsmithPose('write');
      show();
      sfx('lock', k);
      await wait(CASCADE.LOCK_MS);
      const letters = steps.filter((x) => x.kind === 'letter');
      for (const step of steps) {
        st.pts = step.runPts ?? 0;
        st.mult = step.runMult ?? 0;
        st.litTile = null;
        st.litItem = null;
        st.litSlot = null;
        if (step.kind === 'tier') {
          st.tier = step;
          show();
          await wait(CASCADE.TIER_MS);
        } else if (step.kind === 'letter') {
          const i = letters.indexOf(step);
          st.litTile = step.tile?.id ?? null;
          float(
            step.tile?.id,
            '+' + step.pts + (step.mult ? ' · +' + step.mult + ' mult' : ''),
            step.mult ? 'mult' : 'pts',
          );
          sfx('letter', i, letters.length, !!step.ink);
          show();
          await wait(CASCADE.LETTER_MS);
        } else if (
          step.kind === 'item' ||
          step.kind === 'rule' ||
          step.kind === 'chord'
        ) {
          st.litItem = step.id ?? null;
          float(step.id, step.note, step.tone);
          sfx(step.kind === 'rule' ? 'rule' : 'item', step.tone);
          show();
          await wait(step.kind === 'rule' ? CASCADE.RULE_MS : CASCADE.ITEM_MS);
        } else if (step.kind === 'slot') {
          st.litSlot = step.tile?.id ?? null;
          float(
            step.tile?.id,
            step.tone === 'mult' ? '×' + step.ratio : '+' + step.pts,
            step.tone,
          );
          sfx('shimmer', step.slotKind);
          show();
          await wait(CASCADE.ITEM_MS);
        } else if (step.kind === 'character') {
          st.litTile = step.tile?.id ?? null;
          float(step.tile?.id, '+' + step.pts, 'pts');
          sfx('shimmer', 'character');
          show();
          await wait(CASCADE.ITEM_MS);
        } else {
          // a steel tile held, or the tile's own x-mult
          if (step.tile) st.litTile = step.tile.id;
          float(step.tile ? step.tile.id : 'stick', '×' + step.ratio, 'mult');
          sfx('item', 'mult');
          show();
          await wait(CASCADE.HOLD_MS);
        }
      }
      // The total lands.
      st.litTile = null;
      st.litItem = null;
      st.litSlot = null;
      st.total = b.total;
      st.scoreBase = r.score;
      st.hit = 1 + Math.round(k * (CASCADE.SHAKE_TIERS - 1));
      flyScore(b.total);
      sfx('hit', k);
      if (st.crossed) sfx('resolve');
      show();
      await wait(CASCADE.TOTAL_MS);
      // Clear: the played tiles FLIP into the plays list, the case refills.
      play.tiles.forEach((t) => captureFlipFrom(t.id));
      st.cleared = true;
      st.hit = 0;
      sfx('riffle');
      show();
      await wait(CASCADE.CLEAR_MS);
      setScoring(null);
      if (r.state === 'live') {
        setPhase('live');
        setWordsmithPose('idle');
      } else {
        finish(r);
        setWordsmithPose(r.state === 'won' ? 'flourish' : 'idle');
      }
      refresh();
    },
    [sfx, finish, refresh],
  );

  const playWord = useCallback(
    (raw: string) => {
      dispatchFight({ type: 'fight/playWord', fight, phase, raw });
    },
    [phase],
  );

  const play = useCallback(() => {
    const r = fight.current?.round;
    if (!r || phase !== 'live' || !letters) return;
    if (r.isPlayable(letters)) {
      playWord(letters);
      return;
    }
    if (!formable) {
      say(letters + ' needs letters that aren’t in your rack.');
      sfx('thud');
      return;
    }
    // With the helper on, Play settles for the best word inside the letters.
    if (helper) {
      const found = SB.findWords(letters, (w) => r.scoreFor(w), 1);
      if (found.length > 0) {
        playWord(found[0]!.word);
        return;
      }
      say('Nothing spells out of ' + letters + '.');
      sfx('thud');
      return;
    }
    say(letters + ' isn’t in the dictionary.');
    sfx('thud');
  }, [letters, formable, phase, helper, playWord, say, SB, sfx]);

  const changeout = useCallback(() => {
    const ids = slots.filter((t): t is Tile => !!t).map((t) => t.id);
    dispatchFight({ type: 'fight/changeout', fight, phase, ids });
  }, [slots, phase]);

  useEffect(() => {
    if (!helper || !letters || indexing) {
      setSuggestions([]);
      return;
    }
    const r = fight.current?.round;
    setSuggestions(
      SB.findWords(letters, r ? (w) => r.scoreFor(w) : (w) => w.length, 10),
    );
  }, [helper, letters, indexing, SB]);

  const stageTile = (tile: Tile) => {
    captureFlipFrom(tile.id);
    sfx('tick', letters.length, 1);
    markSeen(tile.origin === 'character' ? 'character' : 'rack');
    setWord(letters + (tile.letter === '?' ? '?' : tile.letter));
  };
  const unstageAt = (i: number) => {
    const t = slots[i];
    if (t) captureFlipFrom(t.id);
    sfx('tick', i, -1);
    markSeen('stick');
    setWord(letters.slice(0, i) + letters.slice(i + 1));
  };

  // Drag a tile along its row to reorder it -- the case and the stick both.
  // Every tile in the row is FLIPped so its neighbours slide aside; the
  // dragged tile slides in from where the finger let go of its ghost.
  const { drag, preview, playRef } = useDragReorder({
    letters,
    setWord,
    fight,
    dispatchFight,
    refresh,
    sfx,
    captureFlipFrom,
    pendingFlipFromRef,
  });

  const setConst = (key: string, value: number | boolean | undefined) => {
    setTune((t) => ({ ...t, [key]: value }));
    dispatchFight({ type: 'fight/setTune', fight, key, value });
  };

  // Rows as drawn: the real order, or the drag's preview. Each entry carries
  // `hollow` (the tile being dragged) so the row can paint it as a hole.
  function moved<T>(arr: T[], i: number, to: number): T[] {
    const a = arr.slice();
    const x = a.splice(i, 1)[0]!;
    a.splice(to, 0, x);
    return a;
  }
  const rackShown = (() => {
    if (!round) return [];
    if (scoring && !scoring.cleared) {
      return scoring.rackBefore.map((t, i) => ({
        t,
        i,
        picked: playedIds.has(t.id),
        hollow: false,
      }));
    }
    let arr = round.rack.map((t, i) => ({
      t,
      i,
      picked: pickedIds.has(t.id),
      hollow: false,
    }));
    if (!preview || !preview.id) return arr;
    const i = arr.findIndex((x) => x.t.id === preview.id);
    if (i < 0) return arr;
    if (preview.toRow === 'rack') {
      arr[i] = { ...arr[i]!, picked: false, hollow: true };
      arr = moved(arr, i, preview.to);
    } else {
      arr[i] = { ...arr[i]!, picked: true };
    }
    return arr;
  })();
  const stickShown = (() => {
    const arr: {
      t: Tile | null;
      i: number;
      ch: string | undefined;
      hollow: boolean;
    }[] = slots.map((t, i) => ({ t, i, ch: letters[i], hollow: false }));
    if (!preview) return arr;
    if (preview.fromRow === 'stick') {
      if (preview.fromIndex >= arr.length) return arr;
      const x = { ...arr[preview.fromIndex]!, hollow: true };
      arr.splice(preview.fromIndex, 1);
      if (preview.toRow === 'stick') arr.splice(preview.to, 0, x);
    } else if (preview.toRow === 'stick' && round) {
      const t = round.rack.find((x) => x.id === preview.id);
      if (t)
        arr.splice(preview.to, 0, { t, i: -1, ch: t.letter, hollow: true });
    }
    return arr;
  })();

  const live = phase === 'live' && !!round;
  const showIntro = phase === 'live' && !!round && readyRound.current !== round;
  const enterFight = useCallback(() => {
    readyRound.current = round;
    refresh();
  }, [round, refresh]);
  const barredNow = live
    ? slots.filter((t): t is Tile => !!t).filter((t) => round!.isBarred(t))
    : [];
  const spelt = !!(
    live &&
    formable &&
    !barredNow.length &&
    round!.isPlayable(letters)
  );
  const worthHow = spelt ? round!.breakdownFor(letters) : null;
  const worth = worthHow ? worthHow.total : 0;
  const scoreShown = scoring ? scoring.scoreBase : round ? round.score : 0;
  const pct = round ? Math.min(100, (100 * scoreShown) / round.target) : 0;

  return {
    phase,
    scoring,
    skipCascade,
    gearOpen,
    setGearOpen: (open: boolean) => dispatchGear({ type: 'gear/set', open }),
    seed,
    setSeed,
    bagId,
    setBagId,
    keyUnlocked,
    discovered,
    volume,
    setVolume,
    sfxOn,
    setSfxOn,
    helper,
    setHelper,
    start,
    round,
    run,
    itemIds,
    setItemIds,
    tune,
    setConst,
    keyId: key,
    setKey,
    writeKeyChoice,
    seen,
    markSeen,
    characterId,
    setCharacterId,
    wordsmithPose,
    randomSeed,
    best,
    f,
    enterFight,
    skipFight,
    showIntro,
    scoreShown,
    pct,
    live,
    act,
    useInk,
    cres,
    tip,
    setTip,
    nextStage,
    W,
    pickLetter,
    leaveShop,
    buyCard,
    pickCard,
    selecting,
    commitSelecting,
    cancelSelecting,
    toggleSelectTile,
    copySeed,
    copyResult,
    shareText: run ? shareText(run, phase === 'run-won', seed) : '',
    playRef,
    inking,
    setInking,
    toggleInkTile,
    applyInk,
    rackShown,
    drag,
    letters,
    setWord,
    play,
    changeout,
    pickedIds,
    rackLetters,
    say,
    stageTile,
    unstageAt,
    sfx,
    formable,
    barredNow,
    spelt,
    worthHow,
    worth,
    stickShown,
    indexing,
    suggestions,
    playWord,
    characterTile,
    characterPicked: !!characterTile && pickedIds.has(characterTile.id),
  };
}
