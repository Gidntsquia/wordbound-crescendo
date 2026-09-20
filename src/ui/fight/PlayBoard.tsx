// The board -- case (rack), composing stick, inking picker, play/swap/clear
// input row, bag/discard details, word-helper suggestions -- moved out of
// RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4, mechanical extraction), then
// split further into Rack/InkingPicker/Stick/InputRow/PilesDrawer/
// SuggestionsDrawer (READ_SLOWLY_PLAN.md A4, second pass) and ported to
// .tsx (READ_SLOWLY_PLAN.md A1 remainder). The section's ref is still owned
// by RoundSandbox (drag.bind's row lookups query it via
// playRef.current.querySelector), so it's forwarded rather than created
// here.
import { forwardRef, useEffect, useState } from 'react';
import Rack from './Rack';
import InkingPicker from './InkingPicker';
import Stick from './Stick';
import InputRow from './InputRow';
import PilesDrawer from './PilesDrawer';
import WordsmithPanel from './WordsmithPanel';
import type { Tile } from '../../engine/tiles';
import type { RoundFacade } from '../../engine/state/facade';
import type { Character } from '../../engine/content/characters';
import { TIERS } from '../../engine/content/round';
import { Button } from '@/ui/primitives/button';
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

// A small set of everyday words gives the optional hint a human-readable
// example before it falls back to the full dictionary's highest score.
export const FAMILIAR_HINTS = new Set(
  `ABLE ABOUT AFTER AGAIN AIR ALSO ANIMAL APPLE AREA ARM ART ASK AWAY BABY BACK BALL BANK BASE BATH BEAR BEAT BEAUTY BED BEE BELL BEST BIRD BLACK BLUE BOAT BODY BOOK BORN BOTH BOWL BOX BOY BREAD BREAK BRIDGE BRING BROWN BUILD BUS BUSINESS BUT BUY CALL CAMP CAN CARD CARE CAR CASE CAT CHANGE CHAIR CHANCE CHILD CITY CLASS CLEAN CLEAR CLOSE CLOUD COAT COLD COME COOK COOL CORN COST COW CRAFT CUT DANCE DARK DAY DEAD DEAL DEAR DEEP DEER DESK DIE DOG DOOR DOWN DRAW DREAM DRESS DRINK DRIVE DROP DRUM DRY DUCK EACH EAR EARLY EARTH EAST EASY EAT EDGE EGG EIGHT END ENJOY EVEN EVER EVERY EYE FACE FACT FAIR FALL FAMILY FAR FARM FAST FATHER FEAR FEEL FEET FEW FIELD FIGHT FILE FILL FILM FIND FINE FIRE FISH FIVE FLAG FLAT FLOOR FLOWER FLY FOOD FOOT FOR FOREST FORGET FOUR FREE FRESH FRIEND FROM FRONT FULL FUN GAME GARDEN GATE GAIT GET GIFT GIRL GIVE GLAD GLASS GOAT GOLD GOOD GRASS GREAT GREEN GROW GUESS HAIR HALF HAND HAPPY HARD HAT HAVE HEAD HEAR HEART HEAT HELLO HELP HER HERE HIGH HILL HOME HOPE HORSE HOUR HOUSE HUNT IDEA IMAGE INK INTO IRON ISLAND ITEM JUMP JUST KEEP KEY KICK KIND KING KITE KNEE KNOW LADY LAKE LAND LARGE LAST LATE LAUGH LEAF LEARN LEFT LEG LEMON LESS LETTER LIFE LIGHT LIKE LINE LION LIST LITTLE LIVE LONG LOOK LOSE LOVE LOW LUCK LUNCH MADE MAKE MAN MANY MAP MARK MARKET MATTER MAY MEAL MEAN MEET MIDDLE MILK MIND MINE MINUTE MISS MONEY MONTH MOON MORE MORNING MOST MOTHER MOUNTAIN MOUSE MOUTH MOVE MUCH MUSIC NAME NEAR NEED NEST NEVER NEW NEXT NICE NIGHT NINE NOISE NORTH NOSE NOTE NUMBER OCEAN OFFER OFFICE OFTEN OIL ONCE ONE OPEN ORANGE ORDER OTHER OUR OUT OVER OWN PAGE PAIN PAINT PAPER PARK PART PASS PAST PATH PAY PEACE PEAR PEN PEOPLE PHONE PICK PIECE PIG PINK PLACE PLAN PLANT PLAY PLEASE POEM POINT POND POOL POOR POST POT POUND POWER PRETTY PRICE PRIZE PULL PUSH QUICK QUIET RACE RAIN RAN READ READY REAL RED REST RICE RICH RIDE RIGHT RING RISE RIVER ROAD ROCK ROOM ROOT ROSE ROUND RULE RUN SAD SAFE SAID SAIL SALT SAME SAND SAVE SAY SCALE SCHOOL SCORE SEA SEAT SEE SEED SEEK SEEM SELL SEND SET SEVEN SHADE SHAKE SHAPE SHARE SHEEP SHIP SHOE SHOP SHORT SHOW SIDE SIGHT SIGN SILK SILLY SING SISTER SIT SIX SKIN SKY SLEEP SLOW SMALL SMILE SNOW SOAP SOFT SOME SONG SOON SOUND SOUTH SPACE SPEAK SPEED SPELL SPEND SPICE SPIN SPOON SPORT SPRING STAGE STAR START STAY STEP STICK STILL STONE STOP STORE STORY STREET STRONG STUDY SUGAR SUMMER SUN SWEET SWIM TABLE TAKE TALK TALL TASTE TEA TEACH TEAM TELL TEN TENT TEST THAN THANK THAT THEN THERE THESE THICK THIN THINK THIS THREE THROW TIDE TIE TIME TINY TIRED TOAST TODAY TOGETHER TOLD TONE TOOL TOP TOWN TOY TREE TRIP TRUE TRY TUNE TURN TWO UNDER UNIT UNTIL UPON USE VALUE VERY VIEW VISIT VOICE WAIT WALK WALL WANT WARM WASH WATCH WATER WAVE WAY WEAR WEEK WELL WEST WET WHAT WHEEL WHEN WHERE WHITE WHOLE WHY WIDE WIFE WILD WILL WIND WINDOW WINE WING WINTER WISH WITH WOLF WOMAN WOOD WORD WORK WORLD WORRY WRITE WRONG YARD YEAR YELLOW YES YET YOUNG ZERO`.split(
    ' ',
  ),
);

