// ROUND SANDBOX -- one Balatro-with-Scrabble round (see COMBAT_REDESIGN.md).
//
// A point target, four words, three changeouts. The classical piece is a
// SOUNDTRACK here and nothing more: it starts with the round, loops, and never
// touches the score. The tile play (case + composing stick + FLIP slide) is
// carried over from the tug sandbox unchanged; what the stick MEANS is new --
// Play scores the word standing on it, Change out throws those tiles back.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// Plain FLIP (see the long note in TugSandbox.jsx): record where the tile was,
// let React move it, slide it in from the old spot. Nothing else may set
// `transform` on .sb-tile.
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

// Standard enemies: a name and the piece that plays under the round.
const ENEMIES = [
  // `recorded` names a Sandbox.* recorded piece (audioPiece.js) played back
  // instead of a synthesized Pieces.* entry.
  { id: 'bagatelle', name: 'The Bagatelle', glyph: '\u{1F339}', recorded: 'recordedFurElise' },
  { id: 'bagatelle-synth', name: 'The Bagatelle (synth)', glyph: '\u{1F3B9}', piece: 'furElise' },
  { id: 'gymnopediste', name: 'The Gymnopédiste', glyph: '\u{1FA70}', piece: 'gymnopedie1' },
  { id: 'gstring', name: 'The G String', glyph: '\u{1F3BB}', piece: 'airGString' },
  { id: 'morningmood', name: 'Morning Mood', glyph: '\u{1F305}', piece: 'morningMood' },
  { id: 'gnossienne', name: 'The Gnossienne', glyph: '\u{1F3B9}', piece: 'gnossienne1' },
  { id: 'invention', name: 'The Invention', glyph: '\u{1F3BC}', piece: 'invention4' },
  { id: 'metronome', name: 'The Metronome', glyph: '⏰', piece: 'czerny299' },
  { id: 'vowelmaw', name: 'The Vowelmaw', glyph: '\u{1F451}', piece: 'mountainKing' },
];

const TUNE_LABELS = {
  TARGET: 'Point target',
  PLAYS: 'Words per round',
  CHANGEOUTS: 'Changeouts',
  RACK_SIZE: 'Rack size',
  MULT_BASE: 'Mult, one letter',
  MULT_PER_LETTER: 'Mult per extra letter',
  BONUS_7: 'Bonus, 7+ letters',
  BONUS_6: 'Bonus, 6 letters',
  GOLD_WIN: 'Gold for a win',
  GOLD_PER_WORD_LEFT: 'Gold per word left',
};

// "letters 9 · bingo +50 = 59 pts × 7" -- points (bingo included), then mult.
function describeBreakdown(b) {
  const pts = ['letters ' + b.base];
  if (b.bingoBonus) pts.push('bingo +' + b.bingoBonus);
  if (b.bonusFlat) pts.push('tile bonus +' + b.bonusFlat);
  if (b.variantFlat) pts.push('charged +' + b.variantFlat);
  let out = (pts.length > 1 ? pts.join(' · ') + ' = ' : '') + b.points + ' pts × ' + b.mult;
  if (b.bonusMult !== 1) out += ' (length ' + b.lengthMult + ' × tile ' + b.bonusMult + ')';
  if (b.itemBonus) out += ' · items +' + b.itemBonus;
  return out;
}

