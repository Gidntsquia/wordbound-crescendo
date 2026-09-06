// ROUND SANDBOX -- a RUN of three Balatro-with-Scrabble rounds (see
// COMBAT_REDESIGN.md): two normal enemies, then a boss, each with a higher
// point target. Gold pools across the run.
//
// Each round: a point target, four words, three changeouts. The classical piece is a
// SOUNDTRACK here and nothing more: it starts with the round, loops, and never
// touches the score. The tile play (case + composing stick + FLIP slide) is
// carried over from the tug sandbox unchanged; what the stick MEANS is new --
// Play scores the word standing on it, Change out throws those tiles back.
import { createDragReorder } from './dragReorder.js';
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

const TUNE_LABELS = {
  MOVEMENT_BASE_1: 'Target base, movement I',
  MOVEMENT_BASE_2: 'Target base, movement II',
  BIG_MULT: 'Big enemy × base',
  BOSS_MULT: 'Boss × base',
  PLAYS: 'Words per round',
  CHANGEOUTS: 'Changeouts',
  RACK_SIZE: 'Rack size',
  PTS_2: 'Short (1–2) · points', MULT_2: 'Short · mult',
  PTS_3: 'Three · points', MULT_3: 'Three · mult',
  PTS_4: 'Four · points', MULT_4: 'Four · mult',
  PTS_5: 'Five · points', MULT_5: 'Five · mult',
  PTS_6: 'Six · points', MULT_6: 'Six · mult',
  PTS_7: 'Seven+ · points', MULT_7: 'Seven+ · mult',
  GOLD_SMALL: 'Gold, small enemy',
  GOLD_BIG: 'Gold, big enemy',
  GOLD_BOSS: 'Gold, boss',
  GOLD_PER_WORD_LEFT: 'Gold per word left',
  START_GOLD: 'Starting gold',
  INTEREST_PER: 'Interest: 1 gold per',
  INTEREST_CAP: 'Interest cap',
};

// "FIVE · lvl 2 · 35 + letters 9 = 44 pts × 6" -- tier, points, then mult.
function describeBreakdown(b) {
  const pts = [];
  if (b.tierPts) pts.push(b.tierPts);
  pts.push('letters ' + b.base);
  if (b.bonusFlat) pts.push('tile bonus +' + b.bonusFlat);
  if (b.variantFlat) pts.push('charged +' + b.variantFlat);
  if (b.itemPoints) pts.push('items +' + b.itemPoints);
  let out = b.tierName + (b.tierLevel > 1 ? ' · lvl ' + b.tierLevel : '') + ' · ';
  out += (pts.length > 1 ? pts.join(' + ') + ' = ' : '') + b.points + ' pts × ' + b.mult;
  const multParts = [];
  if (b.itemMult) multParts.push('tier ' + b.tierMult + ' + items ' + b.itemMult);
  if (b.bonusMult !== 1) multParts.push('× tile ' + b.bonusMult);
  if (b.itemXMult && b.itemXMult !== 1) multParts.push('× items ' + b.itemXMult);
  if (multParts.length) out += ' (' + multParts.join(' ') + ')';
  return out;
}

