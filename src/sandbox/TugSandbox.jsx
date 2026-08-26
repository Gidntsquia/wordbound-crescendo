// TUG SANDBOX -- one fight, nothing else.
//
// The whole app is this screen: pick an opponent, start, spell words. No menu,
// no map, no run, no rewards, no items/intents/shops/events/achievements/
// stolen letters. See src/sandbox/main.jsx for the short list of engine modules
// it loads, and src/sandbox/tugOfWar.js for the combat model, which is
// sandbox-owned and never touches js/wordbound/duel.js.
//
// VISUAL DIRECTION (see sandbox.css): the fight is words against music, so the
// screen is made of those two crafts. Left is a TYPECASE -- each word you spell
// is a slug of set type. Right is the PIT. Between them the tug bar is a
// five-line STAFF, printed in ink on paper where your words hold it and lit in
// brass where the pit holds it. Attacks are note heads riding that staff,
// pitched by weight. The hidden dB ramp is stated as a dynamics marking.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const RACK_SIZE = 7;

// TAP A TILE AND IT MOVES. Lifted from the pre-sandbox combat screen
// (src/components/CombatScreen.jsx, which lifted it from game.js in turn),
// because that is the thing the rack lost when this screen replaced a staging
// row with a text field: a tapped tile used to leave the case and TRAVEL, and
// a letter that just appears somewhere else reads as a typo rather than as a
// move you made.
//
// Plain FLIP: the caller records where the tile was BEFORE the state change,
// React re-renders it wherever it now belongs, and this puts the inverted
// offset on the new element and releases it into a real transition on the
// second frame. One frame is not enough -- the style has to be committed and
// the layout read back before the transition may be armed, or the browser
// coalesces both writes and nothing animates at all.
//
// Guarded exactly like its ancestors: reduced motion, no requestAnimationFrame
// (so it is inert under any headless DOM), or a sub-pixel move all bail out
// before touching a single style.
function flipTileTo(fromRect, toEl) {
  if (!fromRect || !toEl || typeof toEl.getBoundingClientRect !== 'function') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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

// Where the five staff lines sit, as a % of the bar's height. Note heads ride
// the same grid: nine slots from the top line to the bottom one.
const STAFF_TOP = 20;
const STAFF_STEP = 7.5;
// A NOTE'S SIZE IS ITS POWER. The whole point of drawing an attack early is
// that the player can price it before it lands, so heft is read straight off
// tug power and drives the notehead, its stem, the hairpin and how low on the
// staff it rides. NOTE_FULL_POWER is where the ladder tops out: a bit under
// the hardest hit the escalation can eventually produce, so late-fight swells
// saturate at "as big as it gets" instead of growing forever.
const NOTE_FULL_POWER = 30;
const NOTE_MIN_W = 11;
const NOTE_MAX_W = 34;
// Set so the opening bars' main crescendos (power ~13.5) already come in hot.
// They are the only thing on screen then and they are meant to look like the
// threat they are; later the swarm around them stays small and plain.
const NOTE_BIG_AT = 0.44;   // heft at which a hit gets the hot colour + hairpin
const STAFF_LINES = [0, 2, 4, 6, 8].map((slot) => STAFF_TOP + slot * STAFF_STEP);

// Opponents lifted from js/wordbound/monsters.js so the sandbox doesn't need
// monsters.js (which drags intents/loot/traits wiring with it). Only the piece
// matters here -- there is no enemy HP, the rope is the win condition.
// `recorded: true` means the piece is an audio file rather than sequenced note
// data, and is played by src/sandbox/audioPiece.js instead of the sequencer.
// That is a sandbox-only exception to the synthesized-only rule -- see the
// header of src/sandbox/recordedFurElise.js.
const OPPONENTS = [
  { id: 'bagatelle', name: 'The Bagatelle', glyph: '\u{1F339}', recorded: 'recordedFurElise' },
  { id: 'nocturne', name: 'The Nocturne', glyph: '\u{1F319}', recorded: 'recordedMoonlight' },
  { id: 'bagatelle-synth', name: 'The Bagatelle (synth)', glyph: '\u{1F3B9}', piece: 'furElise' },
  { id: 'gymnopediste', name: 'The Gymnopédiste', glyph: '\u{1FA70}', piece: 'gymnopedie1' },
  { id: 'gstring', name: 'The G String', glyph: '\u{1F3BB}', piece: 'airGString' },
  { id: 'morningmood', name: 'Morning Mood', glyph: '\u{1F305}', piece: 'morningMood' },
  { id: 'gnossienne', name: 'The Gnossienne', glyph: '\u{1F3B9}', piece: 'gnossienne1' },
  { id: 'invention', name: 'The Invention', glyph: '\u{1F3BC}', piece: 'invention4' },
  { id: 'metronome', name: 'The Metronome', glyph: '⏰', piece: 'czerny299' },
  { id: 'vowelmaw', name: 'The Vowelmaw', glyph: '\u{1F451}', piece: 'mountainKing' },
];

// The dB ramp is hidden from the player in the real game. Here it is stated the
// way a score states loudness, which is both honest and legible at a glance.
const DYNAMICS = [
  [1.5, 'pp'], [3, 'p'], [4.5, 'mp'], [6, 'mf'], [8, 'f'], [10, 'ff'],
];
// The log's name for a swell, on the same ladder the notehead is drawn from,
// so reading the log and watching the staff never disagree about what hit you.
function sizeWord(mag) {
  const m = mag == null ? 0.5 : mag;
  if (m < 0.2) return 'A ripple';
  if (m < 0.45) return 'A swell';
  if (m < 0.7) return 'A crescendo';
  if (m < 0.88) return 'A big crescendo';
  return 'A FORTISSIMO';
}

function dynamicMark(db) {
  for (let i = 0; i < DYNAMICS.length; i++) if (db < DYNAMICS[i][0]) return DYNAMICS[i][1];
  return 'fff';
}

const TUNE_LABELS = {
  PREP_SEC: 'Tacet before the pit comes in (s)',
  ROPE_START: 'Barline starts at (0-100)',
  WORD_VALUE_WEIGHT: 'Word · letter-value weight',
  WORD_LENGTH_WEIGHT: 'Word · length weight',
  WORD_LENGTH_EXP: 'Word · length exponent',
  SELF_SPELL_BONUS: 'Word · spelled it yourself ×',
  BLIND_PUSH_FREE_TILES: 'Blind push · tiles that cost nothing',
  BLIND_PUSH_LOCK_SEC: 'Blind push · lockout per extra tile (s)',
  PUSHER_RAMP_SEC: 'Type takes hold over (s)',
  PUSHER_LIFE_BASE: 'Type holds for (s)',
  PUSHER_LIFE_PER_LETTER: 'Type holds, extra per letter (s)',
  PUSHER_FADE_SEC: 'Type wears off over (s)',
  PLAYER_FORCE_SCALE: 'Push per pool point (/s)',
  ENEMY_DRONE: 'Pit drone (/s at full intensity)',
  ATTACK_POWER_BASE: 'Attack power base',
  CRESCENDO_MIN_MULT: 'Smallest swell in a piece ×',
  CRESCENDO_MAX_MULT: 'Biggest swell in a piece ×',
  ESCALATION_PER_MIN: 'Swell span stretches per minute',
  ESCALATION_MAX: 'Swell span stretch, ceiling',
  ATTACK_GATE_START: 'Smallest swell that swings, opening',
  ATTACK_GATE_END: 'Smallest swell that swings, late',
  ATTACK_GATE_SEC: 'Seconds to open the gate fully',
  ATTACK_MAX_QUIET_SEC: 'Gate may not silence the pit for (s)',
  CADENCE_SILENCE_SEC: 'Swing anyway if the piece is silent for (s)',
  ATTACK_TRAVEL_SEC: 'Telegraph lead (s)',
  ATTACK_EARLY_SEC: 'Hit lands before the peak (s)',
  ATTACK_MAX_LATE_SEC: 'Skip a swell announced later than (s)',
  ATTACK_IMPULSE_SCALE: 'Barline shove per power',
  ATTACK_CHIP_FACTOR: 'Type destroyed per power',
  DB_RATE: 'Loudness ramp (dB/s)',
  DB_MAX: 'Loudness cap (dB)',
  ENDLESS_RECENTRE_SEC: 'Endless · recentre barline every (s)',
};
const TUNE_STEPS = {
  PREP_SEC: 0.5, ROPE_START: 5, WORD_VALUE_WEIGHT: 0.1, WORD_LENGTH_WEIGHT: 0.1,
  WORD_LENGTH_EXP: 0.1, SELF_SPELL_BONUS: 0.05,
  BLIND_PUSH_FREE_TILES: 1, BLIND_PUSH_LOCK_SEC: 0.25,
  PUSHER_RAMP_SEC: 0.5, PLAYER_FORCE_SCALE: 0.005,
  PUSHER_LIFE_BASE: 1, PUSHER_LIFE_PER_LETTER: 0.5, PUSHER_FADE_SEC: 0.5,
  ENEMY_DRONE: 0.1, ATTACK_POWER_BASE: 0.5,
  CRESCENDO_MIN_MULT: 0.1, CRESCENDO_MAX_MULT: 0.1,
  ESCALATION_PER_MIN: 0.05, ESCALATION_MAX: 0.1,
  ATTACK_GATE_START: 0.05, ATTACK_GATE_END: 0.05, ATTACK_GATE_SEC: 5,
  ATTACK_MAX_QUIET_SEC: 0.5, CADENCE_SILENCE_SEC: 1,
  ATTACK_TRAVEL_SEC: 0.1, ATTACK_EARLY_SEC: 0.02, ATTACK_MAX_LATE_SEC: 0.02,
  ATTACK_IMPULSE_SCALE: 0.02, ATTACK_CHIP_FACTOR: 0.02,
  DB_RATE: 0.01, DB_MAX: 1,
  ENDLESS_RECENTRE_SEC: 0.5,
};

export default function TugSandbox() {
  const W = window.Wordbound;
  const SB = W.Sandbox;
  const fight = useRef(null);
  const [, forceRender] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | live | won | lost
  const [log, setLog] = useState([]);
  const [word, setWord] = useState('');
  const [opponentId, setOpponentId] = useState(OPPONENTS[0].id);
  const [seed, setSeed] = useState('sandbox');
  // Which letters this fight draws from (src/sandbox/tileBags.js). Read at
  // Start, like the seed: swapping the bag under a running fight would leave
  // the rack half from one case and half from another.
  const [bagId, setBagId] = useState('normal');
  const [tempo, setTempo] = useState(1);
  const [volume, setVolume] = useState(0.4);
  const [tune, setTune] = useState(() => ({ ...SB.TUG_DEFAULTS }));
  const [suggestions, setSuggestions] = useState([]);
  const [indexing, setIndexing] = useState(false);
  // WHO SPELLED THIS. True while the letters standing in the field were put
  // there by the word maker -- Best play filling it in, or a word taken off
  // the list. Any move the player makes themselves (a tile tapped either way,
  // a keystroke, Clear) puts it back to false, and a push made with it false
  // is worth SELF_SPELL_BONUS more. Deliberately provenance, not a re-read of
  // the letters: Best play fills the field with the winning word spelled
  // correctly, so "does this already spell something" would hand the bonus
  // straight back to the helper it is meant to price against.
  const [assisted, setAssisted] = useState(false);
  // Observation mode: nobody can be finished off, so a fight runs as long as
  // you want to watch it. Toggling it mid-fight takes effect immediately.
  const [invincible, setInvincible] = useState(false);
  // Bumped by every start. The frame loop keys off this as well as `phase`,
  // so pressing Restart ALWAYS spins up a fresh loop -- restarting while the
  // phase was already 'live' used to change no dependency at all, which is
  // why a fight that had stopped for any reason could only be fixed by
  // reloading the tab.
  const [runId, setRunId] = useState(0);
  const inputRef = useRef(null);

  // The FLIP half that lives in React: a click handler stashes the tile's rect
  // BEFORE it calls setWord (React schedules the re-render, so the DOM is still
  // showing the old position at that moment), and the layout effect below --
  // which runs after the commit and BEFORE the browser paints it -- re-finds
  // the same tile id on its new side and slides it in from the old one.
  //
  // This component re-renders every animation frame, so the effect is written
  // to cost nothing on the ~sixty commits a second where no tile moved.
  const pendingFlipFromRef = useRef({});
  function captureFlipFrom(tileId) {
    if (typeof document === 'undefined') return;
    const el = document.querySelector('[data-flip-tile-id="' + tileId + '"]');
    if (el && el.getBoundingClientRect) pendingFlipFromRef.current[tileId] = el.getBoundingClientRect();
  }
  useLayoutEffect(() => {
    const pending = pendingFlipFromRef.current;
    const ids = Object.keys(pending);
    if (!ids.length) return;
    ids.forEach((tileId) => {
      const fromRect = pending[tileId];
      delete pending[tileId];
      flipTileTo(fromRect, document.querySelector('[data-flip-tile-id="' + tileId + '"]'));
    });
  });

  const say = useCallback((line) => {
    setLog((prev) => [line, ...prev].slice(0, 60));
  }, []);

  // Build the anagram index once, off the critical path, so the first letter
  // typed already has rearrangements waiting for it.
  useEffect(() => {
    if (SB.isWordMakerReady()) return undefined;
    setIndexing(true);
    const id = setTimeout(() => {
      SB.warmWordMaker();
      setIndexing(false);
    }, 60);
    return () => clearTimeout(id);
  }, [SB]);

  // Start pulling the SELECTED opponent's audio down as soon as it is picked,
  // so a fight started a few seconds later does not open in silence waiting on
  // the fetch. Only the selected one: the recordings run to several MB each,
  // and warming all of them on mount spends the whole set's bandwidth to play
  // one of them. prefetchAudio caches per URL, so switching back is free.
  useEffect(() => {
    const def = OPPONENTS.find((o) => o.id === opponentId);
    const piece = def && def.recorded && SB[def.recorded];
    if (piece && piece.audio) {
      SB.prefetchAudio(piece.audio).catch(() => { /* the fight still runs */ });
    }
  }, [opponentId, SB]);

  const halt = useCallback((outcome, line) => {
    const f = fight.current;
    if (f) { f.seq.stop(); f.running = false; }
    setPhase(outcome);
    if (line) say(line);
  }, [say]);

  const start = useCallback(() => {
    if (fight.current) {
      // dispose, not just stop: the audio player owns a setInterval.
      if (fight.current.seq.dispose) fight.current.seq.dispose();
      else fight.current.seq.stop();
    }
    const def = OPPONENTS.find((o) => o.id === opponentId);
    const piece = def.recorded ? SB[def.recorded] : W.Pieces[def.piece];
    const rng = window.Game.RNG.create(seed);

    // The audio context is reused across fights, so it is also the thing that
    // can go stale while the tab sits: a closed one can never be revived and
    // every later fight built on it would be dead on arrival, so replace it.
    // A merely suspended one is asked to resume -- this runs inside the click,
    // which is the gesture browsers want to see.
    let ctx = fight.current?.ctx;
    let gain = fight.current?.gain;
    try {
      if (ctx && ctx.state === 'closed') { ctx = null; gain = null; }
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        gain = ctx.createGain();
        gain.connect(ctx.destination);
      }
      if (ctx.state !== 'running') ctx.resume().catch(() => { /* the loop keeps asking */ });
      gain.gain.value = volume;
    } catch (err) {
      say('Could not open the audio device: ' + (err && err.message ? err.message : err));
      return;
    }

    // NOT Tiles.createStarterDeck(): that is the shipped game's fixed opening
    // deck, meant to be added to between fights, and the sandbox has no
    // between-fights. A bag is the knob this screen actually needs -- how good
    // the letters are, held steady for a whole fight.
    const deck = SB.createBagDeck(bagId);
    const pile = { drawPile: W.Tiles.shuffleIntoDrawPile(deck, rng), discardPile: [] };
    const rack = W.Tiles.draw(pile, RACK_SIZE, rng);

    // A recorded piece is played back; a sequenced one is synthesized. Both
    // expose the same play/stop/on/setTempoScale/getIntensity/beatToTime
    // surface, so nothing below this line has to know which it got.
    // Both kinds of opponent are fronted by something that announces the
    // piece's swells the same way and the same distance ahead, in SECONDS: a
    // beat-counted warning is a different warning in every piece and changes
    // again with the tempo control.
    //
    // A SEQUENCED piece goes through createSequencedPiece rather than straight
    // to Music.createSequencer, because a stock sequencer only announces
    // `dynamics.crescendos` -- two or three hand-written markers per piece, and
    // for six of the eight sequenced opponents the first one is past 26 s or
    // absent outright. It wraps a stock sequencer and announces a swell list
    // derived from the piece's own notes instead (sequencedSurges.js), so the
    // pit answers a synthesized opponent as often as it answers a recording.
    const seq = piece.audio
      ? SB.createAudioPiece(ctx, gain, piece)
      : SB.createSequencedPiece(ctx, gain, piece, { leadSec: SB.TELEGRAPH_LEAD_SEC });
    const tug = SB.createTug({ tune });
    tug.invincible = invincible;

    tug.on('fight-start', () => say('The pit comes in.'));
    tug.on('attack-telegraphed', (a) => {
      if (a.kind === 'crescendo') say(sizeWord(a.mag) + ' building — ' + a.power.toFixed(1));
    });
    tug.on('attack-landed', (a) => say(
      (a.kind === 'crescendo' ? sizeWord(a.mag) : 'Stray swing')
      + ' hits ' + a.power.toFixed(1) + ' — barline at ' + tug.rope.toFixed(1)));
    // Endless puts the barline back rather than letting it park on an end. Only
    // the two END cases get a line. The routine clock fires every
    // ENDLESS_RECENTRE_SEC (1.5s = ~40 times a minute), and narrating that
    // buries the words and attacks the log exists to show -- while the HUD's
    // "centre in Xs" already announces the cycle before it happens.
    tug.on('rope-recentred', (e) => {
      if (e.reason === 'cycle') return;
      say(e.reason === 'top' ? 'The words ran it off the end — barline back to centre.'
        : 'The song ran it off the end — barline back to centre.');
    });
    tug.on('pusher-lost', (p) => say(p.word + ' silenced.'));
    tug.on('pusher-spent', (p) => say(p.word + (p.fading ? ' wears off.' : ' silenced.')));
    tug.on('won', () => halt('won', 'The words hold.'));
    tug.on('lost', () => halt('lost', 'The song wins.'));

    seq.on('crescendo-approaching', (c) => {
      const f = fight.current;
      if (!f) return;
      // `c` carries the swell's size (a recording's `mag`, a sequenced
      // piece's peakIntensity), which is what sets how hard the hit lands.
      f.tug.telegraphCrescendo(seq.beatToTime(c.peakBeat), f.ctx.currentTime, c);
    });
    // A recording that never arrived used to leave the fight running in total
    // silence with nothing on screen to say why.
    seq.on('load-failed', (err) => say(
      'The recording did not load (' + (err && err.message ? err.message : err)
      + ') — Restart to try again.'));
    // Loop the piece: a tug fight can outlast one performance, and a silent
    // opponent is not a fight.
    seq.on('piece-ended', () => {
      const f = fight.current;
      if (!f || !f.running) return;
      // Bursts still in the air were aimed at beats of the performance that
      // just ended. Restarting re-maps every beat, so cut them loose from the
      // piece's clock first -- otherwise they would chase the same beat number
      // into the new pass, minutes away. They land on the schedule they have.
      f.tug.forgetAttackBeats();
      seq.stop();
      seq.play();
      if (f.tempo !== 1) seq.setTempoScale(f.tempo);
    });

    const now = ctx.currentTime;
    tug.start(now);
    fight.current = {
      ctx, gain, rng, pile, rack, tug, seq, piece, def,
      bagId, tempo, lastNow: now, running: true,
    };
    seq.play();
    if (tempo !== 1) seq.setTempoScale(tempo);
    // Test hooks: verify-sandbox.js reads rope/force/db straight off the model
    // instead of scraping formatted numbers out of the DOM, and reads the
    // player to prove which KIND of piece is actually sounding.
    window.__tug = tug;
    window.__seq = seq;
    window.__piece = piece;
    setLog([]);
    setWord('');
    // ...and whatever the LAST fight's field was standing on. Restarting with
    // `assisted` still true from a Best play two fights ago would quietly cost
    // the first hand-spelled word of this one its bonus.
    setAssisted(false);
    setSuggestions([]);
    setPhase('live');
    setRunId((n) => n + 1);
    say(def.name + ' takes up ' + piece.title + '.');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [opponentId, seed, bagId, tempo, volume, tune, say, halt, W, SB, invincible]);

  // Per-frame loop: the barline integrates against the piece's live intensity.
  //
  // TWO WAYS THIS USED TO DIE FOR GOOD, both of which read as "the sandbox
  // stopped working until I refreshed the tab":
  //   - one throw inside a frame ended the loop, because the next frame was
  //     only ever scheduled by the line after the work;
  //   - the AudioContext coming back suspended froze ctx.currentTime, and the
  //     whole fight is integrated against that clock.
  // Neither can end a fight now: the frame catches, reports once and keeps
  // going, and a stalled clock is asked to resume every second until it does.
  useEffect(() => {
    if (phase !== 'live') return undefined;
    let raf = 0;
    let reported = false;
    let askedResumeAt = -99;
    const step = () => {
      const f = fight.current;
      if (!f || !f.running) return;   // the only deliberate way out
      try {
        if (f.ctx.state !== 'running') {
          const wall = performance.now() / 1000;
          if (wall - askedResumeAt > 1) {
            askedResumeAt = wall;
            f.ctx.resume().catch(() => { /* asked again next second */ });
          }
          // Do not integrate against a frozen clock -- just hold the frame.
          f.lastNow = f.ctx.currentTime;
        } else {
          const now = f.ctx.currentTime;
          const dt = Math.max(0, now - f.lastNow);
          f.lastNow = now;
          // Re-pin every burst still in the air to the beat it was aimed at
          // BEFORE integrating this frame. Changing the tempo re-anchors
          // playback, which moves the moment an announced peak actually sounds
          // at -- and a hit is only worth anything if it is still on its
          // crescendo afterwards.
          f.tug.resyncAttacks(f.seq.beatToTime);
          f.tug.tick(now, dt, f.seq.getIntensity());
        }
        forceRender((n) => n + 1);
      } catch (err) {
        if (!reported) {
          reported = true;
          say('A frame threw: ' + (err && err.message ? err.message : err)
            + ' — the fight keeps running.');
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, runId, say]);

  // A tab that has been sitting can come back with its audio suspended; the
  // frame loop handles the fight, this handles coming back to a stopped one so
  // the next Start is not spent waking the device up.
  useEffect(() => {
    const wake = () => {
      const f = fight.current;
      if (!f || document.hidden) return;
      if (f.ctx.state === 'suspended') f.ctx.resume().catch(() => {});
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    return () => {
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
    };
  }, []);

  // WHAT THE FIELD'S LETTERS ARE, and which rack tiles they are standing on.
  // Declared ABOVE the actions because the actions read them: a push has to
  // know whether the letters can actually be formed before it can decide
  // whether a failed push was a blind guess.
  const rackLetters = fight.current ? fight.current.rack.map((t) => t.letter).join('') : '';
  const letters = word.toUpperCase().replace(/[^A-Z?]/g, '');

  // Match the field's letters to REAL rack tiles, in order, so the composing
  // stick can show which tiles are set and a tap can send one specific tile
  // home. Exact letters are claimed first and blanks fill whatever is left --
  // the same rule Lexicon.canFormFromRack uses, and optimal, since a blank
  // covers anything. Written out here rather than called because that function
  // throws the WHOLE match away the moment one letter is missing, and this row
  // has to leave a hole instead: typing one letter you don't own must not
  // sweep every tile you already set back into the case.
  const slots = (() => {
    const fc = fight.current;
    if (!fc || !letters) return [];
    const out = new Array(letters.length).fill(null);
    const used = new Set();
    for (let i = 0; i < letters.length; i++) {
      const t = fc.rack.find((x) => !used.has(x.id) && x.letter === letters[i]);
      if (t) { out[i] = t; used.add(t.id); }
    }
    for (let i = 0; i < letters.length; i++) {
      if (out[i]) continue;
      const t = fc.rack.find((x) => !used.has(x.id) && x.letter === '?');
      if (t) { out[i] = t; used.add(t.id); }
    }
    return out;
  })();
  const pickedIds = new Set(slots.filter(Boolean).map((t) => t.id));
  const formable = !letters || pickedIds.size === letters.length;

  const playWord = useCallback((raw, opts) => {
    const f = fight.current;
    if (!f || phase !== 'live') return;
    const upper = String(raw || '').trim().toUpperCase();
    if (!upper) return;
    if (!W.Lexicon.isValidWord(upper)) { say(upper + ' isn\u2019t in the dictionary.'); return; }
    const form = W.Lexicon.canFormFromRack(upper, f.rack);
    if (!form.possible) { say(upper + ' needs letters you don\u2019t have.'); return; }

    W.Lexicon.removeTiles(f.rack, form.tilesUsed);
    f.pile.discardPile.push(...form.tilesUsed);
    const need = RACK_SIZE - f.rack.length;
    if (need > 0) f.rack.push(...W.Tiles.draw(f.pile, need, f.rng));

    // Set BY HAND if the player assembled these letters themselves. See
    // `assisted` for what counts as a hand -- and note the flag is cleared
    // here as well as the field, so the next word starts from a clean slate.
    const byHand = !!(opts && opts.self);
    const pusher = f.tug.addWord(upper, { self: byHand });
    // Only a word that actually went in clears the field. A rejected push
    // leaves the type standing in the stick, because the tiles are now
    // physically sitting there and dumping them back into the case over a
    // spelling the player is mid-way through fixing is the worst thing this
    // screen could do to them.
    setWord('');
    setAssisted(false);
    setSuggestions([]);
    say(upper + (byHand ? ' set by hand \u2014 ' : ' set \u2014 ')
      + pusher.strength.toFixed(1) + ' push'
      + (byHand ? ' (\u00d7' + f.tug.tune.SELF_SPELL_BONUS + ' for spelling it yourself)' : '')
      + ', pool ' + f.tug.poolStrength().toFixed(1) + '.');
  }, [phase, say, W]);

  // Enter plays what you typed if it is already a word; otherwise it sends the
  // strongest rearrangement of the same letters. Either way one key ends the
  // turn -- you never have to spell it correctly yourself.
  //
  // ...and if the letters spell NOTHING, in any order, that is a blind push:
  // the press is refused and pushing is locked for a moment that grows with
  // how many tiles were thrown at it (BLIND_PUSH_* in tugOfWar.js). Assembling
  // is never locked -- only the press is.
  const sendBest = useCallback(() => {
    const f = fight.current;
    if (!f || phase !== 'live') return;
    const left = f.tug.pushLockLeft();
    if (left > 0) { say('Still locked \u2014 ' + left.toFixed(1) + 's before you can push.'); return; }
    const typed = letters;
    if (!typed) return;
    // The hand path: these letters, in this order, already spell a word.
    if (W.Lexicon.isValidWord(typed)) { playWord(typed, { self: !assisted }); return; }
    // The maker's path: the best rearrangement of the SAME letters. Computed
    // here rather than read off `suggestions`, which is a render behind and
    // would otherwise be able to hand out a lockout the letters didn't earn.
    const found = SB.findWords(typed, (w) => f.tug.wordStrength(w), 1);
    if (found.length > 0) { playWord(found[0].word, { self: false }); return; }
    // Nothing at all. Letters you don't even hold are a typo, not a blind
    // push, and cost nothing.
    if (!formable) { say(typed + ' needs letters that aren\u2019t in your rack.'); return; }
    const secs = f.tug.lockPush(typed.length);
    if (secs > 0) {
      say(typed + ' spells nothing \u2014 ' + typed.length + ' tiles, pushing locked for '
        + secs.toFixed(1) + 's.');
    } else {
      say('Nothing spells out of ' + typed + '.');
    }
  }, [letters, formable, assisted, phase, playWord, say, W, SB]);

  const newRack = useCallback(() => {
    const f = fight.current;
    if (!f || phase !== 'live') return;
    f.pile.discardPile.push(...f.rack);
    f.rack.length = 0;
    f.rack.push(...W.Tiles.draw(f.pile, RACK_SIZE, f.rng));
    // The tiles the stick was holding no longer exist, so the field cannot
    // keep standing on them.
    setWord('');
    setAssisted(false);
    setSuggestions([]);
    say('New rack drawn \u2014 free in the sandbox.');
  }, [phase, say, W]);

  // Live rearrangements of exactly the letters currently selected. Type DISTGE
  // and DIGEST is waiting under the field; Enter sends the best one.
  useEffect(() => {
    if (!letters || indexing) { setSuggestions([]); return; }
    const scoreOf = fight.current
      ? (w) => fight.current.tug.wordStrength(w)
      : (w) => w.length;
    setSuggestions(SB.findWords(letters, scoreOf, 10));
  }, [letters, indexing, SB]);

  // TAPPING TILES. Everything the player does by hand goes through these two,
  // and both capture the tile's CURRENT screen position first so the layout
  // effect below can slide it from there to wherever it lands -- see
  // flipTileTo's own note. Both also clear `assisted`: the moment you move a
  // tile yourself, the word standing in the stick is yours, whatever put the
  // first letters there.
  const stageTile = (tile) => {
    captureFlipFrom(tile.id);
    setWord(letters + (tile.letter === '?' ? '?' : tile.letter));
    setAssisted(false);
  };

  // Send one SPECIFIC position home, not "the last tile with this letter" --
  // with real tiles in a row, the one you tapped is the one that must move.
  const unstageAt = (i) => {
    const t = slots[i];
    if (t) captureFlipFrom(t.id);
    setWord(letters.slice(0, i) + letters.slice(i + 1));
    setAssisted(false);
  };


  const setConst = (key, value) => {
    setTune((t) => ({ ...t, [key]: value }));
    if (fight.current) fight.current.tug.tune[key] = value;
  };

  const f = fight.current;
  const live = phase === 'live' && f;
  const tug = f ? f.tug : null;
  const now = f ? f.ctx.currentTime : 0;
  const rope = tug ? tug.rope : tune.ROPE_START;
  const db = tug ? tug.db : 0;
  const tacetLeft = tug && tug.phase === 'prep' ? Math.max(0, tune.PREP_SEC - tug.elapsed) : 0;
  const struck = tug ? now - tug.lastHitAt < 0.26 : false;
  // Both in the model's own elapsed seconds: the flash on a recentre, and how
  // long the next one is, so a jump is legible before as well as after it.
  const recentred = tug ? tug.elapsed - tug.lastRecentreAt < 0.45 : false;
  const recentreIn = tug && tug.invincible && tug.phase === 'fight'
    && tug.tune.ENDLESS_RECENTRE_SEC > 0
    ? Math.max(0, tug.tune.ENDLESS_RECENTRE_SEC - (tug.elapsed - tug.recentreAnchor))
    : null;
  const intensity = tug ? Math.min(1, tug.smoothIntensity) : 0;
  // The blind-push lockout, counted down live -- this component already
  // re-renders every frame, so the number on the button is the model's own.
  const lockLeft = tug ? tug.pushLockLeft() : 0;
  const locked = live && lockLeft > 0;
  // What the letters standing in the stick would actually bank if pushed now,
  // WITH the hand-set bonus if it has been earned. The bonus is invisible
  // otherwise: it is a multiplier applied at the moment of play, and a player
  // has no way to notice a number they never saw the other version of.
  const spelt = !!(live && formable && letters.length >= 2
    && W.Lexicon.isValidWord(letters));
  const spentWorth = spelt
    ? tug.wordStrength(letters) * (assisted ? 1 : tug.tune.SELF_SPELL_BONUS)
    : 0;

  const slugs = useMemo(() => {
    if (!tug) return [];
    return tug.pushers.slice().sort((a, b) => b.hp - a.hp);
  }, [tug, tug ? tug.pushers.length : 0, rope]);

  return (
    <div className="sb">
      <header className="sb-head">
        <div className="sb-wordmark">
          <span className="sb-eyebrow">Duel sandbox · one fight</span>
          <h1>Wordbound<span className="sb-amp">·</span>Crescendo</h1>
        </div>
        <div className="sb-dyn">
          <span className="sb-dyn-label">Stage volume</span>
          <span className="sb-dyn-mark" title={db.toFixed(1) + ' dB'}>{dynamicMark(db)}</span>
        </div>
      </header>

      <section className="sb-setup">
        <label>Opponent
          <select value={opponentId} onChange={(e) => setOpponentId(e.target.value)}>
            {OPPONENTS.map((o) => <option key={o.id} value={o.id}>{o.glyph} {o.name}</option>)}
          </select>
        </label>
        {/* Three buttons, not a dropdown: the whole point of the bag knob is
            A/B-ing one case against another on the SAME seed, and a dropdown
            makes each swap a click, a read and a second click. Laid out
            weak..strong left to right, the order TILE_BAGS is written in, so
            the row itself says which way is stronger. Still read at Start
            (see bagId's declaration), so a swap under a live fight is marked
            pending rather than silently doing nothing. */}
        <div className="sb-bags" role="group" aria-label="Tile bag">
          <span className="sb-bags-head">
            Tile bag
            {f && f.bagId !== bagId && <em className="sb-bag-note">on restart</em>}
          </span>
          <div className="sb-bag-row">
            {SB.TILE_BAGS.map((b) => (
              <button key={b.id} type="button"
                className={'sb-bag' + (b.id === bagId ? ' is-on' : '')}
                aria-pressed={b.id === bagId}
                title={b.blurb}
                onClick={() => setBagId(b.id)}>{b.label}</button>
            ))}
          </div>
        </div>
        <label>Seed
          <input value={seed} onChange={(e) => setSeed(e.target.value)} size={9} />
        </label>
        <label>Tempo ×{tempo.toFixed(2)}
          <input type="range" min={0.4} max={1.6} step={0.05} value={tempo}
            onChange={(e) => {
              const v = Number(e.target.value);
              setTempo(v);
              if (fight.current && fight.current.running) {
                fight.current.tempo = v;
                fight.current.seq.setTempoScale(v);
              }
            }} />
        </label>
        <label>Volume
          <input type="range" min={0} max={1} step={0.05} value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              if (fight.current) fight.current.gain.gain.value = v;
            }} />
        </label>
        <button type="button" className="sb-go" onClick={start}>
          {phase === 'idle' ? 'Start fight' : 'Restart'}
        </button>
        {live && <button type="button" onClick={() => halt('idle', 'Stopped.')}>Stop</button>}
        <button type="button"
          className={'sb-invuln' + (invincible ? ' is-on' : '')}
          aria-pressed={invincible}
          title="Neither side can be finished off, so the round runs until you stop it. The barline is put back to centre on a clock, and at once if it reaches an end."
          onClick={() => {
            const v = !invincible;
            setInvincible(v);
            if (fight.current) fight.current.tug.invincible = v;
            say(v ? 'Da capo senza fine — nobody can be finished off.'
                  : 'Back to a real fight.');
          }}>
          {invincible ? 'Endless: on' : 'Endless: off'}
        </button>
      </section>

      {f && (
        <section className="sb-field">
          <aside className="sb-typecase">
            <div className="sb-panel-head">
              <span className="sb-eyebrow">The typecase</span>
              <span className="sb-figure sb-pool-total">{tug.poolStrength().toFixed(0)}</span>
            </div>
            <div className="sb-slugs">
              {slugs.length === 0 && <p className="sb-empty">Spell a word to start pushing.</p>}
              {slugs.map((p) => {
                const ramp = tug.pusherRamp(p);
                const fade = tug.pusherFade(p);
                // Two different ways a word stops pushing, and they should not
                // look alike: chipped by an attack, or simply spent. WHO SET
                // IT is a third, independent thing, so it gets its own channel
                // -- the fill is rubric red for a word the player spelled
                // themselves, while the left rule goes on carrying damage.
                const cls = 'sb-slug'
                  + (p.self ? ' is-self' : '')
                  + (fade < 1 ? ' is-spent' : (p.hp < p.strength ? ' is-hurt' : ''));
                return (
                  <div key={p.id} className={cls}>
                    <span className="sb-slug-set" style={{ width: (100 * ramp * fade) + '%' }} />
                    <span className="sb-slug-word">
                      {p.self && <i className="sb-slug-mark" title="Spelled by hand">✱</i>}
                      {p.word}
                    </span>
                    <span className="sb-slug-str">
                      {ramp < 1 ? 'setting' : fade < 1 ? 'wearing off' : p.hp.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="sb-arena">
            <div className={'sb-rope' + (struck ? ' is-hit' : '')
              + (recentred ? ' is-recentred' : '')}>
              <div className="sb-paper" style={{ width: rope + '%' }}>
                {tug.pushers.length > 0 && (
                  <div className="sb-imprint">
                    {tug.pushers.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && ' · '}
                        {i === tug.pushers.length - 1 ? <b>{p.word}</b> : p.word}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="sb-staff sb-staff--pit">
                {STAFF_LINES.map((top) => (
                  <span key={top} className="sb-staff-line" style={{ top: top + '%' }} />
                ))}
              </div>
              <div className="sb-staff sb-staff--ink"
                style={{ clipPath: 'inset(0 ' + (100 - rope) + '% 0 0)' }}>
                {STAFF_LINES.map((top) => (
                  <span key={top} className="sb-staff-line" style={{ top: top + '%' }} />
                ))}
              </div>

              {tug.attacks.map((a) => {
                const span = Math.max(0.001, a.landAt - a.spawnAt);
                const progress = Math.max(0, Math.min(1, (now - a.spawnAt) / span));
                // Eased IN, not linear. The note goes out while the music is
                // still quiet, hangs at the edge through the build, and covers
                // most of the distance in the last second -- so it arrives with
                // the swell instead of drifting across ahead of it. It lands on
                // the peak either way; this is what makes that landing read.
                const rush = Math.pow(progress, 1.9);
                const left = rope + (98.5 - rope) * (1 - rush);
                // ...and swells into the hit, the last few frames only.
                const arrive = 1 + 0.4 * Math.pow(progress, 4);
                // Everything below is one number. A note that looks twice the
                // size of the last one is carrying roughly twice the shove.
                const heft = Math.max(0, Math.min(1, a.power / NOTE_FULL_POWER));
                const w = (NOTE_MIN_W + (NOTE_MAX_W - NOTE_MIN_W) * heft) * arrive;
                const h = w * 0.72;
                const big = heft >= NOTE_BIG_AT;
                // Heavier hits sit lower on the staff, the way a bass note does.
                const slot = Math.max(0, Math.min(8, Math.round(heft * 8)));
                const top = STAFF_TOP + slot * STAFF_STEP;
                const hairpin = (16 + 42 * rush) * (0.6 + 0.9 * heft);
                return (
                  <span key={a.id}>
                    {big && (
                      <svg className="sb-hairpin" width={hairpin} height={h * 2.4}
                        style={{ left: left + '%', top: top + '%', marginTop: -h * 1.2 + 'px' }}
                        aria-hidden="true">
                        <line x1="0" y1={h * 1.2} x2={hairpin} y2={h * 0.1} />
                        <line x1="0" y1={h * 1.2} x2={hairpin} y2={h * 2.3} />
                      </svg>
                    )}
                    <span className={'sb-flynote' + (big ? ' is-big' : '')}
                      style={{
                        left: left + '%',
                        top: top + '%',
                        width: w + 'px',
                        height: h + 'px',
                        marginTop: -h / 2 + 'px',
                        marginLeft: -w / 2 + 'px',
                        '--stem': (h * 2.9) + 'px',
                        opacity: 0.45 + 0.55 * progress,
                      }} />
                  </span>
                );
              })}

              <div className="sb-barline" style={{ left: rope + '%' }} />

              {tug.phase === 'prep' && (
                <div className="sb-tacet">
                  <span className="sb-tacet-word">tacet</span>
                  <span className="sb-tacet-count">{tacetLeft.toFixed(1)}s before the pit comes in</span>
                </div>
              )}
              {phase === 'won' && <div className="sb-outcome sb-win">The words hold.</div>}
              {phase === 'lost' && <div className="sb-outcome sb-lose">The song wins.</div>}
              {invincible && live && (
                <div className="sb-endless">
                  endless{recentreIn != null ? ' · centre in ' + recentreIn.toFixed(1) + 's' : ''}
                </div>
              )}
            </div>

            <div className="sb-readout">
              <span><b>Barline</b>{rope.toFixed(1)}</span>
              <span className="sb-words"><b>Words</b>+{tug.playerForce().toFixed(2)}/s</span>
              <span className="sb-song"><b>Song</b>−{tug.enemyForce().toFixed(2)}/s</span>
              <span><b>Intensity</b>{intensity.toFixed(2)}</span>
              <span><b>Elapsed</b>{tug.fightElapsed.toFixed(0)}s</span>
            </div>
          </div>

          <aside className="sb-pit">
            <div className="sb-panel-head"><span className="sb-eyebrow">The pit</span></div>
            <div className="sb-glyph">{f.def.glyph}</div>
            <div className="sb-pit-name">{f.def.name}</div>
            <div className="sb-pit-piece">{f.piece.title}</div>
            {/* A live hairpin: it opens as the piece gets louder. */}
            <svg className="sb-hairpin-live" viewBox="0 0 100 26" width="100%" height="26"
              preserveAspectRatio="none" aria-hidden="true">
              <line x1="2" y1="13" x2="98" y2={13 - (2 + 10 * intensity)} />
              <line x1="2" y1="13" x2="98" y2={13 + (2 + 10 * intensity)} />
            </svg>
            <div className="sb-pit-foot">+{db.toFixed(1)} dB · ×{tug.dbMultiplier().toFixed(2)}</div>
          </aside>
        </section>
      )}

      {f && (
        <section className="sb-play">
          {/* THE CASE. A tile the stick is holding leaves a hollow slot behind
              rather than closing the gap: the rack must not reshuffle itself
              under the player's finger mid-word, and the slot is where that
              tile comes home to. `data-flip-tile-id` is what the FLIP finds the
              tile by on both sides of the move -- a name of its own, not the
              tile id, so nothing else can start animating these. */}
          <div className="sb-rack">
            {f.rack.map((t) => (pickedIds.has(t.id) ? (
              <span key={t.id} className="sb-tile is-slot" aria-hidden="true" />
            ) : (
              <button key={t.id} type="button" disabled={!live}
                className="sb-tile" data-flip-tile-id={t.id}
                onClick={() => stageTile(t)}>
                {t.letter === '?' ? '␣' : t.letter}
                <sub>{W.Lexicon.LETTER_VALUES[t.letter] || 0}</sub>
              </button>
            )))}
          </div>

          {/* THE COMPOSING STICK -- the play area a tapped tile slides down
              into, and the thing this screen was missing. Its contents are
              derived from the field (see `slots`), so typing, tapping and
              backspacing all move the same type around; what the row adds is
              that a letter you played is a TILE you can see leave the case and
              a specific tile you can tap to send back, instead of a character
              appearing in a text box. */}
          <div className="sb-stick-wrap">
            <div className="sb-stick-head">
              <span className="sb-eyebrow">The composing stick</span>
              {spelt && (
                <span className={'sb-stick-worth' + (assisted ? '' : ' is-hand')}>
                  <b className="sb-figure">{spentWorth.toFixed(1)}</b>
                  {assisted ? 'off the list' : 'spelled by hand'}
                </span>
              )}
            </div>
            <div className={'sb-stick' + (formable ? '' : ' is-short')}>
              {letters.length === 0 && (
                <span className="sb-stick-empty">tap the case, or type</span>
              )}
              {slots.map((t, i) => (t ? (
                <button key={t.id} type="button" disabled={!live}
                  className="sb-tile is-set" data-flip-tile-id={t.id}
                  title="Send this tile home"
                  onClick={() => unstageAt(i)}>
                  {t.letter === '?' ? (letters[i] === '?' ? '␣' : letters[i]) : t.letter}
                  <sub>{W.Lexicon.LETTER_VALUES[t.letter] || 0}</sub>
                </button>
              ) : (
                <button key={'gap' + i} type="button" disabled={!live}
                  className="sb-tile is-missing"
                  title="No tile in the case spells this"
                  onClick={() => unstageAt(i)}>
                  {letters[i]}
                </button>
              )))}
            </div>
          </div>

          <div className="sb-input">
            <input ref={inputRef} value={word} disabled={!live}
              className={formable ? '' : 'is-unformable'}
              placeholder="Tap the case, or type letters"
              onChange={(e) => { setWord(e.target.value); setAssisted(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') sendBest(); }} />
            {/* Locked is a state of the PUSH, never of the stick: the button
                counts itself down while tiles, typing and the word list all
                stay live. See BLIND_PUSH_* in tugOfWar.js. */}
            <button type="button" className={'sb-go' + (locked ? ' is-locked' : '')}
              onClick={sendBest} disabled={!live || locked}
              title={locked ? 'Blind push — locked until this runs out' : undefined}
              aria-label={locked
                ? 'Push locked for ' + lockLeft.toFixed(1) + ' more seconds'
                : undefined}>
              {locked ? lockLeft.toFixed(1) + 's' : 'Push'}
            </button>
            <button type="button"
              onClick={() => { setWord(''); setAssisted(false); }}
              disabled={!live}>Clear</button>
            <button type="button" onClick={() => {
              const scoreOf = fight.current
                ? (w) => fight.current.tug.wordStrength(w)
                : (w) => w.length;
              const best = SB.bestFromRack(rackLetters, scoreOf, 1);
              // Fill with the winning word's letters, not the whole rack: the
              // field is an exact-letters field now, so handing it seven tiles
              // that spell nothing would just show "no word".
              // ...and mark the word as the LIST's, not the player's: it came
              // out of the dictionary spelled correctly, so it must not collect
              // the bonus for spelling it yourself.
              if (best.length) { setWord(best[0].word); setAssisted(true); }
              else say('Nothing spells out of this rack.');
            }} disabled={!live}>Best play</button>
            <button type="button" onClick={newRack} disabled={!live}>New rack</button>
          </div>

          {/* THE WORD LIST, PUT AWAY. Ten rearrangements of your letters
              standing open under the field is a solved puzzle sitting where the
              puzzle should be, and it pushed the fight itself off the screen on
              a short window. Collapsed, the summary still carries the one thing
              you need at a glance -- how many words are in there and what the
              best one is worth -- and Enter still sends that word without ever
              opening the drawer. Uncontrolled <details>: this component
              re-renders every animation frame, and React only drives `open`
              when it is passed as a prop, so leaving it off is what lets the
              drawer stay open across sixty renders a second. */}
          <details className="sb-suggests-drop">
            <summary>
              <span className="sb-suggests-title">Words</span>
              {indexing && <span className="sb-hint">reading the dictionary…</span>}
              {!indexing && !letters
                && <span className="sb-hint">pick tiles or type letters</span>}
              {!indexing && letters && suggestions.length === 0
                && <span className="sb-hint">nothing spells out of {letters}</span>}
              {!indexing && suggestions.length > 0 && (
                <span className="sb-suggests-count">
                  {suggestions.length}
                  <b>{suggestions[0].word}</b>
                  <em>{suggestions[0].score.toFixed(0)}</em>
                </span>
              )}
            </summary>
            <div className="sb-suggests">
              {!indexing && suggestions.map((s, i) => (
                <button key={s.word} type="button"
                  className={'sb-suggest' + (i === 0 ? ' is-best' : '')}
                  onClick={() => playWord(s.word, { self: false })}
                  disabled={!live || locked}>
                  {s.word}<em>{s.score.toFixed(0)}</em>
                </button>
              ))}
              {!indexing && suggestions.length === 0
                && <span className="sb-hint">Every word your letters spell shows up here, strongest first. Enter sends the best one.</span>}
            </div>
          </details>
          {!formable && letters
            && <p className="sb-hint sb-warn-line">{letters} needs letters that aren’t in your rack.</p>}
        </section>
      )}

      <details className="sb-tune">
        <summary>Tuning · every constant, live</summary>
        <div className="sb-tune-grid">
          {Object.keys(SB.TUG_DEFAULTS).map((key) => (
            <label key={key}>{TUNE_LABELS[key] || key}
              <input type="number" step={TUNE_STEPS[key] || 0.1} value={tune[key]}
                onChange={(e) => setConst(key, Number(e.target.value))} />
            </label>
          ))}
        </div>
        <p className="sb-tune-note">
          Changes reach the running fight on the next frame. Barline start and tacet
          length take effect on the next restart. Nothing is saved — copy the numbers
          you want to keep into src/sandbox/tugOfWar.js.
        </p>
      </details>

      <section className="sb-log">
        {log.map((line, i) => <div key={log.length - i}>{line}</div>)}
      </section>
    </div>
  );
}