function hintFromRack(suggestions: Suggestion[]): Suggestion | undefined {
  const best = suggestions[0];
  if (!best) return undefined;
  return (
    suggestions.find(
      (suggestion) =>
        suggestion.score >= best.score * 0.45 &&
        FAMILIAR_HINTS.has(suggestion.word),
    ) ?? best
  );
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
      CHARACTERS: Character[];
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
    markAssisted: (kind: 'hint' | 'solver') => void;
    changeout: () => void;
    shuffleRack: () => void;
    selectRetain: (tileId: string | null) => void;
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
    characterTile?: Tile | null;
    characterPicked?: boolean;
    characterId: string;
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
    markAssisted,
    changeout,
    shuffleRack,
    selectRetain,
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
    characterTile,
    characterPicked,
    characterId,
  },
  playRef,
) {
  const [guideOpen, setGuideOpen] = useState(true);
  const [hintStep, setHintStep] = useState(0);
  const [hintText, setHintText] = useState('');
  useEffect(() => {
    setHintStep(0);
    setHintText('');
  }, [rackLetters, round.plays.length]);
  const guide = !letters
    ? round.plays.length === 1 && !seen.has('swap') && round.changeoutsLeft > 0
      ? 'Try a swap: tap letters you want to replace, then tap Swap. It does not use a word.'
      : 'Tap letters to make a word. Your character letter scores extra and returns after each word.'
    : letters.length < 2
      ? 'Keep adding letters. Tap a selected tile to undo it.'
      : `Play a valid word to score. ${Number(round.tune.RETAIN_ONE) > 0 ? 'The ordinary rack redraws, except for one unused tile you choose to keep once per fight.' : 'The ordinary rack redraws after each word.'} Swap replaces selected letters without using a word.`;
  return (
    <section
      className={
        'sb-play mb-[22px] border-t border-b border-[var(--rule)] py-[22px] max-[620px]:mb-2.5 max-[620px]:min-h-0 max-[620px]:flex-1 max-[620px]:overflow-y-auto max-[620px]:py-2.5' +
        (hiddenOnMobile ? ' max-[620px]:hidden' : '')
      }
      ref={playRef as React.Ref<HTMLElement>}
    >
      {live && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-sm border border-[var(--brass)] bg-[var(--pit-raise)] p-2.5 text-[13px] leading-snug text-[var(--leaf)]">
          <span>{guideOpen ? guide : 'Need a reminder?'}</span>
          <button
            type="button"
            className="shrink-0 underline underline-offset-2"
            onClick={() => setGuideOpen(!guideOpen)}
          >
            {guideOpen ? 'Dismiss' : 'Show guide'}
          </button>
        </div>
      )}
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
      {Number(round.tune.RETAIN_ONE) > 0 && (
        <label className="my-2 flex flex-wrap items-center gap-2 text-[13px] text-[var(--leaf)]">
          <span>Keep one tile for the next word</span>
          <select
            className="min-h-11 max-w-full rounded border border-[var(--leaf-dim)] bg-[var(--paper)] px-2 text-[var(--ink)]"
            value={round.retainId ?? ''}
            disabled={!live || round.retainsLeft <= 0 || round.playsLeft <= 1}
            onChange={(event) => selectRetain(event.target.value || null)}
          >
            <option value="">None</option>
            {round.rack.map((tile, index) => (
              <option key={tile.id} value={tile.id}>
                {tile.letter} · tile {index + 1}
              </option>
            ))}
          </select>
          <span className="text-[var(--leaf-dim)]">
            {round.retainsLeft > 0
              ? 'Once per fight. An unused chosen tile stays; the rest redraw.'
              : 'Already used this fight.'}
          </span>
        </label>
      )}

      {inking && (
        <InkingPicker
          inking={inking}
          setInking={setInking}
          applyInk={applyInk}
          vowels={SB.VOWELS}
        />
      )}

      <WordsmithPanel characterId={characterId} characters={SB.CHARACTERS} />

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
        shuffleRack={shuffleRack}
        pickedIds={pickedIds}
        changeoutsLeft={round.changeoutsLeft}
        changeoutsPerFight={Number(round.tune.CHANGEOUTS)}
        setWord={setWord}
        helper={helper}
        seen={seen}
        onBestPlay={() => {
          markAssisted('solver');
          const best = SB.bestFromRack(
            rackLetters,
            (w) => round.scoreFor(w),
            1,
          );
          if (best.length) setWord(best[0]!.word);
          else say('Nothing spells out of this rack.');
        }}
      />
      {live && !helper && (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px] text-[var(--leaf)]">
          <Button
            type="button"
            variant="paper"
            onClick={() => {
              markAssisted('hint');
              const words = SB.bestFromRack(
                rackLetters,
                (w) => round.scoreFor(w),
                100,
              );
              const word = hintFromRack(words)?.word;
              if (!word) {
                setHintText('No word found in this rack. Try a swap.');
                return;
              }
              const next = Math.min(3, hintStep + 1);
              setHintStep(next);
              setHintText(
                next === 1
                  ? `Try a ${word.length}-letter word.`
                  : next === 2
                    ? `Try starting with ${word[0]}.`
                    : `One possible word is ${word}.`,
              );
            }}
          >
            {hintStep >= 3 ? 'Show hint again' : 'Hint'}
          </Button>
          {hintText && <span role="status">{hintText}</span>}
        </div>
      )}

      <PilesDrawer
        drawPile={round.pile.drawPile}
        discardPile={round.pile.discardPile}
        characterTile={characterTile}
      />
      <details className="mt-2 text-[12px] leading-relaxed text-[var(--leaf-dim)]">
        <summary className="cursor-pointer text-[var(--leaf)]">
          How scoring and the premium slot work
        </summary>
        <p className="my-1">
          Word length sets the starting points and multiplier. Letter values,
          your character, marked tiles, bookmarks, and the encounter rule can
          add more.
        </p>
        <p className="my-1">
          Base length bonuses:{' '}
          {TIERS.map(
            (t) =>
              `${t.id === 't2' ? '1–2' : t.minLen}${t.id === 't7' ? '+' : ''} letters: ${Number(round.tune[`PTS_${t.id.slice(1)}`]) || 0} points ×${Number(round.tune[`MULT_${t.id.slice(1)}`]) || 1}`,
          ).join(' · ')}
          .
        </p>
        <p className="my-1">
          {round.premium
            ? `This fight's ${round.premium.kind === 'dw' ? 'double-word' : round.premium.kind === 'tl' ? 'triple-letter' : 'double-letter'} slot is position ${round.premium.pos + 1}. Put a tile there to use it.`
            : 'This fight has no premium slot.'}
        </p>
      </details>
      <p className="my-2 text-[11px] text-[var(--leaf-dim)]">
        Words use the game dictionary. Unusual words may be valid; names,
        abbreviations, and words absent from the dictionary may be rejected.
        Rejected words do not use a play.
      </p>
      {!formable && letters && (
        <p className="sb-hint sb-warn-line mt-2.5 text-[11px] text-[var(--brass)] text-[var(--leaf-dim)] italic">
          {letters} needs letters that aren’t in your rack.
        </p>
      )}
      {formable && barredNow.length > 0 && (
        <p className="sb-hint sb-warn-line mt-2.5 text-[11px] text-[var(--brass)] text-[var(--leaf-dim)] italic">
          {barredNow.map((t) => t.letter).join(', ')} has been played this round
          — {round.rule!.name}.
        </p>
      )}
      {formable && letters.length > 1 && barredNow.length === 0 && !spelt && (
        <p role="status" className="mt-2 text-[13px] text-[var(--rubric)]">
          {letters} is not in the dictionary. Try another word; rejected words
          do not use a play.
        </p>
      )}
    </section>
  );
});

export default PlayBoard;