export default function RoundSandbox() {
  const W = window.Wordbound;
  const SB = W.Sandbox;
  const fight = useRef(null);   // { run, round, seq, ctx, gain, def, piece }
  const [, forceRender] = useState(0);
  // idle | live | won (round, run continues) | choose (pick a reward item) | lost | run-won
  const [phase, setPhase] = useState('idle');
  const [log, setLog] = useState([]);
  const [word, setWord] = useState('');
  const [seed, setSeed] = useState('sandbox');
  // The word-maker helper (suggestions, Best play, fuzzy Play) -- off by default.
  const [helper, setHelper] = useState(false);
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

  // The dictionary index is only built once the helper is switched on.
  useEffect(() => {
    if (!helper || SB.isWordMakerReady()) return undefined;
    let alive = true;
    setIndexing(true);
    SB.warmWordMaker(() => { if (alive) setIndexing(false); });
    return () => { alive = false; };
  }, [helper, SB]);

  // Volume slider reaches the running soundtrack directly.
  useEffect(() => {
    const f = fight.current;
    if (f && f.gain) f.gain.gain.value = volume;
  }, [volume]);

  // Pull all three recordings down up front, not at each stage's start.
  useEffect(() => {
    const seen = new Set();
    SB.MOVEMENTS.forEach((m) => m.enemies.forEach((def) => {
      if (seen.has(def.recorded)) return;
      seen.add(def.recorded);
      const piece = SB[def.recorded];
      if (piece && piece.audio) SB.prefetchAudio(piece.audio).catch(() => {});
    }));
  }, [SB]);

  // Start the soundtrack for the run's current enemy.
  const startStage = useCallback((run) => {
    const def = run.enemy;
    const f = fight.current;
    if (f && f.seq) {
      if (f.seq.dispose) f.seq.dispose();
      else f.seq.stop();
    }
    const piece = SB[def.recorded];
    const seq = SB.createAudioPiece(f.ctx, f.gain, piece);
    seq.on('load-failed', (err) => say('The recording did not load ('
      + (err && err.message ? err.message : err) + ') — Restart to try again.'));
    seq.on('piece-ended', () => {
      const g = fight.current;
      if (!g || g.seq !== seq) return;
      seq.stop();
      seq.play();
    });
    seq.play();
    // Take the stage under the previous enemy's last breath, not over it.
    seq.whenReady.then(() => { if (fight.current?.seq === seq) seq.fadeIn(1.2); });
    const round = run.round;
    fight.current = { ...f, run, round, seq, def, piece };
    window.__round = round;
    window.__run = run;
    setWord('');
    setSuggestions([]);
    setPhase('live');
    say('Movement ' + SB.MOVEMENTS[run.movement].numeral + ' · ' + SB.KIND_LABEL[def.kind] + ' — '
      + def.name + ' takes up ' + piece.title + '. Target ' + round.target + '.');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [say, W, SB]);

  const start = useCallback(() => {
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

    const run = SB.createRun({
      rng, makeDeck: () => SB.createBagDeck(bagId), tune, items: [...itemIds]
    });
    fight.current = { ...(fight.current || {}), ctx, gain, seq: fight.current?.seq };
    setLog([]);
    if (itemIds.size) {
      say('Carrying ' + [...itemIds].map((id) => SB.ITEM_DEFS[id].name).join(', ') + '.');
    }
    startStage(run);
  }, [seed, bagId, volume, tune, itemIds, say, startStage]);

  // After a won round: bank the gold and move to the next enemy, or end the run.
  const nextStage = useCallback(() => {
    const f = fight.current;
    if (!f || !f.run || phase !== 'won') return;
    const state = f.run.next();
    if (state === 'won') {
      setPhase('run-won');
      say('The last boss falls. Run won with ' + f.run.gold + ' gold.');
      refresh();
      return;
    }
    if (f.run.offer) {
      setPhase('choose');
      say('Spoils: choose one of ' + f.run.offer.map((id) => SB.ITEM_DEFS[id].name).join(', ') + '.');
      refresh();
      return;
    }
    startStage(f.run);
  }, [phase, say, refresh, startStage, SB]);

  // Take one of the offered items (or none) and go on to the next enemy.
  const chooseItem = useCallback((id) => {
    const f = fight.current;
    if (!f || !f.run || phase !== 'choose') return;
    if (!f.run.choose(id)) return;
    say(id ? 'Took ' + SB.ITEM_DEFS[id].name + '.' : 'Took nothing.');
    startStage(f.run);
  }, [phase, say, startStage, SB]);

  const f = fight.current;
  const run = f ? f.run : null;
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
    const run = fight.current?.run;
    if (r.state === 'won') {
      setPhase('won');
      // The piece simply stops; no death sound.
      fight.current?.seq?.stop?.();
      say('Target met — ' + r.score + ' against ' + r.target + '. '
        + r.playsLeft + ' word' + (r.playsLeft === 1 ? '' : 's') + ' left → '
        + r.gold + ' gold' + (run.interestPreview() ? ' + ' + run.interestPreview() + ' interest' : '') + '.');
    } else if (r.state === 'lost') {
      setPhase('lost');
      say('Out of words at ' + r.score + ' — ' + (r.target - r.score) + ' short.');
    }
  }, [say, SB]);

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
    if (!formable) { say(letters + ' needs letters that aren’t in your rack.'); return; }
    // With the helper on, Play settles for the best word inside the letters.
    if (helper) {
      const found = SB.findWords(letters, (w) => r.scoreFor(w), 1);
      if (found.length > 0) { playWord(found[0].word); return; }
      say('Nothing spells out of ' + letters + '.');
      return;
    }
    say(letters + ' isn’t in the dictionary.');
  }, [letters, formable, phase, helper, playWord, say, SB]);

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
    if (!helper || !letters || indexing) { setSuggestions([]); return; }
    const r = fight.current?.round;
    setSuggestions(SB.findWords(letters, r ? (w) => r.scoreFor(w) : (w) => w.length, 10));
  }, [helper, letters, indexing, SB]);

  const stageTile = (tile) => {
    captureFlipFrom(tile.id);
    setWord(letters + (tile.letter === '?' ? '?' : tile.letter));
  };
  const unstageAt = (i) => {
    const t = slots[i];
    if (t) captureFlipFrom(t.id);
    setWord(letters.slice(0, i) + letters.slice(i + 1));
  };

  // Drag a tile along its row to reorder it -- the case and the stick both.
  // Every tile in the row is FLIPped so its neighbours slide aside; the
  // dragged tile slides in from where the finger let go of its ghost.
  const wordRef = useRef(letters); wordRef.current = letters;
  // While a drag is on, both rows are drawn in PREVIEW: the hollow tile stands
  // where the drop would put it, in whichever row the finger is over.
  const [preview, setPreview] = useState(null);   // { id, fromRow, fromIndex, toRow, to } | null
  const playRef = useRef(null);
  const dragRef = useRef(null);
  if (!dragRef.current) {
    const flipAll = (id) => {
      const r = fight.current?.round;
      if (!r) return;
      r.rack.forEach((t) => { if (t.id !== id) captureFlipFrom(t.id); });
    };
    dragRef.current = createDragReorder({
      rows: () => ({
        rack: playRef.current.querySelector('.sb-rack'),
        stick: playRef.current.querySelector('.sb-stick')
      }),
      onPreview: (p) => { flipAll(p.id); setPreview(p); },
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
        const cur = wordRef.current;
        if (p.fromRow === 'rack') {
          const tile = r.rack[p.fromIndex];
          if (!tile) return;
          if (p.toRow === 'rack') { r.moveTile(p.fromIndex, p.to); refresh(); return; }
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
          if (i >= 0) r.moveTile(i, p.to);
          refresh();
        }
      }
    });
  }
  const drag = dragRef.current;

  const setConst = (key, value) => {
    setTune((t) => ({ ...t, [key]: value }));
    if (fight.current) fight.current.round.tune[key] = value;
  };

  // Rows as drawn: the real order, or the drag's preview. Each entry carries
  // `hollow` (the tile being dragged) so the row can paint it as a hole.
  const moved = (arr, i, to) => { const a = arr.slice(); const x = a.splice(i, 1)[0]; a.splice(to, 0, x); return a; };
  const rackShown = (() => {
    if (!round) return [];
    let arr = round.rack.map((t, i) => ({ t, i, picked: pickedIds.has(t.id), hollow: false }));
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
      if (t) arr.splice(preview.to, 0, { t, i: -1, ch: t.letter, hollow: true });
    }
    return arr;
  })();

  const live = phase === 'live' && round;
  const spelt = !!(live && formable && round.isPlayable(letters));
  const worthHow = spelt ? round.breakdownFor(letters) : null;
  const worth = worthHow ? worthHow.total : 0;
  const pct = round ? Math.min(100, (100 * round.score) / round.target) : 0;

  return (
    <div className="sb">
      <header className="sb-head">
        <div className="sb-wordmark">
          <span className="sb-eyebrow">Round sandbox · two movements</span>
          <h1>Wordbound<span className="sb-amp">·</span>Crescendo</h1>
        </div>
        {round && (
          <div className="sb-dyn">
            <span className="sb-dyn-label">{SB.KIND_LABEL[run.enemy.kind]} · score / target</span>
            <span className="sb-dyn-mark">{round.score}<small> / {round.target}</small></span>
          </div>
        )}
      </header>

      {run && (
        <nav className="sb-strip" aria-label="The run">
          {run.movements.map((m, mi) => (
            <span key={m.numeral} className={'sb-strip-mv' + (mi === run.movement ? ' is-now' : mi < run.movement ? ' is-done' : '')}>
              <b className="sb-strip-numeral">{m.numeral}</b>
              {m.enemies.map((e, si) => {
                const done = run.felled.includes(e.id);
                const now = mi === run.movement && si === run.stage;
                return (
                  <span key={e.id} title={e.name + ' · target ' + run.targetFor(mi, si)}
                    className={'sb-pip sb-pip-' + e.kind + (now ? ' is-now' : '') + (done ? ' is-done' : '')}>
                    {e.kind === 'boss' ? '♩' : '·'}
                  </span>
                );
              })}
            </span>
          ))}
          <span className="sb-strip-enemy">{run.enemy.glyph} {run.enemy.name}</span>
          <span className="sb-purse" title={'Interest: 1 gold per ' + run.tune.INTEREST_PER + ' held, up to ' + run.tune.INTEREST_CAP}>
            <b>{run.gold}</b> gold
            {run.interestPreview() > 0 && <em>+{run.interestPreview()} interest</em>}
          </span>
        </nav>
      )}

      <section className="sb-setup">
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
        <label className="sb-toggle" title="Word suggestions, Best play, and Play settling for the best word in the letters">
          <input type="checkbox" checked={helper} onChange={(e) => setHelper(e.target.checked)} />
          Word helper
        </label>
        <button type="button" className="sb-go" onClick={start}>
          {phase === 'idle' ? 'Start' : 'Restart'}
        </button>
      </section>

      <section className="sb-items" role="group" aria-label="Sample items">
        <span className="sb-eyebrow">Starting items · read at start</span>
        {SB.ITEMS.map((d) => {
          const id = d.id;
          return (
            <label key={id} className={'sb-item' + (itemIds.has(id) ? ' is-on' : '')}
              title={d.hint}>
              <input type="checkbox" checked={itemIds.has(id)}
                onChange={(e) => setItemIds((prev) => {
                  const next = new Set(prev);
                  if (e.target.checked) next.add(id); else next.delete(id);
                  return next;
                })} />
              {d.name}<em>{[d.points ? '+' + d.points + ' pts' : '', d.mult ? '+' + d.mult + ' mult' : ''].filter(Boolean).join(' ')}</em>
            </label>
          );
        })}
        {run && [...itemIds].sort().join() !== run.startItems.slice().sort().join()
          && <em className="sb-bag-note">on restart</em>}
      </section>

      {phase === 'idle' && (
        <p className="sb-hint">Pick a bag, then Start. Two movements of three enemies — small, big, then a boss — each with a higher target to beat in four words. A word scores its length tier: base points plus letters, times the tier’s mult. Gold earns interest between fights.</p>
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
              <span>{round.items.map((id) => SB.ITEM_DEFS[id].name).join(' · ')}</span>
            )}
            <span className="sb-enemy">{SB.KIND_LABEL[run.enemy.kind]} · {f.def.glyph} {f.def.name} · {f.piece.title}</span>
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
              Won — {round.gold} gold ({round.reward} + {round.tune.GOLD_PER_WORD_LEFT} × {round.playsLeft} word{round.playsLeft === 1 ? '' : 's'} left)
              {run.interestPreview() > 0 && <> + {run.interestPreview()} interest</>}.
              {' '}
              <button type="button" className="sb-go" onClick={nextStage}>
                {run.movement >= run.movements.length - 1 && run.enemy.kind === 'boss' ? 'Finish the run' : 'Claim the spoils'}
              </button>
            </div>
          )}
          {phase === 'choose' && run.offer && (
            <div className="sb-outcome sb-win sb-offer">
              <span className="sb-eyebrow">Spoils · take one</span>
              {run.offer.map((id) => {
                const d = SB.ITEM_DEFS[id];
                return (
                  <button key={id} type="button" className="sb-item sb-offer-pick" title={d.hint}
                    onClick={() => chooseItem(id)}>
                    {d.name}<em>{[d.points ? '+' + d.points + ' pts' : '', d.mult ? '+' + d.mult + ' mult' : ''].filter(Boolean).join(' ')}</em>
                  </button>
                );
              })}
              <button type="button" className="sb-offer-skip" onClick={() => chooseItem(null)}>
                Take nothing · on to {SB.enemyAt(run.movement, run.stage).name}
              </button>
            </div>
          )}
          {phase === 'run-won' && (
            <div className="sb-outcome sb-win">
              Run won — {run.gold} gold across {run.felled.length} enemies.
            </div>
          )}
          {phase === 'lost' && (
            <div className="sb-outcome sb-lose">
              Lost to {run.enemy.name} — {round.target - round.score} short of the target.
            </div>
          )}
        </section>
      )}

      {round && (
        <section className="sb-play" ref={playRef}>
          <div className="sb-rack">
            {rackShown.map(({ t, i, picked, hollow }) => (picked ? (
              <span key={t.id} className="sb-tile is-slot" aria-hidden="true" />
            ) : (
              <button key={t.id} type="button" disabled={!live}
                className={'sb-tile' + (hollow ? ' is-dragging' : '')}
                data-flip-tile-id={t.id}
                {...drag.bind('rack', i, t.id)}
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
                    <em className="sb-tier-name">{worthHow.tierName}{worthHow.tierLevel > 1 ? ' ' + worthHow.tierLevel : ''}</em>
                    <b className="sb-figure sb-pts">{worthHow.points}</b>
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
              {stickShown.map(({ t, i, ch, hollow }) => (t ? (
                <button key={t.id} type="button" disabled={!live}
                  className={'sb-tile is-set' + (hollow ? ' is-dragging' : '')}
                  data-flip-tile-id={t.id}
                  title="Tap to send home · drag to reorder"
                  {...drag.bind('stick', i, t.id)}
                  onClick={() => unstageAt(i)}>
                  {t.letter === '?' ? (ch === '?' ? '␣' : ch) : t.letter}
                  <sub>{W.Lexicon.LETTER_VALUES[t.letter] || 0}</sub>
                </button>
              ) : (
                <button key={'gap' + i} type="button" disabled={!live}
                  className={'sb-tile is-missing' + (hollow ? ' is-dragging' : '')}
                  title="No tile in the case spells this"
                  {...drag.bind('stick', i, null)}
                  onClick={() => unstageAt(i)}>
                  {ch}
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
            {helper && (
              <button type="button" onClick={() => {
                const best = SB.bestFromRack(rackLetters, (w) => round.scoreFor(w), 1);
                if (best.length) setWord(best[0].word);
                else say('Nothing spells out of this rack.');
              }} disabled={!live}>Best play</button>
            )}
          </div>

          {helper && <details className="sb-suggests-drop">
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
          </details>}
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
          Targets, words, changeouts and rack size take effect on the next round; the tier
          figures apply to the next word; the gold figures are read at the win. Nothing is saved — copy the numbers you want to keep
          into src/sandbox/round.js.
        </p>
      </details>

      <section className="sb-log">
        {log.map((line, i) => <div key={log.length - i}>{line}</div>)}
      </section>
    </div>
  );
}
