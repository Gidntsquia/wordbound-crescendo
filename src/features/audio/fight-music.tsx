import type { ComposerId } from '@/game/types';
import { trackForFight } from './tracks';

interface FightMusicProps {
  composer: ComposerId;
  fightIndex: number;
  /** True once the player has tapped something; browsers block audio before that. */
  unlocked: boolean;
}

/** Plays the fight's recording once. Unmounting (leaving the fight) stops it. */
export function FightMusic({
  composer,
  fightIndex,
  unlocked,
}: FightMusicProps) {
  const track = trackForFight(composer, fightIndex);
  if (!unlocked) return null;
  return (
    <p className="text-muted-foreground text-center text-xs italic">
      Now playing: {track.title}
      <audio key={track.url} src={track.url} autoPlay />
    </p>
  );
}
