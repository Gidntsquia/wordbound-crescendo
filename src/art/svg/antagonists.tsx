// READ_SLOWLY_PLAN.md stage E1 -- hand-authored SVG "antagonist" art (the
// nine tempos, per THEME.md: "not villains so much as tempos"). Each
// antagonist draws a distinct variant per fight pose: `idle` (base art),
// `weakening` (faded, cracked), `gone` (defeated, outline only), and for
// the three boss-tier tempos (knocking_door, parade, the_night) an extra
// `crescendo` variant (intensified, brighter, more elements). The nine
// components live in antagonistsCh1/2/3.tsx (one file per chapter, to stay
// under the repo's ~300-line art-file guidance); this file is just the
// combined export map Sprite.tsx imports.
export { PhoneGlow, Clock, KnockingDoor } from './antagonistsCh1';
export { EmptyBench, Loudspeaker, Parade } from './antagonistsCh2';
export { BlankWall, Podium, TheNight } from './antagonistsCh3';

import { PhoneGlow, Clock, KnockingDoor } from './antagonistsCh1';
import { EmptyBench, Loudspeaker, Parade } from './antagonistsCh2';
import { BlankWall, Podium, TheNight } from './antagonistsCh3';

export const ANTAGONIST_SHEETS = {
  phone_glow: PhoneGlow,
  clock: Clock,
  knocking_door: KnockingDoor,
  empty_bench: EmptyBench,
  loudspeaker: Loudspeaker,
  parade: Parade,
  blank_wall: BlankWall,
  podium: Podium,
  the_night: TheNight,
};
