// ROUND SANDBOX -- a RUN of three Balatro-with-Scrabble rounds (see
// COMBAT_REDESIGN.md): two normal enemies, then a boss, each with a higher
// point target. Gold pools across the run.
//
// Each round: a point target, four words, three changeouts. The classical piece is a
// SOUNDTRACK here and nothing more: it starts with the round, loops, and never
// touches the score. The tile play (case + composing stick + FLIP slide) is
// carried over from the tug sandbox unchanged; what the stick MEANS is new --
// Play scores the word standing on it, Change out throws those tiles back.
import { createDragReorder } from '../engine/dragReorder';
import * as copy from '../ui/copy';
import SituationPanel from './SituationPanel.jsx';
import TitleScreen from '../ui/meta/TitleScreen.jsx';
import HeldRow from '../ui/fight/HeldRow';
import Shop from '../ui/shop/Shop';
import EndScreen from '../ui/meta/EndScreen';
import GearMeta from '../ui/chrome/GearMeta';
import TuningPanel from '../ui/chrome/TuningPanel';
import RunStrip from '../ui/chrome/RunStrip';
import { cardName } from '../ui/fight/cardCopy';
import PlayBoard from '../ui/fight/PlayBoard';
import {
  sfxReducer,
  readSfxOn,
  writeSfxOn,
  gearReducer,
  seenReducer,
  readSeen,
  keyUnlockedReducer,
  readKeyUnlocked,
  bestReducer,
  readBest,
  refreshReducer,
  fightReducer,
} from '../app/store';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';

// Plain FLIP: record where the tile was,
// let React move it, slide it in from the old spot. Nothing else may set
// `transform` on .sb-tile.
function flipTileTo(fromRect, toEl) {
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
function intensity(total, target) {
  return Math.max(0, Math.min(1, Math.pow(total / Math.max(1, target), 0.7)));
}

// "FIVE · lvl 2 · 35 + letters 9 = 44 pts × 6" -- tier, points, then mult.
function describeBreakdown(b) {
  const pts = [];
  if (b.tierPts) pts.push(b.tierPts);
  pts.push('letters ' + b.base);
  if (b.bonusFlat) pts.push('tile bonus +' + b.bonusFlat);
  if (b.variantFlat) pts.push('charged +' + b.variantFlat);
  if (b.inkPoints) pts.push('gilt +' + b.inkPoints);
  let out =
    b.tierName + (b.tierLevel > 1 ? ' · lvl ' + b.tierLevel : '') + ' · ';
  const basePts =
    b.tierPts + b.base + b.bonusFlat + b.variantFlat + b.inkPoints;
  out +=
    (pts.length > 1 ? pts.join(' + ') + ' = ' : '') +
    basePts +
    ' pts × ' +
    (b.tierMult + b.inkMult);
  if (b.inkMult) out += ' (tier ' + b.tierMult + ' + bold ' + b.inkMult + ')';
  const fired = (b.itemNotes || []).map((n) => n.name + ' ' + n.note);
  if (b.bonusMult !== 1) fired.push('tile × ' + b.bonusMult);
  if (b.holdMult && b.holdMult !== 1) fired.push('steel held × ' + b.holdMult);
  if (fired.length)
    out += ' → ' + fired.join(' → ') + ' → ' + b.points + ' × ' + b.mult;
  return out;
}

// HeldRow/Shop and their shared card-copy helpers moved to src/ui/
// (READ_SLOWLY_PLAN.md A4, mechanical extraction). cardName is still used
// below for the shop-buy narration strings.

// The best so far, kept in the browser: best word, deepest enemy, wins.
// readBest/writeBest and the wbc.best key now live in ../app/store.ts
// (READ_SLOWLY_PLAN.md A3); recordRun still does its own read-modify-write
// since it needs the previous value mid-computation, then hands the result
// to the bestReducer via dispatch({ type: 'best/set', value }).
function writeBest(next) {
  try {
    window.localStorage.setItem('wbc.best', JSON.stringify(next));
  } catch (e) {
    /* private mode, quota: ignore */
  }
}
function depthOf(run) {
  return run.movement * 3 + run.stage;
}
function runLength(run) {
  return run.movements.reduce((n, m) => n + m.enemies.length, 0);
}
function recordRun(run, won) {
  const best = readBest();
  const out = { ...best };
  if (
    run.bestPlay &&
    (!best.word || run.bestPlay.breakdown.total > best.word.total)
  ) {
    out.word = {
      word: run.bestPlay.word,
      total: run.bestPlay.breakdown.total,
      enemy: run.bestPlay.enemy,
    };
  }
  const depth = won ? runLength(run) : depthOf(run);
  if (!best.deepest || depth > best.deepest.depth) {
    out.deepest = { depth, name: won ? 'the whole run' : run.enemy.name };
  }
  out.wins = (best.wins || 0) + (won ? 1 : 0);
  out.runs = (best.runs || 0) + 1;
  if (won && run.key) {
    out.winsByKey = { ...(best.winsByKey || {}) };
    out.winsByKey[run.key] = (out.winsByKey[run.key] || 0) + 1;
  }
  writeBest(out);
  return out;
}

// Keys (stage 3): the title screen offers the next key once the current
// highest-unlocked one has been won at least once. wbc.keyUnlocked is the
// index of the highest key on offer (now ../app/store.ts's keyUnlockedReducer,
// READ_SLOWLY_PLAN.md A3); wbc.key is the player's current pick, still local.
function readKeyChoice(unlocked, SB) {
  try {
    const saved = window.localStorage.getItem('wbc.key');
    if (saved && SB.KEY_DEFS[saved] && SB.KEY_DEFS[saved].index <= unlocked)
      return saved;
  } catch (e) {
    /* ignore */
  }
  return SB.KEYS[0].id;
}
function writeKeyChoice(id) {
  try {
    window.localStorage.setItem('wbc.key', id);
  } catch (e) {
    /* ignore */
  }
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
function shareText(run, won, seed) {
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
          run.enemy.name,
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
        ? ' · ' +
          run.items
            .map((id) => window.Wordbound.Sandbox.ITEM_DEFS[id].name)
            .join(', ')
        : ''),
  );
  lines.push('Seed ' + seed + ' · ' + LIVE_URL);
  return lines.join('\n');
}

