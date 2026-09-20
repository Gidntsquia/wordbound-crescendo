// The phase router: title / fight / shop / letter / end screen, plus the
// gear sheet and the persistent play board. Extracted verbatim from
// FightScreen.tsx's terminal JSX return (READ_SLOWLY_PLAN.md A2 remainder).
// FightScreen.tsx keeps every hook/callback/state declaration -- this
// component is pure props in, no state of its own, so the split is a real
// phase router (composition), not a state split. SB is a module-level
// constant, so it's imported directly here rather than threaded as a prop.
import { SB } from '../ui/fight/FightScreen';
import type { Selecting, Inking, ScoringState } from '../ui/fight/FightScreen';
import { Toaster } from '../ui/primitives/sonner';
import { Button } from '../ui/primitives/button';
import TitleScreen from '../ui/meta/TitleScreen';
import HeldRow from '../ui/fight/HeldRow';
import Shop from '../ui/shop/Shop';
import EndScreen from '../ui/meta/EndScreen';
import EnemyIntroCard from '../ui/fight/EnemyIntroCard';
import ScoreLine from '../ui/fight/ScoreLine';
import PlaysList from '../ui/fight/PlaysList';
import WonBanner from '../ui/fight/WonBanner';
import LetterChoice from '../ui/fight/LetterChoice';
import GearPanel from '../ui/chrome/GearPanel';
import RunStrip from '../ui/chrome/RunStrip';
import PlayBoard from '../ui/fight/PlayBoard';
import { describeBreakdown } from '../ui/quills/cardCopy';
import type { RunFacade, RoundFacade } from '../engine/state/facade';
import type { Fight, BestState } from '../app/store';
import type { Tile } from '../engine/tiles';
import type { CrescendoState } from '../ui/hooks/useCrescendo';
import type { createDragReorder } from '../engine/dragReorder';
import type { ROUND_DEFAULTS } from '../engine/content/round';
import type { Dispatch, SetStateAction } from 'react';

export interface AppProps {
  phase: string;
  scoring: ScoringState | null;
  skipCascade: () => void;
  gearOpen: boolean;
  setGearOpen: (open: boolean) => void;
  seed: string;
  setSeed: (s: string) => void;
  bagId: string;
  setBagId: (id: string) => void;
  keyUnlocked: number;
  discovered: Set<string>;
  volume: number;
  setVolume: (v: number) => void;
  sfxOn: boolean;
  setSfxOn: (on: boolean) => void;
  helper: boolean;
  setHelper: (on: boolean) => void;
  start: (seedOverride?: string) => void;
  resumeRun: () => void;
  hasSavedRun: boolean;
  round: RoundFacade | null | undefined;
  run: RunFacade | null | undefined;
  itemIds: Set<string>;
  setItemIds: Dispatch<SetStateAction<Set<string>>>;
  tune: typeof ROUND_DEFAULTS;
  setConst: (key: string, value: number | boolean | undefined) => void;
  keyId: string;
  setKey: (id: string) => void;
  writeKeyChoice: (id: string) => void;
  seen: ReadonlySet<string>;
  markSeen: (id: string) => void;
  characterId: string;
  setCharacterId: (id: string) => void;
  randomSeed: () => string;
  best: BestState;
  f: Fight | null;
  enterFight: () => void;
  skipFight: () => void;
  showIntro: boolean;
  scoreShown: number;
  pct: number;
  live: boolean;
  act: (
    label: string | null,
    res: { ok?: boolean; reason?: string } | boolean | null | undefined,
    sound?: string,
  ) => boolean;
  useInk: (i: number) => void;
  cres: CrescendoState;
  phraseBanked: boolean;
  phraseCueSpent: boolean;
  tip: string | null;
  setTip: Dispatch<SetStateAction<string | null>>;
  nextStage: () => void;
  W: typeof window.Wordbound;
  pickLetter: (letter: string) => void;
  leaveShop: () => void;
  buyCard: (i: number) => void;
  pickCard: (i: number) => void;
  selecting: Selecting | null;
  commitSelecting: (apply: boolean) => void;
  cancelSelecting: () => void;
  toggleSelectTile: (id: string | null, vowel?: string) => void;
  copySeed: () => void;
  copyResult: () => void;
  shareText: string;
  playRef: React.RefObject<HTMLElement | null>;
  inking: Inking | null;
  setInking: Dispatch<SetStateAction<Inking | null>>;
  toggleInkTile: (id: string, vowel?: string) => void;
  applyInk: () => void;
  rackShown: { t: Tile; i: number; picked: boolean; hollow: boolean }[];
  drag: ReturnType<typeof createDragReorder> | null;
  letters: string;
  setWord: (w: string) => void;
  play: () => void;
  markAssisted: (kind: 'hint' | 'solver') => void;
  changeout: () => void;
  shuffleRack: () => void;
  selectRetain: (tileId: string | null) => void;
  pickedIds: Set<string>;
  rackLetters: string;
  say: (line: string) => void;
  stageTile: (tile: Tile) => void;
  unstageAt: (i: number) => void;
  sfx: (name: string, ...a: unknown[]) => void;
  formable: boolean;
  barredNow: Tile[];
  spelt: boolean;
  worthHow: ReturnType<RoundFacade['breakdownFor']> | null;
  worth: number;
  stickShown: {
    t: Tile | null;
    i: number;
    ch: string | undefined;
    hollow: boolean;
  }[];
  characterTile: Tile | null;
  characterPicked: boolean;
}