export default function RoundSandbox() {
  const W = window.Wordbound;
  const SB = W.Sandbox;
  const fight = useRef(null);   // { round, seq, ctx, gain, def, piece }
  const [, forceRender] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | live | won | lost
  const [log, setLog] = useState([]);
  const [word, setWord] = useState('');
  const [enemyId, setEnemyId] = useState(ENEMIES[0].id);
  const [seed, setSeed] = useState('sandbox');
  const [bagId, setBagId] = useState('normal');
  const [volume, setVolume] = useState(0.4);
  const [tune, setTune] = useState(() => ({ ...SB.ROUND_DEFAULTS }));
  // Sample items, read at Start (a mid-round swap would half-apply).
  const [itemIds, setItemIds] = useState(() => new Set());
  const [suggestions, setSuggestions] = useState([]);
  const [indexing, setIndexing] = useState(false);
  const inputRef = useRef(null);

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
  const refresh = useCallback(() => forceRender((n) => n + 1), []);

  useEffect(() => {
    if (SB.isWordMakerReady()) return undefined;
    setIndexing(true);
    const id = setTimeout(() => { SB.warmWordMaker(); setIndexing(false); }, 60);
    return () => clearTimeout(id);
  }, [SB]);

  // Volume slider reaches the running soundtrack directly.
  useEffect(() => {
    const f = fight.current;
    if (f && f.gain) f.gain.gain.value = volume;
  }, [volume]);

  // Pull the recording down as soon as the Bagatelle is picked, not at Start.
  useEffect(() => {
    const def = ENEMIES.find((o) => o.id === enemyId);
    const piece = def && def.recorded && SB[def.recorded];
    if (piece && piece.audio) SB.prefetchAudio(piece.audio).catch(() => {});
  }, [enemyId, SB]);

  const start = useCallback(() => {
    if (fight.current) {
      if (fight.current.seq.dispose) fight.current.seq.dispose();
      else fight.current.seq.stop();
    }
    const def = ENEMIES.find((o) => o.id === enemyId);
    const piece = def.recorded ? SB[def.recorded] : W.Pieces[def.piece];
    const rng = window.Game.RNG.create(seed);

    let ctx = fight.current?.ctx;
    let gain = fight.current?.gain;
    try {
      if (ctx && ctx.state === 'closed') { ctx = null; gain = null; }
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        gain = ctx.createGain();
        gain.connect(ctx.destination);
      }
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      gain.gain.value = volume;
    } catch (err) {
      say('Could not open the audio device: ' + (err && err.message ? err.message : err));
      return;
    }

    const round = SB.createRound({ rng, deck: SB.createBagDeck(bagId), tune, items: [...itemIds] });
    const seq = piece.audio
      ? SB.createAudioPiece(ctx, gain, piece)
      : W.Music.createSequencer(ctx, gain, piece);
    seq.on('load-failed', (err) => say('The recording did not load ('
      + (err && err.message ? err.message : err) + ') — Restart to try again.'));
    seq.on('piece-ended', () => {
      const f = fight.current;
      if (!f || f.seq !== seq) return;
      seq.stop();
      seq.play();
    });
    seq.play();

    fight.current = { round, seq, ctx, gain, def, piece };
    window.__round = round;
    setLog([]);
    setWord('');
    setSuggestions([]);
    setPhase('live');
    say(def.name + ' takes up ' + piece.title + '. Target ' + round.target + '.');
    if (round.items.length) {
      say('Carrying ' + round.items.map((id) => W.Items.ITEM_DEFS[id].name).join(', ')
        + (round.rackSize !== tune.RACK_SIZE ? ' — rack of ' + round.rackSize : '') + '.');
    }
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [enemyId, seed, bagId, volume, tune, itemIds, say, W, SB]);

  const f = fight.current;
  const round = f ? f.round : null;
  const rackLetters = round ? round.rack.map((t) => t.letter).join('') : '';
  const letters = word.toUpperCase().replace(/[^A-Z?]/g, '');

  // Which rack tile stands in each position of the field (see TugSandbox).
  const slots = (() => {
    if (!round || !letters) return [];
    const out = new Array(letters.length).fill(null);
    const used = new Set();
    for (let i = 0; i < letters.length; i++) {
      const t = round.rack.find((x) => !used.has(x.id) && x.letter === letters[i]);
      if (t) { out[i] = t; used.add(t.id); }
    }
    for (let i = 0; i < letters.length; i++) {
      if (out[i]) continue;
      const t = round.rack.find((x) => !used.has(x.id) && x.letter === '?');
      if (t) { out[i] = t; used.add(t.id); }
    }
    return out;
  })();
  const pickedIds = new Set(slots.filter(Boolean).map((t) => t.id));
  const formable = !letters || pickedIds.size === letters.length;

  const finish = useCallback((r) => {
    if (r.state === 'won') {
      setPhase('won');
      say('Target met — ' + r.score + ' against ' + r.target + '. '
        + r.playsLeft + ' word' + (r.playsLeft === 1 ? '' : 's') + ' left → '
        + r.gold + ' gold.');
    } else if (r.state === 'lost') {
      setPhase('lost');
      say('Out of words at ' + r.score + ' — ' + (r.target - r.score) + ' short.');
    }
  }, [say]);

  const playWord = useCallback((raw) => {
    const r = fight.current?.round;
    if (!r || phase !== 'live') return;
    const res = r.playWord(raw);
    if (!res.ok) { say(res.reason); return; }
    setWord('');
    setSuggestions([]);
    say(res.word + ' — ' + res.breakdown.total + ' (' + describeBreakdown(res.breakdown) + ')'
      + ' → ' + r.score + ' / ' + r.target + '.');
    res.messages.forEach((m) => say(m));
    finish(r);
    refresh();
  }, [phase, say, finish, refresh]);

  const play = useCallback(() => {
    const r = fight.current?.round;
    if (!r || phase !== 'live' || !letters) return;
    if (r.isPlayable(letters)) { playWord(letters); return; }
    const found = SB.findWords(letters, (w) => r.scoreFor(w), 1);
    if (found.length > 0) { playWord(found[0].word); return; }
    say(formable ? 'Nothing spells out of ' + letters + '.'
      : letters + ' needs letters that aren’t in your rack.');
  }, [letters, formable, phase, playWord, say, W, SB]);

  const changeout = useCallback(() => {
    const r = fight.current?.round;
    if (!r || phase !== 'live') return;
    const ids = slots.filter(Boolean).map((t) => t.id);
    const res = r.changeout(ids);
    if (!res.ok) { say(res.reason); return; }
    setWord('');
    setSuggestions([]);
    say('Changed out ' + res.returned.map((t) => t.letter).join('') + ' for '
      + res.drawn.map((t) => t.letter).join('') + ' — ' + r.changeoutsLeft + ' left.');
    refresh();
  }, [slots, phase, say, refresh]);

  useEffect(() => {
    if (!letters || indexing) { setSuggestions([]); return; }
    const r = fight.current?.round;
    setSuggestions(SB.findWords(letters, r ? (w) => r.scoreFor(w) : (w) => w.length, 10));
  }, [letters, indexing, SB]);

  const stageTile = (tile) => {
    captureFlipFrom(tile.id);
    setWord(letters + (tile.letter === '?' ? '?' : tile.letter));
  };
  const unstageAt = (i) => {
    const t = slots[i];
    if (t) captureFlipFrom(t.id);
    setWord(letters.slice(0, i) + letters.slice(i + 1));
  };

  const setConst = (key, value) => {
    setTune((t) => ({ ...t, [key]: value }));
    if (fight.current) fight.current.round.tune[key] = value;
  };

  const live = phase === 'live' && round;
  const spelt = !!(live && formable && round.isPlayable(letters));
  const worthHow = spelt ? round.breakdownFor(letters) : null;
  const worth = worthHow ? worthHow.total : 0;
  const pct = round ? Math.min(100, (100 * round.score) / round.target) : 0;

  return (
    <div className="sb">
      <header className="sb-head">
        <div className="sb-wordmark">
          <span className="sb-eyebrow">Round sandbox · one round</span>
          <h1>Wordbound<span className="sb-amp">·</span>Crescendo</h1>
        </div>
        {round && (
          <div className="sb-dyn">
            <span className="sb-dyn-label">Score / target</span>
            <span className="sb-dyn-mark">{round.score}<small> / {round.target}</small></span>
          </div>
        )}
      </header>

      <section className="sb-setup">
        <label>Enemy
          <select value={enemyId} onChange={(e) => setEnemyId(e.target.value)}>
            {ENEMIES.map((o) => <option key={o.id} value={o.id}>{o.glyph} {o.name}</option>)}
          </select>
        </label>
        <label>Seed
          <input value={seed} onChange={(e) => setSeed(e.target.value)} style={{ width: 110 }} />
        </label>
        <div className="sb-bags" role="group" aria-label="Tile bag">
          <span className="sb-bags-head">Tile bag</span>
          <div className="sb-bag-row">
            {SB.TILE_BAGS.map((b) => (
              <button key={b.id} type="button" title={b.blurb}
                className={'sb-bag' + (b.id === bagId ? ' is-on' : '')}
                onClick={() => setBagId(b.id)}>{b.label}</button>
            ))}
          </div>
        </div>
        <label>Volume
          <input type="range" min="0" max="1" step="0.05" value={volume}
            onChange={(e) => setVolume(Number(e.target.value))} />
        </label>
        <button type="button" className="sb-go" onClick={start}>
          {phase === 'idle' ? 'Start' : 'Restart'}
        </button>
      </section>

      <section className="sb-items" role="group" aria-label="Sample items">
        <span className="sb-eyebrow">Items · read at start</span>
        {SB.SAMPLE_ITEMS.map((id, i) => {
          const d = W.Items.ITEM_DEFS[id];
          return (
            <label key={id} className={'sb-item' + (itemIds.has(id) ? ' is-on' : '') + (i < 3 ? ' is-pick' : '')}
              title={d.hint}>
              <input type="checkbox" checked={itemIds.has(id)}
                onChange={(e) => setItemIds((prev) => {
                  const next = new Set(prev);
                  if (e.target.checked) next.add(id); else next.delete(id);
                  return next;
                })} />
              {d.name}
            </label>
          );
        })}
        {round && [...itemIds].sort().join() !== round.items.slice().sort().join()
          && <em className="sb-bag-note">on restart</em>}
      </section>

      {phase === 'idle' && (
        <p className="sb-hint">Pick an enemy and a bag, then Start. Beat the target in four words — a word scores its letters × its length.</p>
      )}

      {round && (
        <section className="sb-board">
          <div className="sb-meter" aria-label="Progress to target">
            <div className={'sb-meter-fill' + (round.score >= round.target ? ' is-met' : '')}
              style={{ width: pct + '%' }} />
            <span className="sb-meter-tick" />
          </div>
          <div className="sb-counters">
            <span><b>{round.playsLeft}</b> word{round.playsLeft === 1 ? '' : 's'} left</span>
            <span><b>{round.changeoutsLeft}</b> changeout{round.changeoutsLeft === 1 ? '' : 's'} left</span>
            <span><b>{round.pile.drawPile.length}</b> in the bag</span>
            {round.items.length > 0 && (
              <span>{round.items.map((id) => W.Items.ITEM_DEFS[id].name).join(' · ')}</span>
            )}
            <span className="sb-enemy">{f.def.glyph} {f.def.name} · {f.piece.title}</span>
          </div>
          {round.plays.length > 0 && (
            <ol className="sb-plays">
              {round.plays.map((p, i) => (
                <li key={i}>
                  <span className="sb-plays-word">{p.word}</span>
                  <span className="sb-plays-how">{describeBreakdown(p.breakdown)}</span>
                  <b className="sb-figure">{p.breakdown.total}</b>
                </li>
              ))}
            </ol>
          )}
          {phase === 'won' && (
            <div className="sb-outcome sb-win">
              Won — {round.gold} gold ({round.tune.GOLD_WIN} + {round.tune.GOLD_PER_WORD_LEFT} × {round.playsLeft} word{round.playsLeft === 1 ? '' : 's'} left).
            </div>
          )}
          {phase === 'lost' && (
            <div className="sb-outcome sb-lose">
              Lost — {round.target - round.score} short of the target.
            </div>
          )}
        </section>
      )}

      {round && (
        <section className="sb-play">
          <div className="sb-rack">
            {round.rack.map((t) => (pickedIds.has(t.id) ? (
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

          <div className="sb-stick-wrap">
            <div className="sb-stick-head">
              <span className="sb-eyebrow">The composing stick</span>
              {spelt && (
                <span className="sb-stick-worth is-hand">
                  <span className="sb-stick-math">
                    {worthHow.bingoBonus > 0 && <><i>(</i><b className="sb-figure sb-pts">{worthHow.points - worthHow.bingoBonus}</b><i>+</i><b className="sb-figure sb-bingo">{worthHow.bingoBonus}</b><i>)</i></>}
                    {!worthHow.bingoBonus && <b className="sb-figure sb-pts">{worthHow.points}</b>}
                    <i>×</i>
                    <b className="sb-figure sb-mult">{worthHow.mult}</b>
                    <i>=</i>
                  </span>
                  <b className="sb-figure">{worth}</b>
                  {round.score + worth >= round.target ? 'meets the target'
                    : letters.length === 1 ? 'single letter' : 'points'}
                </span>
              )}
            </div>
            <div className={'sb-stick' + (formable ? '' : ' is-short')}>
              {letters.length === 0 && (
                <span className="sb-stick-empty">tap the case, or type — then Play it or Change it out · one tile alone always plays</span>
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
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') play(); }} />
            <button type="button" className="sb-go" onClick={play}
              disabled={!live || !letters}>Play</button>
            <button type="button" onClick={changeout}
              disabled={!live || !pickedIds.size || round.changeoutsLeft <= 0}
              title="Throw the tiles on the stick back into the bag and draw as many">
              Change out{pickedIds.size ? ' ' + pickedIds.size : ''}
            </button>
            <button type="button" onClick={() => setWord('')} disabled={!live}>Clear</button>
            <button type="button" onClick={() => {
              const best = SB.bestFromRack(rackLetters, (w) => round.scoreFor(w), 1);
              if (best.length) setWord(best[0].word);
              else say('Nothing spells out of this rack.');
            }} disabled={!live}>Best play</button>
          </div>

          <details className="sb-suggests-drop">
            <summary>
              <span className="sb-suggests-title">Words</span>
              {indexing && <span className="sb-hint">reading the dictionary…</span>}
              {!indexing && !letters && <span className="sb-hint">pick tiles or type letters</span>}
              {!indexing && letters && suggestions.length === 0
                && <span className="sb-hint">nothing spells out of {letters}</span>}
              {!indexing && suggestions.length > 0 && (
                <span className="sb-suggests-count">
                  {suggestions.length}
                  <b>{suggestions[0].word}</b>
                  <em>{suggestions[0].score}</em>
                </span>
              )}
            </summary>
            <div className="sb-suggests">
              {!indexing && suggestions.map((s, i) => (
                <button key={s.word} type="button"
                  className={'sb-suggest' + (i === 0 ? ' is-best' : '')}
                  onClick={() => playWord(s.word)} disabled={!live}>
                  {s.word}<em>{s.score}</em>
                </button>
              ))}
            </div>
          </details>
          {!formable && letters
            && <p className="sb-hint sb-warn-line">{letters} needs letters that aren’t in your rack.</p>}
        </section>
      )}

      <details className="sb-tune">
        <summary>Tuning · every constant, live</summary>
        <div className="sb-tune-grid">
          {Object.keys(SB.ROUND_DEFAULTS).map((key) => (
            <label key={key}>{TUNE_LABELS[key] || key}
              <input type="number" step={1} value={tune[key]}
                onChange={(e) => setConst(key, Number(e.target.value))} />
            </label>
          ))}
        </div>
        <p className="sb-tune-note">
          Target, words, changeouts and rack size take effect on the next Start; the mult
          and bonus figures apply to the next word; the gold figures are read at the win. Nothing is saved — copy the numbers you want to keep
          into src/sandbox/round.js.
        </p>
      </details>

      <section className="sb-log">
        {log.map((line, i) => <div key={log.length - i}>{line}</div>)}
      </section>
    </div>
  );
}
