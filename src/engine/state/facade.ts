// READ_SLOWLY_PLAN.md A3: wires the pure RunState/RoundState engine into the
// UI without rewriting every call site in store.ts/RoundSandbox.jsx/
// Shop.jsx/HeldRow.jsx/RunStrip.jsx to a dispatch/reducer model -- there is
// no test suite, the app is live, and those call sites read AND mutate the
// old mutable run/round/shop objects directly (not solely through store.ts's
// reducer), so a wholesale rewrite risks a silent regression only playing
// the game would catch. Instead this builds the SAME mutable-shaped API
// (RunLike/Round from content/round.ts) as a facade over a closured "box"
// holding the current immutable RunState + RngState: properties are getters
// reading live off the box, methods call the pure engine and reassign the
// box. The facade object itself has stable identity, so callers that cache
// `fight.current.run`/`.round` once per fight (RoundSandbox.jsx's
// startStage/start) keep working unmodified.
import type { Tile } from '../tiles';
import type { RngState } from '../rng';
import * as Run from './run';
import * as R from './round';
import type { RunState } from './run';
import { MOVEMENTS } from '../content/enemies';

export interface Box {
  run: RunState;
  rng: RngState;
  crescendo: () => { phase: string; mag?: number } | null;
  extendCrescendo?: (extraSec: number) => void;
  character?: string;
}

export function roundFacade(box: Box) {
  return {
    get tune() {
      return box.run.round!.tune;
    },
    get target() {
      return box.run.round!.target;
    },
    get situation() {
      return box.run.round!.situation;
    },
    get rule() {
      return box.run.round!.rule;
    },
    get usedLetters() {
      return box.run.round!.usedLetters;
    },
    get reward() {
      return box.run.round!.reward;
    },
    get playsLeft() {
      return box.run.round!.playsLeft;
    },
    get changeoutsLeft() {
      return box.run.round!.changeoutsLeft;
    },
    get rackSize() {
      return box.run.round!.rackSize;
    },
    get items() {
      return box.run.round!.items;
    },
    get tierLevels() {
      return box.run.round!.tierLevels;
    },
    get score() {
      return box.run.round!.score;
    },
    get ink() {
      return box.run.round!.ink;
    },
    get state() {
      return box.run.round!.state;
    },
    get plays() {
      return box.run.round!.plays;
    },
    get pile() {
      return box.run.round!.pile;
    },
    get rack() {
      return box.run.round!.rack;
    },
    get premium() {
      return box.run.round!.premium;
    },
    get favour() {
      return box.run.round!.favour;
    },
    get characterUsed() {
      return box.run.round!.characterUsed;
    },
    breakdownFor(word: string) {
      return R.breakdownFor(
        box.run.round!,
        word,
        box.run,
        box.run.characterTile,
      );
    },
    scoreFor(word: string) {
      return R.scoreFor(box.run.round!, word, box.run, box.run.characterTile);
    },
    isBarred(tile: Tile) {
      return R.isBarred(box.run.round!, tile);
    },
    barredIn(tiles: Tile[]) {
      return R.barredIn(box.run.round!, tiles);
    },
    isPlayable(word: string) {
      return R.isPlayable(word);
    },
    playWord(raw: string) {
      const [next, result, s] = Run.playWord(
        box.run,
        raw,
        box.rng,
        box.crescendo(),
      );
      box.run = next;
      box.rng = s;
      if (result.effects?.extendCrescendo && box.extendCrescendo) {
        // Sustain (items.ts): a UI-timing side effect, not state -- the
        // caller (RoundSandbox.jsx) owns the audio via opts.extendCrescendo.
        box.extendCrescendo(result.effects.extendCrescendo);
      }
      return result;
    },
    changeout(tileIds: string[]) {
      const [outcome, s] = R.changeout(box.run.round!, tileIds, box.rng);
      box.run = { ...box.run, round: outcome.state };
      box.rng = s;
      return outcome.result;
    },
    destroyTile(tileId: string) {
      const [next, ok, s] = R.destroyTile(box.run.round!, tileId, box.rng);
      box.run = { ...box.run, round: next };
      box.rng = s;
      return ok;
    },
    moveTile(from: number, to: number) {
      box.run = { ...box.run, round: R.moveTile(box.run.round!, from, to) };
      return true;
    },
  };
}

