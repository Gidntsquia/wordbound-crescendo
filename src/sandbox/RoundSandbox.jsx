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

// Plain FLIP: record where the tile was,
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
  MOVEMENT_BASE_3: 'Target base, movement III',
  BIG_MULT: 'Big enemy × base',
  BOSS_MULT: 'Boss × base',
  PLAYS: 'Words per round',
  CHANGEOUTS: 'Swaps per fight',
  RACK_SIZE: 'Rack size',
  PTS_2: 'Short (1–2) · points', MULT_2: 'Short · mult',
  PTS_3: 'Three · points', MULT_3: 'Three · mult',
  PTS_4: 'Four · points', MULT_4: 'Four · mult',
  PTS_5: 'Five · points', MULT_5: 'Five · mult',
  PTS_6: 'Six · points', MULT_6: 'Six · mult',
  PTS_7: 'Seven+ · points', MULT_7: 'Seven+ · mult',
  ITEM_SLOTS: 'Item slots',
  CONSUMABLE_SLOTS: 'Consumable slots',
  CARD_SLOTS: 'Shop card slots',
  CARD_ITEM: 'Card roll · item weight',
  CARD_INK: 'Card roll · ink weight',
  CARD_ETUDE: 'Card roll · étude weight',
  PACK_SLOTS: 'Shop pack slots',
  PACK_PRICE: 'Pack price',
  PACK_CHOICES: 'Pack · choices shown',
  INK_PRICE: 'Ink price',
  ETUDE_PRICE: 'Étude price',
  REROLL_PRICE: 'Reroll price',
  REROLL_STEP: 'Reroll price step',
  INK_GILT: 'Gilt · points per tile',
  INK_BOLD: 'Bold · mult per tile',
  INK_STEEL: 'Steel · × mult held',
  INK_COIN_CAP: 'Coin · gold cap',
  BOUNTY_GOLD: 'Skip bonus · gold',
  GOLD_SMALL: 'Gold, small enemy',
  GOLD_BIG: 'Gold, big enemy',
  GOLD_BOSS: 'Gold, boss',
  GOLD_PER_WORD_LEFT: 'Gold per word left',
  START_GOLD: 'Starting gold',
  INTEREST_PER: 'Interest: 1 gold per',
  INTEREST_CAP: 'Interest cap',
};

// THE SCORING CASCADE's timings (DEMO_PLAN_2 Phase 4), all in one place.
// Every duration is multiplied by SMALL_SPEED..1 as `intensity` goes 0..1,
// so a three-letter word is a tap and a seven-letter word with items is a
// two-to-three second cascade.
const CASCADE = {
  LOCK_MS: 110,    // stick tiles snap up, brief freeze
  TIER_MS: 160,    // the tier's base pts x mult land
  LETTER_MS: 95,   // per tile, left to right
  ITEM_MS: 260,    // per item that fired
  RULE_MS: 320,    // the tempo marking
  HOLD_MS: 200,    // a steel tile held, a tile's own x-mult
  TOTAL_MS: 620,   // pts x mult collapse into the total, meter fills, board shakes
  CLEAR_MS: 320,   // tiles fly to the plays list, rack refills
  SMALL_SPEED: 0.5, // duration factor at intensity 0
  SHAKE_TIERS: 3   // .sb-board.is-hit-1..3
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
  let out = b.tierName + (b.tierLevel > 1 ? ' · lvl ' + b.tierLevel : '') + ' · ';
  const basePts = b.tierPts + b.base + b.bonusFlat + b.variantFlat + b.inkPoints;
  out += (pts.length > 1 ? pts.join(' + ') + ' = ' : '') + basePts + ' pts × ' + (b.tierMult + b.inkMult);
  if (b.inkMult) out += ' (tier ' + b.tierMult + ' + bold ' + b.inkMult + ')';
  const fired = (b.itemNotes || []).map((n) => n.name + ' ' + n.note);
  if (b.bonusMult !== 1) fired.push('tile × ' + b.bonusMult);
  if (b.holdMult && b.holdMult !== 1) fired.push('steel held × ' + b.holdMult);
  if (fired.length) out += ' → ' + fired.join(' → ') + ' → ' + b.points + ' × ' + b.mult;
  return out;
}

function itemBlurb(d) { return d.hint; }
function consumableName(SB, c) {
  if (c.kind === 'etude') return SB.TIER_DEFS[c.id].name + ' étude';
  const ink = SB.INK_DEFS ? SB.INK_DEFS[c.id] : null;
  return ink ? ink.name : c.id;
}
function consumableBlurb(SB, c, run) {
  if (c.kind === 'etude') {
    const t = SB.TIER_DEFS[c.id];
    const lvl = (run.tierLevels[c.id] || 1);
    return 'Level ' + t.name + ' to ' + (lvl + 1) + ': +' + t.lvlPts + ' pts, +' + t.lvlMult + ' mult';
  }
  const ink = SB.INK_DEFS ? SB.INK_DEFS[c.id] : null;
  return ink ? ink.hint : '';
}
function cardName(SB, c) {
  if (c.kind === 'item') return SB.ITEM_DEFS[c.id].name;
  return consumableName(SB, c);
}
function cardBlurb(SB, c, run) {
  if (c.kind === 'item') return itemBlurb(SB.ITEM_DEFS[c.id]);
  return consumableBlurb(SB, c, run);
}

