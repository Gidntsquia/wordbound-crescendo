import { trackForFight } from './tracks';

interface FightMusicProps {
  fightIndex: number;
  /** True once the player has tapped something; browsers block audio before that. */
  unlocked: boolean;
}

/** Plays the fight's recording once. Unmounting (leaving the fight) stops it. */
export function FightMusic({ fightIndex, unlocked }: FightMusicProps) {
  const track = trackForFight(fightIndex);
  if (!unlocked) return null;
  return (
    <p className="text-muted-foreground text-xs">
      ♪ {track.title} — {track.composer}
      <audio key={track.url} src={track.url} autoPlay />
    </p>
  );
}
