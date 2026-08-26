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
const STAFF_LINES = [0, 2, 4, 6, 8].map((slot) => STAFF_TOP + slot * STAFF_STEP);

// Opponents lifted from js/wordbound/monsters.js so the sandbox doesn't need
// monsters.js (which drags intents/loot/traits wiring with it). Only the piece
// matters here -- there is no enemy HP, the rope is the win condition.
const OPPONENTS = [
  { id: 'bagatelle', name: 'The Bagatelle', glyph: '\u{1F339}', piece: 'furElise' },
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
  PLAYER_FORCE_SCALE: 'Push per pool point (/s)',
  ENEMY_DRONE: 'Pit drone (/s at full intensity)',
  ATTACK_INTERVAL_BASE: 'Attack interval base (s)',
  ATTACK_POWER_BASE: 'Attack power base',
  ATTACK_TRAVEL_SEC: 'Telegraph lead (s)',
  ATTACK_IMPULSE_SCALE: 'Barline shove per power',
  ATTACK_CHIP_FACTOR: 'Type destroyed per power',
  CRESCENDO_POWER_MULT: 'Crescendo power ×',
  DB_RATE: 'Loudness ramp (dB/s)',
  DB_MAX: 'Loudness cap (dB)',
};
const TUNE_STEPS = {
  PREP_SEC: 0.5, ROPE_START: 5, WORD_VALUE_WEIGHT: 0.1, WORD_LENGTH_WEIGHT: 0.1,
  WORD_LENGTH_EXP: 0.1, PUSHER_RAMP_SEC: 0.5, PLAYER_FORCE_SCALE: 0.005,
  ENEMY_DRONE: 0.1, ATTACK_INTERVAL_BASE: 0.5, ATTACK_POWER_BASE: 0.5,
  ATTACK_TRAVEL_SEC: 0.1, ATTACK_IMPULSE_SCALE: 0.05, ATTACK_CHIP_FACTOR: 0.05,
  CRESCENDO_POWER_MULT: 0.1, DB_RATE: 0.01, DB_MAX: 1,
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
  const [tempo, setTempo] = useState(1);
  const [volume, setVolume] = useState(0.4);
  const [tune, setTune] = useState(() => ({ ...SB.TUG_DEFAULTS }));
  const [suggestions, setSuggestions] = useState([]);
  const [indexing, setIndexing] = useState(false);
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

  const halt = useCallback((outcome, line) => {
    const f = fight.current;
    if (f) { f.seq.stop(); f.running = false; }
    setPhase(outcome);
    if (line) say(line);
  }, [say]);

  const start = useCallback(() => {
    if (fight.current) fight.current.seq.stop();
    const def = OPPONENTS.find((o) => o.id === opponentId);
    const piece = W.Pieces[def.piece];
    const rng = window.Game.RNG.create(seed);

    const ctx = fight.current?.ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const gain = fight.current?.gain || ctx.createGain();
    gain.gain.value = volume;
    if (!fight.current) gain.connect(ctx.destination);

    const deck = W.Tiles.createStarterDeck();
    const pile = { drawPile: W.Tiles.shuffleIntoDrawPile(deck, rng), discardPile: [] };
    const rack = W.Tiles.draw(pile, RACK_SIZE, rng);

    // A piece can name an instrument per track (see Music.VOICES); anything it
    // doesn't name falls back to the struck-string piano voice.
    const seq = W.Music.createSequencer(ctx, gain, piece, {
      voices: piece.voices || {},
    });
    const tug = SB.createTug({ tune });

    tug.on('fight-start', () => say('The pit comes in.'));
    tug.on('attack-telegraphed', (a) => {
      if (a.kind === 'crescendo') say('Crescendo building — ' + a.power.toFixed(1));
    });
    tug.on('attack-landed', (a) => say(
      (a.kind === 'crescendo' ? 'Crescendo hit ' : 'Beat hit ')
      + a.power.toFixed(1) + ' — barline at ' + tug.rope.toFixed(1)));
    tug.on('pusher-lost', (p) => say(p.word + ' silenced.'));
    tug.on('won', () => halt('won', 'The words hold.'));
    tug.on('lost', () => halt('lost', 'The song wins.'));

    seq.on('crescendo-approaching', (c) => {
      const f = fight.current;
      if (!f) return;
      f.tug.telegraphCrescendo(seq.beatToTime(c.peakBeat), f.ctx.currentTime);
    });
    // Loop the piece: a tug fight can outlast one performance, and a silent
    // opponent is not a fight.
    seq.on('piece-ended', () => {
      const f = fight.current;
      if (!f || !f.running) return;
      seq.stop();
      seq.play();
      if (f.tempo !== 1) seq.setTempoScale(f.tempo);
    });

    const now = ctx.currentTime;
    tug.start(now);
    fight.current = {
      ctx, gain, rng, pile, rack, tug, seq, piece, def,
      tempo, lastNow: now, running: true,
    };
    seq.play();
    if (tempo !== 1) seq.setTempoScale(tempo);
    // Test hook: verify-sandbox.js reads rope/force/db straight off the model
    // instead of scraping formatted numbers out of the DOM.
    window.__tug = tug;
    setLog([]);
    setWord('');
    setSuggestions([]);
    setPhase('live');
    say(def.name + ' takes up ' + piece.title + '.');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [opponentId, seed, tempo, volume, tune, say, halt, W, SB]);

  // Per-frame loop: the barline integrates against the piece's live intensity.
  useEffect(() => {
    if (phase !== 'live') return undefined;
    let raf = 0;
    const step = () => {
      const f = fight.current;
      if (!f || !f.running) return;
      const now = f.ctx.currentTime;
      const dt = Math.max(0, now - f.lastNow);
      f.lastNow = now;
      f.tug.tick(now, dt, f.seq.getIntensity());
      forceRender((n) => n + 1);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

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
                return (
                  <div key={p.id} className={'sb-slug' + (p.hp < p.strength ? ' is-hurt' : '')}>
                    <span className="sb-slug-set" style={{ width: (100 * ramp) + '%' }} />
                    <span className="sb-slug-word">{p.word}</span>
                    <span className="sb-slug-str">{ramp < 1 ? 'setting' : p.hp.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="sb-arena">
            <div className={'sb-rope' + (struck ? ' is-hit' : '')}>
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
                const left = rope + (98.5 - rope) * (1 - progress);
                const big = a.kind === 'crescendo';
                // Heavier hits sit lower on the staff, the way a bass note does.
                const slot = Math.max(0, Math.min(8, Math.round((a.power / 26) * 8)));
                const top = STAFF_TOP + slot * STAFF_STEP;
                const hairpin = 26 + 54 * progress;
                return (
                  <span key={a.id}>
                    {big && (
                      <svg className="sb-hairpin" width={hairpin} height={34}
                        style={{ left: left + '%', top: top + '%' }} aria-hidden="true">
                        <line x1="0" y1="17" x2={hairpin} y2="2" />
                        <line x1="0" y1="17" x2={hairpin} y2="32" />
                      </svg>
                    )}
                    <span className={'sb-flynote' + (big ? ' is-big' : '')}
                      style={{ left: left + '%', top: top + '%', opacity: 0.5 + 0.5 * progress }} />
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
            <button type="button" onClick={() => setWord(rackLetters)} disabled={!live}>Use rack</button>
            <button type="button" onClick={newRack} disabled={!live}>New rack</button>
          </div>

          <div className="sb-suggests">
            {indexing && <span className="sb-hint">Reading the dictionary…</span>}
            {!indexing && !letters
              && <span className="sb-hint">Pick tiles or type letters. Every word they spell shows up here, strongest first.</span>}
            {!indexing && letters && suggestions.length === 0
              && <span className="sb-hint">Nothing spells out of {letters}.</span>}
            {!indexing && suggestions.map((s, i) => (
              <button key={s.word} type="button"
                className={'sb-suggest' + (i === 0 ? ' is-best' : '')}
                onClick={() => playWord(s.word)} disabled={!live}>
                {s.word}<em>{s.score.toFixed(0)}</em>
              </button>
            ))}
          </div>
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
