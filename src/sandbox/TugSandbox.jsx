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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const RACK_SIZE = 7;

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
  WORD_LENGTH_EXP: 0.1, PUSHER_RAMP_SEC: 0.5, PLAYER_FORCE_SCALE: 0.005,
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

  const playWord = useCallback((raw) => {
    const f = fight.current;
    if (!f || phase !== 'live') return;
    const upper = String(raw || '').trim().toUpperCase();
    setWord('');
    if (!upper) return;
    if (!W.Lexicon.isValidWord(upper)) { say(upper + ' isn’t in the dictionary.'); return; }
    const form = W.Lexicon.canFormFromRack(upper, f.rack);
    if (!form.possible) { say(upper + ' needs letters you don’t have.'); return; }

    W.Lexicon.removeTiles(f.rack, form.tilesUsed);
    f.pile.discardPile.push(...form.tilesUsed);
    const need = RACK_SIZE - f.rack.length;
    if (need > 0) f.rack.push(...W.Tiles.draw(f.pile, need, f.rng));

    const pusher = f.tug.addWord(upper);
    setSuggestions([]);
    say(upper + ' set — ' + pusher.strength.toFixed(1) + ' push, pool '
      + f.tug.poolStrength().toFixed(1) + '.');
  }, [phase, say, W]);

  // Enter plays what you typed if it is already a word; otherwise it sends the
  // strongest rearrangement of the same letters. Either way one key ends the
  // turn -- you never have to spell it correctly yourself.
  const sendBest = useCallback(() => {
    const f = fight.current;
    if (!f || phase !== 'live') return;
    const typed = word.trim().toUpperCase();
    if (typed && W.Lexicon.isValidWord(typed)) { playWord(typed); return; }
    if (suggestions.length > 0) { playWord(suggestions[0].word); return; }
    if (typed) say('Nothing spells out of ' + typed + '.');
  }, [word, suggestions, phase, playWord, say, W]);

  const newRack = useCallback(() => {
    const f = fight.current;
    if (!f || phase !== 'live') return;
    f.pile.discardPile.push(...f.rack);
    f.rack.length = 0;
    f.rack.push(...W.Tiles.draw(f.pile, RACK_SIZE, f.rng));
    setSuggestions([]);
    say('New rack drawn — free in the sandbox.');
  }, [phase, say, W]);

  const rackLetters = fight.current ? fight.current.rack.map((t) => t.letter).join('') : '';
  const letters = word.toUpperCase().replace(/[^A-Z?]/g, '');

  // Live rearrangements of exactly the letters currently selected. Type DISTGE
  // and DIGEST is waiting under the field; Enter sends the best one.
  useEffect(() => {
    if (!letters || indexing) { setSuggestions([]); return; }
    const scoreOf = fight.current
      ? (w) => fight.current.tug.wordStrength(w)
      : (w) => w.length;
    setSuggestions(SB.findWords(letters, scoreOf, 10));
  }, [letters, indexing, SB]);

  // Which rack tiles the current letters consume, so the rack can show what is
  // picked up and clicking a picked tile can put it back.
  const pickedIds = (() => {
    const fc = fight.current;
    if (!fc || !letters) return new Set();
    const form = W.Lexicon.canFormFromRack(letters, fc.rack);
    return form.possible ? new Set(form.tilesUsed.map((t) => t.id)) : new Set();
  })();
  const formable = !letters || pickedIds.size === letters.length;

  const toggleTile = (tile) => {
    const letter = tile.letter === '?' ? '?' : tile.letter;
    if (pickedIds.has(tile.id)) {
      const at = word.toUpperCase().lastIndexOf(letter);
      if (at >= 0) setWord(word.slice(0, at) + word.slice(at + 1));
      return;
    }
    setWord(word + letter);
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
        <label title={SB.getTileBag(bagId).blurb}>Tile bag
          <select value={bagId} onChange={(e) => setBagId(e.target.value)}>
            {SB.TILE_BAGS.map((b) => (
              <option key={b.id} value={b.id} title={b.blurb}>{b.label}</option>
            ))}
          </select>
        </label>
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
                // look alike: chipped by an attack, or simply spent.
                const cls = 'sb-slug'
                  + (fade < 1 ? ' is-spent' : (p.hp < p.strength ? ' is-hurt' : ''));
                return (
                  <div key={p.id} className={cls}>
                    <span className="sb-slug-set" style={{ width: (100 * ramp * fade) + '%' }} />
                    <span className="sb-slug-word">{p.word}</span>
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
          <div className="sb-rack">
            {f.rack.map((t) => (
              <button key={t.id} type="button" disabled={!live}
                className={'sb-tile' + (pickedIds.has(t.id) ? ' is-picked' : '')}
                onClick={() => toggleTile(t)}>
                {t.letter === '?' ? '␣' : t.letter}
                <sub>{W.Lexicon.LETTER_VALUES[t.letter] || 0}</sub>
              </button>
            ))}
          </div>

          <div className="sb-input">
            <input ref={inputRef} value={word} disabled={!live}
              className={formable ? '' : 'is-unformable'}
              placeholder="Pick tiles or type letters"
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendBest(); }} />
            <button type="button" className="sb-go" onClick={sendBest} disabled={!live}>Push</button>
            <button type="button" onClick={() => setWord('')} disabled={!live}>Clear</button>
            <button type="button" onClick={() => {
              const scoreOf = fight.current
                ? (w) => fight.current.tug.wordStrength(w)
                : (w) => w.length;
              const best = SB.bestFromRack(rackLetters, scoreOf, 1);
              // Fill with the winning word's letters, not the whole rack: the
              // field is an exact-letters field now, so handing it seven tiles
              // that spell nothing would just show "no word".
              if (best.length) setWord(best[0].word);
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
                  onClick={() => playWord(s.word)} disabled={!live}>
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
