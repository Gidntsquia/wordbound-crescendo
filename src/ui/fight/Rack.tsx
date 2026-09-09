// The case (rack) of tiles -- extracted from PlayBoard.jsx (READ_SLOWLY_PLAN.md
// A4). Tap plays a tile onto the stick, drag reorders/moves it; inking mode
// diverts taps to toggleInkTile instead.
interface Tile {
  id: string;
  letter: string;
  mark?: string;
}

interface RackEntry {
  t: Tile;
  i: number;
  picked: boolean;
  hollow: boolean;
}

interface Inking {
  ids: string[];
}

interface RoundLike {
  isBarred: (t: Tile) => boolean;
  rule?: { name: string } | null;
}

interface DragBind {
  bind: (
    row: 'rack' | 'stick',
    index: number,
    id: string | null,
  ) => Record<string, unknown>;
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
}: {
  rackShown: RackEntry[];
  live: boolean;
  inking: Inking | null;
  round: RoundLike;
  scoring: { litTile?: string | null } | null;
  SB: { MARK_DEFS: Record<string, { name: string; hint: string }> };
  drag: DragBind;
  toggleInkTile: (id: string) => void;
  stageTile: (t: Tile) => void;
  say: (m: string) => void;
  sfx: (name: string, ...a: unknown[]) => void;
  letterValues: Record<string, number>;
}) {
  return (
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
            {...(inking ? {} : drag.bind('rack', i, t.id))}
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
  );
}
