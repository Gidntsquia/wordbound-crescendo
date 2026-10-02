import { useEffect, useRef, useState } from 'react';
import { TileFace } from '@/components/tile-face';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FightMusic } from '@/features/audio/fight-music';
import { COMPOSERS } from '@/game/content/composers';
import { FIGHTS } from '@/game/content/fights';
import { FIGHT_MODIFIERS } from '@/game/content/modifiers';
import { QUILLS } from '@/game/content/quills';
import type { Dictionary } from '@/game/dictionary';
import type { Run, WorkKind } from '@/game/types';

interface FightScreenProps {
  run: Run;
  dictionary: Dictionary;
  onPlay: (tileIds: number[], dictionary: Dictionary) => void;
  onSwap: (tileIds: number[]) => void;
  onOpenDeck: () => void;
  /** Browsers only allow audio after a tap; the app remembers that one happened. */
  musicUnlocked: boolean;
  onUnlockMusic: () => void;
}

const TILE_MS = 90;
const REVEAL_MS = 1900;
const ROLL_MS = 450;

const workOf = (k: WorkKind | null | undefined) => (k ? { work: k } : {});

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Tap tiles to spell a word (in tap order), then play it or swap the tiles out. */
export function FightScreen({
  run,
  dictionary,
  onPlay,
  onSwap,
  onOpenDeck,
  musicUnlocked,
  onUnlockMusic,
}: FightScreenProps) {
  const { fight } = run;
  const composer = COMPOSERS[run.composer];
  const spec = FIGHTS[run.fightIndex];
  const [picked, setPicked] = useState<number[]>([]);
  const [openQuill, setOpenQuill] = useState<string | null>(null);
  const [shakes, setShakes] = useState(0);

  // --- Reveal: tiles jump in order, then each firing step, then the score rolls up. ---
  const play = run.lastPlay;
  const [revealedPlay, setRevealedPlay] = useState(play);
  const [tilesShown, setTilesShown] = useState(play?.word.length ?? 0);
  const [stepShown, setStepShown] = useState(play?.steps.length ?? 0);
  const [rolled, setRolled] = useState(true);
  const timers = useRef<number[]>([]);
  const frame = useRef(0);
  const [scoreShown, setScoreShown] = useState(fight.score);

  const finish = (p: NonNullable<typeof play>, score: number) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    cancelAnimationFrame(frame.current);
    setTilesShown(p.word.length);
    setStepShown(p.steps.length);
    setRolled(true);
    setScoreShown(score);
  };

  if (play !== revealedPlay) {
    setRevealedPlay(play);
    setPicked([]);
    if (play) {
      const still = reducedMotion();
      setTilesShown(still ? play.word.length : 0);
      setStepShown(still ? play.steps.length : 0);
      setRolled(still);
      setScoreShown(still ? fight.score : fight.score - play.points);
    }
  }

  useEffect(() => {
    if (!play || play !== revealedPlay) return;
    const before = fight.score - play.points;
    if (reducedMotion()) return;
    const n = play.word.length;
    const tileMs = n * TILE_MS;
    const stepMs = Math.max(
      60,
      Math.min(
        260,
        (REVEAL_MS - tileMs - ROLL_MS) / Math.max(1, play.steps.length),
      ),
    );
    const at = (ms: number, fn: () => void) =>
      timers.current.push(window.setTimeout(fn, ms));
    for (let i = 0; i < n; i++) at(i * TILE_MS, () => setTilesShown(i + 1));
    play.steps.forEach((_, j) =>
      at(tileMs + j * stepMs, () => setStepShown(j + 1)),
    );
    const rollStart = tileMs + play.steps.length * stepMs;
    at(rollStart, () => {
      setRolled(true);
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / ROLL_MS);
        setScoreShown(Math.round(before + play.points * (1 - (1 - k) ** 3)));
        if (k < 1) frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    });
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      cancelAnimationFrame(frame.current);
    };
    // The reveal runs once per play.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play]);

  // A rejected word shakes the row; the tiles stay picked.
  const lastRun = useRef(run);
  useEffect(() => {
    if (run !== lastRun.current && run.notice) setShakes((s) => s + 1);
    lastRun.current = run;
  }, [run]);

  const revealing = !!play && (!rolled || stepShown < play.steps.length);
  const byId = new Map(fight.hand.map((t) => [t.id, t]));
  const pickedTiles = picked.flatMap((id) => {
    const t = byId.get(id);
    return t ? [t] : [];
  });
  const progress = Math.min(100, Math.round((scoreShown / fight.target) * 100));

  const toggle = (id: number) => {
    onUnlockMusic();
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };
  const skip = () => {
    if (revealing && play) finish(play, fight.score);
  };

  const stepNow = play?.steps[Math.max(0, stepShown - 1)];
  const demand = fight.modifier ? FIGHT_MODIFIERS[fight.modifier] : null;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-primary text-xl leading-tight font-bold">
          {spec?.chore}
        </h2>
        <p className="font-display text-3xl font-bold">
          {scoreShown}{' '}
          <span className="text-muted-foreground font-sans text-lg font-normal">
            of {fight.target} quota
          </span>
        </p>
        <div className="bg-muted mt-1 h-2 w-full overflow-hidden rounded-full">
          <div
            className="bg-candle h-full transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-muted-foreground mt-1 text-base">
          {fight.playsLeft} of {fight.playsTotal} plays · {fight.swapsLeft}{' '}
          swaps
        </p>
        {demand && (
          <p className="text-candle text-base font-semibold">
            {demand.name}: {demand.description}
          </p>
        )}
      </div>

      {run.quills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {run.quills.map((id) => (
            <Badge
              key={id}
              variant={openQuill === id ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => setOpenQuill((o) => (o === id ? null : id))}
            >
              {QUILLS[id].name}
            </Badge>
          ))}
        </div>
      )}
      {openQuill && (
        <p className="text-muted-foreground -mt-1 text-base">
          {QUILLS[openQuill as keyof typeof QUILLS].description}
        </p>
      )}

      <div
        key={shakes}
        className={`border-border/60 flex min-h-[4.25rem] items-center justify-center gap-1.5 rounded-md border border-dashed px-2 py-3 ${shakes > 0 ? 'row-shake' : ''}`}
      >
        {revealing && play ? (
          [...play.word].map((letter, i) => (
            <TileFace
              key={i}
              small
              tile={{
                letter,
                mark: null,
                ...workOf(play.workKinds[i]),
              }}
              chips={i < tilesShown ? (play.tileChips[i] ?? 0) : null}
              jumpDelay={i < tilesShown ? 0 : null}
            />
          ))
        ) : pickedTiles.length > 0 ? (
          pickedTiles.map((t) => (
            <TileFace
              key={t.id}
              small
              tile={t}
              hideChips={composer.hidesChips}
              onClick={() => toggle(t.id)}
            />
          ))
        ) : (
          <span className="text-muted-foreground text-base italic">
            Tap tiles to spell a word
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 justify-items-center gap-x-2 gap-y-4 py-2">
        {fight.hand.map((tile) => (
          <TileFace
            key={tile.id}
            tile={tile}
            hideChips={composer.hidesChips}
            selected={picked.includes(tile.id)}
            onClick={() => toggle(tile.id)}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={picked.length === 0}
          onClick={() => {
            onUnlockMusic();
            onPlay(picked, dictionary);
          }}
        >
          Play
        </Button>
        <Button
          className="flex-1"
          variant="outline"
          disabled={picked.length === 0 || fight.swapsLeft === 0}
          onClick={() => {
            onUnlockMusic();
            onSwap(picked);
            setPicked([]);
          }}
        >
          Swap
        </Button>
        <Button
          variant="ghost"
          disabled={picked.length === 0}
          onClick={() => setPicked([])}
        >
          Clear
        </Button>
        <Button variant="ghost" onClick={onOpenDeck}>
          Deck
        </Button>
      </div>

      <button
        type="button"
        className="min-h-16 w-full text-left text-base"
        aria-live="polite"
        onClick={skip}
      >
        {run.notice && <p className="text-destructive">{run.notice}</p>}
        {!run.notice && play && (
          <p>
            <strong className="font-display">{play.word}</strong>{' '}
            {revealing ? (
              <span>
                <span key={stepShown} className="pulse inline-block">
                  {stepNow
                    ? `${stepNow.label}: ${stepNow.tally.chips} × ${stepNow.tally.mult}`
                    : ''}
                </span>
                <span className="text-muted-foreground"> (tap to skip)</span>
              </span>
            ) : (
              <span>
                {play.chips} × {play.mult} = {play.points}
                {play.notes.length > 0 && (
                  <span className="text-muted-foreground">
                    {' '}
                    ({play.notes.join(', ')})
                  </span>
                )}
              </span>
            )}
          </p>
        )}
      </button>

      <FightMusic
        composer={run.composer}
        fightIndex={run.fightIndex}
        unlocked={musicUnlocked}
      />
    </section>
  );
}