export function createRunFacade(box: Box) {
  const round = roundFacade(box);
  const shop = {
    get cards() {
      return box.run.shop?.cards;
    },
    get packs() {
      return box.run.shop?.packs;
    },
    get coupon() {
      return box.run.shop?.coupon;
    },
    get rerolls() {
      return box.run.shop?.rerolls;
    },
    get favours() {
      return box.run.shop?.favours;
    },
    rerollPrice() {
      const shopState = box.run.shop;
      return (
        (Number(box.run.tune.REROLL_PRICE) || 0) +
        (Number(box.run.tune.REROLL_STEP) || 0) * (shopState?.rerolls || 0)
      );
    },
    buy(i: number) {
      const [next, res] = Run.buyCard(box.run, i);
      box.run = next;
      return res;
    },
    sell(itemIndex: number) {
      const [next, res] = Run.sellItem(box.run, itemIndex);
      box.run = next;
      return res;
    },
    reroll() {
      const [next, res, s] = Run.reroll(box.run, box.rng);
      box.run = next;
      box.rng = s;
      return res;
    },
    openPack(i: number) {
      const [next, res, s] = Run.openPack(box.run, i, box.rng);
      box.run = next;
      box.rng = s;
      return res;
    },
  };

  return {
    get key() {
      return box.run.key;
    },
    get tune() {
      return box.run.tune;
    },
    get movements() {
      return MOVEMENTS;
    },
    get movement() {
      return box.run.movement;
    },
    get stage() {
      return box.run.stage;
    },
    get enemy() {
      return box.run.enemy;
    },
    get round() {
      return box.run.round ? round : null;
    },
    get deck() {
      return box.run.deck;
    },
    get items() {
      return box.run.items;
    },
    get startItems() {
      return box.run.startItems;
    },
    get consumables() {
      return box.run.consumables;
    },
    get itemState() {
      return box.run.itemState;
    },
    get shop() {
      return box.run.shop ? shop : null;
    },
    get letterChoice() {
      return box.run.letterChoice;
    },
    get pack() {
      return box.run.pack;
    },
    get tierLevels() {
      return box.run.tierLevels;
    },
    get ink() {
      return box.run.ink;
    },
    get felled() {
      return box.run.felled;
    },
    get resolved() {
      return box.run.resolved;
    },
    get skipped() {
      return box.run.skipped;
    },
    get favours() {
      return box.run.favours;
    },
    get bestPlay() {
      return box.run.bestPlay;
    },
    get wordsPlayed() {
      return box.run.wordsPlayed;
    },
    get lastWin() {
      return box.run.lastWin;
    },
    get state() {
      return box.run.state;
    },
    get movementIIIQuillDone() {
      return box.run.movementIIIQuillDone;
    },
    get movementIIIQuillFound() {
      return box.run.movementIIIQuillFound;
    },
    set movementIIIQuillFound(v: string | null | undefined) {
      box.run = { ...box.run, movementIIIQuillFound: v };
    },
    get quillFound() {
      return box.run.quillFound;
    },
    set quillFound(v: string | null | undefined) {
      box.run = { ...box.run, quillFound: v };
    },
    get character() {
      return box.character;
    },
    set character(v: string | undefined) {
      box.character = v;
    },
    get characterTile() {
      return box.run.characterTile;
    },
    get wonLetters() {
      return box.run.wonLetters;
    },
    get discoveredQuills() {
      return box.run.discoveredQuills;
    },
    targetFor(movement: number, stage: number) {
      return Run.targetFor(box.run, movement, stage);
    },
    interestPreview() {
      return Run.interestPreview(box.run);
    },
    addTile(tile: Tile) {
      box.run = Run.addTile(box.run, tile);
    },
    extendCrescendo(extraSec: number) {
      if (box.extendCrescendo) box.extendCrescendo(extraSec);
    },
    skip() {
      const [next, res, s] = Run.skip(box.run, box.rng);
      box.run = next;
      box.rng = s;
      return res;
    },
    moveItem(from: number, to: number) {
      const [next, ok] = Run.moveItem(box.run, from, to);
      box.run = next;
      return ok;
    },
    levelTier(tierId: string) {
      const [next, ok] = Run.levelTier(box.run, tierId);
      box.run = next;
      return ok;
    },
    next() {
      const [next, s] = Run.next(box.run, box.rng);
      box.run = next;
      box.rng = s;
      return next.state;
    },
    pickLetter(letter: string) {
      const [next, ok, s] = Run.pickLetter(box.run, letter, box.rng);
      box.run = next;
      box.rng = s;
      return ok;
    },
    leaveShop() {
      const [next, ok, s] = Run.leaveShop(box.run, box.rng);
      box.run = next;
      box.rng = s;
      return ok;
    },
    pick(i: number | null) {
      const [next, res] = Run.pick_(box.run, i);
      box.run = next;
      return res;
    },
    useConsumable(i: number, tileIds?: string[], extra?: { vowel?: string }) {
      const [next, res, s] = Run.useConsumable(
        box.run,
        i,
        tileIds || [],
        extra,
        box.rng,
      );
      box.run = next;
      box.rng = s;
      return res;
    },
    useAdhocMark(id: string, tileIds?: string[], extra?: { vowel?: string }) {
      const [next, res, s] = Run.useAdhocMark(
        box.run,
        id,
        tileIds,
        extra,
        box.rng,
      );
      box.run = next;
      box.rng = s;
      return res;
    },
    drawMarkHand() {
      const [tiles, s] = Run.drawMarkHand(box.run, box.rng);
      box.rng = s;
      return tiles;
    },
    saveMark(id: string) {
      const [next, res] = Run.saveMark(box.run, id);
      box.run = next;
      return res;
    },
    sellConsumable(i: number) {
      const [next, res] = Run.sellConsumable(box.run, i);
      box.run = next;
      return res;
    },
  };
}