// What the run holds: items (sellable in the shop) and consumables (usable
// any time an étude makes sense; inks need a tile, see Phase 4).
function HeldRow({ run, SB, act, live, inShop, onInk, lit, floats }) {
  const tune = run.tune;
  return (
    <div className="sb-held">
      <div className="sb-held-row" aria-label="Items">
        <span className="sb-eyebrow">Items · {run.items.length}/{tune.ITEM_SLOTS}</span>
        {run.items.map((id, i) => {
          const d = SB.ITEM_DEFS[id];
          return (
            <span key={id} className={'sb-card sb-card-item is-' + (d.rarity || 'common') + (lit === id ? ' is-jiggle' : '')} title={itemBlurb(d)}>
              {(floats || []).filter((x) => x.on === id).map((x) => <i key={x.key} className={'sb-float sb-float-card is-' + x.tone}>{x.text}</i>)}
              <b>{d.name}</b><em>{itemBlurb(d)}</em>
              {run.items.length > 1 && (
                <span className="sb-card-order" title="Items fire left to right">
                  <button type="button" disabled={i === 0} aria-label="Move left"
                    onClick={() => act(null, { ok: run.moveItem(i, i - 1) })}>‹</button>
                  <button type="button" disabled={i === run.items.length - 1} aria-label="Move right"
                    onClick={() => act(null, { ok: run.moveItem(i, i + 1) })}>›</button>
                </span>
              )}
              {inShop && (
                <button type="button" className="sb-card-sell" title="Sell"
                  onClick={() => act('Sold ' + d.name + '.', run.shop.sell(i), 'coin')}>
                  sell {Math.floor(SB.priceOf(d) / 2)}
                </button>
              )}
            </span>
          );
        })}
        {run.items.length === 0 && <span className="sb-hint">nothing yet</span>}
      </div>
      {(run.consumables.length > 0 || inShop) && (
        <div className="sb-held-row" aria-label="Consumables">
          <span className="sb-eyebrow">Consumables · {run.consumables.length}/{tune.CONSUMABLE_SLOTS}</span>
          {run.consumables.map((c, i) => (
            <span key={i} className={'sb-card sb-card-' + c.kind} title={consumableBlurb(SB, c, run)}>
              <b>{consumableName(SB, c)}</b><em>{consumableBlurb(SB, c, run)}</em>
              {(live || inShop) && c.kind === 'etude' && (
                <button type="button" className="sb-card-use"
                  onClick={() => act('Played the ' + consumableName(SB, c) + ' — ' + SB.TIER_DEFS[c.id].name + ' is level ' + ((run.tierLevels[c.id] || 1) + 1) + '.', run.useConsumable(i))}>use</button>
              )}
              {c.kind === 'ink' && onInk && (live || SB.INK_DEFS[c.id].targets === 0) && (
                <button type="button" className="sb-card-use" onClick={() => onInk(i)}>use</button>
              )}
              {inShop && (
                <button type="button" className="sb-card-sell" title="Sell"
                  onClick={() => act('Sold the ' + consumableName(SB, c) + '.', run.sellConsumable(i), 'coin')}>
                  sell {Math.floor((c.kind === 'ink' ? tune.INK_PRICE : tune.ETUDE_PRICE) / 2)}
                </button>
              )}
            </span>
          ))}
          {run.consumables.length === 0 && <span className="sb-hint">none held</span>}
        </div>
      )}
    </div>
  );
}

// The shop between fights: two cards, two packs, reroll, and the door.
function Shop({ run, SB, act, leave, onInk, firstVisit }) {
  const shop = run.shop;
  const next = SB.enemyAt(run.movement, run.stage);
  const packDef = (kind) => SB.PACK_KINDS.find((k) => k.kind === kind);
  return (
    <div className="sb-shop">
      <div className="sb-shop-head">
        <span className="sb-eyebrow">The shop · between fights{shop.coupon ? ' · coupon: cards are free' : ''}{shop.packs.some((p) => p.free && !p.opened) ? ' · a free pack' : ''}</span>
        <span className="sb-purse"><b>{run.gold}</b> gold</span>
      </div>
      {firstVisit && <div className="sb-callout sb-callout-inline">Items score every word. Gold carries over.</div>}
      {run.pack && (
        <div className="sb-pack-open">
          <span className="sb-eyebrow">{packDef(run.pack.kind).name} · keep one</span>
          <div className="sb-shop-row">
            {run.pack.choices.map((c, i) => (
              <button key={i} type="button" className={'sb-card sb-card-pick sb-card-' + c.kind}
                title={c.kind === 'tile' ? 'A ' + c.tile.letter + ' for your rack' : cardBlurb(SB, c, run)}
                onClick={() => act('Kept ' + (c.kind === 'tile' ? 'the ' + c.tile.letter : 'the ' + cardName(SB, c)) + '.', run.pick(i), 'tick')}>
                {c.kind === 'tile' ? (
                  <span className="sb-tile is-set sb-tile-static">{c.tile.letter}<sub>{SB.LETTER_VALUES ? SB.LETTER_VALUES[c.tile.letter] : window.Wordbound.Lexicon.LETTER_VALUES[c.tile.letter]}</sub></span>
                ) : (<><b>{cardName(SB, c)}</b><em>{cardBlurb(SB, c, run)}</em></>)}
              </button>
            ))}
            <button type="button" className="sb-offer-skip" onClick={() => act('Kept nothing.', run.pick(null))}>Keep nothing</button>
          </div>
        </div>
      )}
      {!run.pack && (<>
        <div className="sb-shop-row" aria-label="Cards">
          {shop.cards.map((c, i) => (
            <button key={i} type="button"
              disabled={c.sold || run.gold < c.price
                || (c.kind === 'item' && run.items.length >= run.tune.ITEM_SLOTS)
                || (c.kind === 'ink' && run.consumables.length >= run.tune.CONSUMABLE_SLOTS)}
              className={'sb-card sb-card-buy sb-card-' + c.kind + (c.kind === 'item' ? ' is-' + (SB.ITEM_DEFS[c.id].rarity || 'common') : '') + (c.sold ? ' is-sold' : '')}
              title={cardBlurb(SB, c, run)}
              onClick={() => act('Bought ' + cardName(SB, c) + ' for ' + c.price + '.', shop.buy(i), 'coin')}>
              <span className="sb-card-kind">{c.kind}</span>
              <b>{c.sold ? 'sold' : cardName(SB, c)}</b>
              <em>{c.sold ? '' : cardBlurb(SB, c, run)}</em>
              {!c.sold && <span className="sb-price">{c.price}</span>}
            </button>
          ))}
          <button type="button" className="sb-reroll" disabled={run.gold < shop.rerollPrice()}
            onClick={() => act('Rerolled.', shop.reroll(), 'coin')}>
            Reroll <span className="sb-price">{shop.rerollPrice()}</span>
          </button>
        </div>
        <div className="sb-shop-row" aria-label="Packs">
          {shop.packs.map((p, i) => (
            <button key={i} type="button" disabled={p.opened || run.gold < (p.free ? 0 : p.price)}
              className={'sb-card sb-card-pack sb-pack-' + p.kind + (p.opened ? ' is-sold' : '')}
              title={packDef(p.kind).hint}
              onClick={() => act('Opened a ' + packDef(p.kind).name.toLowerCase() + '.', shop.openPack(i), 'coin')}>
              <span className="sb-card-kind">pack</span>
              <b>{p.opened ? 'opened' : packDef(p.kind).name}</b>
              <em>{p.opened ? '' : packDef(p.kind).hint}</em>
              {!p.opened && <span className="sb-price">{p.free ? 'free' : p.price}</span>}
            </button>
          ))}
        </div>
        <HeldRow run={run} SB={SB} act={act} inShop onInk={onInk} />
        <button type="button" className="sb-go sb-shop-leave" onClick={leave}>
          Continue<small>next: {next.glyph} {next.name} · target {run.targetFor(run.movement, run.stage)}</small>
        </button>
      </>)}
    </div>
  );
}