export default function App(props: AppProps) {
  const {
    phase,
    scoring,
    skipCascade,
    gearOpen,
    setGearOpen,
    seed,
    setSeed,
    bagId,
    setBagId,
    keyUnlocked,
    discovered,
    volume,
    setVolume,
    sfxOn,
    setSfxOn,
    helper,
    setHelper,
    start,
    resumeRun,
    hasSavedRun,
    round,
    run,
    itemIds,
    setItemIds,
    tune,
    setConst,
    keyId,
    setKey,
    writeKeyChoice,
    seen,
    markSeen,
    characterId,
    setCharacterId,
    randomSeed,
    best,
    f,
    enterFight,
    skipFight,
    showIntro,
    scoreShown,
    pct,
    live,
    act,
    useInk,
    cres,
    phraseBanked,
    phraseCueSpent,
    tip,
    setTip,
    nextStage,
    W,
    pickLetter,
    leaveShop,
    buyCard,
    pickCard,
    selecting,
    commitSelecting,
    cancelSelecting,
    toggleSelectTile,
    copySeed,
    copyResult,
    shareText,
    playRef,
    inking,
    setInking,
    toggleInkTile,
    applyInk,
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
    rackLetters,
    say,
    stageTile,
    unstageAt,
    sfx,
    formable,
    barredNow,
    spelt,
    worthHow,
    worth,
    stickShown,
    characterTile,
    characterPicked,
  } = props;
  const phrasePoints = Number(round?.tune.PHRASE_POINTS ?? 2);

  return (
    <div
      className={
        'sb is-phase-' +
        phase +
        (phase === 'idle' ? ' is-title' : '') +
        ' max-[620px]:flex max-[620px]:h-dvh max-[620px]:max-h-dvh max-[620px]:flex-col max-[620px]:px-3 max-[620px]:pt-2.5 max-[620px]:pb-2' +
        (phase === 'idle'
          ? ' max-[620px]:overflow-y-auto'
          : ' max-[620px]:overflow-hidden')
      }
      onPointerDownCapture={scoring ? skipCascade : undefined}
    >
      <Toaster position="top-center" visibleToasts={1} duration={4500} />
      <header className="absolute top-7 right-6 h-0">
        <Button
          type="button"
          variant="paperGhost"
          className="absolute top-0 right-0 inline-flex h-11 w-11 items-center justify-center p-0 text-xl"
          aria-label="Setup and tuning"
          title="Setup and tuning"
          onClick={() => setGearOpen(true)}
        >
          ⚙
        </Button>
      </header>

      <GearPanel
        open={gearOpen}
        onOpenChange={setGearOpen}
        seed={seed}
        setSeed={setSeed}
        bagId={bagId}
        setBagId={setBagId}
        keyUnlocked={keyUnlocked}
        discovered={discovered}
        volume={volume}
        setVolume={setVolume}
        sfxOn={sfxOn}
        setSfxOn={setSfxOn}
        helper={helper}
        setHelper={setHelper}
        phase={phase}
        start={start}
        round={round}
        run={run}
        itemIds={itemIds}
        setItemIds={setItemIds}
        tune={tune}
        setConst={setConst}
      />

      {phase === 'idle' && (
        <TitleScreen
          SB={SB}
          keyUnlocked={keyUnlocked}
          keyId={keyId}
          setKey={setKey}
          writeKeyChoice={writeKeyChoice}
          seen={seen}
          markSeen={markSeen}
          characterId={characterId}
          setCharacterId={setCharacterId}
          start={start}
          resumeRun={resumeRun}
          hasSavedRun={hasSavedRun}
          randomSeed={randomSeed}
          best={best}
        />
      )}

      <RunStrip run={run} phase={phase} />

      {round && (
        <section
          className={
            'sb-board relative isolate mb-1 pb-[18px] [text-shadow:0_1px_3px_rgba(0,0,0,0.7)] max-[620px]:flex max-[620px]:min-h-0 max-[620px]:flex-1 max-[620px]:flex-col max-[620px]:overflow-y-auto max-[620px]:pb-2 max-[620px]:[-webkit-overflow-scrolling:touch]' +
            (phase === 'live' ? ' max-[620px]:flex-none' : '') +
            (scoring && scoring.hit === 1
              ? ' motion-safe:animate-[board-shake-1_280ms_ease-out]'
              : scoring && scoring.hit === 2
                ? ' motion-safe:animate-[board-shake-2_320ms_ease-out]'
                : scoring && scoring.hit === 3
                  ? ' motion-safe:animate-[board-shake-3_380ms_ease-out]'
                  : '')
          }
        >
          {showIntro ? (
            <EnemyIntroCard
              f={f}
              round={round}
              SB={SB}
              enterFight={enterFight}
              skipFight={skipFight}
            />
          ) : phase === 'shop' ? null : (
            <ScoreLine
              f={f}
              round={round}
              scoring={scoring}
              scoreShown={scoreShown}
              pct={pct}
              seen={seen}
              live={live}
            />
          )}
          {phase === 'live' && !showIntro && phrasePoints > 0 && (
            <div
              className={
                'mt-2 rounded-sm border px-3 py-2 text-[13px] leading-snug ' +
                ((cres.phase === 'idle' && !phraseBanked) || phraseCueSpent
                  ? 'border-[var(--rule)] text-[var(--leaf-dim)]'
                  : 'border-[var(--brass)] bg-[var(--pit-raise)] text-[var(--leaf)]')
              }
            >
              <span className="sr-only" role="status" aria-live="polite">
                {phraseCueSpent
                  ? 'Saved phrase used. Wait for the next musical cue.'
                  : phraseBanked && cres.phase === 'idle'
                    ? `Musical phrase saved. Your next word gets ${phrasePoints} points before multipliers.`
                    : cres.phase === 'idle'
                      ? `Play whenever you like. A coming musical phrase offers ${phrasePoints} points before multipliers.`
                      : cres.phase === 'soon'
                        ? `Musical phrase approaching. Play now for ${phrasePoints} points before multipliers.`
                        : `Musical phrase in bloom. Play now for ${phrasePoints} points before multipliers.`}
              </span>
              <span aria-hidden="true">
                <span className="mr-2">
                  {cres.phase === 'live' ? '✦' : '♪'}
                </span>
                {phraseCueSpent
                  ? 'Phrase used · the next cue can be saved'
                  : phraseBanked && cres.phase === 'idle'
                    ? `Phrase saved · next word gets +${phrasePoints} points before multipliers`
                    : cres.phase === 'idle'
                      ? `Musical phrase: play whenever you like. A coming swell offers +${phrasePoints} points before multipliers.`
                      : cres.phase === 'soon'
                        ? `Phrase approaching · ${Math.ceil(cres.secs ?? 0)}s · play now for +${phrasePoints} points before multipliers`
                        : `Phrase in bloom · ${Math.max(0, cres.secs ?? 0).toFixed(1)}s · play now for +${phrasePoints} points before multipliers`}
              </span>
            </div>
          )}
          {phase !== 'shop' && (
            <HeldRow
              run={run}
              SB={SB}
              act={act}
              live={phase === 'live'}
              onInk={useInk}
              cres={cres}
              lit={scoring ? scoring.litItem : null}
              floats={scoring ? scoring.floats : null}
              tip={tip}
              setTip={setTip}
            />
          )}
          {phase !== 'shop' &&
            round.plays.length > (scoring && !scoring.cleared ? 1 : 0) && (
              <PlaysList
                plays={round.plays}
                scoring={scoring}
                describe={describeBreakdown}
              />
            )}
          {phase === 'won' && (
            <WonBanner round={round} run={run!} nextStage={nextStage} />
          )}
          {phase === 'letter' && run!.letterChoice && (
            <LetterChoice
              options={run!.letterChoice!.options.slice()}
              letterValues={W.Lexicon.LETTER_VALUES}
              pickLetter={pickLetter}
            />
          )}
          {phase === 'shop' && run!.shop && (
            <Shop
              run={run!}
              SB={SB}
              act={act}
              leave={leaveShop}
              onInk={useInk}
              firstVisit={!seen.has('shop')}
              buyCard={buyCard}
              pickCard={pickCard}
              selecting={selecting}
              commitSelecting={commitSelecting}
              cancelSelecting={cancelSelecting}
              toggleSelectTile={toggleSelectTile}
              tip={tip}
              setTip={setTip}
            />
          )}
          {(phase === 'run-won' || phase === 'lost') && (
            <EndScreen
              run={run!}
              won={phase === 'run-won'}
              SB={SB}
              seed={seed}
              best={best}
              onAgain={() => start(randomSeed())}
              onReplay={() => start(seed)}
              onCopy={copySeed}
              onShare={copyResult}
              shareText={shareText}
              describe={describeBreakdown}
            />
          )}
        </section>
      )}

      {round &&
        !showIntro &&
        (phase === 'live' || phase === 'scoring' || phase === 'won') && (
          <PlayBoard
            ref={playRef}
            hiddenOnMobile={phase === 'won'}
            live={live}
            seen={seen}
            round={round}
            inking={inking}
            setInking={setInking}
            toggleInkTile={toggleInkTile}
            applyInk={applyInk}
            SB={SB}
            rackShown={rackShown}
            drag={drag}
            letters={letters}
            setWord={setWord}
            play={play}
            markAssisted={markAssisted}
            changeout={changeout}
            shuffleRack={shuffleRack}
            selectRetain={selectRetain}
            pickedIds={pickedIds}
            helper={helper}
            rackLetters={rackLetters}
            say={say}
            stageTile={stageTile}
            unstageAt={unstageAt}
            sfx={sfx}
            W={W}
            formable={formable}
            barredNow={barredNow}
            spelt={spelt}
            worthHow={worthHow}
            worth={worth}
            scoring={scoring}
            stickShown={stickShown}
            characterTile={characterTile}
            characterPicked={characterPicked}
            characterId={characterId}
          />
        )}
    </div>
  );
}
