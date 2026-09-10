// The board -- case (rack), composing stick, inking picker, play/swap/clear
// input row, bag/discard details, word-helper suggestions -- moved out of
// RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4, mechanical extraction), then
// split further into Rack/InkingPicker/Stick/InputRow/PilesDrawer/
// SuggestionsDrawer (READ_SLOWLY_PLAN.md A4, second pass) and ported to
// .tsx (READ_SLOWLY_PLAN.md A1 remainder). The section's ref is still owned
// by RoundSandbox (drag.bind's row lookups query it via
// playRef.current.querySelector), so it's forwarded rather than created
// here.
import { forwardRef } from 'react';
import Rack from './Rack';
import InkingPicker from './InkingPicker';
import Stick from './Stick';
import InputRow from './InputRow';
import PilesDrawer from './PilesDrawer';
import SuggestionsDrawer from './SuggestionsDrawer';
import { useCallout } from '../chrome/Callout';
import type { Tile } from '../../engine/tiles';
import type { RoundFacade } from '../../engine/state/facade';
import type {
  Inking as RealInking,
  ScoringState as RealScoringState,
} from './FightScreen';

interface RackEntry {
  t: Tile;
  i: number;
  picked: boolean;
  hollow: boolean;
}

interface StickEntry {
  t: Tile | null;
  i: number;
  ch: string | undefined;
  hollow: boolean;
}

type Inking = RealInking;

type RoundLike = RoundFacade;

type ScoringState = RealScoringState;

interface WorthHow {
  tierName: string;
  tierLevel: number;
  points: number;
  mult: number;
}

interface DragBind {
  bind: (
    row: string,
    index: number,
    id: string | null,
  ) => { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void };
}

interface Suggestion {
  word: string;
  score: number;
}

const PlayBoard = forwardRef<
  HTMLElement,
  {
    hiddenOnMobile?: boolean;
    live: boolean;
    seen: ReadonlySet<string>;
    round: RoundLike;
    inking: Inking | null;
    setInking: React.Dispatch<React.SetStateAction<Inking | null>>;
    toggleInkTile: (id: string) => void;
    applyInk: () => void;
    SB: {
      MARK_DEFS: Record<string, { name: string; hint: string }>;
      VOWELS: string[];
      bestFromRack: (
        letters: string,
        score: (w: string) => number,
        n: number,
      ) => Suggestion[];
    };
    rackShown: RackEntry[];
    drag: DragBind | null;
    letters: string;
    setWord: (w: string) => void;
    play: () => void;
    changeout: () => void;
    pickedIds: Set<string>;
    helper: boolean;
    rackLetters: string;
    say: (m: string) => void;
    stageTile: (t: Tile) => void;
    unstageAt: (i: number) => void;
    sfx: (name: string, ...a: unknown[]) => void;
    W: { Lexicon: { LETTER_VALUES: Record<string, number> } };
    formable: boolean;
    barredNow: Tile[];
    spelt: boolean;
    worthHow: WorthHow | null;
    worth: number;
    scoring: ScoringState | null;
    stickShown: StickEntry[];
    indexing: boolean;
    suggestions: Suggestion[];
    playWord: (word: string) => void;
    characterTile?: Tile | null;
    characterPicked?: boolean;
  }
>(function PlayBoard(
  {
    hiddenOnMobile,
    live,
    seen,
    round,
    inking,
    setInking,
    toggleInkTile,
    applyInk,
    SB,
    rackShown,
    drag,
    letters,
    setWord,
    play,
    changeout,
    pickedIds,
    helper,
    rackLetters,
    say,
    stageTile,
    unstageAt,
    sfx,
    W,
    formable,
    barredNow,
    spelt,
    worthHow,
    worth,
    scoring,
    stickShown,
    indexing,
    suggestions,
    playWord,
    characterTile,
    characterPicked,
  },
  playRef,
) {
  useCallout(
    live && !seen.has('rack') && round.plays.length === 0,
    'Tap letters to spell a word',
  );
  useCallout(
    live && !!characterTile && !seen.has('character'),
    'Your letter — tap it into any word. It scores extra and comes back after.',
  );
  return (
    <section
      className={
        'sb-play mb-[22px] border-t border-b border-[var(--rule)] py-[22px] max-[620px]:mb-2.5 max-[620px]:flex-none max-[620px]:py-2.5' +
        (hiddenOnMobile ? ' max-[620px]:hidden' : '')
      }
      ref={playRef as React.Ref<HTMLElement>}
    >
      <Rack
        rackShown={rackShown}
        live={live}
        inking={inking}
        round={round}
        scoring={scoring}
        SB={SB}
        drag={drag}
        toggleInkTile={toggleInkTile}
        stageTile={stageTile}
        say={say}
        sfx={sfx}
        letterValues={W.Lexicon.LETTER_VALUES}
        characterTile={characterTile}
        characterPicked={characterPicked}
      />

      {inking && (
        <InkingPicker
          inking={inking}
          setInking={setInking}
          applyInk={applyInk}
          vowels={SB.VOWELS}
        />
      )}

      <Stick
        live={live}
        seen={seen}
        letters={letters}
        scoring={scoring}
        spelt={spelt}
        worthHow={worthHow}
        worth={worth}
        round={round}
        formable={formable}
        stickShown={stickShown}
        drag={drag}
        unstageAt={unstageAt}
        letterValues={W.Lexicon.LETTER_VALUES}
      />

      <InputRow
        live={live}
        letters={letters}
        play={play}
        changeout={changeout}
        pickedIds={pickedIds}
        changeoutsLeft={round.changeoutsLeft}
        changeoutsPerFight={Number(round.tune.CHANGEOUTS)}
        setWord={setWord}
        helper={helper}
        seen={seen}
        onBestPlay={() => {
          const best = SB.bestFromRack(
            rackLetters,
            (w) => round.scoreFor(w),
            1,
          );
          if (best.length) setWord(best[0]!.word);
          else say('Nothing spells out of this rack.');
        }}
      />

      <PilesDrawer
        drawPile={round.pile.drawPile}
        discardPile={round.pile.discardPile}
        characterTile={characterTile}
      />
      {helper && (
        <SuggestionsDrawer
          indexing={indexing}
          letters={letters}
          suggestions={suggestions}
          live={live}
          playWord={playWord}
        />
      )}
      {!formable && letters && (
        <p className="sb-hint sb-warn-line">
          {letters} needs letters that aren’t in your rack.
        </p>
      )}
      {formable && barredNow.length > 0 && (
        <p className="sb-hint sb-warn-line">
          {barredNow.map((t) => t.letter).join(', ')} has been played this round
          — {round.rule!.name}.
        </p>
      )}
    </section>
  );
});

export default PlayBoard;
