// The gear-panel setup section -- seed, tile bag pick, key/letters/bookmarks
// meta (GearMeta), volume, SFX/helper toggles, start/restart button, bag
// counts. Extracted from RoundSandbox.jsx (READ_SLOWLY_PLAN.md A4). Pure
// props in, no fight.current/round mutation of its own.
import GearMeta from './GearMeta';
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
    isAvailable: (letter: string) => boolean;
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
    <section className="sb-setup">
      <label>
        Seed
        <input
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          style={{ width: 110 }}
        />
      </label>
      <div className="sb-bags" role="group" aria-label="Tile bag">
        <span className="sb-bags-head">Tile bag</span>
        <div className="sb-bag-row">
          {SB.TILE_BAGS.map((b) => (
            <button
              key={b.id}
              type="button"
              title={b.blurb}
              className={'sb-bag' + (b.id === bagId ? ' is-on' : '')}
              onClick={() => setBagId(b.id)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <GearMeta SB={SB} keyUnlocked={keyUnlocked} discovered={discovered} />
      <label>
        Volume
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </label>
      <label className="sb-toggle" title="Tile, swap, shop and ink sounds">
        <input
          type="checkbox"
          checked={sfxOn}
          onChange={(e) => setSfxOn(e.target.checked)}
        />
        SFX
      </label>
      <label
        className="sb-toggle"
        title="Word suggestions, Best play, and Play settling for the best word in the letters"
      >
        <input
          type="checkbox"
          checked={helper}
          onChange={(e) => setHelper(e.target.checked)}
        />
        Word helper
      </label>
      <button type="button" className="sb-go" onClick={() => start()}>
        {phase === 'idle' ? 'Start with this seed' : 'Restart with this seed'}
      </button>
      {round && run && (
        <span className="sb-hint">
          <b>{round.pile.drawPile.length}</b> in the bag,{' '}
          <b>{round.pile.discardPile.length}</b> discarded, of {run.deck.length}
        </span>
      )}
    </section>
  );
}