// EndScreen moved to src/ui/meta/EndScreen.jsx (READ_SLOWLY_PLAN.md A4).

// The score flies from the stick to the readout: its own element, never the
// tile (the FLIP owns .sb-tile's transform).
function flyScore(total) {
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
  el.className = 'sb-score-fly';
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

export default function RoundSandbox() {
  const W = window.Wordbound;
  const SB = W.Sandbox;
  const fight = useRef(null); // { run, round, seq, ctx, gain, def, piece }
  // The round the player has actually entered -- fight the enemy, or skip
  // it, from the pre-fight card. A fresh round object (a new stage, from
  // start() or after a skip/win) never matches this, so the card reappears
  // automatically with no extra bookkeeping at the call sites.
  const readyRound = useRef(null);
  // A3: replaces the old useState(0) counter + forceRender((n) => n + 1)
  // with a reducer per the plan's "delete forceRender" instruction; still a
  // plain re-render nudge, not a model of fight.current's actual state (see
  // src/app/store.ts's header).
  const [, dispatchRefresh] = useReducer(refreshReducer, 0);
  // A3: run/round mutation call sites routed through a typed dispatch
  // instead of direct calls -- see src/app/store.ts's fightReducer. The
  // shop/pack/mark-selecting flow (buyCard, pickCard, commitSelecting,
  // useInk, applyInk) stays as direct calls: it's a tightly nested
  // selecting/inking state machine layered on top of the run mutations,
  // and converting it carries more transcription risk than this pass's
  // browser-verification budget covers.
  const [, dispatchFight] = useReducer(fightReducer, 0);
  // Mirrors of the volume/sfx-on state for the zero-dep resume effect below,
  // which needs the LATEST value without re-subscribing on every change.
  const volumeRef = useRef(0.4);
  const sfxOnRef = useRef(true);
  // idle | live | won (round, run continues) | shop (between fights) | lost | run-won
  const [phase, setPhase] = useState('idle');
  const [log, setLog] = useState([]);
  const [word, setWord] = useState('');
  const [seed, setSeed] = useState('sandbox');
  // The word-maker helper (suggestions, Best play, fuzzy Play) -- off by default.
  const [helper, setHelper] = useState(false);
  const [bagId, setBagId] = useState('normal');
  const [volume, setVolume] = useState(0.4);
  volumeRef.current = volume;
  // Input sounds (sfx.js), on by default, remembered in wbc.sfx.
  // READ_SLOWLY_PLAN.md A3: the first reducer-backed slice (see
  // src/app/store.ts) -- a small, self-contained piece of UI state, not the
  // run/round core the plan's A3 section describes.
  const [sfxState, dispatchSfx] = useReducer(sfxReducer, undefined, () => ({
    on: readSfxOn(),
  }));
  const sfxOn = sfxState.on;
  const setSfxOn = useCallback((next) => {
    dispatchSfx({
      type: 'sfx/set',
      on: typeof next === 'function' ? next(sfxOn) : next,
    });
  }, [sfxOn]);
  sfxOnRef.current = sfxOn;
  useEffect(() => {
    writeSfxOn(sfxOn);
    if (fight.current?.sfx) fight.current.sfx.setEnabled(sfxOn);
  }, [sfxOn]);
  // The sound for an input event, if a run has opened the audio device.
  const sfx = useCallback((name, ...a) => {
    const s = fight.current?.sfx;
    if (s && s[name]) s[name](...a);
  }, []);
  const [tune, setTune] = useState(() => ({ ...SB.ROUND_DEFAULTS }));
  const [discovered, setDiscovered] = useState(
    () => new Set(SB.discoveredQuills ? SB.discoveredQuills() : []),
  );
  const refreshDiscovered = useCallback(
    () => setDiscovered(new Set(SB.discoveredQuills())),
    [SB],
  );
  const [keyUnlockedState, dispatchKeyUnlocked] = useReducer(
    keyUnlockedReducer,
    { index: 0 },
    () => ({ index: readKeyUnlocked() }),
  );
  const keyUnlocked = keyUnlockedState.index;
  const [key, setKey] = useState(() => readKeyChoice(readKeyUnlocked(), SB));
  // READ_SLOWLY_PLAN.md stage D: the chosen playable letter character. Its
  // passive is threaded into createRun's `items` list; the always-playable
  // extra-tile mechanic itself is not yet wired (see characters.ts's header).
  const [characterId, setCharacterId] = useState(
    () => SB.unlockedCharacters()[0] || 'zed',
  );
  // A win on the highest-unlocked key offers the next one (stage 3).
  const unlockNextKey = useCallback(
    (wonRun) => {
      const wonIndex = SB.KEY_DEFS[wonRun.key]
        ? SB.KEY_DEFS[wonRun.key].index
        : 0;
      dispatchKeyUnlocked({
        type: 'keyUnlocked/wonAtIndex',
        wonIndex,
        keyCount: SB.KEYS.length,
      });
    },
    [SB],
  );
  // Sample items, read at Start (a mid-round swap would half-apply).
  const [itemIds, setItemIds] = useState(() => new Set());
  const [suggestions, setSuggestions] = useState([]);
  const [bestState, dispatchBest] = useReducer(bestReducer, {}, readBest);
  const best = bestState;
  const setBest = useCallback(
    (value) => dispatchBest({ type: 'best/set', value }),
    [],
  );
  // Narrow screens keep the setup bar, starting items and tuning behind a gear.
  const [gearState, dispatchGear] = useReducer(gearReducer, { open: false });
  const gearOpen = gearState.open;
  // Which quill/consumable's tap-tooltip is open (mobile has no hover, so
  // `title` never shows -- tapping the icon toggles this instead).
  const [tip, setTip] = useState(null);
  useEffect(() => {
    if (!tip) return undefined;
    const close = (e) => {
      if (!e.target.closest('.sb-card')) setTip(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [tip]);
  // Which one-time callouts have been shown (see readSeen).
  const [seenState, dispatchSeen] = useReducer(seenReducer, undefined, () => ({
    ids: readSeen(),
  }));
  const seen = seenState.ids;
  const markSeen = useCallback((id) => {
    dispatchSeen({ type: 'seen/mark', id });
  }, []);
  const [indexing, setIndexing] = useState(false);
  const inputRef = useRef(null);
  // THE SCORING CASCADE (Phase 4): while a word scores, phase is 'scoring'
  // and this narrates breakdown.steps -- the stick still shows the played
  // tiles (from `tiles`), the case shows `rackBefore` with hollows, the
  // header shows `scoreBase` until the total lands. Any tap skips ahead.
  const [scoring, setScoring] = useState(null);
  // The soundtrack's crescendo window, polled while a crescendo quill is held
  // (audioPiece.js `crescendo()`): { phase: 'idle' | 'soon' | 'live', secs }.
  const [cres, setCres] = useState({ phase: 'idle' });
  const holdsCrescendoItem = (run) =>
    !!run &&
    run.items.some((id) => SB.ITEM_DEFS[id] && SB.ITEM_DEFS[id].crescendo);
  // Returns audioPiece.js's own crescendo state ({ phase, mag?, ... }) or
  // null with no recording playing -- round.js reads .phase and .mag off it
  // (Climax/Fortissimo need 'live', Anticipation needs 'soon').
  const crescendoNow = useCallback(() => {
    const s = fight.current?.seq;
    return s && s.crescendo ? s.crescendo() : null;
  }, []);
  const skipRef = useRef(false);
  const waitRef = useRef(null);
  const skipCascade = useCallback(() => {
    skipRef.current = true;
    if (waitRef.current) waitRef.current();
  }, []);

  const pendingFlipFromRef = useRef({});
  function captureFlipFrom(tileId) {
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
        fromRect,
        document.querySelector('[data-flip-tile-id="' + tileId + '"]'),
      );
    });
  });

  const say = useCallback((line) => {
    setLog((prev) => [line, ...prev].slice(0, 60));
  }, []);
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

  // Mobile browsers suspend the AudioContext when the tab is backgrounded and
  // do not always resume it on their own when it comes back to the
  // foreground -- leaving both music and sfx silent until the player
  // manually restarts the run. Resume on return to visibility instead.
  //
  // A few minutes backgrounded goes further on some mobile browsers (iOS
  // Safari in particular): the OS doesn't just suspend the context, it
  // CLOSES it outright to free the audio hardware, and a closed context can
  // never resume -- ctx.resume() silently no-ops on it forever. That is the
  // "leave for a bit and the whole app goes silent for good" failure. When
  // that's happened, rebuild the graph and the current piece from scratch
  // rather than trying to resume something that's gone.
  useEffect(() => {
    const rebuildClosed = () => {
      const f = fight.current;
      if (!f || !f.ctx || f.ctx.state !== 'closed') return;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.value = volumeRef.current;
        const sfxNode = SB.createSfx(ctx, ctx.destination);
        sfxNode.setLevel(volumeRef.current);
        sfxNode.setEnabled(sfxOnRef.current);
        let seq = null;
        if (f.piece) {
          seq = SB.createAudioPiece(ctx, gain, f.piece);
          seq.on('load-failed', (err) =>
            say(
              'The recording did not load (' +
                (err && err.message ? err.message : err) +
                ') — Restart to try again.',
            ),
          );
          seq.on('piece-ended', () => {
            const g = fight.current;
            if (!g || g.seq !== seq) return;
            seq.stop();
            seq.play();
          });
          seq.play();
        }
        fight.current = { ...f, ctx, gain, sfx: sfxNode, seq };
        if (seq)
          say(
            'The soundtrack dropped out while the tab was in the background — restarted.',
          );
      } catch (err) {
        /* still no audio device available; leave it silent */
      }
    };
    const tryResume = () => {
      const ctx = fight.current?.ctx;
      if (ctx && ctx.state === 'closed') {
        rebuildClosed();
        return;
      }
      if (ctx && ctx.state !== 'running') {
        ctx.resume().catch(() => {});
      }
    };
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      tryResume();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('pageshow', onVisible);
    // A tab backgrounded for a few minutes can leave some mobile browsers
    // (Firefox on Android in particular) refusing resume() unless it rides
    // on an actual user gesture -- visibilitychange alone does not count.
    // The player's first tap back on the page doubles as that gesture.
    // Capture phase, not bubble: most taps land on a disabled <button>
    // (Play/Swap/tiles mid-scoring) whose pointerdown never bubbles to
    // document, so a bubble-phase listener alone misses most real taps.
    document.addEventListener('pointerdown', tryResume, true);
    document.addEventListener('touchstart', tryResume, true);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('pageshow', onVisible);
      document.removeEventListener('pointerdown', tryResume, true);
      document.removeEventListener('touchstart', tryResume, true);
    };
  }, []);

  // Warm the recording for an enemy (bytes only; the decode waits for the
  // fight). Nine excerpts are ~25 MB, too much to pull up front on a phone,
  // so only the enemy on stage and the one after it are warmed.
  const warm = useCallback(
    (movement, stage) => {
      const def = SB.enemyAt(movement, stage);
      const piece = def && SB[def.recorded];
      if (piece && piece.audio) SB.prefetchAudio(piece.audio).catch(() => {});
    },
    [SB],
  );
  const warmAhead = useCallback(
    (run) => {
      warm(run.movement, run.stage);
      const m = run.movements[run.movement];
      if (run.stage + 1 < m.enemies.length) warm(run.movement, run.stage + 1);
      else warm(run.movement + 1, 0);
    },
    [warm],
  );
  useEffect(() => {
    warm(0, 0);
    warm(0, 1);
  }, [warm]);

  // Start the soundtrack for the run's current enemy.
  const startStage = useCallback(
    (run) => {
      const def = run.enemy;
      const f = fight.current;
      const hadMusic = !!(f && f.seq);
      if (hadMusic) {
        if (f.seq.dispose) f.seq.dispose();
        else f.seq.stop();
      }
      const piece = SB[def.recorded];
      const seq = SB.createAudioPiece(f.ctx, f.gain, piece);
      seq.on('load-failed', (err) =>
        say(
          'The recording did not load (' +
            (err && err.message ? err.message : err) +
            ') — Restart to try again.',
        ),
      );
      seq.on('piece-ended', () => {
        const g = fight.current;
        if (!g || g.seq !== seq) return;
        seq.stop();
        seq.play();
      });
      seq.play();
      // Take the stage under the previous enemy's last breath, not over it.
      // The first fight of a run starts clean so the opening notes are heard.
      if (hadMusic)
        seq.whenReady.then(() => {
          if (fight.current?.seq === seq) seq.fadeIn(0.4);
        });
      const round = run.round;
      warmAhead(run);
      fight.current = { ...f, run, round, seq, def, piece };
      window.__round = round;
      window.__run = run;
      setWord('');
      setSuggestions([]);
      setPhase('live');
      say(
        copy.chapterLabel(SB.MOVEMENTS[run.movement].numeral) +
          ' · ' +
          SB.KIND_LABEL[def.kind] +
          ' — ' +
          def.name +
          ' takes up ' +
          piece.title +
          '. ' +
          copy.targetHint(round.target) +
          '.',
      );
      if (def.flavour) say(def.glyph + ' "' + def.flavour + '"');
      if (run.movementIIIQuillFound) {
        say(
          'Chapter 3: you discover ' +
            SB.ITEM_DEFS[run.movementIIIQuillFound].name +
            '.',
        );
        run.movementIIIQuillFound = null;
        refreshDiscovered();
      }
      if (def.rule) setTimeout(() => markSeen('boss'), 6000);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [say, W, SB, warmAhead, markSeen, refreshDiscovered],
  );

  const start = useCallback(
    (seedOverride) => {
      const useSeed = typeof seedOverride === 'string' ? seedOverride : seed;
      if (useSeed !== seed) setSeed(useSeed);
      const rng = window.Game.RNG.create(useSeed);

      let ctx = fight.current?.ctx;
      let gain = fight.current?.gain;
      let sfxNode = fight.current?.sfx;
      try {
        if (ctx && ctx.state === 'closed') {
          ctx = null;
          gain = null;
          sfxNode = null;
        }
        if (!ctx) {
          ctx = new (window.AudioContext || window.webkitAudioContext)();
          gain = ctx.createGain();
          gain.connect(ctx.destination);
          sfxNode = SB.createSfx(ctx, ctx.destination);
        }
        if (ctx.state !== 'running') ctx.resume().catch(() => {});
        gain.gain.value = volume;
        sfxNode.setLevel(volume);
        sfxNode.setEnabled(sfxOn);
      } catch (err) {
        say(
          'Could not open the audio device: ' +
            (err && err.message ? err.message : err),
        );
        return;
      }

      const characterDef = SB.CHARACTER_DEFS[characterId];
      const run = SB.createRun({
        rng,
        deck: SB.createBagDeck(bagId),
        tune,
        items: characterDef
          ? [...itemIds, characterDef.passive.id]
          : [...itemIds],
        crescendo: crescendoNow,
        key,
        extendCrescendo: (extraSec) => {
          const s = fight.current?.seq;
          if (s && s.extendCrescendo) s.extendCrescendo(extraSec);
        },
      });
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
            [...itemIds].map((id) => SB.ITEM_DEFS[id].name).join(', ') +
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
      say,
      startStage,
      SB,
      crescendoNow,
    ],
  );

  // Poll the crescendo window for the card's countdown. Only runs while a
  // round is live and a crescendo quill is held; 100 ms keeps the seconds
  // readout honest without redrawing when nothing has changed.
  useEffect(() => {
    if (phase !== 'live' || !holdsCrescendoItem(fight.current?.run)) {
      setCres({ phase: 'idle' });
      return undefined;
    }
    let last = '',
      lastPhase = 'idle';
    const id = setInterval(() => {
      const s = fight.current?.seq;
      const c = s && s.crescendo ? s.crescendo() : { phase: 'idle' };
      const key =
        c.phase +
        ':' +
        (c.secs == null
          ? ''
          : c.phase === 'live'
            ? c.secs.toFixed(1)
            : Math.ceil(c.secs));
      if (key === last) return;
      last = key;
      // The window opening gets a sound of its own so the ear is told too.
      if (c.phase === 'live' && lastPhase !== 'live') sfx('shimmer');
      lastPhase = c.phase;
      setCres(c);
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, fight.current?.run?.items.length]);

  // After a won round: bank the gold and move to the next enemy, or end the run.
  const nextStage = useCallback(() => {
    dispatchFight({
      type: 'fight/nextStage',
      fight,
      phase,
      say,
      refresh,
      startStage,
      SB,
      warm,
      unlockNextKey,
      refreshDiscovered,
      setPhase,
      setBest,
      recordRun,
    });
  }, [
    phase,
    say,
    refresh,
    startStage,
    SB,
    warm,
    unlockNextKey,
    refreshDiscovered,
  ]);

  // Take a letter offered after a boss, then resume into the shop or the win screen.
  const pickLetter = useCallback(
    (letter) => {
      dispatchFight({
        type: 'fight/pickLetter',
        fight,
        phase,
        letter,
        say,
        refresh,
        startStage,
        SB,
        warm,
        unlockNextKey,
        setPhase,
        setBest,
        recordRun,
      });
    },
    [phase, say, refresh, startStage, SB, warm, unlockNextKey],
  );

  // Leave the shop and go on to the next enemy.
  const leaveShop = useCallback(() => {
    dispatchFight({ type: 'fight/leaveShop', fight, phase, markSeen, startStage });
  }, [phase, startStage, markSeen]);

  // Walk past a small or big enemy for its favour.
  const skipFight = useCallback(() => {
    dispatchFight({ type: 'fight/skip', fight, phase, say, startStage, SB });
  }, [phase, say, startStage, SB]);
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
    (label, res, sound) => {
      if (!res || !res.ok) {
        say(res && res.reason ? res.reason : 'Nothing happened.');
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
  const [inking, setInking] = useState(null);
  // SELECTING (shop/pack): clicking a marginalia card doesn't spend anything
  // yet. It draws a hand right away (run.drawMarkHand -- free, just a
  // preview of the deck to tap) and offers Buy (shop.buy/run.pick, then
  // run.saveMark -- straight to the inventory) or Apply (same purchase, then
  // run.useAdhocMark on the tiles picked here) so the tile choice happens
  // before ink moves.
  const [selecting, setSelecting] = useState(null);
  const buyCard = useCallback(
    (i) => {
      dispatchFight({
        type: 'fight/buyCard',
        fight,
        index: i,
        SB,
        cardName,
        setWord,
        setSelecting,
        say,
        sfx,
        refresh,
      });
    },
    [SB, say, sfx, refresh],
  );
  const pickCard = useCallback(
    (i) => {
      dispatchFight({
        type: 'fight/pickCard',
        fight,
        index: i,
        SB,
        cardName,
        setWord,
        setSelecting,
        say,
        sfx,
        refresh,
      });
    },
    [SB, say, sfx, refresh],
  );
  const commitSelecting = useCallback(
    (apply) => {
      dispatchFight({
        type: 'fight/commitSelecting',
        fight,
        selecting,
        apply,
        setSelecting,
        say,
        sfx,
        refresh,
      });
    },
    [selecting, say, sfx, refresh],
  );
  const cancelSelecting = useCallback(() => setSelecting(null), []);
  const toggleSelectTile = (id, vowel) => {
    setSelecting((k) => {
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
  const useInk = useCallback(
    (i) => {
      dispatchFight({
        type: 'fight/useInk',
        fight,
        index: i,
        SB,
        setWord,
        setInking,
        say,
        sfx,
        refresh,
      });
    },
    [SB, say, sfx, refresh],
  );
  const applyInk = useCallback(() => {
    dispatchFight({
      type: 'fight/applyInk',
      fight,
      inking,
      setInking,
      say,
      sfx,
      refresh,
    });
  }, [inking, say, sfx, refresh]);
  const toggleInkTile = (id, vowel) => {
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

  // Which rack tile stands in each position of the stick.
  const slots = (() => {
    if (!round || !letters) return [];
    const out = new Array(letters.length).fill(null);
    const used = new Set();
    for (let i = 0; i < letters.length; i++) {
      const t = round.rack.find(
        (x) => !used.has(x.id) && x.letter === letters[i],
      );
      if (t) {
        out[i] = t;
        used.add(t.id);
      }
    }
    for (let i = 0; i < letters.length; i++) {
      if (out[i]) continue;
      const t = round.rack.find((x) => !used.has(x.id) && x.letter === '?');
      if (t) {
        out[i] = t;
        used.add(t.id);
      }
    }
    return out;
  })();
  const pickedIds = new Set(slots.filter(Boolean).map((t) => t.id));
  const playedIds = new Set(scoring ? scoring.tiles.map((t) => t.id) : []);
  const formable = !letters || pickedIds.size === letters.length;

  const finish = useCallback(
    (r) => {
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
            (run.interestPreview()
              ? ' + ' + run.interestPreview() + ' interest'
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
    async (r, res, rackBefore, scoreBefore) => {
      const b = res.breakdown;
      const steps = b.steps || [];
      const k = intensity(b.total, r.target);
      const speed = CASCADE.SMALL_SPEED + (1 - CASCADE.SMALL_SPEED) * k;
      skipRef.current = false;
      const wait = (ms) =>
        new Promise((resolve) => {
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
      const play = r.plays[r.plays.length - 1];
      const st = {
        word: res.word,
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
      const float = (on, text, tone) => {
        st.floats = [...st.floats.slice(-6), { key: n++, on, text, tone }];
      };
      setPhase('scoring');
      show();
      sfx('lock', k);
      await wait(CASCADE.LOCK_MS);
      const letters = steps.filter((x) => x.kind === 'letter');
      for (const step of steps) {
        st.pts = step.runPts;
        st.mult = step.runMult;
        st.litTile = null;
        st.litItem = null;
        st.litSlot = null;
        if (step.kind === 'tier') {
          st.tier = step;
          show();
          await wait(CASCADE.TIER_MS);
        } else if (step.kind === 'letter') {
          const i = letters.indexOf(step);
          st.litTile = step.tile.id;
          float(
            step.tile.id,
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
          st.litItem = step.id;
          float(step.id, step.note, step.tone);
          sfx(step.kind === 'rule' ? 'rule' : 'item', step.tone);
          show();
          await wait(step.kind === 'rule' ? CASCADE.RULE_MS : CASCADE.ITEM_MS);
        } else if (step.kind === 'slot') {
          st.litSlot = step.tile.id;
          float(
            step.tile.id,
            step.tone === 'mult' ? '×' + step.ratio : '+' + step.pts,
            step.tone,
          );
          sfx('shimmer', step.slotKind);
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
      if (r.state === 'live') setPhase('live');
      else finish(r);
      refresh();
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [sfx, finish, refresh],
  );

  const playWord = useCallback(
    (raw) => {
      dispatchFight({
        type: 'fight/playWord',
        fight,
        phase,
        raw,
        say,
        sfx,
        markSeen,
        setWord,
        setSuggestions,
        describeBreakdown,
        runCascade,
      });
    },
    [phase, say, sfx, runCascade, markSeen],
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
        playWord(found[0].word);
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
    const ids = slots.filter(Boolean).map((t) => t.id);
    dispatchFight({
      type: 'fight/changeout',
      fight,
      phase,
      ids,
      say,
      sfx,
      markSeen,
      setWord,
      setSuggestions,
      refresh,
    });
  }, [slots, phase, say, refresh, sfx, markSeen]);

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

  const stageTile = (tile) => {
    captureFlipFrom(tile.id);
    sfx('tick', letters.length, 1);
    markSeen('rack');
    setWord(letters + (tile.letter === '?' ? '?' : tile.letter));
  };
  const unstageAt = (i) => {
    const t = slots[i];
    if (t) captureFlipFrom(t.id);
    sfx('tick', i, -1);
    markSeen('stick');
    setWord(letters.slice(0, i) + letters.slice(i + 1));
  };

  // Drag a tile along its row to reorder it -- the case and the stick both.
  // Every tile in the row is FLIPped so its neighbours slide aside; the
  // dragged tile slides in from where the finger let go of its ghost.
  const wordRef = useRef(letters);
  wordRef.current = letters;
  // While a drag is on, both rows are drawn in PREVIEW: the hollow tile stands
  // where the drop would put it, in whichever row the finger is over.
  const [preview, setPreview] = useState(null); // { id, fromRow, fromIndex, toRow, to } | null
  const playRef = useRef(null);
  const dragRef = useRef(null);
  if (!dragRef.current) {
    const flipAll = (id) => {
      const r = fight.current?.round;
      if (!r) return;
      r.rack.forEach((t) => {
        if (t.id !== id) captureFlipFrom(t.id);
      });
    };
    dragRef.current = createDragReorder({
      rows: () => ({
        rack: playRef.current.querySelector('.sb-rack'),
        stick: playRef.current.querySelector('.sb-stick'),
      }),
      onPreview: (p) => {
        flipAll(p.id);
        setPreview(p);
      },
      onSettle: (id, ghostRect) => {
        setPreview(null);
        if (id) pendingFlipFromRef.current[id] = ghostRect;
        refresh();
      },
      onDrop: (p, ghostRect) => {
        const r = fight.current?.round;
        if (!r) return;
        setPreview(null);
        if (p.id) pendingFlipFromRef.current[p.id] = ghostRect;
        sfx('tick', p.to, 0);
        const cur = wordRef.current;
        if (p.fromRow === 'rack') {
          const tile = r.rack[p.fromIndex];
          if (!tile) return;
          if (p.toRow === 'rack') {
            dispatchFight({ type: 'fight/moveTile', fight, fromIndex: p.fromIndex, to: p.to, refresh });
            return;
          }
          // Case -> stick: stage the letter at the finger's slot.
          const ch = tile.letter === '?' ? '?' : tile.letter;
          setWord(cur.slice(0, p.to) + ch + cur.slice(p.to));
          return;
        }
        if (p.fromIndex >= cur.length) return;
        const arr = cur.split('');
        const ch = arr.splice(p.fromIndex, 1)[0];
        if (p.toRow === 'stick') {
          arr.splice(p.to, 0, ch);
          setWord(arr.join(''));
          return;
        }
        // Stick -> case: send the tile home, to the slot the finger chose.
        setWord(arr.join(''));
        if (p.id) {
          const i = r.rack.findIndex((t) => t.id === p.id);
          if (i >= 0) {
            dispatchFight({ type: 'fight/moveTile', fromIndex: i, to: p.to, fight, refresh });
          } else {
            refresh();
          }
        }
      },
    });
  }
  const drag = dragRef.current;

  const setConst = (key, value) => {
    setTune((t) => ({ ...t, [key]: value }));
    dispatchFight({ type: 'fight/setTune', fight, key, value });
  };

  // Rows as drawn: the real order, or the drag's preview. Each entry carries
  // `hollow` (the tile being dragged) so the row can paint it as a hole.
  const moved = (arr, i, to) => {
    const a = arr.slice();
    const x = a.splice(i, 1)[0];
    a.splice(to, 0, x);
    return a;
  };
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
      arr[i] = { ...arr[i], picked: false, hollow: true };
      arr = moved(arr, i, preview.to);
    } else {
      arr[i] = { ...arr[i], picked: true };
    }
    return arr;
  })();
  const stickShown = (() => {
    let arr = slots.map((t, i) => ({ t, i, ch: letters[i], hollow: false }));
    if (!preview) return arr;
    if (preview.fromRow === 'stick') {
      if (preview.fromIndex >= arr.length) return arr;
      const x = { ...arr[preview.fromIndex], hollow: true };
      arr.splice(preview.fromIndex, 1);
      if (preview.toRow === 'stick') arr.splice(preview.to, 0, x);
    } else if (preview.toRow === 'stick' && round) {
      const t = round.rack.find((x) => x.id === preview.id);
      if (t)
        arr.splice(preview.to, 0, { t, i: -1, ch: t.letter, hollow: true });
    }
    return arr;
  })();

  const live = phase === 'live' && round;
  const showIntro = phase === 'live' && round && readyRound.current !== round;
  const enterFight = useCallback(() => {
    readyRound.current = round;
    refresh();
  }, [round, refresh]);
  const barredNow = live
    ? slots.filter(Boolean).filter((t) => round.isBarred(t))
    : [];
  const spelt = !!(
    live &&
    formable &&
    !barredNow.length &&
    round.isPlayable(letters)
  );
  const worthHow = spelt ? round.breakdownFor(letters) : null;
  const worth = worthHow ? worthHow.total : 0;
  const scoreShown = scoring ? scoring.scoreBase : round ? round.score : 0;
  const pct = round ? Math.min(100, (100 * scoreShown) / round.target) : 0;

  return (
    <div
      className={
        'sb is-phase-' +
        phase +
        (gearOpen ? ' is-gear-open' : '') +
        (phase === 'idle' ? ' is-title' : '')
      }
      onPointerDownCapture={scoring ? skipCascade : undefined}
    >
      <header className="sb-head">
        <div className="sb-wordmark">
          <span className="sb-eyebrow">
            {phase === 'idle'
              ? copy.TITLE_EYEBROW
              : copy.chapterLabel(SB.MOVEMENTS[run.movement].numeral) +
                ' · ' +
                SB.KIND_LABEL[run.enemy.kind] +
                (run.key && run.key !== 'c_major'
                  ? ' · ' + SB.KEY_DEFS[run.key].name
                  : '')}
          </span>
          <h1>
            Wordbound<span className="sb-amp">·</span>Crescendo
          </h1>
        </div>
        <button
          type="button"
          className="sb-gear"
          aria-label="Setup and tuning"
          title="Setup and tuning"
          onClick={() => dispatchGear({ type: 'gear/toggle' })}
        >
          ⚙
        </button>
      </header>

      {phase === 'idle' && (
        <TitleScreen
          SB={SB}
          keyUnlocked={keyUnlocked}
          keyId={key}
          setKey={setKey}
          writeKeyChoice={writeKeyChoice}
          seen={seen}
          markSeen={markSeen}
          characterId={characterId}
          setCharacterId={setCharacterId}
          start={start}
          randomSeed={randomSeed}
          best={best}
        />
      )}

      <RunStrip run={run} phase={phase} />

      <div className="sb-gear-panel">
        <section className="sb-setup">
          <label>
            Seed
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              style={{ width: 110 }}
            />
          </label>
          <div className="sb-bags" role="group" aria-label="Tile bag">
            <span className="sb-bags-head">Tile bag</span>
            <div className="sb-bag-row">
              {SB.TILE_BAGS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  title={b.blurb}
                  className={'sb-bag' + (b.id === bagId ? ' is-on' : '')}
                  onClick={() => setBagId(b.id)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
          <GearMeta SB={SB} keyUnlocked={keyUnlocked} discovered={discovered} />
          <label>
            Volume
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </label>
          <label className="sb-toggle" title="Tile, swap, shop and ink sounds">
            <input
              type="checkbox"
              checked={sfxOn}
              onChange={(e) => setSfxOn(e.target.checked)}
            />
            SFX
          </label>
          <label
            className="sb-toggle"
            title="Word suggestions, Best play, and Play settling for the best word in the letters"
          >
            <input
              type="checkbox"
              checked={helper}
              onChange={(e) => setHelper(e.target.checked)}
            />
            Word helper
          </label>
          <button type="button" className="sb-go" onClick={() => start()}>
            {phase === 'idle'
              ? 'Start with this seed'
              : 'Restart with this seed'}
          </button>
          {round && (
            <span className="sb-hint">
              <b>{round.pile.drawPile.length}</b> in the bag,{' '}
              <b>{round.pile.discardPile.length}</b> discarded, of{' '}
              {run.deck.length}
            </span>
          )}
        </section>

        <section className="sb-items" role="group" aria-label="Starting quills">
          <span className="sb-eyebrow">Starting quills · read at start</span>
          {SB.ITEMS.map((d) => {
            const id = d.id;
            return (
              <label
                key={id}
                className={'sb-item' + (itemIds.has(id) ? ' is-on' : '')}
                title={d.hint}
              >
                <input
                  type="checkbox"
                  checked={itemIds.has(id)}
                  onChange={(e) =>
                    setItemIds((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(id);
                      else next.delete(id);
                      return next;
                    })
                  }
                />
                {d.name}
                <em>{d.hint}</em>
              </label>
            );
          })}
          {run &&
            [...itemIds].sort().join() !==
              run.startItems.slice().sort().join() && (
              <em className="sb-bag-note">on restart</em>
            )}
        </section>
      </div>

      {round && (
        <section
          className={
            'sb-board' +
            (scoring && scoring.hit ? ' is-hit-' + scoring.hit : '')
          }
        >
          {showIntro ? (
            <div className="sb-intro">
              <div className="sb-enemy-line">
                <span className="sb-enemy">
                  {f.def.glyph} {f.def.name}
                </span>
                <span className="sb-piece">
                  {f.piece.title}
                  {f.piece.composer ? ' · ' + f.piece.composer : ''}
                </span>
              </div>
              <SituationPanel
                situation={SB.situationFor && SB.situationFor(round.situation)}
                ladderIndex={
                  SB.ladderIndex
                    ? SB.ladderIndex(
                        SB.situationFor(round.situation),
                        0,
                        round.target,
                      )
                    : 0
                }
              />
              {f.def.flavour && (
                <q className="sb-intro-flavour">{f.def.flavour}</q>
              )}
              {round.rule ? (
                <div className="sb-rule is-pulse">
                  <span className="sb-eyebrow">
                    Reading condition · {round.rule.name}
                  </span>
                  <b className="sb-rule-plain">{round.rule.plain}</b>
                  <q>{round.rule.text}</q>
                </div>
              ) : (
                <span className="sb-hint">Target {round.target}</span>
              )}
              <div className="sb-intro-row">
                <button type="button" className="sb-go" onClick={enterFight}>
                  Fight {f.def.name}
                </button>
                {round.favour && (
                  <button
                    type="button"
                    className="sb-skip-btn"
                    title={
                      SB.FAVOUR_DEFS[round.favour].name +
                      ': ' +
                      SB.FAVOUR_DEFS[round.favour].hint +
                      '. No shop after a skip.'
                    }
                    onClick={skipFight}
                  >
                    Walk past for <b>{SB.FAVOUR_DEFS[round.favour].name}</b>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div
                className="sb-scoreline"
                aria-label="Score against the target"
              >
                <span
                  className={
                    'sb-dyn-mark' +
                    (scoring && scoring.total != null ? ' is-hit' : '')
                  }
                >
                  {scoreShown}
                </span>
                <div className="sb-meter" aria-label="Progress to target">
                  <div
                    className={
                      'sb-meter-fill' +
                      (scoreShown >= round.target ? ' is-met' : '')
                    }
                    style={{ width: pct + '%' }}
                  />
                </div>
                <span className="sb-target">
                  <small>target</small>
                  {round.target}
                </span>
                <span className="sb-counters">
                  <span>
                    <b>{round.playsLeft}</b> word
                    {round.playsLeft === 1 ? '' : 's'}
                  </span>
                  <span
                    className={
                      seen.has('swap') || !live || round.changeoutsLeft <= 0
                        ? ''
                        : 'sb-callout-anchor'
                    }
                  >
                    <b>{round.changeoutsLeft}</b> swap
                    {round.changeoutsLeft === 1 ? '' : 's'}
                  </span>
                </span>
              </div>
              <div className="sb-enemy-line">
                <span className="sb-enemy">
                  {f.def.glyph} {f.def.name}
                </span>
                <span className="sb-piece">
                  {f.piece.title}
                  {f.piece.composer ? ' · ' + f.piece.composer : ''}
                </span>
              </div>
              <SituationPanel
                situation={SB.situationFor && SB.situationFor(round.situation)}
                ladderIndex={
                  SB.ladderIndex
                    ? SB.ladderIndex(
                        SB.situationFor(round.situation),
                        scoreShown,
                        round.target,
                      )
                    : 0
                }
              />
              {round.rule && (
                <div
                  className={
                    'sb-rule' +
                    (scoring && scoring.litItem === round.rule.id
                      ? ' is-flash'
                      : '') +
                    (!seen.has('boss') ? ' is-pulse' : '')
                  }
                >
                  {scoring &&
                    scoring.floats
                      .filter((x) => x.on === round.rule.id)
                      .map((x) => (
                        <i
                          key={x.key}
                          className={'sb-float sb-float-card is-' + x.tone}
                        >
                          {x.text}
                        </i>
                      ))}
                  <span className="sb-eyebrow">
                    Reading condition · {round.rule.name}
                  </span>
                  <b className="sb-rule-plain">{round.rule.plain}</b>
                  <q>{round.rule.text}</q>
                </div>
              )}
            </>
          )}
          {phase !== 'shop' && (
            <HeldRow
              run={run}
              SB={SB}
              act={act}
              live={phase === 'live'}
              onInk={useInk}
              cres={cres}
              lit={scoring ? scoring.litItem : null}
              floats={scoring ? scoring.floats : null}
              tip={tip}
              setTip={setTip}
            />
          )}
          {round.plays.length > (scoring && !scoring.cleared ? 1 : 0) && (
            <ol className="sb-plays">
              {(scoring && !scoring.cleared
                ? round.plays.slice(0, -1)
                : round.plays
              ).map((p, i) => (
                <li key={i}>
                  <span className="sb-plays-word">
                    {i === round.plays.length - 1 && p.tiles
                      ? p.tiles.map((t, j) => (
                          <i key={t.id} data-flip-tile-id={t.id}>
                            {p.word[j]}
                          </i>
                        ))
                      : p.word}
                  </span>
                  <span className="sb-plays-how">
                    {describeBreakdown(p.breakdown)}
                  </span>
                  <b className="sb-figure">{p.breakdown.total}</b>
                </li>
              ))}
            </ol>
          )}
          {phase === 'won' && (
            <div className="sb-outcome sb-win">
              Won — {round.ink} ink ({round.reward} +{' '}
              {round.tune.INK_PER_WORD_LEFT} × {round.playsLeft} word
              {round.playsLeft === 1 ? '' : 's'} left)
              {run.interestPreview() > 0 && (
                <> + {run.interestPreview()} interest</>
              )}
              .{' '}
              <button type="button" className="sb-go" onClick={nextStage}>
                {run.movement >= run.movements.length - 1 &&
                run.enemy.kind === 'boss'
                  ? 'Finish the run'
                  : 'To the shop'}
              </button>
            </div>
          )}
          {phase === 'letter' && run.letterChoice && (
            <div className="sb-outcome sb-letter-choice">
              <span className="sb-eyebrow">
                The boss falls — choose a letter to win back
              </span>
              <div className="sb-letter-row">
                {run.letterChoice.options.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className="sb-tile sb-letter-pick"
                    onClick={() => pickLetter(l)}
                  >
                    {l}
                    <sub>{W.Lexicon.LETTER_VALUES[l] || 0}</sub>
                  </button>
                ))}
              </div>
              <p className="sb-hint">
                It joins every future run’s bag, win or lose this one.
              </p>
            </div>
          )}
          {phase === 'shop' && run.shop && (
            <Shop
              run={run}
              SB={SB}
              act={act}
              leave={leaveShop}
              onInk={useInk}
              firstVisit={!seen.has('shop')}
              buyCard={buyCard}
              pickCard={pickCard}
              selecting={selecting}
              commitSelecting={commitSelecting}
              cancelSelecting={cancelSelecting}
              toggleSelectTile={toggleSelectTile}
              tip={tip}
              setTip={setTip}
            />
          )}
          {(phase === 'run-won' || phase === 'lost') && (
            <EndScreen
              run={run}
              won={phase === 'run-won'}
              SB={SB}
              seed={seed}
              best={best}
              onAgain={() => start(randomSeed())}
              onCopy={copySeed}
              onShare={copyResult}
              describe={describeBreakdown}
            />
          )}
        </section>
      )}

      {round &&
        !showIntro &&
        (phase === 'live' || phase === 'scoring' || phase === 'won') && (
          <PlayBoard
            ref={playRef}
            live={live}
            seen={seen}
            round={round}
            inking={inking}
            setInking={setInking}
            toggleInkTile={toggleInkTile}
            applyInk={applyInk}
            SB={SB}
            rackShown={rackShown}
            drag={drag}
            letters={letters}
            word={word}
            setWord={setWord}
            play={play}
            changeout={changeout}
            pickedIds={pickedIds}
            helper={helper}
            rackLetters={rackLetters}
            say={say}
            stageTile={stageTile}
            unstageAt={unstageAt}
            sfx={sfx}
            W={W}
            formable={formable}
            barredNow={barredNow}
            spelt={spelt}
            worthHow={worthHow}
            worth={worth}
            scoring={scoring}
            stickShown={stickShown}
            indexing={indexing}
            suggestions={suggestions}
            playWord={playWord}
            inputRef={inputRef}
          />
        )}

      <TuningPanel SB={SB} tune={tune} setConst={setConst} />

      {log.length > 0 && (
        <details className="sb-log">
          <summary>Log · {log[0]}</summary>
          <div className="sb-log-lines">
            {log.map((line, i) => (
              <div key={log.length - i}>{line}</div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
