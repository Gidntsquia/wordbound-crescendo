// The gear sheet: composes SetupPanel + StartingQuills + TuningPanel inside
// the Sheet that used to live inline in src/app/App.tsx (READ_SLOWLY_PLAN.md
// A6 Work-queue item 1). Pure props in, no state of its own -- App.tsx keeps
// owning gearOpen/setGearOpen and every value these three panels need.
import { SB } from '../fight/FightScreen';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../primitives/sheet';
import SetupPanel from './SetupPanel';
import StartingQuills from './StartingQuills';
import TuningPanel from './TuningPanel';
import type { RunFacade, RoundFacade } from '../../engine/state/facade';
import type { ROUND_DEFAULTS } from '../../engine/content/round';
import type { Dispatch, SetStateAction } from 'react';

export interface GearPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  phase: string;
  start: (seedOverride?: string) => void;
  round: RoundFacade | null | undefined;
  run: RunFacade | null | undefined;
  itemIds: Set<string>;
  setItemIds: Dispatch<SetStateAction<Set<string>>>;
  tune: typeof ROUND_DEFAULTS;
  setConst: (key: string, value: number | boolean | undefined) => void;
}

export default function GearPanel({
  open,
  onOpenChange,
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
  itemIds,
  setItemIds,
  tune,
  setConst,
}: GearPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Setup and tuning</SheetTitle>
        </SheetHeader>
        <div className="mt-2.5 border border-dashed border-[var(--rule)] px-3 pt-2 pb-1">
          <SetupPanel
            SB={SB}
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
          />
          <StartingQuills
            SB={SB}
            itemIds={itemIds}
            setItemIds={setItemIds}
            run={run}
          />
          <TuningPanel SB={SB} tune={tune} setConst={setConst} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
