// TUG SANDBOX -- one fight, nothing else.
//
// The whole app is this screen: pick an enemy, hit start, spell words. There is
// no menu, no map, no run, no rewards, no items/intents/shops/events/
// achievements/stolen letters. See src/sandbox/main.jsx for the (short) list of
// engine modules that get loaded, and src/sandbox/tugOfWar.js for the combat
// model, which is sandbox-owned and does not touch js/wordbound/duel.js.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const RACK_SIZE = 7;
const NOTE_GLYPHS = ['♪', '♫', '♩', '♬'];

// Stat lines lifted from js/wordbound/monsters.js so the sandbox doesn't need
// monsters.js (which drags intents/loot/traits wiring in with it). Only the
// piece matters to a tug fight -- there is no enemy HP here, the rope is the
// win condition -- so this is just a piece picker with names on it.
const ENEMIES = [
  { id: 'gymnopediste', name: 'The Gymnopédiste', glyph: '\u{1FA70}', piece: 'gymnopedie1' },
  { id: 'gstring', name: 'The G String', glyph: '\u{1F3BB}', piece: 'airGString' },
  { id: 'morningmood', name: 'Morning Mood', glyph: '\u{1F305}', piece: 'morningMood' },
  { id: 'gnossienne', name: 'The Gnossienne', glyph: '\u{1F3B9}', piece: 'gnossienne1' },
  { id: 'invention', name: 'The Invention', glyph: '\u{1F3BC}', piece: 'invention4' },
  { id: 'metronome', name: 'The Metronome', glyph: '⏰', piece: 'czerny299' },
  { id: 'vowelmaw', name: 'The Vowelmaw', glyph: '\u{1F451}', piece: 'mountainKing' },
];

const TUNE_LABELS = {
  PREP_SEC: 'Prep time (s)',
  ROPE_START: 'Rope start (0-100)',
  WORD_VALUE_WEIGHT: 'Word: letter-value weight',
  WORD_LENGTH_WEIGHT: 'Word: length weight',
  WORD_LENGTH_EXP: 'Word: length exponent',
  PUSHER_RAMP_SEC: 'Word ramp-in (s)',
  PLAYER_FORCE_SCALE: 'Push per pool point (/s)',
  ENEMY_DRONE: 'Enemy drone (/s @ int 1)',
  ATTACK_INTERVAL_BASE: 'Attack interval base (s)',
  ATTACK_POWER_BASE: 'Attack power base',
  ATTACK_TRAVEL_SEC: 'Telegraph lead (s)',
  ATTACK_IMPULSE_SCALE: 'Shove per power',
  ATTACK_CHIP_FACTOR: 'Pool chip per power',
  CRESCENDO_POWER_MULT: 'Crescendo power ×',
  DB_RATE: 'dB ramp (dB/s)',
  DB_MAX: 'dB cap',
};
const TUNE_STEPS = {
  PREP_SEC: 0.5, ROPE_START: 5, WORD_VALUE_WEIGHT: 0.1, WORD_LENGTH_WEIGHT: 0.1,
  WORD_LENGTH_EXP: 0.1, PUSHER_RAMP_SEC: 0.5, PLAYER_FORCE_SCALE: 0.005, ENEMY_DRONE: 0.1,
  ATTACK_INTERVAL_BASE: 0.5, ATTACK_POWER_BASE: 0.5, ATTACK_TRAVEL_SEC: 0.1,
  ATTACK_IMPULSE_SCALE: 0.05, ATTACK_CHIP_FACTOR: 0.05, CRESCENDO_POWER_MULT: 0.1,
  DB_RATE: 0.01, DB_MAX: 1,
};