export type RunFacade = ReturnType<typeof createRunFacade>;
export type RoundFacade = ReturnType<typeof roundFacade>;

export interface CreateRunFacadeOpts {
  tune?: Run.CreateRunStateOpts['tune'];
  key?: string;
  deck?: Tile[];
  items?: string[];
  characterId?: string;
  wonLetters?: string[];
  discoveredQuills?: string[];
  crescendo?: () => { phase: string; mag?: number } | null;
  extendCrescendo?: (extraSec: number) => void;
}

// The facade's twin of content/round.ts's createRun(opts): takes the same
// options (minus `rng`, which is a pure RngState here, and `makeDeck`,
// unused anywhere in the codebase) plus the RngState to seed play with.
export function createRunFacadeFromOpts(
  opts: CreateRunFacadeOpts,
  rngState: RngState,
): RunFacade {
  const [run, s] = Run.createRunState(
    {
      tune: opts.tune,
      key: opts.key,
      deck: opts.deck,
      items: opts.items,
      characterId: opts.characterId,
      wonLetters: opts.wonLetters,
      discoveredQuills: opts.discoveredQuills,
    },
    rngState,
  );
  const box: Box = {
    run,
    rng: s,
    crescendo: opts.crescendo || (() => null),
    extendCrescendo: opts.extendCrescendo,
  };
  return createRunFacade(box);
}

// Re-exported so RoundSandbox.jsx's start() can build a pure RngState the
// same way it used to build a mutable RngStream (window.Game.RNG.create).
export { fromSeed } from '../rng';
export type { RngState } from '../rng';
