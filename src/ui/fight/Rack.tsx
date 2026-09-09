// The case (rack) of tiles -- extracted from PlayBoard.jsx (READ_SLOWLY_PLAN.md
// A4). Tap plays a tile onto the stick, drag reorders/moves it; inking mode
// diverts taps to toggleInkTile instead.
import type { Tile } from '../../engine/tiles';
import type { RoundFacade } from '../../engine/state/facade';
import type { Inking as RealInking } from '../../sandbox/RoundSandbox';

interface RackEntry {
  t: Tile;
  i: number;
  picked: boolean;
  hollow: boolean;
}

type Inking = RealInking;

type RoundLike = RoundFacade;

interface DragBind {
  bind: (
    row: string,
    index: number,
    id: string | null,
  ) => { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void };
}

export default function Rack({
  rackShown,
  live,
  inking,
  round,
  scoring,
  SB,
  drag,
  toggleInkTile,
  stageTile,
  say,
  sfx,
  letterValues,
  characterTile,
  characterPicked,
}: {
  rackShown: RackEntry[];
  live: boolean;
  inking: Inking | null;
  round: RoundLike;
  scoring: { litTile?: string | null } | null;
  SB: { MARK_DEFS: Record<string, { name: string; hint: string }> };
  drag: DragBind | null;
  toggleInkTile: (id: string) => void;
  stageTile: (t: Tile) => void;
  say: (m: string) => void;
  sfx: (name: string, ...a: unknown[]) => void;
  letterValues: Record<string, number>;
  characterTile?: Tile | null;
  characterPicked?: boolean;
}) {
  return (
    <div className="sb-rack-row">
      {characterTile && (
        <div className="sb-character-slot">
          {characterPicked ? (
            <span className="sb-tile is-slot" aria-hidden="true" />
          ) : (
            <button
              type="button"
              disabled={!live}
              className={
                'sb-tile is-character' +
                (round.isBarred(characterTile) ? ' is-barred' : '') +
                (scoring && scoring.litTile === characterTile.id
                  ? ' is-lit'
                  : '')
              }
              data-flip-tile-id={characterTile.id}
              title="Your character's own tile — always here, returns after every word."
              onClick={() =>
                round.isBarred(characterTile)
                  ? (sfx('thud'),
                    say(
                      characterTile.letter +
                        ' has been played this round — ' +
                        round.rule!.name +
                        '.',
                    ))
                  : stageTile(characterTile)
              }
            >
              {characterTile.letter}
              <sub>{letterValues[characterTile.letter] || 0}</sub>
            </button>
          )}
        </div>
      )}
      <div className="sb-rack">
        {rackShown.map(({ t, i, picked, hollow }) =>
          picked ? (
            <span key={t.id} className="sb-tile is-slot" aria-hidden="true" />
          ) : (
            <button
              key={t.id}
              type="button"
              disabled={!live}
              className={
                'sb-tile' +
                (hollow ? ' is-dragging' : '') +
                (t.mark ? ' is-mark-' + t.mark : '') +
                (inking && inking.ids.includes(t.id) ? ' is-inking' : '') +
                (round.isBarred(t) ? ' is-barred' : '') +
                (scoring && scoring.litTile === t.id ? ' is-lit' : '')
              }
              data-flip-tile-id={t.id}
              title={
                t.mark
                  ? SB.MARK_DEFS[t.mark]!.name +
                    ' — ' +
                    SB.MARK_DEFS[t.mark]!.hint
                  : undefined
              }
              {...(inking || !drag ? {} : drag.bind('rack', i, t.id))}
              onClick={() =>
                inking
                  ? toggleInkTile(t.id)
                  : round.isBarred(t)
                    ? (sfx('thud'),
                      say(
                        t.letter +
                          ' has been played this round — ' +
                          round.rule!.name +
                          '.',
                      ))
                    : stageTile(t)
              }
            >
              {t.letter === '?' ? '␣' : t.letter}
              <sub>{letterValues[t.letter] || 0}</sub>
            </button>
          ),
        )}
      </div>
    </div>
  );
}