// The best so far, kept in the browser: best word, deepest enemy, wins.
const BEST_KEY = 'wbc.best';
function readBest() {
  try { return JSON.parse(window.localStorage.getItem(BEST_KEY)) || {}; } catch (e) { return {}; }
}
function writeBest(next) {
  try { window.localStorage.setItem(BEST_KEY, JSON.stringify(next)); } catch (e) { /* private mode, quota: ignore */ }
}
function depthOf(run) { return run.movement * 3 + run.stage; }
function runLength(run) { return run.movements.reduce((n, m) => n + m.enemies.length, 0); }
function recordRun(run, won) {
  const best = readBest();
  const out = { ...best };
  if (run.bestPlay && (!best.word || run.bestPlay.breakdown.total > best.word.total)) {
    out.word = { word: run.bestPlay.word, total: run.bestPlay.breakdown.total, enemy: run.bestPlay.enemy };
  }
  const depth = won ? runLength(run) : depthOf(run);
  if (!best.deepest || depth > best.deepest.depth) {
    out.deepest = { depth, name: won ? 'the whole run' : run.enemy.name };
  }
  out.wins = (best.wins || 0) + (won ? 1 : 0);
  out.runs = (best.runs || 0) + 1;
  writeBest(out);
  return out;
}
function randomSeed() {
  const words = ['sonata', 'cadenza', 'fugue', 'rondo', 'largo', 'vivace', 'minuet', 'coda', 'aria', 'canon'];
  return words[Math.floor(Math.random() * words.length)] + '-' + Math.floor(Math.random() * 9000 + 1000);
}

// One-time CALLOUTS (Phase 2): short hints that appear in context and go
// away on the action they describe. wbc.seen holds the ids already shown.
const SEEN_KEY = 'wbc.seen';
function readSeen() {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    if (raw === '1') return new Set(['legacy']); // the old three-line overlay
    return new Set(JSON.parse(raw));
  } catch (e) { return new Set(); }
}
function writeSeen(set) {
  try { window.localStorage.setItem(SEEN_KEY, JSON.stringify([...set])); } catch (e) { /* ignore */ }
}
const LIVE_URL = 'https://gidntsquia.github.io/wordbound-crescendo/';
// The Balatro-style text summary friends can paste back.
function shareText(run, won, seed) {
  const total = runLength(run);
  const lines = ['Wordbound: Crescendo'];
  lines.push(won ? 'Won — all ' + total + ' enemies felled' : 'Felled ' + run.felled.length + ' of ' + total + ' — lost to ' + run.enemy.name);
  if (run.bestPlay) lines.push('Best word: ' + run.bestPlay.word + ' for ' + run.bestPlay.breakdown.total);
  lines.push(run.wordsPlayed + ' words · ' + run.gold + ' gold' + (run.items.length ? ' · ' + run.items.map((id) => window.Wordbound.Sandbox.ITEM_DEFS[id].name).join(', ') : ''));
  lines.push('Seed ' + seed + ' · ' + LIVE_URL);
  return lines.join('\n');
}

// The end of a run, won or lost: what was felled, the best word, the purse
// and the items, and the way back in.
function EndScreen({ run, won, SB, seed, onAgain, onCopy, onShare, best, describe }) {
  const felled = run.felled.map((id) => {
    for (const m of run.movements) for (const e of m.enemies) if (e.id === id) return e;
    return null;
  }).filter(Boolean);
  return (
    <div className={'sb-end ' + (won ? 'sb-win' : 'sb-lose')}>
      <h2 className="sb-end-title">{won ? 'The last boss falls.' : 'Lost to ' + run.enemy.name + '.'}</h2>
      <p className="sb-end-sub">
        {won ? 'All ' + run.movements.length + ' movements, ' + run.felled.length + ' enemies felled' : (run.round.target - run.round.score) + ' short of the target'}
        {' · '}{run.wordsPlayed} word{run.wordsPlayed === 1 ? '' : 's'} played · <b>{run.gold}</b> gold
      </p>
      <div className="sb-end-grid">
        <div>
          <span className="sb-eyebrow">Felled</span>
          <div className="sb-end-felled">
            {felled.map((e) => <span key={e.id} className={'sb-pip sb-pip-' + e.kind + ' is-done'} title={e.name}>{e.kind === 'boss' ? '♩' : '·'}</span>)}
            {run.skipped.length > 0 && <em className="sb-hint">{run.skipped.length} skipped</em>}
            {felled.length === 0 && <em className="sb-hint">none</em>}
          </div>
        </div>
        <div>
          <span className="sb-eyebrow">Best word</span>
          {run.bestPlay ? (
            <div className="sb-end-best">
              <span className="sb-plays-word">{run.bestPlay.word}</span>
              <b className="sb-figure">{run.bestPlay.breakdown.total}</b>
              <span className="sb-plays-how">{describe(run.bestPlay.breakdown)} · against {run.bestPlay.enemy}</span>
            </div>
          ) : <em className="sb-hint">none played</em>}
        </div>
        <div>
          <span className="sb-eyebrow">Items</span>
          <div className="sb-end-items">
            {run.items.map((id) => <span key={id} className={'sb-card sb-card-item is-' + (SB.ITEM_DEFS[id].rarity || 'common')}><b>{SB.ITEM_DEFS[id].name}</b></span>)}
            {run.items.length === 0 && <em className="sb-hint">none</em>}
          </div>
        </div>
      </div>
      <div className="sb-end-actions">
        <button type="button" className="sb-go" onClick={onAgain}>Play again</button>
        <button type="button" className="sb-share" onClick={onShare}>Copy result</button>
        <span className="sb-seed-line">seed <code>{seed}</code>
          <button type="button" onClick={onCopy}>copy</button></span>
        {best && best.word && (
          <span className="sb-hint">best ever: {best.word.word} for {best.word.total} · deepest: {best.deepest ? best.deepest.name : '—'} · {best.wins || 0} win{best.wins === 1 ? '' : 's'} in {best.runs || 0} run{best.runs === 1 ? '' : 's'}</span>
        )}
      </div>
    </div>
  );
}

