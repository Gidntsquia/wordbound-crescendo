// The gear-panel setup section -- seed, tile bag pick, key/letters/bookmarks
// meta (GearMeta), volume, SFX/helper toggles, start/restart button, bag
// counts. Extracted from RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4). Pure
// props in, no fight.current/round mutation of its own.
import GearMeta from './GearMeta';
import { Button } from '@/ui/primitives/button';
import { Slider } from '../primitives/slider';
import { Toggle } from '../primitives/toggle';
import type { RunFacade, RoundFacade } from '../../engine/state/facade';

interface TileBag {
  id: string;
  label: string;
  blurb: string;
}

type RunLike = RunFacade | null | undefined;
type RoundLike = RoundFacade | null | undefined;

export default function SetupPanel({
  SB,
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
  phase,
  start,
  round,
  run,
}: {
  SB: {
    TILE_BAGS: TileBag[];
    KEYS: { id: string; index: number; name: string; hint: string }[];
    availableLetters?: unknown;
    ITEMS?: { id: string; name: string }[];
  };
  seed: string;
  setSeed: (v: string) => void;
  bagId: string;
  setBagId: (id: string) => void;
  keyUnlocked: number;
  discovered: ReadonlySet<string>;
  volume: number;
  setVolume: (v: number) => void;
  sfxOn: boolean;
  setSfxOn: (v: boolean) => void;
  helper: boolean;
  setHelper: (v: boolean) => void;
  phase: string;
  start: () => void;
  round: RoundLike | null;
  run: RunLike | null;
}) {
  return (
    <section className="sb-setup mb-[22px] flex flex-wrap items-end gap-[18px] border-b border-[var(--rule)] pt-4 pb-5">
      <label className="flex flex-col gap-[5px] text-[10px] font-semibold tracking-[0.16em] text-[var(--leaf-dim)] uppercase">
        Seed
        <input
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          style={{ width: 110 }}
        />
      </label>
      <div
        className="flex flex-col gap-[5px] text-[10px] font-semibold tracking-[0.16em] text-[var(--leaf-dim)] uppercase"
        role="group"
        aria-label="Tile bag"
      >
        <span className="flex items-baseline gap-2">Tile bag</span>
        <div className="flex">
          {SB.TILE_BAGS.map((b) => (
            <Button
              key={b.id}
              type="button"
              variant="paper"
              title={b.blurb}
              className={
                'sb-bag -ml-px rounded-none px-[13px] py-[7px] first:ml-0 first:rounded-l-[2px] first:rounded-r-none last:rounded-l-none last:rounded-r-[2px]' +
                (b.id === bagId
                  ? ' relative z-10 border-[var(--leaf)] bg-[var(--leaf)] text-[var(--ink)] hover:border-[var(--brass-hot)] hover:bg-[var(--brass-hot)] hover:text-[var(--ink)]'
                  : '')
              }
              onClick={() => setBagId(b.id)}
            >
              {b.label}
            </Button>
          ))}
        </div>
      </div>
      <GearMeta
        SB={SB}
        keyUnlocked={keyUnlocked}
        discovered={discovered}
        wonLetters={run?.wonLetters ?? []}
      />
      <label className="sb-volume flex flex-col gap-[5px] text-[10px] font-semibold tracking-[0.16em] text-[var(--leaf-dim)] uppercase">
        Volume
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onValueChange={(v) => setVolume(Array.isArray(v) ? v[0]! : v)}
        />
      </label>
      <Toggle
        className="sb-toggle"
        title="Tile, swap, shop and ink sounds"
        pressed={sfxOn}
        onPressedChange={setSfxOn}
      >
        SFX
      </Toggle>
      <Toggle
        className="sb-toggle"
        title="Word suggestions, Best play, and Play settling for the best word in the letters"
        pressed={helper}
        onPressedChange={setHelper}
      >
        Word helper
      </Toggle>
      <Button
        type="button"
        className="sb-go border-[var(--leaf)] bg-[var(--leaf)] text-[var(--ink)] hover:border-[var(--brass-hot)] hover:bg-[var(--brass-hot)] hover:text-[var(--ink)]"
        variant="paperPrimary"
        onClick={() => start()}
      >
        {phase === 'idle' ? 'Start with this seed' : 'Restart with this seed'}
      </Button>
      {round && run && (
        <span className="sb-hint">
          <b>{round.pile.drawPile.length}</b> in the bag,{' '}
          <b>{round.pile.discardPile.length}</b> discarded, of {run.deck.length}
        </span>
      )}
    </section>
  );
}