export default function TugSandbox() {
  const W = window.Wordbound;
  const SB = W.Sandbox;
  const fight = useRef(null);
  const [, forceRender] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | live | won | lost
  const [log, setLog] = useState([]);
  const [word, setWord] = useState('');
  const [enemyId, setEnemyId] = useState(ENEMIES[0].id);
  const [seed, setSeed] = useState('sandbox');
  const [tempo, setTempo] = useState(1);
  const [volume, setVolume] = useState(0.4);
  const [tune, setTune] = useState(() => ({ ...SB.TUG_DEFAULTS }));
  const [helperLetters, setHelperLetters] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [helperBusy, setHelperBusy] = useState(false);
  const inputRef = useRef(null);

  const say = useCallback((line) => {
    setLog((prev) => [line, ...prev].slice(0, 60));
  }, []);

  const halt = useCallback((outcome, line) => {
    const f = fight.current;
    if (f) { f.seq.stop(); f.running = false; }
    setPhase(outcome);
    if (line) say(line);
  }, [say]);

  const start = useCallback(() => {
    if (fight.current) fight.current.seq.stop();
    const def = ENEMIES.find((e) => e.id === enemyId);
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

    const seq = W.Music.createSequencer(ctx, gain, piece);
    const tug = SB.createTug({ tune });

    tug.on('fight-start', () => say('THE SONG STARTS -- attacks incoming'));
    tug.on('attack-telegraphed', (a) => {
      if (a.kind === 'crescendo') say('CRESCENDO building... (' + a.power.toFixed(1) + ')');
    });
    tug.on('attack-landed', (a) => say(
      (a.kind === 'crescendo' ? 'CRESCENDO HIT' : 'hit')
      + ' ' + a.power.toFixed(1)
      + ' -> rope ' + tug.rope.toFixed(1)));
    tug.on('pusher-lost', (p) => say('SILENCED: ' + p.word));
    tug.on('won', () => halt('won', 'THE WORDS HOLD -- victory'));
    tug.on('lost', () => halt('lost', 'THE SONG WINS'));

    seq.on('crescendo-approaching', (c) => {
      const f = fight.current;
      if (!f) return;
      f.tug.telegraphCrescendo(seq.beatToTime(c.peakBeat), f.ctx.currentTime);
    });
    // Loop the piece: a tug fight can outlast a single performance and a silent
    // enemy is not a fight.
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
    say('TUG: ' + def.name + ' / ' + piece.title + ' -- ' + tune.PREP_SEC + 's to build your pushers');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [enemyId, seed, tempo, volume, tune, say, halt, W, SB]);

  // Per-frame loop: the rope integrates against the piece's live intensity.
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
    if (!W.Lexicon.isValidWord(upper)) { say(upper + ' -- not a word'); return; }
    const form = W.Lexicon.canFormFromRack(upper, f.rack);
    if (!form.possible) { say(upper + ' -- not in your rack'); return; }

    W.Lexicon.removeTiles(f.rack, form.tilesUsed);
    f.pile.discardPile.push(...form.tilesUsed);
    const need = RACK_SIZE - f.rack.length;
    if (need > 0) f.rack.push(...W.Tiles.draw(f.pile, need, f.rng));

    const pusher = f.tug.addWord(upper);
    setSuggestions([]);
    say('+ ' + upper + ' pushing ' + pusher.strength.toFixed(1)
      + ' (pool ' + f.tug.poolStrength().toFixed(1) + ')');
  }, [phase, say, W]);

  const rewrite = useCallback(() => {
    const f = fight.current;
    if (!f || phase !== 'live') return;
    f.pile.discardPile.push(...f.rack);
    f.rack.length = 0;
    f.rack.push(...W.Tiles.draw(f.pile, RACK_SIZE, f.rng));
    setSuggestions([]);
    say('rack rewritten (free in sandbox)');
  }, [phase, say, W]);

  const rackLetters = fight.current ? fight.current.rack.map((t) => t.letter).join('') : '';

  const findWords = useCallback((lettersArg) => {
    const letters = (lettersArg != null ? lettersArg : helperLetters) || rackLetters;
    setHelperLetters(letters);
    const scoreOf = fight.current
      ? (w) => fight.current.tug.wordStrength(w)
      : (w) => w.length;
    if (!SB.isWordMakerReady()) {
      setHelperBusy(true);
      // Let the "building" state paint before the ~200k-word index blocks.
      setTimeout(() => {
        const out = SB.findWords(letters, scoreOf, 10);
        setSuggestions(out);
        setHelperBusy(false);
      }, 16);
      return;
    }
    setSuggestions(SB.findWords(letters, scoreOf, 10));
  }, [helperLetters, rackLetters, SB]);

  const setConst = (key, value) => {
    setTune((t) => ({ ...t, [key]: value }));
    if (fight.current) fight.current.tug.tune[key] = value;
  };

  const f = fight.current;
  const live = phase === 'live' && f;
  const tug = f ? f.tug : null;
  const now = f ? f.ctx.currentTime : 0;
  const rope = tug ? tug.rope : tune.ROPE_START;
  const prepLeft = tug && tug.phase === 'prep' ? Math.max(0, tune.PREP_SEC - tug.elapsed) : 0;
  const hitFlash = tug ? now - tug.lastHitAt < 0.25 : false;

  const sortedPushers = useMemo(() => {
    if (!tug) return [];
    return tug.pushers.slice().sort((a, b) => b.hp - a.hp);
  }, [tug, tug ? tug.pushers.length : 0, rope]);

  return (
    <div className="sb">
      <header className="sb-head">
        <h1>Wordbound &mdash; Tug Sandbox</h1>
        <span className="sb-note">words push right forever &middot; the song hits in bursts</span>
      </header>

      <section className="sb-setup">
        <label>Enemy
          <select value={enemyId} onChange={(e) => setEnemyId(e.target.value)}>
            {ENEMIES.map((e) => <option key={e.id} value={e.id}>{e.glyph} {e.name}</option>)}
          </select>
        </label>
        <label>Seed
          <input value={seed} onChange={(e) => setSeed(e.target.value)} size={8} />
        </label>
        <label>Tempo &times;{tempo.toFixed(2)}
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
        <label>Vol
          <input type="range" min={0} max={1} step={0.05} value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              if (fight.current) fight.current.gain.gain.value = v;
            }} />
        </label>
        <button type="button" onClick={start}>{phase === 'idle' ? 'Start fight' : 'Restart'}</button>
        {live && <button type="button" onClick={() => halt('idle', 'stopped')}>Stop</button>}
      </section>

      {f && (
        <section className="sb-field">
          <div className="sb-pool">
            <div className="sb-pool-head">
              <span>PUSHERS</span>
              <span className="sb-pool-total">{tug.poolStrength().toFixed(1)}</span>
            </div>
            <div className="sb-pool-list">
              {sortedPushers.length === 0 && <div className="sb-pool-empty">spell a word</div>}
              {sortedPushers.map((p) => (
                <div key={p.id} className={'sb-pusher' + (p.hp < p.strength ? ' is-hurt' : '')}>
                  <span className="sb-pusher-bar" style={{ width: (100 * p.hp / p.strength) + '%' }} />
                  <span className="sb-pusher-word">{p.word}</span>
                  <span className="sb-pusher-str">
                    {tug.pusherRamp(p) < 1
                      ? 'warming ' + (100 * tug.pusherRamp(p)).toFixed(0) + '%'
                      : p.hp.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
            <div className="sb-pool-force">+{tug.playerForce().toFixed(2)}/s</div>
          </div>

          <div className="sb-arena">
            <div className={'sb-rope' + (hitFlash ? ' is-hit' : '')}>
              <div className="sb-rope-words" style={{ width: rope + '%' }} />
              <div className="sb-rope-mark" style={{ left: rope + '%' }} />
              {tug.attacks.map((a) => {
                const span = Math.max(0.001, a.landAt - a.spawnAt);
                const progress = Math.max(0, Math.min(1, (now - a.spawnAt) / span));
                const left = rope + (100 - rope) * (1 - progress);
                const big = a.kind === 'crescendo';
                return (
                  <span key={a.id}
                    className={'sb-flynote' + (big ? ' is-big' : '')}
                    style={{ left: left + '%', opacity: 0.45 + 0.55 * progress }}>
                    {big ? '♬' : NOTE_GLYPHS[a.id % NOTE_GLYPHS.length]}
                  </span>
                );
              })}
              {tug.phase === 'prep' && (
                <div className="sb-prep">PREP {prepLeft.toFixed(1)}s</div>
              )}
            </div>
            <div className="sb-readout">
              <span>rope {rope.toFixed(1)}</span>
              <span>words +{tug.playerForce().toFixed(2)}/s</span>
              <span>song &minus;{tug.enemyForce().toFixed(2)}/s</span>
              <span>intensity {tug.smoothIntensity.toFixed(2)}</span>
              <span className="sb-db">{tug.db.toFixed(1)} dB (&times;{tug.dbMultiplier().toFixed(2)})</span>
              <span>{tug.fightElapsed.toFixed(0)}s</span>
            </div>
          </div>

          <div className="sb-enemy">
            <span className="sb-glyph">{f.def.glyph}</span>
            <div className="sb-name">{f.def.name}</div>
            <div className="sb-sub">{f.piece.title}</div>
            <div className="sb-int"><span style={{ height: (100 * Math.min(1, tug.smoothIntensity)) + '%' }} /></div>
          </div>
        </section>
      )}

      {f && (
        <section className="sb-play">
          <div className="sb-rack">
            {f.rack.map((t) => (
              <button key={t.id} type="button" className="sb-tile" disabled={!live}
                onClick={() => setWord((w) => w + (t.letter === '?' ? '' : t.letter))}>
                {t.letter === '?' ? '␣' : t.letter}
                <sub>{W.Lexicon.LETTER_VALUES[t.letter] || 0}</sub>
              </button>
            ))}
          </div>
          <div className="sb-input">
            <input ref={inputRef} value={word} disabled={!live}
              placeholder="spell a word, Enter to push"
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') playWord(word); }} />
            <button type="button" onClick={() => playWord(word)} disabled={!live}>Push</button>
            <button type="button" onClick={() => setWord('')} disabled={!live}>Clear</button>
            <button type="button" onClick={rewrite} disabled={!live}>Rewrite rack</button>
          </div>

          <div className="sb-maker">
            <label>Word maker
              <input value={helperLetters} placeholder={rackLetters || 'letters'}
                onChange={(e) => setHelperLetters(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') findWords(); }} />
            </label>
            <button type="button" onClick={() => findWords()}>Find</button>
            <button type="button" onClick={() => findWords(rackLetters)}>Use rack</button>
            {helperBusy && <span className="sb-note">building index&hellip;</span>}
            <div className="sb-suggests">
              {suggestions.map((s) => (
                <button key={s.word} type="button" className="sb-suggest"
                  onClick={() => playWord(s.word)} disabled={!live}>
                  {s.word}<em>{s.score.toFixed(1)}</em>
                </button>
              ))}
            </div>
          </div>

          {phase === 'won' && <div className="sb-outcome sb-win">VICTORY</div>}
          {phase === 'lost' && <div className="sb-outcome sb-lose">DEFEAT</div>}
        </section>
      )}

      <section className="sb-tune">
        <h2>Tuning (live)</h2>
        <div className="sb-tune-grid">
          {Object.keys(SB.TUG_DEFAULTS).map((key) => (
            <label key={key}>{TUNE_LABELS[key] || key}
              <input type="number" step={TUNE_STEPS[key] || 0.1} value={tune[key]}
                onChange={(e) => setConst(key, Number(e.target.value))} />
            </label>
          ))}
        </div>
        <p className="sb-note">
          Edits apply to the running fight on the next frame (ROPE_START and PREP_SEC
          need a restart). Nothing is saved &mdash; copy numbers you like into
          src/sandbox/tugOfWar.js.
        </p>
      </section>

      <section className="sb-log">
        {log.map((line, i) => <div key={log.length - i}>{line}</div>)}
      </section>
    </div>
  );
}