// The score flies from the stick to the readout: its own element, never the
// tile (the FLIP owns .sb-tile's transform).
function flyScore(total) {
  if (typeof document === 'undefined') return;
  const from = document.querySelector('.sb-stick');
  const to = document.querySelector('.sb-dyn-mark');
  if (!from || !to) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'sb-score-fly';
  el.textContent = '+' + total;
  el.style.left = (a.left + a.width / 2) + 'px';
  el.style.top = (a.top + a.height / 2) + 'px';
  document.body.appendChild(el);
  const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
  const dy = (b.top + b.height / 2) - (a.top + a.height / 2);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(0.6)';
    el.style.opacity = '0';
  }));
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
}

export default function RoundSandbox() {
  const W = window.Wordbound;
  const SB = W.Sandbox;
  const fight = useRef(null);   // { run, round, seq, ctx, gain, def, piece }
  const [, forceRender] = useState(0);
  // idle | live | won (round, run continues) | shop (between fights) | lost | run-won
  const [phase, setPhase] = useState('idle');
  const [log, setLog] = useState([]);
  const [word, setWord] = useState('');
  const [seed, setSeed] = useState('sandbox');
  // The word-maker helper (suggestions, Best play, fuzzy Play) -- off by default.
  const [helper, setHelper] = useState(false);
  const [bagId, setBagId] = useState('normal');
  const [volume, setVolume] = useState(0.4);
  // Input sounds (sfx.js), on by default, remembered in wbc.sfx.
  const [sfxOn, setSfxOn] = useState(() => {
    try { return window.localStorage.getItem('wbc.sfx') !== '0'; } catch (e) { return true; }
  });
  useEffect(() => {
    try { window.localStorage.setItem('wbc.sfx', sfxOn ? '1' : '0'); } catch (e) { /* ignore */ }
    if (fight.current?.sfx) fight.current.sfx.setEnabled(sfxOn);
  }, [sfxOn]);
  // The sound for an input event, if a run has opened the audio device.
  const sfx = useCallback((name, ...a) => {
    const s = fight.current?.sfx;
    if (s && s[name]) s[name](...a);
  }, []);
  const [tune, setTune] = useState(() => ({ ...SB.ROUND_DEFAULTS }));
  // Sample items, read at Start (a mid-round swap would half-apply).
  const [itemIds, setItemIds] = useState(() => new Set());
  const [suggestions, setSuggestions] = useState([]);
  const [best, setBest] = useState(() => readBest());
  // Narrow screens keep the setup bar, starting items and tuning behind a gear.
  const [gearOpen, setGearOpen] = useState(false);
  // Which one-time callouts have been shown (see readSeen).
  const [seen, setSeen] = useState(() => readSeen());
  const markSeen = useCallback((id) => {
    setSeen((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev); next.add(id); writeSeen(next); return next;
    });
  }, []);
  const [indexing, setIndexing] = useState(false);
  const inputRef = useRef(null);
  // THE SCORING CASCADE (Phase 4): while a word scores, phase is 'scoring'
  // and this narrates breakdown.steps -- the stick still shows the played
  // tiles (from `tiles`), the case shows `rackBefore` with hollows, the
  // header shows `scoreBase` until the total lands. Any tap skips ahead.
  const [scoring, setScoring] = useState(null);
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
    if (f && f.sfx) f.sfx.setLevel(volume);
  }, [volume]);

  // Warm the recording for an enemy (bytes only; the decode waits for the
  // fight). Nine excerpts are ~25 MB, too much to pull up front on a phone,
  // so only the enemy on stage and the one after it are warmed.
  const warm = useCallback((movement, stage) => {
    const def = SB.enemyAt(movement, stage);
    const piece = def && SB[def.recorded];
    if (piece && piece.audio) SB.prefetchAudio(piece.audio).catch(() => {});
  }, [SB]);
  const warmAhead = useCallback((run) => {
    warm(run.movement, run.stage);
    const m = run.movements[run.movement];
    if (run.stage + 1 < m.enemies.length) warm(run.movement, run.stage + 1);
    else warm(run.movement + 1, 0);
  }, [warm]);
  useEffect(() => { warm(0, 0); warm(0, 1); }, [warm]);

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
    warmAhead(run);
    fight.current = { ...f, run, round, seq, def, piece };
    window.__round = round;
    window.__run = run;
    setWord('');
    setSuggestions([]);
    setPhase('live');
    say('Movement ' + SB.MOVEMENTS[run.movement].numeral + ' · ' + SB.KIND_LABEL[def.kind] + ' — '
      + def.name + ' takes up ' + piece.title + '. Target ' + round.target + '.');
    if (def.rule) setTimeout(() => markSeen('boss'), 6000);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [say, W, SB, warmAhead, markSeen]);

  const start = useCallback((seedOverride) => {
    const useSeed = typeof seedOverride === 'string' ? seedOverride : seed;
    if (useSeed !== seed) setSeed(useSeed);
    const rng = window.Game.RNG.create(useSeed);

    let ctx = fight.current?.ctx;
    let gain = fight.current?.gain;
    let sfxNode = fight.current?.sfx;
    try {
      if (ctx && ctx.state === 'closed') { ctx = null; gain = null; sfxNode = null; }
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
      say('Could not open the audio device: ' + (err && err.message ? err.message : err));
      return;
    }

    const run = SB.createRun({
      rng, deck: SB.createBagDeck(bagId), tune, items: [...itemIds]
    });
    fight.current = { ...(fight.current || {}), ctx, gain, sfx: sfxNode, seq: fight.current?.seq };
    setLog([]);
    if (itemIds.size) {
      say('Carrying ' + [...itemIds].map((id) => SB.ITEM_DEFS[id].name).join(', ') + '.');
    }
    startStage(run);
  }, [seed, bagId, volume, sfxOn, tune, itemIds, say, startStage, SB]);

  // After a won round: bank the gold and move to the next enemy, or end the run.
  const nextStage = useCallback(() => {
    const f = fight.current;
    if (!f || !f.run || phase !== 'won') return;
    const state = f.run.next();
    if (state === 'won') {
      setPhase('run-won');
      say('The last boss falls. Run won with ' + f.run.gold + ' gold.');
      setBest(recordRun(f.run, true));
      refresh();
      return;
    }
    if (f.run.shop) {
      warm(f.run.movement, f.run.stage);
      setPhase('shop');
      say('The shop opens. ' + f.run.gold + ' gold in the purse.');
      refresh();
      return;
    }
    startStage(f.run);
  }, [phase, say, refresh, startStage, SB, warm]);

  // Leave the shop and go on to the next enemy.
  const leaveShop = useCallback(() => {
    const f = fight.current;
    if (!f || !f.run || phase !== 'shop') return;
    if (!f.run.leaveShop()) return;
    markSeen('shop');
    startStage(f.run);
  }, [phase, startStage, markSeen]);

  // Walk past a small or big enemy for its favour.
  const skipFight = useCallback(() => {
    const f = fight.current;
    if (!f || !f.run || phase !== 'live') return;
    const res = f.run.skip();
    if (!res.ok) { say(res.reason); return; }
    say('Skipped ' + f.def.name + ' for a bonus — ' + SB.FAVOUR_DEFS[res.favour].name + ': ' + SB.FAVOUR_DEFS[res.favour].hint + '.');
    startStage(f.run);
  }, [phase, say, startStage, SB]);
  const copySeed = useCallback(() => {
    try { navigator.clipboard.writeText(seed).then(() => say('Seed copied.'), () => say('Seed: ' + seed)); }
    catch (e) { say('Seed: ' + seed); }
  }, [seed, say]);
  const copyResult = useCallback(() => {
    const run = fight.current?.run;
    if (!run) return;
    const text = shareText(run, run.state === 'won', seed);
    try { navigator.clipboard.writeText(text).then(() => say('Result copied — paste it anywhere.'), () => say(text)); }
    catch (e) { say(text); }
  }, [seed, say]);

  // Every shop action funnels through here so the log and the render agree.
  const act = useCallback((label, res, sound) => {
    if (!res || !res.ok) { say(res && res.reason ? res.reason : 'Nothing happened.'); sfx('thud'); return false; }
    if (label) say(label);
    if (sound) sfx(sound);
    refresh();
    return true;
  }, [say, refresh, sfx]);

  // INKING: tapping a held ink enters "choose a tile" on the case; Apply
  // commits it. { index, ink, ids, vowel } while choosing.
  const [inking, setInking] = useState(null);
  const useInk = useCallback((i) => {
    const r = fight.current?.run;
    if (!r) return;
    const c = r.consumables[i];
    if (!c || c.kind !== 'ink') return;
    const ink = SB.INK_DEFS[c.id];
    if (ink.targets === 0) {
      const res = r.useConsumable(i, []);
      act(res.ok ? res.result.note : null, res, 'shimmer');
      return;
    }
    setWord('');
    setInking({ index: i, ink, ids: [], vowel: null });
  }, [act, SB]);
  const applyInk = useCallback(() => {
    const r = fight.current?.run;
    if (!r || !inking) return;
    const res = r.useConsumable(inking.index, inking.ids, { vowel: inking.vowel });
    if (act(res.ok ? res.result.note : null, res, 'shimmer')) setInking(null);
  }, [inking, act]);
  const toggleInkTile = (id) => {
    setInking((k) => {
      if (!k) return k;
      const ids = k.ids.includes(id) ? k.ids.filter((x) => x !== id)
        : k.ids.length >= k.ink.targets ? [...k.ids.slice(1), id] : [...k.ids, id];
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
  const playedIds = new Set(scoring ? scoring.tiles.map((t) => t.id) : []);
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
      if (run) { run.next(); setBest(recordRun(run, false)); }
    }
  }, [say, SB]);

  const runCascade = useCallback(async (r, res, rackBefore, scoreBefore) => {
    const b = res.breakdown;
    const steps = b.steps || [];
    const k = intensity(b.total, r.target);
    const speed = CASCADE.SMALL_SPEED + (1 - CASCADE.SMALL_SPEED) * k;
    skipRef.current = false;
    const wait = (ms) => new Promise((resolve) => {
      const id = setTimeout(() => { waitRef.current = null; resolve(); }, skipRef.current ? 0 : ms * speed);
      waitRef.current = () => { clearTimeout(id); waitRef.current = null; resolve(); };
    });
    const play = r.plays[r.plays.length - 1];
    const st = {
      word: res.word, tiles: play.tiles, steps, breakdown: b, rackBefore, scoreBase: scoreBefore,
      pts: 0, mult: 0, tier: null, litTile: null, litItem: null, floats: [], total: null, hit: 0, k,
      crossed: scoreBefore < r.target && r.score >= r.target, cleared: false
    };
    let n = 0;
    const show = () => setScoring({ ...st });
    const float = (on, text, tone) => { st.floats = [...st.floats.slice(-6), { key: n++, on, text, tone }]; };
    setPhase('scoring');
    show();
    sfx('lock', k);
    await wait(CASCADE.LOCK_MS);
    const letters = steps.filter((x) => x.kind === 'letter');
    for (const step of steps) {
      st.pts = step.runPts; st.mult = step.runMult;
      st.litTile = null; st.litItem = null;
      if (step.kind === 'tier') {
        st.tier = step;
        show();
        await wait(CASCADE.TIER_MS);
      } else if (step.kind === 'letter') {
        const i = letters.indexOf(step);
        st.litTile = step.tile.id;
        float(step.tile.id, '+' + step.pts + (step.mult ? ' · +' + step.mult + ' mult' : ''), step.mult ? 'mult' : 'pts');
        sfx('letter', i, letters.length, !!step.ink);
        show();
        await wait(CASCADE.LETTER_MS);
      } else if (step.kind === 'item' || step.kind === 'rule') {
        st.litItem = step.id;
        float(step.id, step.note, step.tone);
        sfx(step.kind === 'rule' ? 'rule' : 'item', step.tone);
        show();
        await wait(step.kind === 'rule' ? CASCADE.RULE_MS : CASCADE.ITEM_MS);
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
    st.litTile = null; st.litItem = null;
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
    if (r.state === 'live') setPhase('live'); else finish(r);
    refresh();
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [sfx, finish, refresh]);

  const playWord = useCallback((raw) => {
    const r = fight.current?.round;
    if (!r || phase !== 'live') return;
    const rackBefore = r.rack.slice();
    const scoreBefore = r.score;
    const res = r.playWord(raw);
    if (!res.ok) { say(res.reason); sfx('thud'); return; }
    markSeen('stick');
    setWord('');
    setSuggestions([]);
    say(res.word + ' — ' + res.breakdown.total + ' (' + describeBreakdown(res.breakdown) + ')'
      + ' → ' + r.score + ' / ' + r.target + '.');
    res.messages.forEach((m) => say(m));
    runCascade(r, res, rackBefore, scoreBefore);
  }, [phase, say, sfx, runCascade, markSeen]);

  const play = useCallback(() => {
    const r = fight.current?.round;
    if (!r || phase !== 'live' || !letters) return;
    if (r.isPlayable(letters)) { playWord(letters); return; }
    if (!formable) { say(letters + ' needs letters that aren’t in your rack.'); sfx('thud'); return; }
    // With the helper on, Play settles for the best word inside the letters.
    if (helper) {
      const found = SB.findWords(letters, (w) => r.scoreFor(w), 1);
      if (found.length > 0) { playWord(found[0].word); return; }
      say('Nothing spells out of ' + letters + '.');
      sfx('thud');
      return;
    }
    say(letters + ' isn’t in the dictionary.');
    sfx('thud');
  }, [letters, formable, phase, helper, playWord, say, SB, sfx]);

  const changeout = useCallback(() => {
    const r = fight.current?.round;
    if (!r || phase !== 'live') return;
    const ids = slots.filter(Boolean).map((t) => t.id);
    const res = r.changeout(ids);
    if (!res.ok) { say(res.reason); sfx('thud'); return; }
    sfx('shuffle');
    markSeen('swap');
    setWord('');
    setSuggestions([]);
    say('Swapped ' + res.returned.map((t) => t.letter).join('') + ' for '
      + res.drawn.map((t) => t.letter).join('') + ' — ' + r.changeoutsLeft + ' swap' + (r.changeoutsLeft === 1 ? '' : 's') + ' left.');
    refresh();
  }, [slots, phase, say, refresh, sfx, markSeen]);

  useEffect(() => {
    if (!helper || !letters || indexing) { setSuggestions([]); return; }
    const r = fight.current?.round;
    setSuggestions(SB.findWords(letters, r ? (w) => r.scoreFor(w) : (w) => w.length, 10));
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
        sfx('tick', p.to, 0);
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
    if (scoring && !scoring.cleared) {
      return scoring.rackBefore.map((t, i) => ({ t, i, picked: playedIds.has(t.id), hollow: false }));
    }
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
  const barredNow = live ? slots.filter(Boolean).filter((t) => round.isBarred(t)) : [];
  const spelt = !!(live && formable && !barredNow.length && round.isPlayable(letters));
  const worthHow = spelt ? round.breakdownFor(letters) : null;
  const worth = worthHow ? worthHow.total : 0;
  const scoreShown = scoring ? scoring.scoreBase : round ? round.score : 0;
  const pct = round ? Math.min(100, (100 * scoreShown) / round.target) : 0;

  return (
    <div className={'sb' + (gearOpen ? ' is-gear-open' : '') + (phase === 'idle' ? ' is-title' : '')}
      onPointerDownCapture={scoring ? skipCascade : undefined}>
      <header className="sb-head">
        <div className="sb-wordmark">
          <span className="sb-eyebrow">{phase === 'idle' ? 'Words against music' : 'Movement ' + SB.MOVEMENTS[run.movement].numeral + ' · ' + SB.KIND_LABEL[run.enemy.kind]}</span>
          <h1>Wordbound<span className="sb-amp">·</span>Crescendo</h1>
        </div>
        <button type="button" className="sb-gear" aria-label="Setup and tuning" title="Setup and tuning"
          onClick={() => setGearOpen((g) => !g)}>⚙</button>
      </header>

      {phase === 'idle' && (
        <section className="sb-title">
          <p className="sb-title-line">Spell words. Beat the target before your words run out.</p>
          <button type="button" className="sb-go sb-title-play" onClick={() => start(randomSeed())}>Play</button>
          <p className="sb-hint sb-title-best">
            {best.word ? <>Best: {best.word.word} for {best.word.total} · {best.wins || 0} win{best.wins === 1 ? '' : 's'} in {best.runs || 0} run{best.runs === 1 ? '' : 's'}</> : 'Nine enemies, each with its own piece of music. Gold between fights buys items that score every word.'}
          </p>
        </section>
      )}

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
          {phase === 'shop' && <span className="sb-strip-enemy">next · {run.enemy.glyph} {run.enemy.name}</span>}
          <span className="sb-purse" title={'Interest: 1 gold per ' + run.tune.INTEREST_PER + ' held, up to ' + run.tune.INTEREST_CAP}>
            <b>{run.gold}</b> gold
            {run.interestPreview() > 0 && <em>+{run.interestPreview()} interest</em>}
          </span>
        </nav>
      )}

      <div className="sb-gear-panel">
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
        <label className="sb-toggle" title="Tile, swap, shop and ink sounds">
          <input type="checkbox" checked={sfxOn} onChange={(e) => setSfxOn(e.target.checked)} />
          SFX
        </label>
        <label className="sb-toggle" title="Word suggestions, Best play, and Play settling for the best word in the letters">
          <input type="checkbox" checked={helper} onChange={(e) => setHelper(e.target.checked)} />
          Word helper
        </label>
        <button type="button" className="sb-go" onClick={() => start()}>
          {phase === 'idle' ? 'Start with this seed' : 'Restart with this seed'}
        </button>
        {round && <span className="sb-hint"><b>{round.pile.drawPile.length}</b> tiles left in the bag of {run.deck.length}</span>}
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
              {d.name}<em>{d.hint}</em>
            </label>
          );
        })}
        {run && [...itemIds].sort().join() !== run.startItems.slice().sort().join()
          && <em className="sb-bag-note">on restart</em>}
      </section>
      </div>


      {round && (
        <section className={'sb-board' + (scoring && scoring.hit ? ' is-hit-' + scoring.hit : '')}>
          <div className="sb-scoreline" aria-label="Score against the target">
            <span className={'sb-dyn-mark' + (scoring && scoring.total != null ? ' is-hit' : '')}>{scoreShown}</span>
            <div className="sb-meter" aria-label="Progress to target">
              <div className={'sb-meter-fill' + (scoreShown >= round.target ? ' is-met' : '')}
                style={{ width: pct + '%' }} />
            </div>
            <span className="sb-target"><small>target</small>{round.target}</span>
            <span className="sb-counters">
              <span><b>{round.playsLeft}</b> word{round.playsLeft === 1 ? '' : 's'}</span>
              <span className={seen.has('swap') || !live || round.changeoutsLeft <= 0 ? '' : 'sb-callout-anchor'}>
                <b>{round.changeoutsLeft}</b> swap{round.changeoutsLeft === 1 ? '' : 's'}
              </span>
            </span>
          </div>
          <div className="sb-enemy-line">
            <span className="sb-enemy">{f.def.glyph} {f.def.name}</span>
            <span className="sb-piece">{f.piece.title}{f.piece.composer ? ' · ' + f.piece.composer : ''}</span>
          </div>
          {round.rule && (
            <div className={'sb-rule' + (scoring && scoring.litItem === round.rule.id ? ' is-flash' : '') + (!seen.has('boss') ? ' is-pulse' : '')}>
              {scoring && scoring.floats.filter((x) => x.on === round.rule.id).map((x) => <i key={x.key} className={'sb-float sb-float-card is-' + x.tone}>{x.text}</i>)}
              <span className="sb-eyebrow">Tempo marking · {round.rule.name}</span>
              <b className="sb-rule-plain">{round.rule.plain}</b>
              <q>{round.rule.text}</q>
            </div>
          )}
          {phase === 'live' && round.favour && round.plays.length === 0 && (
            <div className="sb-skip">
              <span className="sb-hint">Or skip {f.def.name} for a bonus — <b>{SB.FAVOUR_DEFS[round.favour].name}</b>: {SB.FAVOUR_DEFS[round.favour].hint}. No shop after a skip.</span>
              <button type="button" onClick={skipFight}>Skip for the bonus</button>
            </div>
          )}
          {phase !== 'shop' && <HeldRow run={run} SB={SB} act={act} live={phase === 'live'} onInk={useInk}
            lit={scoring ? scoring.litItem : null} floats={scoring ? scoring.floats : null} />}
          {round.plays.length > (scoring && !scoring.cleared ? 1 : 0) && (
            <ol className="sb-plays">
              {(scoring && !scoring.cleared ? round.plays.slice(0, -1) : round.plays).map((p, i) => (
                <li key={i}>
                  <span className="sb-plays-word">
                    {i === round.plays.length - 1 && p.tiles
                      ? p.tiles.map((t, j) => <i key={t.id} data-flip-tile-id={t.id}>{p.word[j]}</i>)
                      : p.word}
                  </span>
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
                {run.movement >= run.movements.length - 1 && run.enemy.kind === 'boss' ? 'Finish the run' : 'To the shop'}
              </button>
            </div>
          )}
          {phase === 'shop' && run.shop && (
            <Shop run={run} SB={SB} act={act} leave={leaveShop} onInk={useInk} firstVisit={!seen.has('shop')} />
          )}
          {(phase === 'run-won' || phase === 'lost') && (
            <EndScreen run={run} won={phase === 'run-won'} SB={SB} seed={seed} best={best}
              onAgain={() => start(randomSeed())} onCopy={copySeed} onShare={copyResult} describe={describeBreakdown} />
          )}
        </section>
      )}

      {round && (phase === 'live' || phase === 'scoring' || phase === 'won') && (
        <section className="sb-play" ref={playRef}>
          {live && !seen.has('rack') && round.plays.length === 0 && (
            <div className="sb-callout">Tap letters to spell a word</div>
          )}
          <div className="sb-rack">
            {rackShown.map(({ t, i, picked, hollow }) => (picked ? (
              <span key={t.id} className="sb-tile is-slot" aria-hidden="true" />
            ) : (
              <button key={t.id} type="button" disabled={!live}
                className={'sb-tile' + (hollow ? ' is-dragging' : '') + (t.ink ? ' is-ink-' + t.ink : '')
                  + (inking && inking.ids.includes(t.id) ? ' is-inking' : '') + (round.isBarred(t) ? ' is-barred' : '')
                  + (scoring && scoring.litTile === t.id ? ' is-lit' : '')}
                data-flip-tile-id={t.id}
                title={t.ink ? SB.INK_DEFS[t.ink].name + ' — ' + SB.INK_DEFS[t.ink].hint : undefined}
                {...(inking ? {} : drag.bind('rack', i, t.id))}
                onClick={() => (inking ? toggleInkTile(t.id) : round.isBarred(t) ? (sfx('thud'), say(t.letter + ' has been played this round — ' + round.rule.name + '.')) : stageTile(t))}>
                {t.letter === '?' ? '␣' : t.letter}
                <sub>{W.Lexicon.LETTER_VALUES[t.letter] || 0}</sub>
              </button>
            )))}
          </div>

          {inking && (
            <div className="sb-inking">
              <span className="sb-eyebrow">{inking.ink.name}</span>
              <span className="sb-hint">
                {inking.ink.targets === 1 ? 'tap one of your tiles' : 'tap up to ' + inking.ink.targets + ' of your tiles'}
                {' · '}{inking.ink.hint}
              </span>
              {inking.ink.needsVowel && (
                <span className="sb-vowels">
                  {SB.VOWELS.map((v) => (
                    <button key={v} type="button" className={'sb-vowel' + (inking.vowel === v ? ' is-on' : '')}
                      onClick={() => setInking((k) => ({ ...k, vowel: v }))}>{v}</button>
                  ))}
                </span>
              )}
              <button type="button" className="sb-go" onClick={applyInk}
                disabled={!inking.ids.length || (inking.ink.needsVowel && !inking.vowel)}>
                Apply{inking.ids.length ? ' to ' + inking.ids.length : ''}
              </button>
              <button type="button" onClick={() => setInking(null)}>Cancel</button>
            </div>
          )}

          <div className="sb-stick-wrap">
            <div className="sb-stick-head">
              {live && !seen.has('stick') && letters.length >= 2
                ? <span className="sb-callout sb-callout-inline">Tap Play, or tap a tile to send it back</span>
                : <span className="sb-eyebrow">{scoring ? 'Scoring' : letters.length ? 'Your word' : '\u00a0'}</span>}
              {scoring && (
                <span className="sb-stick-worth is-hand is-scoring">
                  <span className="sb-stick-math">
                    <em className="sb-tier-name">{scoring.tier ? scoring.tier.name + (scoring.tier.level > 1 ? ' ' + scoring.tier.level : '') : '\u00a0'}</em>
                    <b className="sb-figure sb-pts">{scoring.pts}</b>
                    <i>×</i>
                    <b className="sb-figure sb-mult">{scoring.mult}</b>
                    <i>=</i>
                  </span>
                  <b className={'sb-figure sb-total' + (scoring.total != null ? ' is-hit' : '')}>{scoring.total != null ? scoring.total : '\u2026'}</b>
                  {scoring.total != null && scoring.crossed && <span className="sb-crossed">meets the target</span>}
                </span>
              )}
              {!scoring && spelt && (
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
            <div className={'sb-stick' + (formable ? '' : ' is-short') + (scoring && !scoring.cleared ? ' is-locked' : '')}>
              {scoring && !scoring.cleared && scoring.tiles.map((t) => (
                <span key={t.id} className={'sb-tile-pop' + (scoring.litTile === t.id ? ' is-pop' : '')}>
                  {scoring.floats.filter((x) => x.on === t.id).map((x) => <i key={x.key} className={'sb-float is-' + x.tone}>{x.text}</i>)}
                  <button type="button" disabled data-flip-tile-id={t.id}
                    className={'sb-tile is-set' + (t.ink ? ' is-ink-' + t.ink : '') + (scoring.litTile === t.id ? ' is-lit' : '')}>
                    {t.letter === '?' ? '␣' : t.letter}
                    <sub>{W.Lexicon.LETTER_VALUES[t.letter] || 0}</sub>
                  </button>
                </span>
              ))}
              {scoring && scoring.floats.filter((x) => x.on === 'stick').map((x) => <i key={x.key} className={'sb-float is-' + x.tone}>{x.text}</i>)}
              {!scoring && letters.length === 0 && (
                <span className="sb-stick-empty">tap tiles above, or type — then Play, or Swap them for new tiles · one tile alone always plays</span>
              )}
              {stickShown.map(({ t, i, ch, hollow }) => (t ? (
                <button key={t.id} type="button" disabled={!live}
                  className={'sb-tile is-set' + (hollow ? ' is-dragging' : '') + (t.ink ? ' is-ink-' + t.ink : '') + (round.isBarred(t) ? ' is-barred' : '')}
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
                  title="None of your tiles spells this"
                  {...drag.bind('stick', i, null)}
                  onClick={() => unstageAt(i)}>
                  {ch}
                </button>
              )))}
            </div>
          </div>

          {live && !seen.has('swap') && pickedIds.size > 0 && round.changeoutsLeft > 0 && seen.has('stick') && (
            <div className="sb-callout">Swap tiles you don’t want — {round.tune.CHANGEOUTS} per fight</div>
          )}
          <div className="sb-input">
            <input ref={inputRef} value={word} disabled={!live}
              className={formable ? '' : 'is-unformable'}
              placeholder="Tap tiles, or type"
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') play(); }} />
            <button type="button" className="sb-go" onClick={play}
              disabled={!live || !letters}>Play</button>
            <button type="button" onClick={changeout}
              disabled={!live || !pickedIds.size || round.changeoutsLeft <= 0}
              title="Put the chosen tiles back in the bag and draw as many">
              Swap{pickedIds.size ? ' ' + pickedIds.size : ''}
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
          {formable && barredNow.length > 0
            && <p className="sb-hint sb-warn-line">{barredNow.map((t) => t.letter).join(', ')} has been played this round — {round.rule.name}.</p>}
        </section>
      )}

      <div className="sb-gear-panel sb-gear-panel-tune">
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
          Targets, words, swaps and rack size take effect on the next round; the tier
          figures apply to the next word; the gold figures are read at the win. Nothing is saved — copy the numbers you want to keep
          into src/sandbox/round.js.
        </p>
      </details>
      </div>

      <section className="sb-log">
        {log.map((line, i) => <div key={log.length - i}>{line}</div>)}
      </section>
    </div>
  );
}
